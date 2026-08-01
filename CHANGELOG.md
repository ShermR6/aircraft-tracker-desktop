# Changelog

All notable changes to the FinalPing desktop app.

## [1.1.1] — 2026-08-01

### Added
- **Two-factor authentication at sign-in.** If you have 2FA enabled on your FinalPing account, the desktop app now prompts for your verification code (authenticator app, email, or SMS) after your password. Previously the desktop login skipped the second factor — it's now required, matching the website.
- **Account display name.** The app shows your account's display name, pulled from your account at sign-in and kept in sync in the background.

### Fixed
- **Live map staleness detection** re-tuned for the 30-second position-update interval, so aircraft are correctly flagged as stale vs. fresh.
- **Alert-ring clicks** — proximity rings are now drawn largest-first, so the smaller inner rings can be clicked/selected.

## [1.1.0] — 2026-06-07

- Prior release. (See GitHub releases for earlier history.)
