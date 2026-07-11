import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { getS3Endpoint, normalizeEnvValue } from "./mediaStorageConfig";

let client: S3Client | null = null;

/** R2/custom S3: şema zorunlu; sondaki slash kaldırılır. */
function normalizeS3EndpointUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getS3Client(): S3Client {
  if (client) return client;
  const region = normalizeEnvValue(process.env.S3_REGION) || "auto";
  const endpoint = normalizeS3EndpointUrl(getS3Endpoint());
  if (!endpoint) {
    throw new Error(
      "S3_ENDPOINT tanımlı değil — R2/S3 uyumlu depolama için Railway'de S3_ENDPOINT ekleyin.",
    );
  }
  client = new S3Client({
    region,
    endpoint,
    /* R2 ve path-style custom endpoint'lerde virtual-hosted TLS el sıkışması yapar */
    forcePathStyle: true,
    /* R2: SDK 3.729+ varsayılan CRC32 checksum gönderir; R2 PutObject reddedebilir */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: normalizeEnvValue(process.env.S3_ACCESS_KEY_ID),
      secretAccessKey: normalizeEnvValue(process.env.S3_SECRET_ACCESS_KEY),
    },
  });
  return client;
}

function bucket(): string {
  return normalizeEnvValue(process.env.S3_BUCKET);
}

function objectKey(name: string): string {
  const prefix = normalizeEnvValue(process.env.S3_KEY_PREFIX).replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${name}` : name;
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

export async function s3ObjectExists(name: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: objectKey(name) }),
    );
    return true;
  } catch (e: unknown) {
    if (isS3NotFoundError(e)) return false;
    throw e;
  }
}

export async function putS3Object(
  name: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: objectKey(name),
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getS3ObjectStream(
  name: string,
): Promise<{ body: Readable; contentType?: string } | null> {
  try {
    const out = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: objectKey(name) }),
    );
    if (!out.Body) return null;
    return {
      body: out.Body as Readable,
      contentType: out.ContentType,
    };
  } catch (e: unknown) {
    if (isS3NotFoundError(e)) return null;
    throw e;
  }
}
