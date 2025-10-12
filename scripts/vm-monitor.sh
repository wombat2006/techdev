#!/bin/bash

#############################################
# VM Monitoring Script for techdev
# Monitors: CPU, Memory, Disk, Services
# Sends notifications to line-notification.com
#############################################

set -euo pipefail

# Configuration
readonly SERVER_NAME="techdev"
readonly API_URL="http://line-notification.com:3000/api/notify"
readonly LOG_FILE="/var/log/vm-monitor.log"
readonly LOCK_FILE="/tmp/vm-monitor.lock"

# Thresholds
readonly CPU_WARNING=80
readonly CPU_CRITICAL=95
readonly MEMORY_WARNING=85
readonly MEMORY_CRITICAL=95
readonly DISK_WARNING=85
readonly DISK_CRITICAL=95

# Critical services to monitor
readonly SERVICES=("nginx" "techsapo")

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | sudo tee -a "$LOG_FILE" >/dev/null
}

# Send notification to LINE
send_notification() {
    local message="$1"
    local severity="$2"
    local details="${3:-}"

    local json_payload
    json_payload=$(cat <<EOF
{
  "message": "$message",
  "severity": "$severity",
  "server": "$SERVER_NAME",
  "details": "$details"
}
EOF
)

    log "Sending $severity notification: $message"

    if curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        --max-time 10 >/dev/null 2>&1; then
        log "Notification sent successfully"
        return 0
    else
        log "ERROR: Failed to send notification"
        return 1
    fi
}

# Check CPU usage
check_cpu() {
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal

    log "CPU usage: ${cpu_usage}%"

    if [ "$cpu_usage" -ge "$CPU_CRITICAL" ]; then
        send_notification "CPU usage critical: ${cpu_usage}%" "critical" "Current: ${cpu_usage}%\nThreshold: ${CPU_CRITICAL}%"
        return 1
    elif [ "$cpu_usage" -ge "$CPU_WARNING" ]; then
        send_notification "CPU usage high: ${cpu_usage}%" "warning" "Current: ${cpu_usage}%\nThreshold: ${CPU_WARNING}%"
        return 1
    fi
    return 0
}

# Check memory usage
check_memory() {
    local mem_usage
    mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

    log "Memory usage: ${mem_usage}%"

    if [ "$mem_usage" -ge "$MEMORY_CRITICAL" ]; then
        local mem_details
        mem_details=$(free -h | grep Mem | awk '{print "Used: "$3" / Total: "$2}')
        send_notification "Memory usage critical: ${mem_usage}%" "critical" "Current: ${mem_usage}%\n${mem_details}\nThreshold: ${MEMORY_CRITICAL}%"
        return 1
    elif [ "$mem_usage" -ge "$MEMORY_WARNING" ]; then
        local mem_details
        mem_details=$(free -h | grep Mem | awk '{print "Used: "$3" / Total: "$2}')
        send_notification "Memory usage high: ${mem_usage}%" "warning" "Current: ${mem_usage}%\n${mem_details}\nThreshold: ${MEMORY_WARNING}%"
        return 1
    fi
    return 0
}

# Check disk space
check_disk() {
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    log "Disk usage: ${disk_usage}%"

    if [ "$disk_usage" -ge "$DISK_CRITICAL" ]; then
        local disk_details
        disk_details=$(df -h / | awk 'NR==2 {print "Used: "$3" / Total: "$2" ("$5")"}')
        send_notification "Disk space critical: ${disk_usage}%" "critical" "Root partition:\n${disk_details}\nThreshold: ${DISK_CRITICAL}%"
        return 1
    elif [ "$disk_usage" -ge "$DISK_WARNING" ]; then
        local disk_details
        disk_details=$(df -h / | awk 'NR==2 {print "Used: "$3" / Total: "$2" ("$5")"}')
        send_notification "Disk space low: ${disk_usage}%" "warning" "Root partition:\n${disk_details}\nThreshold: ${DISK_WARNING}%"
        return 1
    fi
    return 0
}

# Check service status
check_services() {
    local failed_services=()

    for service in "${SERVICES[@]}"; do
        if ! sudo systemctl is-active --quiet "$service"; then
            log "Service $service is not running"
            failed_services+=("$service")
        else
            log "Service $service is running"
        fi
    done

    if [ ${#failed_services[@]} -gt 0 ]; then
        local services_list
        services_list=$(printf '%s\n' "${failed_services[@]}")
        send_notification "Critical services down" "critical" "Failed services:\n${services_list}"
        return 1
    fi
    return 0
}

# Check system load
check_load() {
    local cpu_count
    cpu_count=$(nproc)
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

    # Convert to integer for comparison
    local load_int
    load_int=${load_avg%.*}
    local threshold=$((cpu_count * 2))

    log "System load: ${load_avg} (CPUs: ${cpu_count})"

    if [ "$load_int" -ge "$threshold" ]; then
        send_notification "System load high" "warning" "Load average: ${load_avg}\nCPU count: ${cpu_count}\nThreshold: ${threshold}"
        return 1
    fi
    return 0
}

# Main execution
main() {
    # Check for lock file to prevent concurrent runs
    if [ -f "$LOCK_FILE" ]; then
        log "Another instance is running. Exiting."
        exit 0
    fi

    # Create lock file
    touch "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT

    log "=== Starting VM monitoring check ==="

    local exit_code=0

    # Run all checks
    check_cpu || exit_code=1
    check_memory || exit_code=1
    check_disk || exit_code=1
    check_services || exit_code=1
    check_load || exit_code=1

    if [ $exit_code -eq 0 ]; then
        log "All checks passed"
    else
        log "Some checks failed"
    fi

    log "=== Monitoring check completed ==="

    exit $exit_code
}

# Run main function
main "$@"
