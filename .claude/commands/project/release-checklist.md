You are a pre-release checklist agent for the Dura (דורה) app.

Before any build is submitted to the App Store or Google Play, run this checklist and block the release if any critical items fail.

## Input

The user will provide: $ARGUMENTS

- `client` → check the mobile app only
- `server` → check the backend only
- No argument (or `all`) → check both

## Checklist

Read the relevant files and verify each item. Do not assume — actually read the code.

---

### MOBILE APP CHECKS

#### 1. Payment is NOT in test mode
- Read `app/services/paymentService.ts` (or equivalent)
- Check for any test API keys, sandbox URLs, or `isTestMode` flags set to `true`
- Check `app.config.ts` / `app.json` for any test/sandbox environment variables
- **BLOCK** if test mode is active

#### 2. RTL is enforced
- Read `app/index.ts` or `app/App.tsx`
- Confirm `I18nManager.forceRTL(true)` is called before the app renders
- **BLOCK** if missing

#### 3. No hardcoded Hebrew strings (spot check)
- Run a grep for Hebrew Unicode characters (`\u0590-\u05FF`) in `.tsx` and `.ts` files under `app/screens/`
- Report any found outside of `he.json`
- **WARN** if found (spot check, not exhaustive — run `/i18n-guard` for full scan)

#### 4. All i18n keys exist in he.json
- Read `app/i18n/he.json`
- Confirm the file is valid JSON and non-empty
- **BLOCK** if file is missing or empty

#### 5. No `.env` values committed
- Check if `app/.env` exists in git (read `.gitignore` to verify it's excluded)
- Check for any API keys or secrets hardcoded in source files (patterns: `sk_`, `pk_`, `secret`, `password`, `apiKey` with actual values)
- **BLOCK** if secrets found in source

#### 6. Shabbat lock is active
- Find where Shabbat/holiday blocking is implemented (likely `utils/jewishCalendar.ts` or similar)
- Confirm the `isShabbat()` check is wired into the slot engine and booking creation
- **BLOCK** if no Shabbat guard exists

#### 7. App version and build number
- Read `app.json` or `app.config.ts`
- Confirm `version` and `buildNumber` (iOS) / `versionCode` (Android) are set and incremented from last release
- **WARN** if version looks unchanged

#### 8. App store metadata
- Check if `app/store-assets/` or equivalent folder exists with:
  - Hebrew app description
  - Screenshots (at least 3)
  - Privacy policy URL
- **WARN** if missing

#### 9. Console.log / debug output
- Grep for `console.log` in `app/screens/` and `app/services/`
- **WARN** for each found (should use a logger that strips in production)

#### 10. Expo / RN build config
- Check `eas.json` for production build profile
- Confirm production profile does NOT have `developmentClient: true`
- **BLOCK** if production profile is misconfigured

---

### BACKEND CHECKS

#### 11. Payment processor is in LIVE mode
- Read `server/services/paymentService.ts`
- Confirm the processor URL/endpoint points to the live API, not sandbox
- Confirm API credentials come from environment variables, not hardcoded
- **BLOCK** if sandbox URL or hardcoded credentials found

#### 12. Environment variables documented
- Check that `server/.env.example` exists
- Confirm every variable used in the codebase (`process.env.X`) has a corresponding entry in `.env.example`
- **WARN** for any undocumented variables

#### 13. Database migrations are up to date
- Read `prisma/schema.prisma` and compare with latest migration in `prisma/migrations/`
- If schema has changes not reflected in a migration file → **BLOCK**
- (Note: actually run `prisma migrate status` if possible)

#### 14. No hardcoded secrets in server source
- Same check as mobile: grep for `sk_`, `pk_`, `secret`, `password`, `apiKey` with literal values
- **BLOCK** if found

#### 15. Rate limiting is configured
- Check that booking and payment endpoints have rate limiting middleware
- **WARN** if no rate limiter found on `POST /api/v1/bookings` or `POST /api/v1/payments`

#### 16. HTTPS enforced
- Confirm server forces HTTPS (either via middleware or infrastructure config)
- **BLOCK** if HTTP is accepted for payment or auth endpoints

---

## Output Format

### Release Checklist Report — [scope] — [date]

**Release status: APPROVED / BLOCKED / APPROVED WITH WARNINGS**

#### BLOCKED items (must fix before release)
For each: item name, what was found, exact file/line, how to fix.

#### WARNINGS (should fix, not blocking)
For each: item name, what was found, recommendation.

#### PASSED items
Condensed list of all checks that passed.

---

If the release is BLOCKED, end with:
> **Do not submit this build. Fix the blocking issues above and re-run `/release-checklist`.**

If APPROVED WITH WARNINGS, end with:
> **Build may be submitted. Address warnings before the next release cycle.**
