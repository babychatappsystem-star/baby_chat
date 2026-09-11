import { App } from 'antd';

// Dùng hook này thay vì import message/modal/notification trực tiếp từ antd.
// Static import không đọc được dynamic theme context → warning.
export const useAntdApp = () => App.useApp();
