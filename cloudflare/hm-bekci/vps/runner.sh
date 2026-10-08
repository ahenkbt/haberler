#!/bin/bash
# AI Bekçi VPS runner (cron every 2 min). Executes ONLY whitelisted, already-existing jobs queued by the hm-bekci Worker:
#   ai_editor_run  -> /docker/php-theme/ai-editor/ops/run.sh run [--no-fetch]   (same flock as the old cron)
#   rss_import     -> the site's EXISTING importer line from /etc/cron.d/php-theme-importer* (same flock/timeout)
# Also publishes importer liveness (log mtime + last inserted count) to hm_bekci_state('importers').
# Never restarts containers, never touches pbx/goalgo/turkatav-platform.
set -uo pipefail
. /docker/php-theme/bekci/bekci.env   # BEKCI_DB_URL (role hm_bekci)
LOG=/var/log/php-theme/bekci-runner.log
q() { psql "$BEKCI_DB_URL" -X -q -t -A -v ON_ERROR_STOP=1 -c "$1" 2>>"$LOG"; }
ts() { date -u +%FT%TZ; }

# 1) importer liveness -> state (cheap: stat + tail)
json="{"; first=1
for f in /var/log/php-theme/importer*.log; do
  name=$(basename "$f" .log); m=$(stat -c %Y "$f")
  last=$(tail -c 20000 "$f" | grep -oiE '(inserted|new)[" :=]+[0-9]+' | tail -1 | grep -oE '[0-9]+$' || true)
  err=$(tail -n 30 "$f" | grep -ciE 'traceback|error|fatal' || true)
  [ $first -eq 0 ] && json+=","; first=0
  json+="\"$name\":{\"mtime\":$m,\"lastInserted\":${last:-null},\"recentErrors\":${err:-0}}"
done
json+="}"
q "INSERT INTO hm_bekci_state (k,v,updated_at) VALUES ('importers', '$json'::jsonb, now()) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v, updated_at=now()" >/dev/null

# 2) claim one pending request
row=$(q "UPDATE hm_bekci_requests SET status='running', picked_at=now() WHERE id = (SELECT id FROM hm_bekci_requests WHERE status='pending' AND at > now()-interval '6 hours' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id||'|'||kind||'|'||coalesce(site_slug,'')||'|'||coalesce(reason,'')")
q "UPDATE hm_bekci_requests SET status='expired', done_at=now() WHERE status='pending' AND at <= now()-interval '6 hours'" >/dev/null

finish() { q "UPDATE hm_bekci_requests SET status='$2', done_at=now(), result=left('$(echo "$3" | tr -d "'")',500) WHERE id=$1" >/dev/null; }

run_bg() { # id, command...
  local id=$1; shift
  ( out=$("$@" 2>&1 | tail -c 400); rc=$?; finish "$id" "$([ $rc -eq 0 ] && echo done || echo failed)" "rc=$rc ${out: -300}" ) </dev/null >/dev/null 2>&1 &
}

if [ -n "$row" ]; then
  IFS='|' read -r id kind slug reason <<<"$row"
  echo "$(ts) claim #$id $kind $slug ($reason)" >>"$LOG"
  case "$kind" in
    ai_editor_run)
      extra=""; [ "$slug" = "nofetch" ] && extra="--no-fetch"
      run_bg "$id" sh -c "flock -n /run/php-theme-ai-editor.lock timeout 2700 /docker/php-theme/ai-editor/ops/run.sh run $extra >> /var/log/php-theme/ai-editor.log 2>&1; r=\$?; [ \$r -eq 1 ] && echo 'lock busy (another AI editor job running)'; exit \$r"
      ;;
    rss_import)
      if ! [[ "$slug" =~ ^[a-z0-9-]{2,40}$ ]]; then finish "$id" failed "bad slug"; exit 0; fi
      if [ "$slug" = "main" ]; then line=$(grep -h 'php-theme-importer:2 >>' /etc/cron.d/php-theme-importer | grep -v '^#' | head -1)
      else line=$(grep -hE "(IMPORT_SITE_SLUG=$slug |run-sha\.sh $slug )" /etc/cron.d/php-theme-importer* | grep -v '^#' | head -1); fi
      if [ -z "$line" ]; then finish "$id" failed "no importer for $slug"; exit 0; fi
      cmd=$(echo "$line" | awk '{for(i=7;i<=NF;i++) printf "%s ", $i}')
      run_bg "$id" sh -c "$cmd"
      ;;
    *) finish "$id" failed "unknown kind" ;;
  esac
fi

# 3) fallback: AI editor must run automatically even if the Worker cron is down (>4 h without a run, 06-24 TRT)
h=$(TZ=Europe/Istanbul date +%H)
if [ "$h" -ge 6 ]; then
  age=$(q "SELECT coalesce(extract(epoch from now()-max(started_at))::int, 999999) FROM hm_ai_editor_runs WHERE coalesce(dry_run,false)=false AND (stats->'args'->>'cmd'='run' OR args ~* 'cmd.{1,4}run')" || echo 0)
  pend=$(q "SELECT count(*) FROM hm_bekci_requests WHERE kind='ai_editor_run' AND status IN ('pending','running') AND at > now()-interval '3 hours'" || echo 1)
  if [ "${age:-0}" -gt 14400 ] && [ "${pend:-1}" -eq 0 ]; then
    q "INSERT INTO hm_bekci_requests (kind, site_slug, reason) VALUES ('ai_editor_run','fetch','runner fallback: >4h since last run')" >/dev/null
    echo "$(ts) fallback enqueue (last run ${age}s ago)" >>"$LOG"
  fi
fi
exit 0
