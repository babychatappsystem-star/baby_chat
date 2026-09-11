import React from 'react';
import { Drawer, Menu } from 'antd';
import { DashboardOutlined, UserOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SidebarProps } from '../../types/layout';

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/profile',   icon: <UserOutlined />,      label: 'Profile' },
  { key: '/settings',  icon: <SettingOutlined />,   label: 'Settings' },
  { key: '/analytics', icon: <BarChartOutlined />,  label: 'Analytics' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      title="Menu"
      placement="left"
      open={isOpen}
      onClose={onToggle}
      width={256}
      styles={{ body: { padding: 0 } }}
    >
      <Menu
        mode="inline"
        items={menuItems}
        selectedKeys={[location.pathname]}
        onClick={({ key }) => { navigate(key); onToggle?.(); }}
        style={{ border: 'none', height: '100%' }}
      />
    </Drawer>
  );
};

export default Sidebar;
