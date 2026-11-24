package com.mhmooud.studyflow;

import com.getcapacitor.BridgeActivity;
import com.mhmooud.studyflow.notifications.NotificationPermissionPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NotificationPermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}