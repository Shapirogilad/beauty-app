import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Share, FlatList, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import { getReferralInfo, ReferralInfo } from '../../services/growthService'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'Referral'>

export default function ReferralScreen({ navigation }: Props) {
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReferralInfo()
      .then(setInfo)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleShare() {
    if (!info?.referralCode) return
    await Share.share({
      message: `הצטרפי ל-Dura עם הקוד שלי ${info.referralCode} וקבלי 50 נקודות מתנה! ✨\nhttps://dura.app/join?ref=${info.referralCode}`,
    })
  }

  const pendingCount  = info?.referralsMade.filter((r) => !r.rewardedAt).length ?? 0
  const rewardedCount = info?.referralsMade.filter((r) => !!r.rewardedAt).length ?? 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>הזמיני חברות</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <FlatList
          data={info?.referralsMade ?? []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Hero */}
              <View style={styles.hero}>
                <Text style={styles.heroIcon}>🎁</Text>
                <Text style={styles.heroTitle}>הזמיני חברות וקבלי נקודות!</Text>
                <Text style={styles.heroSub}>
                  כל חברה שתצטרף בעזרת הקוד שלך — את מקבלת <Text style={styles.bold}>100 נקודות</Text> והיא מקבלת <Text style={styles.bold}>50 נקודות</Text> על התור הראשון שלה.
                </Text>
              </View>

              {/* Code card */}
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>הקוד שלך</Text>
                <Text style={styles.code}>{info?.referralCode ?? '—'}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>שתפי עם חברות</Text>
                </TouchableOpacity>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{rewardedCount}</Text>
                  <Text style={styles.statLabel}>הצטרפו ♥</Text>
                </View>
                <View style={[styles.statBox, { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Text style={styles.statNum}>{pendingCount}</Text>
                  <Text style={styles.statLabel}>ממתינות לתור</Text>
                </View>
              </View>

              {info && info.referralsMade.length > 0 && (
                <Text style={styles.listTitle}>הנשים שהזמנת</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>עוד לא הזמנת חברות — שתפי את הקוד!</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.referralRow}>
              <View style={styles.referralRight}>
                <Text style={styles.referralName}>{item.referred.name}</Text>
                <Text style={styles.referralDate}>
                  הצטרפה {format(new Date(item.referred.createdAt), 'd בMMM yyyy', { locale: he })}
                </Text>
              </View>
              {item.rewardedAt ? (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.badgeText}>קיבלת נקודות</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgePending]}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.badgeText, { color: colors.textSecondary }]}>ממתינה לתור</Text>
                </View>
              )}
            </View>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { padding: 20, gap: 20 },
  hero: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  heroIcon: { fontSize: 40 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  heroSub: { fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 22 },
  bold: { fontWeight: '700', color: colors.primary },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: { fontSize: 13, color: colors.textSecondary },
  code: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 4,
  },
  shareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.textSecondary },
  listTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'left' },
  referralRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referralRight: { gap: 2 },
  referralName: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left' },
  referralDate: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDF7F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgePending: { backgroundColor: colors.border },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.success },
  emptyText: { fontSize: 14, color: colors.placeholder, textAlign: 'center', paddingVertical: 20 },
})
