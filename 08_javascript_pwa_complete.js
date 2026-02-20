// assets/js/performance.js
// 성능 최적화 및 PWA 기능

/**
 * 성능 최적화 및 PWA 기능 모듈
 */
class PerformanceOptimizer {
    constructor() {
        this.isOnline = navigator.onLine;
        this.performanceMetrics = {};
        this.lazyImages = [];
        this.intersectionObserver = null;
        
        this.init();
    }

    init() {
        console.log('🚀 Performance Optimizer initializing...');
        
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeFeatures());
        } else {
            this.initializeFeatures();
        }
    }

    initializeFeatures() {
        // 성능 모니터링
        this.setupPerformanceMonitoring();
        
        // 이미지 지연 로딩
        this.setupLazyLoading();
        
        // 서비스 워커 등록
        this.registerServiceWorker();
        
        // 네트워크 상태 모니터링
        this.setupNetworkMonitoring();
        
        // 스크롤 최적화
        this.setupScrollOptimization();
        
        // 폰트 로딩 최적화
        this.optimizeFontLoading();
        
        // 이미지 최적화
        this.setupImageOptimization();
        
        // 캐시 관리
        this.setupCacheManagement();
        
        console.log('✅ Performance Optimizer initialized');
    }

    /**
     * 성능 모니터링 설정
     */
    setupPerformanceMonitoring() {
        // Web Vitals 측정
        this.measureWebVitals();
        
        // 페이지 로드 시간 측정
        this.measurePageLoadTime();
        
        // 리소스 로딩 시간 측정
        this.measureResourceLoadTime();
        
        // 사용자 상호작용 측정
        this.measureUserInteractions();
    }

    measureWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.performanceMetrics.lcp = lastEntry.startTime;
            console.log('LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            if (firstInput) {
                this.performanceMetrics.fid = firstInput.processingStart - firstInput.startTime;
                console.log('FID:', this.performanceMetrics.fid);
            }
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.performanceMetrics.cls = clsValue;
            console.log('CLS:', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
    }

    measurePageLoadTime() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
            this.performanceMetrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
            this.performanceMetrics.firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
            this.performanceMetrics.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
            
            console.log('Performance Metrics:', this.performanceMetrics);
            
            // 성능 데이터를 서버로 전송 (선택사항)
            this.sendPerformanceData();
        });
    }

    measureResourceLoadTime() {
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            const slowResources = resources.filter(resource => resource.duration > 1000);
            
            if (slowResources.length > 0) {
                console.warn('Slow loading resources:', slowResources);
                this.performanceMetrics.slowResources = slowResources.map(r => ({
                    name: r.name,
                    duration: r.duration,
                    size: r.transferSize
                }));
            }
        });
    }

    measureUserInteractions() {
        // 클릭 응답 시간 측정
        document.addEventListener('click', (event) => {
            const startTime = performance.now();
            
            requestAnimationFrame(() => {
                const endTime = performance.now();
                const interactionTime = endTime - startTime;
                
                if (interactionTime > 100) {
                    console.warn('Slow interaction detected:', {
                        element: event.target,
                        time: interactionTime
                    });
                }
            });
        });
    }

    sendPerformanceData() {
        // 성능 데이터를 분석 서비스로 전송 (Google Analytics, 자체 서버 등)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_load_time', {
                event_category: 'Performance',
                event_label: 'Page Load',
                value: Math.round(this.performanceMetrics.pageLoadTime)
            });
            
            gtag('event', 'lcp', {
                event_category: 'Web Vitals',
                event_label: 'LCP',
                value: Math.round(this.performanceMetrics.lcp)
            });
        }
    }

    /**
     * 이미지 지연 로딩 설정
     */
    setupLazyLoading() {
        // Intersection Observer 지원 확인
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.intersectionObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            // 지연 로딩할 이미지 찾기
            this.lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
            this.lazyImages.forEach(img => {
                this.intersectionObserver.observe(img);
            });
        } else {
            // Intersection Observer 미지원 시 폴백
            this.loadAllImages();
        }
    }

    loadImage(img) {
        // 실제 이미지 로드
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }
        
        img.classList.add('loaded');
        
        // WebP 지원 확인 및 적용
        if (this.supportsWebP() && img.dataset.webp) {
            img.src = img.dataset.webp;
        }
        
        // 이미지 로드 완료 시 페이드인 효과
        img.addEventListener('load', () => {
            img.style.opacity = '1';
        });
    }

    loadAllImages() {
        this.lazyImages.forEach(img => this.loadImage(img));
    }

    supportsWebP() {
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                resolve(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * 서비스 워커 등록
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
                
                // 업데이트 확인
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    showUpdateNotification() {
        // 업데이트 알림 표시
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>새로운 버전이 있습니다!</span>
                <button onclick="window.location.reload()">업데이트</button>
                <button onclick="this.parentElement.parentElement.remove()">나중에</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 자동 제거 (30초 후)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    /**
     * 네트워크 상태 모니터링
     */
    setupNetworkMonitoring() {
        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('온라인 상태로 복구되었습니다', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('오프라인 상태입니다', 'warning');
        });

        // 연결 품질 감지
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const updateConnectionStatus = () => {
                console.log('Connection type:', connection.effectiveType);
                console.log('Downlink speed:', connection.downlink);
                
                // 느린 연결 시 최적화 적용
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    this.enableDataSaverMode();
                }
            };
            
            connection.addEventListener('change', updateConnectionStatus);
            updateConnectionStatus();
        }
    }

    showNetworkStatus(message, type) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `network-status ${type}`;
        statusDiv.textContent = message;
        
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 3000);
    }

    enableDataSaverMode() {
        console.log('📱 Data saver mode enabled');
        
        // 이미지 품질 낮추기
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.dataset.lowQuality) {
                img.src = img.dataset.lowQuality;
            }
        });
        
        // 불필요한 애니메이션 비활성화
        document.body.classList.add('data-saver-mode');
    }

    syncOfflineData() {
        // 오프라인 중 저장된 데이터 동기화
        const offlineData = localStorage.getItem('offlineData');
        if (offlineData) {
            try {
                const data = JSON.parse(offlineData);
                // 서버로 데이터 전송
                this.sendOfflineData(data);
                localStorage.removeItem('offlineData');
            } catch (error) {
                console.error('오프라인 데이터 동기화 실패:', error);
            }
        }
    }

    async sendOfflineData(data) {
        try {
            await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log('✅ 오프라인 데이터 동기화 완료');
        } catch (error) {
            console.error('❌ 오프라인 데이터 동기화 실패:', error);
        }
    }

    /**
     * 스크롤 최적화
     */
    setupScrollOptimization() {
        let ticking = false;
        
        const optimizedScroll = () => {
            // 스크롤 이벤트 최적화
            this.updateScrollPosition();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(optimizedScroll);
                ticking = true;
            }
        }, { passive: true });
        
        // 스크롤 위치 복원
        this.restoreScrollPosition();
    }

    updateScrollPosition() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 스크롤 위치 저장 (페이지 새로고침 시 복원용)
        sessionStorage.setItem('scrollPosition', scrollTop.toString());
        
        // 헤더 숨김/표시 (선택사항)
        this.toggleHeaderOnScroll(scrollTop);
        
        // 스크롤 진행률 표시 (선택사항)
        this.updateScrollProgress(scrollTop);
    }

    toggleHeaderOnScroll(scrollTop) {
        const header = document.querySelector('.site-header');
        if (header) {
            if (scrollTop > 100) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
        }
    }

    updateScrollProgress(scrollTop) {
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / documentHeight) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    restoreScrollPosition() {
        const savedPosition = sessionStorage.getItem('scrollPosition');
        if (savedPosition) {
            window.scrollTo(0, parseInt(savedPosition));
        }
    }

    /**
     * 폰트 로딩 최적화
     */
    optimizeFontLoading() {
        // 폰트 로딩 상태 확인
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                console.log('✅ All fonts loaded');
                document.body.classList.add('fonts-loaded');
            });
            
            // 개별 폰트 로딩 확인
            const fontFaces = [
                'Noto Sans KR',
                'Roboto',
                'Monaco'
            ];
            
            fontFaces.forEach(fontFamily => {
                document.fonts.load(`1em ${fontFamily}`).then(() => {
                    console.log(`✅ Font loaded: ${fontFamily}`);
                }).catch(error => {
                    console.warn(`⚠️ Font load failed: ${fontFamily}`, error);
                });
            });
        }
    }

    /**
     * 이미지 최적화
     */
    setupImageOptimization() {
        // 이미지 압축 및 형식 최적화
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // 이미지 로드 에러 처리
            img.addEventListener('error', () => {
                console.warn('Image load failed:', img.src);
                this.handleImageError(img);
            });
            
            // 이미지 크기 최적화
            this.optimizeImageSize(img);
        });
    }

    handleImageError(img) {
        // 대체 이미지 표시
        img.src = '/assets/images/placeholder.svg';
        img.alt = '이미지를 불러올 수 없습니다';
        img.classList.add('image-error');
    }

    optimizeImageSize(img) {
        img.addEventListener('load', () => {
            const containerWidth = img.parentElement.offsetWidth;
            const imageWidth = img.naturalWidth;
            
            // 이미지가 컨테이너보다 큰 경우 최적화 제안
            if (imageWidth > containerWidth * 2) {
                console.warn('Large image detected:', {
                    src: img.src,
                    naturalWidth: imageWidth,
                    containerWidth: containerWidth,
                    suggestion: `Consider resizing to ${containerWidth * 2}px width`
                });
            }
        });
    }

    /**
     * 캐시 관리
     */
    setupCacheManagement() {
        // 로컬 스토리지 관리
        this.cleanupLocalStorage();
        
        // 캐시 API 사용 (서비스 워커와 함께)
        if ('caches' in window) {
            this.manageCacheStorage();
        }
    }

    cleanupLocalStorage() {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const item = localStorage.getItem(key);
            
            try {
                const data = JSON.parse(item);
                if (data.timestamp && (now - data.timestamp) > maxAge) {
                    localStorage.removeItem(key);
                    console.log('Cleaned up old cache:', key);
                }
            } catch (error) {
                // JSON이 아닌 데이터는 건너뛰기
                continue;
            }
        }
    }

    async manageCacheStorage() {
        try {
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(name => 
                name.startsWith('ai-lab-') && name !== 'ai-lab-v1'
            );
            
            // 오래된 캐시 삭제
            await Promise.all(
                oldCaches.map(cacheName => caches.delete(cacheName))
            );
            
            if (oldCaches.length > 0) {
                console.log('Cleaned up old caches:', oldCaches);
            }
        } catch (error) {
            console.error('Cache cleanup failed:', error);
        }
    }

    /**
     * 성능 최적화 유틸리티
     */
    
    // 디바운스 함수
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 스로틀 함수
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 메모이제이션
    memoize(fn) {
        const cache = new Map();
        return function(...args) {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * PWA 기능
     */
    
    // 앱 설치 프롬프트
    setupInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton();
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed');
            this.hideInstallButton();
        });
    }

    showInstallButton() {
        const installButton = document.createElement('button');
        installButton.className = 'install-button';
        installButton.textContent = '앱 설치';
        installButton.addEventListener('click', this.promptInstall.bind(this));
        
        document.body.appendChild(installButton);
    }

    hideInstallButton() {
        const installButton = document.querySelector('.install-button');
        if (installButton) {
            installButton.remove();
        }
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log('Install prompt outcome:', outcome);
            this.deferredPrompt = null;
        }
    }
}

/**
 * 서비스 워커 코드 (sw.js)
 */
const serviceWorkerCode = `
const CACHE_NAME = 'ai-lab-v1';
const urlsToCache = [
    '/',
    '/assets/css/main.css',
    '/assets/js/dashboard.js',
    '/assets/js/performance.js',
    '/assets/images/logo.png',
    '/assets/images/og-default.png'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

// 페치 이벤트
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에 있으면 캐시에서 반환
                if (response) {
                    return response;
                }
                
                // 네트워크에서 가져오기
                return fetch(event.request).then((response) => {
                    // 유효한 응답인지 확인
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // 응답 복사 (스트림은 한 번만 사용 가능)
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
    );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
`;

// 성능 최적화 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.performanceOptimizer = new PerformanceOptimizer();
});

// 전역 함수로 내보내기
window.PerformanceOptimizer = PerformanceOptimizer;

// 서비스 워커 파일 생성 (개발 시에만)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceOptimizer,
        serviceWorkerCode
    };
}