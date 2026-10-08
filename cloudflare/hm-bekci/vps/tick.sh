#!/bin/bash
# Calls the hm-bekci Worker tick endpoint (Cloudflare cron triggers for hm-bekci were not firing; this is the schedule driver).
#   tick.sh bekci | ai_fetch | ai_nofetch
. /docker/php-theme/bekci/bekci.env   # BEKCI_TICK_TOKEN
kind="${1:-bekci}"
out=$(curl -s -m 280 -X POST -H "x-bekci-token: ${BEKCI_TICK_TOKEN}" "https://ahenk.net.tr/api/bekci/tick?kind=${kind}" 2>&1)
echo "$(date -u +%FT%TZ) tick ${kind}: ${out:0:200}" >> /var/log/php-theme/bekci-runner.log
