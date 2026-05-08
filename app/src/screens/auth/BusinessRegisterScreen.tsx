import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { registerBusiness } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { AddressAutocompleteInput } from '../../components/ui/AddressAutocompleteInput'
import { WorkingHoursEditor } from '../../components/business/WorkingHoursEditor'
import { CATEGORY_TO_HEBREW } from '../../types/business'
import { WorkingHoursEntry } from '../../types/businessOwner'
import { colors } from '../../theme/colors'

const DEFAULT_HOURS: WorkingHoursEntry[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  openTime: '09:00',
  closeTime: d === 5 ? '14:00' : '20:00',
  isClosed: d === 6,
  breaks: [],
}))

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessRegister'>

const ALL_CATEGORIES = Object.entries(CATEGORY_TO_HEBREW) as [string, string][]

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

export default function BusinessRegisterScreen({ navigation }: Props) {
  const setAuth   = useAuthStore((s) => s.setAuth)
  const scrollRef = useRef<ScrollView>(null)
  const addressY  = useRef(0)

  // Owner fields
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Business fields
  const [bizName, setBizName]     = useState('')
  const [bizPhone, setBizPhone]   = useState('')
  const [address, setAddress]     = useState('')
  const [city, setCity]           = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [hours, setHours] = useState<WorkingHoursEntry[]>(DEFAULT_HOURS)
  const [showHours, setShowHours] = useState(false)

  const [loading, setLoading] = useState(false)

  function toggleCategory(hebrewValue: string) {
    setCategories((prev) =>
      prev.includes(hebrewValue)
        ? prev.filter((c) => c !== hebrewValue)
        : [...prev, hebrewValue],
    )
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('שגיאה', 'אנא מלאי את פרטי בעל/ת העסק')
      return
    }
    if (!bizName.trim() || !bizPhone.trim() || !address.trim() || !city.trim()) {
      Alert.alert('שגיאה', 'אנא מלאי את פרטי העסק')
      return
    }
    if (categories.length === 0) {
      Alert.alert('שגיאה', 'יש לבחור לפחות קטגוריה אחת')
      return
    }

    setLoading(true)
    try {
      const { user, token } = await registerBusiness({
        name: name.trim(),
        phone: normalizePhone(phone.trim()),
        email: email.trim(),
        businessName: bizName.trim(),
        businessPhone: bizPhone.trim(),
        address: address.trim(),
        city: city.trim(),
        categories,
        workingHours: hours,
      })
      setAuth(user, token)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'ההרשמה נכשלה'
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
          <Text style={styles.title}>הצטרפות לדורה כבעל/ת עסק</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Section: Owner */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>

            <Field label="שם מלא">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="שם בעל/ת העסק"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                autoCapitalize="words"
              />
            </Field>

            <Field label="טלפון נייד">
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
          </View>

          {/* Section: Business */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטי העסק</Text>

            <Field label="שם העסק">
              <TextInput
                style={styles.input}
                value={bizName}
                onChangeText={setBizName}
                placeholder="לדוגמה: מספרת שרה"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                autoCapitalize="words"
              />
            </Field>

            <Field label="טלפון העסק">
              <TextInput
                style={styles.input}
                value={bizPhone}
                onChangeText={setBizPhone}
                placeholder="03-XXXXXXX"
                placeholderTextColor={colors.placeholder}
                textAlign="left"
                keyboardType="phone-pad"
              />
            </Field>

            <View onLayout={(e) => { addressY.current = e.nativeEvent.layout.y }}>
              <AddressAutocompleteInput
                label="כתובת העסק"
                value=""
                onSelect={(result) => { setAddress(result.address); setCity(result.city) }}
                onTabPress={() => scrollRef.current?.scrollTo({ y: addressY.current, animated: true })}
              />
            </View>
          </View>

          {/* Section: Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>קטגוריות שירות</Text>
            <Text style={styles.sectionSub}>בחרי את סוגי השירותים שהעסק שלך מציע</Text>

            <View style={styles.categoryGrid}>
              {ALL_CATEGORIES.map(([key, label]) => {
                const selected = categories.includes(label)
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                    onPress={() => toggleCategory(label)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={selected ? colors.primary : colors.placeholder}
                    />
                    <Text style={[styles.categoryLabel, selected && styles.categoryLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Section: Working hours (optional) */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.hoursToggleRow}
              onPress={() => setShowHours((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={showHours ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.hoursToggleLabel}>
                {showHours ? 'הסתרת שעות פעילות' : 'הגדרת שעות פעילות (אופציונלי)'}
              </Text>
            </TouchableOpacity>
            {!showHours && (
              <Text style={styles.hoursHint}>
                ניתן להגדיר שעות פעילות עכשיו או לאחר ההרשמה בהגדרות
              </Text>
            )}
            {showHours && (
              <WorkingHoursEditor hours={hours} onChange={setHours} />
            )}
          </View>

          <Button
            label="הצטרפי לדורה"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <Text style={styles.legal}>
            בהמשך את מאשרת את תנאי השימוש ומדיניות הפרטיות
          </Text>

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
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  content: { padding: 24, gap: 28, paddingBottom: 48 },
  section: { gap: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  sectionSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'left',
    marginTop: -8,
  },
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
  categoryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  categoryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  hoursToggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  hoursToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    textAlign: 'left',
  },
  hoursHint: {
    fontSize: 12,
    color: colors.placeholder,
    textAlign: 'left',
  },
  submitBtn: { width: '100%' },
  legal: { fontSize: 12, color: colors.placeholder, textAlign: 'center', lineHeight: 18 },
})
