package com.telegramfileexplorer.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Rational;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;
import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;
import org.videolan.libvlc.interfaces.IMedia;
import org.videolan.libvlc.util.VLCVideoLayout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * VLC-style movie player. libVLC reads the original file straight from the
 * local stream, so MKV, HEVC and embedded subtitle tracks play without any
 * remuxing. Subtitles next to the movie are loaded as extra tracks, and the
 * OpenSubtitles search runs against the app's own backend.
 */
public class PlayerActivity extends Activity implements MediaPlayer.EventListener {

    public static final String EXTRA_ITEM_ID = "item_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_POSITION = "position";
    public static final String EXTRA_SIDECARS = "sidecars";
    public static final String EXTRA_QUERY = "query";

    private static final String HOST = "http://127.0.0.1:8737";
    private static final float[] SPEEDS = {0.25f, 0.5f, 0.75f, 1f, 1.25f, 1.5f, 1.75f, 2f};
    private static final float[] SUB_SCALES = {0.8f, 1f, 1.25f, 1.5f};

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private LibVLC libVLC;
    private MediaPlayer player;
    private Media media;
    private VLCVideoLayout videoLayout;

    private long itemId;
    private String title = "";
    private String streamUrl = "";
    private String searchQuery = "";
    private double startPosition;

    private final List<Sidecar> sidecars = new ArrayList<>();
    // Subtitle files attached so far, in the order libVLC opened them. Only the
    // chosen file is attached up front; the rest load when picked from the menu
    // (attaching a whole folder at once overflows libVLC's subpicture heap).
    private final List<Slave> loadedSlaves = new ArrayList<>();
    private final List<SpuTrack> spuTracks = new ArrayList<>();

    private LinearLayout topBar;
    private LinearLayout bottomBar;
    private LinearLayout playButton;
    private ImageView playIcon;
    private TextView titleView;
    private TextView timeView;
    private TextView durationView;
    private TextView hintView;
    private TextView statusView;
    private SeekBar seekBar;
    private ProgressBar spinner;
    private Button speedButton;
    private Button sizeButton;
    private Button delayButton;
    private Button lockButton;

    private SharedPreferences prefs;
    private float speed = 1f;
    private float subScale = 1f;
    private long subDelayMs = 0;
    private int audioTrackId = -2;
    private int subTrackId = -2;
    private boolean subOff = false;
    private String pendingFileLabel = "";
    private boolean autoSubDone = false;
    private boolean userChoseSub = false;
    private long pendingSeekMs = -1;
    private boolean playingOnce = false;
    private boolean draggingSeek = false;
    private boolean orientationLocked = false;

    private float downX;
    private float downY;
    private long downTime;
    private long seekStartMs;
    private long seekPreviewMs = -1;
    private int gestureMode;
    private float startBrightness;
    private int startVolume;
    private Runnable pendingSingleTap;
    private boolean controlsVisible = true;

    private final Runnable hideControls = () -> setControlsVisible(false);
    private final Runnable saveTick = new Runnable() {
        @Override
        public void run() {
            savePosition();
            if (player != null && player.isPlaying()) {
                main.postDelayed(this, 10_000);
            }
        }
    };

    private static final class Sidecar {
        final String label;
        final String language;
        final String url;

        Sidecar(String label, String language, String url) {
            this.label = label;
            this.language = language;
            this.url = url;
        }
    }

    private static final class SpuTrack {
        final int id;
        final String label;
        final boolean sidecar;

        SpuTrack(int id, String label, boolean sidecar) {
            this.id = id;
            this.label = label;
            this.sidecar = sidecar;
        }
    }

    private static final class Slave {
        final String url;
        final String label;

        Slave(String url, String label) {
            this.url = url;
            this.label = label;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        Intent intent = getIntent();
        itemId = intent.getLongExtra(EXTRA_ITEM_ID, 0);
        title = safe(intent.getStringExtra(EXTRA_TITLE), "Movie");
        streamUrl = safe(intent.getStringExtra(EXTRA_URL), "");
        searchQuery = safe(intent.getStringExtra(EXTRA_QUERY), "");
        if (searchQuery.isEmpty()) {
            searchQuery = movieName(title);
        }
        startPosition = intent.getDoubleExtra(EXTRA_POSITION, 0);
        readSidecars(intent.getStringExtra(EXTRA_SIDECARS));
        prefs = getSharedPreferences("player", MODE_PRIVATE);
        speed = prefs.getFloat(key("speed"), 1f);
        subScale = prefs.getFloat(key("scale"), 1f);
        prepareInitialSubtitles();

        if (streamUrl.isEmpty()) {
            Toast.makeText(this, "This file cannot be opened.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        buildContentView();
        enterImmersive();
        startPlayback((long) (startPosition * 1000));
    }

    private void readSidecars(String raw) {
        if (raw == null || raw.isEmpty()) {
            return;
        }
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject row = array.optJSONObject(i);
                if (row == null) {
                    continue;
                }
                String url = row.optString("url");
                if (url.isEmpty()) {
                    continue;
                }
                String label = row.optString("label");
                if (label.isEmpty()) {
                    label = "Subtitle " + (sidecars.size() + 1);
                }
                String language = row.optString("language");
                sidecars.add(new Sidecar(label, language, url));
            }
        } catch (Exception ignored) {
            // A broken list only means fewer subtitle choices.
        }
    }

    private String fileLabel(Sidecar sidecar) {
        return sidecar.language.isEmpty()
                ? sidecar.label
                : sidecar.label + " (" + sidecar.language + ")";
    }

    /* Attaches the subtitle file the user last picked, or the first English one
       when nothing was picked yet, so playback starts captioned like VLC. */
    private void prepareInitialSubtitles() {
        String pick = prefs.getString(key("subpick"), "");
        if ("off".equals(pick)) {
            subOff = true;
            return;
        }
        if ("file".equals(pick)) {
            String saved = prefs.getString(key("subfile"), "");
            for (Sidecar sidecar : sidecars) {
                if (fileLabel(sidecar).equals(saved)) {
                    loadSidecarSlave(sidecar);
                    return;
                }
            }
            String savedUrl = prefs.getString(key("suburl"), "");
            if (!savedUrl.isEmpty() && !saved.isEmpty()) {
                loadedSlaves.add(new Slave(savedUrl, saved));
                return;
            }
        }
        if ("embedded".equals(pick) || sidecars.isEmpty()) {
            return;
        }
        Sidecar preferred = sidecars.get(0);
        for (Sidecar sidecar : sidecars) {
            String language = sidecar.language.toLowerCase(Locale.ROOT);
            String label = sidecar.label.toLowerCase(Locale.ROOT);
            if (language.startsWith("english") || label.contains("english")
                    || label.endsWith(" eng") || label.equals("eng")) {
                preferred = sidecar;
                break;
            }
        }
        loadSidecarSlave(preferred);
    }

    private boolean loadSidecarSlave(Sidecar sidecar) {
        String label = fileLabel(sidecar);
        for (Slave slave : loadedSlaves) {
            if (slave.label.equals(label)) {
                return true;
            }
        }
        loadedSlaves.add(new Slave(sidecar.url, label));
        return true;
    }

    /* Re-opens the stream at the current position so libVLC picks up a newly
       attached subtitle file cleanly; adding one mid-playback wedges the
       subpicture pipeline on some devices. */
    private void restartForSubtitle() {
        if (player == null) {
            return;
        }
        pendingSeekMs = Math.max(0, player.getTime());
        playingOnce = false;
        autoSubDone = false;
        userChoseSub = false;
        openMedia();
    }

    /* ---------------------------------------------------------------- layout */
    private void buildContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        videoLayout = new VLCVideoLayout(this);
        root.addView(videoLayout, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        spinner = new ProgressBar(this);
        FrameLayout.LayoutParams spinnerParams = new FrameLayout.LayoutParams(dp(48), dp(48));
        spinnerParams.gravity = Gravity.CENTER;
        root.addView(spinner, spinnerParams);

        statusView = new TextView(this);
        statusView.setTextColor(Color.WHITE);
        statusView.setTextSize(15);
        statusView.setGravity(Gravity.CENTER);
        statusView.setVisibility(View.GONE);
        FrameLayout.LayoutParams statusParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        statusParams.gravity = Gravity.CENTER;
        statusParams.leftMargin = dp(32);
        statusParams.rightMargin = dp(32);
        root.addView(statusView, statusParams);

        hintView = new TextView(this);
        hintView.setTextColor(Color.WHITE);
        hintView.setTextSize(16);
        hintView.setGravity(Gravity.CENTER);
        hintView.setPadding(dp(16), dp(8), dp(16), dp(8));
        hintView.setBackground(rounded(Color.argb(190, 0, 0, 0), dp(8)));
        hintView.setVisibility(View.GONE);
        FrameLayout.LayoutParams hintParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hintParams.gravity = Gravity.CENTER;
        root.addView(hintView, hintParams);

        playButton = new LinearLayout(this);
        playButton.setGravity(Gravity.CENTER);
        playButton.setBackground(rounded(Color.argb(160, 0, 0, 0), dp(40)));
        playIcon = new ImageView(this);
        playIcon.setImageResource(android.R.drawable.ic_media_play);
        playButton.addView(playIcon, new LinearLayout.LayoutParams(dp(44), dp(44)));
        FrameLayout.LayoutParams playParams = new FrameLayout.LayoutParams(dp(80), dp(80));
        playParams.gravity = Gravity.CENTER;
        root.addView(playButton, playParams);
        playButton.setOnClickListener(v -> togglePlayPause());

        topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dp(10), dp(10), dp(10), dp(18));
        topBar.setBackground(gradientTop());
        FrameLayout.LayoutParams topParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        topParams.gravity = Gravity.TOP;
        root.addView(topBar, topParams);

        TextView back = barButton("\u2190", "Back");
        back.setOnClickListener(v -> finish());
        topBar.addView(back);

        titleView = new TextView(this);
        titleView.setText(title);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(16);
        titleView.setSingleLine(true);
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        titleParams.leftMargin = dp(6);
        topBar.addView(titleView, titleParams);

        TextView subs = barButton("Subtitles", "Subtitles");
        subs.setOnClickListener(v -> showSubtitleDialog());
        topBar.addView(subs);

        TextView audio = barButton("Audio", "Audio");
        audio.setOnClickListener(v -> showAudioDialog());
        topBar.addView(audio);

        bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.VERTICAL);
        bottomBar.setPadding(dp(14), dp(16), dp(14), dp(14));
        bottomBar.setBackground(gradientBottom());
        FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bottomParams.gravity = Gravity.BOTTOM;
        root.addView(bottomBar, bottomParams);

        LinearLayout seekRow = new LinearLayout(this);
        seekRow.setOrientation(LinearLayout.HORIZONTAL);
        seekRow.setGravity(Gravity.CENTER_VERTICAL);
        bottomBar.addView(seekRow);

        timeView = new TextView(this);
        timeView.setTextColor(Color.WHITE);
        timeView.setTextSize(13);
        timeView.setText("0:00");
        seekRow.addView(timeView);

        seekBar = new SeekBar(this);
        LinearLayout.LayoutParams seekParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        seekParams.leftMargin = dp(10);
        seekParams.rightMargin = dp(10);
        seekRow.addView(seekBar, seekParams);
        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (fromUser) {
                    timeView.setText(formatTime(progress));
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar bar) {
                draggingSeek = true;
                showControls();
            }

            @Override
            public void onStopTrackingTouch(SeekBar bar) {
                draggingSeek = false;
                if (player != null) {
                    player.setTime(bar.getProgress(), true);
                }
            }
        });

        durationView = new TextView(this);
        durationView.setTextColor(Color.WHITE);
        durationView.setTextSize(13);
        durationView.setText("0:00");
        seekRow.addView(durationView);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);
        buttons.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams buttonsParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        buttonsParams.topMargin = dp(8);
        bottomBar.addView(buttons, buttonsParams);

        speedButton = controlButton("Speed 1x");
        speedButton.setOnClickListener(v -> showSpeedDialog());
        buttons.addView(speedButton);

        sizeButton = controlButton("Size 100%");
        sizeButton.setOnClickListener(v -> cycleSubtitleSize());
        sizeButton.setVisibility(View.GONE);
        buttons.addView(sizeButton);

        delayButton = controlButton("Delay");
        delayButton.setOnClickListener(v -> showDelayDialog());
        delayButton.setVisibility(View.GONE);
        buttons.addView(delayButton);

        Button pip = controlButton("PiP");
        pip.setOnClickListener(v -> enterPip());
        if (Build.VERSION.SDK_INT < 26) {
            pip.setVisibility(View.GONE);
        }
        buttons.addView(pip);

        lockButton = controlButton("Lock");
        lockButton.setOnClickListener(v -> toggleOrientationLock());
        buttons.addView(lockButton);

        Button fit = controlButton("Fit");
        fit.setOnClickListener(v -> {
            if (player != null) {
                player.setScale(0f);
                player.setAspectRatio(null);
            }
            hideHint();
        });
        buttons.addView(fit);

        setContentView(root);

        videoLayout.setOnTouchListener((view, event) -> handleTouch(event));
        updatePlayIcon(false);
        showControls();
    }

    private TextView barButton(String label, String description) {
        TextView button = new TextView(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(14);
        button.setGravity(Gravity.CENTER);
        button.setPadding(dp(12), dp(9), dp(12), dp(9));
        button.setContentDescription(description);
        button.setBackground(rounded(Color.argb(90, 255, 255, 255), dp(18)));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.leftMargin = dp(6);
        button.setLayoutParams(params);
        return button;
    }

    private Button controlButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(11);
        button.setTextColor(Color.WHITE);
        button.setAllCaps(false);
        button.setSingleLine(true);
        button.setEllipsize(TextUtils.TruncateAt.END);
        button.setPadding(0, 0, 0, 0);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setIncludeFontPadding(false);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                Color.argb(70, 255, 255, 255)));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                0, dp(40), 1f);
        params.leftMargin = dp(3);
        params.rightMargin = dp(3);
        button.setLayoutParams(params);
        return button;
    }

    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private GradientDrawable gradientTop() {
        return new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.argb(210, 0, 0, 0), Color.argb(0, 0, 0, 0)});
    }

    private GradientDrawable gradientBottom() {
        return new GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP,
                new int[]{Color.argb(225, 0, 0, 0), Color.argb(0, 0, 0, 0)});
    }

    /* -------------------------------------------------------------- playback */
    private void startPlayback(long seekMs) {
        ArrayList<String> options = new ArrayList<>();
        options.add("--audio-time-stretch");
        options.add("--no-video-title-show");
        options.add("--network-caching=2500");
        libVLC = new LibVLC(this, options);
        player = new MediaPlayer(libVLC);
        player.setEventListener(this);
        player.attachViews(videoLayout, null, true, false);
        player.setRate(speed);
        pendingSeekMs = seekMs;
        openMedia();
    }

    private void openMedia() {
        if (player == null) {
            return;
        }
        if (media != null) {
            player.stop();
            media.release();
        }
        media = new Media(libVLC, Uri.parse(streamUrl));
        // The emulator's MediaCodec output is unreliable (frozen frames after
        // a seek), so fall back to software decoding there. Phones keep HW.
        media.setHWDecoderEnabled(!isEmulator(), false);
        if (subScale != 1f) {
            media.addOption(":sub-text-scale=" + subScale);
        }
        for (Slave slave : loadedSlaves) {
            media.addSlave(new IMedia.Slave(IMedia.Slave.Type.Subtitle, 0, slave.url));
        }
        // Re-running the media (e.g. after a subtitle-size change) rebuilds the
        // track ids, so let the saved pick be applied again.
        autoSubDone = false;
        userChoseSub = false;
        player.setMedia(media);
        player.play();
    }

    private void togglePlayPause() {
        if (player == null) {
            return;
        }
        if (player.isPlaying()) {
            player.pause();
        } else {
            player.play();
        }
        showControls();
    }

    private void updatePlayIcon(boolean playing) {
        if (playIcon != null) {
            playIcon.setImageResource(playing
                    ? android.R.drawable.ic_media_pause
                    : android.R.drawable.ic_media_play);
        }
        if (playButton != null) {
            playButton.setAlpha(playing ? 0.55f : 1f);
        }
    }

    @Override
    public void onEvent(MediaPlayer.Event event) {
        switch (event.type) {
            case MediaPlayer.Event.Playing:
                main.post(() -> {
                    spinner.setVisibility(View.GONE);
                    playButton.setVisibility(View.GONE);
                    updatePlayIcon(true);
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    if (!playingOnce) {
                        playingOnce = true;
                        if (pendingSeekMs > 2000) {
                            player.setTime(pendingSeekMs, true);
                        }
                        pendingSeekMs = -1;
                    }
                    applyTracks();
                    refreshTracks(true);
                    main.removeCallbacks(saveTick);
                    main.postDelayed(saveTick, 10_000);
                });
                break;
            case MediaPlayer.Event.Paused:
                main.post(() -> {
                    updatePlayIcon(false);
                    showControls();
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    savePosition();
                });
                break;
            case MediaPlayer.Event.Stopped:
                main.post(() -> updatePlayIcon(false));
                break;
            case MediaPlayer.Event.EndReached:
                main.post(() -> {
                    savePosition();
                    finish();
                });
                break;
            case MediaPlayer.Event.EncounteredError:
                main.post(() -> {
                    spinner.setVisibility(View.GONE);
                    statusView.setText("This movie could not be played. Check the connection and try again.");
                    statusView.setVisibility(View.VISIBLE);
                    showControls();
                });
                break;
            case MediaPlayer.Event.Buffering:
                main.post(() -> {
                    float progress = event.getBuffering();
                    if (progress >= 100f || player.isPlaying()) {
                        spinner.setVisibility(View.GONE);
                    } else {
                        spinner.setVisibility(View.VISIBLE);
                    }
                });
                break;
            case MediaPlayer.Event.ESAdded:
            case MediaPlayer.Event.ESDeleted:
                main.post(() -> refreshTracks(false));
                break;
            case MediaPlayer.Event.LengthChanged:
                main.post(() -> {
                    long length = player.getLength();
                    if (length > 0) {
                        seekBar.setMax((int) Math.min(length, Integer.MAX_VALUE));
                        durationView.setText(formatTime(length));
                    }
                });
                break;
            case MediaPlayer.Event.TimeChanged:
                main.post(() -> {
                    if (draggingSeek) {
                        return;
                    }
                    long time = event.getTimeChanged();
                    seekBar.setProgress((int) Math.min(time, seekBar.getMax()));
                    timeView.setText(formatTime(time));
                });
                break;
            case MediaPlayer.Event.Vout:
                main.post(() -> spinner.setVisibility(View.GONE));
                break;
            default:
                break;
        }
    }

    /* ---------------------------------------------------------------- tracks */
    private void refreshTracks(boolean initial) {
        if (player == null) {
            return;
        }
        spuTracks.clear();
        MediaPlayer.TrackDescription[] raw = player.getSpuTracks();
        List<MediaPlayer.TrackDescription> entries = new ArrayList<>();
        if (raw != null) {
            for (MediaPlayer.TrackDescription track : raw) {
                if (track != null && track.id >= 0) {
                    entries.add(track);
                }
            }
        }
        Collections.sort(entries, Comparator.comparingInt(track -> track.id));

        int slaveTotal = loadedSlaves.size();
        // Embedded tracks are opened by the demuxer before the extra subtitle
        // files, so they take the first ids; the attached files follow in the
        // order they were added.
        int embedded = Math.max(0, entries.size() - slaveTotal);
        for (int i = 0; i < entries.size(); i++) {
            MediaPlayer.TrackDescription track = entries.get(i);
            int slot = i - embedded;
            if (slot >= 0 && slot < slaveTotal) {
                spuTracks.add(new SpuTrack(track.id, loadedSlaves.get(slot).label, true));
            } else {
                spuTracks.add(new SpuTrack(track.id, cleanTrackName(track.name), false));
            }
        }
        if (initial) {
            StringBuilder log = new StringBuilder("spu tracks: ");
            for (MediaPlayer.TrackDescription track : entries) {
                log.append(track.id).append('=').append(track.name).append(", ");
            }
            log.append("loaded=").append(loadedSlaves.size())
                    .append(" folder=").append(sidecars.size())
                    .append(" embedded=").append(embedded);
            android.util.Log.d("TFE", log.toString());
        }
        if (!pendingFileLabel.isEmpty()) {
            for (SpuTrack track : spuTracks) {
                if (track.sidecar && track.label.equals(pendingFileLabel)) {
                    player.setSpuTrack(track.id);
                    subTrackId = track.id;
                    pendingFileLabel = "";
                    break;
                }
            }
        }
        // Attached files can appear a moment after playback starts, so keep
        // trying the saved pick on every refresh until it sticks.
        if (initial || !autoSubDone) {
            applyDefaultSubtitle();
        }
        boolean hasText = !spuTracks.isEmpty();
        sizeButton.setVisibility(hasText ? View.VISIBLE : View.GONE);
        delayButton.setVisibility(hasText ? View.VISIBLE : View.GONE);
        sizeButton.setText("Size " + Math.round(subScale * 100) + "%");
    }

    private void applyTracks() {
        if (player == null) {
            return;
        }
        audioTrackId = prefs.getInt(key("audio"), -2);
        subDelayMs = prefs.getLong(key("delay"), 0);
        player.setSpuDelay(subDelayMs * 1000);
        if (audioTrackId >= 0) {
            player.setAudioTrack(audioTrackId);
        }
    }

    private void applyDefaultSubtitle() {
        if (autoSubDone || player == null || userChoseSub) {
            return;
        }
        String pick = prefs.getString(key("subpick"), "");
        if ("off".equals(pick)) {
            subOff = true;
            player.setSpuTrack(-1);
            autoSubDone = true;
            return;
        }
        if ("embedded".equals(pick)) {
            int saved = prefs.getInt(key("embedded"), -1);
            SpuTrack first = null;
            for (SpuTrack track : spuTracks) {
                if (track.sidecar) {
                    continue;
                }
                if (first == null) {
                    first = track;
                }
                if (track.id == saved) {
                    selectTrackSilently(track);
                    return;
                }
            }
            if (first != null) {
                selectTrackSilently(first);
            }
            autoSubDone = true;
            return;
        }
        if ("file".equals(pick)) {
            String wanted = prefs.getString(key("subfile"), "");
            for (SpuTrack track : spuTracks) {
                if (track.sidecar && track.label.equals(wanted)) {
                    selectTrackSilently(track);
                    return;
                }
            }
            // The attached file just has not reported its ES yet.
            if (!loadedSlaves.isEmpty()) {
                return;
            }
        } else if (!loadedSlaves.isEmpty()) {
            for (SpuTrack track : spuTracks) {
                if (track.sidecar && track.label.equals(loadedSlaves.get(0).label)) {
                    selectTrackSilently(track);
                    return;
                }
            }
            return;
        }
        // No usable attachment: fall back to a track inside the movie.
        for (SpuTrack track : spuTracks) {
            if (!track.sidecar) {
                selectTrackSilently(track);
                return;
            }
        }
        autoSubDone = true;
    }

    private void selectTrackSilently(SpuTrack track) {
        player.setSpuTrack(track.id);
        subTrackId = track.id;
        autoSubDone = true;
    }

    private String cleanTrackName(String name) {
        String cleaned = name == null ? "" : name.trim();
        cleaned = cleaned.replaceFirst("(?i)^track\\s*\\d+\\s*[-:]\\s*", "");
        if (cleaned.startsWith("[")) {
            cleaned = cleaned.substring(1);
        }
        if (cleaned.endsWith("]")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        return cleaned.trim().isEmpty() ? "Track" : cleaned.trim();
    }

    /* ------------------------------------------------------------- subtitle UI */
    private void showSubtitleDialog() {
        if (player == null) {
            return;
        }
        refreshTracks(false);
        subTrackId = player.getSpuTrack();

        String current = "off";
        for (SpuTrack track : spuTracks) {
            if (track.id == subTrackId) {
                current = track.label;
            }
        }
        int fileCount = sidecars.size();
        int embeddedCount = 0;
        for (SpuTrack track : spuTracks) {
            if (!track.sidecar) {
                embeddedCount++;
            }
        }

        final List<String> labels = new ArrayList<>();
        final List<Runnable> actions = new ArrayList<>();
        labels.add("Now playing: " + current);
        actions.add(null);
        if (fileCount + embeddedCount > 0) {
            labels.add("Turn subtitles off");
            actions.add(() -> selectSubtitle(null));
        }
        if (embeddedCount > 0) {
            labels.add("Tracks inside the movie (" + embeddedCount + ")...");
            actions.add(this::showEmbeddedSubtitleList);
        }
        if (fileCount > 0) {
            labels.add("Subtitle files in this folder (" + fileCount + ")...");
            actions.add(this::showFileSubtitleList);
        }
        labels.add(String.format(Locale.ROOT, "Delay subtitles by -0.5 s (now %+.1f s)", subDelayMs / 1000f));
        actions.add(() -> nudgeSubDelay(-500));
        labels.add(String.format(Locale.ROOT, "Delay subtitles by +0.5 s (now %+.1f s)", subDelayMs / 1000f));
        actions.add(() -> nudgeSubDelay(500));
        labels.add("Reset subtitle delay");
        actions.add(() -> {
            subDelayMs = 0;
            player.setSpuDelay(0);
            prefs.edit().putLong(key("delay"), 0).apply();
            toast("Subtitle delay reset");
        });
        labels.add("Subtitle size: " + Math.round(subScale * 100) + "%");
        actions.add(this::cycleSubtitleSize);
        labels.add("Search subtitles online...");
        actions.add(this::showSearchDialog);

        new AlertDialog.Builder(this)
                .setTitle("Subtitles")
                .setItems(labels.toArray(new String[0]), (dialog, which) -> {
                    Runnable action = actions.get(which);
                    if (action != null) {
                        action.run();
                    }
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void showFileSubtitleList() {
        if (sidecars.isEmpty()) {
            toast("No subtitle files next to this movie.");
            return;
        }
        subTrackId = player.getSpuTrack();
        String playing = "";
        for (SpuTrack track : spuTracks) {
            if (track.id == subTrackId && track.sidecar) {
                playing = track.label;
            }
        }
        String[] labels = new String[sidecars.size()];
        int checked = -1;
        for (int i = 0; i < sidecars.size(); i++) {
            String label = fileLabel(sidecars.get(i));
            labels[i] = label;
            if (label.equals(playing)) {
                checked = i;
            }
        }
        new AlertDialog.Builder(this)
                .setTitle("Subtitles in this folder")
                .setSingleChoiceItems(labels, checked, (dialog, which) -> {
                    selectFileSubtitle(which);
                    dialog.dismiss();
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void showEmbeddedSubtitleList() {
        showSubtitleList(false);
    }

    private void showSubtitleList(boolean sidecar) {
        final List<SpuTrack> tracks = new ArrayList<>();
        for (SpuTrack track : spuTracks) {
            if (track.sidecar == sidecar) {
                tracks.add(track);
            }
        }
        if (tracks.isEmpty()) {
            toast(sidecar ? "No subtitle files next to this movie." : "No embedded subtitles.");
            return;
        }
        subTrackId = player.getSpuTrack();
        String[] labels = new String[tracks.size()];
        int checked = -1;
        for (int i = 0; i < tracks.size(); i++) {
            SpuTrack track = tracks.get(i);
            labels[i] = track.label + (sidecar ? "  (file)" : "");
            if (track.id == subTrackId) {
                checked = i;
            }
        }
        new AlertDialog.Builder(this)
                .setTitle(sidecar ? "Subtitles in this folder" : "Embedded subtitles")
                .setSingleChoiceItems(labels, checked, (dialog, which) -> {
                    selectSubtitle(tracks.get(which));
                    dialog.dismiss();
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void selectFileSubtitle(int index) {
        if (player == null) {
            return;
        }
        Sidecar sidecar = sidecars.get(index);
        String label = fileLabel(sidecar);
        userChoseSub = true;
        autoSubDone = true;
        subOff = false;
        prefs.edit()
                .putString(key("subpick"), "file")
                .putString(key("subfile"), label)
                .remove(key("suburl"))
                .apply();
        for (SpuTrack track : spuTracks) {
            if (track.sidecar && track.label.equals(label)) {
                player.setSpuTrack(track.id);
                subTrackId = track.id;
                toast("Subtitle: " + label);
                return;
            }
        }
        pendingFileLabel = label;
        loadSidecarSlave(sidecar);
        toast("Subtitle: " + label);
        restartForSubtitle();
    }

    private void selectSubtitle(SpuTrack track) {
        if (player == null) {
            return;
        }
        userChoseSub = true;
        autoSubDone = true;
        if (track == null) {
            player.setSpuTrack(-1);
            subTrackId = -1;
            subOff = true;
            pendingFileLabel = "";
            prefs.edit()
                    .putString(key("subpick"), "off")
                    .remove(key("subfile"))
                    .remove(key("suburl"))
                    .apply();
            toast("Subtitles off");
            return;
        }
        player.setSpuTrack(track.id);
        subTrackId = track.id;
        subOff = false;
        prefs.edit()
                .putString(key("subpick"), "embedded")
                .putInt(key("embedded"), track.id)
                .apply();
        toast("Subtitle: " + track.label);
    }

    private void nudgeSubDelay(long deltaMs) {
        if (player == null) {
            return;
        }
        subDelayMs = Math.max(-60_000, Math.min(60_000, subDelayMs + deltaMs));
        player.setSpuDelay(subDelayMs * 1000);
        prefs.edit().putLong(key("delay"), subDelayMs).apply();
        toast(String.format(Locale.ROOT, "Subtitle delay %+.1f s", subDelayMs / 1000f));
    }

    private void cycleSubtitleSize() {
        int next = 0;
        for (int i = 0; i < SUB_SCALES.length; i++) {
            if (Math.abs(SUB_SCALES[i] - subScale) < 0.01f) {
                next = (i + 1) % SUB_SCALES.length;
                break;
            }
        }
        subScale = SUB_SCALES[next];
        prefs.edit().putFloat(key("scale"), subScale).apply();
        sizeButton.setText("Size " + Math.round(subScale * 100) + "%");
        toast("Subtitle size " + Math.round(subScale * 100) + "%");
        long position = player == null ? 0 : player.getTime();
        pendingSeekMs = position;
        playingOnce = false;
        autoSubDone = false;
        openMedia();
    }

    private void showSpeedDialog() {
        String[] labels = new String[SPEEDS.length];
        int checked = 0;
        for (int i = 0; i < SPEEDS.length; i++) {
            labels[i] = (SPEEDS[i] == 1f ? "Normal (1x)" : SPEEDS[i] + "x");
            if (Math.abs(SPEEDS[i] - speed) < 0.01f) {
                checked = i;
            }
        }
        new AlertDialog.Builder(this)
                .setTitle("Playback speed")
                .setSingleChoiceItems(labels, checked, (dialog, which) -> {
                    speed = SPEEDS[which];
                    if (player != null) {
                        player.setRate(speed);
                    }
                    prefs.edit().putFloat(key("speed"), speed).apply();
                    updateSpeedLabel();
                    dialog.dismiss();
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void showDelayDialog() {
        String[] labels = {"-0.5 s", "+0.5 s", "Reset"};
        new AlertDialog.Builder(this)
                .setTitle("Subtitle delay")
                .setItems(labels, (dialog, which) -> {
                    if (which == 2) {
                        subDelayMs = 0;
                        player.setSpuDelay(0);
                        prefs.edit().putLong(key("delay"), 0).apply();
                        toast("Subtitle delay reset");
                    } else {
                        nudgeSubDelay(which == 0 ? -500 : 500);
                    }
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void updateSpeedLabel() {
        if (speedButton != null) {
            speedButton.setText(speed == 1f ? "Speed 1x" : "Speed " + trim(speed) + "x");
        }
    }

    private String trim(float value) {
        if (Math.abs(value - Math.round(value)) < 0.01f) {
            return String.valueOf((int) Math.round(value));
        }
        return String.valueOf(value);
    }

    /* ---------------------------------------------------------------- audio */
    private void showAudioDialog() {
        if (player == null) {
            return;
        }
        MediaPlayer.TrackDescription[] raw = player.getAudioTracks();
        final List<Integer> ids = new ArrayList<>();
        final List<String> labels = new ArrayList<>();
        if (raw != null) {
            List<MediaPlayer.TrackDescription> entries = new ArrayList<>();
            for (MediaPlayer.TrackDescription track : raw) {
                if (track != null && track.id >= 0) {
                    entries.add(track);
                }
            }
            Collections.sort(entries, Comparator.comparingInt(track -> track.id));
            for (MediaPlayer.TrackDescription track : entries) {
                ids.add(track.id);
                labels.add(cleanTrackName(track.name));
            }
        }
        if (labels.isEmpty()) {
            toast("This file has one audio track.");
            return;
        }
        int current = player.getAudioTrack();
        int checked = Math.max(0, ids.indexOf(current));
        new AlertDialog.Builder(this)
                .setTitle("Audio track")
                .setSingleChoiceItems(labels.toArray(new String[0]), checked, (dialog, which) -> {
                    int id = ids.get(which);
                    player.setAudioTrack(id);
                    prefs.edit().putInt(key("audio"), id).apply();
                    audioTrackId = id;
                    dialog.dismiss();
                    toast("Audio: " + labels.get(which));
                })
                .setNegativeButton("Close", null)
                .show();
    }

    /* ------------------------------------------------------- online subtitles */
    private void showSearchDialog() {
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(12), dp(20), dp(8));

        TextView hint = new TextView(this);
        hint.setText("Searches OpenSubtitles with the movie title. Results download "
                + "straight into this player.");
        hint.setTextSize(12);
        hint.setTextColor(Color.rgb(96, 102, 110));
        content.addView(hint);

        EditText query = new EditText(this);
        query.setHint("Movie name");
        query.setText(searchQuery);
        query.setSingleLine(true);
        content.addView(query);

        LinearLayout languageRow = new LinearLayout(this);
        languageRow.setOrientation(LinearLayout.HORIZONTAL);
        languageRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView languageLabel = new TextView(this);
        languageLabel.setText("Language code");
        languageLabel.setTextSize(13);
        LinearLayout.LayoutParams languageLabelParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        languageRow.addView(languageLabel, languageLabelParams);
        EditText language = new EditText(this);
        language.setText("eng");
        language.setSingleLine(true);
        language.setWidth(dp(90));
        languageRow.addView(language);
        content.addView(languageRow);

        Button search = new Button(this);
        search.setText("Search");
        content.addView(search);

        TextView status = new TextView(this);
        status.setTextSize(13);
        status.setPadding(0, dp(8), 0, 0);
        content.addView(status);

        ScrollView scroll = new ScrollView(this);
        LinearLayout results = new LinearLayout(this);
        results.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(results);
        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(240));
        content.addView(scroll, scrollParams);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Subtitles online")
                .setView(content)
                .setNegativeButton("Close", null)
                .create();

        search.setOnClickListener(v -> {
            String text = query.getText().toString().trim();
            String lang = language.getText().toString().trim();
            if (text.isEmpty()) {
                status.setText("Type the movie name first.");
                return;
            }
            results.removeAllViews();
            status.setText("Searching...");
            search.setEnabled(false);
            worker.execute(() -> {
                try {
                    String path = "/api/play/subs/search?item_id=" + itemId
                            + "&q=" + Uri.encode(text) + "&lang=" + Uri.encode(lang);
                    JSONObject reply = new JSONObject(httpJson(path, "GET", null));
                    JSONArray list = reply.optJSONArray("results");
                    main.post(() -> {
                        search.setEnabled(true);
                        if (list == null || list.length() == 0) {
                            status.setText("No subtitles found. Try another name or language.");
                            return;
                        }
                        status.setText(list.length() + " results - tap one to add it");
                        for (int i = 0; i < list.length(); i++) {
                            JSONObject row = list.optJSONObject(i);
                            if (row == null) {
                                continue;
                            }
                            results.addView(resultRow(row, dialog));
                        }
                    });
                } catch (Exception error) {
                    main.post(() -> {
                        search.setEnabled(true);
                        status.setText(friendly(error));
                    });
                }
            });
        });

        dialog.show();
    }

    private View resultRow(JSONObject row, AlertDialog parent) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(6), dp(10), dp(6), dp(10));

        TextView name = new TextView(this);
        String label = row.optString("name");
        name.setText(label);
        name.setTextSize(14);
        name.setTextColor(Color.rgb(20, 22, 26));
        layout.addView(name);

        TextView meta = new TextView(this);
        String language = row.optString("language");
        String format = row.optString("format");
        int downloads = row.optInt("downloads");
        meta.setText(language + "  |  " + format + "  |  " + downloads + " downloads");
        meta.setTextSize(12);
        meta.setTextColor(Color.rgb(106, 112, 120));
        layout.addView(meta);

        String release = row.optString("release");
        if (!release.isEmpty()) {
            TextView releaseView = new TextView(this);
            releaseView.setText(release);
            releaseView.setTextSize(11);
            releaseView.setTextColor(Color.rgb(140, 146, 154));
            releaseView.setSingleLine(true);
            releaseView.setEllipsize(android.text.TextUtils.TruncateAt.MIDDLE);
            layout.addView(releaseView);
        }

        layout.setOnClickListener(v -> {
            parent.dismiss();
            downloadSubtitle(row);
        });
        return layout;
    }

    private void downloadSubtitle(JSONObject row) {
        final String url = row.optString("url");
        final String label = row.optString("name");
        if (url.isEmpty()) {
            toast("That subtitle cannot be downloaded.");
            return;
        }
        toast("Downloading subtitle...");
        worker.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("item_id", itemId);
                body.put("url", url);
                body.put("label", label);
                JSONObject reply = new JSONObject(
                        httpJson("/api/play/subs/download", "POST", body.toString()));
                String path = reply.optString("url");
                if (path.isEmpty()) {
                    throw new IOException("The subtitle could not be saved.");
                }
                String absolute = path.startsWith("http") ? path : HOST + path;
                String display = reply.optString("label", label);
                main.post(() -> {
                    loadedSlaves.add(new Slave(absolute, display));
                    subOff = false;
                    pendingFileLabel = display;
                    prefs.edit()
                            .putString(key("subpick"), "file")
                            .putString(key("subfile"), display)
                            .putString(key("suburl"), absolute)
                            .apply();
                    toast("Subtitle added: " + display);
                    restartForSubtitle();
                });
            } catch (Exception error) {
                main.post(() -> toast(friendly(error)));
            }
        });
    }

    /* ----------------------------------------------------------- position/save */
    private void savePosition() {
        if (player == null || !playingOnce) {
            return;
        }
        long time = player.getTime();
        long length = player.getLength();
        if (time < 1000 || length <= 0) {
            return;
        }
        final long position = time / 1000;
        final long duration = length / 1000;
        // A plain thread survives the activity teardown long enough to finish
        // the write; the worker pool is stopped with the activity.
        Thread save = new Thread(() -> {
            try {
                JSONObject body = new JSONObject();
                body.put("position", position);
                body.put("duration", duration);
                httpJson("/api/items/" + itemId + "/position", "POST", body.toString());
            } catch (Exception ignored) {
                // Playback must not stop because a position write failed.
            }
        });
        save.setDaemon(true);
        save.start();
    }

    /* ------------------------------------------------------------ touch input */
    private boolean handleTouch(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = event.getX();
                downY = event.getY();
                downTime = System.currentTimeMillis();
                gestureMode = 0;
                seekPreviewMs = -1;
                seekStartMs = player == null ? 0 : player.getTime();
                startBrightness = getWindow().getAttributes().screenBrightness;
                AudioManager audio = (AudioManager) getSystemService(AUDIO_SERVICE);
                startVolume = audio == null ? 0 : audio.getStreamVolume(AudioManager.STREAM_MUSIC);
                return true;
            case MotionEvent.ACTION_MOVE:
                float dx = event.getX() - downX;
                float dy = event.getY() - downY;
                float slop = dp(18);
                if (gestureMode == 0) {
                    if (Math.abs(dx) > slop && Math.abs(dx) > Math.abs(dy) * 1.4f) {
                        gestureMode = 1;
                        showControls();
                    } else if (Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx) * 1.4f) {
                        gestureMode = downX > getWindow().getDecorView().getWidth() / 2f ? 3 : 2;
                    }
                }
                if (gestureMode == 1 && player != null) {
                    long length = player.getLength();
                    if (length > 0) {
                        long shift = (long) (dx / Math.max(1f, videoLayout.getWidth()) * 180_000);
                        seekPreviewMs = Math.max(0, Math.min(length - 1000, seekStartMs + shift));
                        showHint(formatTime(seekPreviewMs) + "  /  " + formatTime(length));
                    }
                } else if (gestureMode == 2) {
                    WindowManager.LayoutParams params = getWindow().getAttributes();
                    float base = startBrightness < 0 ? 0.5f : startBrightness;
                    float value = Math.max(0.02f, Math.min(1f, base - dy / dp(300)));
                    params.screenBrightness = value;
                    getWindow().setAttributes(params);
                    showHint("Brightness " + Math.round(value * 100) + "%");
                } else if (gestureMode == 3) {
                    AudioManager sound = (AudioManager) getSystemService(AUDIO_SERVICE);
                    if (sound != null) {
                        int max = sound.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                        float ratio = Math.max(0f, Math.min(1f,
                                startVolume / (float) max - dy / dp(300)));
                        int volume = Math.round(ratio * max);
                        sound.setStreamVolume(AudioManager.STREAM_MUSIC, volume, 0);
                        showHint("Volume " + Math.round(ratio * 100) + "%");
                    }
                }
                return true;
            case MotionEvent.ACTION_UP:
                float moveX = Math.abs(event.getX() - downX);
                float moveY = Math.abs(event.getY() - downY);
                long pressTime = System.currentTimeMillis() - downTime;
                if (gestureMode == 1 && seekPreviewMs >= 0 && player != null) {
                    player.setTime(seekPreviewMs, true);
                    seekPreviewMs = -1;
                }
                hideHint();
                gestureMode = 0;
                if (moveX < dp(14) && moveY < dp(14) && pressTime < 320) {
                    if (pendingSingleTap != null) {
                        main.removeCallbacks(pendingSingleTap);
                        pendingSingleTap = null;
                        togglePlayPause();
                    } else {
                        pendingSingleTap = () -> {
                            pendingSingleTap = null;
                            setControlsVisible(!controlsVisible);
                        };
                        main.postDelayed(pendingSingleTap, 260);
                    }
                }
                return true;
            default:
                return true;
        }
    }

    private void showHint(String text) {
        hintView.setText(text);
        hintView.setVisibility(View.VISIBLE);
    }

    private void hideHint() {
        hintView.setVisibility(View.GONE);
    }

    /* ------------------------------------------------------------- overlay UI */
    private void showControls() {
        setControlsVisible(true);
    }

    private void setControlsVisible(boolean visible) {
        controlsVisible = visible;
        topBar.setVisibility(visible ? View.VISIBLE : View.GONE);
        bottomBar.setVisibility(visible ? View.VISIBLE : View.GONE);
        playButton.setVisibility(visible && (player == null || !player.isPlaying())
                ? View.VISIBLE : View.GONE);
        main.removeCallbacks(hideControls);
        if (visible && player != null && player.isPlaying()) {
            main.postDelayed(hideControls, 4500);
        }
    }

    private void enterPip() {
        if (Build.VERSION.SDK_INT < 26 || player == null) {
            return;
        }
        setControlsVisible(false);
        try {
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
            enterPictureInPictureMode(params);
        } catch (Exception ignored) {
            toast("PiP is not available here.");
        }
    }

    private void toggleOrientationLock() {
        orientationLocked = !orientationLocked;
        if (orientationLocked) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LOCKED);
            lockButton.setText("Unlock");
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            lockButton.setText("Lock");
        }
        toast(orientationLocked ? "Rotation locked" : "Rotation unlocked");
    }

    /* ------------------------------------------------------------- networking */
    private String httpJson(String path, String method, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(HOST + path).openConnection();
        try {
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(45_000);
            connection.setRequestMethod(method);
            connection.setRequestProperty("Accept", "application/json");
            String cookie = CookieManager.getInstance().getCookie(HOST);
            if (cookie != null && !cookie.isEmpty()) {
                connection.setRequestProperty("Cookie", cookie);
            }
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("X-TFE", "1");
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(body.getBytes("UTF-8"));
                }
            }
            int code = connection.getResponseCode();
            InputStream input = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String text = input == null ? "" : readAll(input);
            if (code >= 400) {
                String detail = text;
                try {
                    JSONObject error = new JSONObject(text);
                    detail = error.optString("detail", text);
                } catch (Exception ignored) {
                    // Keep the raw error text.
                }
                throw new IOException(detail == null || detail.isEmpty()
                        ? "Request failed (" + code + ")" : detail);
            }
            return text;
        } finally {
            connection.disconnect();
        }
    }

    private String readAll(InputStream input) throws IOException {
        try (InputStream stream = input) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[16 * 1024];
            int read;
            while ((read = stream.read(chunk)) > 0) {
                buffer.write(chunk, 0, read);
            }
            return buffer.toString("UTF-8");
        }
    }

    /* ---------------------------------------------------------------- system */
    @Override
    protected void onPause() {
        super.onPause();
        savePosition();
        if (!isInPip() && player != null && player.isPlaying()) {
            player.pause();
        }
    }

    @Override
    protected void onStop() {
        savePosition();
        super.onStop();
    }

    private boolean isInPip() {
        if (Build.VERSION.SDK_INT < 24) {
            return false;
        }
        return isInPictureInPictureMode();
    }

    @Override
    public void onUserLeaveHint() {
        if (Build.VERSION.SDK_INT >= 26 && player != null && player.isPlaying()) {
            try {
                enterPictureInPictureMode(new PictureInPictureParams.Builder()
                        .setAspectRatio(new Rational(16, 9))
                        .build());
                setControlsVisible(false);
            } catch (Exception ignored) {
                // Falling back to a normal pause is fine.
            }
        }
        super.onUserLeaveHint();
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPictureInPicture,
                                                 Configuration configuration) {
        super.onPictureInPictureModeChanged(inPictureInPicture, configuration);
        setControlsVisible(!inPictureInPicture);
    }

    @Override
    public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
            savePosition();
        } else if (keyCode == android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                || keyCode == android.view.KeyEvent.KEYCODE_HEADSETHOOK) {
            togglePlayPause();
            return true;
        } else if (keyCode == android.view.KeyEvent.KEYCODE_SPACE) {
            togglePlayPause();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        if (player != null) {
            savePosition();
            try {
                player.setEventListener(null);
                player.stop();
                player.detachViews();
                player.release();
            } catch (Exception ignored) {
                // Shutting down anyway.
            }
            player = null;
        }
        if (media != null) {
            media.release();
            media = null;
        }
        if (libVLC != null) {
            libVLC.release();
            libVLC = null;
        }
        worker.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersive();
        }
    }

    private void enterImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    private String key(String suffix) {
        return "p_" + itemId + "_" + suffix;
    }

    private String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    /* "Scary.Movie.2026.1080p.WEBRip.x264" -> "Scary Movie 2026" for the
       online subtitle search box. */
    private String movieName(String name) {
        String base = name == null ? "" : name;
        int dot = base.lastIndexOf('.');
        String extension = dot > 0 ? base.substring(dot + 1) : "";
        if (dot > 0 && extension.length() <= 5 && extension.matches("[A-Za-z0-9]+")) {
            base = base.substring(0, dot);
        }
        String lower = base.toLowerCase(Locale.ROOT);
        String[] releaseTokens = {"480p", "576p", "720p", "1080p", "2160p", "4k",
                "webrip", "web-dl", "webdl", "web", "bluray", "blu-ray", "brrip",
                "bdrip", "hdrip", "dvdrip", "hdtv", "x264", "x265", "h264", "h265",
                "hevc", "avc", "aac", "ac3", "eac3", "dts", "ddp", "dd5", "atmos",
                "hdr", "remux", "proper", "repack", "yts", "rarbg"};
        int cut = base.length();
        for (String token : releaseTokens) {
            for (String prefix : new String[]{".", " ", "_"}) {
                int index = lower.indexOf(prefix + token);
                if (index > 0 && index < cut) {
                    cut = index;
                }
            }
        }
        base = base.substring(0, cut);
        base = base.replace('.', ' ').replace('_', ' ');
        base = base.replaceAll("\\[[^\\]]*\\]|\\([^)]*\\)", " ");
        base = base.replaceAll("[\\s-]+", " ").trim();
        return base.isEmpty() ? (name == null ? "" : name) : base;
    }

    private boolean isEmulator() {
        return Build.FINGERPRINT.contains("generic")
                || Build.FINGERPRINT.contains("emulator")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu");
    }

    private String friendly(Exception error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
                ? "Something went wrong." : message;
    }

    private String formatTime(long millis) {
        long total = Math.max(0, millis) / 1000;
        long hours = total / 3600;
        long minutes = (total % 3600) / 60;
        long seconds = total % 60;
        if (hours > 0) {
            return String.format(Locale.ROOT, "%d:%02d:%02d", hours, minutes, seconds);
        }
        return String.format(Locale.ROOT, "%d:%02d", minutes, seconds);
    }

    private void toast(String message) {
        main.post(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,
                value, getResources().getDisplayMetrics()));
    }
}
