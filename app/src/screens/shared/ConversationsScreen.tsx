import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { getConversations, deleteConversation, ConversationSummary } from '../../services/messagesService'
import { colors } from '../../theme/colors'
import { RootStackParamList } from '../../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function ConversationsScreen() {
  const nav = useNavigation<Nav>()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getConversations()
        .then(setConversations)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, []),
  )

  function confirmDelete(item: ConversationSummary) {
    Alert.alert(
      'מחיקת שיחה',
      `למחוק את השיחה עם ${item.otherName}?\nלא ניתן לשחזר את ההודעות.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק', style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id)
            try {
              await deleteConversation(item.id)
              setConversations((prev) => prev.filter((c) => c.id !== item.id))
            } catch {
              Alert.alert('שגיאה', 'מחיקה נכשלה')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>הודעות</Text>
        <View style={{ width: 24 }} />
      </View>

      {!loading && conversations.length > 0 && (
        <Text style={styles.hint}>לחיצה ארוכה על שיחה למחיקתה</Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>אין הודעות עדיין</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, item.unread && styles.rowUnread]}
              onPress={() => nav.navigate('Chat', { conversationId: item.id, otherName: item.otherName })}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                {deletingId === item.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.avatarLetter}>{item.otherName.charAt(0)}</Text>
                }
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.time}>
                    {formatDistanceToNow(new Date(item.lastMessageAt), { locale: he, addSuffix: true })}
                  </Text>
                  <Text style={[styles.name, item.unread && styles.nameUnread]}>{item.otherName}</Text>
                </View>
                <Text style={[styles.lastMsg, item.unread && styles.lastMsgUnread]} numberOfLines={1}>
                  {item.lastMessage ?? ''}
                </Text>
              </View>
              {item.unread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, color: colors.textSecondary },
  hint: { fontSize: 11, color: colors.placeholder, textAlign: 'center', paddingVertical: 6 },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.primaryFaint },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: '#fff' },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameUnread: { fontWeight: '800' },
  time: { fontSize: 12, color: colors.placeholder },
  lastMsg: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  lastMsgUnread: { color: colors.text, fontWeight: '600' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
})
