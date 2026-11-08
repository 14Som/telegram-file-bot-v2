package com.telegramfileexplorer.mobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Insets;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.database.Cursor;
import android.util.Base64;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Runs the desktop FastAPI backend inside the APK and shows its mobile page.
 * The local server only listens on 127.0.0.1, so nothing is exposed to the
 * network.
 */
public class MainActivity extends Activity {

    private static final String TAG = "TFE";
    private static final String HOST = "127.0.0.1";
    private static final int PORT = 8737;
    // The first launch after the other device saved has to fetch the whole
    // vault snapshot (~45 MB) before the server answers, so this covers a
    // slow restore instead of failing the start halfway through.
    private static final int START_TIMEOUT_MS = 300_000;
    private static final int STORAGE_REQUEST = 7001;
    private static final int NOTIFICATION_REQUEST = 7002;
    private static final int FILE_CHOOSER_REQUEST = 7003;
    private static final String DOWNLOAD_DIR = "Telegram Files";
    private static final String DOWNLOAD_PREFS = "downloads";
    private static final String DOWNLOAD_TRACKED = "tracked";

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService stopper = Executors.newSingleThreadExecutor();
    private final Object downloadLock = new Object();
    private final LinkedHashMap<Long, String> trackedDownloads = new LinkedHashMap<>();
    private static final AtomicInteger latestActivity = new AtomicInteger();
    private final int activityId = latestActivity.incrementAndGet();

    private FrameLayout root;
    private WebView webView;
    private LinearLayout overlay;
    private TextView overlayStatus;
    private Button overlayRetry;
    private ProgressBar overlaySpinner;

    private int port = PORT;
    private boolean pythonStarted = false;
    private boolean backendStarting = false;
    private boolean pageLoaded = false;
    private int failedStarts = 0;
    private int insetTop = 0;
    private int insetBottom = 0;

    private BroadcastReceiver downloadReceiver;
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableEdgeToEdge();
        buildContentView();
        configureWebView();
        restoreTrackedDownloads();
        registerDownloadReceiver();
        startBackend();
    }

    /** Let the page paint behind the status and navigation bars. */
    private void enableEdgeToEdge() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        if (Build.VERSION.SDK_INT >= 29) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
    }

    /* --------------------------------------------------------------- layout */
    private void buildContentView() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 246, 248));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setBackgroundColor(Color.rgb(245, 246, 248));
        overlay.setPadding(dp(32), dp(32), dp(32), dp(32));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams logoParams =
                new LinearLayout.LayoutParams(dp(88), dp(88));
        logoParams.bottomMargin = dp(20);
        overlay.addView(logo, logoParams);

        TextView title = new TextView(this);
        title.setText("Telegram Files");
        title.setTextSize(22);
        title.setTextColor(Color.rgb(27, 29, 33));
        title.setGravity(Gravity.CENTER);
        overlay.addView(title);

        overlayStatus = new TextView(this);
        overlayStatus.setText("Starting the local server…");
        overlayStatus.setTextSize(14);
        overlayStatus.setTextColor(Color.rgb(106, 112, 120));
        overlayStatus.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams statusParams =
                new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
        statusParams.topMargin = dp(10);
        overlay.addView(overlayStatus, statusParams);

        overlaySpinner = new ProgressBar(this);
        LinearLayout.LayoutParams spinnerParams =
                new LinearLayout.LayoutParams(dp(36), dp(36));
        spinnerParams.topMargin = dp(24);
        overlay.addView(overlaySpinner, spinnerParams);

        overlayRetry = new Button(this);
        overlayRetry.setText("Try again");
        overlayRetry.setVisibility(View.GONE);
        LinearLayout.LayoutParams retryParams =
                new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = dp(20);
        overlay.addView(overlayRetry, retryParams);
        overlayRetry.setOnClickListener(v -> {
            if (failedStarts >= 2) {
                hardRestart();
                return;
            }
            pageLoaded = false;
            setOverlayState("Starting the local server…", true);
            startBackend();
        });

        root.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                Insets cutout = insets.getInsets(WindowInsets.Type.displayCutout());
                top = Math.max(bars.top, cutout.top);
                bottom = Math.max(bars.bottom, cutout.bottom);
            } else {
                top = Math.max(insets.getSystemWindowInsetTop(), insets.getStableInsetTop());
                bottom = Math.max(insets.getSystemWindowInsetBottom(),
                        insets.getStableInsetBottom());
            }
            if (top != insetTop || bottom != insetBottom) {
                insetTop = top;
                insetBottom = bottom;
                overlay.setPadding(dp(32), dp(32) + top, dp(32), dp(32) + bottom);
                pushInsetsToPage();
            }
            return insets;
        });

        setContentView(root);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        // The document picker hands the WebView content:// URIs to read.
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSaveFormData(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                ArrayList<String> types = new ArrayList<>();
                String[] accept = params.getAcceptTypes();
                if (accept != null) {
                    for (String value : accept) {
                        String type = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
                        if (type.contains("/")) {
                            types.add(type);
                        }
                    }
                }
                if (types.isEmpty()) {
                    intent.setType("*/*");
                } else if (types.size() == 1) {
                    intent.setType(types.get(0));
                } else {
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0]));
                }
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                        params.getMode()
                                == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException error) {
                    fileChooserCallback = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) {
                    return false;
                }
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                pushInsetsToPage();
                hideOverlay();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    pageLoaded = false;
                    setOverlayState("Could not load the library. Check your connection.",
                            false);
                }
            }
        });
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent,
                                        String contentDisposition, String mimeType,
                                        long contentLength) {
                String name = filenameFromDisposition(contentDisposition);
                if (name == null) {
                    name = filenameFromUrl(url);
                }
                enqueueDownload(url, name, mimeType);
            }
        });

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    private boolean handleNavigation(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        // Blob and data frames are how the EPUB viewer loads book chapters.
        if ("blob".equals(scheme) || "data".equals(scheme) || "about".equals(scheme)) {
            return false;
        }
        if (("http".equals(scheme) || "https".equals(scheme))
                && ("127.0.0.1".equals(host) || "localhost".equals(host))) {
            return false;
        }
        openExternal(uri.toString());
        return true;
    }

    /* -------------------------------------------------------------- backend */
    private void startBackend() {
        if (backendStarting || pageLoaded) {
            return;
        }
        backendStarting = true;
        main.postDelayed(() -> {
            if (backendStarting && !pageLoaded) {
                setOverlayState("Syncing the library… this can take a few minutes.", true);
            }
        }, 12_000);
        worker.execute(() -> {
            try {
                File home = new File(getFilesDir(), "home");
                if (!home.isDirectory() && !home.mkdirs()) {
                    fail("Could not create the app folder.");
                    return;
                }
                File ui = new File(getFilesDir(), "ui");
                try {
                    extractUi(ui);
                } catch (IOException error) {
                    fail("Could not prepare the interface files.");
                    return;
                }
                if (!pythonStarted) {
                    if (!Python.isStarted()) {
                        Python.start(new AndroidPlatform(this));
                    }
                    pythonStarted = true;
                }
                PyObject module = Python.getInstance().getModule("main");
                boolean started = module.callAttr("start", home.getAbsolutePath(),
                        ui.getAbsolutePath(), port).toBoolean();
                if (!started) {
                    fail("The local server did not start.");
                    return;
                }
                if (waitForServer()) {
                    main.post(this::showLibrary);
                } else {
                    fail("The local server did not answer in time.");
                }
            } catch (Throwable error) {
                Log.e(TAG, "Backend start failed", error);
                fail(error.getMessage() == null ? "The app could not start."
                        : error.getMessage());
            } finally {
                backendStarting = false;
            }
        });
    }

    private boolean waitForServer() {
        long deadline = SystemClock.elapsedRealtime() + START_TIMEOUT_MS;
        while (SystemClock.elapsedRealtime() < deadline) {
            if (ping()) {
                return true;
            }
            SystemClock.sleep(400);
        }
        return false;
    }

    private boolean ping() {
        HttpURLConnection connection = null;
        try {
            URL url = new URL("http://" + HOST + ":" + port + "/api/ping");
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(1500);
            connection.setReadTimeout(1500);
            connection.setUseCaches(false);
            return connection.getResponseCode() == 200;
        } catch (IOException error) {
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void showLibrary() {
        if (isFinishing()) {
            return;
        }
        failedStarts = 0;
        Log.i(TAG, "Local server ready on port " + port);
        setOverlayState("Opening the library…", true);
        webView.loadUrl("http://" + HOST + ":" + port + "/m");
    }

    private void fail(String message) {
        main.post(() -> {
            backendStarting = false;
            failedStarts += 1;
            setOverlayState(message, false);
            overlayRetry.setText(failedStarts >= 2 ? "Restart app" : "Try again");
        });
    }

    /** Stop the Python server and start it again without leaving the app. */
    private void hardRestart() {
        pageLoaded = false;
        failedStarts = 0;
        setOverlayState("Restarting the local server…", true);
        webView.loadUrl("about:blank");
        worker.execute(() -> {
            try {
                if (pythonStarted) {
                    Python.getInstance().getModule("main").callAttr("stop");
                }
            } catch (Throwable error) {
                Log.e(TAG, "Backend stop failed", error);
            }
            main.post(this::startBackend);
        });
    }

    private void setOverlayState(String message, boolean busy) {
        overlayStatus.setText(message);
        overlaySpinner.setVisibility(busy ? View.VISIBLE : View.GONE);
        overlayRetry.setVisibility(busy ? View.GONE : View.VISIBLE);
        overlay.setVisibility(View.VISIBLE);
        overlay.bringToFront();
    }

    private void hideOverlay() {
        overlay.setVisibility(View.GONE);
    }

    private void pushInsetsToPage() {
        if (webView == null || !pageLoaded) {
            return;
        }
        // Window insets are device pixels; the page works in CSS pixels.
        float density = getResources().getDisplayMetrics().density;
        int cssTop = Math.round(insetTop / density);
        int cssBottom = Math.round(insetBottom / density);
        String script = "document.documentElement.style.setProperty('--safe-top','"
                + cssTop + "px');document.documentElement.style.setProperty('--safe-bottom','"
                + cssBottom + "px');";
        webView.evaluateJavascript(script, null);
    }

    /** Light icons on dark pages, dark icons on light pages. */
    private void applyBarIcons(boolean dark) {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller == null) {
                return;
            }
            int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            controller.setSystemBarsAppearance(dark ? 0 : mask, mask);
        } else {
            int flags = getWindow().getDecorView().getSystemUiVisibility();
            if (Build.VERSION.SDK_INT >= 23) {
                flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                        : flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            if (Build.VERSION.SDK_INT >= 26) {
                flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                        : flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    /* ------------------------------------------------------------------ ui/ */
    private void extractUi(File target) throws IOException {
        String wanted = String.valueOf(BuildConfig.VERSION_CODE);
        File stamp = new File(target, ".version");
        if (stamp.isFile()) {
            try (InputStream input = new FileInputStream(stamp)) {
                byte[] data = new byte[(int) Math.min(stamp.length(), 32)];
                int read = input.read(data);
                String current = read > 0 ? new String(data, 0, read).trim() : "";
                if (wanted.equals(current)) {
                    return;
                }
            }
        }
        deleteRecursive(target);
        if (!target.mkdirs() && !target.isDirectory()) {
            throw new IOException("Could not create " + target);
        }
        copyAssetDir("ui", target);
        try (OutputStream output = new FileOutputStream(stamp)) {
            output.write(wanted.getBytes("UTF-8"));
        }
    }

    private void copyAssetDir(String assetPath, File target) throws IOException {
        String[] children = getAssets().list(assetPath);
        if (children == null) {
            return;
        }
        for (String child : children) {
            String childPath = assetPath + "/" + child;
            String[] grandChildren = getAssets().list(childPath);
            File destination = new File(target, child);
            if (grandChildren != null && grandChildren.length > 0) {
                if (!destination.isDirectory() && !destination.mkdirs()) {
                    throw new IOException("Could not create " + destination);
                }
                copyAssetDir(childPath, destination);
            } else {
                try (InputStream input = getAssets().open(childPath);
                     OutputStream output = new FileOutputStream(destination)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = input.read(buffer)) > 0) {
                        output.write(buffer, 0, read);
                    }
                }
            }
        }
    }

    private void deleteRecursive(File file) {
        if (!file.exists()) {
            return;
        }
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }

    /* ------------------------------------------------------------- download */
    private final class Bridge {
        @JavascriptInterface
        public void download(String url, String filename) {
            if (url == null) {
                return;
            }
            if (filename == null || filename.trim().isEmpty()) {
                filename = filenameFromUrl(url);
            }
            enqueueDownload(url, filename, null);
        }

        @JavascriptInterface
        public String downloadStatus() {
            return downloadStateJson();
        }

        @JavascriptInterface
        public boolean pauseDownload(long id) {
            return pauseTrackedDownload(id);
        }

        @JavascriptInterface
        public boolean resumeDownload(long id) {
            // DownloadManager.resumeDownload() is hidden from the public SDK;
            // flipping the control column is the supported way to unpause.
            return setDownloadControl(id, 0);
        }

        @JavascriptInterface
        public void cancelDownload(long id) {
            DownloadManager manager =
                    (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            try {
                if (manager != null) {
                    manager.remove(id);
                }
            } catch (Exception ignored) {
                // Already finished or removed.
            }
            untrackDownload(id);
        }

        @JavascriptInterface
        public void clearDownload(long id) {
            untrackDownload(id);
        }

        @JavascriptInterface
        public boolean openDownload(long id) {
            DownloadManager manager =
                    (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                return false;
            }
            Uri uri;
            String mime;
            try {
                uri = manager.getUriForDownloadedFile(id);
                mime = manager.getMimeTypeForDownloadedFile(id);
            } catch (Exception error) {
                return false;
            }
            if (uri == null) {
                return false;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mime == null || mime.isEmpty() ? "*/*" : mime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_ACTIVITY_NEW_TASK);
            main.post(() -> {
                try {
                    startActivity(intent);
                } catch (ActivityNotFoundException | IllegalArgumentException error) {
                    toast("No app can open this file.");
                }
            });
            return true;
        }

        @JavascriptInterface
        public void openPlayer(String payload) {
            if (payload == null) {
                return;
            }
            try {
                JSONObject data = new JSONObject(payload);
                JSONArray sidecars = data.optJSONArray("sidecars");
                Intent intent = new Intent(MainActivity.this, PlayerActivity.class);
                intent.putExtra(PlayerActivity.EXTRA_ITEM_ID, data.optLong("item_id"));
                intent.putExtra(PlayerActivity.EXTRA_TITLE, data.optString("title"));
                intent.putExtra(PlayerActivity.EXTRA_URL, data.optString("url"));
                intent.putExtra(PlayerActivity.EXTRA_POSITION, data.optDouble("position", 0));
                intent.putExtra(PlayerActivity.EXTRA_QUERY, data.optString("query"));
                intent.putExtra(PlayerActivity.EXTRA_SIDECARS,
                        sidecars == null ? "[]" : sidecars.toString());
                main.post(() -> startActivity(intent));
            } catch (Exception error) {
                Log.e(TAG, "openPlayer failed", error);
            }
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null) {
                return;
            }
            MainActivity.this.openExternal(url);
        }

        @JavascriptInterface
        public boolean copyText(String text) {
            if (text == null) {
                return false;
            }
            try {
                final android.content.ClipboardManager clipboard =
                        (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard == null) {
                    return false;
                }
                clipboard.setPrimaryClip(
                        android.content.ClipData.newPlainText("Telegram File Explorer", text));
                return true;
            } catch (Exception error) {
                Log.e(TAG, "copyText failed", error);
                return false;
            }
        }

        @JavascriptInterface
        public String versionName() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public String frameAt(String url, long timeMs) {
            if (url == null || url.isEmpty()) {
                return "";
            }
            String absolute = url.startsWith("/")
                    ? "http://" + HOST + ":" + PORT + url
                    : url;
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            try {
                java.util.Map<String, String> headers = new java.util.HashMap<>();
                String cookie = CookieManager.getInstance().getCookie(absolute);
                if (cookie != null && !cookie.isEmpty()) {
                    headers.put("Cookie", cookie);
                }
                retriever.setDataSource(absolute, headers);
                Bitmap frame = retriever.getFrameAtTime(
                        Math.max(0L, timeMs) * 1000L,
                        MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                if (frame == null) {
                    return "";
                }
                if (frame.getWidth() > 640) {
                    int height = Math.max(
                            1, Math.round(frame.getHeight() * 640f / frame.getWidth()));
                    Bitmap scaled = Bitmap.createScaledBitmap(frame, 640, height, true);
                    if (scaled != frame) {
                        frame.recycle();
                        frame = scaled;
                    }
                }
                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                frame.compress(Bitmap.CompressFormat.JPEG, 78, out);
                frame.recycle();
                return "data:image/jpeg;base64," + Base64.encodeToString(
                        out.toByteArray(), Base64.NO_WRAP);
            } catch (Exception error) {
                Log.e(TAG, "frameAt failed", error);
                return "";
            } finally {
                try {
                    retriever.release();
                } catch (Exception ignored) {
                    // Already released.
                }
            }
        }

        @JavascriptInterface
        public long durationOf(String url) {
            if (url == null || url.isEmpty()) {
                return 0L;
            }
            String absolute = url.startsWith("/")
                    ? "http://" + HOST + ":" + PORT + url
                    : url;
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            try {
                java.util.Map<String, String> headers = new java.util.HashMap<>();
                String cookie = CookieManager.getInstance().getCookie(absolute);
                if (cookie != null && !cookie.isEmpty()) {
                    headers.put("Cookie", cookie);
                }
                retriever.setDataSource(absolute, headers);
                String value = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_DURATION);
                return value == null ? 0L : Long.parseLong(value.trim());
            } catch (Exception error) {
                Log.e(TAG, "durationOf failed", error);
                return 0L;
            } finally {
                try {
                    retriever.release();
                } catch (Exception ignored) {
                    // Already released.
                }
            }
        }

        @JavascriptInterface
        public void setDarkMode(final boolean dark) {
            main.post(() -> applyBarIcons(dark));
        }

        @JavascriptInterface
        public void finishApp() {
            main.post(MainActivity.this::finish);
        }
    }

    private void enqueueDownload(String url, String filename, String mimeType) {
        Uri uri = Uri.parse(url);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if (!"http".equalsIgnoreCase(uri.getScheme())
                || !("127.0.0.1".equals(host) || "localhost".equals(host))) {
            toast("Only files from this app can be downloaded.");
            return;
        }
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_REQUEST);
        }

        String name = sanitize(filename == null ? "download" : filename);
        DownloadManager manager =
                (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            toast("Downloads are not available on this device.");
            return;
        }
        DownloadManager.Request request = new DownloadManager.Request(uri);
        request.setTitle(name);
        request.setDescription("Telegram Files");
        request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);
        String cookie = CookieManager.getInstance().getCookie(url);
        if (cookie != null && !cookie.isEmpty()) {
            request.addRequestHeader("Cookie", cookie);
        }
        if (mimeType != null && !mimeType.isEmpty()
                && !"application/octet-stream".equalsIgnoreCase(mimeType)) {
            request.setMimeType(mimeType);
        }

        boolean publicDir = Build.VERSION.SDK_INT >= 29
                || checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED;
        try {
            if (publicDir) {
                request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS, DOWNLOAD_DIR + "/" + name);
            } else {
                File fallback = new File(getExternalFilesDir(
                        Environment.DIRECTORY_DOWNLOADS), name);
                request.setDestinationUri(Uri.fromFile(fallback));
            }
            long id = manager.enqueue(request);
            trackDownload(id, name);
            toast("Downloading " + name);
        } catch (Exception error) {
            toast("The download could not start: " + error.getMessage());
        }
    }

    private void restoreTrackedDownloads() {
        SharedPreferences prefs = getSharedPreferences(DOWNLOAD_PREFS, MODE_PRIVATE);
        synchronized (downloadLock) {
            trackedDownloads.clear();
            try {
                JSONArray saved = new JSONArray(prefs.getString(DOWNLOAD_TRACKED, "[]"));
                for (int i = 0; i < saved.length(); i++) {
                    JSONObject entry = saved.optJSONObject(i);
                    if (entry == null) {
                        continue;
                    }
                    long id = entry.optLong("id", -1);
                    if (id > 0) {
                        trackedDownloads.put(id, entry.optString("name", "Download"));
                    }
                }
            } catch (Exception ignored) {
                // A corrupt list just means no remembered downloads.
            }
        }
    }

    private void persistTrackedLocked() {
        JSONArray out = new JSONArray();
        for (Map.Entry<Long, String> entry : trackedDownloads.entrySet()) {
            JSONObject item = new JSONObject();
            try {
                item.put("id", entry.getKey());
                item.put("name", entry.getValue());
                out.put(item);
            } catch (Exception ignored) {
                // Skip the one unreadable entry.
            }
        }
        getSharedPreferences(DOWNLOAD_PREFS, MODE_PRIVATE)
                .edit().putString(DOWNLOAD_TRACKED, out.toString()).apply();
    }

    private void trackDownload(long id, String name) {
        synchronized (downloadLock) {
            trackedDownloads.remove(id);
            trackedDownloads.put(id, name);
            persistTrackedLocked();
        }
    }

    private void untrackDownload(long id) {
        synchronized (downloadLock) {
            if (trackedDownloads.remove(id) != null) {
                persistTrackedLocked();
            }
        }
    }

    private boolean pauseTrackedDownload(long id) {
        return setDownloadControl(id, 1);
    }

    private boolean setDownloadControl(long id, int control) {
        try {
            ContentValues values = new ContentValues();
            // 1 pauses and 0 resumes the transfer inside DownloadManager.
            values.put("control", control);
            int rows = getContentResolver().update(
                    ContentUris.withAppendedId(
                            Uri.parse("content://downloads/my_downloads"), id),
                    values, null, null);
            return rows > 0;
        } catch (Exception error) {
            Log.e(TAG, "download control " + control + " failed", error);
            return false;
        }
    }

    private String downloadStateJson() {
        DownloadManager manager =
                (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        JSONArray out = new JSONArray();
        if (manager == null) {
            return out.toString();
        }
        List<Long> gone = new ArrayList<>();
        synchronized (downloadLock) {
            for (Map.Entry<Long, String> entry
                    : new ArrayList<>(trackedDownloads.entrySet())) {
                DownloadManager.Query query =
                        new DownloadManager.Query().setFilterById(entry.getKey());
                try (Cursor cursor = manager.query(query)) {
                    if (cursor == null || !cursor.moveToFirst()) {
                        gone.add(entry.getKey());
                        continue;
                    }
                    int status = cursor.getInt(cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_STATUS));
                    JSONObject item = new JSONObject();
                    item.put("id", entry.getKey());
                    String title = cursor.getString(cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_TITLE));
                    item.put("name", title == null || title.isEmpty()
                            ? entry.getValue() : title);
                    item.put("status", status);
                    item.put("reason", cursor.getInt(cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_REASON)));
                    item.put("bytes", Math.max(0, cursor.getLong(cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))));
                    item.put("total", Math.max(0, cursor.getLong(cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_TOTAL_SIZE_BYTES))));
                    item.put("paused", status == DownloadManager.STATUS_PAUSED);
                    item.put("done", status == DownloadManager.STATUS_SUCCESSFUL);
                    item.put("failed", status == DownloadManager.STATUS_FAILED);
                    item.put("running", status == DownloadManager.STATUS_RUNNING
                            || status == DownloadManager.STATUS_PENDING);
                    out.put(item);
                } catch (Exception error) {
                    gone.add(entry.getKey());
                }
            }
        }
        for (Long id : gone) {
            untrackDownload(id);
        }
        return out.toString();
    }

    private void registerDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                boolean tracked;
                synchronized (downloadLock) {
                    tracked = trackedDownloads.containsKey(id);
                }
                if (!tracked) {
                    return;
                }
                DownloadManager manager =
                        (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager == null) {
                    return;
                }
                try (Cursor cursor = manager.query(
                        new DownloadManager.Query().setFilterById(id))) {
                    if (cursor != null && cursor.moveToFirst()
                            && cursor.getInt(cursor.getColumnIndexOrThrow(
                                    DownloadManager.COLUMN_STATUS))
                            == DownloadManager.STATUS_SUCCESSFUL) {
                        toast("Download complete. It is in Downloads/" + DOWNLOAD_DIR + ".");
                    }
                } catch (Exception ignored) {
                    // The status bar shows the final state either way.
                }
            }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }
    }

    private String filenameFromDisposition(String disposition) {
        if (disposition == null) {
            return null;
        }
        for (String part : disposition.split(";")) {
            String item = part.trim();
            if (item.toLowerCase(Locale.ROOT).startsWith("filename*=")) {
                String value = item.substring(item.indexOf('=') + 1).trim();
                int marker = value.indexOf("''");
                if (marker >= 0) {
                    value = value.substring(marker + 2);
                }
                try {
                    value = URLDecoder.decode(value, "UTF-8");
                } catch (Exception ignored) {
                    // Keep the raw value.
                }
                return stripQuotes(value);
            }
            if (item.toLowerCase(Locale.ROOT).startsWith("filename=")) {
                return stripQuotes(item.substring(item.indexOf('=') + 1).trim());
            }
        }
        return null;
    }

    private String stripQuotes(String value) {
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        return value;
    }

    private String filenameFromUrl(String url) {
        try {
            String path = Uri.parse(url).getLastPathSegment();
            if (path != null && !path.isEmpty()) {
                return URLDecoder.decode(path, "UTF-8");
            }
        } catch (Exception ignored) {
            // Fall through to the default name.
        }
        return "download";
    }

    private String sanitize(String name) {
        String cleaned = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        if (cleaned.isEmpty()) {
            cleaned = "download";
        }
        if (cleaned.length() > 120) {
            String extension = "";
            int dot = cleaned.lastIndexOf('.');
            if (dot > 0 && cleaned.length() - dot <= 12) {
                extension = cleaned.substring(dot);
            }
            cleaned = cleaned.substring(0, 120 - extension.length()) + extension;
        }
        return cleaned;
    }

    /* -------------------------------------------------------------- external */
    private void openExternal(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (ActivityNotFoundException | IllegalArgumentException error) {
            toast("No app can open this link.");
        }
    }

    /* ---------------------------------------------------------------- system */
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_CHOOSER_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        ValueCallback<Uri[]> callback = fileChooserCallback;
        fileChooserCallback = null;
        if (callback == null) {
            return;
        }
        ArrayList<Uri> uris = new ArrayList<>();
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount(); i++) {
                    Uri uri = clip.getItemAt(i).getUri();
                    if (uri != null) {
                        uris.add(uri);
                    }
                }
            } else if (data.getData() != null) {
                uris.add(data.getData());
            }
        }
        if (uris.isEmpty()) {
            callback.onReceiveValue(null);
            return;
        }
        for (Uri uri : uris) {
            try {
                getContentResolver().takePersistableUriPermission(
                        uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (SecurityException ignored) {
                // Some providers grant access only for this session.
            }
        }
        callback.onReceiveValue(uris.toArray(new Uri[0]));
    }

    @Override
    public void onBackPressed() {
        if (webView == null || !pageLoaded) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return window.mobileBack?window.mobileBack():false}"
                        + "catch(e){return false}})()",
                value -> {
                    if (!"true".equals(value)) {
                        finish();
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
            } catch (IllegalArgumentException ignored) {
                // Already unregistered.
            }
            downloadReceiver = null;
        }
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        if (pythonStarted) {
            // A reopen within the next moment reuses the running server; only
            // stop when this really is the last activity.
            main.postDelayed(() -> {
                if (activityId != latestActivity.get()) {
                    return;
                }
                stopper.execute(() -> {
                    try {
                        Python.getInstance().getModule("main").callAttr("stop");
                    } catch (Throwable ignored) {
                        // The process is going away anyway.
                    }
                });
                stopper.shutdown();
            }, 1500);
        }
        worker.shutdownNow();
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toast(String message) {
        main.post(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }
}
