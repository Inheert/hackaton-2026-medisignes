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

let chats: ChatRoom[] = [];

export const getChats = (): ChatRoom[] => chats;

export const setChats = (newChats: ChatRoom[]) => {
  chats = newChats;
};

export const getChatById = (id: string): ChatRoom | undefined => chats.find((chat) => chat.id === id);
