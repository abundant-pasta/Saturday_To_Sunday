self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png', // Make sure you have this icon in /public
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/daily'
      }
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/daily'
  const openUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    Promise.all([
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'push_clicked',
          metadata: { url: targetUrl }
        })
      }).catch(function() {}),
      clients.openWindow(openUrl)
    ])
  )
})
