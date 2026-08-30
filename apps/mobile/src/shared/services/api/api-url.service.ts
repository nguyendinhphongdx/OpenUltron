export function buildApiUrl(apiBaseUrl: string, path: string) {
  return new URL(path, apiBaseUrl.trim()).toString();
}

export function buildWsUrl(apiBaseUrl: string, path: string) {
  const url = new URL(path, apiBaseUrl.trim());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
