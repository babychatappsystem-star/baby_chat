import React, { useState } from 'react';
import { Button, Drawer, Space } from 'antd';
import { Copy, Plus, Reply } from 'lucide-react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Bảng thao tác cho màn hình cảm ứng (mở bằng nhấn giữ tin): react nhanh, reply, copy.
export const MessageActionSheet: React.FC<{
  open: boolean;
  isDark: boolean;
  canCopy: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
}> = ({ open, isDark, canCopy, onClose, onReact, onReply, onCopy }) => {
  const [showPicker, setShowPicker] = useState(false);
  const close = () => {
    setShowPicker(false);
    onClose();
  };
  const react = (emoji: string) => {
    onReact(emoji);
    close();
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      placement="bottom"
      size="auto"
      closable={false}
      styles={{ body: { padding: 16 } }}
      destroyOnHidden
    >
      <div role="group" aria-label="React to message" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        {QUICK_REACTIONS.map((emoji) => (
          <Button key={emoji} type="text" shape="circle" size="large" aria-label={`React ${emoji}`} onClick={() => react(emoji)} style={{ fontSize: 24 }}>
            {emoji}
          </Button>
        ))}
        <Button type="text" shape="circle" size="large" aria-label="More reactions" icon={<Plus size={22} />} onClick={() => setShowPicker((v) => !v)} />
      </div>
      {showPicker && (
        <div style={{ marginBottom: 12 }}>
          <EmojiPicker
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => react(data.emoji)}
            width="100%"
            height={320}
            style={{ border: 'none' }}
          />
        </div>
      )}
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Button block size="large" icon={<Reply size={18} />} onClick={() => { onReply(); close(); }}>
          Reply
        </Button>
        {canCopy && (
          <Button block size="large" icon={<Copy size={18} />} onClick={() => { onCopy(); close(); }}>
            Copy text
          </Button>
        )}
      </Space>
    </Drawer>
  );
};
