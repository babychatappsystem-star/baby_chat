import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Button, Row, Col, Card, Space, Avatar, Statistic } from 'antd';
import {
  MessageSquareText,
  Users,
  ShieldCheck,
  Zap,
  UserPlus,
  Send,
} from 'lucide-react';
import { useThemeToken } from '../hooks/useThemeToken';

const { Title, Paragraph, Text } = Typography;

const featureIcons = [Zap, Users, ShieldCheck, MessageSquareText];
const featureDefs = [
  { title: 'Instant Messaging',  description: 'Connect in real-time with our blazing-fast messaging infrastructure. No delays, just conversation.' },
  { title: 'Group Chats',        description: 'Create groups for your friends, family, or team. Stay connected with everyone in one place.' },
  { title: 'Secure & Private',   description: 'Your conversations are yours. With end-to-end encryption, your privacy is our top priority.' },
  { title: 'Rich Communication', description: 'Express yourself fully with support for emojis, GIFs, and file sharing. Make every chat lively.' },
];

const stepIcons = [UserPlus, Users, MessageSquareText];
const stepDefs = [
  { title: 'Create your account', description: 'Sign up in seconds with just an email. No hassle, no waiting.' },
  { title: 'Add your friends',    description: 'Share your friend code or find people by email to connect.' },
  { title: 'Start chatting',      description: 'Send messages, share moments, and stay close — instantly.' },
];

// Mockup khung chat đặt ở cột phải của hero (CSS thuần, không cần ảnh ngoài).
const ChatMockup: React.FC = () => {
  const token = useThemeToken();
  const bubble = (text: string, mine: boolean) => (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div
        style={{
          maxWidth: '75%',
          padding: '8px 12px',
          borderRadius: 14,
          fontSize: 14,
          background: mine ? token.colorPrimary : token.colorFillSecondary,
          color: mine ? '#fff' : token.colorText,
        }}
      >
        {text}
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderRadius: 20,
        boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
        border: `1px solid ${token.colorBorderSecondary}`,
        overflow: 'hidden',
        maxWidth: 380,
        margin: '0 auto',
      }}
    >
      {/* Header mockup */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Avatar src="https://i.pravatar.cc/80?u=babychat-hero" size={40} />
        <div>
          <Text strong style={{ display: 'block' }}>Emma</Text>
          <Text type="success" style={{ fontSize: 12 }}>● Online</Text>
        </div>
      </div>
      {/* Body mockup */}
      <div style={{ padding: 18, background: token.colorBgLayout }}>
        {bubble('Hey! Are you free this weekend? 😊', false)}
        {bubble('Yes! Let’s plan something fun 🎉', true)}
        {bubble('Perfect, sending details now…', false)}
        {bubble('Can’t wait! 🙌', true)}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const token = useThemeToken();
  const features = featureDefs.map((f, i) => ({
    ...f,
    icon: React.createElement(featureIcons[i], { size: 32, color: token.colorPrimary }),
  }));
  const steps = stepDefs.map((s, i) => ({
    ...s,
    icon: React.createElement(stepIcons[i], { size: 28, color: '#fff' }),
  }));

  return (
    <div>
      {/* Hero Section — 2 cột */}
      <section style={{ padding: '56px 0 64px' }}>
        <Row gutter={[48, 40]} align="middle">
          <Col xs={24} md={12}>
            <Title style={{ fontSize: 48, lineHeight: 1.15, marginBottom: 16 }}>
              Connect Instantly,{' '}
              <Text style={{ color: token.colorPrimary, fontSize: 'inherit' }}>Chat Seamlessly.</Text>
            </Title>
            <Paragraph style={{ fontSize: 18, color: token.colorTextSecondary, marginBottom: 32 }}>
              Welcome to Baby Chat — the simple, fast, and secure way to stay in touch with the people who matter most.
            </Paragraph>
            <Space size={16} wrap>
              <Link to="/messages">
                <Button type="primary" size="large" shape="round" icon={<Send size={18} />} style={{ minWidth: 150 }}>
                  Start Chatting
                </Button>
              </Link>
              <Link to="/about">
                <Button size="large" shape="round" style={{ minWidth: 140 }}>
                  Learn More
                </Button>
              </Link>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <ChatMockup />
          </Col>
        </Row>
      </section>

      {/* Stats */}
      <section
        style={{
          padding: '36px 24px',
          background: token.colorFillQuaternary,
          borderRadius: 16,
          marginBottom: 64,
        }}
      >
        <Row gutter={[24, 24]} justify="space-around" align="middle">
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Active Users" value="1M+" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Messages Sent" value="500M+" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Countries" value="150+" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Uptime" value="99.9%" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
        </Row>
      </section>

      {/* Features Section */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={2}>Everything You Need to Connect</Title>
          <Paragraph style={{ color: token.colorTextSecondary }}>
            A feature-rich experience designed for modern communication.
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {features.map((feature) => (
            <Col key={feature.title} xs={24} sm={12} lg={6}>
              <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
                <div style={{ marginBottom: 16 }}>{feature.icon}</div>
                <Title level={5}>{feature.title}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {feature.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={2}>Get Started in 3 Simple Steps</Title>
          <Paragraph style={{ color: token.colorTextSecondary }}>
            From sign-up to your first message in under a minute.
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {steps.map((step, i) => (
            <Col key={step.title} xs={24} md={8}>
              <Card style={{ height: '100%', textAlign: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: token.colorPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    position: 'relative',
                  }}
                >
                  {step.icon}
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: token.colorBgContainer,
                      border: `2px solid ${token.colorPrimary}`,
                      color: token.colorPrimary,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
                <Title level={5} style={{ marginBottom: 8 }}>{step.title}</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {step.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: '56px 24px',
          textAlign: 'center',
          background: token.colorPrimary,
          borderRadius: 16,
          marginBottom: 32,
        }}
      >
        <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>
          Ready to Join the Conversation?
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, maxWidth: 480, margin: '0 auto 28px' }}>
          Create an account in seconds and start connecting with your world today. It's free!
        </Paragraph>
        <Link to="/signup">
          <Button size="large" shape="round" style={{ background: '#fff', color: token.colorPrimary, borderColor: '#fff', minWidth: 160 }}>
            Sign Up Now
          </Button>
        </Link>
      </section>
    </div>
  );
};

export default HomePage;
