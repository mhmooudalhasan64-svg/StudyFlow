package com.vayora.audiocapture;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.annotation.Permission;

import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeAudioCapture",
    permissions = { @Permission(alias = "audio", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class NativeAudioCapturePlugin extends Plugin {
    private static final int SAMPLE_RATE = 16000;
    private MediaProjection projection;
    private AudioRecord recorder;
    private SpeechRecognizer recognizer;
    private ParcelFileDescriptor readPipe;
    private ParcelFileDescriptor writePipe;
    private Thread audioThread;
    private volatile boolean running = false;

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            call.reject("يلزم Android 13 أو أحدث لاستخدام مصدر الصوت المباشر مع خدمة التعرّف على الكلام.");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("لا توجد خدمة تعرّف على الكلام متاحة على هذا الجهاز.");
            return;
        }
        if (getPermissionState("audio") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("audio", call, "startAfterPermission");
            return;
        }
        requestProjection(call);
    }

    @PermissionCallback
    private void startAfterPermission(PluginCall call) {
        if (getPermissionState("audio") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("يجب السماح بإذن تسجيل الصوت أولاً.");
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
                @Override public void onStop() { stopCapture(); notifyCaptureError("أوقف Android جلسة التقاط صوت الجهاز."); }
            }, null);
            startAudioPipeline();
            JSObject response = new JSObject();
            response.put("active", true);
            response.put("source", "android-playback");
            call.resolve(response);
        } catch (Exception error) {
            stopCapture();
            call.reject("تعذّر بدء التقاط صوت الفيديو: " + error.getMessage());
        }
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
        int minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        recorder = new AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(Math.max(minBuffer * 2, 8192))
            .setAudioPlaybackCaptureConfig(config)
            .build();
        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) throw new IllegalStateException("تعذّر تهيئة مسجّل صوت النظام.");

        ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
        readPipe = pipe[0];
        writePipe = pipe[1];
        recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(android.os.Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onError(int error) { notifyCaptureError("تعذّر على خدمة التعرّف معالجة صوت النظام (رمز " + error + "). قد لا تدعم الخدمة مصدر الصوت المباشر."); stopCapture(); }
            @Override public void onResults(android.os.Bundle results) { emitTranscript(results, true); }
            @Override public void onPartialResults(android.os.Bundle results) { emitTranscript(results, false); }
            @Override public void onEvent(int eventType, android.os.Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-SA");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, readPipe);
        intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1);
        intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, AudioFormat.ENCODING_PCM_16BIT);
        intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, SAMPLE_RATE);

        recorder.startRecording();
        if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) throw new IllegalStateException("لم يبدأ التقاط تشغيل الوسائط.");
        running = true;
        recognizer.startListening(intent);
        audioThread = new Thread(() -> pumpAudio(), "VayoraPlaybackAudio");
        audioThread.start();
    }

    private void pumpAudio() {
        byte[] buffer = new byte[4096];
        try (FileOutputStream output = new FileOutputStream(writePipe.getFileDescriptor())) {
            while (running) {
                int count = recorder.read(buffer, 0, buffer.length);
                if (count > 0) output.write(buffer, 0, count);
                else if (count < 0) throw new IOException("AudioRecord read error " + count);
            }
        } catch (Exception error) {
            if (running) notifyCaptureError("انقطع تدفق صوت الجهاز: " + error.getMessage());
        }
    }

    private void emitTranscript(android.os.Bundle bundle, boolean isFinal) {
        if (bundle == null) return;
        ArrayList<String> matches = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;
        JSObject event = new JSObject();
        event.put("text", matches.get(0));
        event.put("final", isFinal);
        notifyListeners("transcript", event);
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
        if (recognizer != null) {
            try { recognizer.stopListening(); } catch (Exception ignored) {}
            recognizer.destroy();
            recognizer = null;
        }
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            recorder.release();
            recorder = null;
        }
        if (projection != null) {
            projection.stop();
            projection = null;
        }
        closeQuietly(readPipe);
        closeQuietly(writePipe);
        readPipe = null;
        writePipe = null;
        audioThread = null;
    }

    private void closeQuietly(ParcelFileDescriptor descriptor) {
        if (descriptor != null) try { descriptor.close(); } catch (IOException ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        stopCapture();
        super.handleOnDestroy();
    }
}
