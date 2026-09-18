import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Divider, Alert, Typography, Card, Row, Col } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined, FacebookOutlined } from '@ant-design/icons';
import { useThemeToken } from '../hooks/useThemeToken';
import { authService } from '../services/authService';
import { getApiErrorMessage } from '../utils/apiError';

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/messages';
  const token = useThemeToken();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm<LoginFormData>();

  const handleSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login({ email: values.email, password: values.password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '');
      setError(`Invalid credentials. Please try again!${msg ? `\n${msg}` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Logging in with ${provider}`);
    } catch {
      setError(`${provider} login failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: token.colorBgLayout }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>Welcome Back</Title>
          <Text type="secondary">Sign in to continue to Baby Chat</Text>
        </div>

        {error && (
          <Alert
            type="error"
            description={error}
            showIcon
            style={{ marginBottom: 20, whiteSpace: 'pre-line' }}
            closable={{ afterClose: () => setError(null) }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email',  message: 'Invalid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: token.colorTextPlaceholder, marginRight: 8 }} />}
              placeholder="Email address"
              size="large"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: token.colorTextPlaceholder, marginRight: 8 }} />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Row justify="space-between" align="middle">
              <Col>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>Remember me</Checkbox>
                </Form.Item>
              </Col>
              <Col>
                <Link to="/forgot-password">Forgot password?</Link>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>Or continue with</Divider>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            icon={<GoogleOutlined style={{ color: '#ea4335' }} />}
            size="large"
            style={{ flex: 1 }}
            onClick={() => handleSocialLogin('google')}
            loading={isLoading}
          >
            Google
          </Button>
          <Button
            icon={<FacebookOutlined style={{ color: '#1877f2' }} />}
            size="large"
            style={{ flex: 1 }}
            onClick={() => handleSocialLogin('facebook')}
            loading={isLoading}
          >
            Facebook
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Text type="secondary">Don't have an account? </Text>
          <Link to="/signup">Sign up</Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
