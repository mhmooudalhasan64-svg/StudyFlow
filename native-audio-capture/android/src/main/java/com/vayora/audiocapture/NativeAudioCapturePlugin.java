package com.vayora.audiocapture;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.ParcelFileDescriptor;

import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "NativeAudioCapture",
    permissions = { @Permission(alias = "audio", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class NativeAudioCapturePlugin extends Plugin {
    private static final int SAMPLE_RATE = 16000;
    private static final int CHUNK_SECONDS = 10;
    private static final String MODEL_ASSET = "models/ggml-base-q5_1.bin";
    private static final String MODEL_SHA256 = "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898";

    static {
        System.loadLibrary("vayora_whisper");
    }

    private static native long nativeInit(String modelPath);
    private static native String nativeTranscribe(long context, float[] samples, int threads);
    private static native void nativeFree(long context);

    private MediaProjection projection;
    private AudioRecord recorder;
    private Thread captureThread;
    private volatile boolean running = false;
    private volatile long whisperContext = 0L;
    private ExecutorService inferenceExecutor;

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29) {
            call.reject("يلزم Android 10 أو أحدث لالتقاط صوت تشغيل الوسائط.");
            return;
        }
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "audioPermissionResult");
            return;
        }
        requestProjection(call);
    }

    @PermissionCallback
    private void audioPermissionResult(PluginCall call) {
        if (call == null) return;
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            call.reject("يجب السماح بإذن الصوت لبدء التقاط تشغيل الوسائط.");
            return;
        }
        requestProjection(call);
    }

    private void requestProjection(PluginCall call) {
        MediaProjectionManager manager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(call, manager.createScreenCaptureIntent(), "projectionResult");
    }

    @ActivityCallback
    private void projectionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("ألغيت موافقة Android على التقاط صوت الجهاز.");
            return;
        }
        try {
            MediaProjectionManager manager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            projection = manager.getMediaProjection(result.getResultCode(), result.getData());
            if (projection == null) throw new IllegalStateException("تعذّر بدء جلسة التقاط النظام.");
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() {
                    if (running) {
                        stopCapture();
                        notifyCaptureError("أوقف Android جلسة التقاط صوت الجهاز.");
                    }
                }
            }, null);

            new Thread(() -> {
                try {
                    ensureModelLoaded();
                    startAudioPipeline();
                    JSObject response = new JSObject();
                    response.put("active", true);
                    response.put("source", "android-playback");
                    call.resolve(response);
                } catch (Exception error) {
                    stopCapture();
                    call.reject("تعذّر تشغيل Whisper أو التقاط صوت الفيديو: " + error.getMessage());
                }
            }, "VayoraWhisperInit").start();
        } catch (Exception error) {
            stopCapture();
            call.reject("تعذّر بدء التقاط صوت الفيديو: " + error.getMessage());
        }
    }

    private synchronized void ensureModelLoaded() throws Exception {
        if (whisperContext != 0L) return;
        File model = new File(getContext().getFilesDir(), "ggml-base-q5_1.bin");
        if (!model.exists() || !MODEL_SHA256.equals(sha256(model))) {
            AssetManager assets = getContext().getAssets();
            File temporary = new File(getContext().getFilesDir(), "ggml-base-q5_1.bin.part");
            try (InputStream input = assets.open(MODEL_ASSET);
                 FileOutputStream output = new FileOutputStream(temporary)) {
                byte[] buffer = new byte[1024 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
                output.getFD().sync();
            }
            if (!MODEL_SHA256.equals(sha256(temporary))) {
                temporary.delete();
                throw new IllegalStateException("فشل التحقق من سلامة نموذج Whisper المضمّن.");
            }
            if (model.exists()) model.delete();
            if (!temporary.renameTo(model)) throw new IllegalStateException("تعذّر تجهيز نموذج Whisper داخل التطبيق.");
        }
        whisperContext = nativeInit(model.getAbsolutePath());
        if (whisperContext == 0L) throw new IllegalStateException("لم يتمكن محرك Whisper من تحميل النموذج.");
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new java.io.FileInputStream(file)) {
            byte[] buffer = new byte[1024 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        StringBuilder result = new StringBuilder();
        for (byte value : digest.digest()) result.append(String.format("%02x", value));
        return result.toString();
    }

    private void startAudioPipeline() throws Exception {
        AudioPlaybackCaptureConfiguration config = new AudioPlaybackCaptureConfiguration.Builder(projection)
            .addMatchingUsage(android.media.AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(android.media.AudioAttributes.USAGE_GAME)
            .addMatchingUsage(android.media.AudioAttributes.USAGE_UNKNOWN)
            .build();

        AudioFormat format = new AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
            .build();
        int minimum = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        recorder = new AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(Math.max(minimum * 4, 32768))
            .setAudioPlaybackCaptureConfig(config)
            .build();
        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) throw new IllegalStateException("تعذّر تهيئة التقاط صوت الوسائط.");

        inferenceExecutor = Executors.newSingleThreadExecutor();
        recorder.startRecording();
        if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) throw new IllegalStateException("لم يبدأ التقاط صوت النظام.");
        running = true;
        captureThread = new Thread(this::captureLoop, "VayoraPlaybackCapture");
        captureThread.start();
    }

    private void captureLoop() {
        final int chunkSamples = SAMPLE_RATE * CHUNK_SECONDS;
        float[] chunk = new float[chunkSamples];
        byte[] buffer = new byte[8192];
        int filled = 0;
        try {
            while (running) {
                int count = recorder.read(buffer, 0, buffer.length);
                if (count < 0) throw new IllegalStateException("AudioRecord read error " + count);
                for (int i = 0; i + 1 < count && filled < chunkSamples; i += 2) {
                    short sample = (short) ((buffer[i] & 0xff) | (buffer[i + 1] << 8));
                    chunk[filled++] = sample / 32768.0f;
                }
                if (filled == chunkSamples) {
                    final float[] completed = chunk;
                    inferenceExecutor.execute(() -> transcribeChunk(completed));
                    chunk = new float[chunkSamples];
                    filled = 0;
                }
            }
        } catch (Exception error) {
            if (running) {
                notifyCaptureError("تعذّر التقاط صوت تشغيل الفيديو: " + error.getMessage());
                stopCapture();
            }
        }
    }

    private void transcribeChunk(float[] samples) {
        if (!running || whisperContext == 0L) return;
        try {
            String text = nativeTranscribe(whisperContext, samples, Math.max(2, Runtime.getRuntime().availableProcessors() / 2));
            if (text != null && !text.trim().isEmpty() && running) {
                JSObject event = new JSObject();
                event.put("text", text.trim());
                event.put("final", true);
                notifyListeners("transcript", event);
            }
        } catch (Exception error) {
            if (running) notifyCaptureError("تعذّر تحويل مقطع الصوت إلى نص: " + error.getMessage());
        }
    }

    private void notifyCaptureError(String message) {
        JSObject event = new JSObject();
        event.put("message", message);
        notifyListeners("captureError", event);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopCapture();
        call.resolve();
    }

    private synchronized void stopCapture() {
        running = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release();
            recorder = null;
        }
        if (projection != null) {
            try { projection.stop(); } catch (Exception ignored) {}
            projection = null;
        }
        if (inferenceExecutor != null) {
            inferenceExecutor.shutdownNow();
            inferenceExecutor = null;
        }
        captureThread = null;
    }

    @Override
    protected void handleOnDestroy() {
        stopCapture();
        if (whisperContext != 0L) {
            nativeFree(whisperContext);
            whisperContext = 0L;
        }
        super.handleOnDestroy();
    }
}
