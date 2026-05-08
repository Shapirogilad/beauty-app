import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { AdminTabParamList } from './types'
import { colors } from '../theme/colors'
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen'
import AdminBusinessesScreen from '../screens/admin/AdminBusinessesScreen'
import AdminClientsScreen from '../screens/admin/AdminClientsScreen'
import AdminFinanceScreen from '../screens/admin/AdminFinanceScreen'
import AdminComplaintsScreen from '../screens/admin/AdminComplaintsScreen'

const Tab = createBottomTabNavigator<AdminTabParamList>()

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  return (
    <View>
      <Ionicons
        name={name as any}
        size={24}
        color={focused ? colors.primary : colors.placeholder}
      />
      {!!badge && (
        <View style={styles.badge}>
        </View>
      )}
    </View>
  )
}

export default function AdminTabNavigator() {
  const insets = useSafeAreaInsets()
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom || 8 }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="AdminDashboardTab"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'בית',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={focused ? colors.primary : colors.placeholder} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminBusinessesTab"
        component={AdminBusinessesScreen}
        options={{
          tabBarLabel: 'עסקים',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={24} color={focused ? colors.primary : colors.placeholder} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminClientsTab"
        component={AdminClientsScreen}
        options={{
          tabBarLabel: 'לקוחות',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={focused ? colors.primary : colors.placeholder} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminFinanceTab"
        component={AdminFinanceScreen}
        options={{
          tabBarLabel: 'כספים',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} size={24} color={focused ? colors.primary : colors.placeholder} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminComplaintsTab"
        component={AdminComplaintsScreen}
        options={{
          tabBarLabel: 'תלונות',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'flag' : 'flag-outline'} size={24} color={focused ? colors.primary : colors.placeholder} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
})
