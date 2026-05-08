import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { register } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { AddressAutocompleteInput } from '../../components/ui/AddressAutocompleteInput'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>

type Sex = 'FEMALE' | 'MALE' | 'OTHER'

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'FEMALE', label: 'אישה' },
  { value: 'MALE',   label: 'גבר' },
  { value: 'OTHER',  label: 'אחר' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('972')) return '+' + digits
  if (digits.startsWith('0')) return '+972' + digits.slice(1)
  return '+972' + digits
}

export default function RegisterScreen({ navigation }: Props) {
  const setAuth    = useAuthStore((s) => s.setAuth)
  const scrollRef  = useRef<ScrollView>(null)
  const addressY   = useRef(0)

  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')
  const [dob, setDob]             = useState('')   // DD/MM/YYYY
  const [sex, setSex]             = useState<Sex | null>(null)
  const [city, setCity]           = useState('')
  const [address, setAddress]     = useState('')
  const [loading, setLoading]     = useState(false)

  function parseDob(input: string): string | null {
    // Accepts DD/MM/YYYY → returns ISO YYYY-MM-DD
    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    return `${match[3]}-${match[2]}-${match[1]}`
  }

  function formatDobInput(text: string): string {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
  }

  async function handleRegister() {
    if (!name.trim() || !phone.trim() || !email.trim() || !dob || !sex || !city.trim() || !address.trim()) {
      Alert.alert('שגיאה', 'אנא מלאי את כל השדות')
      return
    }
    const isoDate = parseDob(dob)
    if (!isoDate) {
      Alert.alert('שגיאה', 'תאריך לידה לא תקין (DD/MM/YYYY)')
      return
    }

    setLoading(true)
    try {
      const { user, token } = await register({
        name: name.trim(),
        phone: normalizePhone(phone.trim()),
        email: email.trim(),
        dateOfBirth: isoDate,
        sex,
        city: city.trim(),
        address: address.trim(),
      })
      setAuth(user, token)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'הרשמה נכשלה'
      Alert.alert('שגיאה', Array.isArray(msg) ? msg.join('\n') : String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>הרשמה</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Field label="שם מלא">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="לדוגמה: שרה כהן"
              placeholderTextColor={colors.placeholder}
              textAlign="right"
              autoCapitalize="words"
            />
          </Field>

          <Field label="טלפון">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05X-XXXXXXX"
              placeholderTextColor={colors.placeholder}
              textAlign="left"
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="אימייל">
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={colors.placeholder}
              textAlign="left"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Field>

          <Field label="תאריך לידה">
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={(t) => setDob(formatDobInput(t))}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.placeholder}
              textAlign="left"
              keyboardType="numeric"
              maxLength={10}
            />
          </Field>

          <Field label="מין">
            <View style={styles.sexRow}>
              {SEX_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sexBtn, sex === opt.value && styles.sexBtnActive]}
                  onPress={() => setSex(opt.value)}
                >
                  <Text style={[styles.sexLabel, sex === opt.value && styles.sexLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          <View onLayout={(e) => { addressY.current = e.nativeEvent.layout.y }}>
            <AddressAutocompleteInput
              label="כתובת מגורים"
              value=""
              onSelect={(result) => { setAddress(result.address); setCity(result.city) }}
              onTabPress={() => scrollRef.current?.scrollTo({ y: addressY.current, animated: true })}
            />
          </View>

          <Button
            label="הרשמי"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />

        </ScrollView>
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
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'left' },
  input: {
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sexRow: { flexDirection: 'row-reverse', gap: 10 },
  sexBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sexBtnActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  sexLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  sexLabelActive: { color: colors.primary, fontWeight: '700' },
  submitBtn: { width: '100%', marginTop: 8 },
})
