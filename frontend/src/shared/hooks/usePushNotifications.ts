import { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const sendSubscriptionToServer = (subscription: PushSubscription) =>
  apiClient.post('/notifications/subscribe', subscription.toJSON());

// Gỡ subscription ở cả server lẫn trình duyệt (dùng khi logout) để người đăng nhập
// sau trên cùng máy không nhận push của tài khoản cũ. Gọi TRƯỚC khi xoá token.
export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await apiClient.delete('/notifications/subscribe', { data: { endpoint: subscription.endpoint } });
  } finally {
    await subscription.unsubscribe();
  }
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) return;

    setIsSupported(true);
    setPermission(Notification.permission);

    // Đồng bộ lại subscription sẵn có với server: server có thể đã mất bản ghi
    // (dọn dữ liệu, đổi tài khoản trên cùng trình duyệt). Backend upsert theo endpoint.
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        setIsSubscribed(!!subscription);
        if (subscription && Notification.permission === 'granted') {
          await sendSubscriptionToServer(subscription);
        }
      })
      .catch((error) => console.error('Failed to sync push subscription:', error));
  }, []);

  const subscribeToPush = async () => {
    if (!isSupported) return;
    setIsLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');

        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) {
          throw new Error('VITE_VAPID_PUBLIC_KEY is not set');
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        await sendSubscriptionToServer(subscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush
  };
};
