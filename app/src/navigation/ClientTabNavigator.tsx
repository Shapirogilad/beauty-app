import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ClientTabParamList } from './types'
import { colors } from '../theme/colors'
import HomeScreen from '../screens/client/HomeScreen'
import AppointmentsScreen from '../screens/client/AppointmentsScreen'
import ProfileScreen from '../screens/client/ProfileScreen'

const Tab = createBottomTabNavigator<ClientTabParamList>()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  HomeTab:         { active: 'home',     inactive: 'home-outline' },
  AppointmentsTab: { active: 'calendar', inactive: 'calendar-outline' },
  ProfileTab:      { active: 'person',   inactive: 'person-outline' },
}

const TAB_LABELS: Record<string, string> = {
  HomeTab:         'בית',
  AppointmentsTab: 'התורים שלי',
  ProfileTab:      'פרופיל',
}

export default function ClientTabNavigator() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = 60 + insets.bottom

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarLabel: TAB_LABELS[route.name],
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name]
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="HomeTab"         component={HomeScreen} />
      <Tab.Screen name="AppointmentsTab" component={AppointmentsScreen} />
      <Tab.Screen name="ProfileTab"      component={ProfileScreen} />
    </Tab.Navigator>
  )
}
