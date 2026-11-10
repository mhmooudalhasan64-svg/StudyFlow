#include <jni.h>
#include <string>
#include <algorithm>
#include "whisper.h"

extern "C" JNIEXPORT jlong JNICALL
Java_com_vayora_audiocapture_NativeAudioCapturePlugin_nativeInit(
        JNIEnv *env, jclass, jstring model_path) {
    const char *path = env->GetStringUTFChars(model_path, nullptr);
    whisper_context_params context_params = whisper_context_default_params();
    context_params.use_gpu = false;
    whisper_context *ctx = whisper_init_from_file_with_params(path, context_params);
    env->ReleaseStringUTFChars(model_path, path);
    return reinterpret_cast<jlong>(ctx);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_vayora_audiocapture_NativeAudioCapturePlugin_nativeTranscribe(
        JNIEnv *env, jclass, jlong context_ptr, jfloatArray audio, jint threads) {
    auto *ctx = reinterpret_cast<whisper_context *>(context_ptr);
    if (ctx == nullptr || audio == nullptr) return env->NewStringUTF("");

    const jsize count = env->GetArrayLength(audio);
    if (count <= 0) return env->NewStringUTF("");

    jfloat *samples = env->GetFloatArrayElements(audio, nullptr);
    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.n_threads = std::max(1, std::min(threads, 6));
    params.language = "auto";
    params.translate = false;
    params.no_context = true;
    params.single_segment = false;
    params.print_realtime = false;
    params.print_progress = false;
    params.print_timestamps = false;
    params.print_special = false;

    std::string output;
    if (whisper_full(ctx, params, samples, count) == 0) {
        const int segments = whisper_full_n_segments(ctx);
        for (int i = 0; i < segments; ++i) {
            const char *segment = whisper_full_get_segment_text(ctx, i);
            if (segment != nullptr) output += segment;
        }
    }
    env->ReleaseFloatArrayElements(audio, samples, JNI_ABORT);
    return env->NewStringUTF(output.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_com_vayora_audiocapture_NativeAudioCapturePlugin_nativeFree(
        JNIEnv *, jclass, jlong context_ptr) {
    auto *ctx = reinterpret_cast<whisper_context *>(context_ptr);
    if (ctx != nullptr) whisper_free(ctx);
}
