import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../navigation/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'
import { sendOtp } from '../../services/authService'

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneEntry'>

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+972' + digits.slice(1)
  if (digits.startsWith('972')) return '+' + digits
  return '+972' + digits
}

function isValidIsraeliPhone(raw: string): boolean {
  const normalized = normalizePhone(raw)
  return /^\+9725\d{8}$/.test(normalized)
}

export default function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation()
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
      const msg = e?.response?.data?.message ?? t('errors.server')
      Alert.alert('שגיאה', Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
    if (otpSent) {
      navigation.navigate('OtpVerify', { phone: normalized })
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.phoneLabel')}
            placeholder={t('auth.phonePlaceholder')}
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
            label={t('auth.sendOtp')}
            onPress={handleSend}
            loading={loading}
            style={styles.button}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 40,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  form: {
    gap: 20,
  },
  button: {
    width: '100%',
  },
})
