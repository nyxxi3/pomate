import { useState } from 'react';
import EmojiPickerComponent from './EmojiPicker';
import EmojiPickerMart from './EmojiPickerMart';

const EmojiPickerDemo = () => {
  const [selectedEmoji1, setSelectedEmoji1] = useState('🎯');
  const [selectedEmoji2, setSelectedEmoji2] = useState('💪');

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Emoji Picker Demo</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Option 1: emoji-picker-react (Full Featured)</h3>
          <div className="flex items-center gap-4">
            <EmojiPickerComponent
              selectedEmoji={selectedEmoji1}
              onEmojiSelect={setSelectedEmoji1}
            />
            <span className="text-sm text-base-content/60">
              Selected: {selectedEmoji1}
            </span>
          </div>
          <p className="text-xs text-base-content/50 mt-2">
            Features: Search, skin tones, categories, recent emojis
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Option 2: @emoji-mart/react (Lightweight)</h3>
          <div className="flex items-center gap-4">
            <EmojiPickerMart
              selectedEmoji={selectedEmoji2}
              onEmojiSelect={setSelectedEmoji2}
            />
            <span className="text-sm text-base-content/60">
              Selected: {selectedEmoji2}
            </span>
          </div>
          <p className="text-xs text-base-content/50 mt-2">
            Features: Modern design, smaller bundle, fast loading
          </p>
        </div>
      </div>

      <div className="bg-base-200 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Library Comparison:</h4>
        <ul className="text-sm space-y-1">
          <li><strong>emoji-picker-react:</strong> 2.5MB, full features, search, categories</li>
          <li><strong>@emoji-mart/react:</strong> 1.2MB, modern design, faster, lighter</li>
          <li><strong>react-emoji-picker:</strong> 800KB, basic features, customizable</li>
        </ul>
      </div>
    </div>
  );
};

export default EmojiPickerDemo;

