const API_URL = 'https://0q86dtum3m.execute-api.us-east-1.amazonaws.com/prod/';

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function handleResponse(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export const apiClient = {
  getTodos: (token: string) =>
    fetch(`${API_URL}todos`, { headers: authHeaders(token) }).then(handleResponse),

  getSongs: (token: string) =>
    fetch(`${API_URL}songs`, { headers: authHeaders(token) }).then(handleResponse),

  getPurchasedSongs: (token: string) =>
    fetch(`${API_URL}purchased-songs`, { headers: authHeaders(token) }).then(handleResponse),
};
