# Changelog

All notable changes to the FinalPing desktop app.

## [1.1.5] — 2026-09-30

### Fixed
- **Updates install silently again.** The updater was launching the full installer wizard instead of updating in place, so every update asked you to click through Next and Finish. electron-updater's `quitAndInstall()` defaults to a non-silent install; it is now called with the silent flags, so an update downloads, installs and relaunches on its own.

## [1.1.4] — 2026-09-30

### Changed
- Signed build, unchanged from 1.1.3 apart from the version. Published to verify the silent update path end to end.

## [1.1.3] — 2026-09-30

### Changed
- **Signed builds.** The application, its installer, and its uninstaller now carry a digital
  signature. Unsigned installers were being intercepted by security software during automatic
  updates, which turned a silent background update into a manual reinstall — or stopped it
  entirely, with no visible error.

## [1.1.2] — 2026-09-28

### Changed
- **Rebuilt interface.** Every screen was rebuilt on a shared design system: a single set of colour tokens, a self-hosted typeface, and one component kit used across Dashboard, Aircraft, Live Map, Airport Config, Alerts, Integrations, Logs and Ground Station. Panels, tables, buttons and badges now look and behave the same everywhere.
- **New dashboard.** The old "Recent Alerts" list is replaced by two panels built for the job: **Inbound now**, which shows approaching aircraft with distance, altitude, ETA and which alert ring they have crossed, and **Alert delivery**, which groups recent notifications by channel so a failing integration is obvious at a glance.
- **Darker, quieter palette.** The navy gradients are gone in favour of a flat neutral ground, so aircraft colours and alert states are the only things competing for attention.
- **Icons instead of emoji** throughout the interface, and real brand marks for Discord, Slack and Microsoft Teams on the Integrations screen.
- **Live map** now uses a dark basemap that matches the rest of the app.

### Fixed
- The loading screen rendered unstyled because its stylesheet was never compiled.
- Aircraft type is editable again, so a bad ICAO lookup can be corrected without deleting and re-adding the aircraft.
- Two colours in the 2FA sign-in step were left over from the old theme and did not follow the app palette.

## [1.1.1] — 2026-08-01

### Added
- **Two-factor authentication at sign-in.** If you have 2FA enabled on your FinalPing account, the desktop app now prompts for your verification code (authenticator app, email, or SMS) after your password. Previously the desktop login skipped the second factor — it's now required, matching the website.
- **Account display name.** The app shows your account's display name, pulled from your account at sign-in and kept in sync in the background.
- **Update-on-launch splash.** On startup the app briefly checks for updates on a splash screen; if a new version is available it downloads and installs it before opening, so you always start on the latest. Updates found while the app is already running still show a Restart button, so a live session isn't interrupted.

### Fixed
- **Live map staleness detection** re-tuned for the 30-second position-update interval, so aircraft are correctly flagged as stale vs. fresh.
- **Alert-ring clicks** — proximity rings are now drawn largest-first, so the smaller inner rings can be clicked/selected.
- **Sharper app icon** — regenerated as a multi-resolution icon (16→256px), so it stays crisp in the Start menu, taskbar, and installer instead of looking pixelated. The system-tray icon (previously blank) now shows the brand mark too.

## [1.1.0] — 2026-06-07

- Prior release. (See GitHub releases for earlier history.)
