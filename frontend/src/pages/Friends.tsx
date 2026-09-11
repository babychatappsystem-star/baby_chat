import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  List,
  Avatar,
  Button,
  Input,
  Badge,
  Typography,
  Space,
  Empty,
  Card,
  Tag,
  Flex,
  Popconfirm,
} from 'antd';
import { useAntdApp } from '../hooks/useAntdApp';
import {
  SearchOutlined,
  UserAddOutlined,
  CheckOutlined,
  CloseOutlined,
  MessageOutlined,
  CopyOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type {
  FriendshipDTO,
  UserSearchResultDTO,
} from '../types/api.types';
import { friendService, getFriendErrorMessage } from '../services/friendService';
import { useThemeToken } from '../hooks/useThemeToken';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { WS_EVENTS } from '../lib/wsEvents';

const { Title, Text } = Typography;

const avatarFor = (id: string): string => `https://i.pravatar.cc/150?u=${id}`;
const displayName = (name: string | null): string => name ?? 'Deleted user';
const formatCode = (code: string): string =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

type FindMode = 'email' | 'code';

const FriendsPage: React.FC = () => {
  const token = useThemeToken();
  const navigate = useNavigate();
  const { message } = useAntdApp();

  // My friend code
  const [myCode, setMyCode] = useState<string>('');
  const [codeVisible, setCodeVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Lists
  const [incoming, setIncoming] = useState<FriendshipDTO[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipDTO[]>([]);
  const [friends, setFriends] = useState<FriendshipDTO[]>([]);

  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Track in-flight actions to disable buttons (by friendship/user id)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const setBusy = (id: string, on: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // Friends search (client-side filter)
  const [friendSearch, setFriendSearch] = useState('');

  // Add friend (email / code lookup)
  const [findMode, setFindMode] = useState<FindMode>('code');
  const [query, setQuery] = useState('');
  const [finding, setFinding] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const [foundUser, setFoundUser] = useState<UserSearchResultDTO | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // ── Loaders ──
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const [inc, out] = await Promise.all([
        friendService.getIncomingRequests(),
        friendService.getOutgoingRequests(),
      ]);
      setIncoming(inc);
      setOutgoing(out);
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Không tải được lời mời'));
    } finally {
      setLoadingRequests(false);
    }
  }, [message]);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      setFriends(await friendService.getFriends());
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Không tải được danh sách bạn'));
    } finally {
      setLoadingFriends(false);
    }
  }, [message]);

  useEffect(() => {
    friendService
      .getMyFriendCode()
      .then(setMyCode)
      .catch((err) => message.error(getFriendErrorMessage(err, 'Không lấy được mã kết bạn')));
    loadRequests();
    loadFriends();
  }, [loadRequests, loadFriends, message]);

  // Reconnect: refresh để bù event đã miss lúc offline.
  useSocketConnect(() => {
    loadRequests();
    loadFriends();
  });

  // Realtime: có người gửi lời mời kết bạn cho mình.
  useSocketEvent(WS_EVENTS.FRIENDSHIP_REQUEST_RECEIVED, (payload) => {
    message.info(`${payload.requesterUsername} đã gửi cho bạn lời mời kết bạn`);
    loadRequests();
  });

  // Realtime: lời mời mình gửi vừa được chấp nhận (BE cũng tự tạo conversation).
  useSocketEvent(WS_EVENTS.FRIENDSHIP_ACCEPTED, (payload) => {
    message.success(`${payload.recipientUsername} đã chấp nhận lời mời kết bạn`);
    loadRequests();
    loadFriends();
  });

  // ── Friend code actions ──
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      message.success('Đã sao chép mã kết bạn');
    } catch {
      message.error('Không sao chép được');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      setMyCode(await friendService.regenerateFriendCode());
      message.success('Đã tạo mã mới');
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Không tạo được mã mới'));
    } finally {
      setRegenerating(false);
    }
  };

  // ── Add friend (lookup + send) ──
  const handleFind = async () => {
    const q = query.trim();
    if (!q || finding) return;
    setFinding(true);
    setSearchedOnce(true);
    setFoundUser(null);
    try {
      const result =
        findMode === 'email'
          ? await friendService.searchUserByEmail(q)
          : await friendService.getUserByFriendCode(q);
      setFoundUser(result);
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Tìm kiếm thất bại'));
    } finally {
      setFinding(false);
    }
  };

  const handleSendRequest = async (user: UserSearchResultDTO) => {
    setSendingTo(user.id);
    try {
      await friendService.sendRequestByUserId(user.id);
      message.success(`Đã gửi lời mời tới ${user.username}`);
      setFoundUser(null);
      setQuery('');
      setSearchedOnce(false);
      loadRequests(); // refresh outgoing
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Gửi lời mời thất bại'));
    } finally {
      setSendingTo(null);
    }
  };

  // ── Request actions ──
  const handleAccept = async (req: FriendshipDTO) => {
    setBusy(req.id, true);
    try {
      await friendService.acceptRequest(req.id);
      setIncoming((prev) => prev.filter((r) => r.id !== req.id));
      message.success(`Đã kết bạn với ${displayName(req.friend.username)}`);
      loadFriends(); // bạn mới + conversation mới
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Chấp nhận thất bại'));
    } finally {
      setBusy(req.id, false);
    }
  };

  const handleReject = async (req: FriendshipDTO) => {
    setBusy(req.id, true);
    try {
      await friendService.rejectRequest(req.id);
      setIncoming((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Từ chối thất bại'));
    } finally {
      setBusy(req.id, false);
    }
  };

  const handleCancel = async (req: FriendshipDTO) => {
    setBusy(req.id, true);
    try {
      await friendService.cancelRequest(req.id);
      setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Hủy lời mời thất bại'));
    } finally {
      setBusy(req.id, false);
    }
  };

  const handleUnfriend = async (fr: FriendshipDTO) => {
    setBusy(fr.id, true);
    try {
      await friendService.unfriend(fr.friend.userId);
      setFriends((prev) => prev.filter((f) => f.id !== fr.id));
      message.success(`Đã hủy kết bạn với ${displayName(fr.friend.username)}`);
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Hủy kết bạn thất bại'));
    } finally {
      setBusy(fr.id, false);
    }
  };

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.friend.username ?? '').toLowerCase().includes(q));
  }, [friends, friendSearch]);

  // ── Tab contents ──
  const requestsTab = (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Incoming requests</Text>
        <List
          loading={loadingRequests}
          dataSource={incoming}
          locale={{ emptyText: 'Không có lời mời nào đang chờ duyệt' }}
          renderItem={(req) => (
            <List.Item
              actions={[
                <Button
                  key="accept"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busyIds.has(req.id)}
                  onClick={() => handleAccept(req)}
                >
                  Accept
                </Button>,
                <Button
                  key="reject"
                  icon={<CloseOutlined />}
                  disabled={busyIds.has(req.id)}
                  onClick={() => handleReject(req)}
                >
                  Reject
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={avatarFor(req.friend.userId)} size={48} />}
                title={<Text strong>{displayName(req.friend.username)}</Text>}
                description="Muốn kết bạn với bạn"
              />
            </List.Item>
          )}
        />
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Sent requests</Text>
        <List
          loading={loadingRequests}
          dataSource={outgoing}
          locale={{ emptyText: 'Bạn chưa gửi lời mời nào' }}
          renderItem={(req) => (
            <List.Item
              actions={[
                <Button
                  key="cancel"
                  danger
                  icon={<CloseOutlined />}
                  loading={busyIds.has(req.id)}
                  onClick={() => handleCancel(req)}
                >
                  Cancel
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={avatarFor(req.friend.userId)} size={48} />}
                title={<Text strong>{displayName(req.friend.username)}</Text>}
                description={<Tag color="orange">Đang chờ duyệt</Tag>}
              />
            </List.Item>
          )}
        />
      </div>
    </Flex>
  );

  const addFriendTab = (
    <Flex vertical gap={16} style={{ width: '100%', maxWidth: 460 }}>
      <Space>
        <Button type={findMode === 'code' ? 'primary' : 'default'} onClick={() => { setFindMode('code'); setSearchedOnce(false); setFoundUser(null); }}>
          Bằng mã kết bạn
        </Button>
        <Button type={findMode === 'email' ? 'primary' : 'default'} onClick={() => { setFindMode('email'); setSearchedOnce(false); setFoundUser(null); }}>
          Bằng email
        </Button>
      </Space>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder={findMode === 'code' ? 'Nhập mã kết bạn (vd A7F2-K9XP)' : 'Nhập địa chỉ email'}
          prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleFind}
          allowClear
          aria-label="Tìm người để kết bạn"
        />
        <Button type="primary" loading={finding} onClick={handleFind}>Tìm</Button>
      </Space.Compact>

      {searchedOnce && !finding && (
        foundUser ? (
          <Card size="small">
            <List.Item
              style={{ padding: 0, border: 'none' }}
              actions={[
                <Button
                  key="send"
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={sendingTo === foundUser.id}
                  onClick={() => handleSendRequest(foundUser)}
                >
                  Gửi lời mời
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar src={avatarFor(foundUser.id)} size={48} />}
                title={<Text strong>{foundUser.username}</Text>}
                description={foundUser.email}
              />
            </List.Item>
          </Card>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={findMode === 'code' ? 'Không tìm thấy ai với mã này' : 'Không tìm thấy ai với email này'}
          />
        )
      )}
    </Flex>
  );

  const friendsTab = (
    <>
      <Input
        placeholder="Tìm trong danh sách bạn"
        prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
        value={friendSearch}
        onChange={(e) => setFriendSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 16, borderRadius: 999, maxWidth: 360 }}
        aria-label="Tìm bạn"
      />
      <List
        loading={loadingFriends}
        dataSource={filteredFriends}
        locale={{ emptyText: friendSearch ? 'Không có bạn nào khớp' : 'Bạn chưa có người bạn nào' }}
        renderItem={(fr) => (
          <List.Item
            actions={[
              <Button
                key="message"
                icon={<MessageOutlined />}
                onClick={() => navigate('/messages')}
              >
                Nhắn tin
              </Button>,
              <Popconfirm
                key="unfriend"
                title="Hủy kết bạn?"
                description={`Bạn chắc chắn muốn hủy kết bạn với ${displayName(fr.friend.username)}?`}
                okText="Hủy kết bạn"
                cancelText="Không"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleUnfriend(fr)}
              >
                <Button danger icon={<UserDeleteOutlined />} loading={busyIds.has(fr.id)}>
                  Hủy kết bạn
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar src={avatarFor(fr.friend.userId)} size={48} />}
              title={<Text strong>{displayName(fr.friend.username)}</Text>}
            />
          </List.Item>
        )}
      />
    </>
  );

  const tabItems = [
    {
      key: 'requests',
      label: (
        <Space size={8}>
          Friend requests
          {incoming.length > 0 && <Badge count={incoming.length} />}
        </Space>
      ),
      children: requestsTab,
    },
    { key: 'add', label: 'Add friend', children: addFriendTab },
    {
      key: 'friends',
      label: (
        <Space size={8}>
          All friends
          {friends.length > 0 && <Badge count={friends.length} color={token.colorPrimary} />}
        </Space>
      ),
      children: friendsTab,
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 0' }}>
      <Title level={2} style={{ marginBottom: 16 }}>Friends</Title>

      {/* Mã kết bạn của tôi */}
      <Card
        size="small"
        style={{ marginBottom: 24, background: token.colorFillQuaternary }}
        styles={{ body: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } }}
      >
        <div>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Mã kết bạn của bạn</Text>
          <Text strong style={{ fontSize: 20, letterSpacing: 2, fontFamily: 'monospace' }}>
            {codeVisible && myCode ? formatCode(myCode) : '••••-••••'}
          </Text>
          <Button
            type="text"
            icon={codeVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setCodeVisible((v) => !v)}
            aria-label={codeVisible ? 'Hide friend code' : 'Show friend code'}
          />
        </div>
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleCopyCode} disabled={!myCode}>
            Sao chép
          </Button>
          <Popconfirm
            title="Tạo mã mới?"
            description="Mã cũ sẽ không còn dùng được nữa."
            okText="Tạo mới"
            cancelText="Không"
            onConfirm={handleRegenerate}
          >
            <Button icon={<ReloadOutlined />} loading={regenerating}>Tạo mã mới</Button>
          </Popconfirm>
        </Space>
      </Card>

      <Tabs defaultActiveKey="requests" items={tabItems} />
    </div>
  );
};

export default FriendsPage;
