import { useState, useRef, useEffect } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Smile } from 'lucide-react';

const EmojiPickerMart = ({ selectedEmoji, onEmojiSelect, className = "" }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [position, setPosition] = useState({ top: 'auto', left: 'auto', right: 'auto' });
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji.native);
    setShowPicker(false);
  };

  // Calculate position to avoid overflow
  useEffect(() => {
    if (showPicker && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const pickerWidth = 352;
      const pickerHeight = 435;

      let top = buttonRect.bottom + 8;
      let left = buttonRect.left;
      let right = 'auto';

      // Adjust horizontal position if it would overflow
      if (left + pickerWidth > viewportWidth) {
        left = 'auto';
        right = viewportWidth - buttonRect.right;
      }

      // Adjust vertical position if it would overflow
      if (top + pickerHeight > viewportHeight) {
        top = buttonRect.top - pickerHeight - 8;
      }

      setPosition({ top: `${top}px`, left: left === 'auto' ? 'auto' : `${left}px`, right });
    }
  }, [showPicker]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPicker && 
          pickerRef.current && 
          !pickerRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`w-12 h-12 rounded-lg border-3 flex items-center justify-center text-2xl transition-all ${
          showPicker 
            ? 'border-primary bg-primary/10 shadow-lg scale-105' 
            : 'border-base-300 hover:border-base-400 hover:scale-105'
        }`}
        title="Choose emoji"
      >
        {selectedEmoji || <Smile className="w-6 h-6 text-base-content/60" />}
      </button>

      {showPicker && (
        <div 
          ref={pickerRef}
          className="fixed z-50 shadow-2xl rounded-lg overflow-hidden"
          style={{
            top: position.top,
            left: position.left,
            right: position.right,
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="auto"
            previewPosition="none"
            searchPosition="top"
            skinTonePosition="search"
            navPosition="bottom"
            perLine={8}
            maxFrequentRows={2}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerMart;
