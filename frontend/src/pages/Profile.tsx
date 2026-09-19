import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Avatar,
  Typography,
  Descriptions,
  Button,
  Space,
  Flex,
  Skeleton,
  Popconfirm,
  Switch,
  Slider,
  InputNumber,
  Row,
  Col,
  Tooltip,
  Popover,
} from 'antd';
import { useAntdApp } from '../hooks/useAntdApp';
import {
  UserOutlined,
  MailOutlined,
  IdcardOutlined,
  CopyOutlined,
  ReloadOutlined,
  LogoutOutlined,
  BellOutlined,
  BellFilled,
  CameraOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  PlusOutlined,
  CloseOutlined,
  SmileOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { updatePresenceSettings } from '../services/presenceService';
import { updateExpressiveChatSettings } from '../services/userService';
import { isSoundMuted, toggleSound } from '../lib/sound';
import type { ProfileDTO } from '../types/api.types';
import { authService } from '../services/authService';
import { friendService, getFriendErrorMessage } from '../services/friendService';
import { fileService, getFileErrorMessage, validateImageFile } from '../services/fileService';
import { useThemeToken } from '../hooks/useThemeToken';
import environmentLoader from '../config/environmentLoader';

const { Title, Text } = Typography;

const { apiUrl } = environmentLoader.loadConfig();

const PRESET_PACKS = [
  { name: 'Joy', icon: '😄', emojis: ['🙂', '😀', '😄', '😆', '😂'] },
  { name: 'Love', icon: '💖', emojis: ['😊', '🥰', '😍', '💖', '❤️‍🔥'] },
  { name: 'Angry', icon: '🤬', emojis: ['😐', '😒', '😤', '😡', '🤬'] },
  { name: 'Shock', icon: '🤯', emojis: ['😮', '😲', '😳', '😱', '🤯'] },
  { name: 'Cool', icon: '😎', emojis: ['😏', '😌', '😎', '🔥', '👑'] },
  { name: 'Cry', icon: '😭', emojis: ['🥺', '😢', '😥', '😭', '💔'] },
];

const resolveAvatarUrl = (profile: ProfileDTO | null): string | undefined => {
  if (!profile?.avatarUrl) return undefined;
  return profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${apiUrl}${profile.avatarUrl}`;
};
const formatCode = (code: string): string =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

const ProfilePage: React.FC = () => {
  const token = useThemeToken();
  const isDark = useDarkMode();
  const navigate = useNavigate();
  const { message } = useAntdApp();

  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [friendCode, setFriendCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);
  const [showFriendCode, setShowFriendCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [muted, setMuted] = useState(() => isSoundMuted());

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hidePresence, setHidePresence] = useState(false);
  const [updatingPresence, setUpdatingPresence] = useState(false);

  const [thresholds, setThresholds] = useState<number>(5);
  const [transitionTime, setTransitionTime] = useState<number>(300);
  const [emojis, setEmojis] = useState<string[]>(['🙂', '😀', '😄', '😆', '😂']);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [testEmotionLevel, setTestEmotionLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [updatingExpressiveSettings, setUpdatingExpressiveSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authService
      .getProfile()
      .then((p) => {
        setProfile(p);
        setHidePresence(p.hidePresence ?? false);
        setThresholds(p.expressiveChatThresholds ?? 5);
        setTransitionTime(p.expressiveChatTransitionTime ?? 300);
        if (p.expressiveChatEmojis && p.expressiveChatEmojis.length > 0) {
          setEmojis(p.expressiveChatEmojis);
        }
      })
      .catch((err) => message.error(getFriendErrorMessage(err, 'Failed to load profile')))
      .finally(() => setLoadingProfile(false));

    friendService
      .getMyFriendCode()
      .then(setFriendCode)
      .catch((err) => message.error(getFriendErrorMessage(err, 'Failed to get friend code')))
      .finally(() => setLoadingCode(false));
  }, [message]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(friendCode);
      message.success('Friend code copied');
    } catch {
      message.error('Failed to copy');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      setFriendCode(await friendService.regenerateFriendCode());
      message.success('Friend code regenerated');
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Failed to regenerate code'));
    } finally {
      setRegenerating(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      message.error(validationError);
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploaded = await fileService.uploadImage(file, 'user_avatar');
      const updated = await authService.updateAvatar(uploaded.id);
      setProfile(updated);
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      message.success('Avatar updated');
    } catch (err) {
      message.error(getFileErrorMessage(err, 'Failed to update avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleHidePresence = async (checked: boolean) => {
    setUpdatingPresence(true);
    try {
      await updatePresenceSettings(checked);
      setHidePresence(checked);
      setProfile((prev) => (prev ? { ...prev, hidePresence: checked } : prev));
      message.success(checked ? 'Presence hidden' : 'Presence visible');
    } catch {
      message.error('Failed to update presence');
    } finally {
      setUpdatingPresence(false);
    }
  };

  const handleAddEmoji = (emojiData: EmojiClickData) => {
    if (emojis.length >= 10) {
      message.warning('Maximum 10 emojis allowed');
      return;
    }
    const updated = [...emojis, emojiData.emoji];
    setEmojis(updated);
    setPickerOpen(false);
  };

  const handleRemoveEmoji = (index: number) => {
    if (emojis.length <= 2) {
      message.warning('Minimum 2 emojis required');
      return;
    }
    const updated = emojis.filter((_, i) => i !== index);
    setEmojis(updated);
    if (thresholds > updated.length) {
      setThresholds(updated.length);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const updated = [...emojis];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, moved);
      setEmojis(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleApplyPreset = (presetEmojis: string[]) => {
    setEmojis(presetEmojis);
    if (thresholds > presetEmojis.length) {
      setThresholds(presetEmojis.length);
    }
    message.success('Applied preset pack');
  };

  const startTestPress = () => {
    setIsTesting(true);
    setTestEmotionLevel(0);
    testTimerRef.current = setInterval(() => {
      setTestEmotionLevel((prev) => Math.min(prev + 1, thresholds - 1));
    }, transitionTime);
  };

  const endTestPress = () => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    setIsTesting(false);
  };

  const handleUpdateExpressiveSettings = async () => {
    setUpdatingExpressiveSettings(true);
    try {
      const updated = await updateExpressiveChatSettings(thresholds, transitionTime, emojis);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              expressiveChatThresholds: thresholds,
              expressiveChatTransitionTime: transitionTime,
              expressiveChatEmojis: emojis,
            }
          : prev
      );
      const fullProfile = profile
        ? {
            ...profile,
            expressiveChatThresholds: thresholds,
            expressiveChatTransitionTime: transitionTime,
            expressiveChatEmojis: emojis,
          }
        : updated;
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: fullProfile }));
      message.success('Expressive chat settings saved');
    } catch {
      message.error('Failed to save settings');
    } finally {
      setUpdatingExpressiveSettings(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>My Profile</Title>
        <Popconfirm
          title="Log Out?"
          description="You will need to log in again to continue."
          okText="Log Out"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={handleLogout}
        >
          <Button danger icon={<LogoutOutlined />}>Log Out</Button>
        </Popconfirm>
      </Flex>

      <Row gutter={[24, 24]}>
        {/* Cột trái: Thông tin cá nhân */}
        <Col xs={24} md={10}>
          {/* Header card: avatar + tên + email */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        {loadingProfile ? (
          <Skeleton avatar={{ size: 96 }} active paragraph={{ rows: 2 }} title={false} />
        ) : (
          <Flex vertical align="center" gap={8} style={{ width: '100%' }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <Avatar
                size={96}
                src={resolveAvatarUrl(profile)}
                icon={!resolveAvatarUrl(profile) && !profile?.username ? <UserOutlined /> : undefined}
                style={{ border: `3px solid ${token.colorPrimary}` }}
              >
                {!resolveAvatarUrl(profile) && profile?.username && profile.username.charAt(0).toUpperCase()}
              </Avatar>
              <Button
                shape="circle"
                size="small"
                icon={<CameraOutlined />}
                loading={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'absolute', bottom: 0, right: 0 }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
            <Title level={3} style={{ margin: 0 }}>{profile?.username ?? '—'}</Title>
            <Text type="secondary">{profile?.email ?? '—'}</Text>
          </Flex>
        )}
      </Card>

      {/* Thông tin chi tiết */}
      <Card title="Account Information" style={{ marginBottom: 24 }}>
        {loadingProfile ? (
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        ) : (
          <Descriptions column={1} size="middle">
            <Descriptions.Item label={<Space><UserOutlined />Username</Space>}>
              {profile?.username ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={<Space><MailOutlined />Email</Space>}>
              {profile?.email ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={<Space><IdcardOutlined />User ID</Space>}>
              <Text copyable code style={{ fontSize: 13 }}>{profile?.userId ?? '—'}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {/* Friend code */}
      <Card
        title="Friend Code"
        style={{ marginBottom: 24 }}
        extra={
          <Popconfirm
            title="Generate new code?"
            description="The old code will no longer work."
            okText="Generate"
            cancelText="Cancel"
            onConfirm={handleRegenerate}
          >
            <Button type="text" icon={<ReloadOutlined />} loading={regenerating}>Generate new code</Button>
          </Popconfirm>
        }
      >
        {loadingCode ? (
          <Skeleton.Input active style={{ width: 200 }} />
        ) : (
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Text strong style={{ fontSize: 24, letterSpacing: 3, fontFamily: 'monospace' }}>
              {friendCode ? (showFriendCode ? formatCode(friendCode) : '••••-••••') : '••••-••••'}
            </Text>
            <Space>
              <Button
                icon={showFriendCode ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowFriendCode(!showFriendCode)}
                disabled={!friendCode}
              />
              <Button icon={<CopyOutlined />} onClick={handleCopyCode} disabled={!friendCode}>
                Copy
              </Button>
            </Space>
          </Space>
        )}
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
          Share this code with others so they can send you a friend request.
        </Text>
      </Card>
        </Col>

        {/* Cột phải: Cài đặt & Tuỳ chỉnh */}
        <Col xs={24} md={14}>
          {/* Thông báo âm thanh */}
      <Card style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center">
          <Space>
            {muted ? <BellFilled style={{ color: token.colorTextPlaceholder, fontSize: 18 }} /> : <BellOutlined style={{ fontSize: 18, color: token.colorPrimary }} />}
            <div>
              <Text strong style={{ display: 'block' }}>Notification Sound</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {muted ? 'Off' : 'On'}
              </Text>
            </div>
          </Space>
          <Button
            type={muted ? 'default' : 'primary'}
            shape="round"
            icon={muted ? <BellFilled /> : <BellOutlined />}
            onClick={() => setMuted(toggleSound())}
          >
            {muted ? 'Turn On Sound' : 'Turn Off Sound'}
          </Button>
        </Flex>
      </Card>

      {/* Trạng thái hoạt động */}
      <Card style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center">
          <Space>
            <EyeInvisibleOutlined style={{ fontSize: 18, color: hidePresence ? token.colorPrimary : token.colorTextPlaceholder }} />
            <div>
              <Text strong style={{ display: 'block' }}>Hide active status</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                When turned on, friends won't see you online
              </Text>
            </div>
          </Space>
          <Switch
            checked={hidePresence}
            onChange={handleToggleHidePresence}
            loading={updatingPresence}
          />
        </Flex>
    </Card>

      {/* Expressive Chat Settings */}
      <Card style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="flex-start" style={{ marginBottom: 16 }}>
          <Space>
            <SettingOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
            <div>
              <Text strong style={{ display: 'block' }}>Expressive Chat Settings</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Customize your long-press emotion experience
              </Text>
            </div>
          </Space>
          <Button type="primary" loading={updatingExpressiveSettings} onClick={handleUpdateExpressiveSettings}>
            Save
          </Button>
        </Flex>

        <div style={{ paddingLeft: 30 }}>
          {/* Emotion Thresholds Slider */}
          <Flex justify="space-between" align="center">
            <Text strong>Number of emotion thresholds</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Max: {Math.min(10, Math.max(2, emojis.length))} (based on pack size)
            </Text>
          </Flex>
          <Flex align="center" gap={16} style={{ marginTop: 8, marginBottom: 16 }}>
            <Slider
              min={2}
              max={Math.min(10, Math.max(2, emojis.length))}
              onChange={setThresholds}
              value={Math.min(thresholds, Math.max(2, emojis.length))}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={2}
              max={Math.min(10, Math.max(2, emojis.length))}
              value={Math.min(thresholds, Math.max(2, emojis.length))}
              onChange={(val) => setThresholds(val || 2)}
            />
          </Flex>

          {/* Transition Time Slider */}
          <Text strong>Transition time between thresholds (ms)</Text>
          <Flex align="center" gap={16} style={{ marginTop: 8, marginBottom: 24 }}>
            <Slider
              min={100}
              max={2000}
              step={50}
              onChange={setTransitionTime}
              value={transitionTime}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={100}
              max={2000}
              step={50}
              value={transitionTime}
              onChange={(val) => setTransitionTime(val || 300)}
            />
          </Flex>

          {/* Custom Emotion Pack Section */}
          <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 20 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
              <div>
                <Text strong style={{ display: 'block', fontSize: 14 }}>
                  Custom Emotion Pack ({emojis.length}/10 icons)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Icon #1 is the default chat icon (click to send immediately). Drag and drop icons to reorder.
                </Text>
              </div>
              <Popover
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                trigger="click"
                placement="bottomRight"
                content={
                  <EmojiPicker
                    theme={isDark ? Theme.DARK : Theme.LIGHT}
                    onEmojiClick={handleAddEmoji}
                    width={320}
                    height={400}
                    style={{ border: 'none' }}
                  />
                }
                overlayInnerStyle={{ padding: 0, overflow: 'hidden', borderRadius: 8 }}
              >
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  disabled={emojis.length >= 10}
                >
                  Add Icon
                </Button>
              </Popover>
            </Flex>

            {/* Emoji Chips Sequence */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: '12px',
                background: token.colorFillQuaternary,
                borderRadius: 10,
                border: `1px solid ${token.colorBorderSecondary}`,
                marginBottom: 16,
              }}
            >
              {emojis.map((emoji, idx) => {
                const isActiveInThreshold = idx < thresholds;
                const isDefault = idx === 0;
                const isDragging = draggedIndex === idx;
                const isOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <div
                    key={`${emoji}-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={(e) => handleDragLeave(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    title="Drag and drop to reorder"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isDefault ? 82 : 54,
                      height: 62,
                      borderRadius: 8,
                      background: isOver
                        ? (isDark ? 'rgba(232, 56, 90, 0.22)' : 'rgba(232, 56, 90, 0.08)')
                        : (isActiveInThreshold ? token.colorBgContainer : 'transparent'),
                      border: isOver
                        ? `2px dashed ${token.colorPrimary}`
                        : `1px solid ${isDefault ? token.colorPrimary : (isActiveInThreshold ? token.colorPrimary : token.colorBorderSecondary)}`,
                      boxShadow: isDefault
                        ? `0 2px 8px rgba(232, 56, 90, 0.2)`
                        : (isActiveInThreshold ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'),
                      opacity: isDragging ? 0.35 : (isActiveInThreshold ? 1 : 0.45),
                      transform: isOver ? 'scale(1.06)' : (isDragging ? 'scale(0.95)' : 'scale(1)'),
                      cursor: isDragging ? 'grabbing' : 'grab',
                      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                      userSelect: 'none',
                    }}
                  >
                    <Flex
                      align="center"
                      gap={2}
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: 4,
                        fontSize: 9,
                        fontWeight: 700,
                        color: isDefault ? token.colorPrimary : (isActiveInThreshold ? token.colorPrimary : token.colorTextTertiary),
                        pointerEvents: 'none',
                      }}
                    >
                      <HolderOutlined style={{ fontSize: 9, color: token.colorTextQuaternary }} />
                      <span>{isDefault ? '#1 Default' : `#${idx + 1}`}</span>
                    </Flex>
                    {emojis.length > 2 && (
                      <Tooltip title="Remove icon">
                        <Button
                          type="text"
                          size="small"
                          shape="circle"
                          icon={<CloseOutlined style={{ fontSize: 9 }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEmoji(idx);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 16,
                            height: 16,
                            minWidth: 16,
                            padding: 0,
                            color: token.colorTextTertiary,
                          }}
                        />
                      </Tooltip>
                    )}
                    <span style={{ fontSize: 24, marginTop: 12, pointerEvents: 'none' }}>{emoji}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: 18 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Quick Presets:
              </Text>
              <Flex wrap="wrap" gap={8}>
                {PRESET_PACKS.map((preset) => (
                  <Button
                    key={preset.name}
                    size="small"
                    onClick={() => handleApplyPreset(preset.emojis)}
                    style={{ borderRadius: 14, fontSize: 12 }}
                  >
                    {preset.icon} {preset.name}
                  </Button>
                ))}
              </Flex>
            </div>

            {/* Live Interactive Test Widget */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: token.colorBgContainer,
                borderRadius: 8,
                border: `1px dashed ${token.colorBorderSecondary}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                  type={isTesting ? 'primary' : 'default'}
                  shape="circle"
                  size="large"
                  icon={<SmileOutlined style={{ fontSize: 20 }} />}
                  onMouseDown={startTestPress}
                  onMouseUp={endTestPress}
                  onMouseLeave={endTestPress}
                  onTouchStart={startTestPress}
                  onTouchEnd={endTestPress}
                  style={{
                    boxShadow: isTesting ? `0 0 12px ${token.colorPrimary}` : undefined,
                    transition: 'all 0.2s',
                  }}
                />
                <div>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    {isTesting ? `Level ${testEmotionLevel + 1}/${thresholds}` : 'Hold button to test'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {isTesting ? 'Release when done' : 'Simulates Expressive Chat long-press'}
                  </Text>
                </div>
              </div>
              <div
                style={{
                  fontSize: isTesting ? 36 : 24,
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: isTesting ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                {emojis[Math.min(testEmotionLevel, emojis.length - 1)]}
              </div>
            </div>
          </div>
        </div>
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
