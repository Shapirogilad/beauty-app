import * as ExpoNotifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from '../services/api'

/**
 * Request permission and register the device push token with the server.
 * Call this once after the user is authenticated.
 */
export async function registerPushToken(): Promise<void> {
  try {
    // Push tokens are only available on physical devices
    const isDevice = Constants.isDevice
    if (!isDevice) return

    const { status: existing } = await ExpoNotifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await ExpoNotifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId

    if (!projectId) {
      console.warn('[Notifications] No EAS projectId — push tokens will not work in production builds')
      return
    }

    const tokenData = await ExpoNotifications.getExpoPushTokenAsync({ projectId })
    const token = tokenData.data

    // Register with server — fire and forget
    api.post('/notifications/register-token', { token }).catch(() => {})
  } catch (err) {
    // Push notifications are not supported in Expo Go on SDK 53+
    // or when running in a simulator. Silently skip.
  }
}

/**
 * Configure how notifications appear while the app is in the foreground.
 * Also sets up the Android notification channel.
 * Call once at app startup, before NavigationContainer mounts.
 */
export function configureNotificationHandler(): void {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })

  if (Platform.OS === 'android') {
    // High-priority channel — shows heads-up banners
    ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'דורה — התראות',
      description: 'התראות על תורים, הודעות ועדכונים',
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7D4E6B',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    })

    // Separate channel for messages
    ExpoNotifications.setNotificationChannelAsync('messages', {
      name: 'דורה — הודעות',
      description: 'הודעות חדשות מלקוחות',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150],
      showBadge: true,
    })
  }
}
