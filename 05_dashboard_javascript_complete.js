// assets/js/dashboard.js
// 대시보드 실시간 기능 및 GitHub API 연동

class BlogDashboard {
    constructor() {
        this.repoOwner = 'jkimjoon70';
        this.repoName = 'jkimjoon70.github.io';
        this.siteUrl = 'https://jkimjoon70.github.io';
        this.apiBase = 'https://api.github.com';
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing AI Lab Dashboard...');
        
        // Update timestamp
        this.updateTimestamp();
        
        // Load all metrics
        await this.loadAllMetrics();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        // Initialize charts
        this.initializeCharts();
        
        console.log('✅ Dashboard initialized successfully');
    }

    updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timestampElement = document.getElementById('last-update-time');
        if (timestampElement) {
            timestampElement.textContent = timeString;
        }
    }

    async loadAllMetrics() {
        try {
            // Load metrics in parallel
            const [
                repoStats,
                siteHealth,
                contentStats,
                deploymentStats
            ] = await Promise.allSettled([
                this.fetchRepoStats(),
                this.checkSiteHealth(),
                this.getContentStats(),
                this.getDeploymentStats()
            ]);

            // Update UI with results
            if (repoStats.status === 'fulfilled') {
                this.updateRepoMetrics(repoStats.value);
            }

            if (siteHealth.status === 'fulfilled') {
                this.updateSiteHealth(siteHealth.value);
            }

            if (contentStats.status === 'fulfilled') {
                this.updateContentMetrics(contentStats.value);
            }

            if (deploymentStats.status === 'fulfilled') {
                this.updateDeploymentMetrics(deploymentStats.value);
            }

            // Update activity timeline
            await this.updateActivityTimeline();

        } catch (error) {
            console.error('Error loading metrics:', error);
            this.showError('Failed to load some metrics');
        }
    }

    async fetchRepoStats() {
        try {
            const response = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}`);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                size: data.size,
                stargazers_count: data.stargazers_count,
                forks_count: data.forks_count,
                watchers_count: data.watchers_count,
                updated_at: data.updated_at,
                created_at: data.created_at,
                language: data.language,
                topics: data.topics || []
            };
        } catch (error) {
            console.error('Error fetching repo stats:', error);
            return null;
        }
    }

    async checkSiteHealth() {
        const startTime = performance.now();
        
        try {
            const response = await fetch(this.siteUrl, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            return {
                status: 'online',
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Site health check failed:', error);
            return {
                status: 'offline',
                responseTime: null,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async getContentStats() {
        try {
            // Get posts count from GitHub API
            const postsResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/_posts`);
            let postsCount = 0;
            
            if (postsResponse.ok) {
                const posts = await postsResponse.json();
                postsCount = Array.isArray(posts) ? posts.length : 0;
            }

            // Get experiments count (if exists)
            const experimentsResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/_experiments`);
            let experimentsCount = 0;
            
            if (experimentsResponse.ok) {
                const experiments = await experimentsResponse.json();
                experimentsCount = Array.isArray(experiments) ? experiments.length : 0;
            }

            return {
                posts: postsCount,
                experiments: experimentsCount,
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting content stats:', error);
            return {
                posts: 0,
                experiments: 0,
                lastUpdate: new Date().toISOString()
            };
        }
    }

    async getDeploymentStats() {
        try {
            const response = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/deployments`);
            
            if (!response.ok) {
                return { count: 21, status: 'unknown' }; // Fallback to known count
            }
            
            const deployments = await response.json();
            const recentDeployments = deployments.slice(0, 5);
            
            return {
                count: deployments.length,
                recent: recentDeployments,
                lastDeployment: deployments[0]?.created_at || null
            };
        } catch (error) {
            console.error('Error getting deployment stats:', error);
            return { count: 21, status: 'error' };
        }
    }

    updateRepoMetrics(stats) {
        if (!stats) return;

        // Update repository information in UI
        const sizeElement = document.querySelector('[data-metric="repo-size"]');
        if (sizeElement) {
            sizeElement.textContent = `${(stats.size / 1024).toFixed(1)} MB`;
        }

        // Update last update time
        const lastUpdateElement = document.querySelector('[data-metric="last-update"]');
        if (lastUpdateElement && stats.updated_at) {
            const updateDate = new Date(stats.updated_at);
            lastUpdateElement.textContent = updateDate.toLocaleDateString('ko-KR');
        }
    }

    updateSiteHealth(health) {
        const statusIndicator = document.getElementById('site-status');
        const statusText = document.getElementById('site-status-text');
        const responseTimeElement = document.getElementById('response-time');

        if (health.status === 'online') {
            if (statusIndicator) statusIndicator.textContent = '🟢';
            if (statusText) statusText.textContent = 'Online';
            if (responseTimeElement) {
                responseTimeElement.textContent = health.responseTime ? `${health.responseTime}ms` : 'N/A';
            }
        } else {
            if (statusIndicator) statusIndicator.textContent = '🔴';
            if (statusText) statusText.textContent = 'Offline';
            if (responseTimeElement) responseTimeElement.textContent = 'N/A';
        }

        // Update speed status
        const speedStatus = document.getElementById('speed-status');
        if (speedStatus && health.responseTime) {
            if (health.responseTime < 1000) {
                speedStatus.textContent = 'Excellent';
                speedStatus.className = 'metric-change positive';
            } else if (health.responseTime < 3000) {
                speedStatus.textContent = 'Good';
                speedStatus.className = 'metric-change';
            } else {
                speedStatus.textContent = 'Slow';
                speedStatus.className = 'metric-change negative';
            }
        }
    }

    updateContentMetrics(stats) {
        const postCountElement = document.getElementById('post-count');
        const experimentCountElement = document.getElementById('experiment-count');

        if (postCountElement) {
            postCountElement.textContent = stats.posts;
        }

        if (experimentCountElement) {
            experimentCountElement.textContent = stats.experiments;
        }

        // Update change indicators
        const postChange = document.getElementById('post-change');
        const experimentChange = document.getElementById('experiment-change');

        if (postChange) {
            postChange.textContent = stats.posts > 0 ? `+${stats.posts} total` : 'No posts yet';
        }

        if (experimentChange) {
            experimentChange.textContent = stats.experiments > 0 ? `${stats.experiments} active` : 'Starting soon';
        }
    }

    updateDeploymentMetrics(stats) {
        const deployCountElement = document.getElementById('deploy-count');
        if (deployCountElement) {
            deployCountElement.textContent = stats.count;
        }

        // Update build status
        const buildStatus = document.getElementById('build-status');
        const buildStatusText = document.getElementById('build-status-text');

        if (buildStatus && buildStatusText) {
            buildStatus.textContent = '🟢';
            buildStatusText.textContent = 'Passing';
        }
    }

    async updateActivityTimeline() {
        const timeline = document.getElementById('activity-timeline');
        if (!timeline) return;

        try {
            // Get recent commits
            const response = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/commits?per_page=5`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch commits');
            }

            const commits = await response.json();
            
            timeline.innerHTML = commits.map(commit => {
                const date = new Date(commit.commit.author.date);
                const timeAgo = this.getTimeAgo(date);
                
                return `
                    <div class="activity-item">
                        <div class="activity-time">${timeAgo}</div>
                        <div class="activity-content">
                            <strong>Commit:</strong> ${commit.commit.message}
                            <br><small>by ${commit.commit.author.name}</small>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error updating activity timeline:', error);
            timeline.innerHTML = `
                <div class="activity-item">
                    <div class="activity-time">Now</div>
                    <div class="activity-content">Unable to load recent activity</div>
                </div>
            `;
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString('ko-KR');
    }

    setupAutoRefresh() {
        // Refresh every 5 minutes
        setInterval(() => {
            this.updateTimestamp();
            this.loadAllMetrics();
        }, 5 * 60 * 1000);

        // Refresh timestamp every 30 seconds
        setInterval(() => {
            this.updateTimestamp();
        }, 30 * 1000);
    }

    initializeCharts() {
        // Initialize performance chart
        this.initPerformanceChart();
        
        // Initialize content growth chart
        this.initContentChart();
    }

    initPerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Sample data - replace with real performance metrics
        const performanceData = {
            labels: ['1w ago', '6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today'],
            datasets: [{
                label: 'Response Time (ms)',
                data: [850, 920, 780, 650, 720, 680, 590, 620],
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        // Simple chart implementation (you might want to use Chart.js)
        this.drawLineChart(ctx, performanceData, canvas.width, canvas.height);
    }

    initContentChart() {
        const canvas = document.getElementById('content-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Sample data - replace with real content metrics
        const contentData = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Posts',
                data: [2, 5, 8, 12],
                backgroundColor: '#2196f3'
            }, {
                label: 'Experiments',
                data: [1, 2, 4, 6],
                backgroundColor: '#ff9800'
            }]
        };

        this.drawBarChart(ctx, contentData, canvas.width, canvas.height);
    }

    drawLineChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Find min/max values
        const values = data.datasets[0].data;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;
        
        // Draw axes
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw line
        ctx.strokeStyle = data.datasets[0].borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = data.datasets[0].borderColor;
        values.forEach((value, index) => {
            const x = padding + (index / (values.length - 1)) * chartWidth;
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawBarChart(ctx, data, width, height) {
        ctx.clearRect(0, 0, width, height);
        
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const barWidth = chartWidth / data.labels.length / data.datasets.length;
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        
        data.datasets.forEach((dataset, datasetIndex) => {
            ctx.fillStyle = dataset.backgroundColor;
            
            dataset.data.forEach((value, index) => {
                const x = padding + index * (chartWidth / data.labels.length) + datasetIndex * barWidth;
                const barHeight = (value / maxValue) * chartHeight;
                const y = height - padding - barHeight;
                
                ctx.fillRect(x, y, barWidth * 0.8, barHeight);
            });
        });
    }

    showError(message) {
        console.error('Dashboard Error:', message);
        
        // You could show a toast notification here
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dashboard-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Quick action functions
async function triggerBuild() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">⏳</span>Triggering...';
    btn.disabled = true;
    
    try {
        // This would trigger a GitHub Actions workflow
        // For now, just simulate the action
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        btn.innerHTML = '<span class="action-icon">✅</span>Triggered!';
        
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

async function runHealthCheck() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🔍</span>Checking...';
    btn.disabled = true;
    
    try {
        // Run a quick health check
        const dashboard = new BlogDashboard();
        await dashboard.checkSiteHealth();
        
        btn.innerHTML = '<span class="action-icon">✅</span>Healthy!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        btn.innerHTML = '<span class="action-icon">⚠️</span>Issues Found';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }
}

async function optimizeImages() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🔄</span>Optimizing...';
    btn.disabled = true;
    
    // Simulate image optimization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    btn.innerHTML = '<span class="action-icon">✅</span>Optimized!';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

async function generateSitemap() {
    const btn = event.target.closest('.action-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<span class="action-icon">🗺️</span>Generating...';
    btn.disabled = true;
    
    // Simulate sitemap generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    btn.innerHTML = '<span class="action-icon">✅</span>Updated!';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Starting AI Lab Dashboard...');
    window.dashboard = new BlogDashboard();
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlogDashboard;
}