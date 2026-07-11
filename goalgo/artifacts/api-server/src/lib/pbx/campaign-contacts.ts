/**
 * PBX campaign contacts — list, bulk add, CSV/Excel import, call results.
 */

import { randomUUID } from "node:crypto";
import xlsx from "xlsx";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { ensurePbxTables, listCampaigns } from "./service.js";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

export type PbxCampaignContactStatus =
  | "pending"
  | "dialing"
  | "answered"
  | "no_answer"
  | "failed"
  | "completed";

export type PbxCampaignContact = {
  id: string;
  campaignId: string;
  phone: string;
  name: string;
  status: PbxCampaignContactStatus;
  attempts: number;
  lastAttemptAt: string | null;
  createdAt: string;
};

export type PbxCampaignCallLogRow = {
  id: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  agentId: string | null;
  agentName: string | null;
  status: string;
  durationSec: number;
  startedAt: string;
  endedAt: string | null;
};

export type PbxCampaignResultRow = {
  id: string;
  type: "call_log" | "disposition";
  phone: string;
  agentName: string | null;
  status: string;
  dispositionCode: string | null;
  dispositionLabel: string | null;
  notes: string | null;
  startedAt: string;
};

const VALID_STATUSES = new Set<PbxCampaignContactStatus>([
  "pending",
  "dialing",
  "answered",
  "no_answer",
  "failed",
  "completed",
]);

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("90") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  return digits;
}

export type ParsedCampaignContact = {
  phone: string;
  name: string;
  metadata?: Record<string, string>;
};

type CampaignContactInput = {
  phone: string;
  name?: string;
  metadata?: Record<string, string>;
};

type ColumnIndices = {
  name?: number;
  phone?: number;
  kurumAdi?: number;
  sektor?: number;
  adres?: number;
  ilce?: number;
  il?: number;
};

const HEADER_ALIASES: Record<string, keyof ColumnIndices> = {
  musteri: "name",
  ad: "name",
  isim: "name",
  name: "name",
  customer: "name",
  gsm: "phone",
  telefon: "phone",
  phone: "phone",
  tel: "phone",
  "kurum adi": "kurumAdi",
  kurum: "kurumAdi",
  sektoru: "sektor",
  sektor: "sektor",
  adresi: "adres",
  adres: "adres",
  ilce: "ilce",
  il: "il",
};

const STANDARD_COLUMN_ORDER: ColumnIndices = {
  name: 0,
  phone: 1,
  kurumAdi: 2,
  sektor: 3,
  adres: 4,
  ilce: 5,
  il: 6,
};

function normalizeHeaderKey(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderRow(row: unknown[]): boolean {
  const normalized = row.map((c) => normalizeHeaderKey(String(c ?? "")));
  return normalized.some(
    (h) =>
      h.includes("gsm") ||
      h.includes("telefon") ||
      h.includes("phone") ||
      h === "musteri" ||
      h.includes("musteri") ||
      h === "kurum adi" ||
      h === "sektoru" ||
      h === "adresi" ||
      h === "adres" ||
      h === "ilce" ||
      h === "il",
  );
}

function mapHeaderColumns(headerRow: unknown[]): ColumnIndices {
  const indices: ColumnIndices = {};
  headerRow.forEach((cell, idx) => {
    const key = normalizeHeaderKey(String(cell ?? ""));
    const field = HEADER_ALIASES[key];
    if (field && indices[field] === undefined) {
      indices[field] = idx;
    }
  });
  return indices;
}

function cellStr(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  return String(row[idx] ?? "").trim();
}

function buildMetadata(columns: ColumnIndices, row: unknown[]): Record<string, string> | undefined {
  const meta: Record<string, string> = {};
  const kurumAdi = cellStr(row, columns.kurumAdi);
  const sektor = cellStr(row, columns.sektor);
  const adres = cellStr(row, columns.adres);
  const ilce = cellStr(row, columns.ilce);
  const il = cellStr(row, columns.il);
  if (kurumAdi) meta.kurumAdi = kurumAdi;
  if (sektor) meta.sektor = sektor;
  if (adres) meta.adres = adres;
  if (ilce) meta.ilce = ilce;
  if (il) meta.il = il;
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => !String(c ?? "").trim());
}

function resolveColumnIndices(headerRow: unknown[]): { startRow: number; columns: ColumnIndices; useHeaderMapping: boolean } {
  if (!isHeaderRow(headerRow)) {
    return { startRow: 0, columns: {}, useHeaderMapping: false };
  }

  const mapped = mapHeaderColumns(headerRow);
  const columns: ColumnIndices = { ...STANDARD_COLUMN_ORDER, ...mapped };
  if (mapped.phone === undefined) columns.phone = STANDARD_COLUMN_ORDER.phone;
  if (mapped.name === undefined) columns.name = STANDARD_COLUMN_ORDER.name;

  return { startRow: 1, columns, useHeaderMapping: true };
}

function parseSheetRows(matrix: unknown[][]): ParsedCampaignContact[] {
  const out: ParsedCampaignContact[] = [];
  const seen = new Set<string>();
  if (matrix.length === 0) return out;

  const { startRow, columns, useHeaderMapping } = resolveColumnIndices(matrix[0] ?? []);

  for (let i = startRow; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (isBlankRow(row)) continue;

    let phoneRaw: string;
    let nameRaw: string;
    let metadata: Record<string, string> | undefined;

    if (useHeaderMapping) {
      phoneRaw = cellStr(row, columns.phone);
      nameRaw = cellStr(row, columns.name);
      metadata = buildMetadata(columns, row);
    } else {
      phoneRaw = cellStr(row, 0);
      nameRaw = cellStr(row, 1) || cellStr(row, 2);
    }

    const phone = normalizePhone(phoneRaw);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push({ phone, name: nameRaw, metadata });
  }
  return out;
}

export function parseContactLines(text: string): ParsedCampaignContact[] {
  const out: ParsedCampaignContact[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/[,;\t]/);
    const phone = normalizePhone(parts[0] ?? "");
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push({ phone, name: parts.slice(1).join(" ").trim() });
  }
  return out;
}

export function parseCsvBuffer(buf: Buffer): ParsedCampaignContact[] {
  const text = buf.toString("utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const matrix = lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    if (line.includes(";")) return line.split(";");
    return line.split(",");
  });
  return parseSheetRows(matrix);
}

export function parseXlsxBuffer(buf: Buffer): ParsedCampaignContact[] {
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const matrix = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  return parseSheetRows(matrix);
}

export async function getCampaignById(id: string) {
  const all = await listCampaigns();
  return all.find((c) => c.id === id) ?? null;
}

export async function listCampaignContacts(campaignId: string): Promise<PbxCampaignContact[]> {
  await ensurePbxTables();
  return rows<{
    id: string;
    campaign_id: string;
    phone: string;
    name: string;
    status: string;
    attempts: number;
    last_attempt_at: Date | null;
    created_at: Date;
  }>(
    await db.execute(sql`
      SELECT id, campaign_id, phone, name, status, attempts, last_attempt_at, created_at
      FROM pbx_campaign_contacts
      WHERE campaign_id = ${campaignId}::uuid
      ORDER BY created_at ASC
    `),
  ).map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    phone: r.phone,
    name: r.name,
    status: (VALID_STATUSES.has(r.status as PbxCampaignContactStatus)
      ? r.status
      : "pending") as PbxCampaignContactStatus,
    attempts: r.attempts,
    lastAttemptAt: r.last_attempt_at ? new Date(r.last_attempt_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

export async function addCampaignContacts(
  campaignId: string,
  contacts: CampaignContactInput[],
): Promise<{ added: number; skipped: number; contactCount: number }> {
  await ensurePbxTables();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error("Kampanya bulunamadı.");

  let added = 0;
  let skipped = 0;
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (!phone) {
      skipped++;
      continue;
    }
    const existing = rows<{ id: string }>(
      await db.execute(sql`
        SELECT id FROM pbx_campaign_contacts
        WHERE campaign_id = ${campaignId}::uuid AND phone = ${phone}
        LIMIT 1
      `),
    )[0];
    if (existing) {
      skipped++;
      continue;
    }
    const metadataJson =
      c.metadata && Object.keys(c.metadata).length > 0 ? JSON.stringify(c.metadata) : null;
    await db.execute(sql`
      INSERT INTO pbx_campaign_contacts (campaign_id, phone, name, status, metadata_json)
      VALUES (
        ${campaignId}::uuid,
        ${phone},
        ${String(c.name ?? "")},
        'pending',
        ${metadataJson}::jsonb
      )
    `);
    added++;
  }

  const countRow = rows<{ c: number }>(
    await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM pbx_campaign_contacts WHERE campaign_id = ${campaignId}::uuid
    `),
  )[0];
  return { added, skipped, contactCount: countRow?.c ?? 0 };
}

export async function listCampaignResults(campaignId: string): Promise<PbxCampaignResultRow[]> {
  await ensurePbxTables();
  const logs = rows<{
    id: string;
    to_number: string;
    agent_name: string | null;
    status: string;
    started_at: Date;
  }>(
    await db.execute(sql`
      SELECT cl.id, cl.to_number, a.display_name AS agent_name, cl.status, cl.started_at
      FROM pbx_call_logs cl
      LEFT JOIN pbx_agents a ON a.id = cl.agent_id
      WHERE cl.campaign_id = ${campaignId}::uuid
      ORDER BY cl.started_at DESC
      LIMIT 200
    `),
  );

  const dispositions = rows<{
    id: string;
    phone: string;
    agent_name: string | null;
    code: string;
    label_tr: string;
    notes: string;
    created_at: Date;
  }>(
    await db.execute(sql`
      SELECT d.id, d.phone, a.display_name AS agent_name, d.code, d.label_tr, d.notes, d.created_at
      FROM pbx_call_dispositions d
      LEFT JOIN pbx_agents a ON a.id = d.agent_id
      WHERE d.campaign_id = ${campaignId}::uuid
      ORDER BY d.created_at DESC
      LIMIT 200
    `),
  );

  const combined: PbxCampaignResultRow[] = [
    ...logs.map((r) => ({
      id: r.id,
      type: "call_log" as const,
      phone: r.to_number,
      agentName: r.agent_name,
      status: r.status,
      dispositionCode: null,
      dispositionLabel: null,
      notes: null,
      startedAt: new Date(r.started_at).toISOString(),
    })),
    ...dispositions.map((r) => ({
      id: r.id,
      type: "disposition" as const,
      phone: r.phone,
      agentName: r.agent_name,
      status: "disposition",
      dispositionCode: r.code,
      dispositionLabel: r.label_tr,
      notes: r.notes || null,
      startedAt: new Date(r.created_at).toISOString(),
    })),
  ];

  combined.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return combined.slice(0, 200);
}

export async function markCampaignContactFromDisposition(
  campaignId: string,
  phone: string,
  dispositionCode: string,
): Promise<void> {
  await ensurePbxTables();
  const normalized = normalizePhone(phone);
  const noAnswerCodes = new Set(["no_answer", "busy", "voicemail", "dropped_call"]);
  const status: PbxCampaignContactStatus = noAnswerCodes.has(dispositionCode)
    ? "no_answer"
    : dispositionCode === "refused" || dispositionCode === "dnc"
      ? "completed"
      : "completed";

  await db.execute(sql`
    UPDATE pbx_campaign_contacts SET
      status = ${status},
      metadata_json = COALESCE(metadata_json, '{}'::jsonb) || ${JSON.stringify({ lastDisposition: dispositionCode })}::jsonb
    WHERE campaign_id = ${campaignId}::uuid
      AND (phone = ${phone} OR phone = ${normalized})
      AND status IN ('dialing', 'answered')
  `);
}

export async function insertCampaignCallLog(input: {
  campaignId: string;
  agentId: string;
  fromNumber: string;
  toNumber: string;
  status: string;
  callUuid?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  await ensurePbxTables();
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO pbx_call_logs (
      id, direction, from_number, to_number, agent_id, campaign_id, status, metadata_json, started_at
    ) VALUES (
      ${id}::uuid, 'outbound', ${input.fromNumber}, ${input.toNumber},
      ${input.agentId}::uuid, ${input.campaignId}::uuid, ${input.status},
      ${JSON.stringify({ callUuid: input.callUuid ?? "", ...(input.metadata ?? {}) })}::jsonb,
      NOW()
    )
  `);
  return id;
}

export async function pickPendingContact(campaignId: string, maxAttempts: number) {
  await ensurePbxTables();
  return rows<{
    id: string;
    phone: string;
    name: string;
    attempts: number;
  }>(
    await db.execute(sql`
      SELECT id, phone, name, attempts FROM pbx_campaign_contacts
      WHERE campaign_id = ${campaignId}::uuid
        AND status = 'pending'
        AND attempts < ${maxAttempts}
      ORDER BY created_at ASC
      LIMIT 1
    `),
  )[0] ?? null;
}

export async function markContactDialing(contactId: string): Promise<void> {
  await db.execute(sql`
    UPDATE pbx_campaign_contacts SET
      status = 'dialing',
      attempts = attempts + 1,
      last_attempt_at = NOW()
    WHERE id = ${contactId}::uuid
  `);
}

export async function markContactStatus(contactId: string, status: PbxCampaignContactStatus): Promise<void> {
  await db.execute(sql`
    UPDATE pbx_campaign_contacts SET status = ${status}, last_attempt_at = NOW()
    WHERE id = ${contactId}::uuid
  `);
}

export async function releaseStaleDialingContacts(maxAgeSec = 90): Promise<number> {
  await ensurePbxTables();
  const result = await db.execute(sql`
    UPDATE pbx_campaign_contacts cc SET
      status = CASE WHEN cc.attempts >= COALESCE(c.max_attempts, 3) THEN 'failed'::text ELSE 'pending'::text END,
      last_attempt_at = NOW()
    FROM pbx_campaigns c
    WHERE cc.campaign_id = c.id
      AND cc.status = 'dialing'
      AND cc.last_attempt_at IS NOT NULL
      AND cc.last_attempt_at < NOW() - (${maxAgeSec} * interval '1 second')
    RETURNING cc.id
  `);
  return rows<{ id: string }>(result).length;
}
