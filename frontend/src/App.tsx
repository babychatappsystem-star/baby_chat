// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider, theme as antdTheme, Typography } from 'antd';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import MessagesPage from './pages/Messages';
import HomePage from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import About from './pages/About';
import Service from './pages/Service';
import FriendsPage from './pages/Friends';
import ProfilePage from './pages/Profile';
import { connectSocket } from './lib/socket';
import { authService } from './services/authService';
import { useSocketEvent } from './hooks/useSocketEvent';
import { WS_EVENTS } from './lib/wsEvents';
import { playNotificationSound } from './lib/sound';
import { Toaster } from 'react-hot-toast';

// Example page components


const Dashboard: React.FC = () => (
  <div>
    <Typography.Title level={2}>Dashboard</Typography.Title>
    <Typography.Text type="secondary">Your dashboard content goes here.</Typography.Text>
  </div>
);

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return saved === 'dark' || (!saved && prefersDark);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Kết nối socket khi có access token (sau khi đã đăng nhập).
  // Không disconnect ở cleanup: socket là singleton sống suốt phiên;
  // chỉ ngắt khi logout. (Tránh StrictMode cắt kết nối giữa handshake.)
  useEffect(() => {
    const token = authService.getAccessToken();
    if (!token) return;
    connectSocket(token);
  }, []);

  // Phát âm thanh toàn cục — chỉ khi người KHÁC gửi.
  useSocketEvent(WS_EVENTS.MESSAGE_NEW, (payload) => {
    const myId = localStorage.getItem('userId');
    if (payload.senderId !== myId) playNotificationSound();
  });
  useSocketEvent(WS_EVENTS.FRIENDSHIP_REQUEST_RECEIVED, playNotificationSound);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#e8385a',
          colorSuccess: '#52c41a',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6',
          colorTextSecondary: '#6b7280',
          colorTextPlaceholder: '#9ca3af',
          borderRadius: 8,
          fontFamily: 'inherit',
        },
        components: {
          Badge: { colorPrimary: '#e8385a' },
        },
      }}
    >
    <AntdApp>
    <div className="App">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Routes with standard layout */}
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <About />
              </Layout>
            }
          />

          <Route
            path="/services"
            element={
              <Layout>
                <Service />
              </Layout>
            }
          />

          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <Layout>
                  <FriendsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Layout>
                  <MessagesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Route with sidebar */}
          <Route
            path="/dashboard"
            element={
              <Layout showSidebar={true}>
                <Dashboard />
              </Layout>
            }
          />
          
          {/* Route without header/footer */}
          <Route
            path="/minimal"
            element={
              <Layout showHeader={false}>
                <div>
                  <Typography.Title level={3}>Minimal Layout</Typography.Title>
                  <p>No header or footer on this page.</p>
                </div>
              </Layout>
            }
          />

          <Route
            path="/login"
            element={
                <Login />
            }
          />

          <Route
            path="/signup"
            element={
                <SignUp />
            }
          />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{}}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
    </AntdApp>
    </ConfigProvider>
  );
};

export default App;