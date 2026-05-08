import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import {
  fetchBusinessProfile, updateBusinessProfile, updateOwnerInfo,
  uploadBusinessPhoto, removeBusinessPhoto,
  BusinessProfile,
} from '../../services/businessOwnerService'
import { AddressAutocompleteInput } from '../../components/ui/AddressAutocompleteInput'
import { Button } from '../../components/ui/Button'
import { CATEGORY_TO_HEBREW } from '../../types/business'
import { colors } from '../../theme/colors'

type PhotoSection = 'business' | 'work'

const ALL_CATEGORIES = Object.entries(CATEGORY_TO_HEBREW) as [string, string][]

export default function BusinessProfileEditScreen() {
  const nav = useNavigation()
  const scrollRef = useRef<ScrollView>(null)
  const addressY  = useRef(0)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Owner fields
  const [ownerName,  setOwnerName]  = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [savingOwner, setSavingOwner] = useState(false)

  // Business info fields
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [bizPhone,    setBizPhone]     = useState('')
  const [categories,  setCategories]   = useState<string[]>([])
  const [savingBiz,   setSavingBiz]    = useState(false)

  // Address
  const [newAddress, setNewAddress] = useState<{ address: string; city: string } | null>(null)

  // Photo upload state
  const [uploadingSection, setUploadingSection] = useState<PhotoSection | null>(null)

  const load = useCallback(async () => {
    try {
      const p = await fetchBusinessProfile()
      setProfile(p)
      setName(p.name)
      setDescription(p.description ?? '')
      setBizPhone(p.phone)
      setCategories(p.category)
      setOwnerName(p.owner.name)
      setOwnerEmail(p.owner.email ?? '')
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון פרטי עסק')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function toggleCategory(label: string) {
    setCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    )
  }

  async function handleSaveOwner() {
    if (!ownerName.trim()) { Alert.alert('שגיאה', 'שם לא יכול להיות ריק'); return }
    setSavingOwner(true)
    try {
      await updateOwnerInfo({ name: ownerName.trim(), email: ownerEmail.trim() || undefined })
      Alert.alert('נשמר', 'הפרטים האישיים עודכנו בהצלחה')
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה')
    } finally {
      setSavingOwner(false)
    }
  }

  async function handleSaveBiz() {
    if (!name.trim()) { Alert.alert('שגיאה', 'שם העסק לא יכול להיות ריק'); return }
    setSavingBiz(true)
    try {
      const payload: Parameters<typeof updateBusinessProfile>[0] = {
        name:        name.trim(),
        description: description.trim(),
        phone:       bizPhone.trim(),
        categories,
      }
      if (newAddress) {
        payload.address = newAddress.address
        payload.city    = newAddress.city
      }
      const updated = await updateBusinessProfile(payload)
      setProfile((prev) => prev ? { ...prev, ...updated } : prev)
      setNewAddress(null)
      Alert.alert('נשמר', 'פרטי העסק עודכנו בהצלחה')
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה')
    } finally {
      setSavingBiz(false)
    }
  }

  async function handlePickPhoto(section: PhotoSection) {
    Keyboard.dismiss()
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('אין הרשאה', 'אנא אשרי גישה לגלריה בהגדרות')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    })
    if (result.canceled) return

    setUploadingSection(section)
    try {
      const updated = await uploadBusinessPhoto(result.assets[0].uri, section)
      setProfile((prev) => prev ? { ...prev, ...updated } : prev)
    } catch {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה')
    } finally {
      setUploadingSection(null)
    }
  }

  async function handleRemovePhoto(section: PhotoSection, url: string) {
    Alert.alert('מחיקת תמונה', 'למחוק את התמונה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await removeBusinessPhoto(section, url)
            setProfile((prev) => prev ? { ...prev, ...updated } : prev)
          } catch {
            Alert.alert('שגיאה', 'מחיקה נכשלה')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  const currentAddressDisplay = newAddress
    ? `${newAddress.address}, ${newAddress.city}`
    : profile?.address ?? ''

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>פרטי העסק ותמונות</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Owner Personal Info ────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>

            <Field label="שם מלא">
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="שם בעל/ת העסק"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                autoCapitalize="words"
              />
            </Field>

            <Field label="אימייל">
              <TextInput
                style={styles.input}
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="example@email.com"
                placeholderTextColor={colors.placeholder}
                textAlign="left"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>

            <Button label="שמרי פרטים אישיים" onPress={handleSaveOwner} loading={savingOwner} style={styles.saveBtn} />
          </View>

          {/* ── Business Info ──────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטי העסק</Text>

            <Field label="שם העסק">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="שם העסק"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
              />
            </Field>

            <Field label="תיאור קצר">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="ספרי על העסק שלך..."
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </Field>

            <Field label="טלפון העסק">
              <TextInput
                style={styles.input}
                value={bizPhone}
                onChangeText={setBizPhone}
                placeholder="05X-XXXXXXX"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                keyboardType="phone-pad"
              />
            </Field>

            {/* Address */}
            <Field label="כתובת נוכחית">
              <View style={styles.currentAddress}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.currentAddressText} numberOfLines={1}>{currentAddressDisplay}</Text>
              </View>
            </Field>

            <View onLayout={(e) => { addressY.current = e.nativeEvent.layout.y }}>
              <AddressAutocompleteInput
                label="שינוי כתובת"
                value=""
                onSelect={(result) => setNewAddress({ address: result.address, city: result.city })}
                onTabPress={() => scrollRef.current?.scrollTo({ y: addressY.current, animated: true })}
              />
            </View>

            {/* Categories */}
            <Field label="קטגוריות שירות">
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
            </Field>

            <Button label="שמרי פרטי עסק" onPress={handleSaveBiz} loading={savingBiz} style={styles.saveBtn} />
          </View>

          {/* ── Business Photos ────────────────────────────────── */}
          <PhotoSectionView
            title="תמונות העסק"
            subtitle="תמונות של הסלון / מקום העבודה"
            photos={profile?.photos ?? []}
            onAdd={() => handlePickPhoto('business')}
            onRemove={(url) => handleRemovePhoto('business', url)}
            uploading={uploadingSection === 'business'}
          />

          {/* ── Work / Portfolio Photos ────────────────────────── */}
          <PhotoSectionView
            title="גלריית עבודות"
            subtitle="תמונות של עבודות לדוגמה — לפני/אחרי, תוצאות"
            photos={profile?.workPhotos ?? []}
            onAdd={() => handlePickPhoto('work')}
            onRemove={(url) => handleRemovePhoto('work', url)}
            uploading={uploadingSection === 'work'}
          />

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function PhotoSectionView({
  title, subtitle, photos, onAdd, onRemove, uploading,
}: {
  title: string
  subtitle: string
  photos: string[]
  onAdd: () => void
  onRemove: (url: string) => void
  uploading: boolean
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>

      <View style={styles.photoGrid}>
        {photos.map((url) => (
          <View key={url} style={styles.photoItem}>
            <Image source={{ uri: url }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(url)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addPhoto, uploading && styles.addPhotoUploading]}
          onPress={onAdd}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator color={colors.primary} />
            : (
              <>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={styles.addPhotoText}>הוספי</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const PHOTO_SIZE = 100

const styles = StyleSheet.create({
  kav: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  content: { padding: 20, gap: 28, paddingBottom: 48 },
  section: { gap: 14 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
  },
  sectionSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'left', marginTop: -6 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'left' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: { width: '100%', marginTop: 4 },
  currentAddress: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  currentAddressText: { flex: 1, fontSize: 14, color: colors.textSecondary, textAlign: 'right' },
  categoryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  categoryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  categoryLabelActive: { color: colors.primary, fontWeight: '700' },
  photoGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: 'visible',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  addPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primaryFaint,
  },
  addPhotoUploading: { opacity: 0.6 },
  addPhotoText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
})
