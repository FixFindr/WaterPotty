/**
 * app.config.ts — Water Potty Expo Configuration
 *
 * Dynamic config using app.config.ts instead of app.json.
 * Switches values per environment (development / preview / production)
 * based on the APP_ENV env var set in eas.json build profiles.
 *
 * Local dev:  APP_ENV=development npx expo start
 * EAS sets APP_ENV automatically per build profile.
 */

import { ExpoConfig, ConfigContext } from 'expo/config'

type AppEnv = 'development' | 'preview' | 'production'
const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv

const ENV_CONFIG = {
  development: {
    name:              'WP Dev',
    bundleId:          'com.trescommas.waterpotty.dev',
    androidPackage:    'com.trescommas.waterpotty.dev',
    icon:              './assets/icon-dev.png',
    adaptiveIcon:      './assets/adaptive-icon-dev.png',
    splashBg:          '#0A1628',
  },
  preview: {
    name:              'Water Potty (Beta)',
    bundleId:          'com.trescommas.waterpotty',
    androidPackage:    'com.trescommas.waterpotty',
    icon:              './assets/icon.png',
    adaptiveIcon:      './assets/adaptive-icon.png',
    splashBg:          '#0A1628',
  },
  production: {
    name:              'Water Potty',
    bundleId:          'com.trescommas.waterpotty',
    androidPackage:    'com.trescommas.waterpotty',
    icon:              './assets/icon.png',
    adaptiveIcon:      './assets/adaptive-icon.png',
    splashBg:          '#0A1628',
  },
} satisfies Record<AppEnv, object>

const env = ENV_CONFIG[APP_ENV]

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  // ── Identity ──────────────────────────────────────────────────────────────
  name:    env.name,
  slug:    'water-potty',
  version: '1.0.0',
  owner:   'fixfindr',

  // ── Deep linking ─────────────────────────────────────────────────────────
  // Powers magic link callbacks: waterpotty://auth/verify?token_hash=xxx
  scheme:      'waterpotty',
  orientation: 'portrait',

  // ── UI ────────────────────────────────────────────────────────────────────
  userInterfaceStyle: 'dark',
  icon: env.icon,

  // ── Splash ───────────────────────────────────────────────────────────────
  splash: {
    image:           './assets/splash.png',
    resizeMode:      'contain',
    backgroundColor: env.splashBg,
  },

  assetBundlePatterns: ['**/*'],

  // ── OTA Updates ──────────────────────────────────────────────────────────
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/768377a0-4d55-4352-8059-0e16cb6bb809',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },

  // ── iOS ───────────────────────────────────────────────────────────────────
  ios: {
    bundleIdentifier: env.bundleId,
    supportsTablet:   false,
    buildNumber:      '1',

    // Apple Sign In
    usesAppleSignIn: true,

    // Universal links for magic link email callbacks
    associatedDomains: ['applinks:waterpotty.app'],

    // ── Info.plist permission strings ─────────────────────────────────────
    // Apple reviewers read every string. Be specific.
    infoPlist: {

      // Location — foreground only. Used for map, nearby detection, verification proximity.
      NSLocationWhenInUseUsageDescription:
        'Water Potty shows washrooms near your current location and lets you ' +
        'verify nearby community submissions within 200 metres.',

      // Required if usesAppleSignIn is true and location key is present.
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Water Potty uses your location to show washrooms along your route. ' +
        'Background location is never used.',

      // Camera — verification photo capture only. No photo library access.
      NSCameraUsageDescription:
        'Water Potty uses the camera so you can photograph a washroom when ' +
        'verifying a new community submission. This helps confirm the location exists.',

      // Push notifications — handled at runtime by expo-notifications, no plist key needed.

      // Privacy manifest (required for iOS 17+ / Xcode 15+)
      NSPrivacyAccessedAPITypes: [
        {
          // UserDefaults — expo-secure-store + Supabase session persistence
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          // File timestamps — Expo SDK internals
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          // System boot time — Expo SDK
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],

      // Restrict outbound connections to known domains only
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          'events.mapbox.com':  { NSExceptionAllowsInsecureHTTPLoads: false, NSIncludesSubdomains: true },
          'api.mapbox.com':     { NSExceptionAllowsInsecureHTTPLoads: false, NSIncludesSubdomains: true },
          'tiles.mapbox.com':   { NSExceptionAllowsInsecureHTTPLoads: false, NSIncludesSubdomains: true },
        },
      },
    },

    // Google Sign In support on iOS (requires GoogleService-Info.plist)
    googleServicesFile: './GoogleService-Info.plist',
  },

  // ── Android ───────────────────────────────────────────────────────────────
  android: {
    package:      env.androidPackage,
    versionCode:  1,

    adaptiveIcon: {
      foregroundImage: env.adaptiveIcon,
      backgroundColor: env.splashBg,
    },

    // ── Permissions ───────────────────────────────────────────────────────
    // Declare only what is actually used — Play Store flags unused permissions.
    permissions: [
      // Location
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',

      // Camera (verification photos)
      'android.permission.CAMERA',

      // Network
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',

      // Google Play Billing (RevenueCat $10/yr subscription)
      'com.android.vending.BILLING',

      // Push notifications (required for Android 13 / API 33+)
      'android.permission.POST_NOTIFICATIONS',

      // Haptics
      'android.permission.VIBRATE',
    ],

    // ── Intent filters — magic link + universal links ──────────────────────
    intentFilters: [
      {
        action:     'VIEW',
        autoVerify: true,
        data: [
          {
            scheme:     'https',
            host:       'waterpotty.app',
            pathPrefix: '/auth',
          },
          {
            scheme: 'waterpotty',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],

    // Google Sign In + Firebase (Google Sign In requires google-services.json)
    googleServicesFile: './google-services.json',
  },

  // ── Web ───────────────────────────────────────────────────────────────────
  web: {
    favicon: './assets/favicon.png',
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  // Plugins run in order during `expo prebuild`. Order matters for native config.
  plugins: [

    // Expo Router (file-based navigation)
    'expo-router',

    // Apple Sign In entitlement + capability
    'expo-apple-authentication',

    // Location (foreground only — no background location)
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Water Potty shows washrooms near your current location.',
        locationAlwaysAndWhenInUsePermission:
          'Water Potty uses your location to show washrooms along your route. ' +
          'Background location is not required.',
        isIosBackgroundLocationEnabled:     false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],

    // Camera for verification photo capture
    [
      'expo-image-picker',
      {
        cameraPermission:
          'Water Potty uses the camera to photograph washrooms when you verify ' +
          'a community submission.',
        photosPermission:      false, // no photo library access needed
        microphonePermission:  false,
      },
    ],

    // Push notifications — pin expiry reminders + verification prompts
    [
      'expo-notifications',
      {
        icon:   './assets/notification-icon.png', // 96×96 white on transparent
        color:  '#4FC3F7',                        // ice blue
        sounds: [],
        mode:   APP_ENV === 'production' ? 'production' : 'development',
      },
    ],

    // Secure Store — Supabase session persistence
    'expo-secure-store',

    // Mapbox — downloads SDK via authenticated Maven/CocoaPods
    // MAPBOX_DOWNLOADS_TOKEN must be in EAS Secrets (not EXPO_PUBLIC_*)
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN ?? '',
      },
    ],

    // Native build properties
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks:    'static',   // required by Mapbox
          deploymentTarget: '15.1',     // Mapbox GL minimum
          swiftVersion:     '5.9',      // RevenueCat minimum
        },
        android: {
          compileSdkVersion:  35,
          targetSdkVersion:   35,
          minSdkVersion:      24,       // Mapbox GL minimum
          kotlinVersion:      '1.9.24',
          enableProguardInReleaseBuilds:         true,
          enableShrinkResourcesInReleaseBuilds:  true,
        },
      },
    ],
  ],

  // ── Extra / runtime config ────────────────────────────────────────────────
  // Accessible at runtime via Constants.expoConfig?.extra
  // NEVER put secret keys here — use EXPO_PUBLIC_* env vars instead.
  extra: {
    appEnv: APP_ENV,
    eas: {
      projectId: '768377a0-4d55-4352-8059-0e16cb6bb809',
    },
  },

  experiments: {
    typedRoutes: true,
  },
})
