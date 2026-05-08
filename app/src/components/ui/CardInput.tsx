import React, { useRef, useState } from 'react'
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../../theme/colors'

export interface CardData {
  ccno: string
  expdate: string   // MMYY
  cvv: string
}

interface CardInputProps {
  onChange: (data: CardData, isValid: boolean) => void
  style?: ViewStyle
}

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

export function CardInput({ onChange, style }: CardInputProps) {
  const [cardDisplay, setCardDisplay] = useState('')
  const [expDisplay, setExpDisplay] = useState('')
  const [cvv, setCvv] = useState('')
  const expRef = useRef<TextInput>(null)
  const cvvRef = useRef<TextInput>(null)

  function emit(ccno: string, expdate: string, cvvVal: string) {
    const isValid = ccno.length === 16 && expdate.length === 4 && cvvVal.length >= 3
    onChange({ ccno, expdate, cvv: cvvVal }, isValid)
  }

  function handleCard(text: string) {
    const formatted = formatCardNumber(text)
    const digits = formatted.replace(/\s/g, '')
    setCardDisplay(formatted)
    if (digits.length === 16) expRef.current?.focus()
    emit(digits, expDisplay.replace('/', ''), cvv)
  }

  function handleExp(text: string) {
    const formatted = formatExpiry(text)
    setExpDisplay(formatted)
    const digits = formatted.replace('/', '')
    if (digits.length === 4) cvvRef.current?.focus()
    emit(cardDisplay.replace(/\s/g, ''), digits, cvv)
  }

  function handleCvv(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4)
    setCvv(digits)
    emit(cardDisplay.replace(/\s/g, ''), expDisplay.replace('/', ''), digits)
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.field}>
        <Text style={styles.label}>מספר כרטיס</Text>
        <TextInput
          style={styles.input}
          value={cardDisplay}
          onChangeText={handleCard}
          keyboardType="number-pad"
          placeholder="0000 0000 0000 0000"
          placeholderTextColor={colors.placeholder}
          textAlign="left"
          maxLength={19}
        />
      </View>
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>תוקף</Text>
          <TextInput
            ref={expRef}
            style={styles.input}
            value={expDisplay}
            onChangeText={handleExp}
            keyboardType="number-pad"
            placeholder="MM/YY"
            placeholderTextColor={colors.placeholder}
            textAlign="left"
            maxLength={5}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            ref={cvvRef}
            style={styles.input}
            value={cvv}
            onChangeText={handleCvv}
            keyboardType="number-pad"
            placeholder="000"
            placeholderTextColor={colors.placeholder}
            textAlign="left"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  field: { gap: 6 },
  row: { flexDirection: 'row-reverse', gap: 12 },
  label: { fontSize: 13, fontWeight: '500', color: colors.text, textAlign: 'left' },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
})
