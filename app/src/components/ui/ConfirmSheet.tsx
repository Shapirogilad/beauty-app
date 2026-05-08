import React from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
import { colors } from '../../theme/colors'

interface ConfirmSheetProps {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmSheet({
  visible, title, message, confirmLabel, cancelLabel = 'חזרה',
  destructive = false, onConfirm, onCancel, loading = false,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, destructive && styles.iconBgDestructive]}>
            <Ionicons
              name={destructive ? 'warning' : 'help-circle'}
              size={32}
              color={destructive ? colors.error : colors.primary}
            />
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttons}>
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            style={[styles.btn, destructive && styles.destructiveBtn]}
            labelStyle={destructive ? { color: '#fff' } : undefined}
          />
          <Button label={cancelLabel} onPress={onCancel} variant="ghost" style={styles.btn} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  iconRow: { alignItems: 'center' },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgDestructive: { backgroundColor: '#FFEBEE' },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttons: { gap: 8, marginTop: 8 },
  btn: { width: '100%' },
  destructiveBtn: { backgroundColor: colors.error },
})
