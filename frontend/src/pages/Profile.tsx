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
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { updatePresenceSettings } from '../services/presenceService';
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
  const [regenerating, setRegenerating] = useState(false);
  const [muted, setMuted] = useState(() => isSoundMuted());

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hidePresence, setHidePresence] = useState(false);
  const [updatingPresence, setUpdatingPresence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authService
      .getProfile()
      .then((p) => {
        setProfile(p);
        setHidePresence(p.hidePresence ?? false);
      })
      .catch((err) => message.error(getFriendErrorMessage(err, 'Không tải được thông tin tài khoản')))
      .finally(() => setLoadingProfile(false));

    friendService
      .getMyFriendCode()
      .then(setFriendCode)
      .catch((err) => message.error(getFriendErrorMessage(err, 'Không lấy được mã kết bạn')))
      .finally(() => setLoadingCode(false));
  }, [message]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(friendCode);
      message.success('Đã sao chép mã kết bạn');
    } catch {
      message.error('Không sao chép được');
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      setFriendCode(await friendService.regenerateFriendCode());
      message.success('Đã tạo mã mới');
    } catch (err) {
      message.error(getFriendErrorMessage(err, 'Không tạo được mã mới'));
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
      message.success('Đã cập nhật ảnh đại diện');
    } catch (err) {
      message.error(getFileErrorMessage(err, 'Cập nhật ảnh đại diện thất bại'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleHidePresence = async (checked: boolean) => {
    setUpdatingPresence(true);
    try {
      await updatePresenceSettings(checked);
      setHidePresence(checked);
      message.success(checked ? 'Đã bật ẩn trạng thái' : 'Đã tắt ẩn trạng thái');
    } catch (err) {
      message.error('Không thể cập nhật trạng thái');
    } finally {
      setUpdatingPresence(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 0' }}>
      <Title level={2} style={{ marginBottom: 24 }}>Hồ sơ của tôi</Title>

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
      <Card title="Thông tin tài khoản" style={{ marginBottom: 24 }}>
        {loadingProfile ? (
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        ) : (
          <Descriptions column={1} size="middle">
            <Descriptions.Item label={<Space><UserOutlined />Tên người dùng</Space>}>
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
        title="Mã kết bạn"
        style={{ marginBottom: 24 }}
        extra={
          <Popconfirm
            title="Tạo mã mới?"
            description="Mã cũ sẽ không còn dùng được nữa."
            okText="Tạo mới"
            cancelText="Không"
            onConfirm={handleRegenerate}
          >
            <Button type="text" icon={<ReloadOutlined />} loading={regenerating}>Tạo mã mới</Button>
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
              {friendCode ? formatCode(friendCode) : '••••-••••'}
            </Text>
            <Button icon={<CopyOutlined />} onClick={handleCopyCode} disabled={!friendCode}>
              Sao chép
            </Button>
          </Space>
        )}
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
          Chia sẻ mã này để người khác gửi lời mời kết bạn cho bạn.
        </Text>
      </Card>

      {/* Thông báo âm thanh */}
      <Card style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center">
          <Space>
            {muted ? <BellFilled style={{ color: token.colorTextPlaceholder, fontSize: 18 }} /> : <BellOutlined style={{ fontSize: 18, color: token.colorPrimary }} />}
            <div>
              <Text strong style={{ display: 'block' }}>Âm thanh thông báo</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {muted ? 'Đang tắt' : 'Đang bật'}
              </Text>
            </div>
          </Space>
          <Button
            type={muted ? 'default' : 'primary'}
            shape="round"
            icon={muted ? <BellFilled /> : <BellOutlined />}
            onClick={() => setMuted(toggleSound())}
          >
            {muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          </Button>
        </Flex>
      </Card>

      {/* Trạng thái hoạt động */}
      <Card style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center">
          <Space>
            <EyeInvisibleOutlined style={{ fontSize: 18, color: hidePresence ? token.colorPrimary : token.colorTextPlaceholder }} />
            <div>
              <Text strong style={{ display: 'block' }}>Ẩn trạng thái hoạt động</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Khi bật, bạn bè sẽ không thấy bạn online
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

      {/* Đăng xuất */}
      <Popconfirm
        title="Đăng xuất?"
        description="Bạn sẽ cần đăng nhập lại để tiếp tục."
        okText="Đăng xuất"
        cancelText="Không"
        okButtonProps={{ danger: true }}
        onConfirm={handleLogout}
      >
        <Button danger block size="large" icon={<LogoutOutlined />}>
          Đăng xuất
        </Button>
      </Popconfirm>
    </div>
  );
};

export default ProfilePage;
