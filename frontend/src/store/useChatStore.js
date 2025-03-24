import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],

  selectedUser: null,

  isUsersLoading: false,
  isMessagesLoading: false,
  isMessageSending: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/message/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set({ messages: res.data });
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

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
