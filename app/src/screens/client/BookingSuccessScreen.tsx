import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as Calendar from 'expo-calendar'
import { RootStackParamList } from '../../navigation/types'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingSuccess'>

export default function BookingSuccessScreen({ route, navigation }: Props) {
  const { startAt, endAt, businessName, businessAddress, serviceName, stylistName } = route.params
  const [addingToCalendar, setAddingToCalendar] = useState(false)
  const [addedToCalendar, setAddedToCalendar] = useState(false)

  async function handleAddToCalendar() {
    setAddingToCalendar(true)
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('הרשאה נדחתה', 'יש לאפשר גישה ליומן בהגדרות הטלפון כדי להוסיף את התור.')
        return
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
      const writable  = calendars.find((c) => c.allowsModifications)
      if (!writable) {
        Alert.alert('שגיאה', 'לא נמצא יומן זמין בטלפון.')
        return
      }

      const titleParts = [serviceName, stylistName ? `אצל ${stylistName}` : null].filter(Boolean)
      const title = titleParts.length > 0 ? titleParts.join(' ') : 'תור — דורה'

      const notesParts = [
        businessName,
        businessAddress,
        'תור שנקבע דרך אפליקציית דורה',
      ].filter(Boolean)

      await Calendar.createEventAsync(writable.id, {
        title,
        startDate: new Date(startAt),
        endDate:   new Date(endAt),
        timeZone:  'Asia/Jerusalem',
        location:  businessAddress,
        notes:     notesParts.join('\n'),
        alarms:    [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      })

      setAddedToCalendar(true)
    } catch {
      Alert.alert('שגיאה', 'לא ניתן היה להוסיף את התור ליומן.')
    } finally {
      setAddingToCalendar(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.iconWrapper}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>

        <Text style={styles.title}>ההזמנה אושרה!</Text>
        <Text style={styles.subtitle}>
          נשלח אישור עם פרטי התור בהודעת SMS
        </Text>

        <View style={styles.card}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.cardText}>ניתן לראות ולבטל את התור תחת "התורים שלי"</Text>
        </View>

        {/* Add to calendar */}
        <View style={styles.calendarRow}>
          {addedToCalendar ? (
            <View style={styles.calendarDone}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.calendarDoneText}>התור נוסף ליומן!</Text>
            </View>
          ) : (
            <Button
              label={addingToCalendar ? '' : 'הוספה ליומן הטלפון'}
              onPress={handleAddToCalendar}
              variant="ghost"
              style={styles.calendarBtn}
              loading={addingToCalendar}
              icon={<Ionicons name="calendar-outline" size={18} color={colors.primary} />}
            />
          )}
        </View>
      </View>

      <View style={styles.bottom}>
        <Button
          label="לתורים שלי"
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{
                name: 'ClientTabs',
                state: {
                  index: 1,
                  routes: [
                    { name: 'HomeTab' },
                    { name: 'AppointmentsTab' },
                    { name: 'ProfileTab' },
                  ],
                },
              }],
            })
          }}
          style={styles.button}
        />
        <Button
          label="חזרה לדף הבית"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ClientTabs' }] })}
          variant="ghost"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EDF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryFaint,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignSelf: 'stretch',
  },
  cardText: { fontSize: 14, color: colors.primary, flex: 1, textAlign: 'left', lineHeight: 20 },
  calendarRow: { alignSelf: 'stretch' },
  calendarBtn: { width: '100%' },
  calendarDone: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  calendarDoneText: { fontSize: 15, color: colors.success, fontWeight: '600' },
  bottom: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 10,
  },
  button: { width: '100%' },
})
