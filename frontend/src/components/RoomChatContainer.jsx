import { useEffect, useRef, useState } from "react";
import { useRoomChatStore } from "../store/useRoomChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import RoomChatInput from "./RoomChatInput";

const RoomChatContainer = ({ roomId, roomName }) => {
  const {
    messages,
    getRoomMessages,
    isMessagesLoading,
    subscribeToRoomMessages,
    unsubscribeFromRoomMessages,
  } = useRoomChatStore();
  const { socket } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    // Load messages for the room
    getRoomMessages(roomId);

    // Subscribe to real-time messages
    const unsubscribe = subscribeToRoomMessages(roomId, socket);

    return () => {
      unsubscribe();
    };
  }, [roomId, getRoomMessages, subscribeToRoomMessages, socket]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="border-b border-base-300 p-4">
          <h3 className="font-semibold text-base-content">Room Chat</h3>
          <p className="text-sm text-base-content/70">{roomName}</p>
        </div>
        <MessageSkeleton />
        <RoomChatInput roomId={roomId} disabled={true} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="border-b border-base-300 p-4">
        <h3 className="font-semibold text-base-content">Room Chat</h3>
        <p className="text-sm text-base-content/70">{roomName}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-base-content/60 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`chat ${message.senderId._id === useAuthStore.getState().authUser._id ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={message.senderId.profilePic || "/avatar.png"}
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <span className="font-medium text-sm">{message.senderId.fullName || message.senderId.username}</span>
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble">
                <p>{message.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      <RoomChatInput roomId={roomId} />
    </div>
  );
};

export default RoomChatContainer;








