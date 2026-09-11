import React, { useState } from 'react';
import { Layout as AntLayout, Button, Grid } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import type { LayoutProps } from '../../types/layout';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = AntLayout;
const { useBreakpoint } = Grid;

const Layout: React.FC<LayoutProps> = ({
  children,
  className = '',
  showHeader = true,
  showSidebar = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const screens = useBreakpoint();
  const isLg = !!screens.lg;

  return (
    <AntLayout style={{ minHeight: '100vh' }} className={className}>
      {showHeader && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <Header />
        </div>
      )}

      <AntLayout style={{ marginTop: showHeader ? 64 : 0 }}>
        {showSidebar && (
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <Content>
          {showSidebar && !isLg && (
            <div style={{ padding: '12px 16px' }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              />
            </div>
          )}
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
            {children}
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
