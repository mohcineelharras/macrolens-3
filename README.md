# MacroLens

Expo nutrition app. Meal photos are analyzed by a local or hosted server. The Gemini API key stays in that server's environment and is never written into the client.

## Setup

```bash
npm ci
cp .env.example .env
```

Put `GEMINI_API_KEY` in `.env` for the server process only. Do not prefix it with `EXPO_PUBLIC_` and do not paste it into source files.

## Run

Terminal 1, analysis server (loopback only unless you also set `ANALYZE_API_TOKEN`):

```bash
npm run server
```

Terminal 2, app:

```bash
npx expo start
```

`EXPO_PUBLIC_API_BASE_URL` is the server origin, for example `http://127.0.0.1:8787`. Android emulators can use `http://10.0.2.2:8787` while the server stays on `127.0.0.1`. A physical device needs an adb reverse or an authenticated host. Do not put `ANALYZE_API_TOKEN` in the app.

The scan screen asks before a photo is uploaded. Photos are resized on device and are not stored in the food log.

## Checks

```bash
npm run check:secrets
npm run lint
npm run typecheck
npm test
npm run audit:critical
```
