import './src/utils/i18n'
import React, { useEffect, useRef } from 'react'
import { I18nManager } from 'react-native'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as ExpoNotifications from 'expo-notifications'
import { RootStackParamList } from './src/navigation/types'
import { useAuthStore } from './src/store/authStore'
import { configureNotificationHandler, registerPushToken } from './src/utils/notifications'
import WelcomeScreen from './src/screens/auth/WelcomeScreen'
import RegisterScreen from './src/screens/auth/RegisterScreen'
import BusinessRegisterScreen from './src/screens/auth/BusinessRegisterScreen'
import LoginScreen from './src/screens/auth/LoginScreen'
import OtpVerifyScreen from './src/screens/auth/OtpVerifyScreen'
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen'
import BusinessPendingScreen from './src/screens/auth/BusinessPendingScreen'
import ClientTabNavigator from './src/navigation/ClientTabNavigator'
import BusinessTabNavigator from './src/navigation/BusinessTabNavigator'
import BusinessProfileScreen from './src/screens/client/BusinessProfileScreen'
import ServiceSelectScreen from './src/screens/client/ServiceSelectScreen'
import StylistSelectScreen from './src/screens/client/StylistSelectScreen'
import DateTimeSelectScreen from './src/screens/client/DateTimeSelectScreen'
import RescheduleRequestScreen from './src/screens/client/RescheduleRequestScreen'
import BookingConfirmScreen from './src/screens/client/BookingConfirmScreen'
import BookingSuccessScreen from './src/screens/client/BookingSuccessScreen'
import ReferralScreen from './src/screens/client/ReferralScreen'
import SearchScreen from './src/screens/client/SearchScreen'
import ReviewScreen from './src/screens/client/ReviewScreen'
import WalletScreen from './src/screens/client/WalletScreen'
import AddCardScreen from './src/screens/client/AddCardScreen'
import ConversationsScreen from './src/screens/shared/ConversationsScreen'
import ChatScreen from './src/screens/shared/ChatScreen'
import BusinessProfileEditScreen from './src/screens/business/BusinessProfileEditScreen'
import BusinessEmployeesScreen from './src/screens/business/BusinessEmployeesScreen'
import BusinessEmployeeEditScreen from './src/screens/business/BusinessEmployeeEditScreen'
import BusinessWorkingHoursScreen from './src/screens/business/BusinessWorkingHoursScreen'
import AdminTabNavigator from './src/navigation/AdminTabNavigator'
import AdminClientDetailScreen from './src/screens/admin/AdminClientDetailScreen'
import AdminBusinessDetailScreen from './src/screens/admin/AdminBusinessDetailScreen'
import BusinessMapScreen from './src/screens/client/BusinessMapScreen'

I18nManager.forceRTL(true)
configureNotificationHandler()

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null)

  // Register push token once authenticated
  useEffect(() => {
    if (isAuthenticated) registerPushToken()
  }, [isAuthenticated])

  // Handle notification tap — navigate to the relevant screen
  useEffect(() => {
    const sub = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>
      if (!data?.screen || !navRef.current) return

      // Small delay to let the navigator mount
      setTimeout(() => {
        const nav = navRef.current
        if (!nav) return
        switch (data.screen) {
          case 'AppointmentsTab':
            nav.navigate('ClientTabs')
            break
          case 'Home':
            nav.navigate('ClientTabs')
            break
          default:
            break
        }
      }, 300)
    })
    return () => sub.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="BusinessRegister" component={BusinessRegisterScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
              <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            </>
          ) : user?.role === 'ADMIN' ? (
            <>
              <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
              <Stack.Screen name="AdminClientDetail" component={AdminClientDetailScreen} />
              <Stack.Screen name="AdminBusinessDetail" component={AdminBusinessDetailScreen} />
            </>
          ) : user?.role === 'BUSINESS' && user?.businessStatus !== 'APPROVED' ? (
            <>
              <Stack.Screen name="BusinessPending" component={BusinessPendingScreen} />
            </>
          ) : user?.role === 'BUSINESS' ? (
            <>
              <Stack.Screen name="BusinessTabs" component={BusinessTabNavigator} />
              <Stack.Screen name="BusinessProfileEdit" component={BusinessProfileEditScreen} />
              <Stack.Screen name="BusinessEmployees" component={BusinessEmployeesScreen} />
              <Stack.Screen name="BusinessEmployeeEdit" component={BusinessEmployeeEditScreen} />
              <Stack.Screen name="BusinessWorkingHours" component={BusinessWorkingHoursScreen} />
              <Stack.Screen name="Conversations" component={ConversationsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="ClientTabs" component={ClientTabNavigator} />
              <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
              <Stack.Screen name="ServiceSelect" component={ServiceSelectScreen} />
              <Stack.Screen name="StylistSelect" component={StylistSelectScreen} />
              <Stack.Screen name="DateTimeSelect" component={DateTimeSelectScreen} />
              <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
              <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
              <Stack.Screen name="RescheduleRequest" component={RescheduleRequestScreen} />
              <Stack.Screen name="Referral" component={ReferralScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="Review" component={ReviewScreen} />
              <Stack.Screen name="BusinessMap" component={BusinessMapScreen} options={{ animation: 'fade' }} />
              <Stack.Screen name="PaymentWallet" component={WalletScreen} />
              <Stack.Screen name="AddCard" component={AddCardScreen} />
              <Stack.Screen name="Conversations" component={ConversationsScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
