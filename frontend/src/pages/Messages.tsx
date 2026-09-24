import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Smile, MessageCircle, Reply, X, Sticker, Bell, BellOff, ArrowLeft, Clock } from 'lucide-react';
import { Input, Button, Badge, Avatar, Tooltip, Typography, Space, Spin, Popover, message as antdMessage } from 'antd';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { SearchOutlined, SendOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import { StickerPicker } from '../components/feature/StickerPicker';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { conversationService } from '../services/conversationService';
import { getApiErrorMessage } from '../utils/apiError';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
import { authService } from '../services/authService';
import type { ConversationDTO, MessageDTO, ConversationParticipant } from '../types/api.types';
import { useThemeToken } from '../hooks/useThemeToken';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { WS_EVENTS } from '../lib/wsEvents';
import { PresenceContext } from '../contexts/presence-context';
import { usePresence } from '../hooks/usePresence';
import { usePushNotifications } from '../shared/hooks/usePushNotifications';
import environmentLoader from '../config/environmentLoader';
import { useIsMobile } from '../hooks/useIsMobile';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { formatListTime } from '../utils/chatFormat';
import { LinkifiedText } from '../components/chat/LinkifiedText';
import { LongPressable } from '../components/chat/LongPressable';
import { MessageActionSheet } from '../components/chat/MessageActionSheet';

const { Text, Title } = Typography;

// URL tương đối (/uploads/...) từ local storage → ghép base URL của API.
const resolveAvatarUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${environmentLoader.loadConfig().apiUrl}${url}`;
  return url;
};

type MessageKind = 'text' | 'image' | 'sticker';

// Preview tin cuối trong danh sách hội thoại. Ảnh/sticker có thể không có chữ.
const messagePreview = (type: MessageKind | undefined, content: string | undefined): string => {
  if (type === 'image') return content ? `📷 ${content}` : '📷 Photo';
  if (type === 'sticker') return 'Sticker';
  return content ?? '';
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
  type: 'text' | 'image' | 'sticker';
  stickerUrl?: string | null;
  fileUrl?: string | null;
  timestamp: string;
  rawDate: string;
  replyId?: string;
  replySnippet?: string;
  replySenderId?: string;
  reactions: Array<{ userId: string; emoji: string }>;
  // Tin tạm hiển thị ngay khi bấm gửi, chờ server xác nhận (id bắt đầu bằng "temp-").
  pending?: boolean;
}

// Giới hạn độ dài tin (khớp backend) và ngưỡng bắt đầu hiện bộ đếm ký tự.
const MESSAGE_MAX_LENGTH = 4000;
const MESSAGE_COUNTER_FROM = 3500;

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
  text: msg.content ?? '',
  type: msg.type ?? 'text',
  stickerUrl: msg.stickerUrl,
  fileUrl: msg.fileUrl,
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

// Tin tối thiểu khi mở hội thoại; ít hơn thì tải thêm page trước để khung chat không trống.
const MIN_INITIAL_MESSAGES = 30;

// ── Người dùng chưa có hội thoại nào (chưa kết bạn) ──
const NoConversationsState: React.FC<{ onFindFriends: () => void }> = ({ onFindFriends }) => {
  const token = useThemeToken();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      height: 'calc(100dvh - 8rem)', padding: 32, textAlign: 'center',
      borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: token.colorPrimaryBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageCircle size={40} color={token.colorPrimary} strokeWidth={1.5} />
      </div>
      <div>
        <Title level={5} style={{ marginBottom: 4 }}>No conversations yet</Title>
        <Text type="secondary">Add a friend to start chatting. Your conversations will appear here.</Text>
      </div>
      <Button type="primary" shape="round" icon={<TeamOutlined />} onClick={onFindFriends}>
        Find friends
      </Button>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const token = useThemeToken();
  const isDark = useDarkMode();
  const pushNotifications = usePushNotifications();
  const [currentUserId, setCurrentUserId] = useState<string>(
    () => localStorage.getItem('userId') ?? ''
  );
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const navigate = useNavigate();
  // Mobile hiển thị 1 cột: danh sách hội thoại HOẶC khung chat.
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
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
    senderId: string;
  } | null>(null);
  // Tin đang mở bảng thao tác (nhấn giữ trên màn hình cảm ứng).
  const [actionSheetMessage, setActionSheetMessage] = useState<IMessage | null>(null);

  // Expressive Chat states
  const [thresholds, setThresholds] = useState<number>(5);
  const [transitionTime, setTransitionTime] = useState<number>(300);
  const [pressing, setPressing] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [emotionLevel, setEmotionLevel] = useState(0);

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emotionLevelRef = useRef<number>(0);
  const pressStartTimeRef = useRef<number>(0);
  const pointerDownHandledRef = useRef<boolean>(false);
  const DEFAULT_EXPRESSIVE_EMOJIS = ['🙂', '😀', '😄', '😆', '😂'];
  const [expressiveEmojis, setExpressiveEmojis] = useState<string[]>(DEFAULT_EXPRESSIVE_EMOJIS);
  const defaultEmoji = (expressiveEmojis.length > 0 ? expressiveEmojis[0] : DEFAULT_EXPRESSIVE_EMOJIS[0]) || '🙂';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollBottomRef = useRef<boolean>(true);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const inputRef = useRef<TextAreaRef>(null);
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
    const loadProfileData = () => {
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
    };

    loadProfileData();

    window.addEventListener('profile-updated', loadProfileData);
    return () => window.removeEventListener('profile-updated', loadProfileData);
  }, []);

  // ?c=<conversationId> (từ push notification) → mở đúng hội thoại, rồi xoá param
  // để các lần reload danh sách sau không ép chọn lại hội thoại đó.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConvId = searchParams.get('c');
  const requestedConvIdRef = useRef(requestedConvId);
  requestedConvIdRef.current = requestedConvId;

  useEffect(() => {
    if (!requestedConvId || conversations.length === 0) return;
    const target = conversations.find((c) => c.id === requestedConvId);
    if (target) {
      setSelectedConversation(target);
      setMobileView('chat');
    }
    setSearchParams({}, { replace: true });
  }, [requestedConvId, conversations, setSearchParams]);

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
        lastMessage: messagePreview(conv.lastMessageType, conv.lastMessage) || 'No messages yet',
        timestamp: formatListTime(conv.lastMessageAt),
        unread: 0,
        type: conv.type,
        memberCount: conv.participants.length,
        otherUserId: other?.userId,
        participants: conv.participants,
      };
    });
    setConversations(convData);
    setConversationsLoaded(true);
    if (convData.length > 0) {
      setSelectedConversation((prev) => {
        const requested = convData.find((c) => c.id === requestedConvIdRef.current);
        if (requested) return requested;
        if (!prev) return convData[0];
        const fresh = convData.find((c) => c.id === prev.id);
        return fresh ?? convData[0];
      });
    }
  }, [currentUserId]);

  // Phân trang ngược: mở hội thoại tải page mới nhất (+ page trước nếu quá ít tin),
  // cuộn lên đầu thì tải thêm page cũ hơn.
  const selectedConvIdRef = useRef<string | undefined>(undefined);
  selectedConvIdRef.current = selectedConversation?.id;
  const oldestPageRef = useRef(1);
  const loadingOlderRef = useRef(false);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const pages = await conversationService.getPages(conversationId);
      let pageNumber = pages.reduce((max, p) => Math.max(max, p.pageNumber), 0);
      let dtos: MessageDTO[] = [];
      if (pageNumber > 0) {
        dtos = await conversationService.getMessagesByPage(conversationId, pageNumber);
        if (dtos.length < MIN_INITIAL_MESSAGES && pageNumber > 1) {
          pageNumber -= 1;
          const older = await conversationService.getMessagesByPage(conversationId, pageNumber);
          dtos = [...older, ...dtos];
        }
      }
      if (selectedConvIdRef.current !== conversationId) return;
      oldestPageRef.current = Math.max(pageNumber, 1);
      setHasOlderMessages(pageNumber > 1);
      setMessages(dtos.map((msg) => mapMessage(msg, currentUserId)));
    },
    [currentUserId]
  );

  const loadOlderMessages = useCallback(async () => {
    const conversationId = selectedConvIdRef.current;
    if (!conversationId || loadingOlderRef.current || oldestPageRef.current <= 1) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const pageNumber = oldestPageRef.current - 1;
      const dtos = await conversationService.getMessagesByPage(conversationId, pageNumber);
      if (selectedConvIdRef.current !== conversationId) return;
      const el = scrollContainerRef.current;
      if (el) scrollRestoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
      oldestPageRef.current = pageNumber;
      setHasOlderMessages(pageNumber > 1);
      setMessages((prev) => [...dtos.map((msg) => mapMessage(msg, currentUserId)), ...prev]);
    } catch (err) {
      console.error('Failed to load older messages', err);
      antdMessage.error('Failed to load older messages');
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [currentUserId]);

  // Giữ nguyên vị trí đang đọc sau khi chèn tin cũ lên đầu danh sách.
  useLayoutEffect(() => {
    const restore = scrollRestoreRef.current;
    const el = scrollContainerRef.current;
    if (!restore || !el) return;
    scrollRestoreRef.current = null;
    el.scrollTop = el.scrollHeight - restore.height + restore.top;
  }, [messages]);

  // Ảnh tải xong sau khi đã cuộn xuống cuối → nội dung dài thêm. Nếu người dùng đang ở
  // gần cuối (khoảng cách ≤ chiều cao ảnh tối đa + lề) thì cuộn tiếp để ảnh không bị che.
  const handleImageLoad = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 480) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (hasOlderMessages && e.currentTarget.scrollTop < 80) loadOlderMessages();
  };

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
    // Chờ spinner biến mất: lúc đang loading, danh sách chưa render nên cuộn không có tác dụng.
    if (messages.length === 0 || loadingMessages) return;

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
  }, [messages, isNearBottom, loadingMessages]);

  // Phụ thuộc vào id, không phải object: reload danh sách hội thoại (vd khi socket
  // reconnect) tạo object mới cùng id — không được tải lại tin và mất vị trí cuộn.
  const selectedConversationId = selectedConversation?.id;
  useEffect(() => {
    const conversationId = selectedConversationId;
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    setLoadingMessages(true);
    loadMessages(conversationId)
      .catch((err) => { if (!cancelled) { console.error(err); setMessages([]); } })
      .finally(() => { if (!cancelled) setLoadingMessages(false); });
    return () => { cancelled = true; };
  }, [selectedConversationId, loadMessages]);

  useSocketConnect(() => {
    loadConversations().catch(console.error);
    if (selectedConversation?.id) loadMessages(selectedConversation.id).catch(console.error);
  });

  useSocketEvent(WS_EVENTS.MESSAGE_NEW, (payload) => {
    // Cập nhật preview và đưa hội thoại vừa có tin lên đầu danh sách.
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.conversationId);
      if (idx === -1) return prev;
      const updated = {
        ...prev[idx],
        lastMessage: messagePreview(payload.type as MessageKind, payload.content),
        timestamp: formatListTime(payload.createdAt),
      };
      return [updated, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    if (payload.conversationId !== selectedConversation?.id) return;
    const incoming: IMessage = {
      id: payload.messageId,
      sender: payload.senderId === currentUserId ? 'me' : payload.senderId,
      text: payload.content ?? '',
      type: (payload.type as MessageKind) ?? 'text',
      stickerUrl: payload.stickerUrl,
      fileUrl: payload.fileUrl,
      timestamp: formatTime(payload.createdAt),
      rawDate: payload.createdAt ?? new Date().toISOString(),
      replyId: payload.replyId,
      replySnippet: payload.replySnippet,
      replySenderId: payload.replySenderId,
      reactions: [],
    };
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      // Tin của chính mình có thể về qua socket trước khi REST trả lời → thay tin tạm tương ứng.
      if (incoming.sender === 'me') {
        const tempIdx = prev.findIndex((m) => m.pending && m.text === incoming.text);
        if (tempIdx !== -1) return prev.map((m, i) => (i === tempIdx ? incoming : m));
      }
      return [...prev, incoming];
    });
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

  const startReply = (msg: IMessage) => {
    const isMine = msg.sender === 'me';
    const participant = selectedConversation?.participants.find((p) => p.userId === msg.sender);
    setReplyingTo({
      id: msg.id,
      text: msg.text || (msg.type === 'image' ? '[Photo]' : msg.type === 'sticker' ? '[Sticker]' : ''),
      senderName: isMine ? 'You' : participant?.username || 'User',
      senderId: isMine ? currentUserId : msg.sender,
    });
    inputRef.current?.focus();
  };

  const copyMessageText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      antdMessage.success('Copied');
    } catch {
      antdMessage.error('Could not copy text');
    }
  };

  const openConversation = (convo: IConversation) => {
    setSelectedConversation(convo);
    setMobileView('chat');
  };

  const showSendError = (err: unknown) => {
    antdMessage.error(
      getApiErrorMessage(err, 'Failed to send message. Please try again.', {
        FriendshipBlocked: 'You can no longer message this person.',
      }),
    );
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>, contentOverride?: string) => {
    e?.preventDefault();
    const content = contentOverride ?? newMessage;
    if (!content.trim() || isSending || !selectedConversation) return;
    
    const replyToRestore = replyingTo;
    const replyIdToSend = replyingTo?.id;
    // Nếu không có override, reset newMessage (từ ô input) và clear replyingTo
    if (!contentOverride) {
      setNewMessage('');
      setReplyingTo(null);
    }
    setIsSending(true);
    // Hiện ngay tin tạm (mờ, "Sending…"); thay bằng tin thật khi REST hoặc socket trả về.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: 'me',
        text: content.trim(),
        type: 'text',
        timestamp: formatTime(now),
        rawDate: now,
        replyId: replyToRestore?.id,
        replySnippet: replyToRestore?.text.slice(0, 80),
        replySenderId: replyToRestore?.senderId,
        reactions: [],
        pending: true,
      },
    ]);
    try {
      const saved = await conversationService.sendMessage({
        conversationId: selectedConversation.id,
        content,
        replyId: replyIdToSend,
      });
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id)
          ? prev.filter((m) => m.id !== tempId)
          : prev.map((m) => (m.id === tempId ? mapMessage(saved, currentUserId) : m)),
      );
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showSendError(err);
      // Trả lại nội dung đã gõ để người dùng gửi lại, trừ khi họ đã gõ tin khác.
      if (!contentOverride) {
        setNewMessage((current) => current || content);
        setReplyingTo((current) => current ?? replyToRestore);
      }
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendSticker = async (stickerId: string) => {
    if (isSending || !selectedConversation) return;
    setIsSending(true);
    try {
      await conversationService.sendMessage({
        conversationId: selectedConversation.id,
        type: 'sticker',
        stickerId,
      });
    } catch (err) {
      console.error('Failed to send sticker', err);
      showSendError(err);
    } finally {
      setIsSending(false);
      setStickerPickerOpen(false);
    }
  };

  const startPress = () => {
    if (isSending || !selectedConversation) return;
    pointerDownHandledRef.current = true;
    pressStartTimeRef.current = Date.now();
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
    
    const duration = Date.now() - pressStartTimeRef.current;
    const isQuickClick = emotionLevelRef.current === 0 || duration < 250;
    const activeEmojis = expressiveEmojis.length > 0 ? expressiveEmojis : DEFAULT_EXPRESSIVE_EMOJIS;

    let finalMessage = '';
    if (isQuickClick) {
      // Click vào gửi ngay icon mặc định (icon đầu tiên trong bộ setup)
      finalMessage = activeEmojis[0];
    } else {
      // Nhấn giữ (Expressive Chat) gửi icon theo cấp độ cảm xúc
      const chosenEmoji = activeEmojis[Math.min(emotionLevelRef.current, activeEmojis.length - 1)];
      const trimmed = newMessage.trim();
      finalMessage = trimmed ? `${trimmed} ${chosenEmoji}` : chosenEmoji;
      if (trimmed) setNewMessage('');
    }
    
    setPressing(false);
    setEmotionLevel(0);
    emotionLevelRef.current = 0;

    if (finalMessage) {
      handleSendMessage(undefined, finalMessage);
    }

    setTimeout(() => {
      pointerDownHandledRef.current = false;
    }, 200);
  };

  const handleDefaultEmojiClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pointerDownHandledRef.current && !isSending && selectedConversation) {
      const activeEmojis = expressiveEmojis.length > 0 ? expressiveEmojis : DEFAULT_EXPRESSIVE_EMOJIS;
      handleSendMessage(undefined, activeEmojis[0]);
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

  if (conversationsLoaded && conversations.length === 0) {
    return <NoConversationsState onFindFriends={() => navigate('/friends')} />;
  }

  const showList = !isMobile || mobileView === 'list';
  const showChat = !isMobile || mobileView === 'chat';

  return (
    // 100dvh: trên mobile không bị thanh địa chỉ của trình duyệt che mất phần ô nhập.
    <div style={{ display: 'flex', height: 'calc(100dvh - 8rem)', overflow: 'hidden', borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

      {/* ── Conversation List ── */}
      <div style={{
        width: isMobile ? '100%' : '28%',
        minWidth: isMobile ? 0 : 240,
        borderRight: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`,
        display: showList ? 'flex' : 'none',
        flexDirection: 'column',
        background: token.colorBgContainer,
      }}>

        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>Chats</Title>
            <Space>
              <Tooltip title={!pushNotifications.isSupported ? "Push notifications are not supported in this browser (requires HTTPS or localhost)" : (pushNotifications.isSubscribed ? "Notifications enabled" : "Enable notifications")}>
                <Button
                  type="text"
                  size="small"
                  onClick={pushNotifications.subscribeToPush}
                  disabled={!pushNotifications.isSupported || pushNotifications.isSubscribed || pushNotifications.isLoading}
                  icon={pushNotifications.isSubscribed ? <Bell size={16} color={token.colorSuccess} /> : <BellOff size={16} color={!pushNotifications.isSupported ? token.colorTextPlaceholder : undefined} />}
                  aria-label="Push Notifications"
                  loading={pushNotifications.isLoading}
                />
              </Tooltip>
            </Space>
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
                role="button"
                tabIndex={0}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`${convo.name}. ${convo.lastMessage}${convo.timestamp ? `. ${convo.timestamp}` : ''}`}
                className="conversation-item"
                onClick={() => openConversation(convo)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openConversation(convo);
                  }
                }}
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
      <div style={{ flex: 1, display: showChat ? 'flex' : 'none', flexDirection: 'column', minWidth: 0, background: token.colorBgLayout }}>

        {/* Chat Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '8px 12px' : '10px 20px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <Space size={isMobile ? 8 : 12} style={{ minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                shape="circle"
                icon={<ArrowLeft size={18} />}
                aria-label="Back to conversations"
                onClick={() => setMobileView('list')}
              />
            )}
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
        </div>

        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          className="chat-scroll"
          onScroll={handleMessagesScroll}
          style={{ flex: 1, padding: isMobile ? '12px' : '20px 24px', overflowY: 'auto' }}
        >
          {/* height 0 + sticky: spinner không làm đổi scrollHeight → không lệch vị trí khi chèn tin cũ */}
          {loadingOlder && (
            <div style={{ position: 'sticky', top: 0, height: 0, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
              <Spin size="small" />
            </div>
          )}
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

              const messageActions = msg.pending ? null : (
                <div
                  className="message-actions"
                  style={{
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
                      aria-label="Reply"
                      onClick={() => startReply(msg)}
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
                    styles={{ container: { padding: 0, overflow: 'hidden', borderRadius: 8 } }}
                    trigger="click"
                    placement={isMe ? 'left' : 'right'}
                  >
                    <Button
                      type="text"
                      shape="circle"
                      icon={<Smile size={16} />}
                      style={{ color: token.colorTextSecondary }}
                      aria-label="Add reaction"
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
                      maxWidth: isMobile ? '78%' : 460,
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {/* Tên người gửi: chỉ ở nhóm, tin đầu của mỗi chuỗi */}
                    {selectedConversation?.type === 'group' && !isMe && isFirstInGroup && (
                      <Text type="secondary" style={{ fontSize: 12, margin: '0 0 2px 4px' }}>
                        {senderParticipant?.username || 'Unknown'}
                      </Text>
                    )}
                    {/* Bubble — nhấn giữ trên cảm ứng mở bảng thao tác */}
                    <LongPressable
                      className="message-bubble"
                      disabled={msg.pending}
                      onLongPress={() => setActionSheetMessage(msg)}
                    >
                    <Tooltip
                      title={msg.pending ? 'Sending…' : msg.timestamp}
                      placement="top"
                      mouseEnterDelay={0.4}
                      // Trên cảm ứng tooltip bật khi chạm và che nội dung — tắt hẳn.
                      open={isMobile ? false : undefined}
                    >
                      <div
                        id={`msg-${msg.id}`}
                        style={{
                          padding: msg.type === 'sticker' ? 0 : msg.type === 'image' ? 4 : '9px 14px',
                          borderRadius: msg.type === 'sticker' 
                            ? 8 
                            : (isMe 
                                ? `18px ${isFirstInGroup ? '18px' : '4px'} 4px 18px` 
                                : `${isFirstInGroup ? '18px' : '4px'} 18px 18px 4px`),
                          background: msg.type === 'sticker' 
                            ? 'transparent' 
                            : (isMe ? token.colorPrimary : token.colorBgContainer),
                          border: msg.type === 'sticker' 
                            ? 'none' 
                            : (isMe ? 'none' : `1px solid ${highlightedMessageId === msg.id ? token.colorPrimary : token.colorBorderSecondary}`),
                          boxShadow: msg.type === 'sticker' 
                            ? 'none' 
                            : (highlightedMessageId === msg.id
                                ? `0 0 0 3px ${token.colorPrimary}, 0 4px 14px rgba(232, 56, 90, 0.4)`
                                : '0 1px 3px rgba(0,0,0,0.07)'),
                          transition: 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.2s',
                          wordBreak: 'break-word',
                          opacity: msg.pending ? 0.6 : 1,
                          maxWidth: '100%',
                        }}
                      >
                        {/* Quoted Message Snippet */}
                        {msg.replySnippet && (
                          <div
                            className="reply-quote"
                            role="button"
                            tabIndex={0}
                            aria-label="Go to the original message"
                            onClick={() => handleScrollToOriginal(msg.replyId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleScrollToOriginal(msg.replyId);
                              }
                            }}
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
                              minWidth: 0,
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
                                maxWidth: '100%',
                              }}
                            >
                              {msg.replySnippet}
                            </span>
                          </div>
                        )}
                        {msg.type === 'sticker' && msg.stickerUrl ? (
                          <img
                            src={msg.stickerUrl}
                            alt="Sticker"
                            style={{
                              maxWidth: 160,
                              borderRadius: 8,
                              display: 'block'
                            }}
                          />
                        ) : msg.type === 'image' && msg.fileUrl ? (
                          <>
                            <a href={resolveAvatarUrl(msg.fileUrl)} target="_blank" rel="noopener noreferrer">
                              <img
                                src={resolveAvatarUrl(msg.fileUrl)}
                                alt={msg.text || 'Photo'}
                                onLoad={handleImageLoad}
                                style={{ display: 'block', maxWidth: '100%', width: 280, maxHeight: 320, objectFit: 'cover', borderRadius: 14 }}
                              />
                            </a>
                            {msg.text && (
                              <Text style={{ display: 'block', color: isMe ? '#fff' : undefined, lineHeight: 1.5, whiteSpace: 'pre-wrap', padding: '6px 10px 4px' }}>
                                <LinkifiedText text={msg.text} linkColor={isMe ? '#fff' : token.colorPrimary} />
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text style={{ display: 'block', color: isMe ? '#fff' : undefined, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            <LinkifiedText text={msg.text} linkColor={isMe ? '#fff' : token.colorPrimary} />
                          </Text>
                        )}
                      </div>
                    </Tooltip>
                    </LongPressable>
                    {msg.pending && (
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> Sending…
                      </Text>
                    )}

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
                              <button
                                type="button"
                                className="reaction-chip"
                                aria-pressed={iReacted}
                                aria-label={`${emoji} ${userIds.length}. ${iReacted ? 'Remove your reaction' : 'React'}`}
                                onClick={() => handleReact(msg.id, emoji)}
                                style={{
                                  font: 'inherit',
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
                              </button>
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
              // Ô nhập nhiều dòng giãn lên trên; các nút giữ ở đáy.
              alignItems: 'flex-end',
              gap: 6,
              padding: '6px 6px 6px 12px',
              borderRadius: 20,
              border: `1.5px solid ${token.colorBorderSecondary}`,
              background: token.colorFillQuaternary,
              transition: 'border-color 0.2s',
            }}>
              <Popover
                content={<StickerPicker onSelect={handleSendSticker} />}
                trigger="click"
                open={stickerPickerOpen}
                onOpenChange={setStickerPickerOpen}
                placement="topLeft"
                arrow={false}
              >
                <Tooltip title="Send a sticker">
                  <Button type="text" size="small" icon={<Sticker size={18} />} aria-label="Send sticker" />
                </Tooltip>
              </Popover>
              <div style={{ position: 'relative' }}>
                {pressing && emotionLevel > 0 && (
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
                <Tooltip title={`Quick send ${defaultEmoji} • Hold to send a stronger emotion`} placement="bottom">
                  <Button 
                    type="text" 
                    size="small" 
                    htmlType="button"
                    aria-label={`Send ${defaultEmoji}`} 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      width: 28,
                      height: 28,
                      fontSize: 18,
                      lineHeight: 1,
                      cursor: 'pointer',
                      borderRadius: '50%',
                      transition: 'transform 0.15s ease',
                      transform: pressing ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onMouseDown={startPress}
                    onMouseUp={() => endPress()}
                    onMouseLeave={() => { if (pressing) endPress(); }}
                    onTouchStart={startPress}
                    onTouchEnd={() => endPress()}
                    onClick={handleDefaultEmojiClick}
                  >
                    <span>{defaultEmoji}</span>
                  </Button>
                </Tooltip>
              </div>
              <Input.TextArea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && replyingTo) {
                    setReplyingTo(null);
                    return;
                  }
                  // Enter gửi, Shift+Enter xuống dòng. Không gửi khi bộ gõ (Telex/VNI, IME)
                  // đang ghép chữ — Enter lúc đó chỉ để xác nhận ký tự.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                aria-label="Message input"
                autoSize={{ minRows: 1, maxRows: 5 }}
                maxLength={MESSAGE_MAX_LENGTH}
                variant="borderless"
                style={{ flex: 1, fontSize: 14, padding: '4px 0', resize: 'none' }}
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
            {newMessage.length > MESSAGE_COUNTER_FROM && (
              <Text
                type={newMessage.length >= MESSAGE_MAX_LENGTH ? 'danger' : 'secondary'}
                style={{ display: 'block', textAlign: 'right', fontSize: 11, marginTop: 4 }}
                aria-live="polite"
              >
                {newMessage.length}/{MESSAGE_MAX_LENGTH}
              </Text>
            )}
          </form>
        </div>
      </div>

      <MessageActionSheet
        open={!!actionSheetMessage}
        isDark={isDark}
        canCopy={!!actionSheetMessage?.text}
        onClose={() => setActionSheetMessage(null)}
        onReact={(emoji) => actionSheetMessage && handleReact(actionSheetMessage.id, emoji)}
        onReply={() => actionSheetMessage && startReply(actionSheetMessage)}
        onCopy={() => actionSheetMessage && copyMessageText(actionSheetMessage.text)}
      />
    </div>
  );
};

export default MessagesPage;
