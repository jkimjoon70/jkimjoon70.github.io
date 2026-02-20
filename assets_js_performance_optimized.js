// assets/js/performance.js - 성능 최적화 JavaScript
// 기존 assets/js/ 폴더에 추가

class PerformanceOptimizer {
    constructor() {
        this.isOnline = navigator.onLine;
        this.performanceMetrics = {};
        this.lazyImages = [];
        this.intersectionObserver = null;
        
        console.log('🚀 Performance Optimizer starting...');
        this.init();
    }

    init() {
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeFeatures());
        } else {
            this.initializeFeatures();
        }
    }

    initializeFeatures() {
        // 1. 이미지 지연 로딩 (즉시 효과)
        this.setupLazyLoading();
        
        // 2. 스크롤 최적화
        this.setupScrollOptimization();
        
        // 3. 폰트 로딩 최적화
        this.optimizeFontLoading();
        
        // 4. 성능 모니터링
        this.setupPerformanceMonitoring();
        
        // 5. 네트워크 최적화
        this.setupNetworkOptimization();
        
        console.log('✅ Performance features initialized');
    }

    // 이미지 지연 로딩 - 즉시 성능 향상
    setupLazyLoading() {
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

            // 모든 이미지에 지연 로딩 적용
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (!img.complete) {
                    img.loading = 'lazy';
                    this.intersectionObserver.observe(img);
                }
            });
        }
    }

    loadImage(img) {
        img.classList.add('loaded');
        
        // 이미지 로드 완료 시 페이드인 효과
        img.addEventListener('load', () => {
            img.style.opacity = '1';
            img.style.transition = 'opacity 0.3s ease';
        });
    }

    // 스크롤 성능 최적화
    setupScrollOptimization() {
        let ticking = false;
        
        const optimizedScroll = () => {
            this.updateScrollPosition();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(optimizedScroll);
                ticking = true;
            }
        }, { passive: true });
    }

    updateScrollPosition() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 스크롤 위치 저장
        sessionStorage.setItem('scrollPosition', scrollTop.toString());
        
        // 스크롤 진행률 표시
        this.updateScrollProgress(scrollTop);
    }

    updateScrollProgress(scrollTop) {
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / documentHeight) * 100;
        
        // 스크롤 진행률 바 업데이트 (있는 경우)
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    // 폰트 로딩 최적화
    optimizeFontLoading() {
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                console.log('✅ All fonts loaded');
                document.body.classList.add('fonts-loaded');
            });
        }
    }

    // 성능 모니터링
    setupPerformanceMonitoring() {
        // 페이지 로드 시간 측정
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            
            console.log(`📊 Page load time: ${Math.round(loadTime)}ms`);
            
            // 성능 데이터 저장
            this.performanceMetrics.pageLoadTime = loadTime;
            
            // 느린 로딩 경고
            if (loadTime > 3000) {
                console.warn('⚠️ Slow page load detected');
                this.optimizeForSlowConnection();
            }
        });
    }

    // 네트워크 최적화
    setupNetworkOptimization() {
        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📱 Offline mode');
            this.enableOfflineMode();
        });

        // 연결 품질 감지
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                this.optimizeForSlowConnection();
            }
        }
    }

    optimizeForSlowConnection() {
        console.log('📱 Optimizing for slow connection');
        
        // 애니메이션 비활성화
        document.body.classList.add('reduce-motion');
        
        // 이미지 품질 낮추기 (data-low-quality 속성이 있는 경우)
        const images = document.querySelectorAll('img[data-low-quality]');
        images.forEach(img => {
            img.src = img.dataset.lowQuality;
        });
    }

    enableOfflineMode() {
        // 오프라인 알림 표시
        const offlineNotice = document.createElement('div');
        offlineNotice.className = 'offline-notice';
        offlineNotice.innerHTML = '📱 오프라인 모드 - 일부 기능이 제한될 수 있습니다';
        offlineNotice.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff9800;
            color: white;
            text-align: center;
            padding: 10px;
            z-index: 1000;
            font-size: 14px;
        `;
        
        document.body.appendChild(offlineNotice);
    }

    // 유틸리티 함수들
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
}

// 성능 최적화 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.performanceOptimizer = new PerformanceOptimizer();
});

// 전역 함수로 내보내기
window.PerformanceOptimizer = PerformanceOptimizer;