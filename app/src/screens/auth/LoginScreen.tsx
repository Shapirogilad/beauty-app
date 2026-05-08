import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { sendOtp } from '../../services/authService'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('972')) return '+' + digits
  if (digits.startsWith('0')) return '+972' + digits.slice(1)
  return '+972' + digits
}

function isValidIsraeliPhone(raw: string): boolean {
  return /^\+9725\d{8}$/.test(normalizePhone(raw))
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '')
    if (digits.length > 10) return
    setPhone(digits)
    setError('')
  }

  async function handleSend() {
    setError('')
    if (!isValidIsraeliPhone(phone)) {
      setError('מספר טלפון לא תקין')
      return
    }
    const normalized = normalizePhone(phone)
    setLoading(true)
    let otpSent = false
    try {
      await sendOtp(normalized)
      otpSent = true
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'שליחת הקוד נכשלה, נסי שוב'
      Alert.alert('שגיאה', Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
    if (otpSent) {
      navigation.navigate('OtpVerify', { phone: normalized })
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>כניסה</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>הכניסי את מספר הטלפון שלך</Text>

          <Input
            label="מספר טלפון"
            placeholder="05X-XXXXXXX"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
            error={error}
            prefix="🇮🇱 +972"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSend}
            textAlign="left"
          />

          <Button
            label="שלחי קוד אימות"
            onPress={handleSend}
            loading={loading}
            disabled={!isValidIsraeliPhone(phone)}
            style={styles.btn}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              עוד לא נרשמת? <Text style={styles.registerTextBold}>הרשמי כאן</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  content: { flex: 1, padding: 24, gap: 20, justifyContent: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'left', marginBottom: 4 },
  btn: { width: '100%' },
  registerLink: { alignItems: 'center', paddingVertical: 4 },
  registerText: { fontSize: 15, color: colors.textSecondary },
  registerTextBold: { color: colors.primary, fontWeight: '700' },
})
