export async function getAccessToken() {
  return null;
}

export async function buildAuthHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
