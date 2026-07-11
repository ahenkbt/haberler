import { Redirect } from "wouter";

/** Eski rota uyumluluğu — iframe paneli kaldırıldı. */
export default function AiCagriMerkezi() {
  return <Redirect to="/admin/yekpare-ai-call" />;
}
