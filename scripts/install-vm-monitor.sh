#!/bin/bash

##############################################
# VM Monitor Installation Script
# Installs vm-monitor.sh and systemd timers
##############################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Installing VM Monitoring System..."
echo

# 1. Install monitoring script
echo "📝 Installing monitoring script..."
sudo cp "$SCRIPT_DIR/vm-monitor.sh" /usr/local/bin/
sudo chmod +x /usr/local/bin/vm-monitor.sh
echo "✅ Script installed to /usr/local/bin/vm-monitor.sh"
echo

# 2. Create log file
echo "📂 Creating log file..."
sudo touch /var/log/vm-monitor.log
sudo chown $USER:$USER /var/log/vm-monitor.log
echo "✅ Log file created at /var/log/vm-monitor.log"
echo

# 3. Install systemd units
echo "⚙️  Installing systemd units..."
sudo cp "$SCRIPT_DIR/systemd/vm-monitor-check.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/systemd/vm-monitor-check.timer" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/systemd/vm-monitor-report.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/systemd/vm-monitor-report.timer" /etc/systemd/system/
echo "✅ Systemd units installed"
echo

# 4. Reload systemd
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload
echo "✅ Systemd reloaded"
echo

# 5. Enable and start timers
echo "▶️  Enabling and starting timers..."
sudo systemctl enable vm-monitor-check.timer
sudo systemctl start vm-monitor-check.timer
echo "✅ Error monitoring enabled (every 5 minutes)"

sudo systemctl enable vm-monitor-report.timer
sudo systemctl start vm-monitor-report.timer
echo "✅ Health reporting enabled (every 2 hours)"
echo

# 6. Show status
echo "📊 Current Status:"
echo
echo "Error Monitoring Timer:"
sudo systemctl status vm-monitor-check.timer --no-pager || true
echo
echo "Health Report Timer:"
sudo systemctl status vm-monitor-report.timer --no-pager || true
echo

# 7. Show next runs
echo "⏰ Next Scheduled Runs:"
sudo systemctl list-timers vm-monitor-* --no-pager
echo

echo "✅ Installation complete!"
echo
echo "📖 Commands:"
echo "  - Manual error check:  /usr/local/bin/vm-monitor.sh --mode check"
echo "  - Manual health report: /usr/local/bin/vm-monitor.sh --mode report"
echo "  - View logs:           sudo journalctl -u vm-monitor-check.service -f"
echo "  - View logs:           sudo journalctl -u vm-monitor-report.service -f"
echo "  - View script logs:    tail -f /var/log/vm-monitor.log"
echo
