import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { getMessages, sendMessage, ChatMessage } from '../../services/messagesService'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { RootStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>

export default function ChatScreen({ route }: Props) {
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const { conversationId, otherName, draftMessage } = route.params
  const userId = useAuthStore((s) => s.user?.id)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState(draftMessage ?? '')
  const [sending, setSending] = useState(false)
  // screenY = Y of keyboard top from screen top; null means keyboard closed
  const [kbScreenY, setKbScreenY] = useState<number | null>(null)
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    getMessages(conversationId)
      .then((msgs) => {
        setMessages(msgs)
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [conversationId])

  // Android: set explicit height = keyboard top - status bar so the content
  // area ends exactly where the keyboard starts. Avoids all KAV residual gaps.
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbScreenY(e.endCoordinates.screenY))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbScreenY(null))
    return () => { show.remove(); hide.remove() }
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    try {
      const msg = await sendMessage(conversationId, text)
      setMessages((prev) => [...prev, msg])
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
    } finally {
      setSending(false)
    }
  }

  const kbOpen = kbScreenY !== null
  const inputBarBottom = kbOpen ? 12 : Math.max(insets.bottom, 12)
  // Exact height from status bar bottom to keyboard top
  const androidContentHeight = kbOpen ? kbScreenY! - insets.top : undefined

  const inner = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{otherName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const isMe = item.senderId === userId
            const prevMsg = messages[index - 1]
            const showTime =
              !prevMsg ||
              new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60_000
            return (
              <>
                {showTime && (
                  <Text style={styles.timeLabel}>
                    {format(new Date(item.createdAt), 'HH:mm')}
                  </Text>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                    {item.text}
                  </Text>
                </View>
              </>
            )
          }}
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: inputBarBottom }]}>
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="הקלידי הודעה..."
          placeholderTextColor={colors.placeholder}
          textAlign="right"
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
      </View>
    </>
  )

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {inner}
        </KeyboardAvoidingView>
      ) : (
        <View style={androidContentHeight !== undefined
          ? { height: androidContentHeight }
          : styles.flex
        }>
          {inner}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, gap: 6, paddingBottom: 8 },
  timeLabel: { fontSize: 11, color: colors.placeholder, textAlign: 'center', marginVertical: 8 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: colors.text },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
