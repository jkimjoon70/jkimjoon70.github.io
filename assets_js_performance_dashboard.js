// assets/js/performance-dashboard.js
// 성능 대시보드 실시간 모니터링 JavaScript

class PerformanceDashboard {
    constructor() {
        this.performanceData = {
            loadTime: 0,
            fcp: 0,
            lcp: 0,
            fid: 0,
            cls: 0,
            networkType: 'unknown',
            networkSpeed: 0
        };
        
        this.loadTimeHistory = [];
        this.vitalsHistory = [];
        this.resourceStats = {
            images: { count: 0, size: 0 },
            css: { count: 0, size: 0 },
            js: { count: 0, size: 0 }
        };
        
        this.init();
    }

    init() {
        console.log('📊 Performance Dashboard initializing...');
        
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
        } else {
            this.startMonitoring();
        }
    }

    startMonitoring() {
        // 성능 메트릭 측정 시작
        this.measurePerformanceMetrics();
        
        // 네트워크 정보 수집
        this.collectNetworkInfo();
        
        // 리소스 분석
        this.analyzeResources();
        
        // 실시간 업데이트 설정
        this.setupRealTimeUpdates();
        
        // 차트 초기화
        this.initializeCharts();
        
        console.log('✅ Performance monitoring started');
    }

    measurePerformanceMetrics() {
        // 페이지 로드 시간 측정
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            this.performanceData.loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
            this.updateLoadTimeDisplay();
            
            // 히스토리에 추가
            this.loadTimeHistory.push({
                timestamp: Date.now(),
                value: this.performanceData.loadTime
            });
            
            // 최대 20개 데이터 포인트 유지
            if (this.loadTimeHistory.length > 20) {
                this.loadTimeHistory.shift();
            }
        });

        // Web Vitals 측정
        this.measureWebVitals();
        
        // 전체 성능 점수 계산
        setTimeout(() => {
            this.calculateOverallScore();
        }, 2000);
    }

    measureWebVitals() {
        // First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const fcp = entries[entries.length - 1];
            this.performanceData.fcp = Math.round(fcp.startTime);
            this.updateFCPDisplay();
        });
        
        try {
            fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
            console.warn('FCP measurement not supported');
        }

        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lcp = entries[entries.length - 1];
            this.performanceData.lcp = Math.round(lcp.startTime);
            this.updateLCPDisplay();
        });
        
        try {
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            console.warn('LCP measurement not supported');
        }

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            if (firstInput) {
                this.performanceData.fid = Math.round(firstInput.processingStart - firstInput.startTime);
                this.updateFIDDisplay();
            }
        });
        
        try {
            fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            console.warn('FID measurement not supported');
        }

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.performanceData.cls = Math.round(clsValue * 1000) / 1000;
            this.updateCLSDisplay();
        });
        
        try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
            console.warn('CLS measurement not supported');
        }
    }

    collectNetworkInfo() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.performanceData.networkType = connection.effectiveType || 'unknown';
            this.performanceData.networkSpeed = connection.downlink || 0;
            
            this.updateNetworkDisplay();
            
            // 네트워크 변경 감지
            connection.addEventListener('change', () => {
                this.performanceData.networkType = connection.effectiveType;
                this.performanceData.networkSpeed = connection.downlink;
                this.updateNetworkDisplay();
                this.generateOptimizationSuggestions();
            });
        }
    }

    analyzeResources() {
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            
            // 리소스 분류 및 분석
            resources.forEach(resource => {
                const url = resource.name;
                const size = resource.transferSize || 0;
                
                if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
                    this.resourceStats.images.count++;
                    this.resourceStats.images.size += size;
                } else if (url.match(/\.css$/i)) {
                    this.resourceStats.css.count++;
                    this.resourceStats.css.size += size;
                } else if (url.match(/\.js$/i)) {
                    this.resourceStats.js.count++;
                    this.resourceStats.js.size += size;
                }
            });
            
            this.updateResourceDisplay();
            this.generateOptimizationSuggestions();
        });
    }

    updateLoadTimeDisplay() {
        const element = document.getElementById('load-time');
        const statusElement = document.getElementById('load-status');
        
        if (element) {
            element.textContent = `${this.performanceData.loadTime}ms`;
        }
        
        if (statusElement) {
            if (this.performanceData.loadTime < 1000) {
                statusElement.textContent = 'Excellent';
                statusElement.className = 'metric-status excellent';
            } else if (this.performanceData.loadTime < 3000) {
                statusElement.textContent = 'Good';
                statusElement.className = 'metric-status good';
            } else {
                statusElement.textContent = 'Needs Improvement';
                statusElement.className = 'metric-status poor';
            }
        }
    }

    updateFCPDisplay() {
        const element = document.getElementById('fcp-time');
        const statusElement = document.getElementById('fcp-status');
        
        if (element) {
            element.textContent = `${this.performanceData.fcp}ms`;
        }
        
        if (statusElement) {
            if (this.performanceData.fcp < 1800) {
                statusElement.textContent = 'Good';
                statusElement.className = 'metric-status excellent';
            } else if (this.performanceData.fcp < 3000) {
                statusElement.textContent = 'Needs Improvement';
                statusElement.className = 'metric-status good';
            } else {
                statusElement.textContent = 'Poor';
                statusElement.className = 'metric-status poor';
            }
        }
    }

    updateLCPDisplay() {
        const element = document.getElementById('lcp-time');
        const statusElement = document.getElementById('lcp-status');
        
        if (element) {
            element.textContent = `${this.performanceData.lcp}ms`;
        }
        
        if (statusElement) {
            if (this.performanceData.lcp < 2500) {
                statusElement.textContent = 'Good';
                statusElement.className = 'metric-status excellent';
            } else if (this.performanceData.lcp < 4000) {
                statusElement.textContent = 'Needs Improvement';
                statusElement.className = 'metric-status good';
            } else {
                statusElement.textContent = 'Poor';
                statusElement.className = 'metric-status poor';
            }
        }
    }

    updateFIDDisplay() {
        const element = document.getElementById('fid-time');
        const statusElement = document.getElementById('fid-status');
        
        if (element) {
            element.textContent = `${this.performanceData.fid}ms`;
        }
        
        if (statusElement) {
            if (this.performanceData.fid < 100) {
                statusElement.textContent = 'Good';
                statusElement.className = 'metric-status excellent';
            } else if (this.performanceData.fid < 300) {
                statusElement.textContent = 'Needs Improvement';
                statusElement.className = 'metric-status good';
            } else {
                statusElement.textContent = 'Poor';
                statusElement.className = 'metric-status poor';
            }
        }
    }

    updateCLSDisplay() {
        const element = document.getElementById('cls-score');
        const statusElement = document.getElementById('cls-status');
        
        if (element) {
            element.textContent = this.performanceData.cls.toFixed(3);
        }
        
        if (statusElement) {
            if (this.performanceData.cls < 0.1) {
                statusElement.textContent = 'Good';
                statusElement.className = 'metric-status excellent';
            } else if (this.performanceData.cls < 0.25) {
                statusElement.textContent = 'Needs Improvement';
                statusElement.className = 'metric-status good';
            } else {
                statusElement.textContent = 'Poor';
                statusElement.className = 'metric-status poor';
            }
        }
    }

    updateNetworkDisplay() {
        const typeElement = document.getElementById('network-type');
        const speedElement = document.getElementById('network-speed');
        
        if (typeElement) {
            typeElement.textContent = this.performanceData.networkType.toUpperCase();
        }
        
        if (speedElement) {
            if (this.performanceData.networkSpeed > 0) {
                speedElement.textContent = `${this.performanceData.networkSpeed} Mbps`;
            } else {
                speedElement.textContent = 'Unknown';
            }
        }
    }

    updateResourceDisplay() {
        // 이미지 통계
        const imageCountEl = document.getElementById('image-count');
        const imageSizeEl = document.getElementById('image-size');
        
        if (imageCountEl) {
            imageCountEl.textContent = this.resourceStats.images.count;
        }
        if (imageSizeEl) {
            imageSizeEl.textContent = Math.round(this.resourceStats.images.size / 1024);
        }
        
        // CSS 통계
        const cssCountEl = document.getElementById('css-count');
        const cssSizeEl = document.getElementById('css-size');
        
        if (cssCountEl) {
            cssCountEl.textContent = this.resourceStats.css.count;
        }
        if (cssSizeEl) {
            cssSizeEl.textContent = Math.round(this.resourceStats.css.size / 1024);
        }
        
        // JavaScript 통계
        const jsCountEl = document.getElementById('js-count');
        const jsSizeEl = document.getElementById('js-size');
        
        if (jsCountEl) {
            jsCountEl.textContent = this.resourceStats.js.count;
        }
        if (jsSizeEl) {
            jsSizeEl.textContent = Math.round(this.resourceStats.js.size / 1024);
        }
    }

    calculateOverallScore() {
        let score = 100;
        
        // 로드 시간 점수 (30점)
        if (this.performanceData.loadTime > 3000) score -= 15;
        else if (this.performanceData.loadTime > 1000) score -= 5;
        
        // FCP 점수 (20점)
        if (this.performanceData.fcp > 3000) score -= 10;
        else if (this.performanceData.fcp > 1800) score -= 5;
        
        // LCP 점수 (25점)
        if (this.performanceData.lcp > 4000) score -= 15;
        else if (this.performanceData.lcp > 2500) score -= 8;
        
        // FID 점수 (15점)
        if (this.performanceData.fid > 300) score -= 10;
        else if (this.performanceData.fid > 100) score -= 5;
        
        // CLS 점수 (10점)
        if (this.performanceData.cls > 0.25) score -= 8;
        else if (this.performanceData.cls > 0.1) score -= 4;
        
        this.updateOverallScore(Math.max(0, score));
    }

    updateOverallScore(score) {
        const scoreElement = document.getElementById('performance-score');
        const scoreNumber = scoreElement?.querySelector('.score-number');
        
        if (scoreNumber) {
            scoreNumber.textContent = score;
        }
        
        if (scoreElement) {
            const percentage = (score / 100) * 360;
            const color = score >= 90 ? '#4caf50' : score >= 70 ? '#ff9800' : '#f44336';
            
            scoreElement.style.background = `conic-gradient(${color} ${percentage}deg, #ddd ${percentage}deg)`;
        }
    }

    generateOptimizationSuggestions() {
        const suggestions = [];
        
        // 로드 시간 기반 제안
        if (this.performanceData.loadTime > 3000) {
            suggestions.push({
                icon: '⚡',
                text: 'Page load time is slow. Consider optimizing images and minifying CSS/JS.'
            });
        }
        
        // 이미지 최적화 제안
        if (this.resourceStats.images.size > 1024 * 1024) { // 1MB 이상
            suggestions.push({
                icon: '🖼️',
                text: 'Large images detected. Consider using WebP format and image compression.'
            });
        }
        
        // 네트워크 기반 제안
        if (this.performanceData.networkType === 'slow-2g' || this.performanceData.networkType === '2g') {
            suggestions.push({
                icon: '📱',
                text: 'Slow network detected. Enable data saver mode for better experience.'
            });
        }
        
        // CLS 개선 제안
        if (this.performanceData.cls > 0.1) {
            suggestions.push({
                icon: '📐',
                text: 'Layout shifts detected. Add dimensions to images and reserve space for dynamic content.'
            });
        }
        
        // FID 개선 제안
        if (this.performanceData.fid > 100) {
            suggestions.push({
                icon: '🎮',
                text: 'Input delay is high. Consider reducing JavaScript execution time.'
            });
        }
        
        this.displaySuggestions(suggestions);
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions-list');
        if (!container) return;
        
        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="suggestion-item">
                    <span class="suggestion-icon">✅</span>
                    <span class="suggestion-text">Great! No optimization suggestions at this time.</span>
                </div>
            `;
            return;
        }
        
        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-text">${suggestion.text}</span>
            </div>
        `).join('');
    }

    setupRealTimeUpdates() {
        // 5초마다 업데이트
        setInterval(() => {
            this.collectNetworkInfo();
            this.generateOptimizationSuggestions();
        }, 5000);
    }

    initializeCharts() {
        // 간단한 차트 구현 (Chart.js 없이)
        this.drawLoadTimeChart();
        this.drawVitalsChart();
    }

    drawLoadTimeChart() {
        const canvas = document.getElementById('load-time-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 차트 배경
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // 데이터가 있으면 그리기
        if (this.loadTimeHistory.length > 1) {
            const maxValue = Math.max(...this.loadTimeHistory.map(d => d.value));
            const minValue = Math.min(...this.loadTimeHistory.map(d => d.value));
            const range = maxValue - minValue || 1;
            
            ctx.strokeStyle = '#2196f3';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            this.loadTimeHistory.forEach((point, index) => {
                const x = (index / (this.loadTimeHistory.length - 1)) * width;
                const y = height - ((point.value - minValue) / range) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }

    drawVitalsChart() {
        const canvas = document.getElementById('vitals-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 차트 배경
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // Web Vitals 바 차트
        const vitals = [
            { name: 'FCP', value: this.performanceData.fcp, max: 3000, color: '#4caf50' },
            { name: 'LCP', value: this.performanceData.lcp, max: 4000, color: '#ff9800' },
            { name: 'FID', value: this.performanceData.fid, max: 300, color: '#2196f3' },
            { name: 'CLS', value: this.performanceData.cls * 1000, max: 250, color: '#9c27b0' }
        ];
        
        const barWidth = width / vitals.length - 20;
        const maxHeight = height - 40;
        
        vitals.forEach((vital, index) => {
            const x = index * (barWidth + 20) + 10;
            const barHeight = (vital.value / vital.max) * maxHeight;
            const y = height - barHeight - 20;
            
            // 바 그리기
            ctx.fillStyle = vital.color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // 라벨 그리기
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(vital.name, x + barWidth / 2, height - 5);
        });
    }
}

// 액션 버튼 함수들
async function optimizeImages() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🔄</span>Optimizing...';
    btn.disabled = true;
    
    try {
        // 이미지 최적화 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        btn.innerHTML = '<span class="action-icon">✅</span>Optimized!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        btn.innerHTML = '<span class="action-icon">❌</span>Failed';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }
}

async function clearCache() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🗑️</span>Clearing...';
    btn.disabled = true;
    
    try {
        // 캐시 클리어
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // 로컬 스토리지 클리어
        localStorage.clear();
        sessionStorage.clear();
        
        btn.innerHTML = '<span class="action-icon">✅</span>Cleared!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        btn.innerHTML = '<span class="action-icon">❌</span>Failed';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }
}

async function runPerformanceAudit() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🔍</span>Auditing...';
    btn.disabled = true;
    
    try {
        // 성능 감사 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 페이지 새로고침으로 새로운 측정 시작
        window.location.reload();
        
    } catch (error) {
        btn.innerHTML = '<span class="action-icon">❌</span>Failed';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }
}

function enableDataSaver() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    // 데이터 절약 모드 활성화
    document.body.classList.add('data-saver-mode');
    localStorage.setItem('dataSaverMode', 'enabled');
    
    btn.innerHTML = '<span class="action-icon">✅</span>Enabled!';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
}

// 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.performanceDashboard = new PerformanceDashboard();
});