// AI Lab Dashboard — PRO Monitoring Edition

class BlogDashboard {
    constructor() {
        this.repoOwner = 'jkimjoon70';
        this.repoName = 'jkimjoon70.github.io';
        this.siteUrl = 'https://jkimjoon70.github.io';
        this.apiBase = 'https://api.github.com';

        // ⭐ OPTIONAL: GitHub Token (Rate limit 증가)
        this.githubToken = null; 
        // this.githubToken = "ghp_xxxxxxxxxxxxx";

        this.cache = {};
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    async init() {
        console.log('🚀 AI Lab Dashboard PRO Starting...');
        this.updateTimestamp();
        await this.loadAllMetrics();
        this.setupAutoRefresh();
    }

    // =========================
    // UTILITIES
    // =========================

    async fetchWithCache(key, url) {
        const now = Date.now();

        if (this.cache[key] && now - this.cache[key].time < this.cacheTTL) {
            return this.cache[key].data;
        }

        const headers = this.githubToken
            ? { Authorization: `token ${this.githubToken}` }
            : {};

        const res = await fetch(url, { headers });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const data = await res.json();
        this.cache[key] = { data, time: now };

        return data;
    }

    updateTimestamp() {
        const now = new Date();
        const el = document.getElementById('last-update-time');
        if (el) el.textContent = now.toLocaleString('ko-KR');
    }

    // =========================
    // LOAD METRICS
    // =========================

    async loadAllMetrics() {
        const results = await Promise.allSettled([
            this.fetchRepoStats(),
            this.checkSiteHealth(),
            this.getRealPostCount(),
            this.getBuildStatus(),
            this.detectAutomationFailure()
        ]);

        if (results[0].status === 'fulfilled') this.updateRepoMetrics(results[0].value);
        if (results[1].status === 'fulfilled') this.updateSiteHealth(results[1].value);
        if (results[2].status === 'fulfilled') this.updatePostMetrics(results[2].value);
        if (results[3].status === 'fulfilled') this.updateBuildStatus(results[3].value);
        if (results[4].status === 'fulfilled') this.updateAutomationStatus(results[4].value);

        this.updateActivityTimeline();
    }

    // =========================
    // REPO STATS
    // =========================

    async fetchRepoStats() {
        return await this.fetchWithCache(
            'repo',
            `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}`
        );
    }

    updateRepoMetrics(data) {
        const size = document.querySelector('[data-metric="repo-size"]');
        if (size) size.textContent = `${(data.size / 1024).toFixed(1)} MB`;
    }

    // =========================
    // SITE HEALTH CHECK (정확 개선)
    // =========================

    async checkSiteHealth() {
        const start = performance.now();

        try {
            await fetch(`${this.siteUrl}/sitemap.xml?nocache=${Date.now()}`);
            const ms = Math.round(performance.now() - start);

            return { status: 'online', responseTime: ms };
        } catch {
            return { status: 'offline' };
        }
    }

    updateSiteHealth(health) {
        const status = document.getElementById('site-status');
        const text = document.getElementById('site-status-text');
        const speed = document.getElementById('response-time');

        if (health.status === 'online') {
            status.textContent = '🟢';
            text.textContent = 'Online';
            speed.textContent = health.responseTime + 'ms';
        } else {
            status.textContent = '🔴';
            text.textContent = 'Offline';
        }
    }

    // =========================
    // REAL POST COUNT (RSS 기반)
    // =========================

    async getRealPostCount() {
        try {
            const res = await fetch(`${this.siteUrl}/feed.xml`);
            const text = await res.text();
            const matches = text.match(/<item>/g);
            return matches ? matches.length : 0;
        } catch {
            return 0;
        }
    }

    updatePostMetrics(count) {
        const el = document.getElementById('post-count');
        if (el) el.textContent = count;
    }

    // =========================
    // BUILD STATUS MONITOR
    // =========================

    async getBuildStatus() {
        const runs = await this.fetchWithCache(
            'actions',
            `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/actions/runs?per_page=1`
        );

        return runs.workflow_runs[0];
    }

    updateBuildStatus(run) {
        const status = document.getElementById('build-status');

        if (!status) return;

        if (run.conclusion === 'success') {
            status.textContent = '🟢 Passing';
        } else if (run.conclusion === 'failure') {
            status.textContent = '🔴 Failed';
        } else {
            status.textContent = '🟡 Running';
        }
    }

    // =========================
    // AUTOMATION FAILURE DETECTION 🚨
    // =========================

    async detectAutomationFailure() {
        const commits = await this.fetchWithCache(
            'commits',
            `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/commits?per_page=1`
        );

        const lastCommit = new Date(commits[0].commit.author.date);
        const hoursAgo = (Date.now() - lastCommit) / 3600000;

        return hoursAgo > 24;
    }

    updateAutomationStatus(isFailing) {
        const el = document.getElementById('automation-status');
        if (!el) return;

        if (isFailing) {
            el.textContent = '⚠️ 자동 포스팅 멈춤 가능';
            el.style.color = 'red';
        } else {
            el.textContent = '✅ 자동화 정상 작동';
            el.style.color = 'limegreen';
        }
    }

    // =========================
    // RECENT ACTIVITY
    // =========================

    async updateActivityTimeline() {
        const container = document.getElementById('activity-timeline');
        if (!container) return;

        const commits = await this.fetchWithCache(
            'timeline',
            `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/commits?per_page=5`
        );

        container.innerHTML = commits.map(c => {
            const date = new Date(c.commit.author.date);
            return `
                <div class="activity-item">
                    <strong>${c.commit.message}</strong>
                    <br><small>${date.toLocaleString('ko-KR')}</small>
                </div>
            `;
        }).join('');
    }

    // =========================
    // AUTO REFRESH
    // =========================

    setupAutoRefresh() {
        setInterval(() => {
            this.updateTimestamp();
            this.loadAllMetrics();
        }, 5 * 60 * 1000);
    }
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new BlogDashboard();
});
