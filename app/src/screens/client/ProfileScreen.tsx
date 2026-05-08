import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'
import { RootStackParamList } from '../../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

interface MenuRow {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
  destructive?: boolean
}

export default function ProfileScreen() {
  const user    = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const nav     = useNavigation<Nav>()

  function handleLogout() {
    Alert.alert('התנתקות', 'בטוחה שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתקי', style: 'destructive', onPress: clearAuth },
    ])
  }

  const rows: MenuRow[] = [
    {
      icon: 'gift-outline',
      label: 'הזמיני חברות וקבלי נקודות',
      onPress: () => nav.navigate('Referral'),
    },
    {
      icon: 'chatbubble-outline',
      label: 'הודעות',
      onPress: () => nav.navigate('Conversations'),
    },
    {
      icon: 'wallet-outline',
      label: 'ארנק',
      onPress: () => nav.navigate('PaymentWallet'),
    },
    {
      icon: 'notifications-outline',
      label: 'התראות',
      onPress: () => {},
    },
    {
      icon: 'log-out-outline',
      label: 'התנתקות',
      onPress: handleLogout,
      destructive: true,
    },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={40} color={colors.primaryLight} />
          )}
        </View>
        <Text style={styles.name}>{user?.name ?? ''}</Text>
        <Text style={styles.phone}>{user?.phone ?? ''}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {rows.map((row, i) => (
          <TouchableOpacity key={i} style={styles.menuRow} onPress={row.onPress} activeOpacity={0.7}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={row.destructive ? colors.error : colors.placeholder}
            />
            <Text style={[styles.menuLabel, row.destructive && styles.menuLabelDestructive]}>
              {row.label}
            </Text>
            <Ionicons
              name={row.icon}
              size={22}
              color={row.destructive ? colors.error : colors.primary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    overflow: 'hidden',
  },
  avatarImg: { width: 88, height: 88 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  phone: { fontSize: 14, color: colors.textSecondary, direction: 'ltr' } as any,
  menu: { paddingHorizontal: 20, paddingTop: 16, gap: 4 },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 16, color: colors.text, textAlign: 'left' },
  menuLabelDestructive: { color: colors.error },
})
