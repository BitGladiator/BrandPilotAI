export type Category = 'Terminology' | 'Tone' | 'Claims' | 'Accessibility' | 'Other';
export type Severity = 'Low' | 'Medium' | 'High';
export type Confidence = 'low' | 'medium' | 'high';

export interface Guideline {
  id: string;
  text: string;
}

export interface ApprovedTerm {
  id?: string | null;
  preferred: string;
  avoid: string[];
}

export interface ApprovedFact {
  id: string;
  text: string;
}

export interface ReviewRequest {
  draft_text: string;
  brand_guidelines?: Guideline[];
  approved_terms?: ApprovedTerm[];
  approved_facts?: ApprovedFact[];
}

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  excerpt: string;
  explanation: string;
  suggestion: string;
  evidence_ids: string[];
  confidence: Confidence;
  source: 'rule' | 'ai';
  start?: number | null;
  end?: number | null;
}

export interface ReviewResponse {
  findings: Finding[];
  review_summary: string;
  needs_human_review: boolean;
  ai_status: 'ok' | 'skipped' | 'unavailable';
  reference_source: 'request' | 'sample';
  warnings: string[];
}

export interface HealthResponse {
  status: string;
  ai_provider: string;
  version: string;
}

export interface SampleDataResponse {
  brand_guidelines: Guideline[];
  approved_terms: ApprovedTerm[];
  approved_facts: ApprovedFact[];
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: ApiErrorDetail[];
}
