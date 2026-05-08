import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { submitReview } from '../../services/reviewsService'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>

export default function ReviewScreen({ route, navigation }: Props) {
  const { bookingId, serviceName } = route.params

  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('נא לבחור דירוג', 'יש לבחור כוכב אחד לפחות')
      return
    }
    setSubmitting(true)
    try {
      await submitReview(bookingId, rating, text.trim() || undefined)
      navigation.goBack()
    } catch {
      Alert.alert('שגיאה', 'לא ניתן היה לשלוח את הביקורת, נסי שוב')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ביקורת</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Service name */}
          <Text style={styles.serviceName}>{serviceName}</Text>
          <Text style={styles.prompt}>איך הייתה החוויה?</Text>

          {/* Stars */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= rating ? '#F5A623' : colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingLabel}>
            {rating === 0 ? '' : RATING_LABELS[rating]}
          </Text>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="ספרי לנו עוד (לא חובה)..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlign="right"
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitLabel}>שלחי ביקורת</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const RATING_LABELS: Record<number, string> = {
  1: 'גרוע',
  2: 'לא טוב',
  3: 'סביר',
  4: 'טוב',
  5: 'מעולה!',
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
  },
  backBtn: { width: 40, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  serviceName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  prompt: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5A623',
    minHeight: 22,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    lineHeight: 22,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
