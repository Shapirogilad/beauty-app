import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'דורה',
  slug: 'dura',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FAF7F5',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.dura.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'האפליקציה משתמשת במיקום כדי למצוא סלונים קרובים אליך',
      NSCameraUsageDescription: 'לצילום תמונת פרופיל',
      NSPhotoLibraryUsageDescription: 'לבחירת תמונה מהגלריה',
      NSCalendarsUsageDescription: 'להוספת התור ליומן הטלפון שלך',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAF7F5',
    },
    package: 'com.dura.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'READ_CALENDAR',
      'WRITE_CALENDAR',
      'RECEIVE_BOOT_COMPLETED',   // needed for notification delivery after reboot
      'VIBRATE',
    ],
    softwareKeyboardLayoutMode: 'resize',
  },
  plugins: [
    'expo-font',
    'expo-location',
    'expo-calendar',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',  // white-on-transparent 96×96 PNG
        color: '#7D4E6B',
        defaultChannel: 'default',
        sounds: [],
      },
    ],
    ['expo-image-picker', {
      photosPermission: 'האפליקציה צריכה גישה לגלריה כדי לאפשר העלאת תמונות',
      cameraPermission: 'האפליקציה צריכה גישה למצלמה לצילום תמונות',
    }],
  ],
  extra: {
    // Set API_BASE_URL in your EAS environment variables or local .env
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://10.0.0.27:3000/api/v1',
    tranzilaTerminal: process.env.TRANZILA_TERMINAL ?? '',
    eas: {
      // Paste your EAS project ID here after running: eas init
      projectId: process.env.EAS_PROJECT_ID ?? '4abedd13-98b4-4517-9421-8b6c27fd94bc',
    },
  },
})
