import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Card } from 'antd';
import { MailOutlined, CheckCircleFilled } from '@ant-design/icons';
import { authService } from '../services/authService';
import { getApiErrorMessage } from '../utils/apiError';
import { useToast } from '../hooks/useToast';
import { useThemeToken } from '../hooks/useThemeToken';

const { Title, Text } = Typography;

interface SignUpFormData {
  email: string;
}

const SignUpPage: React.FC = () => {
  const toast = useToast({ position: 'top-center', duration: 5000 });
  const [form] = Form.useForm<SignUpFormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const token = useThemeToken();

  const handleSubmit = async (values: SignUpFormData) => {
    setIsLoading(true);
    try {
      await authService.sendVerificationLink(values.email);
      setIsSuccess(true);
      toast.success('Verification link has been sent!');
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, '');
      toast.error(`Registration failed. Please try again!${msg ? `\n${msg}` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: token.colorBgLayout }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>Create Your Account</Title>
          <Text type="secondary">Join Baby Chat and start connecting with others</Text>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleFilled style={{ fontSize: 48, color: token.colorSuccess, marginBottom: 16 }} />
            <Title level={4}>Check Your Email</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              We have sent a verification link to your email address. Please click the link to finish creating your account.
            </Text>
            <Button block size="large" onClick={() => setIsSuccess(false)}>
              Resend with another email
            </Button>
          </div>
        ) : (
          <>
            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email',  message: 'Invalid email address' },
                ]}
              >
                <Input prefix={<MailOutlined style={{ color: token.colorTextPlaceholder, marginRight: 8 }} />} placeholder="Enter your email address" size="large" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
                  Send verification link
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Already have an account? </Text>
              <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SignUpPage;
