import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import {
  CF_ACCOUNT_R2_S3_ENDPOINT,
  coerceS3AccessKeyId,
  coerceS3Bucket,
  coerceS3SecretAccessKey,
  getS3EndpointCandidates,
  isS3TransportError,
  normalizeEnvValue,
  s3EndpointHostPrefixFromUrl,
} from "./mediaStorageConfig";

const clients = new Map<string, S3Client>();
let cachedEndpoint: string | null = null;

/** R2/custom S3: şema zorunlu; sondaki slash kaldırılır. */
function normalizeS3EndpointUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function s3CredBlob(): string {
  return [
    process.env.S3_ENDPOINT,
    process.env.S3_BUCKET,
    process.env.S3_ACCESS_KEY_ID,
    process.env.S3_SECRET_ACCESS_KEY,
    process.env.S3_PUBLIC_BASE_URL,
  ]
    .map((v) => String(v ?? ""))
    .join("\n");
}

function createS3Client(endpoint: string): S3Client {
  const region = normalizeEnvValue(process.env.S3_REGION) || "auto";
  const url = normalizeS3EndpointUrl(endpoint);
  if (!url) {
    throw new Error(
      "S3_ENDPOINT tanımlı değil — R2/S3 uyumlu depolama için S3_ENDPOINT ekleyin.",
    );
  }
  const blob = s3CredBlob();
  return new S3Client({
    region,
    endpoint: url,
    /* R2 ve path-style custom endpoint'lerde virtual-hosted TLS el sıkışması yapar */
    forcePathStyle: true,
    /* R2: SDK 3.729+ varsayılan CRC32 checksum gönderir; R2 PutObject reddedebilir */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: coerceS3AccessKeyId(process.env.S3_ACCESS_KEY_ID, blob),
      secretAccessKey: coerceS3SecretAccessKey(process.env.S3_SECRET_ACCESS_KEY, blob),
    },
  });
}

function clientFor(endpoint: string): S3Client {
  let c = clients.get(endpoint);
  if (!c) {
    c = createS3Client(endpoint);
    clients.set(endpoint, c);
  }
  return c;
}

function endpointsToTry(): string[] {
  const list = getS3EndpointCandidates();
  const cf = CF_ACCOUNT_R2_S3_ENDPOINT;
  const ordered = list.includes(cf) ? [cf, ...list.filter((e) => e !== cf)] : list;
  if (!cachedEndpoint) return ordered;
  return [cachedEndpoint, ...ordered.filter((e) => e !== cachedEndpoint)];
}

function bucket(): string {
  return coerceS3Bucket(process.env.S3_BUCKET, s3CredBlob());
}

function objectKey(name: string): string {
  const prefix = normalizeEnvValue(process.env.S3_KEY_PREFIX).replace(/^\/+|\/+$/g, "");
  if (prefix) return `${prefix}/${name}`;
  return `yekpare-media/${name}`;
}

/** S3/R2 yok (404) — diğer hatalar (EPROTO, ağ) üst katmanda volume yedeğine bırakılır. */
export function isS3NotFoundError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
  if (code === "NotFound" || code === "NoSuchKey") return true;
  const status =
    e && typeof e === "object" && "$metadata" in e
      ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
  return status === 404;
}

function isS3AccessDeniedError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
  if (
    code === "AccessDenied" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch" ||
    code === "UnknownError"
  ) {
    return true;
  }
  const status =
    e && typeof e === "object" && "$metadata" in e
      ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
  return status === 403 || status === 401;
}

function shouldTryNextEndpoint(e: unknown): boolean {
  return isS3NotFoundError(e) || isS3TransportError(e) || isS3AccessDeniedError(e);
}

export function getActiveS3EndpointHostPrefix4(): string | null {
  return s3EndpointHostPrefixFromUrl(cachedEndpoint);
}

export type S3ConnectivityProbe = {
  ok: boolean;
  hostPrefix: string | null;
  tried: number;
  error?: string;
};

/**
 * HeadObject 404 = TLS/imza tamam (nesne yok). İlk EPROTO tüm S3'ü kapatmasın;
 * Render dual-write hostu dahil her adayı dene.
 */
export async function probeS3Connectivity(): Promise<S3ConnectivityProbe> {
  const endpoints = endpointsToTry();
  if (endpoints.length === 0) {
    return { ok: false, hostPrefix: null, tried: 0, error: "S3_ENDPOINT yok" };
  }
  let lastErr = "";
  for (const ep of endpoints) {
    try {
      await clientFor(ep).send(
        new HeadObjectCommand({ Bucket: bucket(), Key: objectKey("healthz-probe-object") }),
      );
      cachedEndpoint = ep;
      return { ok: true, hostPrefix: s3EndpointHostPrefixFromUrl(ep), tried: endpoints.length };
    } catch (e: unknown) {
      if (isS3NotFoundError(e)) {
        cachedEndpoint = ep;
        return { ok: true, hostPrefix: s3EndpointHostPrefixFromUrl(ep), tried: endpoints.length };
      }
      lastErr = e instanceof Error ? e.message : String(e ?? "");
    }
  }
  return {
    ok: false,
    hostPrefix: null,
    tried: endpoints.length,
    error: lastErr.slice(0, 300),
  };
}

export async function s3ObjectExists(name: string): Promise<boolean> {
  const endpoints = endpointsToTry();
  if (endpoints.length === 0) {
    throw new Error("S3_ENDPOINT tanımlı değil — R2/S3 uyumlu depolama için S3_ENDPOINT ekleyin.");
  }
  let lastTransport: unknown = null;
  let sawNotFound = false;
  for (const ep of endpoints) {
    try {
      await clientFor(ep).send(
        new HeadObjectCommand({ Bucket: bucket(), Key: objectKey(name) }),
      );
      cachedEndpoint = ep;
      return true;
    } catch (e: unknown) {
      if (isS3NotFoundError(e)) {
        sawNotFound = true;
        continue;
      }
      lastTransport = e;
      if (!shouldTryNextEndpoint(e)) throw e;
    }
  }
  if (sawNotFound) return false;
  if (lastTransport) throw lastTransport;
  return false;
}

export async function putS3Object(
  name: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const endpoints = endpointsToTry();
  if (endpoints.length === 0) {
    throw new Error("S3_ENDPOINT tanımlı değil — R2/S3 uyumlu depolama için S3_ENDPOINT ekleyin.");
  }
  let lastErr: unknown = null;
  for (const ep of endpoints) {
    try {
      await clientFor(ep).send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: objectKey(name),
          Body: body,
          ContentType: contentType,
        }),
      );
      cachedEndpoint = ep;
      return;
    } catch (e: unknown) {
      lastErr = e;
      if (!shouldTryNextEndpoint(e)) throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? "S3 put failed"));
}

export async function getS3ObjectStream(
  name: string,
): Promise<{ body: Readable; contentType?: string } | null> {
  const endpoints = endpointsToTry();
  if (endpoints.length === 0) {
    throw new Error("S3_ENDPOINT tanımlı değil — R2/S3 uyumlu depolama için S3_ENDPOINT ekleyin.");
  }
  let lastTransport: unknown = null;
  let sawNotFound = false;
  for (const ep of endpoints) {
    try {
      const out = await clientFor(ep).send(
        new GetObjectCommand({ Bucket: bucket(), Key: objectKey(name) }),
      );
      if (!out.Body) {
        sawNotFound = true;
        continue;
      }
      cachedEndpoint = ep;
      return {
        body: out.Body as Readable,
        contentType: out.ContentType,
      };
    } catch (e: unknown) {
      if (isS3NotFoundError(e)) {
        sawNotFound = true;
        continue;
      }
      lastTransport = e;
      if (!shouldTryNextEndpoint(e)) throw e;
    }
  }
  if (sawNotFound) return null;
  if (lastTransport) throw lastTransport;
  return null;
}
