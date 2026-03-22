import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type SpeechRecognitionPackage = typeof import('expo-speech-recognition');

const speechRecognitionPackage = (() => {
  try {
    // This dynamic import keeps the route loadable when the native module is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition') as SpeechRecognitionPackage;
  } catch {
    return null;
  }
})();

const speechRecognitionModule = speechRecognitionPackage?.ExpoSpeechRecognitionModule ?? null;

export default function HomeScreen() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState(
    speechRecognitionModule
      ? ''
      : "Le module natif de reconnaissance vocale n'est pas disponible dans ce build."
  );

  useEffect(() => {
    if (!speechRecognitionModule) {
      return;
    }

    const subscriptions = [
      speechRecognitionModule.addListener('start', () => {
        setIsListening(true);
        setFeedback('');
      }),
      speechRecognitionModule.addListener('end', () => {
        setIsListening(false);
      }),
      speechRecognitionModule.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
        const latestResult = event.results[event.results.length - 1];
        setTranscript(latestResult?.transcript ?? '');
      }),
      speechRecognitionModule.addListener('error', () => {
        setIsListening(false);
        setFeedback("La reconnaissance vocale a rencontre une erreur.");
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => {
        subscription.remove();
      });
    };
  }, []);

  const startListening = async () => {
    if (!speechRecognitionModule) {
      return;
    }

    const permission = await speechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setFeedback('Les permissions micro et reconnaissance vocale sont necessaires.');
      return;
    }

    setTranscript('');
    setFeedback('');
    speechRecognitionModule.start({ lang: 'fr-FR', continuous: true });
  };

  const stopListening = () => {
    if (!speechRecognitionModule) {
      return;
    }

    speechRecognitionModule.stop();
    setIsListening(false);
  };

  const isSpeechRecognitionAvailable = speechRecognitionModule !== null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#EEF6F4', dark: '#1F2A28' }}
      headerImage={
        <ThemedView lightColor="#D8ECE5" darkColor="#2B3A35" style={styles.headerBadge}>
          <ThemedText style={styles.headerText}>MIC</ThemedText>
        </ThemedView>
      }>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Accueil
        </ThemedText>
        <ThemedText style={styles.description}>
          Lance l&apos;ecoute vocale et consulte la transcription en direct.
        </ThemedText>

        <ThemedView lightColor="#F8FCFA" darkColor="#202622" style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Etat du micro
          </ThemedText>
          <ThemedText style={styles.statusText}>
            {isSpeechRecognitionAvailable
              ? isListening
                ? 'Ecoute en cours'
                : 'Pret'
              : 'Module natif indisponible'}
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={!isSpeechRecognitionAvailable}
              onPress={startListening}
              style={({ pressed }) => [
                styles.button,
                styles.buttonPrimary,
                !isSpeechRecognitionAvailable && styles.buttonDisabled,
                pressed && isSpeechRecognitionAvailable && styles.buttonPressed,
              ]}>
              <ThemedText style={styles.buttonTextLight}>Demarrer</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!isSpeechRecognitionAvailable}
              onPress={stopListening}
              style={({ pressed }) => [
                styles.button,
                styles.buttonSecondary,
                !isSpeechRecognitionAvailable && styles.buttonDisabled,
                pressed && isSpeechRecognitionAvailable && styles.buttonPressed,
              ]}>
              <ThemedText style={styles.buttonTextDark}>Arreter</ThemedText>
            </Pressable>
          </View>

          {feedback ? <ThemedText style={styles.feedbackText}>{feedback}</ThemedText> : null}
        </ThemedView>

        <ThemedView lightColor="#F8FCFA" darkColor="#02afa8" style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Transcription
          </ThemedText>
          <ThemedText style={styles.transcriptText}>
            {transcript || 'Aucune transcription pour le moment.'}
          </ThemedText>
        </ThemedView>

        {!isSpeechRecognitionAvailable ? (
          <ThemedView lightColor="#F8FCFA" darkColor="#202622" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Comment l&apos;activer
            </ThemedText>
            <ThemedText style={styles.helpText}>
              Ce package demande un development build natif apres ajout du plugin.
            </ThemedText>
            <ThemedText style={styles.helpCommand}>npx expo run:ios</ThemedText>
            <ThemedText style={styles.helpCommand}>npx expo run:android</ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerBadge: {
    width: 180,
    height: 180,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 36,
    transform: [{ rotate: '-8deg' }],
  },
  headerText: {
    fontSize: 38,
    fontFamily: Fonts.extraBold,
    letterSpacing: 3,
    color: '#12362B',
  },
  content: {
    gap: 18,
  },
  title: {
    textAlign: 'center',
    fontFamily: Fonts.extraBold,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
  },
  statusText: {
    fontFamily: Fonts.bold,
    color: '#236B56',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#236B56',
  },
  buttonSecondary: {
    backgroundColor: '#E4EFEA',
    borderWidth: 1,
    borderColor: '#C9DDD5',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonTextLight: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
  },
  buttonTextDark: {
    color: '#12362B',
    fontFamily: Fonts.bold,
  },
  feedbackText: {
    color: '#7A3E00',
    lineHeight: 22,
  },
  transcriptText: {
    lineHeight: 24,
    minHeight: 48,
  },
  helpText: {
    lineHeight: 22,
  },
  helpCommand: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    lineHeight: 22,
  },
});
