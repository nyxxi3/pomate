import { useState } from "react";
import { useRoomChatStore } from "../store/useRoomChatStore";
import { Send } from "lucide-react";

const RoomChatInput = ({ roomId, disabled = false }) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendRoomMessage } = useRoomChatStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await sendRoomMessage(roomId, message.trim());
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-base-300 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Chat disabled for this room" : "Type a message..."}
          className="flex-1 input input-bordered input-sm"
          disabled={disabled || isSending}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className="btn btn-primary btn-sm gap-2"
        >
          {isSending ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};

export default RoomChatInput;








