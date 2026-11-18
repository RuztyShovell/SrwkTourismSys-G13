// API client - attaches the JWT and surfaces server error messages
const token = () => localStorage.getItem('sts_token');

export const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.field = data.field;
    throw err;
  }
  return data;
};

export const setSession = ({ token: t, account }) => {
  localStorage.setItem('sts_token', t);
  localStorage.setItem('sts_account', JSON.stringify(account));
};

export const clearSession = () => {
  localStorage.removeItem('sts_token');
  localStorage.removeItem('sts_account');
};

export const getAccount = () => {
  try {
    return JSON.parse(localStorage.getItem('sts_account'));
  } catch {
    return null;
  }
};
