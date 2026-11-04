const API_URL = 'https://0q86dtum3m.execute-api.us-east-1.amazonaws.com/prod/';

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function handleResponse(res: Response) {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

const jsonHeaders = (token: string) => ({ ...authHeaders(token), 'Content-Type': 'application/json' });

export const apiClient = {
  getTodos: (token: string) =>
    fetch(`${API_URL}todos`, { headers: authHeaders(token) }).then(handleResponse),

  getSongs: (token: string) =>
    fetch(`${API_URL}songs`, { headers: authHeaders(token) }).then(handleResponse),

  getPurchasedSongs: (token: string) =>
    fetch(`${API_URL}purchased-songs`, { headers: authHeaders(token) }).then(handleResponse),

  getSubscriptionStatus: (token: string) =>
    fetch(`${API_URL}subscription/status`, { headers: authHeaders(token) }).then(handleResponse),

  createSong: (token: string, song: Record<string, any>) =>
    fetch(`${API_URL}songs`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(song),
    }).then(handleResponse),

  updateSong: (token: string, songId: string, fields: Record<string, any>) =>
    fetch(`${API_URL}songs/${encodeURIComponent(songId)}`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(fields),
    }).then(handleResponse),

  deleteSong: (token: string, songId: string) =>
    fetch(`${API_URL}songs/${encodeURIComponent(songId)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),

  getSongParts: (token: string, songId: string) =>
    fetch(`${API_URL}song-parts?songId=${encodeURIComponent(songId)}`, { headers: authHeaders(token) })
      .then(res => { if (res.status === 404) return []; return handleResponse(res); }),

  getSongPartDetail: (token: string, songId: string, sectionId: string) =>
    fetch(`${API_URL}song-parts?songId=${encodeURIComponent(songId)}&sectionId=${encodeURIComponent(sectionId)}`, { headers: authHeaders(token) })
      .then(handleResponse),

  initiateSubscription: (token: string, data: {
    invoice: string; plan: string; amount: number; currency: string;
    customerName: string; customerEmail: string;
    customerPhone?: string; customerIdentification?: string;
  }) =>
    fetch(`${API_URL}subscription/initiate`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        reference:        data.invoice,
        plan:             data.plan,
        customerName:     data.customerName,
        customerEmail:    data.customerEmail,
        customerDocument: data.customerIdentification ?? null,
        amount:           String(data.amount),
        currency:         data.currency,
      }),
    }).then(res => res.ok ? res.json() : {}).catch(() => ({})),

  syncPayment: (token: string, invoice: string) =>
    fetch(`${API_URL}payment/epayco-proxy?action=syncByInvoice&ref=${encodeURIComponent(invoice)}`, {
      headers: authHeaders(token),
    }).catch(() => {}),
};
