export function getPublicMediaUrlPrefix(publicUrl: string): string {
  return publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`;
}

export function getObjectKeyFromPublicMediaUrl(
  url: string,
  publicUrl: string,
): string | null {
  const prefix = getPublicMediaUrlPrefix(publicUrl);

  if (!url.startsWith(prefix)) {
    return null;
  }

  return url.slice(prefix.length);
}
