# Hook for the VPS AI Haber Editörü (ai_editor.py). Import and call after a real outcome.
# Does not change the editor unless ai_editor.py calls record_activity. Failures are swallowed.
#
#   from ai_editor_activity import record_activity
#   record_activity(con, "rewrite", "haber yeniden yazdı: " + title[:180],
#                   site_id=site_id, site_domain=domain, target_ref=str(article_id))
#   record_activity(con, "column", "köşe yazısı üretti: " + title[:180], site_id=site_id, site_domain=domain)
#   record_activity(con, "hide", "haber gizledi: " + title[:180], site_id=site_id, site_domain=domain, target_ref=slug)
#   record_activity(con, "skip", "atlandı: " + reason[:180], site_id=site_id, site_domain=domain, status="skipped")
#   record_activity(con, "error", "hata: " + str(err)[:180], site_id=site_id, site_domain=domain, status="error")
#
# Table: ai_editor_activity (migration 0017_ai_editor_activity.sql). Never pass API keys in detail.

import json
import re

_SECRET_KEY = re.compile(r"(api[_-]?key|secret|token|password|authorization)", re.I)
_SECRET_VAL = re.compile(r"\b(sk-|sk-proj-|nvapi-|AIza)[A-Za-z0-9_\-]{6,}")


def _scrub(value):
    if isinstance(value, str):
        return _SECRET_VAL.sub("••••", value)[:2000]
    if isinstance(value, dict):
        return {k: _scrub(v) for k, v in value.items() if not _SECRET_KEY.search(str(k))}
    if isinstance(value, list):
        return [_scrub(v) for v in value[:40]]
    return value


def record_activity(con, action, summary, site_id=None, site_domain=None, status="done", target_ref=None, detail=None, actor="ai-editor"):
    """Write one editor outcome. Never raises into the caller."""
    payload = json.dumps(_scrub(detail or {}), ensure_ascii=False)
    args = (
        str(action or "skip")[:80],
        str(summary or "")[:500],
        site_id,
        (site_domain or "")[:200],
        str(status or "done")[:40],
        (str(target_ref)[:300] if target_ref else None),
        payload,
        str(actor or "ai-editor")[:80],
        "editor",
    )
    try:
        con.execute(
            "SELECT ai_editor_activity_write(%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s)",
            args,
        )
        return
    except Exception:
        pass
    try:
        con.execute(
            "INSERT INTO ai_editor_activity (action, summary, site_id, site_domain, status, target_ref, detail, actor, source) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s)",
            args,
        )
    except Exception:
        return
