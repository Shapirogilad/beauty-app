import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'

export default function BusinessSettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>הגדרות</Text>

        {/* Working hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>שעות פעילות</Text>
          <TouchableOpacity style={styles.menuRow} onPress={() => nav.navigate('BusinessWorkingHours')}>
            <Ionicons name="chevron-back" size={18} color={colors.placeholder} />
            <Text style={[styles.menuRowText, { color: colors.text }]}>שעות פעילות</Text>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Business profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרופיל וגלריה</Text>
          <TouchableOpacity style={styles.menuRow} onPress={() => nav.navigate('BusinessProfileEdit')}>
            <Ionicons name="chevron-back" size={18} color={colors.placeholder} />
            <Text style={[styles.menuRowText, { color: colors.text }]}>פרטי העסק ותמונות</Text>
            <Ionicons name="images-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => nav.navigate('BusinessEmployees')}>
            <Ionicons name="chevron-back" size={18} color={colors.placeholder} />
            <Text style={[styles.menuRowText, { color: colors.text }]}>ניהול עובדות</Text>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>חשבון</Text>
          <TouchableOpacity style={styles.menuRow} onPress={clearAuth}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.menuRowText}>התנתקות</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 28, paddingBottom: 48 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'left' },
  section: { gap: 14 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRowText: { fontSize: 15, color: colors.error, fontWeight: '500', flex: 1, textAlign: 'left' },
})
