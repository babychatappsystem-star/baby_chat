import React, { type JSX } from 'react';
import { Typography, Row, Col, Card, Statistic, Button, Space } from 'antd';
import { Link } from 'react-router-dom';
import { MessageSquare, Shield, Zap, Users, Globe, Heart, Target, Sparkles } from 'lucide-react';
import { useThemeToken } from '../hooks/useThemeToken';

const { Title, Paragraph, Text } = Typography;

interface FeatureCard {
  icon: JSX.Element;
  title: string;
  description: string;
}

const featureDefs: Array<{ Icon: React.FC<{ size: number; color: string }>; title: string; description: string }> = [
  { Icon: MessageSquare, title: 'Instant Messaging',     description: 'Real-time messaging with friends and family across any device.' },
  { Icon: Shield,        title: 'Secure Communication', description: 'End-to-end encryption ensures your conversations stay private.' },
  { Icon: Users,         title: 'Group Chats',           description: 'Create groups for family, friends, or team collaboration.' },
  { Icon: Globe,         title: 'Cross-Platform',        description: 'Available on web, mobile, and desktop platforms.' },
  { Icon: Zap,           title: 'Lightning Fast',        description: 'Optimized for speed and reliability.' },
  { Icon: Heart,         title: 'User-Friendly',         description: 'Intuitive interface designed for everyone.' },
];

const valueDefs: Array<{ Icon: React.FC<{ size: number; color: string }>; title: string; description: string }> = [
  { Icon: Shield,    title: 'Privacy First',  description: 'Your data is yours. We never sell or share your conversations.' },
  { Icon: Zap,       title: 'Speed Matters',  description: 'Built for instant delivery, even on slow connections.' },
  { Icon: Heart,     title: 'Made for People', description: 'Designed around real human connection, not metrics.' },
];

const AboutPage: React.FC = () => {
  const token = useThemeToken();
  const features: FeatureCard[] = featureDefs.map(({ Icon, title, description }) => ({
    icon: <Icon size={24} color={token.colorPrimary} />,
    title,
    description,
  }));

  return (
    <div>
      {/* Hero — 2 cột */}
      <section style={{ padding: '56px 0 64px' }}>
        <Row gutter={[48, 40]} align="middle">
          <Col xs={24} md={13}>
            <Title style={{ fontSize: 44, lineHeight: 1.15, marginBottom: 16 }}>
              Bringing People{' '}
              <Text style={{ color: token.colorPrimary, fontSize: 'inherit' }}>Closer Together</Text>
            </Title>
            <Paragraph style={{ fontSize: 18, color: token.colorTextSecondary, marginBottom: 24 }}>
              Baby Chat is a modern messaging platform built to make conversations more meaningful, secure,
              and accessible to everyone — wherever they are in the world.
            </Paragraph>
            <Space size={16} wrap>
              <Link to="/signup">
                <Button type="primary" size="large" shape="round" style={{ minWidth: 150 }}>
                  Get Started
                </Button>
              </Link>
              <Link to="/services">
                <Button size="large" shape="round" style={{ minWidth: 140 }}>
                  Our Services
                </Button>
              </Link>
            </Space>
          </Col>
          <Col xs={24} md={11}>
            {/* Minh họa: card chồng nhẹ với icon thương hiệu */}
            <div
              style={{
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
                borderRadius: 24,
                padding: 48,
                textAlign: 'center',
                boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              }}
            >
              <MessageSquare size={72} color="#fff" strokeWidth={1.5} />
              <Title level={3} style={{ color: '#fff', marginTop: 16, marginBottom: 4 }}>Baby Chat</Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Simple. Fast. Secure.</Text>
            </div>
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
            <Statistic title="Countries" value="150+" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Messages / Day" value="10M+" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic title="Support" value="24/7" styles={{ content: { color: token.colorPrimary, fontWeight: 700 } }} />
          </Col>
        </Row>
      </section>

      {/* Features Grid */}
      <section style={{ marginBottom: 64 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>Why Choose Baby Chat?</Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary, marginBottom: 40 }}>
          Everything you need for modern, meaningful communication.
        </Paragraph>
        <Row gutter={[24, 24]}>
          {features.map((f) => (
            <Col key={f.title} xs={24} md={12} lg={8}>
              <Card hoverable style={{ height: '100%' }}>
                <Space align="start">
                  <div style={{ marginTop: 2 }}>{f.icon}</div>
                  <div>
                    <Title level={5} style={{ marginBottom: 4 }}>{f.title}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>{f.description}</Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Mission — 2 cột: text trái + core values phải */}
      <section style={{ marginBottom: 64 }}>
        <Row gutter={[48, 32]} align="middle">
          <Col xs={24} md={10}>
            <Space align="center" size={10} style={{ marginBottom: 12 }}>
              <Target size={28} color={token.colorPrimary} />
              <Title level={2} style={{ margin: 0 }}>Our Mission</Title>
            </Space>
            <Paragraph style={{ fontSize: 16, color: token.colorTextSecondary }}>
              We're on a mission to transform how people connect in the digital age. By providing a secure,
              fast, and intuitive platform, we make it easier for everyone to stay close to the people who
              matter most.
            </Paragraph>
            <Space align="center" size={10} style={{ marginTop: 8 }}>
              <Sparkles size={20} color={token.colorPrimary} />
              <Text type="secondary">Trusted by millions across 150+ countries.</Text>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Row gutter={[16, 16]}>
              {valueDefs.map(({ Icon, title, description }) => (
                <Col key={title} xs={24} sm={8}>
                  <Card style={{ height: '100%', textAlign: 'center' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: token.colorPrimaryBg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Icon size={24} color={token.colorPrimary} />
                    </div>
                    <Title level={5} style={{ marginBottom: 4 }}>{title}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>{description}</Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* CTA */}
      <section style={{ padding: '56px 24px', textAlign: 'center', background: token.colorPrimary, borderRadius: 16, marginBottom: 32 }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>Ready to Get Started?</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, maxWidth: 480, margin: '0 auto 28px' }}>
          Join millions of users already enjoying Baby Chat's secure messaging platform.
        </Paragraph>
        <Link to="/signup">
          <Button size="large" shape="round" style={{ background: '#fff', color: token.colorPrimary, borderColor: '#fff', minWidth: 160 }}>
            Create Account
          </Button>
        </Link>
      </section>
    </div>
  );
};

export default AboutPage;
