import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { CardInput, CardData } from '../../components/ui/CardInput'
import { Button } from '../../components/ui/Button'
import { addCardToWallet } from '../../services/bookingsService'
import { colors } from '../../theme/colors'

export default function AddCardScreen() {
  const nav = useNavigation()
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [cardValid, setCardValid] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!cardData || !cardValid) return
    setLoading(true)
    try {
      await addCardToWallet({
        ccno: cardData.ccno,
        expdate: cardData.expdate,
        cvv: cardData.cvv,
      })
      Alert.alert('הכרטיס נשמר', 'הכרטיס נוסף בהצלחה לארנק שלך', [
        { text: 'אוקיי', onPress: () => nav.goBack() },
      ])
    } catch (e: any) {
      const raw = e?.response?.data?.message ?? 'שמירת הכרטיס נכשלה, נסי שוב'
      const msg = Array.isArray(raw) ? raw.join('\n') : String(raw)
      Alert.alert('שגיאה', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>הוספת כרטיס</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>פרטי הכרטיס מוצפנים ומאובטחים. אנחנו לא שומרים את מספר הכרטיס.</Text>
        </View>

        <CardInput onChange={(data, valid) => { setCardData(data); setCardValid(valid) }} />

        <Button
          label="שמרי כרטיס"
          onPress={handleSave}
          disabled={!cardValid}
          loading={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: colors.background },
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
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 20, gap: 20 },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: { fontSize: 13, color: colors.textSecondary, flex: 1, textAlign: 'left', lineHeight: 20 },
  saveBtn: { width: '100%', marginTop: 8 },
})
