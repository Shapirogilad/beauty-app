import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../navigation/types'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'
import { sendOtp, verifyOtp } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function OtpVerifyScreen({ route, navigation }: Props) {
  const { phone } = route.params
  const setAuth = useAuthStore((s) => s.setAuth)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<TextInput[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleDigitChange(value: string, index: number) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== '')) handleVerify(next.join(''))
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(code?: string) {
    const otp = code ?? digits.join('')
    if (otp.length < OTP_LENGTH) return
    setError('')
    setLoading(true)
    try {
      const result = await verifyOtp(phone, otp)
      setAuth({ ...result.user, businessStatus: result.businessStatus }, result.token)
      if (result.isNewUser) {
        navigation.replace('ProfileSetup', { phone })
      }
    } catch {
      setError('הקוד שגוי, נסי שוב')
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0) return
    try {
      await sendOtp(phone)
      setCountdown(RESEND_SECONDS)
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch {
      setError('שליחה מחדש נכשלה')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>קוד אימות</Text>
          <Text style={styles.subtitle}>שלחנו קוד ל-{phone}</Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputRefs.current[i] = ref }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(v) => handleDigitChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              autoFocus={i === 0}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="אמתי"
          onPress={() => handleVerify()}
          loading={loading}
          disabled={digits.some((d) => !d)}
          style={styles.button}
        />

        <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
          <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0 ? `שלחי שוב בעוד ${countdown} שניות` : 'שלחי קוד שוב'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 28 },
  header: { gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'left' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'left' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, direction: 'ltr' },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, fontSize: 22,
    fontWeight: '600', color: colors.text,
  },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  error: { fontSize: 13, color: colors.error, textAlign: 'center' },
  button: { width: '100%' },
  resend: { fontSize: 14, color: colors.primary, textAlign: 'center', fontWeight: '500' },
  resendDisabled: { color: colors.placeholder },
})
