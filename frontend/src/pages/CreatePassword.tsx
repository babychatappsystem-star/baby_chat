import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, Space, List } from 'antd';
import { UserOutlined, LockOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import * as session from '../lib/session';
import { getApiErrorMessage } from '../utils/apiError';
import { useToast } from '../hooks/useToast';
import { useThemeToken } from '../hooks/useThemeToken';

const { Title, Text } = Typography;

interface CreatePasswordFormData {
  username: string;
  password: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  regex: RegExp;
  label: string;
}

const passwordRequirements: PasswordRequirement[] = [
  { regex: /.{8,}/,       label: 'At least 8 characters long' },
  { regex: /[0-9]/,       label: 'Contains a number' },
  { regex: /[a-z]/,       label: 'Contains a lowercase letter' },
  { regex: /[A-Z]/,       label: 'Contains an uppercase letter' },
  { regex: /[^A-Za-z0-9]/, label: 'Contains a special character' },
];

const CreatePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenUrl = searchParams.get('token');
  const emailUrl = searchParams.get('email');

  const toast = useToast({ position: 'top-center', duration: 5000 });
  const [form] = Form.useForm<CreatePasswordFormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const themeToken = useThemeToken();

  // Nếu thiếu token hoặc email, có thể hiển thị lỗi
  if (!tokenUrl || !emailUrl) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: themeToken.colorBgLayout }}>
        <Card style={{ textAlign: 'center', padding: '20px' }}>
          <CloseCircleFilled style={{ fontSize: 48, color: themeToken.colorError, marginBottom: 16 }} />
          <Title level={4}>Invalid Link</Title>
          <Text type="secondary">Please register again to receive a new link.</Text>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" onClick={() => navigate('/signup')}>Back to Sign Up</Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (values: CreatePasswordFormData) => {
    setIsLoading(true);
    try {
      const data = await session.verifyRegistration({
        email: emailUrl,
        token: tokenUrl,
        password: values.password,
        username: values.username,
      });
      toast.success(`Registration successful!\nWelcome ${data.user.username}`);
      navigate('/');
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, '');
      toast.error(`Verification failed. ${msg ? `\n${msg}` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: themeToken.colorBgLayout }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>Create Account</Title>
          <Text type="secondary">Verification successful for <b>{emailUrl}</b></Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Display name is required' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Display name (Username)" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Password is required' },
              {
                validator: (_, value) =>
                  !value || passwordRequirements.every((r) => r.regex.test(value))
                    ? Promise.resolve()
                    : Promise.reject('Password is not strong enough'),
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Item>

          {/* Password requirements checklist */}
          {password.length > 0 && (
            <List
              size="small"
              style={{ marginBottom: 16 }}
              dataSource={passwordRequirements}
              renderItem={(req) => {
                const met = req.regex.test(password);
                return (
                  <List.Item style={{ padding: '2px 0', border: 'none' }}>
                    <Space size={6}>
                      {met
                        ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                        : <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 14 }} />}
                      <Text style={{ fontSize: 13, color: met ? '#52c41a' : '#6b7280' }}>
                        {req.label}
                      </Text>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject('Passwords do not match');
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
              Complete & Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreatePasswordPage;
