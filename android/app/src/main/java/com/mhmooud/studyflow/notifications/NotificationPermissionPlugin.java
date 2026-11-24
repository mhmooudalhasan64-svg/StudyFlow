package com.mhmooud.studyflow.notifications;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class NotificationPermissionPlugin extends Plugin {
    @PluginMethod
    public void checkNotificationsPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.put("granted", true);
        } else {
            result.put("granted", getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        if (getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsPermissionCallback");
    }

    @SuppressWarnings("unused")
    private void notificationsPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED);
        call.resolve(result);
    }
}