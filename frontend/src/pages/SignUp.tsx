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
      toast.success('Link xác nhận đã được gửi!');
    } catch (error: unknown) {
      const msg = getApiErrorMessage(error, '');
      toast.error(`Đăng ký thất bại. Vui lòng thử lại!${msg ? `\n${msg}` : ''}`);
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
            <Title level={4}>Kiểm tra Email của bạn</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Chúng tôi đã gửi một link xác nhận đến email bạn vừa nhập. Vui lòng click vào link đó để hoàn tất việc tạo tài khoản.
            </Text>
            <Button block size="large" onClick={() => setIsSuccess(false)}>
              Gửi lại bằng email khác
            </Button>
          </div>
        ) : (
          <>
            <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email' },
                  { type: 'email',  message: 'Email không hợp lệ' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Nhập địa chỉ Email" size="large" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={isLoading}>
                  Gửi link xác nhận
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
