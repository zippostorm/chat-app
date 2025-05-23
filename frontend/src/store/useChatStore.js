import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  unreadMessageCounts: {},

  selectedUser: null,

  isUsersLoading: false,
  isMessagesLoading: false,
  isMessageSending: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/message/users");
      set({
        users: res.data.users,
        unreadMessageCounts: res.data.unreadMessageCounts,
      });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  searchUsers: async (searchQuery) => {
    try {
      const res = await axiosInstance.post("/message/search", {
        searchQuery,
      });
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set((state) => ({
        messages: res.data,
        unreadMessageCounts: { ...state.unreadMessageCounts, [userId]: 0 },
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    set({ isMessageSending: true });
    try {
      const res = await axiosInstance.post(
        `/message/send/${selectedUser._id}`,
        messageData
      );

      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error("Image size should be less than 10MB");
    } finally {
      set({ isMessageSending: false });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      // Добавляем новое сообщение только если оно пришло от текущего собеседника
      if (
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id
      ) {
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        // Если сообщение пришло от текущего собеседника, помечаем его как прочитанное
        if (newMessage.senderId === selectedUser._id) {
          axiosInstance
            .post(`/message/read/${newMessage.senderId}`)
            .then(() => {
              set((state) => ({
                unreadMessageCounts: {
                  ...state.unreadMessageCounts,
                  [newMessage.senderId]: 0,
                },
              }));
            })
            .catch((error) => {
              console.error(
                "Error marking message as read in subscribeToMessages:",
                error
              );
            });
        }
      }
    });
  },

  checkCountMessage: () => {
    const socket = useAuthStore.getState().socket;

    socket.on("updateUnreadCount", ({ senderId }) => {
      set((state) => ({
        unreadMessageCounts: {
          ...state.unreadMessageCounts,
          [senderId]: (state.unreadMessageCounts[senderId] || 0) + 1,
        },
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    localStorage.setItem("selectedUser", JSON.stringify(selectedUser));
    set({ selectedUser });
  },

  getSelectedUser: () => {
    const storedUser = localStorage.getItem("selectedUser");
    if (storedUser) {
      set({ selectedUser: JSON.parse(storedUser) });
    }
  },
}));
