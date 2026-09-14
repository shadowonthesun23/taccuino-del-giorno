const DEVELOPMENT_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

function effectivePort(url: URL) {
  if (url.port) return url.port;
  if (url.protocol === 'http:') return '80';
  if (url.protocol === 'https:') return '443';
  return '';
}

function isHttpProtocol(url: URL) {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function isAllowedDevelopmentLoopbackAlias(originUrl: URL, requestUrl: URL) {
  if (!isHttpProtocol(originUrl) || !isHttpProtocol(requestUrl)) return false;
  if (originUrl.protocol !== requestUrl.protocol) return false;
  if (effectivePort(originUrl) !== effectivePort(requestUrl)) return false;

  const originHost = originUrl.hostname.toLowerCase();
  const requestHost = requestUrl.hostname.toLowerCase();

  return (
    originHost !== requestHost &&
    DEVELOPMENT_LOOPBACK_HOSTS.has(originHost) &&
    DEVELOPMENT_LOOPBACK_HOSTS.has(requestHost)
  );
}

export function isSameOriginRequest(
  origin: string | null,
  requestUrl: string,
  nodeEnv = process.env.NODE_ENV,
) {
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestUrlObject = new URL(requestUrl);

    if (originUrl.origin === requestUrlObject.origin) return true;

    return (
      nodeEnv === 'development' &&
      isAllowedDevelopmentLoopbackAlias(originUrl, requestUrlObject)
    );
  } catch {
    return false;
  }
}
