import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

type SpeechRecognitionPackage = typeof import('expo-speech-recognition');

type ChatMessage = {
  id: string;
  text: string;
  createdAt: number;
};

type ChatRoom = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

const CHAT_STORAGE_KEY = 'chats:v1';
const ACTIVE_CHAT_STORAGE_KEY = 'chats:activeChatId:v1';

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

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [editedChatTitle, setEditedChatTitle] = useState('');
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState(
    speechRecognitionModule
      ? 'Appuyez sur Démarrer pour parler.'
      : "Le module natif de reconnaissance vocale n'est pas disponible dans ce build."
  );

  const themeTextColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const bubbleColor = useThemeColor({ light: '#E4EFEA', dark: '#2B3A35' }, 'background');
  const transcriptBox = useThemeColor({ light: '#FFFFFF', dark: '#1F2824' }, 'background');
  const previousActiveChatId = useRef<string | null>(null);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) ?? null, [chats, activeChatId]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [storedChats, storedActiveChatId] = await Promise.all([
          AsyncStorage.getItem(CHAT_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_CHAT_STORAGE_KEY),
        ]);

        if (!isMounted) {
          return;
        }

        if (storedChats) {
          const parsed = JSON.parse(storedChats) as ChatRoom[];
          if (Array.isArray(parsed)) {
            setChats(parsed);
          }
        }

        if (storedActiveChatId) {
          setActiveChatId(storedActiveChatId);
        }
      } catch {
        if (isMounted) {
          setFeedback("Impossible de restaurer les chats sauvegardés.");
        }
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persist = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats)),
          activeChatId
            ? AsyncStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId)
            : AsyncStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY),
        ]);
      } catch {
        // Best-effort persistence: ignore write failures.
      }
    };

    persist();
  }, [activeChatId, chats, hasHydrated]);

  useEffect(() => {
    if (!speechRecognitionModule) {
      return;
    }

    const subscriptions = [
      speechRecognitionModule.addListener('start', () => {
        setIsListening(true);
        setFeedback('Enregistrement en cours...');
      }),
      speechRecognitionModule.addListener('end', () => {
        setIsListening(false);
        setFeedback('Enregistrement terminé. Cliquez sur Ajouter au chat si vous voulez conserver le message.');
      }),
      speechRecognitionModule.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
        const latestResult = event.results[event.results.length - 1];
        setTranscript(latestResult?.transcript ?? '');
      }),
      speechRecognitionModule.addListener('error', () => {
        setIsListening(false);
        setFeedback('La reconnaissance vocale a rencontré une erreur.');
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => {
        subscription.remove();
      });
    };
  }, []);

  useEffect(() => {
    if (previousActiveChatId.current === activeChatId) {
      return;
    }

    previousActiveChatId.current = activeChatId;
    setIsRenamingChat(false);
    setEditedChatTitle(chats.find((chat) => chat.id === activeChatId)?.title ?? '');
  }, [activeChatId, chats]);

  const createChat = () => {
    const title = newChatTitle.trim();
    if (!title) {
      setFeedback('Donnez un nom à votre chat.');
      return;
    }

    const nextChat: ChatRoom = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title,
      messages: [],
    };

    setChats((prev) => [...prev, nextChat]);
    setActiveChatId(nextChat.id);
    setNewChatTitle('');
    setFeedback(`Chat '${title}' créé.`);
  };

  const addMessageToChat = (text: string) => {
    if (!activeChatId) {
      setFeedback('Sélectionnez un chat pour ajouter la transcription.');
      return;
    }

    const normalized = text.trim();
    if (!normalized) {
      setFeedback('Aucun texte reconnu à enregistrer.');
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id !== activeChatId
          ? chat
          : {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                  text: normalized,
                  createdAt: Date.now(),
                },
              ],
            }
      )
    );

    setFeedback('Message ajouté au chat.');
    setTranscript('');
  };

  const startRenamingChat = () => {
    if (!activeChat) {
      setFeedback('Sélectionnez un chat à renommer.');
      return;
    }

    setEditedChatTitle(activeChat.title);
    setIsRenamingChat(true);
    setFeedback(`Renommez le chat '${activeChat.title}'.`);
  };

  const cancelRenamingChat = () => {
    setEditedChatTitle(activeChat?.title ?? '');
    setIsRenamingChat(false);
    setFeedback('Renommage annulé.');
  };

  const renameActiveChat = () => {
    if (!activeChatId || !activeChat) {
      setFeedback('Sélectionnez un chat à renommer.');
      return;
    }

    const normalized = editedChatTitle.trim();
    if (!normalized) {
      setFeedback('Le nom du chat ne peut pas être vide.');
      return;
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id !== activeChatId
          ? chat
          : {
              ...chat,
              title: normalized,
            }
      )
    );

    setEditedChatTitle(normalized);
    setIsRenamingChat(false);
    setFeedback(`Chat renommé en '${normalized}'.`);
  };

  const deleteActiveChat = () => {
    if (!activeChat) {
      setFeedback('Sélectionnez un chat à supprimer.');
      return;
    }

    Alert.alert(
      'Supprimer le chat',
      `Voulez-vous vraiment supprimer '${activeChat.title}' ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const deletedIndex = chats.findIndex((chat) => chat.id === activeChat.id);
            const nextChats = chats.filter((chat) => chat.id !== activeChat.id);
            const nextActiveChat =
              nextChats[deletedIndex] ??
              nextChats[Math.max(0, deletedIndex - 1)] ??
              null;

            setChats(nextChats);
            setActiveChatId(nextActiveChat?.id ?? null);
            setEditedChatTitle(nextActiveChat?.title ?? '');
            setIsRenamingChat(false);
            setTranscript('');
            setFeedback(`Chat '${activeChat.title}' supprimé.`);
          },
        },
      ]
    );
  };

  const startListening = async () => {
    if (!speechRecognitionModule) {
      return;
    }

    const permission = await speechRecognitionModule.requestPermissionsAsync();

    if (!permission.granted) {
      setFeedback('Les permissions micro et reconnaissance vocale sont nécessaires.');
      return;
    }

    if (!activeChatId) {
      setFeedback('Sélectionnez ou créez un chat avant de démarrer.');
      return;
    }

    setTranscript('');
    setFeedback('Écoute démarrée...');
    speechRecognitionModule.start({ lang: 'fr-FR', continuous: true });
  };

  const stopListening = () => {
    if (!speechRecognitionModule) {
      return;
    }

    speechRecognitionModule.stop();
    setIsListening(false);

    if (transcript.trim() && activeChat && activeChat.id === activeChatId) {
      addMessageToChat(transcript);
    }
  };

  const isSpeechRecognitionAvailable = speechRecognitionModule !== null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#EEF6F4', dark: '#1F2A28' }}
      headerImage={
        <ThemedView lightColor="#D8ECE5" darkColor="#2B3A35" style={styles.headerBadge}>
          <ThemedText style={styles.headerText}>CHATS</ThemedText>
        </ThemedView>
      }>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Chats
        </ThemedText>
        <ThemedText style={styles.description}>
          Créez plusieurs conversations, enregistrez votre voix et affichez la transcription dans chaque chat.
        </ThemedText>

        <ThemedView style={styles.card} lightColor="#F8FCFA" darkColor="#202622">
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Nouveau chat
          </ThemedText>

          <View style={styles.row}>
            <TextInput
              placeholder="Nom du chat"
              placeholderTextColor="#8E9990"
              value={newChatTitle}
              onChangeText={setNewChatTitle}
              style={styles.input}
            />
            <Pressable
              onPress={createChat}
              style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}>
              <ThemedText style={styles.buttonTextDark}>Créer</ThemedText>
            </Pressable>
          </View>

          <View style={[styles.row, styles.wrap]}>
            {chats.length === 0 ? (
              <ThemedText>Aucun chat, commencez par en créer un.</ThemedText>
            ) : (
              chats.map((chat) => {
                const selected = chat.id === activeChatId;
                return (
                  <Pressable
                    key={chat.id}
                    onPress={() => setActiveChatId(chat.id)}
                    style={[
                      styles.chatChip,
                      selected && styles.chatChipActive,
                    ]}>
                    <ThemedText
                      style={[
                        styles.chatChipText,
                        selected && { color: '#FFFFFF' },
                      ]}>
                      {chat.title}
                    </ThemedText>
                  </Pressable>
                );
              })
            )}
          </View>
        </ThemedView>

        <ThemedView style={styles.card} lightColor="#F8FCFA" darkColor="#202622">
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Chat actif
          </ThemedText>
          <ThemedText style={styles.subTitle}>{activeChat ? activeChat.title : 'Aucun chat sélectionné'}</ThemedText>

          {activeChat ? (
            <>
              {isRenamingChat ? (
                <>
                  <TextInput
                    placeholder="Nouveau nom du chat"
                    placeholderTextColor="#8E9990"
                    value={editedChatTitle}
                    onChangeText={setEditedChatTitle}
                    style={styles.input}
                  />

                  <View style={styles.actions}>
                    <Pressable
                      onPress={renameActiveChat}
                      style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.buttonPressed]}>
                      <ThemedText style={styles.buttonTextLight}>Enregistrer</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={cancelRenamingChat}
                      style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.buttonPressed]}>
                      <ThemedText style={styles.buttonTextDark}>Annuler</ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    onPress={startRenamingChat}
                    style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.buttonPressed]}>
                    <ThemedText style={styles.buttonTextDark}>Renommer</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={deleteActiveChat}
                    style={({ pressed }) => [styles.button, styles.buttonDanger, pressed && styles.buttonPressed]}>
                    <ThemedText style={styles.buttonTextLight}>Supprimer</ThemedText>
                  </Pressable>
                </View>
              )}

              <View style={styles.messagesBox}>
                {activeChat.messages.length === 0 ? (
                  <ThemedText>Aucun message pour l&apos;instant.</ThemedText>
                ) : (
                  <View style={styles.messagesList}>
                    {activeChat.messages.map((item) => (
                      <View key={item.id} style={[styles.messageBubble, { backgroundColor: bubbleColor }]}>
                        <ThemedText style={[styles.messageText, { color: themeTextColor }]}>{item.text}</ThemedText>
                        <ThemedText style={styles.messageTime}>
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.card} lightColor="#F8FCFA" darkColor="#202622">
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Enregistrement vocal
          </ThemedText>
          <ThemedText style={styles.statusText}>
            {isSpeechRecognitionAvailable
              ? isListening
                ? 'Enregistrement...' : 'Prêt à enregistrer'
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
              <ThemedText style={styles.buttonTextLight}>Démarrer</ThemedText>
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
              <ThemedText style={styles.buttonTextDark}>Arrêter</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.feedbackText}>{feedback}</ThemedText>

          <ThemedView style={[styles.transcriptBox, { backgroundColor: transcriptBox }]}> 
            <ThemedText style={styles.transcriptText}>{transcript || 'Aucune transcription...'}</ThemedText>
          </ThemedView>

          <Pressable
            onPress={() => addMessageToChat(transcript)}
            disabled={!activeChat || !transcript.trim()}
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              (!activeChat || !transcript.trim()) && styles.buttonDisabled,
              pressed && activeChat && transcript.trim() && styles.buttonPressed,
            ]}>
            <ThemedText style={styles.buttonTextLight}>Ajouter au chat</ThemedText>
          </Pressable>
        </ThemedView>

        {!isSpeechRecognitionAvailable ? (
          <ThemedView lightColor="#F8FCFA" darkColor="#202622" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Comment l&apos;activer
            </ThemedText>
            <ThemedText style={styles.helpText}>
              Ce package demande un development build natif après ajout du plugin.
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#12362B',
  },
  content: {
    gap: 18,
  },
  title: {
    textAlign: 'center',
    fontFamily: Fonts.rounded,
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
    fontFamily: Fonts.rounded,
  },
  subTitle: {
    fontWeight: '700',
    color: '#2D7B5C',
  },
  statusText: {
    fontWeight: '700',
    color: '#236B56',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C9DDD5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#12362B',
    backgroundColor: '#FFFFFF',
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#E4EFEA',
  },
  buttonPrimary: {
    backgroundColor: '#236B56',
  },
  buttonSecondary: {
    backgroundColor: '#E4EFEA',
    borderWidth: 1,
    borderColor: '#C9DDD5',
  },
  buttonDanger: {
    backgroundColor: '#B8402D',
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
    fontWeight: '700',
  },
  buttonTextDark: {
    color: '#12362B',
    fontWeight: '700',
  },
  feedbackText: {
    color: '#7A3E00',
    lineHeight: 22,
  },
  transcriptText: {
    lineHeight: 24,
    minHeight: 48,
  },
  transcriptBox: {
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#C9DDD5',
  },
  messagesBox: {
    gap: 6,
  },
  messagesList: {
    gap: 6,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 12,
  },
  messageText: {
    lineHeight: 22,
  },
  messageTime: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7A6A',
  },
  chatChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#C9DDD5',
  },
  chatChipActive: {
    backgroundColor: '#236B56',
    borderColor: '#236B56',
  },
  chatChipText: {
    color: '#12362B',
  },
});
