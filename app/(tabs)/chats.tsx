import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
const BRAND_TEAL = '#02AFA8';
const BRAND_NAVY = '#0B3E6B';
const BORDER_COLOR = 'rgba(11, 62, 107, 0.10)';
const SURFACE_COLOR = '#F8FCFD';
const MUTED_TEXT = '#5A7488';
const DANGER_COLOR = '#D75B49';

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
  const { width } = useWindowDimensions();
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

  const previousActiveChatId = useRef<string | null>(null);

  const isWide = width >= 980;
  const isSpeechRecognitionAvailable = speechRecognitionModule !== null;
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <MaterialIcons color={BRAND_TEAL} name="chat-bubble-outline" size={18} />
            <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.headerBadgeText}>
              Conversation médicale
            </ThemedText>
          </View>

          <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.title}>
            Chat
          </ThemedText>
          <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.description}>
            Créez vos conversations, enregistrez la voix et conservez chaque phrase dans le bon chat.
          </ThemedText>
        </View>

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <View style={styles.sideColumn}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.cardTitle}>
                  Nouveau chat
                </ThemedText>
                <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.sectionHint}>
                  Donnez un nom simple
                </ThemedText>
              </View>

              <View style={styles.createRow}>
                <TextInput
                  placeholder="Nom du chat"
                  placeholderTextColor="#89A0B1"
                  value={newChatTitle}
                  onChangeText={setNewChatTitle}
                  style={styles.input}
                />
                <Pressable
                  onPress={createChat}
                  style={({ pressed }) => [styles.smallActionButton, pressed && styles.buttonPressed]}>
                  <MaterialIcons color="#FFFFFF" name="add" size={18} />
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.smallActionButtonText}>
                    Créer
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.chipsWrap}>
                {chats.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.emptyText}>
                      Aucun chat pour le moment.
                    </ThemedText>
                  </View>
                ) : (
                  chats.map((chat) => {
                    const selected = chat.id === activeChatId;

                    return (
                      <Pressable
                        key={chat.id}
                        onPress={() => setActiveChatId(chat.id)}
                        style={[styles.chatChip, selected && styles.chatChipActive]}>
                        <ThemedText
                          lightColor={selected ? '#FFFFFF' : BRAND_NAVY}
                          darkColor={selected ? '#FFFFFF' : BRAND_NAVY}
                          style={styles.chatChipText}>
                          {chat.title}
                        </ThemedText>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.cardTitle}>
                  Enregistrement vocal
                </ThemedText>
                <View style={[styles.statusPill, isListening && styles.statusPillActive]}>
                  <View style={[styles.statusDot, isListening && styles.statusDotActive]} />
                  <ThemedText
                    lightColor={isListening ? BRAND_TEAL : BRAND_NAVY}
                    darkColor={isListening ? BRAND_TEAL : BRAND_NAVY}
                    style={styles.statusText}>
                    {isSpeechRecognitionAvailable
                      ? isListening
                        ? 'En cours'
                        : 'Prêt'
                      : 'Indisponible'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!isSpeechRecognitionAvailable}
                  onPress={startListening}
                  style={({ pressed }) => [
                    styles.button,
                    styles.primaryButton,
                    !isSpeechRecognitionAvailable && styles.buttonDisabled,
                    pressed && isSpeechRecognitionAvailable && styles.buttonPressed,
                  ]}>
                  <MaterialIcons color="#FFFFFF" name="mic" size={18} />
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.buttonTextLight}>
                    Démarrer
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!isSpeechRecognitionAvailable}
                  onPress={stopListening}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    !isSpeechRecognitionAvailable && styles.buttonDisabled,
                    pressed && isSpeechRecognitionAvailable && styles.buttonPressed,
                  ]}>
                  <MaterialIcons color={BRAND_NAVY} name="stop" size={18} />
                  <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.buttonTextDark}>
                    Arrêter
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.feedbackBox}>
                <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.feedbackText}>
                  {feedback}
                </ThemedText>
              </View>

              <View style={styles.transcriptCard}>
                <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.transcriptLabel}>
                  Transcription
                </ThemedText>
                <ThemedText lightColor="#21415D" darkColor="#21415D" style={styles.transcriptText}>
                  {transcript || 'Aucune transcription pour le moment.'}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => addMessageToChat(transcript)}
                disabled={!activeChat || !transcript.trim()}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  (!activeChat || !transcript.trim()) && styles.buttonDisabled,
                  pressed && activeChat && transcript.trim() && styles.buttonPressed,
                ]}>
                <MaterialIcons color="#FFFFFF" name="south-east" size={18} />
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.buttonTextLight}>
                  Ajouter au chat
                </ThemedText>
              </Pressable>

              {!isSpeechRecognitionAvailable ? (
                <View style={styles.helpCard}>
                  <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.helpTitle}>
                    Comment l&apos;activer
                  </ThemedText>
                  <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.helpText}>
                    Ce package demande un development build natif après ajout du plugin.
                  </ThemedText>
                  <ThemedText lightColor={BRAND_TEAL} darkColor={BRAND_TEAL} style={styles.helpCommand}>
                    npx expo run:ios
                  </ThemedText>
                  <ThemedText lightColor={BRAND_TEAL} darkColor={BRAND_TEAL} style={styles.helpCommand}>
                    npx expo run:android
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.mainColumn}>
            <View style={[styles.card, styles.chatCard]}>
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderCopy}>
                  <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.cardTitle}>
                    Chat actif
                  </ThemedText>
                  <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.activeChatTitle}>
                    {activeChat ? activeChat.title : 'Aucun chat sélectionné'}
                  </ThemedText>
                </View>

                {activeChat ? (
                  <View style={styles.actionStack}>
                    {isRenamingChat ? (
                      <>
                        <Pressable
                          onPress={renameActiveChat}
                          style={({ pressed }) => [styles.ghostButton, styles.ghostButtonFilled, pressed && styles.buttonPressed]}>
                          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.ghostButtonTextLight}>
                            Enregistrer
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={cancelRenamingChat}
                          style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]}>
                          <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.ghostButtonTextDark}>
                            Annuler
                          </ThemedText>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          onPress={startRenamingChat}
                          style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]}>
                          <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.ghostButtonTextDark}>
                            Renommer
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={deleteActiveChat}
                          style={({ pressed }) => [styles.ghostButton, styles.ghostButtonDanger, pressed && styles.buttonPressed]}>
                          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.ghostButtonTextLight}>
                            Supprimer
                          </ThemedText>
                        </Pressable>
                      </>
                    )}
                  </View>
                ) : null}
              </View>

              {isRenamingChat ? (
                <TextInput
                  placeholder="Nouveau nom du chat"
                  placeholderTextColor="#89A0B1"
                  value={editedChatTitle}
                  onChangeText={setEditedChatTitle}
                  style={styles.input}
                />
              ) : null}

              {activeChat ? (
                <View style={styles.messagesBox}>
                  {activeChat.messages.length === 0 ? (
                    <View style={styles.emptyStateLarge}>
                      <MaterialIcons color={BRAND_TEAL} name="chat-bubble-outline" size={28} />
                      <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.emptyStateTitle}>
                        Aucun message
                      </ThemedText>
                      <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.emptyStateText}>
                        Lancez un enregistrement vocal ou ajoutez une transcription à cette conversation.
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.messagesList}>
                      {activeChat.messages.map((item) => (
                        <View key={item.id} style={styles.messageBubble}>
                          <ThemedText lightColor="#183854" darkColor="#183854" style={styles.messageText}>
                            {item.text}
                          </ThemedText>
                          <ThemedText lightColor="#7A90A2" darkColor="#7A90A2" style={styles.messageTime}>
                            {new Date(item.createdAt).toLocaleTimeString()}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyStateLarge}>
                  <MaterialIcons color={BRAND_TEAL} name="forum" size={28} />
                  <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.emptyStateTitle}>
                    Sélectionnez un chat
                  </ThemedText>
                  <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.emptyStateText}>
                    Choisissez un chat existant ou créez-en un nouveau pour commencer.
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  page: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: 24,
  },
  header: {
    alignItems: 'flex-start',
    gap: 10,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 175, 168, 0.10)',
  },
  headerBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontFamily: Fonts.extraBold,
  },
  description: {
    maxWidth: 720,
    fontSize: 17,
    lineHeight: 28,
    fontFamily: Fonts.regular,
  },
  grid: {
    gap: 20,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sideColumn: {
    flex: 0.95,
    gap: 20,
  },
  mainColumn: {
    flex: 1.15,
    gap: 20,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 16,
    backgroundColor: SURFACE_COLOR,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chatCard: {
    minHeight: 440,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Fonts.bold,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.medium,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: BRAND_NAVY,
    fontFamily: Fonts.regular,
  },
  smallActionButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: BRAND_TEAL,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  smallActionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chatChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chatChipActive: {
    backgroundColor: BRAND_TEAL,
    borderColor: BRAND_TEAL,
  },
  chatChipText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  emptyBox: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 62, 107, 0.06)',
  },
  statusPillActive: {
    backgroundColor: 'rgba(2, 175, 168, 0.12)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: BRAND_NAVY,
  },
  statusDotActive: {
    backgroundColor: BRAND_TEAL,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: BRAND_TEAL,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  buttonTextLight: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  buttonTextDark: {
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  feedbackBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(11, 62, 107, 0.04)',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.medium,
  },
  transcriptCard: {
    borderRadius: 22,
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  transcriptLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 25,
    fontFamily: Fonts.regular,
    minHeight: 48,
  },
  helpCard: {
    borderRadius: 20,
    padding: 16,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  helpTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.bold,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
  },
  helpCommand: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.mono,
  },
  chatHeader: {
    gap: 14,
  },
  chatHeaderCopy: {
    gap: 4,
  },
  activeChatTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.medium,
  },
  actionStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ghostButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButtonFilled: {
    backgroundColor: BRAND_TEAL,
    borderColor: BRAND_TEAL,
  },
  ghostButtonDanger: {
    backgroundColor: DANGER_COLOR,
    borderColor: DANGER_COLOR,
  },
  ghostButtonTextLight: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  ghostButtonTextDark: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  messagesBox: {
    flex: 1,
  },
  messagesList: {
    gap: 12,
  },
  messageBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(2, 175, 168, 0.18)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
  },
  messageTime: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.medium,
  },
  emptyStateLarge: {
    flex: 1,
    minHeight: 260,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 420,
  },
});
