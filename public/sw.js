// Service Worker for 亲声胶囊 PWA
const CACHE_NAME = 'voice-capsule-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过API请求
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 跳过音频文件（太大，不适合缓存）
  if (url.pathname.match(/\.(webm|mp3|wav|ogg)$/)) {
    return;
  }

  // 网络优先策略（适合经常更新的资源）
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时从缓存获取
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 缓存也没有，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// 后台同步（用于离线时上传录音）
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-audio') {
    console.log('Background sync: upload-audio');
    event.waitUntil(uploadPendingAudio());
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || '你的声音胶囊已制作完成！',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'voice-capsule',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '查看',
      },
      {
        action: 'close',
        title: '关闭',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '亲声胶囊', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 上传待处理的音频（后台同步）
async function uploadPendingAudio() {
  // 从IndexedDB获取待上传的音频
  // 这里需要配合前端代码实现
  console.log('Uploading pending audio...');
}

console.log('Service Worker loaded');
