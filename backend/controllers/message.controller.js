import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "-password"
    );

    // Подсчет количества непрочитанных сообщений
    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: loggedInUserId, isRead: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const unreadMessageCounts = unreadCounts.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});

    res.status(200).json({ users, unreadMessageCounts });
  } catch (error) {
    console.log("Error in getUsersForSidebar controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    io.to(getReceiverSocketId(userToChatId)).emit("updateUnreadCount");

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "auto",
        folder: "chat-app/messages",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      io.to(receiverSocketId).emit("updateUnreadCount", { senderId });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
