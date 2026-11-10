# VAYORA AI Runtime Audit

**Audit date:** 2026-11-10  
**Scope:** Read-only review of the live Railway preview API and the current `aurevon-premium-refresh` development branch. No secrets were read, no environment variables were changed, and no deployment was triggered.

## Executive finding

The live VAYORA chat API is reachable, but the AI provider is not configured with a provider key accepted by the deployed chat handler. This is an upstream configuration failure, not a general internet-connectivity failure in the Android client.

## Evidence from the live Railway preview

- Railway project: `StudyFlow`
- Service: `studyflow-preview`
- Environment: `preview`
- Live source branch: `feat/vayora-aurevon-skova-identity`
- Latest successful deployment at audit time: commit `6e8846ff37bb79873ffa87b5ecff773172ea8805`
- The service has `OPENAI_API_KEY`, `REDIS_URL`, and `VAYORA_ALLOWED_ORIGINS` configured.
- The deployed chat provider selector accepts `GROQ_API_KEY` first, then `OPENROUTER_API_KEY`. It does not accept `OPENAI_API_KEY` for chat.
- No `GROQ_API_KEY` or `OPENROUTER_API_KEY` variable is present in the service configuration.
- Railway HTTP logs show repeated `POST /api/chat` responses with status `503` from the Android WebView on 2026-11-08. The API is being reached; it refuses the request because no supported chat provider is configured.

## Speech / TTS finding

- The live code's current `api/tts.ts` intentionally returns `410` and directs the client to on-device speech.
- `src/lib/voice.ts` uses Android TextToSpeech or browser Web Speech for playback, avoiding a paid cloud TTS dependency.
- Historical Railway logs from 2026-11-06 show the previous cloud TTS integration received OpenAI `429 insufficient_quota` / `credit_balance_exhausted`. This explains earlier speech failures, but it is not the current intended TTS path.

## Branch divergence to keep in mind

The Railway preview service is connected to `feat/vayora-aurevon-skova-identity`, while the ongoing AUREVON work is on `aurevon-premium-refresh`.

The current development branch's `api/chat.ts` is stricter and currently supports only OpenRouter's `openrouter/free` route with Zero Data Retention / data-collection-deny provider preferences. It does not accept an OpenAI key either. Do not assume that changing this branch changes the live Railway preview.

## Recommended safe recovery

1. Keep the paid OpenAI key out of the chat path while its account has no remaining API credits.
2. Configure one supported free-tier provider key on the actual preview service: preferably `OPENROUTER_API_KEY` for the current strict ZDR route, or `GROQ_API_KEY` only after reviewing and accepting its data-handling terms for student content.
3. Keep the provider key only in the server's environment variables; never add it to Vite variables, Android assets, Git, or client code.
4. Redeploy the preview service only after the key is configured, then verify a real `POST /api/chat` returns a successful response and that the generated APK points to the same intended API host.
5. Keep on-device TTS as the default free playback path. Do not restore paid cloud TTS unless a funded quota and explicit spending limit are approved.

## Additional platform risks

- Chat limits are currently IP-based, not account-based, because there is no unified user identity service yet. This is acceptable as an interim control but is not a substitute for per-user quotas.
- The client can send a short learner profile with chat requests when the personalization switch is enabled. Keep that feature opt-in and minimize educational data sent off-device.
- The free-model route may be rate-limited or unavailable at times; the UI should communicate temporary provider limits clearly rather than describing them as an internet outage.

## Acceptance checks

- Provider configured: API no longer returns the missing-provider `503`.
- Upstream success: one simple Arabic question returns a non-empty Arabic answer.
- Quiz path: generated questions parse into the expected four-option schema; invalid JSON is rejected with a useful message.
- Book path: answers remain grounded in selected page excerpts and cite their page markers.
- Android path: the APK calls the configured remote API host, not `capacitor://localhost/api/chat`.
- Speech path: voice playback uses the device engine and does not call a paid TTS endpoint.
