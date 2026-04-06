import { S3Client } from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// S3 / MinIO client
// ---------------------------------------------------------------------------

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

export const s3Bucket = process.env.S3_BUCKET!
export const s3PublicUrl = process.env.S3_PUBLIC_URL!

// ---------------------------------------------------------------------------
// Media types & helpers
// ---------------------------------------------------------------------------

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALL_MEDIA_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_MEDIA_COUNT = 6;

export const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif)(\?|$)/i;
export const VIDEO_EXTENSIONS = /\.(mp4|webm|mov)(\?|$)/i;

export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isVideoMime(mime: string): boolean {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

/** Returns null if valid, or an error message string. */
export function validateMediaList(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length > MAX_MEDIA_COUNT) {
    return `Maximum ${MAX_MEDIA_COUNT} files allowed`;
  }
  return null;
}

/** Returns the first image URL from the array, or null if none. */
export function findThumbnail(urls: string[]): string | null {
  return urls.find(isImageUrl) ?? null;
}

export function getAcceptString(): string {
  return "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime";
}

export function getMaxSizeForMime(mime: string): number {
  return isVideoMime(mime) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}
