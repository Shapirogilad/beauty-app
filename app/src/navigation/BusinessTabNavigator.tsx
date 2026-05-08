import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BusinessTabParamList } from './types'
import { colors } from '../theme/colors'
import BusinessDashboardScreen from '../screens/business/BusinessDashboardScreen'
import BusinessScheduleScreen from '../screens/business/BusinessScheduleScreen'
import BusinessServicesScreen from '../screens/business/BusinessServicesScreen'
import BusinessSettingsScreen from '../screens/business/BusinessSettingsScreen'
import BusinessEarningsScreen from '../screens/business/BusinessEarningsScreen'

const Tab = createBottomTabNavigator<BusinessTabParamList>()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  DashboardTab: { active: 'grid',      inactive: 'grid-outline' },
  ScheduleTab:  { active: 'calendar',  inactive: 'calendar-outline' },
  ServicesTab:  { active: 'list',      inactive: 'list-outline' },
  EarningsTab:  { active: 'bar-chart', inactive: 'bar-chart-outline' },
  SettingsTab:  { active: 'settings',  inactive: 'settings-outline' },
}

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'סקירה',
  ScheduleTab:  'לוח זמנים',
  ServicesTab:  'שירותים',
  EarningsTab:  'הכנסות',
  SettingsTab:  'הגדרות',
}

export default function BusinessTabNavigator() {
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
      <Tab.Screen name="DashboardTab" component={BusinessDashboardScreen} />
      <Tab.Screen name="ScheduleTab"  component={BusinessScheduleScreen} />
      <Tab.Screen name="ServicesTab"  component={BusinessServicesScreen} />
      <Tab.Screen name="EarningsTab"  component={BusinessEarningsScreen} />
      <Tab.Screen name="SettingsTab"  component={BusinessSettingsScreen} />
    </Tab.Navigator>
  )
}
