import type {
  HealthResponse,
  SampleDataResponse,
  ReviewRequest,
  ReviewResponse,
  AuthResponse,
  User,
  DocumentItem,
  PassageItem,
  DraftSummary,
  DraftDetail,
  RevisionItem,
  AuditEventItem,
  EvaluationResponse,
  RecurringIssuesResponse,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export class ApiClientError extends Error {
  status: number;
  errorCode: string;
  details?: Array<{ field: string; message: string }>;

  constructor(status: number, message: string, errorCode = 'error', details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

// Token management in localStorage
const TOKEN_KEY = 'brandpilot_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    let errorCode = 'http_error';
    let details: Array<{ field: string; message: string }> | undefined;

    if (isJson) {
      try {
        const errorJson = await res.json();
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
        errorCode = errorJson.error || errorCode;
        details = errorJson.details;
      } catch {
        // Fallback
      }
    } else {
      const text = await res.text();
      if (text) errorMessage = text.slice(0, 200);
    }

    throw new ApiClientError(res.status, errorMessage, errorCode, details);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  // ---------- Health & Samples ----------

  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal,
    });
    return await handleResponse<HealthResponse>(res);
  },

  async getSampleData(signal?: AbortSignal): Promise<SampleDataResponse> {
    const res = await fetch(`${API_BASE_URL}/api/sample-data`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal,
    });
    return await handleResponse<SampleDataResponse>(res);
  },

  async reviewDraft(payload: ReviewRequest, signal?: AbortSignal): Promise<ReviewResponse> {
    const headers = getAuthHeaders() as Record<string, string>;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/api/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });
    return await handleResponse<ReviewResponse>(res);
  },

  // ---------- Authentication ----------

  async register(data: { email: string; password: string; full_name: string; role: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<AuthResponse>(res);
    setStoredToken(result.access_token);
    return result;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<AuthResponse>(res);
    setStoredToken(result.access_token);
    return result;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<User>(res);
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      setStoredToken(null);
    }
  },

  // ---------- Brand Documents (Upload & Retrieval) ----------

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    const headers = getAuthHeaders() as Record<string, string>;
    // Let browser set multipart content-type boundary

    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return await handleResponse<DocumentItem>(res);
  },

  async listDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DocumentItem[]>(res);
  },

  async getDocument(id: string): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DocumentItem>(res);
  },

  async getDocumentPassages(id: string): Promise<PassageItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}/passages`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<PassageItem[]>(res);
  },

  async deleteDocument(id: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ status: string; message: string }>(res);
  },

  // ---------- Drafts & Approvals ----------

  async createDraft(title: string, draftText: string): Promise<DraftDetail> {
    const headers = getAuthHeaders() as Record<string, string>;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/api/drafts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, draft_text: draftText }),
    });
    return await handleResponse<DraftDetail>(res);
  },

  async listDrafts(): Promise<DraftSummary[]> {
    const res = await fetch(`${API_BASE_URL}/api/drafts`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DraftSummary[]>(res);
  },

  async getReviewerQueue(): Promise<DraftSummary[]> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/queue`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DraftSummary[]>(res);
  },

  async getDraft(id: string): Promise<DraftDetail> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DraftDetail>(res);
  },

  async updateDraft(id: string, title?: string, draftText?: string): Promise<DraftDetail> {
    const headers = getAuthHeaders() as Record<string, string>;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/api/drafts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title, draft_text: draftText }),
    });
    return await handleResponse<DraftDetail>(res);
  },

  async submitDraft(id: string): Promise<{ status: string; current_status: string }> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/${id}/submit`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ status: string; current_status: string }>(res);
  },

  async decideDraft(id: string, decision: 'approved' | 'rejected', comment?: string): Promise<{ status: string; current_status: string }> {
    const headers = getAuthHeaders() as Record<string, string>;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/api/drafts/${id}/decide`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decision, comment }),
    });
    return await handleResponse<{ status: string; current_status: string }>(res);
  },

  async recordSuggestionAction(
    draftId: string,
    findingId: string,
    action: 'accept' | 'dismiss' | 'override',
    comment?: string
  ): Promise<{ status: string; action: string; finding_status: string }> {
    const headers = getAuthHeaders() as Record<string, string>;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}/api/drafts/${draftId}/suggestions/${findingId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, comment }),
    });
    return await handleResponse<{ status: string; action: string; finding_status: string }>(res);
  },

  async getRevisions(draftId: string): Promise<RevisionItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/${draftId}/revisions`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<RevisionItem[]>(res);
  },

  async restoreRevision(draftId: string, revisionId: string): Promise<DraftDetail> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/${draftId}/restore/${revisionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await handleResponse<DraftDetail>(res);
  },

  async getAuditTrail(draftId: string): Promise<AuditEventItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/drafts/${draftId}/audit`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<AuditEventItem[]>(res);
  },

  // ---------- Recurring Issues Analytics ----------

  async getRecurringIssues(dateFrom?: string, dateTo?: string, category?: string): Promise<RecurringIssuesResponse> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (category && category !== 'All') params.append('category', category);

    const url = `${API_BASE_URL}/api/analytics/recurring-issues${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<RecurringIssuesResponse>(res);
  },

  // ---------- Accuracy Evaluation ----------

  async getLatestEvaluation(): Promise<EvaluationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/latest`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return await handleResponse<EvaluationResponse>(res);
  },

  async runEvaluation(): Promise<{ id: string; report: EvaluationResponse; baseline: Record<string, number> }> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await handleResponse<{ id: string; report: EvaluationResponse; baseline: Record<string, number> }>(res);
  },
};
