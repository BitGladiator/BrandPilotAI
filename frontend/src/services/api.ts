import type {
  HealthResponse,
  SampleDataResponse,
  ReviewRequest,
  ReviewResponse,
  ApiErrorResponse,
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

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    let errorCode = 'http_error';
    let details: Array<{ field: string; message: string }> | undefined;

    if (isJson) {
      try {
        const errorJson: ApiErrorResponse = await res.json();
        errorMessage = errorJson.message || errorMessage;
        errorCode = errorJson.error || errorCode;
        details = errorJson.details;
      } catch {
        // Fallback to default message
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

  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal,
      });
      return await handleResponse<HealthResponse>(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) throw err;
      if (err instanceof Error && err.name === 'AbortError') throw err;
      throw new ApiClientError(
        0,
        'Cannot connect to BrandPilot backend. Ensure the server is running at ' + API_BASE_URL,
        'connection_refused'
      );
    }
  },

  async getSampleData(signal?: AbortSignal): Promise<SampleDataResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sample-data`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal,
      });
      return await handleResponse<SampleDataResponse>(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) throw err;
      if (err instanceof Error && err.name === 'AbortError') throw err;
      throw new ApiClientError(
        0,
        'Failed to fetch sample reference data from backend.',
        'connection_refused'
      );
    }
  },

  async reviewDraft(payload: ReviewRequest, signal?: AbortSignal): Promise<ReviewResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });
      return await handleResponse<ReviewResponse>(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) throw err;
      if (err instanceof Error && err.name === 'AbortError') throw err;
      throw new ApiClientError(
        0,
        'Unable to reach BrandPilot backend. Check your network or backend server status.',
        'network_error'
      );
    }
  },
};
