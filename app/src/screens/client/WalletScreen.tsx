import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, SectionList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { fetchSavedCards, deleteCardFromWallet } from '../../services/bookingsService'
import { getAllLoyaltyAccounts, LoyaltyAccountSummary } from '../../services/growthService'
import { fetchMe } from '../../services/authService'
import { colors } from '../../theme/colors'
import { RootStackParamList } from '../../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

interface SavedCard {
  id: string
  last4: string
  expiry: string
  isDefault: boolean
}

export default function WalletScreen() {
  const nav = useNavigation<Nav>()
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccountSummary[]>([])
  const [walletBalance, setWalletBalance] = useState(0)   // agorot
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      Promise.all([
        fetchSavedCards().catch(() => [] as SavedCard[]),
        getAllLoyaltyAccounts().catch(() => [] as LoyaltyAccountSummary[]),
        fetchMe().catch(() => ({ walletBalance: 0 })),
      ]).then(([c, l, me]) => {
        setCards(c)
        setLoyaltyAccounts(l)
        setWalletBalance(me.walletBalance ?? 0)
      }).finally(() => setLoading(false))
    }, []),
  )

  function handleDelete(card: SavedCard) {
    Alert.alert(
      'מחיקת כרטיס',
      `למחוק את הכרטיס המסתיים ב-${card.last4}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחיקה',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(card.id)
            try {
              await deleteCardFromWallet(card.id)
              setCards((prev) => prev.filter((c) => c.id !== card.id))
            } catch {
              Alert.alert('שגיאה', 'לא ניתן למחוק את הכרטיס כעת')
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ארנק</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          sections={[
            { key: 'credits', data: ['credits'] },
            { key: 'cards', data: ['cards'] },
          ]}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderSectionHeader={({ section }) => {
            if (section.key === 'credits') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>יתרה</Text>
                </View>
              )
            }
            return (
              <View style={styles.sectionHeader}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>כרטיסי אשראי שמורים</Text>
                <TouchableOpacity onPress={() => nav.navigate('AddCard')} style={styles.addInline}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addInlineLabel}>הוספה</Text>
                </TouchableOpacity>
              </View>
            )
          }}
          renderItem={({ section }) => {
            if (section.key === 'credits') {
              return (
                <View style={{ gap: 10 }}>
                  {/* Cash wallet balance */}
                  <View style={styles.walletCard}>
                    <Ionicons name="wallet-outline" size={22} color={colors.primary} />
                    <View style={styles.walletCardText}>
                      <Text style={styles.walletCardLabel}>יתרת מזומן באפליקציה</Text>
                      <Text style={styles.walletCardAmount}>
                        ₪{(walletBalance / 100).toFixed(2)}
                      </Text>
                    </View>
                    {walletBalance > 0 && (
                      <View style={styles.walletBadge}>
                        <Text style={styles.walletBadgeText}>זמין לשימוש</Text>
                      </View>
                    )}
                  </View>

                  {/* Loyalty points per business */}
                  {loyaltyAccounts.length > 0 && (
                    <>
                      <Text style={styles.loyaltyHeader}>נקודות נאמנות</Text>
                      {loyaltyAccounts.map((acc) => (
                        <View key={acc.id} style={styles.creditRow}>
                          <View style={styles.creditBadge}>
                            <Text style={styles.creditBadgeText}>{acc.points}</Text>
                            <Text style={styles.creditBadgeLabel}>נק'</Text>
                          </View>
                          <Text style={styles.creditBizName}>{acc.business.name}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )
            }

            // Cards section
            return (
              <View>
                {cards.length === 0 ? (
                  <View style={styles.emptyCards}>
                    <Ionicons name="card-outline" size={36} color={colors.border} />
                    <Text style={styles.emptyText}>אין כרטיסים שמורים</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate('AddCard')}>
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.addBtnLabel}>הוספת כרטיס</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {cards.map((card) => (
                      <View key={card.id} style={styles.card}>
                        <View style={styles.cardLeft}>
                          <Ionicons name="card" size={24} color={colors.primary} />
                          <View style={styles.cardInfo}>
                            <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>
                            <Text style={styles.cardExpiry}>תוקף: {card.expiry}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDelete(card)}
                          disabled={deletingId === card.id}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {deletingId === card.id
                            ? <ActivityIndicator size="small" color={colors.error} />
                            : <Ionicons name="trash-outline" size={22} color={colors.error} />
                          }
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addCardRow} onPress={() => nav.navigate('AddCard')}>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      <Text style={styles.addCardLabel}>הוספת כרטיס חדש</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )
          }}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, gap: 12, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'left' },
  addInline: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  addInlineLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // Cash wallet
  walletCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  walletCardText: { flex: 1, gap: 4 },
  walletCardLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  walletCardAmount: { fontSize: 28, fontWeight: '800', color: colors.primary, textAlign: 'left' },
  walletBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  walletBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  loyaltyHeader: {
    fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left',
    paddingTop: 4,
  },

  // Credits
  creditsSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginBottom: 10,
  },
  shekelSign: { fontSize: 28, fontWeight: '700', color: colors.primary },
  totalPoints: { fontSize: 36, fontWeight: '800', color: colors.primary },
  creditRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  creditBadge: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 56,
  },
  creditBadgeText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  creditBadgeLabel: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  creditBizName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'left' },
  emptyCredits: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
    marginBottom: 8,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'left' },
  emptySubtext: { fontSize: 13, color: colors.placeholder, textAlign: 'left', lineHeight: 18 },

  // Cards
  emptyCards: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  addBtnLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  cardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  cardInfo: { gap: 4 },
  cardNumber: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: 1 },
  cardExpiry: { fontSize: 13, color: colors.textSecondary },
  addCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  addCardLabel: { fontSize: 15, fontWeight: '600', color: colors.primary },
})
