# FinalPing Desktop (Personal)

Electron + React desktop app for individual users. See `../ARCHITECTURE.md` for full system context.

## Stack
- Electron · React (CRA) · Axios · electron-builder
- Protocol: `finalpingapp://`
- Backend: `aircraft-tracker-backend` on Railway

## Key Files
- `build/electron.js` — Electron main process (window, tray, deep links, IPC, auto-updater)
- `build/preload.js` — context bridge exposing `window.electronAPI`
- `src/App.jsx` — root component, auth state, routing
- `src/screens/Dashboard.jsx` — main app shell
- `src/screens/ActivationScreen.jsx` — license activation + login + Google OAuth
- `src/services/api.js` — Axios client + all API methods
- `src/services/storage.js` — Electron secure storage wrapper
- `package.json` — `main`, `build` config for electron-builder

## Commands
```bash
npm install
npm start              # dev (Electron + React dev server)
npm run package        # build installer → ../FinalPing-Builds/
```

## Notes
- After ANY code change: run `npm run package` to rebuild installer
- Build output dirs must be in Windows Defender exclusions or NSIS fails
- Auto-updater checks GitHub Releases; upload installer + `latest.yml` to release
- `quitAndInstall()` defaults to `isSilent = false` — must be called as `quitAndInstall(true, true)`
  or updates open the NSIS wizard instead of installing in place
- CI (`.github/workflows/build.yml`) builds on every push to `main` but uses `--publish never`.
  Releases are published manually from a signed local build — do not switch it back to
  `--publish always`, it overwrites signed assets with unsigned CI ones
- `build.win.publisherName` is set, so the updater verifies signatures. Every release from
  1.1.3 on **must be signed**, or installed clients reject it silently. Currently a self-signed
  test cert (`CN=FinalPing Test`) that only this machine trusts — not valid for real users
- Single-instance lock via `app.requestSingleInstanceLock()` — second launch redirects deep link to running instance
