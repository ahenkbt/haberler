const { randomBytes } = require("node:crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

function normalizeEnv(value) {
  if (value == null) return "";
  let v = String(value).replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "");
}

function getS3Endpoint() {
  const keys = [
    "S3_ENDPOINT",
    "S3_API_ENDPOINT",
    "AWS_ENDPOINT_URL",
    "R2_ENDPOINT",
    "CLOUDFLARE_R2_ENDPOINT",
  ];
  for (const key of keys) {
    const v = normalizeEnv(process.env[key]);
    if (v) return v;
  }
  return "";
}

function isS3Configured() {
  return Boolean(
    normalizeEnv(process.env.S3_BUCKET) &&
      normalizeEnv(process.env.S3_ACCESS_KEY_ID) &&
      normalizeEnv(process.env.S3_SECRET_ACCESS_KEY) &&
      getS3Endpoint(),
  );
}

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: normalizeEnv(process.env.S3_REGION) || "auto",
      endpoint: getS3Endpoint(),
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: normalizeEnv(process.env.S3_ACCESS_KEY_ID),
        secretAccessKey: normalizeEnv(process.env.S3_SECRET_ACCESS_KEY),
      },
    });
  }
  return s3Client;
}

function objectKey(name) {
  const prefix = normalizeEnv(process.env.S3_KEY_PREFIX).replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${name}` : name;
}

async function saveCvBuffer(buf, { cvFileName }) {
  if (!isS3Configured()) return null;
  const fname = `cv-${Date.now()}-${randomBytes(8).toString("hex")}.pdf`;
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: normalizeEnv(process.env.S3_BUCKET),
      Key: objectKey(fname),
      Body: buf,
      ContentType: "application/pdf",
    }),
  );
  return {
    url: `/api/media/uploads/${fname}`,
    fileName: cvFileName || "cv.pdf",
  };
}

module.exports = {
  isS3Configured,
  saveCvBuffer,
};
