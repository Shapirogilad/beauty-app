import api from './api'

export interface ConversationSummary {
  id: string
  otherName: string
  otherPhoto: string | null
  lastMessage: string | null
  lastMessageAt: string
  unread: boolean
}

export interface ChatMessage {
  id: string
  text: string
  senderId: string
  readAt: string | null
  createdAt: string
}

export const getConversations = (): Promise<ConversationSummary[]> =>
  api.get('/messages/conversations').then((r) => r.data)

export const getMessages = (conversationId: string): Promise<ChatMessage[]> =>
  api.get(`/messages/conversations/${conversationId}`).then((r) => r.data)

export const sendMessage = (conversationId: string, text: string): Promise<ChatMessage> =>
  api.post(`/messages/conversations/${conversationId}/send`, { text }).then((r) => r.data)

export const ensureConversation = (
  clientId: string,
): Promise<{ conversationId: string }> =>
  api.post('/messages/conversations/ensure', { clientId }).then((r) => r.data)

export const ensureConversationWithBusiness = (
  businessId: string,
): Promise<{ conversationId: string }> =>
  api.post('/messages/conversations/ensure-with-business', { businessId }).then((r) => r.data)

export const getUnreadCount = (): Promise<{ count: number }> =>
  api.get('/messages/unread-count').then((r) => r.data)

export const deleteConversation = (conversationId: string): Promise<void> =>
  api.delete(`/messages/conversations/${conversationId}`).then(() => {})

export const startConversation = (
  clientId: string,
  text: string,
): Promise<{ conversationId: string; message: ChatMessage }> =>
  api.post('/messages/conversations/start', { clientId, text }).then((r) => r.data)
