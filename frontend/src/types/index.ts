export type Category = 'Terminology' | 'Tone' | 'Claims' | 'Accessibility' | 'Other';
export type Severity = 'Low' | 'Medium' | 'High';
export type Confidence = 'low' | 'medium' | 'high';
export type UserRole = 'creator' | 'reviewer' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

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

export interface Citation {
  document_id: string;
  document_name: string;
  passage_id: string;
  heading_path?: string | null;
  page_number?: number | null;
  excerpt: string;
  source_type: 'brand_guideline' | 'policy' | 'approved_term' | 'approved_fact';
  relevance_score?: number | null;
}

export interface ReviewRequest {
  draft_text: string;
  brand_guidelines?: Guideline[];
  approved_terms?: ApprovedTerm[];
  approved_facts?: ApprovedFact[];
  use_indexed_guidelines?: boolean;
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
  citations?: Citation[];
  status?: 'open' | 'accepted' | 'dismissed' | 'overridden';
}

export interface ReviewResponse {
  findings: Finding[];
  review_summary: string;
  needs_human_review: boolean;
  ai_status: 'ok' | 'skipped' | 'unavailable';
  reference_source: 'request' | 'sample' | 'indexed_database';
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

export interface DocumentItem {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'indexed' | 'error';
  error_message?: string | null;
  extracted_metadata?: {
    page_count?: number;
    chunk_count?: number;
    total_characters?: number;
    headings?: string[];
  } | null;
  created_at: string;
  uploaded_by_email?: string | null;
}

export interface PassageItem {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number | null;
  heading_path?: string | null;
  char_offset_start?: number | null;
  char_offset_end?: number | null;
}

export interface DraftSummary {
  id: string;
  title: string;
  current_status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  creator_id: string;
  creator_name: string;
  creator_email: string;
  latest_revision_number: number;
  created_at: string;
  updated_at: string;
}

export interface RevisionItem {
  id: string;
  draft_id: string;
  revision_number: number;
  author_id?: string | null;
  draft_text: string;
  review_summary?: string | null;
  ai_status?: string | null;
  needs_human_review: boolean;
  created_at: string;
}

export interface DraftDetail {
  id: string;
  title: string;
  current_status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  creator_id: string;
  creator_name: string;
  creator_email: string;
  latest_revision: RevisionItem;
  findings: Finding[];
  decisions: Array<{
    id: string;
    decision: 'approved' | 'rejected';
    comment?: string | null;
    reviewer_email?: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface AuditEventItem {
  id: string;
  draft_id?: string | null;
  revision_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  action_type: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface MetricScoreItem {
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1: number;
  sample_count: number;
}

export interface EvaluationResponse {
  id?: string;
  dataset_version: string;
  model_name: string;
  matching_policy: string;
  sample_count: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1: number;
  metrics_by_category: Record<string, MetricScoreItem>;
  notes?: string;
  created_at?: string;
  baseline?: {
    precision: number;
    recall: number;
    f1: number;
    dataset_size: number;
  };
}

export interface RuleAnalyticsItem {
  rule_id: string;
  category: string;
  triggered_count: number;
  unique_drafts_affected: number;
  accepted_count: number;
  dismissed_count: number;
  overridden_count: number;
  accept_rate: number;
  dismiss_rate: number;
  sample_excerpt: string;
  has_friction_warning: boolean;
  friction_note?: string | null;
}

export interface RecurringIssuesResponse {
  summary: {
    total_findings_recorded: number;
    total_decisions_recorded: number;
    unique_drafts_analyzed: number;
    unique_rules_triggered: number;
    is_empty: boolean;
  };
  most_triggered_rules: RuleAnalyticsItem[];
  most_dismissed_rules: RuleAnalyticsItem[];
  most_accepted_suggestions: RuleAnalyticsItem[];
  category_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  activity_timeline: Array<{
    date: string;
    triggered: number;
    accepted: number;
    dismissed: number;
  }>;
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
