# Water Potty — App Store Submission Checklist

Complete this checklist before running `eas submit --profile production`.

---

## Before first build

### EAS project setup

- [ ] Run `eas init` in `apps/mobile/` to generate a project ID
- [ ] Replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.config.ts` (2 occurrences: `updates.url` and `extra.eas.projectId`)
- [ ] Replace `REPLACE_WITH_EAS_PROJECT_ID` in `eas.json` if present

### Apple credentials

- [ ] Apple Developer account active ($99 USD/yr)
- [ ] App ID created in App Store Connect with bundle ID `com.trescommas.waterpotty`
- [ ] Capabilities enabled on App ID:
  - [ ] Sign In with Apple
  - [ ] Push Notifications
  - [ ] In-App Purchase
- [ ] Replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` in `eas.json` → submit → production → ios → ascAppId
- [ ] Replace `REPLACE_WITH_APPLE_TEAM_ID` in `eas.json` with your 10-character team ID

### Google credentials

- [ ] Google Play Console account active ($25 USD one-time)
- [ ] App created in Play Console with package `com.trescommas.waterpotty`
- [ ] Download service account JSON → save as `apps/mobile/google-service-account.json`
- [ ] Grant service account "Release Manager" role in Play Console
- [ ] Download `google-services.json` from Firebase → save as `apps/mobile/google-services.json`

### Google Sign In (iOS)

- [ ] Download `GoogleService-Info.plist` from Firebase → save as `apps/mobile/GoogleService-Info.plist`
- [ ] Add OAuth client ID for iOS in Google Cloud Console (bundle ID: `com.trescommas.waterpotty`)
- [ ] Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` to the web client ID

### Mapbox

- [ ] Create a secret Mapbox token with `DOWNLOADS:READ` scope
- [ ] Set as EAS Secret: `eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value sk.eyJ...`
- [ ] Create a public Mapbox token with map/tiles/directions scopes
- [ ] Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local` and as EAS Secret

### RevenueCat

- [ ] RevenueCat account created and project set up
- [ ] App Store app connected to RevenueCat project
- [ ] Google Play app connected to RevenueCat project
- [ ] Product created: `wp_annual_subscription` ($10.00 CAD/yr) on both platforms
- [ ] Entitlement created: `subscriber` linked to `wp_annual_subscription`
- [ ] Webhook configured:
  - URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
  - Authorization header set to `REVENUECAT_WEBHOOK_SECRET`
- [ ] Set EAS Secrets:
  - `eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS --value appl_...`
  - `eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID --value goog_...`

### Supabase

- [ ] Set EAS Secrets:
  - `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://...`
  - `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...`
- [ ] Supabase Auth redirect URLs include `waterpotty://auth/verify`
- [ ] Supabase Auth redirect URLs include `https://waterpotty.app/auth/verify`

---

## App Store Connect setup (iOS)

- [ ] App record created in App Store Connect
- [ ] Privacy policy URL entered (required for apps with subscriptions and location)
  - Suggested: `https://waterpotty.app/privacy`
- [ ] App privacy questionnaire completed:
  - Location: Collected, not linked to identity, for app functionality
  - Email: Collected, not linked to identity (magic link only)
  - Identifiers: User ID (anonymous), app functionality
- [ ] In-App Purchase `wp_annual_subscription` created and approved by Apple
  - Price: $10.00 CAD (Tier 2)
  - Subscription group: "Water Potty Membership"
  - Introductory offer: none (optional to add later)
- [ ] Screenshots prepared:
  - iPhone 6.9" (required): 1320×2868 px
  - iPhone 6.5" (optional but recommended): 1242×2688 px
  - iPad 13" (skip if supportsTablet: false)
- [ ] App description written (max 4000 chars)
- [ ] Keywords entered (max 100 chars total, comma-separated)
- [ ] Support URL entered
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Export compliance: No — only standard HTTPS encryption

---

## Google Play Console setup (Android)

- [ ] App created with package `com.trescommas.waterpotty`
- [ ] Privacy policy URL entered (same as iOS)
- [ ] Data safety form completed (mirrors iOS privacy questionnaire)
- [ ] Subscription `wp_annual_subscription` created in Play Console:
  - Price: $10.00 CAD/month → set to $10.00 CAD/year
  - Grace period: 3 days
  - Account hold: enabled
- [ ] Internal test track set up with at least one tester email
- [ ] Target audience: 18+ (adults only — location-based community app)

---

## EAS Secrets — complete list

Set all secrets before running a build:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL              --value https://...
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY          --value eyJ...
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN        --value pk.eyJ...
eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN                 --value sk.eyJ...
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS     --value appl_...
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID --value goog_...
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID           --value xxxx.apps.googleusercontent.com
```

Verify all secrets are set:

```bash
eas secret:list
```

---

## Build commands

```bash
cd apps/mobile

# 1. iOS Simulator (no credentials needed — fastest for dev testing)
eas build --profile development-simulator --platform ios

# 2. Internal testing (TestFlight + Play internal track)
eas build --profile preview --platform all

# 3. Production (App Store + Play Store)
eas build --profile production --platform all

# 4. Submit production build
eas submit --profile production --platform ios
eas submit --profile production --platform android

# 5. Push OTA update (JS-only changes, no App Store review)
eas update --branch production --message "Fix pin timer display"
```

---

## Post-submission

- [ ] Monitor EAS Build logs for errors: `eas build:list`
- [ ] TestFlight: invite internal testers (add emails in App Store Connect → TestFlight → Internal Testing)
- [ ] Android internal track: invite testers in Play Console → Testing → Internal testing
- [ ] Test magic link deep link on real device (simulators don't receive emails)
- [ ] Test RevenueCat sandbox purchase on real device (Simulator doesn't support StoreKit)
- [ ] Verify Supabase webhook fires on sandbox purchase (check Edge Function logs)

---

## Known Apple review requirements for Water Potty

1. **Location justification**: The reviewer will test the app without being near a washroom. Ensure the map loads correctly with placeholder washrooms from the seed data, and the location permission prompt fires naturally.

2. **In-app purchase**: The $10/yr subscription must be purchaseable in the review environment. Set the RevenueCat product to allow sandbox purchases and ensure the "Subscribers only" gate is clearly explained in the onboarding.

3. **User-generated content**: The washroom submission and feedback features constitute UGC. Apple requires a moderation mechanism — the admin dashboard flag queue satisfies this requirement. Mention it in the App Review notes.

4. **Anonymous sign-in**: Magic link + Apple Sign In are both accepted. Ensure users can complete the core flow (view map, pin washroom) without signing in, as stated in the App Privacy section.
