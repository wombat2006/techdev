#!/bin/bash
# Let's Encrypt Certificate Renewal Script for TechSapo
# 自動証明書更新 with Nginx reload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/letsencrypt-renewal.log"
DOMAIN="${TECHSAPO_DOMAIN:-localhost}"
EMAIL="${TECHSAPO_EMAIL:-admin@example.com}"
WEBROOT="/var/www/html"
NGINX_CONF="/ai/prj/techsapo/docker/production/nginx.conf"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

# エラーハンドリング
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "🔄 証明書更新プロセス開始"

# Webroot ディレクトリ作成
if [ ! -d "$WEBROOT" ]; then
    sudo mkdir -p "$WEBROOT"
    log "📁 Webroot ディレクトリ作成: $WEBROOT"
fi

# ACME Challenge用ディレクトリ
sudo mkdir -p "$WEBROOT/.well-known/acme-challenge"
sudo chmod 755 "$WEBROOT/.well-known/acme-challenge"

# Nginx設定チェック
if ! sudo nginx -t; then
    error_exit "Nginx設定エラー"
fi

# 証明書更新実行
log "📜 証明書更新実行中..."

if [ "$DOMAIN" = "localhost" ]; then
    log "⚠️  localhost環境のため、テスト用自己署名証明書を生成"
    
    # テスト用証明書生成
    CERT_DIR="/ai/prj/techsapo/docker/production/ssl"
    sudo mkdir -p "$CERT_DIR"
    
    sudo openssl req -x509 -newkey rsa:4096 \
        -keyout "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" \
        -days 90 -nodes \
        -subj "/C=JP/ST=Tokyo/L=Tokyo/O=TechSapo/CN=localhost" \
        -keyform PEM -outform PEM
    
    sudo chmod 600 "$CERT_DIR/server.key"
    sudo chmod 644 "$CERT_DIR/server.crt"
    
    log "✅ テスト証明書生成完了 (90日有効)"
    
else
    # 実際のLet's Encrypt証明書取得
    sudo certbot certonly --webroot \
        -w "$WEBROOT" \
        -d "$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --keep-until-expiring \
        --quiet || error_exit "証明書取得失敗"
    
    # 証明書をNginx用ディレクトリにコピー
    CERT_DIR="/ai/prj/techsapo/docker/production/ssl"
    sudo mkdir -p "$CERT_DIR"
    
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/server.crt"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/server.key"
    
    sudo chmod 644 "$CERT_DIR/server.crt"
    sudo chmod 600 "$CERT_DIR/server.key"
    
    log "✅ Let's Encrypt証明書更新完了"
fi

# Nginx設定再読み込み
log "🔄 Nginx設定再読み込み中..."

if sudo nginx -t; then
    if pgrep nginx > /dev/null; then
        sudo nginx -s reload
        log "✅ Nginx再読み込み完了"
    else
        log "ℹ️  Nginx未起動のため、再読み込みスキップ"
    fi
else
    error_exit "Nginx設定テスト失敗"
fi

# Docker/Podman コンテナが稼働中の場合は再起動
if sudo podman ps --format "{{.Names}}" | grep -q "techsapo"; then
    log "🔄 TechSapoコンテナ再起動中..."
    sudo podman restart $(sudo podman ps --format "{{.Names}}" | grep techsapo) || log "⚠️  コンテナ再起動失敗"
fi

# 証明書有効期限チェック
log "📅 証明書有効期限確認:"
openssl x509 -in "/ai/prj/techsapo/docker/production/ssl/server.crt" -noout -dates | tee -a "$LOG_FILE"

log "🎉 証明書更新プロセス完了"

# 壁打ち分析による結果検証
curl -k -s https://localhost/health > /dev/null && \
    log "✅ HTTPS接続テスト成功" || \
    log "⚠️  HTTPS接続テスト失敗"

exit 0