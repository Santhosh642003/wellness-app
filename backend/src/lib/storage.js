/**
 * Cloud-agnostic file storage.
 *
 * When S3_BUCKET + S3_ACCESS_KEY + S3_SECRET_KEY are set, files are uploaded to
 * an S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO).
 *
 * Without those env vars (local dev), files are saved to ./uploads/ and served
 * by express.static() as before — zero config needed.
 *
 * Required env vars for cloud mode:
 *   S3_BUCKET        – bucket name
 *   S3_ACCESS_KEY    – access key ID
 *   S3_SECRET_KEY    – secret access key
 *
 * Optional env vars:
 *   S3_REGION        – region (default: us-east-1)
 *   S3_ENDPOINT      – custom endpoint URL for R2 / DO Spaces / MinIO
 *                      e.g. https://<account-id>.r2.cloudflarestorage.com
 *   S3_PUBLIC_URL    – public-facing base URL for the bucket
 *                      e.g. https://pub-<hash>.r2.dev  or  https://cdn.example.com
 *                      If omitted, standard S3 virtual-hosted URL is used.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function isConfigured() {
  return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

function createClient() {
  const cfg = {
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  };
  if (process.env.S3_ENDPOINT) {
    cfg.endpoint = process.env.S3_ENDPOINT;
    cfg.forcePathStyle = true; // required for MinIO and some S3-compatible services
  }
  return new S3Client(cfg);
}

function makeKey(originalname) {
  const safe = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}-${safe}`;
}

function publicUrl(key) {
  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  // Standard AWS virtual-hosted URL
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Upload a file buffer.
 * @param {Buffer} buffer     – file contents
 * @param {string} originalname – original filename (used to derive the key)
 * @param {string} mimetype   – MIME type
 * @returns {Promise<string>} – public URL (cloud) or /uploads/<key> (local)
 */
export async function uploadFile(buffer, originalname, mimetype) {
  const key = makeKey(originalname);

  if (!isConfigured()) {
    // Local fallback
    const dir = join(process.cwd(), 'uploads');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, key), buffer);
    console.log(`[storage] saved locally: uploads/${key}`);
    return `/uploads/${key}`;
  }

  const client = createClient();
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));

  const url = publicUrl(key);
  console.log(`[storage] uploaded to S3: ${url}`);
  return url;
}

/**
 * Delete a previously uploaded file by its URL.
 * Silently ignores errors so a failed delete never breaks an API response.
 * @param {string|null} url – the URL returned by uploadFile()
 */
export async function deleteFile(url) {
  if (!url) return;

  // Local file
  if (!isConfigured() || url.startsWith('/uploads/')) {
    try {
      const { unlinkSync } = await import('fs');
      const filename = url.split('/').pop();
      unlinkSync(join(process.cwd(), 'uploads', filename));
    } catch {
      // file may already be gone — ignore
    }
    return;
  }

  // Extract S3 key from URL
  let key;
  try {
    if (process.env.S3_PUBLIC_URL && url.startsWith(process.env.S3_PUBLIC_URL.replace(/\/$/, ''))) {
      key = url.slice(process.env.S3_PUBLIC_URL.replace(/\/$/, '').length + 1);
    } else {
      // Works for both path-style and virtual-hosted URLs:
      // path-style:    https://endpoint/bucket/key   → last segment after /bucket/
      // virtual-hosted: https://bucket.s3.region.amazonaws.com/key → pathname without leading /
      const pathname = new URL(url).pathname; // e.g. "/bucket/1234-file.mp4" or "/1234-file.mp4"
      const parts = pathname.split('/').filter(Boolean);
      // If path-style, bucket name is first part; otherwise key is just the part
      key = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    }
  } catch {
    console.warn('[storage] deleteFile: could not parse URL:', url);
    return;
  }

  try {
    const client = createClient();
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    }));
    console.log(`[storage] deleted from S3: ${key}`);
  } catch (err) {
    console.warn('[storage] deleteFile failed:', err.message);
  }
}
