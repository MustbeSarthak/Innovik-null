/* ─────────────────────────────────────────────────────────
   Central API client — Smart Healthcare
   ─────────────────────────────────────────────────────────
   All real HTTP calls go through apiFetch().
   The Vite dev proxy forwards /auth, /patient, /assessment,
   /upload, /alert, /uploads to the Express backend on :5000.
   In production both are served from the same origin.
   ───────────────────────────────────────────────────────── */

let _currentUser = null;

/**
 * Core fetch wrapper.
 * – Sends credentials (httpOnly JWT cookie) on every request.
 * – Sets Content-Type: application/json unless body is FormData.
 * – Throws on non-2xx with the server's error message.
 * – Throws with status 401 on authentication failures.
 */
async function apiFetch(url, options = {}) {
  const config = {
    credentials: 'include',
    ...options,
    headers: { ...options.headers },
  };

  /* JSON-encode plain objects; leave FormData untouched
     so the browser can set multipart boundaries. */
  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    if (typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }
  }

  const res = await fetch(url, config);

  /* ── 401 — session invalid / expired ────────────────── */
  if (res.status === 401) {
    _currentUser = null;
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  /* ── Other errors ───────────────────────────────────── */
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }

  /* ── 204 No Content ─────────────────────────────────── */
  if (res.status === 204) return null;

  return res.json();
}

/* ══════════════════════════════════════════════════════════
   Auth
   ══════════════════════════════════════════════════════════ */

export const AuthAPI = {
  async register({ name, email, password }) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    _currentUser = data.user;
    return data;             // { user, token }
  },

  async login({ email, password }) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    _currentUser = data.user;
    return data;             // { user: { id, name, email, role }, token }
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* Clear local state even if the request fails */
    }
    _currentUser = null;
  },

  async me() {
    try {
      const user = await apiFetch('/auth/me');
      _currentUser = user;
      return user;           // { id, name, email, role } or null
    } catch {
      _currentUser = null;
      return null;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   Patient
   ══════════════════════════════════════════════════════════ */

export const PatientAPI = {
  async get() {
    return apiFetch('/patient');
  },

  async update(data) {
    return apiFetch('/patient', {
      method: 'PUT',
      body: data,
    });
  },

  async updateCaretaker(data) {
    return apiFetch('/patient/caretaker', {
      method: 'PUT',
      body: data,
    });
  },
};

/* ══════════════════════════════════════════════════════════
   Assessment
   ══════════════════════════════════════════════════════════ */

export const AssessmentAPI = {
  async create(data) {
    return apiFetch('/assessment', {
      method: 'POST',
      body: data,
    });
  },

  async history() {
    return apiFetch('/assessment/history');
  },
};

/* ══════════════════════════════════════════════════════════
   Upload / Documents
   ══════════════════════════════════════════════════════════ */

export const UploadAPI = {
  async upload(formData) {
    /* FormData — apiFetch will NOT set Content-Type so the
       browser adds the multipart boundary automatically. */
    return apiFetch('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async list() {
    return apiFetch('/upload');
  },
};

/* ══════════════════════════════════════════════════════════
   Alerts
   ══════════════════════════════════════════════════════════ */

export const AlertAPI = {
  async list() {
    return apiFetch('/alert');
  },

  async create(data) {
    return apiFetch('/alert', {
      method: 'POST',
      body: data,
    });
  },
};

export const RiskAPI = {
  async analyzeSimulator(vitals, state) {
    return apiFetch('/risk/simulator', {
      method: 'POST',
      body: { vitals, state },
    });
  },
};

/* ══════════════════════════════════════════════════════════
   Notifications  (stub — no backend endpoint exists yet)
   ══════════════════════════════════════════════════════════ */

export const NotificationAPI = {
  async list() {
    return [];
  },
};

/* ══════════════════════════════════════════════════════════
   Sync helpers — cached from last API call
   Preserved so existing imports don't break.
   ══════════════════════════════════════════════════════════ */

export function getCurrentUser() {
  return _currentUser;
}

export function isSignedIn() {
  return !!_currentUser;
}

export function clearSession() {
  _currentUser = null;
}

export function seedDemoData() {
  /* No-op — demo seed was localStorage-only */
}