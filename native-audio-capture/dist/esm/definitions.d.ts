import type { PluginListenerHandle } from '@capacitor/core';
export interface PlaybackCaptureStatus { active: boolean; source: 'android-playback'; }
export interface PlaybackTranscript { text: string; final: boolean; }
export interface NativeAudioCapturePlugin {
  start(): Promise<PlaybackCaptureStatus>;
  stop(): Promise<void>;
  addListener(eventName: 'transcript', listenerFunc: (event: PlaybackTranscript) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'captureError', listenerFunc: (event: { message: string }) => void): Promise<PluginListenerHandle>;
}
