# VAYORA Android local transcription

Android playback transcription uses the pinned whisper.cpp engine and the multilingual
`ggml-base-q5_1.bin` model. The model is fetched only during the Android CI build,
verified against its SHA-256 digest, and packaged as an Android library asset. The
installed app copies it from its bundled assets into private app storage and verifies
the digest again before initializing Whisper. No model download is performed by the
installed app.

- Model repository: https://huggingface.co/ggerganov/whisper.cpp
- Model revision: `f281eb45af861ab5e5297d23694b7d46e090c02c`
- Model file: `ggml-base-q5_1.bin`
- Model size reported by the host: 59.7 MB
- SHA-256: `422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898`
- Engine repository: https://github.com/ggml-org/whisper.cpp
- Engine revision: `6a8addd258eadd6563f8c582e8acc535e6325364`

Android uses `MediaProjection` plus `AudioPlaybackCaptureConfiguration` to capture
eligible media playback as 16 kHz mono PCM. The native JNI bridge passes PCM chunks
directly to whisper.cpp. Android's microphone speech-recognition service is not used
as a fallback. Playback capture remains subject to Android's permission prompt,
source-app capture policy, profile, and platform restrictions; some apps/videos may
not permit capture.

The web build retains its existing browser microphone recognition path.
