self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();

    // Luôn hiện notification: với userVisibleOnly, bỏ qua sẽ khiến Chrome tự hiện
    // "This site has been updated in the background". Server đã không push cho user
    // đang focus app (client.focus qua socket).
    event.waitUntil(
      Promise.resolve().then(() => {
        return self.registration.getNotifications().then((notifications) => {
          let currentNotification;
          let messageCount = 1;

          // Find existing notification (we use a static tag to group them)
          for (let i = 0; i < notifications.length; i++) {
            if (notifications[i].tag === 'chat-messages') {
              currentNotification = notifications[i];
              break;
            }
          }

          let title = data.title;
          let body = data.body;
          
          if (currentNotification) {
            // Calculate how many messages we have now
            const prevCount = currentNotification.data && currentNotification.data.messageCount 
              ? currentNotification.data.messageCount 
              : 1;
              
            messageCount = prevCount + 1;
            title = 'BabyChat';
            body = `You have ${messageCount} new messages`;
            
            // Close the old notification before showing the new one
            currentNotification.close();
          }

          return self.registration.showNotification(title, {
            body: body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'chat-messages',
            data: {
              url: data.url,
              messageCount: messageCount
            }
          });
        });
      })
    );
  } catch (err) {
    console.error('Error handling push event', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        
        // If the chat is already open, just focus it
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
        
        // If app is open but not on this URL, navigate and focus
        if (client.url.includes(self.location.origin) && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
