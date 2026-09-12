import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, Video, MoreVertical, Smile, Paperclip, MessageCircle } from 'lucide-react';
import { Input, Button, Badge, Avatar, Tooltip, Typography, Space, Spin, Popover } from 'antd';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { SearchOutlined, SendOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { conversationService } from '../services/conversationService';
import { authService } from '../services/authService';
import type { ConversationDTO, MessageDTO } from '../types/api.types';
import { useThemeToken } from '../hooks/useThemeToken';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { WS_EVENTS } from '../lib/wsEvents';


const { Text, Title } = Typography;

interface IConversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'direct' | 'group';
  memberCount: number;
}

interface IMessage {
  id: string;
  sender: string;
  senderName?: string;
  text: string;
  timestamp: string;
  reactions: Array<{ userId: string; emoji: string }>;
}

const formatTime = (iso?: string): string =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const conversationTitle = (conv: ConversationDTO, currentUserId: string): string => {
  if (conv.type === 'direct') {
    const other = conv.participants.find((p) => p.userId !== currentUserId);
    return other?.username || other?.userId.slice(-4) || 'Direct chat';
  }
  if (conv.name) return conv.name;
  return 'Group chat';
};

const mapMessage = (msg: MessageDTO, currentUserId: string): IMessage => ({
  id: msg.id,
  sender: msg.senderId && msg.senderId === currentUserId ? 'me' : msg.senderId ?? 'unknown',
  text: msg.content,
  timestamp: formatTime(msg.createdAt),
  reactions: msg.reactions ?? [],
});

// ── Empty state khi chưa có tin nhắn ──
const EmptyChatState: React.FC<{ name: string; onSend: () => void }> = ({ name, onSend }) => {
  const token = useThemeToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: token.colorPrimaryBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageCircle size={40} color={token.colorPrimary} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <Title level={5} style={{ marginBottom: 4 }}>Bắt đầu cuộc trò chuyện</Title>
        <Text type="secondary">
          Hãy gửi lời chào đầu tiên đến <Text strong>{name}</Text>!
        </Text>
      </div>
      <Button type="primary" shape="round" icon={<SendOutlined />} onClick={onSend}>
        Gửi lời chào 👋
      </Button>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const token = useThemeToken();
  const [currentUserId, setCurrentUserId] = useState<string>(
    () => localStorage.getItem('userId') ?? ''
  );
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authService
      .getProfile()
      .then((p) => {
        setCurrentUserId(p.userId);
        localStorage.setItem('userId', p.userId);
      })
      .catch((err) => console.error('Failed to load profile', err));
  }, []);

  const loadConversations = useCallback(async () => {
    const dtos = await conversationService.getConversations();
    const valid = dtos.filter((conv) => conv.id);
    const convData: IConversation[] = valid.map((conv) => ({
      id: conv.id,
      name: conversationTitle(conv, currentUserId),
      avatar: conv.avatar || `https://i.pravatar.cc/150?u=${conv.id}`,
      lastMessage: conv.lastMessage || 'Chưa có tin nhắn',
      timestamp: formatTime(conv.lastMessageAt || conv.updatedAt),
      unread: 0,
      type: conv.type,
      memberCount: conv.participants.length,
    }));
    setConversations(convData);
    if (convData.length > 0) {
      setSelectedConversation((prev) => prev ?? convData[0]);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const dtos = await conversationService.getLatestMessages(conversationId);
      setMessages(dtos.map((msg) => mapMessage(msg, currentUserId)));
    },
    [currentUserId]
  );

  useEffect(() => {
    loadConversations().catch(console.error);
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const conversationId = selectedConversation?.id;
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    setLoadingMessages(true);
    loadMessages(conversationId)
      .catch((err) => { if (!cancelled) { console.error(err); setMessages([]); } })
      .finally(() => { if (!cancelled) setLoadingMessages(false); });
    return () => { cancelled = true; };
  }, [selectedConversation, loadMessages]);

  useSocketConnect(() => {
    loadConversations().catch(console.error);
    if (selectedConversation?.id) loadMessages(selectedConversation.id).catch(console.error);
  });

  useSocketEvent(WS_EVENTS.MESSAGE_NEW, (payload) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === payload.conversationId
          ? { ...c, lastMessage: payload.content, timestamp: formatTime(payload.createdAt) }
          : c
      )
    );
    if (payload.conversationId !== selectedConversation?.id) return;
    setMessages((prev) => [
      ...prev,
      {
        id: payload.messageId,
        sender: payload.senderId === currentUserId ? 'me' : payload.senderId,
        text: payload.content,
        timestamp: formatTime(payload.createdAt),
        reactions: [],
      },
    ]);
  });

  useSocketEvent(WS_EVENTS.REACTION_UPDATED, (payload) => {
    if (payload.conversationId !== selectedConversation?.id) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== payload.messageId) return m;
        const newReactions = [...m.reactions];
        if (payload.action === 'add') {
          if (!newReactions.some((r) => r.userId === payload.userId && r.emoji === payload.emoji)) {
            newReactions.push({ userId: payload.userId, emoji: payload.emoji });
          }
        } else {
          const idx = newReactions.findIndex((r) => r.userId === payload.userId && r.emoji === payload.emoji);
          if (idx !== -1) newReactions.splice(idx, 1);
        }
        return { ...m, reactions: newReactions };
      })
    );
  });

  const handleReact = async (messageId: string, emoji: string) => {
    if (!selectedConversation) return;
    const conversationId = selectedConversation.id;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const hasReacted = message.reactions.some(
      (r) => r.userId === currentUserId && r.emoji === emoji
    );

    // Optimistic Update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const newReactions = [...m.reactions];
        if (hasReacted) {
          const idx = newReactions.findIndex((r) => r.userId === currentUserId && r.emoji === emoji);
          if (idx !== -1) newReactions.splice(idx, 1);
        } else {
          newReactions.push({ userId: currentUserId, emoji });
        }
        return { ...m, reactions: newReactions };
      })
    );

    try {
      if (hasReacted) {
        await conversationService.removeReaction(conversationId, messageId, emoji);
      } else {
        await conversationService.addReaction(conversationId, messageId, emoji);
      }
    } catch (err) {
      console.error('Failed to update reaction', err);
      // Rollback on failure could be implemented here
    }
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending || !selectedConversation) return;
    const content = newMessage;
    setNewMessage('');
    setIsSending(true);
    try {
      // Chỉ gửi qua REST — KHÔNG append vào messages ở đây.
      // Tin sẽ tự về qua message.new (kể cả tin của chính mình) và được render ở handler WS.
      await conversationService.sendMessage({ conversationId: selectedConversation.id, content });
    } catch {
      setNewMessage(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleGreeting = () => {
    setNewMessage(`Xin chào ${selectedConversation?.name ?? ''} 👋`);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 8rem)', overflow: 'hidden', borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

      {/* ── Conversation List ── */}
      <div style={{ width: '28%', minWidth: 240, borderRight: `1px solid ${token.colorBorderSecondary}`, display: 'flex', flexDirection: 'column', background: token.colorBgContainer }}>

        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>Chats</Title>
            <Badge count={conversations.reduce((s, c) => s + c.unread, 0)} size="small">
              <Button type="text" size="small" icon={<TeamOutlined />} aria-label="All conversations" />
            </Badge>
          </div>
          <Input
            placeholder="Tìm kiếm…"
            prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
            style={{ borderRadius: 999, background: token.colorFillQuaternary }}
            variant="borderless"
            aria-label="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* Conversation items */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {conversations
            .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((convo) => {
            const isSelected = selectedConversation?.id === convo.id;
            return (
              <div
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isSelected ? token.colorPrimaryBg : 'transparent',
                  borderLeft: `3px solid ${isSelected ? token.colorPrimary : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = token.colorBgTextHover; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0, marginRight: 12 }}>
                  <Avatar
                    src={convo.avatar}
                    alt={convo.name}
                    size={46}
                    icon={convo.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                    style={{ border: isSelected ? `2px solid ${token.colorPrimary}` : `2px solid ${token.colorBorderSecondary}` }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      strong={convo.unread > 0 || isSelected}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}
                    >
                      {convo.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                      {convo.timestamp}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      type="secondary"
                      italic={convo.unread === 0}
                      style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: convo.unread > 0 ? 600 : undefined, color: convo.unread > 0 ? token.colorText : undefined }}
                    >
                      {convo.lastMessage}
                    </Text>
                    {convo.unread > 0 && (
                      <Badge count={convo.unread} size="small" style={{ marginLeft: 8, flexShrink: 0, background: token.colorPrimary }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat Window ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: token.colorBgLayout }}>

        {/* Chat Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Space size={12}>
            <div style={{ position: 'relative' }}>
              <Avatar
                src={selectedConversation?.avatar}
                size={44}
                icon={selectedConversation?.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                style={{ border: `2px solid ${token.colorPrimaryBorder}` }}
              />
            </div>
            <div>
              <Text strong style={{ display: 'block', fontSize: 15 }}>
                {selectedConversation?.name || ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedConversation?.type === 'group'
                  ? `${selectedConversation.memberCount} thành viên`
                  : 'Nhắn tin trực tiếp'}
              </Text>
            </div>
          </Space>
          <Space size={2}>
            <Tooltip title="Tính năng sắp ra mắt">
              <Button type="text" shape="circle" icon={<Phone size={18} />} aria-label="Voice call" disabled />
            </Tooltip>
            <Tooltip title="Tính năng sắp ra mắt">
              <Button type="text" shape="circle" icon={<Video size={18} />} aria-label="Video call" disabled />
            </Tooltip>
            <Tooltip title="More options">
              <Button type="text" shape="circle" icon={<MoreVertical size={18} />} aria-label="More options" />
            </Tooltip>
          </Space>
        </div>

        {/* Messages Area */}
        <div className="chat-scroll" style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {loadingMessages ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin size="large" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyChatState name={selectedConversation?.name ?? ''} onSend={handleGreeting} />
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender === 'me';
              const prevMsg = messages[i - 1];
              const showAvatar = !isMe && (prevMsg?.sender !== msg.sender);

              // Group reactions by emoji
              const groupedReactions = msg.reactions.reduce((acc, r) => {
                acc[r.emoji] = [...(acc[r.emoji] ?? []), r.userId];
                return acc;
              }, {} as Record<string, string[]>);

              return (
                <React.Fragment key={msg.id}>
                <div
                  className="message-row"
                  style={{
                    display: 'flex',
                    marginBottom: prevMsg?.sender !== msg.sender ? 12 : 4,
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    gap: 8,
                  }}
                >
                  <style>
                    {`
                      .message-row:hover .message-actions {
                        opacity: 1 !important;
                      }
                    `}
                  </style>
                  {/* Avatar người gửi (chỉ hiện ở tin đầu của chuỗi) */}
                  {!isMe && (
                    <div style={{ width: 32, flexShrink: 0 }}>
                      {showAvatar && (
                        <Avatar
                          src={`https://i.pravatar.cc/150?u=${msg.sender}`}
                          size={32}
                          style={{ border: `1px solid ${token.colorBorderSecondary}` }}
                        />
                      )}
                    </div>
                  )}

                  <div style={{ maxWidth: 460 }}>
                    {/* Bubble */}
                    <div
                      style={{
                        padding: '9px 14px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe ? token.colorPrimary : token.colorBgContainer,
                        border: isMe ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        wordBreak: 'break-word',
                      }}
                    >
                      <Text style={{ display: 'block', color: isMe ? '#fff' : undefined, lineHeight: 1.5 }}>
                        {msg.text}
                      </Text>
                    </div>
                    {/* Timestamp dưới bubble */}
                    <Text
                      style={{
                        display: 'block',
                        fontSize: 11,
                        marginTop: 3,
                        textAlign: isMe ? 'right' : 'left',
                        color: token.colorTextPlaceholder,
                        paddingLeft: isMe ? 0 : 4,
                        paddingRight: isMe ? 4 : 0,
                      }}
                    >
                      {msg.timestamp}
                    </Text>
                  </div>
                  
                  {/* Hover action to show emoji picker */}
                  <div
                    className="message-actions"
                    style={{
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      alignSelf: 'center',
                    }}
                  >
                    <Popover
                      content={
                        <EmojiPicker
                          onEmojiClick={(emojiData: EmojiClickData) => handleReact(msg.id, emojiData.emoji)}
                          width={300}
                          height={400}
                        />
                      }
                      trigger="click"
                      placement={isMe ? 'left' : 'right'}
                    >
                      <Button
                        type="text"
                        shape="circle"
                        icon={<Smile size={16} />}
                        style={{ color: token.colorTextSecondary }}
                      />
                    </Popover>
                  </div>
                </div>
                
                {/* Reactions Display (below message bubble) */}
                {Object.keys(groupedReactions).length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      marginTop: -10,
                      marginBottom: 8,
                      marginLeft: isMe ? 0 : 40,
                      marginRight: isMe ? 40 : 0,
                      gap: 4,
                      zIndex: 1,
                      position: 'relative',
                    }}
                  >
                    {Object.entries(groupedReactions).map(([emoji, userIds]) => {
                      const iReacted = userIds.includes(currentUserId);
                      return (
                        <Tooltip key={emoji} title={userIds.length + ' reactions'}>
                          <div
                            onClick={() => handleReact(msg.id, emoji)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 12,
                              background: iReacted ? token.colorPrimaryBg : token.colorBgContainer,
                              border: `1px solid ${iReacted ? token.colorPrimary : token.colorBorderSecondary}`,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            <span>{emoji}</span>
                            <span style={{ color: iReacted ? token.colorPrimary : token.colorTextSecondary, fontWeight: iReacted ? 600 : 'normal' }}>
                              {userIds.length}
                            </span>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div style={{
          padding: '12px 16px',
          background: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <form onSubmit={handleSendMessage}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 6px 6px 12px',
              borderRadius: 999,
              border: `1.5px solid ${token.colorBorderSecondary}`,
              background: token.colorFillQuaternary,
              transition: 'border-color 0.2s',
            }}>
              <Tooltip title="Tính năng sắp ra mắt">
                <Button type="text" size="small" icon={<Paperclip size={18} />} aria-label="Attach file" disabled />
              </Tooltip>
              <Tooltip title="Tính năng sắp ra mắt">
                <Button type="text" size="small" icon={<Smile size={18} />} aria-label="Emoji" disabled />
              </Tooltip>
              <input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn…"
                aria-label="Message input"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: token.colorText,
                  padding: '4px 0',
                }}
              />
              <Button
                type="primary"
                htmlType="submit"
                shape="circle"
                icon={<SendOutlined />}
                loading={isSending}
                disabled={!newMessage.trim()}
                aria-label="Send message"
                style={{ flexShrink: 0 }}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
