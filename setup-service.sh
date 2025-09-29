#!/bin/bash
# TechSapo Service Setup Script
# Run this script to set up systemd service

echo "🔧 Setting up TechSapo systemd service..."

# Copy service file
sudo cp /ai/prj/techdev/techsapo.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/techsapo.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable techsapo
sudo systemctl start techsapo

# Check status
echo "📊 Service Status:"
sudo systemctl status techsapo

echo "🌐 Port Status:"
sudo netstat -tlnp | grep :443

echo "📝 Service Logs:"
sudo journalctl -u techsapo --no-pager -n 20

echo ""
echo "✅ Setup complete!"
echo "   Service: sudo systemctl status techsapo"
echo "   Logs: sudo journalctl -u techsapo -f"
echo "   Test: curl -k https://localhost:443/health"