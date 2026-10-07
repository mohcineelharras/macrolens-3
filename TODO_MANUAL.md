# Manual release tasks

These are still required before a store submission. This change does not deploy the app or the analysis server.

## Secrets

- [ ] Set `GEMINI_API_KEY` only in the server environment (local `.env`, or the host's secret store).
- [ ] Do not paste that key into client source, `EXPO_PUBLIC_*`, EAS env vars that are inlined into the app, or a screenshot.
- [ ] For any non-loopback or `NODE_ENV=production` server, set `ANALYZE_API_TOKEN` on the server. Do not ship that token inside the app. Put a real user-auth gateway in front of the server before it is reachable from the internet.

## Store listing

- [ ] Replace `com.macrolens.nutrition` if you do not control that application id.
- [ ] Publish a privacy policy URL and add it in App Store Connect and Play Console. The in-app screen discloses that meal photos are sent to Google Gemini, not stored in the log, and are not medical advice.
- [ ] Confirm the iOS export-compliance answer (the app only uses exempt HTTPS).
- [ ] Review camera purpose strings in `app.json` before submission.

## Build

- [ ] `npm run server` and `npx expo start` are local only. Do not run `eas build` or `eas submit` until the privacy policy URL and server authentication are in place.
