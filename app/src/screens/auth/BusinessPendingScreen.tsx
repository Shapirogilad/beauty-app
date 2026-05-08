import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'

export default function BusinessPendingScreen() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const isRejected = user?.businessStatus === 'REJECTED'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, isRejected && styles.iconCircleRejected]}>
          <Ionicons
            name={isRejected ? 'close-circle' : 'time'}
            size={52}
            color={isRejected ? colors.error : colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {isRejected ? 'הבקשה נדחתה' : 'הבקשה בבדיקה'}
        </Text>

        <Text style={styles.body}>
          {isRejected
            ? 'לצערנו, בקשת ההצטרפות שלך לא אושרה. לפרטים נוספים ניתן לפנות לתמיכה.'
            : 'קיבלנו את בקשת ההצטרפות שלך. צוות דורה בודק את הפרטים ויצור איתך קשר בהקדם.'}
        </Text>

        {!isRejected && (
          <View style={styles.stepsBox}>
            <Step num="1" text="בקשתך התקבלה" done />
            <Step num="2" text="בדיקת פרטי העסק על ידי הצוות" />
            <Step num="3" text="קבלת אישור והתחברות" />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={clearAuth}>
        <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function Step({ num, text, done }: { num: string; text: string; done?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepNum, done && styles.stepNumDone]}>
        {done
          ? <Ionicons name="checkmark" size={14} color="#fff" />
          : <Text style={styles.stepNumText}>{num}</Text>
        }
      </View>
      <Text style={[styles.stepText, done && styles.stepTextDone]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleRejected: { backgroundColor: '#FEE2E2' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  stepsBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  step: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: { backgroundColor: colors.primary },
  stepNumText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  stepText: { fontSize: 14, color: colors.textSecondary, flex: 1, textAlign: 'left' },
  stepTextDone: { color: colors.text, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  logoutText: { fontSize: 14, color: colors.textSecondary },
})
