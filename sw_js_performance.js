// sw.js - 서비스 워커 (루트 디렉토리에 배치)
// 오프라인 지원 및 캐싱으로 성능 대폭 향상

const CACHE_NAME = 'ai-lab-v1.2';
const STATIC_CACHE = 'static-v1.2';
const DYNAMIC_CACHE = 'dynamic-v1.2';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  '/',
  '/about/',
  '/dashboard.html',
  '/assets/css/main.css',
  '/assets/js/performance.js',
  '/assets/js/dashboard.js',
  '/assets/images/favicon-32x32.png',
  '/assets/images/favicon-16x16.png',
  '/assets/images/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap'
];

// 동적으로 캐시할 URL 패턴
const CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/
];

// 설치 이벤트 - 정적 리소스 캐시
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cache installation failed:', error);
      })
  );
});

// 활성화 이벤트 - 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// 페치 이벤트 - 네트워크 요청 인터셉트
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // HTML 페이지 요청 처리
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(handlePageRequest(request));
  }
  // 정적 리소스 요청 처리
  else if (shouldCache(request.url)) {
    event.respondWith(handleAssetRequest(request));
  }
  // API 요청 처리
  else if (url.origin === 'https://api.github.com') {
    event.respondWith(handleApiRequest(request));
  }
});

// HTML 페이지 요청 처리 (Network First 전략)
async function handlePageRequest(request) {
  try {
    // 네트워크에서 먼저 시도
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 성공하면 캐시에 저장
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // 네트워크 실패 시 캐시에서 반환
    console.log('📱 Serving from cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // 캐시에도 없으면 오프라인 페이지 반환
    return caches.match('/offline.html') || new Response(
      '<h1>오프라인 상태</h1><p>인터넷 연결을 확인해주세요.</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// 정적 리소스 요청 처리 (Cache First 전략)
async function handleAssetRequest(request) {
  // 캐시에서 먼저 확인
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('⚡ Serving from cache:', request.url);
    return cachedResponse;
  }
  
  try {
    // 캐시에 없으면 네트워크에서 가져와서 캐시에 저장
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Asset fetch failed:', error);
    
    // 이미지 요청 실패 시 플레이스홀더 반환
    if (request.url.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
      return new Response(
        '<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">이미지 로드 실패</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// API 요청 처리 (Network First with timeout)
async function handleApiRequest(request) {
  try {
    // 5초 타임아웃으로 네트워크 요청
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (networkResponse.ok) {
      // API 응답 캐시 (5분간)
      const cache = await caches.open(DYNAMIC_CACHE);
      const responseToCache = networkResponse.clone();
      
      // 5분 후 만료되도록 헤더 추가
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
      return networkResponse;
    }
    
    throw new Error('API response not ok');
  } catch (error) {
    // 네트워크 실패 시 캐시 확인
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // 캐시 만료 확인 (5분)
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!cacheTimestamp || (now - parseInt(cacheTimestamp)) < fiveMinutes) {
        console.log('📱 Serving cached API response:', request.url);
        return cachedResponse;
      }
    }
    
    // 캐시도 없거나 만료된 경우 에러 응답
    return new Response(
      JSON.stringify({ error: 'API 요청 실패', offline: true }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 캐시 대상 URL 확인
function shouldCache(url) {
  return CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('🔄 Background sync triggered');
  
  // 오프라인 중 저장된 데이터 동기화
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // 만료된 캐시 정리
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const request of requests) {
      const response = await cache.match(request);
      const cacheTimestamp = response.headers.get('sw-cache-timestamp');
      
      if (cacheTimestamp && (now - parseInt(cacheTimestamp)) > oneDay) {
        await cache.delete(request);
        console.log('🗑️ Expired cache removed:', request.url);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// 푸시 알림 처리 (선택사항)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '새로운 업데이트가 있습니다',
      icon: '/assets/images/favicon-32x32.png',
      badge: '/assets/images/favicon-16x16.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1
      },
      actions: [
        {
          action: 'explore',
          title: '확인하기',
          icon: '/assets/images/checkmark.png'
        },
        {
          action: 'close',
          title: '닫기',
          icon: '/assets/images/xmark.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'AI Lab 알림', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🤖 AI Lab Service Worker loaded');