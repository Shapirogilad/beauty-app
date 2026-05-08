import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RootStackParamList } from '../../navigation/types'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>

const { width, height } = Dimensions.get('window')

const SERVICES = [
  { emoji: '✂️', label: 'שיער', sub: 'תספורת, צביעה, קרטין' },
  { emoji: '💅', label: 'ציפורניים', sub: 'ג׳ל, אקריל, עיצוב' },
  { emoji: '👁️', label: 'ריסים', sub: 'הארכות, ליפטינג' },
  { emoji: '🌿', label: 'טיפול פנים', sub: 'ניקוי, פילינג, לחות' },
  { emoji: '🌸', label: 'גבות', sub: 'עיצוב, למינציה' },
  { emoji: '💆', label: 'עיסוי', sub: 'שוודי, רפואי' },
]

export default function WelcomeScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<'splash' | 'welcome'>('splash')

  // ── Splash animations ──────────────────────────────────────────────────────
  const logoScale   = useRef(new Animated.Value(0.4)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const subOpacity  = useRef(new Animated.Value(0)).current
  const glowScale   = useRef(new Animated.Value(0.6)).current
  const splashOpacity = useRef(new Animated.Value(1)).current

  // ── Welcome animations ─────────────────────────────────────────────────────
  const welcomeOpacity   = useRef(new Animated.Value(0)).current
  const welcomeTranslate = useRef(new Animated.Value(24)).current
  const card1Opacity = useRef(new Animated.Value(0)).current
  const card2Opacity = useRef(new Animated.Value(0)).current
  const blob1Scale   = useRef(new Animated.Value(0.7)).current
  const blob2Scale   = useRef(new Animated.Value(0.7)).current

  useEffect(() => {
    // 1. Glow expands
    Animated.timing(glowScale, {
      toValue: 1, duration: 900, useNativeDriver: true,
    }).start()

    // 2. Logo appears with spring
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
      ]),
    ]).start()

    // 3. Subtitle fades in
    Animated.sequence([
      Animated.delay(800),
      Animated.timing(subOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start()

    // 4. Transition to welcome screen
    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(splashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setPhase('welcome')
      // Welcome entrance animations
      Animated.parallel([
        Animated.timing(welcomeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(welcomeTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(blob1Scale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.spring(blob2Scale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
      ]).start()

      Animated.sequence([
        Animated.delay(200),
        Animated.timing(card1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start()
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(card2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start()
    })
  }, [])

  // ── Splash ─────────────────────────────────────────────────────────────────
  if (phase === 'splash') {
    return (
      <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
        {/* Background glow blob */}
        <Animated.View style={[
          styles.splashGlow,
          { transform: [{ scale: glowScale }] },
        ]} />

        {/* Decorative dots */}
        <View style={[styles.dot, { top: height * 0.18, left: width * 0.15 }]} />
        <View style={[styles.dot, styles.dotSm, { top: height * 0.28, right: width * 0.18 }]} />
        <View style={[styles.dot, styles.dotSm, { bottom: height * 0.22, left: width * 0.22 }]} />
        <View style={[styles.dot, { bottom: height * 0.3, right: width * 0.12 }]} />

        {/* Logo */}
        <Animated.View style={[
          styles.splashCenter,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <Text style={styles.splashLogo}>דורה</Text>
          <Animated.Text style={[styles.splashTagline, { opacity: subOpacity }]}>
            הטיפוח שלך, בזמן שלך
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    )
  }

  // ── Welcome ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.welcome} edges={['top', 'bottom']}>
      {/* Decorative blobs */}
      <Animated.View style={[styles.blobTopRight, { transform: [{ scale: blob1Scale }] }]} />
      <Animated.View style={[styles.blobBottomLeft, { transform: [{ scale: blob2Scale }] }]} />

      <Animated.View style={[
        styles.welcomeContent,
        { opacity: welcomeOpacity, transform: [{ translateY: welcomeTranslate }] },
      ]}>
        {/* Logo section */}
        <View style={styles.logoSection}>
          <View style={styles.logoPill}>
            <Text style={styles.logoPillText}>✦ דורה ✦</Text>
          </View>
          <Text style={styles.welcomeHeadline}>הטיפוח שלך{'\n'}בזמן שלך</Text>
          <Text style={styles.welcomeSub}>
            הזמיני תור לכל טיפול יופי — בקלות, במהירות, ברגע אחד
          </Text>
        </View>

        {/* Service cards scroll */}
        <Animated.View style={{ opacity: card1Opacity }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
            directionalLockEnabled
          >
            {SERVICES.map((s) => (
              <View key={s.label} style={styles.serviceCard}>
                <Text style={styles.serviceEmoji}>{s.emoji}</Text>
                <Text style={styles.serviceLabel}>{s.label}</Text>
                <Text style={styles.serviceSub}>{s.sub}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[styles.ctas, { opacity: card2Opacity }]}>
          <Button
            label="כניסה / הרשמה ללקוחות"
            onPress={() => navigation.navigate('Register')}
            style={styles.ctaBtn}
          />
          <Button
            label="הצטרפי כבעלת עסק"
            onPress={() => navigation.navigate('BusinessRegister')}
            variant="outline"
            style={styles.ctaBtn}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
            <Text style={styles.loginText}>
              כבר יש לך חשבון?{'  '}
              <Text style={styles.loginBold}>כניסה</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.legal}>
            בהמשך את מאשרת את תנאי השימוש ומדיניות הפרטיות
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  )
}

const SPLASH_BG  = '#4A2840'   // deep plum
const SPLASH_MID = '#7D4E6B'   // primary mauve

const styles = StyleSheet.create({
  // ── Splash ─────────────────────────────────────────────────────
  splash: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashGlow: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: SPLASH_MID,
    opacity: 0.35,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  dotSm: { width: 6, height: 6, borderRadius: 3 },
  splashCenter: { alignItems: 'center', gap: 14 },
  splashLogo: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  splashTagline: {
    fontSize: 17,
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },

  // ── Welcome ────────────────────────────────────────────────────
  welcome: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blobTopRight: {
    position: 'absolute',
    top: -width * 0.25,
    right: -width * 0.2,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: colors.primaryFaint,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -width * 0.15,
    left: -width * 0.15,
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: colors.primaryFaint,
    opacity: 0.7,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 36,
    paddingBottom: 16,
    gap: 0,
  },

  // Logo section
  logoSection: {
    paddingHorizontal: 28,
    gap: 14,
    alignItems: 'flex-start',
  },
  logoPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  logoPillText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  welcomeHeadline: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'left',
    lineHeight: 48,
    letterSpacing: -1,
  },
  welcomeSub: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 22,
  },

  // Service cards
  cardsRow: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    flexDirection: 'row-reverse',
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    width: 110,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceEmoji: { fontSize: 28 },
  serviceLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  serviceSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // CTAs
  ctas: {
    paddingHorizontal: 24,
    gap: 12,
  },
  ctaBtn: { width: '100%' },
  loginRow: { alignItems: 'center', paddingVertical: 2 },
  loginText: { fontSize: 15, color: colors.textSecondary },
  loginBold: { color: colors.primary, fontWeight: '700' },
  legal: {
    fontSize: 11,
    color: colors.placeholder,
    textAlign: 'center',
    lineHeight: 16,
  },
})
