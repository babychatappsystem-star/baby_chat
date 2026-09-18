import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space, theme, Grid, Badge, Popover, List } from 'antd';
import { SunOutlined, MoonOutlined, UserOutlined, SettingOutlined, LogoutOutlined, MenuOutlined, BellOutlined, MessageOutlined, UserAddOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { HeaderProps } from '../../types/layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { disconnectSocket } from '../../lib/socket';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification } from '../../hooks/useNotifications';
import { authService } from '../../services/authService';
import type { ProfileDTO } from '../../types/api.types';
import environmentLoader from '../../config/environmentLoader';

const { apiUrl } = environmentLoader.loadConfig();

const { Header: AntHeader } = Layout;
const { Text } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

const navItems: MenuProps['items'] = [
  { key: '/',         label: 'Home' },
  { key: '/about',    label: 'About' },
  { key: '/services', label: 'Services' },
  { key: '/friends',  label: 'Friends' },
  { key: '/messages', label: 'Chat' },
];

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMd = !!screens.md;
  const { token } = useToken();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    authService.getProfile().then(setProfile).catch(() => {});

    // Profile.tsx phát event này sau khi đổi avatar — cập nhật ngay không cần reload.
    const onProfileUpdated = (e: Event) => setProfile((e as CustomEvent<ProfileDTO>).detail);
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const logOut = () => {
    disconnectSocket(); // ngắt socket trước khi clear token
    localStorage.clear();
    navigate('/login');
  };

  const currentUser = {
    name:   profile?.username ?? localStorage.getItem('username') ?? 'John Doe',
    email:  profile?.email    ?? localStorage.getItem('email')    ?? 'user@example.com',
    avatar: profile?.avatarUrl ? (profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${apiUrl}${profile.avatarUrl}`) : null,
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{currentUser.email}</Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: '/profile',  icon: <UserOutlined />,   label: 'Profile' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
  ];

  const notifIcon = (type: AppNotification['type']) => {
    if (type === 'message')         return <MessageOutlined style={{ color: token.colorPrimary }} />;
    if (type === 'friend_request')  return <UserAddOutlined style={{ color: token.colorWarning }} />;
    return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
  };

  const notifContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 12px' }}>
        <Typography.Text strong>Notifications</Typography.Text>
        <Space size={4}>
          <Button type="text" size="small" onClick={markAllRead}>Mark all read</Button>
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={clearAll} />
        </Space>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: token.colorTextPlaceholder }}>
          No notifications
        </div>
      ) : (
        <List
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item
              style={{
                padding: '10px 8px',
                borderRadius: 8,
                background: n.read ? 'transparent' : token.colorPrimaryBg,
                cursor: 'default',
              }}
            >
              <List.Item.Meta
                avatar={<Avatar size={32} icon={notifIcon(n.type)} style={{ background: token.colorFillSecondary }} />}
                title={<Typography.Text strong={!n.read} style={{ fontSize: 13 }}>{n.title}</Typography.Text>}
                description={
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{n.description}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {n.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography.Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logOut();
      return;
    }
    navigate(key);
  };

  return (
    <>
      <AntHeader
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 64,
          background: token.colorBgContainer,
          boxShadow: `0 1px 4px ${token.colorFillSecondary}`,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Logo */}
        <Typography.Title level={4} style={{ margin: 0, color: '#e8385a', flexShrink: 0 }}>
          Baby Chat
        </Typography.Title>

        {/* Desktop nav */}
        {isMd && (
          <Menu
            mode="horizontal"
            items={navItems}
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
            style={{ flex: 1, marginLeft: 32, border: 'none', background: 'transparent', minWidth: 0 }}
          />
        )}

        <Space size={8} style={{ flexShrink: 0 }}>
          <Popover
            content={notifContent}
            trigger="click"
            placement="bottomRight"
            open={bellOpen}
            onOpenChange={(open) => { setBellOpen(open); if (open) markAllRead(); }}
          >
            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
              <Button type="text" icon={<BellOutlined />} aria-label="Notifications" />
            </Badge>
          </Popover>
          <Button
            type="text"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          />

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar src={currentUser.avatar || undefined} size={32} style={{ border: '2px solid #e8385a' }}>
                {!currentUser.avatar && currentUser.name.charAt(0).toUpperCase()}
              </Avatar>
              {isMd && <Text style={{ fontWeight: 500 }}>{currentUser.name}</Text>}
            </Space>
          </Dropdown>

          {!isMd && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Open menu"
            />
          )}
        </Space>
      </AntHeader>

      {/* Mobile nav dropdown */}
      {!isMd && mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          background: token.colorBgContainer,
          boxShadow: token.boxShadowSecondary,
          zIndex: 99,
        }}>
          <Menu
            mode="inline"
            items={navItems}
            selectedKeys={[location.pathname]}
            style={{ border: 'none' }}
            onClick={({ key }) => { navigate(key); setMobileMenuOpen(false); }}
          />
        </div>
      )}
    </>
  );
};

export default Header;
