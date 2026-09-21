---
name: feedback-app-architecture
description: Apps must be thin-shell Capacitor wrappers loading from live web URL — no bundled logic in APK
metadata:
  type: feedback
---

Capacitor APKs must be thin shells that load the live web app — never bundle app logic or data locally.

**Why:** User doesn't want to reinstall the APK every time we fix something. The APK should just be a container; all code, UI, and data should come from the deployed web app (Vercel, etc.) so fixes go live instantly.

**How to apply:**
- Set `server.url` in capacitor.config.ts to the live deployment URL (e.g. Vercel)
- `webDir` stays for the build step but the app loads remotely at runtime
- Audio, subtitle data, app logic — everything streams from the web
- The APK is essentially a PWA wrapper: same experience, native install
- This applies to ALL future apps, not just Harry Korean
- Related: [[project-overview]]
