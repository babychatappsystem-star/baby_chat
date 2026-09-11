import { theme } from 'antd';

export const useThemeToken = () => {
  const { token } = theme.useToken();
  return token;
};