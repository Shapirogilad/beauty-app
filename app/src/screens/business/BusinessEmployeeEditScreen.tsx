import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import {
  fetchOwnStylists, createStylist, updateStylist, uploadStylistPhoto,
  fetchStylistServices, setStylistServices,
  StylistProfile, StylistServiceItem,
} from '../../services/businessOwnerService'
import { getUploadsBaseUrl } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'
import { RootStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessEmployeeEdit'>

const SPECIALTIES_OPTIONS = [
  'תספורת', 'צביעה', 'גוונים', 'קרטין', 'תוספות',
  'ג\'ל', 'אקריל', 'ציפורניים', 'מניקור', 'פדיקור',
  'גבות', 'ריסים', 'שעווה', 'לייזר', 'טיפול פנים',
  'עיסוי', 'איפור', 'פן',
]

export default function BusinessEmployeeEditScreen({ route }: Props) {
  const nav = useNavigation()
  const { stylistId } = route.params
  const isNew = !stylistId

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form fields
  const [profile, setProfile] = useState<StylistProfile | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])

  // Services assignment
  const [services, setServices] = useState<StylistServiceItem[]>([])
  const [offeredServiceIds, setOfferedServiceIds] = useState<Set<string>>(new Set())
  const [savingServices, setSavingServices] = useState(false)

  const load = useCallback(async () => {
    if (isNew) return
    try {
      // Load stylist data from the list
      const all = await fetchOwnStylists()
      const found = all.find((s) => s.id === stylistId)
      if (found) {
        setProfile(found)
        setName(found.name)
        setBio(found.bio ?? '')
        setInstagram(found.instagram ?? '')
        setIsActive(found.isActive)
        setSelectedSpecialties(found.specialties)
      }
      // Load services
      const svcList = await fetchStylistServices(stylistId!)
      setServices(svcList)
      setOfferedServiceIds(new Set(svcList.filter((s) => s.offered).map((s) => s.id)))
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון פרטי עובדת')
    } finally {
      setLoading(false)
    }
  }, [isNew, stylistId])

  useEffect(() => { load() }, [load])

  function toggleSpecialty(s: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function toggleService(id: string) {
    setOfferedServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePickPhoto() {
    Keyboard.dismiss()
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('אין הרשאה', 'אנא אשרי גישה לגלריה בהגדרות')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    })
    if (result.canceled) return

    if (isNew) {
      Alert.alert('שמרי קודם', 'שמרי את פרטי העובדת קודם, ואז תוכלי להעלות תמונה')
      return
    }

    setUploadingPhoto(true)
    try {
      const updated = await uploadStylistPhoto(stylistId!, result.assets[0].uri)
      setProfile(updated)
    } catch {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        instagram: instagram.trim() || undefined,
        specialties: selectedSpecialties,
        isActive,
      }

      if (isNew) {
        await createStylist(payload)
        nav.goBack()
      } else {
        await updateStylist(stylistId!, payload)
        Alert.alert('נשמר', 'פרטי העובדת עודכנו')
      }
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveServices() {
    if (isNew || !stylistId) return
    setSavingServices(true)
    try {
      await setStylistServices(stylistId, [...offeredServiceIds])
      Alert.alert('נשמר', 'שירותי העובדת עודכנו')
    } catch {
      Alert.alert('שגיאה', 'שמירת שירותים נכשלה')
    } finally {
      setSavingServices(false)
    }
  }

  const photoUri = profile?.photo
    ? (profile.photo.startsWith('http') ? profile.photo : `${getUploadsBaseUrl()}${profile.photo}`)
    : null

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isNew ? 'עובדת חדשה' : 'עריכת עובדת'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoWrap} onPress={handlePickPhoto} activeOpacity={0.8}>
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.primary} />
              ) : photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                  <Text style={styles.photoPlaceholderText}>הוסיפי תמונה</Text>
                </View>
              )}
            </TouchableOpacity>
            {!isNew && (
              <Text style={styles.photoHint}>לחצי לשינוי תמונה</Text>
            )}
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>

            <View style={styles.field}>
              <Text style={styles.label}>שם</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="שם העובדת"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ביו קצרה</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={bio}
                onChangeText={setBio}
                placeholder="קצת עליי, ניסיון, גישה..."
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>אינסטגרם</Text>
              <TextInput
                style={styles.input}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@username"
                placeholderTextColor={colors.placeholder}
                textAlign="right"
                autoCapitalize="none"
              />
            </View>

            {!isNew && (
              <View style={styles.switchRow}>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={isActive ? colors.primary : colors.placeholder}
                />
                <Text style={styles.switchLabel}>עובדת פעילה</Text>
              </View>
            )}
          </View>

          {/* Specialties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>התמחויות</Text>
            <Text style={styles.sectionSub}>בחרי את סוגי הטיפולים שהעובדת מציעה</Text>
            <View style={styles.chipGrid}>
              {SPECIALTIES_OPTIONS.map((s) => {
                const active = selectedSpecialties.includes(s)
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chipOpt, active && styles.chipOptActive]}
                    onPress={() => toggleSpecialty(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipOptText, active && styles.chipOptTextActive]}>{s}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <Button label={isNew ? 'צרי עובדת' : 'שמרי פרטים'} onPress={handleSave} loading={saving} style={styles.saveBtn} />

          {/* Services — only for existing stylists */}
          {!isNew && services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>שירותים מוצעים</Text>
              <Text style={styles.sectionSub}>סמני את השירותים שהעובדת מוסמכת לבצע</Text>

              {services.map((svc) => (
                <TouchableOpacity
                  key={svc.id}
                  style={styles.serviceRow}
                  onPress={() => toggleService(svc.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, offeredServiceIds.has(svc.id) && styles.checkboxActive]}>
                    {offeredServiceIds.has(svc.id) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{svc.nameHe}</Text>
                    <Text style={styles.serviceMeta}>{svc.durationMinutes} דק׳ · ₪{svc.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <Button
                label="שמרי שירותים"
                onPress={handleSaveServices}
                loading={savingServices}
                style={styles.saveBtn}
              />
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

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
  content: { padding: 20, gap: 28, paddingBottom: 60 },

  photoSection: { alignItems: 'center', gap: 8 },
  photoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  photo: { width: 100, height: 100 },
  photoPlaceholder: { alignItems: 'center', gap: 4 },
  photoPlaceholderText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  photoHint: { fontSize: 12, color: colors.placeholder },

  section: { gap: 14 },
  sectionTitle: {
    fontSize: 16,
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

  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },

  chipGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chipOpt: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOptActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  chipOptText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  chipOptTextActive: { color: colors.primary, fontWeight: '700' },

  saveBtn: { width: '100%', marginTop: 4 },

  serviceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  serviceMeta: { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
})
