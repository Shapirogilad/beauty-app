import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Switch, Modal, ScrollView, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { fetchOwnServices, createService, toggleService, updateService } from '../../services/businessOwnerService'
import { ManagedService } from '../../types/businessOwner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatPrice, formatDuration } from '../../utils/shabbat'
import { colors } from '../../theme/colors'

const INTERVAL_OPTIONS: { value: 15 | 30 | 60; label: string }[] = [
  { value: 15, label: '15 דק׳' },
  { value: 30, label: '30 דק׳' },
  { value: 60, label: 'שעה' },
]

type ServiceForm = { nameHe: string; price: string; durationMinutes: string; slotIntervalMinutes: 15 | 30 | 60 }
const EMPTY_FORM: ServiceForm = { nameHe: '', price: '', durationMinutes: '', slotIntervalMinutes: 30 }

export default function BusinessServicesScreen() {
  const [services, setServices] = useState<ManagedService[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ManagedService | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setServices(await fetchOwnServices())
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(service: ManagedService) {
    setEditTarget(service)
    setForm({
      nameHe: service.nameHe,
      price: String(service.price / 100),
      durationMinutes: String(service.durationMinutes),
      slotIntervalMinutes: ([15, 30, 60].includes(service.slotIntervalMinutes) ? service.slotIntervalMinutes : 30) as 15 | 30 | 60,
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.nameHe.trim()) { setFormError('נדרש שם שירות'); return }
    const price = parseFloat(form.price)
    const duration = parseInt(form.durationMinutes)
    if (isNaN(price) || price <= 0) { setFormError('מחיר לא תקין'); return }
    if (isNaN(duration) || duration <= 0) { setFormError('משך לא תקין'); return }

    setSaving(true)
    try {
      const payload = {
        nameHe: form.nameHe.trim(),
        price: Math.round(price * 100),
        durationMinutes: duration,
        slotIntervalMinutes: form.slotIntervalMinutes,
      }
      if (editTarget) {
        await updateService(editTarget.id, payload)
      } else {
        await createService(payload)
      }
      setShowForm(false)
      load()
    } catch {
      setFormError('שגיאה בשמירה, נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(service: ManagedService) {
    await toggleService(service.id, !service.isActive)
    setServices((prev) =>
      prev.map((s) => s.id === service.id ? { ...s, isActive: !s.isActive } : s)
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>שירותים</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <ServiceRow
              service={item}
              onEdit={() => openEdit(item)}
              onToggle={() => handleToggle(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cut-outline" size={40} color={colors.primaryLight} />
              <Text style={styles.emptyText}>אין שירותים עדיין</Text>
              <Button label="הוסיפי שירות ראשון" onPress={openCreate} style={styles.emptyBtn} />
            </View>
          }
        />
      )}

      {/* Service form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalCancel}>ביטול</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editTarget ? 'עריכת שירות' : 'שירות חדש'}</Text>
            <View style={{ width: 48 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Input
              label="שם השירות (בעברית)"
              placeholder="לדוגמה: תספורת ופן"
              value={form.nameHe}
              onChangeText={(v) => setForm((f) => ({ ...f, nameHe: v }))}
              textAlign="right"
            />
            <Input
              label="מחיר (₪)"
              placeholder="150"
              value={form.price}
              onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
              keyboardType="decimal-pad"
              prefix="₪"
              textAlign="left"
            />
            <Input
              label="משך (דקות)"
              placeholder="60"
              value={form.durationMinutes}
              onChangeText={(v) => setForm((f) => ({ ...f, durationMinutes: v }))}
              keyboardType="number-pad"
              textAlign="left"
            />

            <View style={styles.intervalSection}>
              <Text style={styles.intervalLabel}>מרווח תורים לשירות זה</Text>
              <Text style={styles.intervalSub}>כל כמה זמן נפתח חלון הזמנה</Text>
              <View style={styles.intervalRow}>
                {INTERVAL_OPTIONS.map((opt) => {
                  const selected = form.slotIntervalMinutes === opt.value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.intervalBtn, selected && styles.intervalBtnActive]}
                      onPress={() => setForm((f) => ({ ...f, slotIntervalMinutes: opt.value }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.intervalBtnLabel, selected && styles.intervalBtnLabelActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="שמרי שירות" onPress={handleSave} loading={saving} style={styles.saveBtn} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function ServiceRow({ service, onEdit, onToggle }: {
  service: ManagedService
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <View style={[styles.serviceCard, !service.isActive && styles.serviceCardInactive]}>
      <View style={styles.serviceLeft}>
        <Switch
          value={service.isActive}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      <View style={styles.serviceInfo}>
        <Text style={[styles.serviceName, !service.isActive && styles.textInactive]}>
          {service.nameHe}
        </Text>
        <View style={styles.serviceMeta}>
          <Text style={styles.metaText}>{formatDuration(service.durationMinutes)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>כל {service.slotIntervalMinutes} דק׳</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
        <Ionicons name="create-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  emptyBtn: { marginTop: 8 },

  serviceCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  serviceCardInactive: { opacity: 0.55 },
  serviceLeft: { alignItems: 'center' },
  serviceInfo: { flex: 1, gap: 4 },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left' },
  textInactive: { color: colors.textSecondary },
  serviceMeta: { flexDirection: 'row-reverse', gap: 6, alignItems: 'center' },
  metaText: { fontSize: 13, color: colors.textSecondary },
  metaDot: { fontSize: 13, color: colors.placeholder },
  servicePrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  editBtn: { padding: 4 },

  intervalSection: { gap: 8 },
  intervalLabel: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left' },
  intervalSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left', marginTop: -4 },
  intervalRow: { flexDirection: 'row-reverse', gap: 10 },
  intervalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  intervalBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  intervalBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  intervalBtnLabelActive: { color: '#fff' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalCancel: { fontSize: 16, color: colors.primary },
  modalContent: { padding: 20, gap: 18 },
  formError: { color: colors.error, fontSize: 13, textAlign: 'left' },
  saveBtn: { width: '100%', marginTop: 8 },
})
