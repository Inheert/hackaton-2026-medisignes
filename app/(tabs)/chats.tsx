import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { createChatId, loadPersistedChatState, persistChatState, type ChatRoom } from '@/chat-store';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

type SpeechRecognitionPackage = typeof import('expo-speech-recognition');

const BRAND_TEAL = '#02AFA8';
const BRAND_NAVY = '#0B3E6B';
const BORDER_COLOR = 'rgba(11, 62, 107, 0.10)';
const MUTED_TEXT = '#6F7D8D';
const DANGER_COLOR = '#D75B49';
const BUBBLE_BG = '#D9D9DC';
const COMPOSER_BG = '#E3E7ED';

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
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [editedChatTitle, setEditedChatTitle] = useState('');
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState(
    speechRecognitionModule
      ? 'Appuyez sur le micro pour parler.'
      : "Le module natif de reconnaissance vocale n'est pas disponible dans ce build."
  );

  const previousActiveChatId = useRef<string | null>(null);

  const isDesktop = width >= 900;
  const isCompact = width < 480;
  const managerPanelMaxHeight = isDesktop
    ? Math.max(240, Math.min(height * 0.34, 360))
    : Math.max(210, Math.min(height * 0.30, 290));
  const isSpeechRecognitionAvailable = speechRecognitionModule !== null;
  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) ?? null, [chats, activeChatId]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const { chats: storedChats, activeChatId: storedActiveChatId } = await loadPersistedChatState();

        if (!isMounted) {
          return;
        }

        setChats(storedChats);
        setActiveChatId(storedActiveChatId);
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

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isFocused) {
      return;
    }

    const refreshFromStorage = async () => {
      try {
        const { chats: storedChats, activeChatId: storedActiveChatId } = await loadPersistedChatState();
        setChats(storedChats);
        setActiveChatId(storedActiveChatId);
      } catch {
        setFeedback("Impossible de restaurer les chats sauvegardés.");
      }
    };

    void refreshFromStorage();
  }, [hasHydrated, isFocused]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persist = async () => {
      try {
        await persistChatState(chats, activeChatId);
      } catch {
        // Best-effort persistence: ignore write failures.
      }
    };

    void persist();
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
        setFeedback('Enregistrement terminé.');
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
      id: createChatId(),
      title,
      messages: [],
    };

    setChats((prev) => [...prev, nextChat]);
    setActiveChatId(nextChat.id);
    setNewChatTitle('');
    setFeedback(`Chat '${title}' créé.`);
  };

  const appendMessageToChat = (text: string) => {
    if (!activeChatId) {
      setFeedback('Sélectionnez un chat pour ajouter un message.');
      return false;
    }

    const normalized = text.trim();
    if (!normalized) {
      return false;
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
                  id: createChatId(),
                  text: normalized,
                  createdAt: Date.now(),
                },
              ],
            }
      )
    );

    return true;
  };

  const addMessageToChat = (text: string) => {
    const normalized = text.trim();

    if (!normalized) {
      setFeedback('Aucun texte reconnu à enregistrer.');
      return;
    }

    if (appendMessageToChat(normalized)) {
      setFeedback('Message ajouté au chat.');
      setTranscript('');
    }
  };

  const sendDraftMessage = () => {
    const normalized = draftMessage.trim();

    if (!normalized) {
      setFeedback('Écrivez un message.');
      return;
    }

    if (appendMessageToChat(normalized)) {
      setDraftMessage('');
      setFeedback('Message envoyé.');
    }
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
            setDraftMessage('');
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

  const handleMicroPress = () => {
    if (isListening) {
      stopListening();
      return;
    }

    void startListening();
  };

  const handleCameraPress = () => {
    Alert.alert('Caméra', "L'ajout d'image sera disponible bientôt.");
  };

  const renderEmptyBubble = (title: string, description: string) => (
    <View style={styles.messageBlock}>
      <View style={styles.messageBubble}>
        <ThemedText lightColor="#111111" darkColor="#111111" style={styles.messageText}>
          {title}
          {'\n'}
          {description}
        </ThemedText>
        <View style={styles.messageTail} />
      </View>
      <ThemedText lightColor="#8A8F97" darkColor="#8A8F97" style={styles.messageMeta}>
        Message automatique
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <MaterialIcons color="#FFFFFF" name="chat-bubble-outline" size={20} />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.headerTitle}>
              Conversation
            </ThemedText>
            <ThemedText lightColor="#D5E4F2" darkColor="#D5E4F2" style={styles.headerSubtitle}>
              {activeChat ? activeChat.title : 'Choisissez un chat'}
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={[styles.managerCard, { maxHeight: managerPanelMaxHeight }]}>
          <ScrollView
            style={styles.managerScroll}
            contentContainerStyle={styles.managerScrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.managerSection}>
            <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.sectionTitle}>
              Nouveau chat
            </ThemedText>
            <View style={[styles.createRow, isCompact && styles.stackRow]}>
              <TextInput
                placeholder="Nom du chat"
                placeholderTextColor="#8C99A7"
                value={newChatTitle}
                onChangeText={setNewChatTitle}
                style={[styles.topInput, isCompact && styles.fullWidthInput]}
              />
              <Pressable
                onPress={createChat}
                style={({ pressed }) => [
                  styles.createButton,
                  isCompact && styles.fullWidthButton,
                  pressed && styles.buttonPressed,
                ]}>
                <MaterialIcons color="#FFFFFF" name="add" size={18} />
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.createButtonText}>
                  Créer
                </ThemedText>
              </Pressable>
            </View>
            </View>

            {isRenamingChat ? (
              <View style={styles.managerSection}>
              <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.sectionTitle}>
                Renommer le chat
              </ThemedText>
              <View style={[styles.renameRow, isCompact && styles.stackRow]}>
                <TextInput
                  placeholder="Nouveau nom du chat"
                  placeholderTextColor="#8C99A7"
                  value={editedChatTitle}
                  onChangeText={setEditedChatTitle}
                  style={[styles.topInput, isCompact && styles.fullWidthInput]}
                />
                <View style={[styles.renameActions, isCompact && styles.fullWidthActions]}>
                  <Pressable
                    onPress={renameActiveChat}
                    style={({ pressed }) => [
                      styles.iconGhostButton,
                      styles.iconGhostButtonFilled,
                      isCompact && styles.flexButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <MaterialIcons color="#FFFFFF" name="check" size={18} />
                  </Pressable>
                  <Pressable
                    onPress={cancelRenamingChat}
                    style={({ pressed }) => [
                      styles.iconGhostButton,
                      isCompact && styles.flexButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <MaterialIcons color={BRAND_NAVY} name="close" size={18} />
                  </Pressable>
                </View>
              </View>
              </View>
            ) : null}

            <View style={styles.managerSection}>
            <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.sectionTitle}>
              Vos chats
            </ThemedText>
            {chats.length === 0 ? (
              <View style={styles.emptyChip}>
                <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.emptyChipText}>
                  Aucun chat pour le moment
                </ThemedText>
              </View>
            ) : (
              <View style={styles.chipsWrap}>
                {chats.map((chat) => {
                  const selected = chat.id === activeChatId;

                  return (
                    <Pressable
                      key={chat.id}
                      onPress={() => setActiveChatId(chat.id)}
                      style={[styles.chatChip, selected && styles.chatChipActive]}>
                      <ThemedText
                        numberOfLines={1}
                        lightColor={selected ? '#FFFFFF' : BRAND_NAVY}
                        darkColor={selected ? '#FFFFFF' : BRAND_NAVY}
                        style={styles.chatChipText}>
                        {chat.title}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
            </View>

            {activeChat && !isRenamingChat ? (
              <View style={styles.managerSection}>
              <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.sectionTitle}>
                Gérer le chat
              </ThemedText>
              <View style={[styles.manageActions, isCompact && styles.stackRow]}>
                <Pressable
                  onPress={startRenamingChat}
                  style={({ pressed }) => [
                    styles.manageButton,
                    isCompact && styles.fullWidthButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.manageButtonText}>
                    Renommer
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={deleteActiveChat}
                  style={({ pressed }) => [
                    styles.manageButton,
                    styles.manageButtonDanger,
                    isCompact && styles.fullWidthButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.manageButtonTextLight}>
                    Supprimer
                  </ThemedText>
                </Pressable>
              </View>
              </View>
            ) : null}

            <View style={styles.feedbackRow}>
              <View style={[styles.feedbackDot, isListening && styles.feedbackDotActive]} />
              <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.feedbackText}>
                {feedback}
              </ThemedText>
            </View>

            {!isSpeechRecognitionAvailable ? (
              <View style={styles.helpBox}>
                <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.helpTitle}>
                  Activer la voix
                </ThemedText>
                <ThemedText lightColor={MUTED_TEXT} darkColor={MUTED_TEXT} style={styles.helpText}>
                  Ce module demande un development build natif.
                </ThemedText>
                <ThemedText lightColor={BRAND_TEAL} darkColor={BRAND_TEAL} style={styles.helpCommand}>
                  npx expo run:ios
                </ThemedText>
                <ThemedText lightColor={BRAND_TEAL} darkColor={BRAND_TEAL} style={styles.helpCommand}>
                  npx expo run:android
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.conversationCard}>
          <ScrollView
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}>
            {!activeChat
              ? renderEmptyBubble(
                  'Aucun chat sélectionné.',
                  'Créez un chat ou choisissez-en un pour commencer la conversation.'
                )
              : activeChat.messages.length === 0
                ? renderEmptyBubble(
                    'Bonjour,',
                    'utilisez le micro ou écrivez un message pour démarrer cette conversation.'
                  )
                : activeChat.messages.map((item) => (
                    <View key={item.id} style={styles.messageBlock}>
                      <View style={styles.messageBubble}>
                        <ThemedText lightColor="#111111" darkColor="#111111" style={styles.messageText}>
                          {item.text}
                        </ThemedText>
                        <View style={styles.messageTail} />
                      </View>
                      <ThemedText lightColor="#8A8F97" darkColor="#8A8F97" style={styles.messageMeta}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </ThemedText>
                    </View>
                  ))}
          </ScrollView>
        </View>

        {transcript ? (
          <View style={styles.transcriptBanner}>
            <View style={styles.transcriptCopy}>
              <ThemedText lightColor={BRAND_NAVY} darkColor={BRAND_NAVY} style={styles.transcriptTitle}>
                Transcription vocale
              </ThemedText>
              <ThemedText lightColor="#304B64" darkColor="#304B64" style={styles.transcriptBody}>
                {transcript}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => addMessageToChat(transcript)}
              disabled={!activeChat || !transcript.trim()}
              style={({ pressed }) => [
                styles.transcriptAction,
                (!activeChat || !transcript.trim()) && styles.transcriptActionDisabled,
                pressed && activeChat && transcript.trim() && styles.buttonPressed,
              ]}>
              <MaterialIcons color="#FFFFFF" name="south-east" size={18} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composerBar}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCameraPress}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.buttonPressed]}>
            <MaterialIcons color="#FFFFFF" name="photo-camera" size={22} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!isSpeechRecognitionAvailable}
            onPress={handleMicroPress}
            style={({ pressed }) => [
              styles.micButton,
              isListening && styles.micButtonActive,
              !isSpeechRecognitionAvailable && styles.composerButtonDisabled,
              pressed && isSpeechRecognitionAvailable && styles.buttonPressed,
            ]}>
            <MaterialIcons color="#FFFFFF" name={isListening ? 'stop' : 'mic'} size={22} />
          </Pressable>

          <TextInput
            placeholder={activeChat ? 'Votre message ...' : 'Sélectionnez un chat ...'}
            placeholderTextColor="#7F8894"
            value={draftMessage}
            onChangeText={setDraftMessage}
            editable={!!activeChat}
            returnKeyType="send"
            onSubmitEditing={sendDraftMessage}
            style={styles.composerInput}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!activeChat || !draftMessage.trim()}
            onPress={sendDraftMessage}
            style={({ pressed }) => [
              styles.sendButton,
              (!activeChat || !draftMessage.trim()) && styles.sendButtonDisabled,
              pressed && activeChat && draftMessage.trim() && styles.buttonPressed,
            ]}>
            <MaterialIcons
              color={!activeChat || !draftMessage.trim() ? '#92A0AE' : BRAND_NAVY}
              name="send"
              size={21}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: BRAND_NAVY,
    paddingTop: 24,
    paddingBottom: 30,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Fonts.bold,
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  page: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 760,
    marginTop: -18,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 12,
  },
  pageDesktop: {
    paddingHorizontal: 20,
  },
  managerCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 0,
    overflow: 'hidden',
    shadowColor: BRAND_NAVY,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
  },
  managerScroll: {
    flexGrow: 0,
  },
  managerScrollContent: {
    padding: 18,
    gap: 16,
  },
  managerSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Fonts.bold,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stackRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  topInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 14,
    color: BRAND_NAVY,
    fontFamily: Fonts.regular,
  },
  fullWidthInput: {
    width: '100%',
    flexBasis: 'auto',
    flexGrow: 0,
  },
  createButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: BRAND_TEAL,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidthButton: {
    width: '100%',
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  fullWidthActions: {
    width: '100%',
  },
  iconGhostButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexButton: {
    flex: 1,
    width: 'auto',
  },
  iconGhostButtonFilled: {
    backgroundColor: BRAND_TEAL,
    borderColor: BRAND_TEAL,
  },
  emptyChip: {
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyChipText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  chatChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
    minWidth: 0,
  },
  chatChipActive: {
    backgroundColor: BRAND_NAVY,
    borderColor: BRAND_NAVY,
  },
  chatChipText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  manageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  manageButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageButtonDanger: {
    backgroundColor: DANGER_COLOR,
    borderColor: DANGER_COLOR,
  },
  manageButtonText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  manageButtonTextLight: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  feedbackDot: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: BRAND_NAVY,
  },
  feedbackDotActive: {
    backgroundColor: BRAND_TEAL,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.medium,
  },
  helpBox: {
    borderRadius: 18,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
    gap: 4,
  },
  helpTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Fonts.bold,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  helpCommand: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.mono,
  },
  conversationCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 22,
  },
  messageBlock: {
    maxWidth: '92%',
    alignSelf: 'flex-start',
    gap: 10,
  },
  messageBubble: {
    position: 'relative',
    backgroundColor: BUBBLE_BG,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  messageTail: {
    position: 'absolute',
    right: 18,
    bottom: -6,
    width: 18,
    height: 18,
    backgroundColor: BUBBLE_BG,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 17,
    lineHeight: 34,
    fontFamily: Fonts.regular,
  },
  messageMeta: {
    marginLeft: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
  transcriptBanner: {
    borderRadius: 22,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  transcriptCopy: {
    flex: 1,
    gap: 4,
  },
  transcriptTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.bold,
  },
  transcriptBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
  },
  transcriptAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptActionDisabled: {
    opacity: 0.45,
  },
  composerBar: {
    minHeight: 66,
    borderRadius: 28,
    backgroundColor: COMPOSER_BG,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#61CACC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: BRAND_TEAL,
  },
  composerButtonDisabled: {
    opacity: 0.45,
  },
  composerInput: {
    flex: 1,
    minHeight: 48,
    color: BRAND_NAVY,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    paddingHorizontal: 6,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D7DDE5',
  },
  sendButtonDisabled: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
