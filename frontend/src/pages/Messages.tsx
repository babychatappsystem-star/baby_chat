import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, Video, MoreVertical, Smile, Paperclip, MessageCircle, Reply, X } from 'lucide-react';
import { Input, Button, Badge, Avatar, Tooltip, Typography, Space, Spin, Popover, message as antdMessage } from 'antd';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { SearchOutlined, SendOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import { conversationService } from '../services/conversationService';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
import { authService } from '../services/authService';
import type { ConversationDTO, MessageDTO, ConversationParticipant } from '../types/api.types';
import { useThemeToken } from '../hooks/useThemeToken';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { WS_EVENTS } from '../lib/wsEvents';
import { PresenceContext } from '../contexts/PresenceContext';
import { usePresence } from '../hooks/usePresence';
import environmentLoader from '../config/environmentLoader';

const { Text, Title } = Typography;

const resolveAvatarUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${environmentLoader.loadConfig().apiUrl}${url}`;
  return url;
};

interface IConversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  type: 'direct' | 'group';
  memberCount: number;
  otherUserId?: string;
  participants: ConversationParticipant[];
}

interface IMessage {
  id: string;
  sender: string;
  senderName?: string;
  text: string;
  timestamp: string;
  rawDate: string;
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  reactions: Array<{ userId: string; emoji: string }>;
}

const formatTime = (iso?: string): string =>
  iso ? dayjs(iso).format('HH:mm') : '';

const getTimeSeparator = (currentRaw: string, prevRaw?: string): string | null => {
  const current = dayjs(currentRaw);
  const prev = prevRaw ? dayjs(prevRaw) : null;

  if (!prev || !current.isSame(prev, 'day')) {
    if (current.isToday()) return `Today ${current.format('HH:mm')}`;
    if (current.isYesterday()) return `Yesterday ${current.format('HH:mm')}`;
    return current.format('DD/MM/YYYY HH:mm');
  }

  if (current.diff(prev, 'hour', true) >= 1) {
    return current.format('HH:mm');
  }

  return null;
};

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
  rawDate: msg.createdAt ?? new Date().toISOString(),
  replyId: msg.replyId,
  replySnippet: msg.replySnippet,
  replySenderId: msg.replySenderId,
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
        <Title level={5} style={{ marginBottom: 4 }}>Start a conversation</Title>
        <Text type="secondary">
          Send your first greeting to <Text strong>{name}</Text>!
        </Text>
      </div>
      <Button type="primary" shape="round" icon={<SendOutlined />} onClick={onSend}>
        Send a greeting 👋
      </Button>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const token = useThemeToken();
  const isDark = useDarkMode();
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
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);

  // Expressive Chat states
  const [thresholds, setThresholds] = useState<number>(5);
  const [transitionTime, setTransitionTime] = useState<number>(300);
  const [pressing, setPressing] = useState(false);
  const [emotionLevel, setEmotionLevel] = useState(0);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emotionLevelRef = useRef<number>(0);
  const DEFAULT_EXPRESSIVE_EMOJIS = ['🙂', '😀', '😄', '😆', '😂'];
  const [expressiveEmojis, setExpressiveEmojis] = useState<string[]>(DEFAULT_EXPRESSIVE_EMOJIS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollBottomRef = useRef<boolean>(true);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { presenceMap } = React.useContext(PresenceContext);
  const selectedPresence = usePresence(selectedConversation?.otherUserId);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleScrollToOriginal = useCallback((replyId?: string) => {
    if (!replyId) return;
    const el = document.getElementById(`msg-${replyId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(replyId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    } else {
      antdMessage.info('Original message is not in the current view');
    }
  }, []);

  useEffect(() => {
    authService
      .getProfile()
      .then((p) => {
        setCurrentUserId(p.userId);
        localStorage.setItem('userId', p.userId);
        setThresholds(p.expressiveChatThresholds ?? 5);
        setTransitionTime(p.expressiveChatTransitionTime ?? 300);
        if (p.expressiveChatEmojis && p.expressiveChatEmojis.length > 0) {
          setExpressiveEmojis(p.expressiveChatEmojis);
        }
      })
      .catch((err) => console.error('Failed to load profile', err));
  }, []);

  const loadConversations = useCallback(async () => {
    const dtos = await conversationService.getConversations();
    const valid = dtos.filter((conv) => conv.id);
    const convData: IConversation[] = valid.map((conv) => {
      const other = conv.type === 'direct' ? conv.participants.find((p) => p.userId !== currentUserId) : undefined;
      const avatarUrl = conv.type === 'direct' ? other?.avatarUrl : conv.avatar;
      return {
        id: conv.id,
        name: conversationTitle(conv, currentUserId),
        avatar: resolveAvatarUrl(avatarUrl),
        lastMessage: conv.lastMessage || 'No messages yet',
        timestamp: formatTime(conv.lastMessageAt || conv.updatedAt),
        unread: 0,
        type: conv.type,
        memberCount: conv.participants.length,
        otherUserId: other?.userId,
        participants: conv.participants,
      };
    });
    setConversations(convData);
    if (convData.length > 0) {
      setSelectedConversation((prev) => {
        if (!prev) return convData[0];
        const fresh = convData.find((c) => c.id === prev.id);
        return fresh ?? convData[0];
      });
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

  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  useEffect(() => {
    shouldScrollBottomRef.current = true;
    setReplyingTo(null);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage.id;
    const isNewMessage = lastMessageId !== prevLastMessageIdRef.current;

    if (shouldScrollBottomRef.current) {
      shouldScrollBottomRef.current = false;
      prevLastMessageIdRef.current = lastMessageId;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }

    if (isNewMessage) {
      prevLastMessageIdRef.current = lastMessageId;
      const isMe = lastMessage.sender === 'me';
      if (isMe || isNearBottom()) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isNearBottom]);

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
        rawDate: payload.createdAt ?? new Date().toISOString(),
        replyId: payload.replyId,
        replySnippet: payload.replySnippet,
        replySenderId: payload.replySenderId,
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

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>, contentOverride?: string) => {
    e?.preventDefault();
    const content = contentOverride ?? newMessage;
    if (!content.trim() || isSending || !selectedConversation) return;
    
    const replyIdToSend = replyingTo?.id;
    // Nếu không có override, reset newMessage (từ ô input) và clear replyingTo
    if (!contentOverride) {
      setNewMessage('');
      setReplyingTo(null);
    }
    setIsSending(true);
    try {
      // Chỉ gửi qua REST — KHÔNG append vào messages ở đây.
      // Tin sẽ tự về qua message.new (kể cả tin của chính mình) và được render ở handler WS.
      await conversationService.sendMessage({
        conversationId: selectedConversation.id,
        content,
        replyId: replyIdToSend,
      });
    } catch {
      console.error('Failed to send message');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const startPress = () => {
    if (isSending || !selectedConversation) return;
    setPressing(true);
    setEmotionLevel(0);
    emotionLevelRef.current = 0;
    
    pressTimerRef.current = setInterval(() => {
      emotionLevelRef.current = Math.min(emotionLevelRef.current + 1, thresholds - 1);
      setEmotionLevel(emotionLevelRef.current);
    }, transitionTime);
  };

  const endPress = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    if (!pressing) return; // Prevent duplicate triggers
    
    let finalMessage = newMessage.trim();
    const activeEmojis = expressiveEmojis.length > 0 ? expressiveEmojis : DEFAULT_EXPRESSIVE_EMOJIS;
    // Always append an emoji (even on quick click: level 0)
    finalMessage += (finalMessage ? ' ' : '') + activeEmojis[Math.min(emotionLevelRef.current, activeEmojis.length - 1)];
    setNewMessage('');
    
    setPressing(false);
    setEmotionLevel(0);
    emotionLevelRef.current = 0;

    if (finalMessage) {
      handleSendMessage(undefined, finalMessage);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Nếu đang nhấn giữ thì endPress sẽ gửi. Nếu chỉ nhấn Enter, xử lý bình thường.
    if (!pressing) {
      handleSendMessage(e);
    }
  };

  const handleGreeting = () => {
    setNewMessage(`Hello ${selectedConversation?.name ?? ''} 👋`);
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
            placeholder="Search..."
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
                    src={convo.avatar || undefined}
                    alt={convo.name}
                    size={46}
                    icon={convo.type === 'group' ? <TeamOutlined /> : (!convo.avatar ? undefined : <UserOutlined />)}
                    style={{ border: isSelected ? `2px solid ${token.colorPrimary}` : `2px solid ${token.colorBorderSecondary}` }}
                  >
                    {!convo.avatar && convo.type !== 'group' && convo.name.charAt(0).toUpperCase()}
                  </Avatar>
                  {convo.otherUserId && presenceMap[convo.otherUserId]?.online && (
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 12, height: 12, borderRadius: '50%',
                      background: token.colorSuccess,
                      border: `2px solid ${token.colorBgContainer}`
                    }} />
                  )}
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
                src={selectedConversation?.avatar || undefined}
                size={44}
                icon={selectedConversation?.type === 'group' ? <TeamOutlined /> : (!selectedConversation?.avatar ? undefined : <UserOutlined />)}
                style={{ border: `2px solid ${token.colorPrimaryBorder}` }}
              >
                {!selectedConversation?.avatar && selectedConversation?.type !== 'group' && selectedConversation?.name.charAt(0).toUpperCase()}
              </Avatar>
            </div>
            <div>
              <Text strong style={{ display: 'block', fontSize: 15 }}>
                {selectedConversation?.name || ''}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedConversation?.type === 'group'
                  ? `${selectedConversation.memberCount} members`
                  : (
                    <>
                      {selectedPresence.label && (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: selectedPresence.online ? token.colorSuccess : token.colorTextPlaceholder
                        }} />
                      )}
                      {selectedPresence.label || 'No information'}
                    </>
                  )}
              </Text>
            </div>
          </Space>
          <Space size={2}>
            <Tooltip title="Feature coming soon">
              <Button type="text" shape="circle" icon={<Phone size={18} />} aria-label="Voice call" disabled />
            </Tooltip>
            <Tooltip title="Feature coming soon">
              <Button type="text" shape="circle" icon={<Video size={18} />} aria-label="Video call" disabled />
            </Tooltip>
            <Tooltip title="More options">
              <Button type="text" shape="circle" icon={<MoreVertical size={18} />} aria-label="More options" />
            </Tooltip>
          </Space>
        </div>

        {/* Messages Area */}
        <div ref={scrollContainerRef} className="chat-scroll" style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
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
              const nextMsg = messages[i + 1];
              const isFirstInGroup = prevMsg?.sender !== msg.sender;
              const isLastInGroup = nextMsg?.sender !== msg.sender;
              const showAvatar = !isMe && isFirstInGroup;
              
              const senderParticipant = selectedConversation?.participants.find(p => p.userId === msg.sender);
              const senderAvatarUrl = resolveAvatarUrl(senderParticipant?.avatarUrl);

              // Group reactions by emoji
              const groupedReactions = msg.reactions.reduce((acc, r) => {
                acc[r.emoji] = [...(acc[r.emoji] ?? []), r.userId];
                return acc;
              }, {} as Record<string, string[]>);

              const separator = getTimeSeparator(msg.rawDate, prevMsg?.rawDate);

              const hasReactions = Object.keys(groupedReactions).length > 0;

              const messageActions = (
                <div
                  className="message-actions"
                  style={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    alignSelf: hasReactions ? 'flex-start' : 'center',
                    marginTop: hasReactions ? 4 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Tooltip title="Reply">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<Reply size={16} />}
                      style={{ color: token.colorTextSecondary }}
                      onClick={() => {
                        const senderName = isMe ? 'You' : (senderParticipant?.username || 'User');
                        setReplyingTo({
                          id: msg.id,
                          text: msg.text,
                          senderName,
                        });
                        inputRef.current?.focus();
                      }}
                    />
                  </Tooltip>
                  <Popover
                    content={
                      <EmojiPicker
                        theme={isDark ? Theme.DARK : Theme.LIGHT}
                        onEmojiClick={(emojiData: EmojiClickData) => handleReact(msg.id, emojiData.emoji)}
                        width={320}
                        height={400}
                        style={{ border: 'none' }}
                      />
                    }
                    overlayInnerStyle={{ padding: 0, overflow: 'hidden', borderRadius: 8 }}
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
              );

              return (
                <React.Fragment key={msg.id}>
                {separator && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px 0' }}>
                    <div style={{
                      background: token.colorFillQuaternary,
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      color: token.colorTextSecondary
                    }}>
                      {separator}
                    </div>
                  </div>
                )}
                <div
                  className="message-row"
                  style={{
                    display: 'flex',
                    marginBottom: isLastInGroup ? 12 : (hasReactions ? 6 : 2),
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
                          src={senderAvatarUrl || undefined}
                          size={32}
                          style={{ border: `1px solid ${token.colorBorderSecondary}` }}
                        >
                          {!senderAvatarUrl && (senderParticipant?.username || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                    </div>
                  )}

                  {/* Đối với tin nhắn của chính mình (isMe): Hiển thị button reply & icon bên TRÁI tin nhắn */}
                  {isMe && messageActions}

                  <div
                    style={{
                      maxWidth: 460,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {/* Bubble */}
                    <Tooltip title={msg.timestamp} placement="top" mouseEnterDelay={0.4}>
                      <div
                        id={`msg-${msg.id}`}
                        style={{
                          padding: '9px 14px',
                          borderRadius: isMe 
                            ? `18px ${isFirstInGroup ? '18px' : '4px'} 4px 18px` 
                            : `${isFirstInGroup ? '18px' : '4px'} 18px 18px 4px`,
                          background: isMe ? token.colorPrimary : token.colorBgContainer,
                          border: isMe ? 'none' : `1px solid ${highlightedMessageId === msg.id ? token.colorPrimary : token.colorBorderSecondary}`,
                          boxShadow: highlightedMessageId === msg.id
                            ? `0 0 0 3px ${token.colorPrimary}, 0 4px 14px rgba(232, 56, 90, 0.4)`
                            : '0 1px 3px rgba(0,0,0,0.07)',
                          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                          wordBreak: 'break-word',
                        }}
                      >
                        {/* Quoted Message Snippet */}
                        {msg.replySnippet && (
                          <div
                            onClick={() => handleScrollToOriginal(msg.replyId)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '5px 10px',
                              marginBottom: 8,
                              borderRadius: 6,
                              background: isMe 
                                ? 'rgba(0, 0, 0, 0.18)' 
                                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                              borderLeft: `3px solid ${isMe ? 'rgba(255, 255, 255, 0.9)' : token.colorPrimary}`,
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'opacity 0.2s',
                            }}
                            title="Click to view original message"
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: isMe ? '#ffffff' : token.colorPrimary,
                                marginBottom: 2,
                              }}
                            >
                              {msg.replySenderId === currentUserId
                                ? 'You'
                                : (selectedConversation?.participants.find(p => p.userId === msg.replySenderId)?.username || 'User')}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: isMe ? 'rgba(255, 255, 255, 0.85)' : token.colorTextSecondary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 360,
                              }}
                            >
                              {msg.replySnippet}
                            </span>
                          </div>
                        )}
                        <Text style={{ display: 'block', color: isMe ? '#fff' : undefined, lineHeight: 1.5 }}>
                          {msg.text}
                        </Text>
                      </div>
                    </Tooltip>

                    {/* Reactions Display (bên dưới bong bóng, căn trái theo mép bong bóng) */}
                    {hasReactions && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignSelf: 'flex-start',
                          marginTop: -6,
                          marginLeft: 4,
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
                  </div>
                  
                  {/* Đối với tin nhắn đối phương (!isMe): Hiển thị button reply & icon bên PHẢI tin nhắn */}
                  {!isMe && messageActions}
                </div>
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
          {replyingTo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              marginBottom: 8,
              borderRadius: 8,
              background: token.colorFillAlter,
              borderLeft: `3px solid ${token.colorPrimary}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <Reply size={14} style={{ color: token.colorPrimary, flexShrink: 0 }} />
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  <Text strong style={{ fontSize: 12, color: token.colorPrimary, marginRight: 6 }}>
                    {replyingTo.senderName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text}
                  </Text>
                </div>
              </div>
              <Button
                type="text"
                size="small"
                shape="circle"
                icon={<X size={14} />}
                style={{ color: token.colorTextSecondary }}
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
              />
            </div>
          )}
          <form onSubmit={handleFormSubmit}>
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
              <Tooltip title="Feature coming soon">
                <Button type="text" size="small" icon={<Paperclip size={18} />} aria-label="Attach file" disabled />
              </Tooltip>
              <div style={{ position: 'relative' }}>
                {pressing && (
                  <div style={{
                    position: 'absolute',
                    top: -60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 32 + (emotionLevel * 6), // Emotion gets bigger
                    transition: 'all 0.2s',
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                    zIndex: 10,
                  }}>
                    {(expressiveEmojis.length > 0 ? expressiveEmojis : DEFAULT_EXPRESSIVE_EMOJIS)[Math.min(emotionLevel, (expressiveEmojis.length > 0 ? expressiveEmojis : DEFAULT_EXPRESSIVE_EMOJIS).length - 1)]}
                  </div>
                )}
                <Tooltip title="Hold for Expressive Chat" placement="bottom">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<Smile size={18} />} 
                    aria-label="Expressive Chat" 
                    onMouseDown={startPress}
                    onMouseUp={() => endPress()}
                    onMouseLeave={() => { if (pressing) endPress(); }}
                    onTouchStart={startPress}
                    onTouchEnd={() => endPress()}
                  />
                </Tooltip>
              </div>
              <input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && replyingTo) {
                    setReplyingTo(null);
                  }
                }}
                placeholder="Type a message..."
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
                shape="circle"
                icon={<SendOutlined />}
                loading={isSending}
                disabled={!newMessage.trim()}
                aria-label="Send message"
                style={{ flexShrink: 0 }}
                htmlType="submit"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
