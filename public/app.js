/**
 * TechSapo WebApp Frontend JavaScript
 * Multi-LLM Wall-Bounce Analysis System
 */

// Global state
let autoRefreshInterval = null;
let isAutoRefreshEnabled = false;
let metricsEventSource = null;
let isRealTimeMetricsEnabled = false;

// DOM loaded event
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TechSapo WebApp: DOM Content Loaded');
    try {
        initializeApp();
        loadSystemStatus();
        setupEventListeners();
        console.log('✅ TechSapo WebApp: Initialization complete');
    } catch (error) {
        console.error('❌ TechSapo WebApp: Initialization failed', error);
    }
});

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('📱 TechSapo WebApp: Initializing app');

    // Set initial active tab
    const hash = window.location.hash || '#home';
    const tabName = hash.substring(1);
    console.log('🔄 TechSapo WebApp: Switching to tab:', tabName);
    switchTab(tabName);

    // Load initial system metrics
    console.log('📊 TechSapo WebApp: Loading metrics');
    refreshMetrics();

    console.log('✨ TechSapo WebApp: App initialization complete');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Enter key support for forms
    document.getElementById('tech-query').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeTechProblem();
        }
    });

    document.getElementById('rag-query').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            performRagSearch();
        }
    });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    console.log('🔄 SwitchTab: Switching to', tabName);

    // Update URL hash
    window.location.hash = '#' + tabName;

    // Hide all tab contents
    const allTabs = document.querySelectorAll('.tab-content');
    console.log('🔄 SwitchTab: Found', allTabs.length, 'tabs');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById(tabName);
    console.log('🔄 SwitchTab: Target tab element:', targetTab);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ SwitchTab: Activated tab', tabName);
    } else {
        console.error('❌ SwitchTab: Tab not found:', tabName);
    }

    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/**
 * Load system status
 */
async function loadSystemStatus() {
    try {
        const response = await fetch('/api/v1/health');
        const data = await response.json();

        // Update system status
        document.getElementById('system-status').textContent = data.status === 'ok' ? '正常' : 'エラー';
        document.getElementById('system-status').className = data.status === 'ok' ? 'status-ok' : 'status-error';

        // Update Redis status
        const redisStatus = data.services?.redis || 'unknown';
        document.getElementById('redis-status').textContent = redisStatus === 'ok' ? '接続中' : '切断';
        document.getElementById('redis-status').className = redisStatus === 'ok' ? 'status-ok' : 'status-error';

        // Update uptime
        const uptime = formatUptime(data.uptime || 0);
        document.getElementById('uptime').textContent = uptime;

    } catch (error) {
        console.error('Failed to load system status:', error);
        document.getElementById('system-status').textContent = 'エラー';
        document.getElementById('system-status').className = 'status-error';
        document.getElementById('redis-status').textContent = 'エラー';
        document.getElementById('redis-status').className = 'status-error';
        document.getElementById('uptime').textContent = 'N/A';
    }
}

/**
 * Analyze technical problem using Multi-LLM Wall-Bounce
 */
async function analyzeTechProblem() {
    console.log('🔍 AnalyzeTechProblem: Starting Multi-LLM analysis');
    const queryText = document.getElementById('tech-query').value.trim();
    const supportLevel = document.getElementById('support-level').value;
    const outputDiv = document.getElementById('support-output');

    if (!queryText) {
        showError(outputDiv, '技術的な問題を入力してください。');
        return;
    }

    // Show loading state
    toggleLoading('support', true);
    outputDiv.innerHTML = '<div class="loading">🔄 Multi-LLM Wall-Bounce分析を実行中...</div>';

    try {
        const response = await fetch('/api/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: queryText,
                task_type: supportLevel,
                user_id: 'webapp_user',
                session_id: generateSessionId()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Display results
        outputDiv.innerHTML = `
            <div class="result-header">
                <h3><i class="fas fa-brain"></i> Multi-LLM Wall-Bounce分析結果</h3>
                <div class="result-meta">
                    <span class="badge">レベル: ${result.task_type}</span>
                    <span class="badge">セッション: ${result.session_id}</span>
                </div>
            </div>
            <div class="result-body">
                ${formatAnalysisResult(result.response)}
            </div>
            <div class="result-footer">
                <small>分析完了時刻: ${new Date(result.timestamp).toLocaleString('ja-JP')}</small>
            </div>
        `;

    } catch (error) {
        console.error('Tech analysis failed:', error);
        showError(outputDiv, `分析に失敗しました: ${error.message}`);
    } finally {
        toggleLoading('support', false);
    }
}

/**
 * Perform RAG search with Wall-Bounce analysis
 */
async function performRagSearch() {
    const query = document.getElementById('rag-query').value.trim();
    const vectorStoreId = document.getElementById('vector-store-id').value.trim();
    const enableWallBounce = document.getElementById('enable-wall-bounce').checked;
    const maxResults = parseInt(document.getElementById('max-results').value);
    const outputDiv = document.getElementById('rag-output');

    if (!query) {
        showError(outputDiv, '検索クエリを入力してください。');
        return;
    }

    if (!vectorStoreId) {
        showError(outputDiv, 'Vector Store IDを入力してください。');
        return;
    }

    // Show loading state
    toggleLoading('rag', true);
    outputDiv.innerHTML = '<div class="loading">🔍 RAG検索を実行中...</div>';

    try {
        const response = await fetch('/api/v1/rag/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                vector_store_id: vectorStoreId,
                max_results: maxResults,
                enable_wall_bounce: enableWallBounce,
                wall_bounce_models: ['gpt-5', 'gemini']
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Display results
        displayRagResults(outputDiv, result);

    } catch (error) {
        console.error('RAG search failed:', error);
        showError(outputDiv, `検索に失敗しました: ${error.message}`);
    } finally {
        toggleLoading('rag', false);
    }
}

/**
 * Analyze logs using Multi-LLM Wall-Bounce
 */
async function analyzeLog() {
    const userCommand = document.getElementById('user-command').value.trim();
    const errorOutput = document.getElementById('error-output').value.trim();
    const systemContext = document.getElementById('system-context').value.trim();
    const outputDiv = document.getElementById('logs-output');

    if (!userCommand || !errorOutput) {
        showError(outputDiv, 'コマンドとエラー出力を入力してください。');
        return;
    }

    // Show loading state
    toggleLoading('logs', true);
    outputDiv.innerHTML = '<div class="loading">🐛 ログ解析を実行中...</div>';

    try {
        const response = await fetch('/api/v1/analyze-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_command: userCommand,
                error_output: errorOutput,
                system_context: systemContext || undefined
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Display results
        displayLogAnalysisResults(outputDiv, result);

    } catch (error) {
        console.error('Log analysis failed:', error);
        showError(outputDiv, `ログ解析に失敗しました: ${error.message}`);
    } finally {
        toggleLoading('logs', false);
    }
}

/**
 * Refresh system metrics
 */
async function refreshMetrics() {
    try {
        // If real-time is enabled, don't override with static data
        if (isRealTimeMetricsEnabled) {
            return;
        }

        // Mock metrics for now - in production, these would come from real endpoints
        const metrics = {
            cpuUsage: Math.floor(Math.random() * 100),
            memoryUsage: Math.floor(Math.random() * 100),
            activeConnections: Math.floor(Math.random() * 50),
            responseTime: Math.floor(Math.random() * 200) + 50
        };

        updateMetricsUI(metrics);

    } catch (error) {
        console.error('Failed to refresh metrics:', error);
    }
}

/**
 * Start real-time metrics streaming
 */
function startRealTimeMetrics() {
    if (metricsEventSource) {
        return; // Already connected
    }

    console.log('Starting real-time metrics stream...');

    metricsEventSource = new EventSource('/api/v1/metrics/stream');

    metricsEventSource.onopen = function() {
        console.log('Real-time metrics connected');
        isRealTimeMetricsEnabled = true;
        updateRealTimeStatus(true);
    };

    metricsEventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'metrics' && data.data) {
                updateMetricsFromRealTime(data.data);
            } else if (data.type === 'connected') {
                console.log('Metrics stream:', data.message);
            }
        } catch (error) {
            console.error('Error parsing metrics data:', error);
        }
    };

    metricsEventSource.onerror = function(error) {
        console.error('Real-time metrics error:', error);
        stopRealTimeMetrics();
        isRealTimeMetricsEnabled = false;
        updateRealTimeStatus(false);
    };
}

/**
 * Stop real-time metrics streaming
 */
function stopRealTimeMetrics() {
    if (metricsEventSource) {
        metricsEventSource.close();
        metricsEventSource = null;
        isRealTimeMetricsEnabled = false;
        updateRealTimeStatus(false);
        console.log('Real-time metrics stopped');
    }
}

/**
 * Update metrics UI from real-time data
 */
function updateMetricsFromRealTime(data) {
    const metrics = {
        cpuUsage: data.cpu.usage,
        memoryUsage: data.memory.usage,
        activeConnections: data.network.activeConnections,
        responseTime: data.network.responseTime
    };

    updateMetricsUI(metrics);

    // Update additional real-time info if available
    if (data.memory.heapUsed && data.memory.heapTotal) {
        console.log(`Memory details: ${data.memory.heapUsed}MB / ${data.memory.heapTotal}MB`);
    }
}

/**
 * Update metrics UI (common function)
 */
function updateMetricsUI(metrics) {
    // Update UI
    document.getElementById('cpu-usage').textContent = `${metrics.cpuUsage}%`;
    document.getElementById('memory-usage').textContent = `${metrics.memoryUsage}%`;
    document.getElementById('active-connections').textContent = metrics.activeConnections;
    document.getElementById('response-time').textContent = `${metrics.responseTime}ms`;

    // Apply color coding based on values
    updateMetricColor('cpu-usage', metrics.cpuUsage);
    updateMetricColor('memory-usage', metrics.memoryUsage);
}

/**
 * Toggle auto refresh for metrics
 */
function toggleAutoRefresh() {
    const btn = document.getElementById('auto-refresh-btn');

    if (isAutoRefreshEnabled || isRealTimeMetricsEnabled) {
        // Stop auto refresh or real-time
        if (isRealTimeMetricsEnabled) {
            stopRealTimeMetrics();
        }
        if (isAutoRefreshEnabled) {
            clearInterval(autoRefreshInterval);
            isAutoRefreshEnabled = false;
        }

        btn.innerHTML = '<i class="fas fa-play"></i> 自動更新開始';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    } else {
        // Start real-time metrics (preferred) or fallback to polling
        if (typeof EventSource !== 'undefined') {
            startRealTimeMetrics();
            btn.innerHTML = '<i class="fas fa-wifi"></i> リアルタイム停止';
        } else {
            // Fallback to polling for older browsers
            autoRefreshInterval = setInterval(refreshMetrics, 5000);
            isAutoRefreshEnabled = true;
            btn.innerHTML = '<i class="fas fa-pause"></i> 自動更新停止';
        }

        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');

        // Refresh immediately
        refreshMetrics();
    }
}

/**
 * Update real-time status indicator
 */
function updateRealTimeStatus(isConnected) {
    const btn = document.getElementById('auto-refresh-btn');

    if (isConnected) {
        btn.innerHTML = '<i class="fas fa-wifi"></i> リアルタイム停止';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        btn.title = 'リアルタイム メトリクス接続中';
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i> 自動更新開始';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.title = 'メトリクス更新開始';
    }
}

/**
 * Helper Functions
 */

function toggleLoading(section, isLoading) {
    const loadingIcon = document.getElementById(`${section}-loading`);
    const normalIcon = document.getElementById(`${section}-icon`);

    if (isLoading) {
        loadingIcon.style.display = 'inline';
        normalIcon.style.display = 'none';
    } else {
        loadingIcon.style.display = 'none';
        normalIcon.style.display = 'inline';
    }
}

function showError(outputDiv, message) {
    outputDiv.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>エラー:</strong> ${message}
        </div>
    `;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
        return `${days}日 ${hours}時間 ${minutes}分`;
    } else if (hours > 0) {
        return `${hours}時間 ${minutes}分`;
    } else {
        return `${minutes}分`;
    }
}

function formatAnalysisResult(response) {
    // Simple formatting for now - could be enhanced with markdown parsing
    return `<pre>${response}</pre>`;
}

function displayRagResults(outputDiv, result) {
    if (result.results && result.results.length > 0) {
        let html = `
            <div class="result-header">
                <h3><i class="fas fa-search"></i> RAG検索結果</h3>
                <div class="result-meta">
                    <span class="badge">${result.results.length}件の結果</span>
                </div>
            </div>
        `;

        result.results.forEach((item, index) => {
            html += `
                <div class="search-result">
                    <h4>結果 ${index + 1}</h4>
                    <div class="result-content">${item.content}</div>
                    ${item.metadata ? `<div class="result-metadata">メタデータ: ${JSON.stringify(item.metadata)}</div>` : ''}
                </div>
            `;
        });

        // Add wall-bounce analysis if available
        if (result.wall_bounce_analysis) {
            html += `
                <div class="wall-bounce-results">
                    <h3><i class="fas fa-brain"></i> Wall-Bounce分析</h3>
                    <div class="analysis-content">${JSON.stringify(result.wall_bounce_analysis, null, 2)}</div>
                </div>
            `;
        }

        outputDiv.innerHTML = html;
    } else {
        outputDiv.innerHTML = '<div class="no-results">検索結果が見つかりませんでした。</div>';
    }
}

function displayLogAnalysisResults(outputDiv, result) {
    const analysis = result.analysis_result;

    const html = `
        <div class="result-header">
            <h3><i class="fas fa-bug"></i> ログ解析結果</h3>
            <div class="result-meta">
                <span class="badge severity-${analysis.severity}">${analysis.severity}</span>
            </div>
        </div>
        <div class="analysis-details">
            <div class="analysis-section">
                <h4>コマンド:</h4>
                <code>${analysis.command}</code>
            </div>
            <div class="analysis-section">
                <h4>エラー:</h4>
                <pre>${analysis.error}</pre>
            </div>
            ${analysis.context ? `
            <div class="analysis-section">
                <h4>コンテキスト:</h4>
                <pre>${analysis.context}</pre>
            </div>
            ` : ''}
            <div class="analysis-section">
                <h4>推奨解決策:</h4>
                <ul>
                    ${analysis.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        </div>
        <div class="result-footer">
            <small>分析完了時刻: ${new Date(result.timestamp).toLocaleString('ja-JP')}</small>
        </div>
    `;

    outputDiv.innerHTML = html;
}

function updateMetricColor(elementId, value) {
    const element = document.getElementById(elementId);
    element.classList.remove('status-ok', 'status-warning', 'status-error');

    if (value < 70) {
        element.classList.add('status-ok');
    } else if (value < 90) {
        element.classList.add('status-warning');
    } else {
        element.classList.add('status-error');
    }
}

function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add some CSS for additional styling
const additionalStyles = `
<style>
.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
    font-style: italic;
}

.error-message {
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.result-header {
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
}

.result-header h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.result-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background-color: var(--primary-color);
    color: white;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
}

.severity-low { background-color: var(--success-color); }
.severity-medium { background-color: var(--warning-color); }
.severity-high { background-color: var(--error-color); }
.severity-critical { background-color: #dc2626; }

.search-result {
    background-color: #f8fafc;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.search-result h4 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.result-metadata {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
    font-family: monospace;
}

.wall-bounce-results {
    margin-top: 2rem;
    border-top: 2px solid var(--border-color);
    padding-top: 1rem;
}

.analysis-content {
    background-color: #f1f5f9;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
}

.analysis-details {
    space: 1.5rem;
}

.analysis-section {
    margin-bottom: 1.5rem;
}

.analysis-section h4 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
    font-size: 1rem;
}

.analysis-section ul {
    list-style: none;
    padding: 0;
}

.analysis-section li {
    padding: 0.5rem 0;
    border-left: 3px solid var(--primary-color);
    padding-left: 1rem;
    margin-bottom: 0.5rem;
    background-color: rgba(37, 99, 235, 0.05);
}

.result-footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    text-align: right;
}

.no-results {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    padding: 2rem;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);