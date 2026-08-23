const TRUSTED_IMAGE_HOST_SUFFIXES = [
  'artic.edu',
  'clevelandart.org',
  'metmuseum.org',
  'nasa.gov',
  'vimeocdn.com',
  'wikimedia.org',
  'wikipedia.org',
  'youtube.com',
  'ytimg.com',
];

export const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;

export function trustedImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isTrustedHost = TRUSTED_IMAGE_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
    );

    if (url.protocol !== 'https:' || url.username || url.password || !isTrustedHost) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function isImageContentType(contentType: string | null) {
  return Boolean(contentType?.toLowerCase().startsWith('image/'));
}
