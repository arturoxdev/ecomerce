export {
  // S3 client
  s3Client,
  s3Bucket,
  s3PublicUrl,
  // Media constants
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  ALL_MEDIA_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_MEDIA_COUNT,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  // Media helpers
  isImageUrl,
  isVideoUrl,
  isImageMime,
  isVideoMime,
  validateMediaList,
  findThumbnail,
  getAcceptString,
  getMaxSizeForMime,
} from "./client";
