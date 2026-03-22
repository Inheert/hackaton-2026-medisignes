import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: number;
};

export type ChatRoom = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export const CHAT_STORAGE_KEY = 'chats:v1';
export const ACTIVE_CHAT_STORAGE_KEY = 'chats:activeChatId:v1';

let chats: ChatRoom[] = [];

export const getChats = (): ChatRoom[] => chats;

export const setChats = (newChats: ChatRoom[]) => {
  chats = newChats;
};

export const getChatById = (id: string): ChatRoom | undefined => chats.find((chat) => chat.id === id);

export const createChatId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export async function loadPersistedChatState(): Promise<{
  chats: ChatRoom[];
  activeChatId: string | null;
}> {
  const [storedChats, storedActiveChatId] = await Promise.all([
    AsyncStorage.getItem(CHAT_STORAGE_KEY),
    AsyncStorage.getItem(ACTIVE_CHAT_STORAGE_KEY),
  ]);

  let parsedChats: ChatRoom[] = [];

  if (storedChats) {
    try {
      const parsed = JSON.parse(storedChats) as ChatRoom[];
      if (Array.isArray(parsed)) {
        parsedChats = parsed;
      }
    } catch {
      parsedChats = [];
    }
  }

  chats = parsedChats;

  return {
    chats: parsedChats,
    activeChatId: storedActiveChatId ?? null,
  };
}

export async function persistChatState(
  nextChats: ChatRoom[],
  activeChatId: string | null
): Promise<void> {
  chats = nextChats;

  await Promise.all([
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextChats)),
    activeChatId
      ? AsyncStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId)
      : AsyncStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY),
  ]);
}

export async function createPersistedChat({
  title,
  firstMessage,
}: {
  title: string;
  firstMessage?: string;
}): Promise<ChatRoom> {
  const normalizedTitle = title.trim();
  const normalizedMessage = firstMessage?.trim() ?? '';
  const { chats: storedChats } = await loadPersistedChatState();

  const nextChat: ChatRoom = {
    id: createChatId(),
    title: normalizedTitle,
    messages: normalizedMessage
      ? [
          {
            id: createChatId(),
            text: normalizedMessage,
            createdAt: Date.now(),
          },
        ]
      : [],
  };

  const nextChats = [...storedChats, nextChat];
  await persistChatState(nextChats, nextChat.id);
  return nextChat;
}
