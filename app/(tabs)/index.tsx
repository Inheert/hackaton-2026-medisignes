import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

const BRAND_TEAL = '#02AFA8';
const BRAND_NAVY = '#0B3E6B';
const HOME_MESSAGE =
  'Medisignes, votre application de LSF médical pour que les personnes sourdes et malentendantes puissent communiquer afin d’être autonomes dans leur parcours de santé';
const HOME_LOGO = require('../../assets/images/logo.png');

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;
  const logoWidth = Math.min(width - 48, 420);
  const logoHeight = (logoWidth * 247) / 533;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.logoArea}>
        <Image
          source={HOME_LOGO}
          resizeMode="contain"
          style={[styles.logoImage, { width: logoWidth, height: logoHeight }]}
        />
      </View>

      <View style={styles.hero}>
        <ThemedText lightColor="#294B67" darkColor="#294B67" style={styles.message}>
          {HOME_MESSAGE}
        </ThemedText>

        <View style={[styles.actions, isTablet && styles.actionsRow]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/chats')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <MaterialIcons color="#FFFFFF" name="chat-bubble-outline" size={20} />
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.primaryButtonText}>
              Aller au chat
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/tla')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <MaterialIcons color={BRAND_NAVY} name="north-east" size={20} />
            <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.secondaryButtonText}>
              Ouvrir le guide TLA
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  logoArea: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    maxWidth: '100%',
  },
  hero: {
    width: '100%',
    maxWidth: 760,
    alignItems: 'center',
    gap: 18,
  },
  message: {
    fontSize: 20,
    lineHeight: 32,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  primaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: BRAND_TEAL,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(11, 62, 107, 0.14)',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
