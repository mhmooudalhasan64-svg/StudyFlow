package com.vayora.audiocapture;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

public final class PlaybackCaptureService extends Service {
    private static final String CHANNEL_ID = "vayora_playback_capture";
    private static final int NOTIFICATION_ID = 7401;
    private static Runnable pendingReadyCallback;

    public static void startAfterConsent(Context context, Runnable onReady) {
        synchronized (PlaybackCaptureService.class) {
            pendingReadyCallback = onReady;
        }
        Intent intent = new Intent(context, PlaybackCaptureService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void clearPendingCallback() {
        synchronized (PlaybackCaptureService.class) {
            pendingReadyCallback = null;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "التقاط صوت الفيديو", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("إشعار ظاهر أثناء تحليل صوت تشغيل الوسائط داخل VAYORA");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        Notification notification = builder
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("VAYORA — AVORA")
            .setContentText("يحلّل صوت الفيديو المسموح به من النظام")
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Runnable callback;
        synchronized (PlaybackCaptureService.class) {
            callback = pendingReadyCallback;
            pendingReadyCallback = null;
        }
        if (callback != null) callback.run();
        return START_NOT_STICKY;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        clearPendingCallback();
        super.onDestroy();
    }
}
