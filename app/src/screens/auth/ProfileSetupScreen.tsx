import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../navigation/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors } from '../../theme/colors'
import { updateProfile } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>

export default function ProfileSetupScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const { user, token, setAuth } = useAuthStore()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setError('')
    if (name.trim().length < 2) {
      setError('שם חייב להכיל לפחות 2 תווים')
      return
    }
    setLoading(true)
    try {
      const updated = await updateProfile({ name: name.trim() })
      setAuth(updated, token!)
    } catch {
      setError(t('errors.server'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>מה שמך?</Text>
          <Text style={styles.subtitle}>נשתמש בשמך כדי לאשר תורים</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('auth.name')}
            placeholder={t('auth.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            error={error}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            textAlign="right"
          />

          <Button
            label="המשיכי"
            onPress={handleSave}
            loading={loading}
            disabled={name.trim().length < 2}
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
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  button: {
    width: '100%',
  },
})
