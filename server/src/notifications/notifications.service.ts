import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

export interface PushPayload {
  to: string                        // Expo push token
  title: string
  body: string
  data?: Record<string, unknown>
  channelId?: 'default' | 'messages' // Android notification channel
  sound?: 'default' | null
  badge?: number
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

  /**
   * Send one or more Expo push notifications.
   * Batches up to 100 per request as per Expo limits.
   */
  async send(payloads: PushPayload[]): Promise<void> {
    if (payloads.length === 0) return

    // Filter out invalid/empty tokens
    const valid = payloads.filter(
      (p) => p.to && (p.to.startsWith('ExponentPushToken[') || p.to.startsWith('expo-push-token')),
    )
    if (valid.length === 0) return

    // Chunk into batches of 100
    for (let i = 0; i < valid.length; i += 100) {
      const batch = valid.slice(i, i + 100)
      try {
        await axios.post(this.EXPO_PUSH_URL, batch, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        })
      } catch (err) {
        this.logger.error('Failed to send push batch', err)
      }
    }
  }

  async sendOne(payload: PushPayload): Promise<void> {
    return this.send([payload])
  }
}
