import React, { type JSX } from 'react';
import { Typography, Row, Col, Card, List, Button, Space, Tag, Badge } from 'antd';
import { Link } from 'react-router-dom';
import { CheckOutlined, StarFilled } from '@ant-design/icons';
import { MessageSquare, Video, Phone, Cloud, Lock, Headphones, Rocket } from 'lucide-react';
import { useThemeToken } from '../hooks/useThemeToken';

const { Title, Paragraph, Text } = Typography;

interface ServiceFeature {
  icon: JSX.Element;
  title: string;
  description: string;
}

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const serviceDefs: Array<{ Icon: React.FC<{ size: number; color: string }>; title: string; description: string }> = [
  { Icon: MessageSquare, title: 'Text Messaging',    description: 'Send instant messages with emoji support and file sharing capabilities.' },
  { Icon: Video,         title: 'Video Calls',       description: 'Crystal clear video calls with up to 8 participants simultaneously.' },
  { Icon: Phone,         title: 'Voice Calls',       description: 'High-quality voice calls with noise cancellation technology.' },
  { Icon: Cloud,         title: 'Cloud Storage',     description: 'Secure cloud storage for your messages and shared files.' },
  { Icon: Lock,          title: 'Enhanced Security', description: 'End-to-end encryption and two-factor authentication.' },
  { Icon: Headphones,    title: '24/7 Support',      description: 'Round-the-clock customer support for all your needs.' },
];

const pricingPlans: PricingPlan[] = [
  {
    name: 'Basic',
    price: 'Free',
    description: 'Perfect for personal use',
    features: ['Unlimited text messaging', 'Basic file sharing', 'Group chats up to 10 people', '1 GB cloud storage', 'Standard support'],
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/mo',
    description: 'Great for small teams',
    highlighted: true,
    features: ['Everything in Basic', 'Video calls up to 8 people', 'Group chats up to 50 people', '10 GB cloud storage', 'Priority support', 'Custom emojis'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: ['Everything in Pro', 'Unlimited video calls', 'Unlimited group size', 'Custom storage options', '24/7 dedicated support', 'Admin dashboard', 'Custom integrations'],
  },
];

const ServicePage: React.FC = () => {
  const token = useThemeToken();
  const services: ServiceFeature[] = serviceDefs.map(({ Icon, title, description }) => ({
    icon: <Icon size={28} color={token.colorPrimary} />,
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
              Powerful Tools for{' '}
              <Text style={{ color: token.colorPrimary, fontSize: 'inherit' }}>Modern Communication</Text>
            </Title>
            <Paragraph style={{ fontSize: 18, color: token.colorTextSecondary, marginBottom: 32 }}>
              Discover the full range of communication tools and services designed to keep you connected
              with the people who matter most — on any device, anywhere.
            </Paragraph>
            <Space size={16} wrap>
              <Link to="/signup">
                <Button type="primary" size="large" shape="round" icon={<Rocket size={18} />} style={{ minWidth: 150 }}>
                  Get Started Free
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="large" shape="round" style={{ minWidth: 140 }}>
                  View Pricing
                </Button>
              </a>
            </Space>
          </Col>
          <Col xs={24} md={11}>
            {/* Minh họa: grid icon services nhỏ */}
            <Row gutter={[16, 16]}>
              {serviceDefs.map(({ Icon, title }) => (
                <Col key={title} span={8}>
                  <Card
                    style={{ textAlign: 'center', borderRadius: 16 }}
                    styles={{ body: { padding: 20 } }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: token.colorPrimaryBg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Icon size={24} color={token.colorPrimary} />
                    </div>
                    <Text style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{title}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      {/* Services Grid */}
      <section style={{ marginBottom: 64 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>Everything You Need</Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary, marginBottom: 40 }}>
          A complete suite of communication tools built for the way you work and connect.
        </Paragraph>
        <Row gutter={[24, 24]}>
          {services.map((s) => (
            <Col key={s.title} xs={24} md={12} lg={8}>
              <Card hoverable style={{ height: '100%' }}>
                <Space align="start">
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: token.colorPrimaryBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <Title level={5} style={{ marginBottom: 4 }}>{s.title}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>{s.description}</Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ marginBottom: 64 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>Choose Your Plan</Title>
        <Paragraph style={{ textAlign: 'center', color: token.colorTextSecondary, marginBottom: 40 }}>
          Start free, upgrade when you're ready. No hidden fees.
        </Paragraph>
        <Row gutter={[24, 24]} align="middle">
          {pricingPlans.map((plan) => (
            <Col key={plan.name} xs={24} md={8}>
              <Badge.Ribbon
                text={<Space size={4}><StarFilled style={{ fontSize: 11 }} />Most Popular</Space>}
                color={token.colorWarning}
                style={{ display: plan.highlighted ? 'block' : 'none' }}
              >
                <Card
                  style={{
                    textAlign: 'center',
                    background: plan.highlighted ? token.colorPrimary : undefined,
                    boxShadow: plan.highlighted ? `0 12px 40px ${token.colorPrimaryBorder}` : undefined,
                    transform: plan.highlighted ? 'scale(1.04)' : undefined,
                    height: '100%',
                    borderColor: plan.highlighted ? token.colorPrimary : undefined,
                  }}
                  styles={{ body: { padding: '32px 28px' } }}
                >
                  <Tag
                    color={plan.highlighted ? 'rgba(255,255,255,0.2)' : 'default'}
                    style={{
                      marginBottom: 16,
                      color: plan.highlighted ? '#fff' : undefined,
                      border: plan.highlighted ? '1px solid rgba(255,255,255,0.4)' : undefined,
                    }}
                  >
                    {plan.name}
                  </Tag>

                  <div style={{ marginBottom: 4 }}>
                    <Text
                      style={{
                        fontSize: 40,
                        fontWeight: 700,
                        color: plan.highlighted ? '#fff' : token.colorText,
                        lineHeight: 1.1,
                      }}
                    >
                      {plan.price}
                    </Text>
                    {plan.period && (
                      <Text style={{ color: plan.highlighted ? 'rgba(255,255,255,0.7)' : token.colorTextSecondary }}>
                        {plan.period}
                      </Text>
                    )}
                  </div>

                  <Paragraph
                    style={{
                      color: plan.highlighted ? 'rgba(255,255,255,0.8)' : token.colorTextSecondary,
                      marginBottom: 24,
                      fontSize: 14,
                    }}
                  >
                    {plan.description}
                  </Paragraph>

                  <List
                    style={{ textAlign: 'left', marginBottom: 24 }}
                    dataSource={plan.features}
                    renderItem={(f) => (
                      <List.Item style={{ padding: '5px 0', border: 'none' }}>
                        <Space size={8}>
                          <CheckOutlined
                            style={{
                              color: plan.highlighted ? '#fff' : token.colorPrimary,
                              fontSize: 13,
                            }}
                          />
                          <Text style={{ color: plan.highlighted ? '#fff' : undefined, fontSize: 14 }}>{f}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />

                  <Button
                    size="large"
                    shape="round"
                    block
                    type={plan.highlighted ? 'default' : 'primary'}
                    style={
                      plan.highlighted
                        ? { background: '#fff', color: token.colorPrimary, borderColor: '#fff', fontWeight: 600 }
                        : plan.name === 'Enterprise'
                        ? {}
                        : {}
                    }
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </Button>
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>
      </section>

      {/* CTA */}
      <section style={{ padding: '56px 24px', textAlign: 'center', background: token.colorPrimary, borderRadius: 16, marginBottom: 32 }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>Need a Custom Solution?</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, maxWidth: 520, margin: '0 auto 28px' }}>
          Talk to our sales team about enterprise plans tailored to your organization's scale and needs.
        </Paragraph>
        <Space size={16} wrap style={{ justifyContent: 'center' }}>
          <Button size="large" shape="round" style={{ background: '#fff', color: token.colorPrimary, borderColor: '#fff', minWidth: 160 }}>
            Contact Sales
          </Button>
          <Link to="/signup">
            <Button size="large" shape="round" ghost style={{ borderColor: 'rgba(255,255,255,0.6)', color: '#fff', minWidth: 160 }}>
              Start for Free
            </Button>
          </Link>
        </Space>
      </section>
    </div>
  );
};

export default ServicePage;
