#!/usr/bin/env node

/**
 * TechSapo External Access Verification Proxy Server
 * 外部からの実際のアクセスを検証するためのproxyサーバ
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 設定
const PROXY_PORT = 8080;
const TARGET_HOST = '3.109.102.48';
const TARGET_PORT = 443;
const USE_HTTPS = true;

// ログ関数
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// HTTPプロキシサーバ作成
const proxyServer = http.createServer((req, res) => {
    const requestUrl = url.parse(req.url);

    // CORSヘッダー追加
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    log(`${req.method} ${req.url} from ${req.connection.remoteAddress}`);

    // 特別なデバッグエンドポイント
    if (requestUrl.pathname === '/proxy-status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'proxy_active',
            target: `${USE_HTTPS ? 'https' : 'http'}://${TARGET_HOST}:${TARGET_PORT}`,
            timestamp: new Date().toISOString(),
            requests_proxied: proxyServer.requestCount || 0
        }));
        return;
    }

    // 外部アクセス検証ページ
    if (requestUrl.pathname === '/debug-external-access.html') {
        const debugPath = path.join(__dirname, 'debug-external-access.html');
        if (fs.existsSync(debugPath)) {
            const content = fs.readFileSync(debugPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
            return;
        }
    }

    // ターゲットサーバへのプロキシ設定
    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            'Host': TARGET_HOST,
            'X-Forwarded-For': req.connection.remoteAddress,
            'X-Forwarded-Proto': 'https',
            'X-Proxy-Server': 'TechSapo-External-Verification'
        }
    };

    // HTTPSの場合は証明書検証を無視
    if (USE_HTTPS) {
        options.rejectUnauthorized = false;
    }

    const proxyReq = (USE_HTTPS ? https : http).request(options, (proxyRes) => {
        // レスポンスヘッダーをコピー
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // レスポンスデータをパイプ
        proxyRes.pipe(res);

        log(`Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    });

    // エラーハンドリング
    proxyReq.on('error', (err) => {
        log(`Proxy error for ${req.method} ${req.url}: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Proxy Error',
            message: err.message,
            target: `${USE_HTTPS ? 'https' : 'http'}://${TARGET_HOST}:${TARGET_PORT}${req.url}`
        }));
    });

    // リクエストボディをパイプ
    req.pipe(proxyReq);

    // リクエスト数カウント
    proxyServer.requestCount = (proxyServer.requestCount || 0) + 1;
});

// プロキシサーバ起動
proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
    log(`🚀 TechSapo External Verification Proxy Server started`);
    log(`📡 Listening on: http://0.0.0.0:${PROXY_PORT}`);
    log(`🎯 Proxying to: ${USE_HTTPS ? 'https' : 'http'}://${TARGET_HOST}:${TARGET_PORT}`);
    log(`🔍 Debug page: http://localhost:${PROXY_PORT}/debug-external-access.html`);
    log('');
    log('📋 利用方法:');
    log(`   1. ブラウザで http://localhost:${PROXY_PORT}/ にアクセス`);
    log(`   2. デバッグページ: http://localhost:${PROXY_PORT}/debug-external-access.html`);
    log(`   3. プロキシ状態: http://localhost:${PROXY_PORT}/proxy-status`);
    log('');
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
    log('🔄 Proxy server shutting down gracefully...');
    proxyServer.close(() => {
        log('✅ Proxy server stopped');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    log(`❌ Uncaught Exception: ${err.message}`);
    console.error(err.stack);
});

module.exports = proxyServer;