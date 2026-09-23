import { useState, useEffect } from 'react';
import axios from 'axios';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if Push messaging is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
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

        // Send subscription to backend
        const token = localStorage.getItem('access_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        await axios.post(`${API_URL}/notifications/subscribe`, subscription.toJSON(), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

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
