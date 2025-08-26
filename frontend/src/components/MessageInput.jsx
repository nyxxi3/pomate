import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { authUser, socket } = useAuthStore();

  // typing indicator debounce state
  const isTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
      // best-effort stopTyping on unmount
      if (isTypingRef.current && socket && selectedUser && authUser) {
        socket.emit("stopTyping", { to: selectedUser._id, from: authUser._id });
      }
      isTypingRef.current = false;
    };
  }, [socket, selectedUser, authUser]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (!selectedUser) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // stop typing after send
      if (isTypingRef.current && socket && selectedUser && authUser) {
        socket.emit("stopTyping", { to: selectedUser._id, from: authUser._id });
        isTypingRef.current = false;
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleTyping = (value) => {
    setText(value);

    if (!socket || !selectedUser || !authUser) return;

    // emit "typing" once per burst
    const now = Date.now();
    if (!isTypingRef.current) {
      socket.emit("typing", { to: selectedUser._id, from: authUser._id });
      isTypingRef.current = true;
      lastTypingEmitRef.current = now;
    } else if (now - lastTypingEmitRef.current > 1000) {
      // throttle: refresh typing heartbeat every ~1s while continuously typing
      socket.emit("typing", { to: selectedUser._id, from: authUser._id });
      lastTypingEmitRef.current = now;
    }

    // debounce stopTyping
    if (stopTypingTimeoutRef.current) clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { to: selectedUser._id, from: authUser._id });
      isTypingRef.current = false;
    }, 2000);
  };

  if (!selectedUser) return null;

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
