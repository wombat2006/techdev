#!/bin/bash

#############################################
# VM Monitoring Script for techdev
# Monitors: CPU, Memory, Disk, Services
# Sends notifications to line-notification.com
#
# Usage:
#   vm-monitor.sh --mode check   # Error monitoring (notify on issues only)
#   vm-monitor.sh --mode report  # Periodic health report (always notify)
#############################################

set -euo pipefail

# Configuration
readonly SERVER_NAME="techdev"
readonly API_URL="https://line-notification.com/api/notify"
readonly LOG_FILE="/var/log/vm-monitor.log"
readonly LOCK_FILE="/tmp/vm-monitor.lock"

# Get global IP address (Elastic IP)
get_global_ip() {
    # Try multiple services for reliability
    curl -s --max-time 5 ifconfig.me 2>/dev/null || \
    curl -s --max-time 5 api.ipify.org 2>/dev/null || \
    dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || \
    echo "N/A"
}

# Get FQDN via reverse DNS lookup from global IP
get_fqdn() {
    local global_ip=$(get_global_ip)
    if [ "$global_ip" != "N/A" ]; then
        # Try reverse DNS lookup using host command
        local fqdn=$(host "$global_ip" 2>/dev/null | awk '/domain name pointer/ {print $5}' | sed 's/\.$//')
        if [ -n "$fqdn" ]; then
            echo "$fqdn"
        else
            # Fallback to local hostname if reverse DNS fails
            hostname -f 2>/dev/null || hostname
        fi
    else
        # Fallback to local hostname if global IP cannot be determined
        hostname -f 2>/dev/null || hostname
    fi
}

# Get primary IP address (use global Elastic IP)
get_primary_ip() {
    get_global_ip
}

# Get EC2 region information
get_ec2_region() {
    # Try IMDSv2 (token-based, more secure)
    local token=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" \
        --max-time 2 2>/dev/null)

    if [ -n "$token" ]; then
        # Get availability zone with token
        local az=$(curl -s -H "X-aws-ec2-metadata-token: $token" \
            http://169.254.169.254/latest/meta-data/placement/availability-zone \
            --max-time 2 2>/dev/null)
    else
        # Fallback to IMDSv1 (without token)
        local az=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone \
            --max-time 2 2>/dev/null)
    fi

    # Extract region from availability zone (remove last character)
    if [ -n "$az" ]; then
        echo "${az%?}"
    else
        echo "N/A"
    fi
}

# Default mode
MODE="check"

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

    local fqdn=$(get_fqdn)
    local primary_ip=$(get_primary_ip)
    local region=$(get_ec2_region)

    local server_info="$SERVER_NAME ($fqdn / $primary_ip"
    if [ "$region" != "N/A" ]; then
        server_info+=" / $region"
    fi
    server_info+=")"

    local json_payload
    json_payload=$(cat <<EOF
{
  "message": "$message",
  "severity": "$severity",
  "server": "$server_info",
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

# Get current metrics
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{printf "%.0f", 100 - $1}'
}

get_memory_usage() {
    free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}'
}

get_disk_usage() {
    df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

get_load_average() {
    uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'
}

get_uptime() {
    uptime -p | sed 's/up //'
}

# Send periodic health report
send_health_report() {
    log "Generating periodic health report"

    local cpu_usage=$(get_cpu_usage)
    local mem_usage=$(get_memory_usage)
    local disk_usage=$(get_disk_usage)
    local load_avg=$(get_load_average)
    local uptime_str=$(get_uptime)
    local cpu_count=$(nproc)

    # Check service status
    local services_status=""
    for service in "${SERVICES[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            services_status+="✅ $service\n"
        else
            services_status+="❌ $service\n"
        fi
    done

    # Determine overall health status
    local health_status="✅ Healthy"
    local severity="success"

    if [ "$cpu_usage" -ge "$CPU_CRITICAL" ] || [ "$mem_usage" -ge "$MEMORY_CRITICAL" ] || [ "$disk_usage" -ge "$DISK_CRITICAL" ]; then
        health_status="🚨 Critical"
        severity="critical"
    elif [ "$cpu_usage" -ge "$CPU_WARNING" ] || [ "$mem_usage" -ge "$MEMORY_WARNING" ] || [ "$disk_usage" -ge "$DISK_WARNING" ]; then
        health_status="⚠️ Warning"
        severity="warning"
    fi

    # Build detailed report
    local fqdn=$(get_fqdn)
    local primary_ip=$(get_primary_ip)
    local region=$(get_ec2_region)

    local details="🖥️ Server: ${fqdn} (${primary_ip}"
    if [ "$region" != "N/A" ]; then
        details+=" / ${region}"
    fi
    details+=")\n"
    details+="\n📊 System Metrics:\n"
    details+="CPU: ${cpu_usage}% (${cpu_count} cores)\n"
    details+="Memory: ${mem_usage}%\n"
    details+="Disk: ${disk_usage}%\n"
    details+="Load Avg: ${load_avg}\n"
    details+="Uptime: ${uptime_str}\n"
    details+="\n🔧 Services:\n${services_status}"

    send_notification "Periodic Health Report: ${health_status}" "$severity" "$details"

    log "Periodic health report sent"
}

# Main execution
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode)
                MODE="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 --mode <check|report>"
                exit 1
                ;;
        esac
    done

    # Validate mode
    if [[ "$MODE" != "check" && "$MODE" != "report" ]]; then
        echo "Invalid mode: $MODE"
        echo "Mode must be 'check' or 'report'"
        exit 1
    fi

    # Check for lock file to prevent concurrent runs
    if [ -f "$LOCK_FILE" ]; then
        log "Another instance is running. Exiting."
        exit 0
    fi

    # Create lock file
    touch "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT

    log "=== Starting VM monitoring ($MODE mode) ==="

    if [ "$MODE" = "report" ]; then
        # Periodic health report mode - always send status
        send_health_report
        log "=== Health report completed ==="
        exit 0
    else
        # Error monitoring mode - only notify on issues
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
    fi
}

# Run main function
main "$@"
