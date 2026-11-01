/* Local 3D model viewer (three.js r128, vendored).
 *
 * STL, OBJ, PLY and 3MF are loaded straight from the Telegram stream. The
 * camera frames the model, OrbitControls lets it be spun, and the current view
 * can be saved as the file's library thumbnail.
 */
(function () {
  "use strict";

  const state = {
    open: false,
    item: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    root: null,
    frame: 0,
    dom: null,
    stage: null,
    title: null,
    status: null,
    saveBtn: null,
    openBtn: null,
    token: 0,
  };

  function ensureDom() {
    if (state.dom) return state.dom;
    const overlay = document.createElement("div");
    overlay.className = "overlay viewer3d";
    overlay.id = "viewer3dOverlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="viewer3d-bar">
        <div class="viewer3d-title" id="viewer3dTitle"></div>
        <div class="viewer3d-hint" id="viewer3dStatus"></div>
        <div class="viewer3d-actions">
          <button class="btn" type="button" id="viewer3dOpenBtn" title="Open this file in its Windows app">Open in app</button>
          <button class="btn primary" type="button" id="viewer3dSaveBtn" title="Use this view as the library thumbnail">Save as thumbnail</button>
          <button class="icon-btn" type="button" id="viewer3dClose" title="Close (Esc)" aria-label="Close">×</button>
        </div>
      </div>
      <div class="viewer3d-stage" id="viewer3dStage"></div>
      <div class="viewer3d-help">Drag to orbit · Wheel to zoom · Right-drag to pan</div>
    `;
    document.body.appendChild(overlay);
    state.dom = overlay;
    state.stage = overlay.querySelector("#viewer3dStage");
    state.title = overlay.querySelector("#viewer3dTitle");
    state.status = overlay.querySelector("#viewer3dStatus");
    state.saveBtn = overlay.querySelector("#viewer3dSaveBtn");
    state.openBtn = overlay.querySelector("#viewer3dOpenBtn");
    overlay.querySelector("#viewer3dClose").addEventListener("click", close);
    state.saveBtn.addEventListener("click", saveThumbnail);
    state.openBtn.addEventListener("click", openExternal);
    window.addEventListener("keydown", onKey, true);
    return overlay;
  }

  function onKey(event) {
    if (!state.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  function setStatus(text) {
    if (state.status) state.status.textContent = text || "";
  }

  function stageMessage(text) {
    if (!state.stage) return;
    state.stage.classList.remove("loading");
    state.stage.classList.add("empty");
    const message = document.createElement("div");
    message.className = "viewer3d-message";
    message.textContent = text || "This model could not be opened.";
    state.stage.replaceChildren(message);
  }

  function showError(text) {
    ensureDom();
    state.dom.hidden = false;
    state.open = true;
    setStatus(text || "This model could not be opened.");
    stageMessage(text);
  }

  function createRenderer() {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.className = "viewer3d-canvas";
    return renderer;
  }

  function createScene() {
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.05);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(1, 1.4, 1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd4ff, 0.45);
    fill.position.set(-1, 0.4, -1);
    scene.add(fill);
    return scene;
  }

  function makeLoader(format) {
    const THREE = window.THREE;
    if (format === "stl") return new THREE.STLLoader();
    if (format === "obj") return new THREE.OBJLoader();
    if (format === "ply") return new THREE.PLYLoader();
    if (format === "3mf") return new THREE.ThreeMFLoader();
    return null;
  }

  function triangleCount(root) {
    let triangles = 0;
    root.traverse((child) => {
      const geometry = child.geometry;
      if (!geometry) return;
      if (geometry.index) triangles += geometry.index.count / 3;
      else if (geometry.attributes && geometry.attributes.position) {
        triangles += geometry.attributes.position.count / 3;
      }
    });
    return Math.round(triangles);
  }

  function prepareModel(loaded, format) {
    const THREE = window.THREE;
    let root = loaded;
    if (format === "stl" || format === "ply") {
      const geometry = loaded;
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: format === "stl" ? 0x93a9bd : 0xb9c6d4,
        metalness: 0.12,
        roughness: 0.55,
        vertexColors: format === "ply" && Boolean(geometry.attributes.color),
        flatShading: false,
      });
      root = new THREE.Mesh(geometry, material);
    }
    if (format === "obj" || format === "3mf") {
      let hasMesh = false;
      root.traverse((child) => {
        if (child.isMesh) {
          hasMesh = true;
          if (child.geometry && !child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
        }
      });
      if (!hasMesh) throw new Error("No geometry found in this file.");
    }
    return root;
  }

  function frameModel(root) {
    const THREE = window.THREE;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const camera = state.camera;
    camera.near = Math.max(maxDim / 1000, 0.001);
    camera.far = maxDim * 200;
    camera.position.set(maxDim * 1.25, maxDim * 0.95, maxDim * 1.55);
    camera.updateProjectionMatrix();
    state.controls.target.set(0, 0, 0);
    state.controls.minDistance = maxDim * 0.15;
    state.controls.maxDistance = maxDim * 30;
    state.controls.update();
    const grid = new THREE.GridHelper(maxDim * 3, 24, 0x6b7c8f, 0x39434f);
    grid.position.y = -size.y / 2 - maxDim * 0.02;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    state.root.add(grid);
  }

  function animate() {
    if (!state.open) return;
    state.frame = window.requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
  }

  function resize() {
    if (!state.open || !state.renderer) return;
    const width = state.stage.clientWidth || 1;
    const height = state.stage.clientHeight || 1;
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function dispose() {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    window.removeEventListener("resize", resize);
    if (state.root && state.scene) {
      state.scene.remove(state.root);
      state.root.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose && entry.dispose());
        else if (material && material.dispose) material.dispose();
      });
    }
    state.root = null;
    if (state.controls) {
      state.controls.dispose();
      state.controls = null;
    }
    if (state.camera) state.camera = null;
    if (state.scene) state.scene = null;
    if (state.renderer) {
      state.renderer.dispose();
      if (state.renderer.domElement && state.renderer.domElement.parentNode) {
        state.renderer.domElement.parentNode.removeChild(state.renderer.domElement);
      }
      state.renderer = null;
    }
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    state.token += 1;
    dispose();
    if (state.dom) state.dom.hidden = true;
    state.item = null;
  }

  async function open(item) {
    ensureDom();
    if (!item || !item.viewer) {
      close();
      showError("This file has no built-in 3D preview. Use “Open in app” instead.");
      return;
    }
    const THREE = window.THREE;
    if (!THREE) {
      close();
      showError("The 3D viewer could not be loaded.");
      return;
    }
    close();
    state.open = true;
    state.item = item;
    const token = ++state.token;
    state.dom.hidden = false;
    state.stage.classList.remove("empty");
    state.stage.classList.add("loading");
    state.stage.innerHTML = "";
    state.title.textContent = item.name || "3D model";
    state.status.textContent = "Loading model…";
    state.saveBtn.disabled = true;
    state.saveBtn.hidden = false;
    state.openBtn.hidden = false;

    state.renderer = createRenderer();
    state.scene = createScene();
    state.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
    state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.08;
    state.controls.screenSpacePanning = true;
    state.stage.appendChild(state.renderer.domElement);
    resize();
    window.addEventListener("resize", resize);
    animate();

    const loader = makeLoader(item.viewer);
    if (!loader) {
      close();
      showError("This format has no built-in preview. Use “Open in app” instead.");
      return;
    }
    loader.load(
      `/api/download/${item.id}`,
      (loaded) => {
        if (token !== state.token) return;
        let root;
        try {
          root = prepareModel(loaded, item.viewer);
        } catch (error) {
          setStatus(error.message || "This model could not be read.");
          dispose();
          stageMessage(error.message || "This model could not be read.");
          return;
        }
        state.root = root;
        state.scene.add(root);
        frameModel(root);
        resize();
        state.stage.classList.remove("loading");
        const triangles = triangleCount(root);
        setStatus(
          triangles
            ? `${triangles.toLocaleString()} triangles · drag to orbit`
            : "Drag to orbit · wheel to zoom"
        );
        state.saveBtn.disabled = false;
      },
      (event) => {
        if (token !== state.token) return;
        if (event && event.total) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setStatus(`Loading model… ${percent}%`);
        }
      },
      () => {
        if (token !== state.token) return;
        setStatus("This model could not be downloaded or parsed.");
        dispose();
        stageMessage("This model could not be downloaded or parsed.");
      }
    );
  }

  async function postJson(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    });
    if (!response.ok) {
      let detail = "Request failed.";
      try {
        const data = await response.json();
        detail = data.detail || data.message || detail;
      } catch (error) {
        /* keep the generic message */
      }
      throw new Error(detail);
    }
    return response.json();
  }

  async function saveThumbnail() {
    if (!state.open || !state.item || !state.renderer) return;
    const THREE = window.THREE;
    const renderer = state.renderer;
    const size = 1024;
    const previous = renderer.getSize(new THREE.Vector2());
    const previousRatio = renderer.getPixelRatio();
    state.saveBtn.disabled = true;
    setStatus("Saving thumbnail…");
    try {
      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
      const previousAspect = state.camera.aspect;
      state.camera.aspect = 1;
      state.camera.updateProjectionMatrix();
      renderer.render(state.scene, state.camera);
      const image = renderer.domElement.toDataURL("image/jpeg", 0.9);
      state.camera.aspect = previousAspect;
      state.camera.updateProjectionMatrix();
      const result = await postJson(`/api/items/${state.item.id}/thumb/image`, { image });
      setStatus("Thumbnail saved.");
      if (typeof window.__tfeThumbUpdated === "function") {
        window.__tfeThumbUpdated(result.item);
      }
    } catch (error) {
      setStatus(error.message || "The thumbnail could not be saved.");
    } finally {
      renderer.setPixelRatio(previousRatio);
      renderer.setSize(previous.width, previous.height, false);
      resize();
      state.saveBtn.disabled = false;
    }
  }

  async function openExternal() {
    if (!state.item) return;
    state.openBtn.disabled = true;
    try {
      await postJson(`/api/items/${state.item.id}/open-external`, {});
      setStatus("Opening in its Windows app…");
    } catch (error) {
      setStatus(error.message || "The file could not be opened.");
    } finally {
      state.openBtn.disabled = false;
    }
  }

  window.TFE3D = { open, close };
})();
