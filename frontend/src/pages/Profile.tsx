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
} from '@ant-design/icons';
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

const resolveAvatarUrl = (profile: ProfileDTO | null): string | undefined => {
  if (!profile?.avatarUrl) return undefined;
  return profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${apiUrl}${profile.avatarUrl}`;
};
const formatCode = (code: string): string =>
  code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

const ProfilePage: React.FC = () => {
  const token = useThemeToken();
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
      message.success('New code generated');
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Failed to generate new code'));
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
      message.success(checked ? 'Presence hidden' : 'Presence visible');
    } catch {
      message.error('Failed to update presence');
    } finally {
      setUpdatingPresence(false);
    }
  };

  const handleUpdateExpressiveSettings = async () => {
    setUpdatingExpressiveSettings(true);
    try {
      await updateExpressiveChatSettings(thresholds, transitionTime);
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
          <Text strong>Number of emotion thresholds</Text>
          <Flex align="center" gap={16} style={{ marginTop: 8, marginBottom: 16 }}>
            <Slider
              min={2}
              max={5}
              onChange={setThresholds}
              value={thresholds}
              style={{ flex: 1 }}
            />
            <InputNumber
              min={2}
              max={5}
              value={thresholds}
              onChange={(val) => setThresholds(val || 5)}
            />
          </Flex>

          <Text strong>Transition time between thresholds (ms)</Text>
          <Flex align="center" gap={16} style={{ marginTop: 8 }}>
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
        </div>

      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfilePage;
