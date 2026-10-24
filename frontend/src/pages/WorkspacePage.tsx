import React, { useState } from 'react';
import { api, ApiClientError } from '../services/api';
import type {
  Guideline,
  ApprovedTerm,
  ApprovedFact,
  Finding,
  ReviewResponse,
} from '../types';
import { DraftEditor } from '../components/workspace/DraftEditor';
import { FindingCard } from '../components/workspace/FindingCard';
import { ReferenceManager } from '../components/workspace/ReferenceManager';
import { ReviewSummaryBanner } from '../components/workspace/ReviewSummaryBanner';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';

// Preset drafts for quick review testing
const PRESETS = [
  {
    name: 'Launch Announcement (Has Discrepancies)',
    text: 'Our consumer app is the best, available in 12 regions. We invite all users to click here to log in and test our revolutionary features.',
  },
  {
    name: 'Compliant Announcement (Clean Copy)',
    text: 'Our customer app is available in 10 regions. Sign in to your account today to explore the updated features and view our regional availability.',
  },
  {
    name: 'Customer Support Policy Draft',
    text: 'Our consumer team provides customer support 24 hours a day via chat. E-mail us anytime or click here to reach support.',
  },
];

export const WorkspacePage: React.FC = () => {
  // Draft state
  const [draftText, setDraftText] = useState(PRESETS[0].text);

  // Reference dataset states (empty by default so backend uses built-in sample reference data)
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [terms, setTerms] = useState<ApprovedTerm[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [isCustomActive, setIsCustomActive] = useState(false);

  // Review response and interaction states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<Array<{ field: string; message: string }> | null>(null);

  // Filter & selection states
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [dismissedFindingIds, setDismissedFindingIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [showReferenceDrawer, setShowReferenceDrawer] = useState(true);

  // Load backend samples into reference state
  const handleLoadBackendSamples = async () => {
    setIsLoadingSamples(true);
    setErrorMessage(null);
    try {
      const data = await api.getSampleData();
      setGuidelines(data.brand_guidelines || []);
      setTerms(data.approved_terms || []);
      setFacts(data.approved_facts || []);
      setIsCustomActive(true);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load sample references from backend.');
      }
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleResetToBackendDefault = () => {
    setGuidelines([]);
    setTerms([]);
    setFacts([]);
    setIsCustomActive(false);
  };

  // Run Review API call
  const handleReview = async () => {
    if (!draftText.trim()) {
      setErrorMessage('Please enter draft text before running a review.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      const payload = {
        draft_text: draftText,
        ...(isCustomActive && guidelines.length > 0 ? { brand_guidelines: guidelines } : {}),
        ...(isCustomActive && terms.length > 0 ? { approved_terms: terms } : {}),
        ...(isCustomActive && facts.length > 0 ? { approved_facts: facts } : {}),
      };

      const res = await api.reviewDraft(payload);
      setReviewResponse(res);
      setDismissedFindingIds(new Set());
      if (res.findings && res.findings.length > 0) {
        setSelectedFindingId(res.findings[0].id);
      } else {
        setSelectedFindingId(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        if (err.details && err.details.length > 0) {
          setErrorDetails(err.details);
        }
      } else {
        setErrorMessage('An unexpected error occurred while communicating with the BrandPilot backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Apply suggestion directly into draft text
  const handleApplySuggestion = (finding: Finding) => {
    if (!finding.suggestion) return;

    let newDraft = draftText;

    // If character offsets are present and match excerpt, use precise slice replacement
    if (
      finding.start !== undefined &&
      finding.start !== null &&
      finding.end !== undefined &&
      finding.end !== null &&
      draftText.substring(finding.start, finding.end) === finding.excerpt
    ) {
      newDraft =
        draftText.substring(0, finding.start) +
        finding.suggestion +
        draftText.substring(finding.end);
    } else {
      // Fallback: word replacement for excerpt
      newDraft = draftText.replace(finding.excerpt, finding.suggestion);
    }

    setDraftText(newDraft);

    // Mark finding as dismissed / handled
    setDismissedFindingIds(prev => new Set([...prev, finding.id]));
  };

  // Batch apply all safe suggestions that have direct replacements
  const handleApplyAllSafe = () => {
    if (!reviewResponse) return;
    let updatedText = draftText;
    const handledIds = new Set(dismissedFindingIds);

    // Apply terminology replacements (safest deterministic fixes)
    const termFindings = reviewResponse.findings.filter(
      f => f.category === 'Terminology' && f.suggestion && !handledIds.has(f.id)
    );

    // Sort by start descending so earlier indices don't shift
    const sorted = [...termFindings].sort((a, b) => (b.start ?? 0) - (a.start ?? 0));

    sorted.forEach(f => {
      if (
        f.start !== undefined &&
        f.start !== null &&
        f.end !== undefined &&
        f.end !== null &&
        updatedText.substring(f.start, f.end) === f.excerpt
      ) {
        updatedText =
          updatedText.substring(0, f.start) +
          f.suggestion +
          updatedText.substring(f.end);
        handledIds.add(f.id);
      } else if (updatedText.includes(f.excerpt)) {
        updatedText = updatedText.replace(f.excerpt, f.suggestion);
        handledIds.add(f.id);
      }
    });

    setDraftText(updatedText);
    setDismissedFindingIds(handledIds);
  };

  const handleToggleDismiss = (id: string) => {
    setDismissedFindingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePresetSelect = (presetIndex: number) => {
    setDraftText(PRESETS[presetIndex].text);
    setReviewResponse(null);
    setSelectedFindingId(null);
    setDismissedFindingIds(new Set());
    setErrorMessage(null);
  };

  // Filter findings
  const findings = reviewResponse?.findings || [];
  const filteredFindings = findings.filter(f => {
    if (categoryFilter !== 'All' && f.category !== categoryFilter) return false;
    if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="container">
        {/* Workspace Top Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-copper-hover)',
              marginBottom: '2px',
            }}>
              ATELIER CONTENT WORKSPACE
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--color-text-primary)',
            }}>
              Review & Align Draft
            </h1>
          </div>

          {/* Quick presets & view toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Draft Preset:</span>
              <select
                className="input-text"
                onChange={(e) => handlePresetSelect(Number(e.target.value))}
                style={{
                  fontSize: '0.8125rem',
                  padding: '5px 8px',
                  width: 'auto',
                  cursor: 'pointer',
                }}
              >
                {PRESETS.map((p, idx) => (
                  <option key={p.name} value={idx}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={`btn btn-sm ${showReferenceDrawer ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setShowReferenceDrawer(!showReferenceDrawer)}
              title="Toggle Brand Strategy Reference Panel"
            >
              <SlidersHorizontal size={14} />
              <span>{showReferenceDrawer ? 'Hide Reference Panel' : 'Show Reference Panel'}</span>
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <AlertCircle size={20} color="var(--color-error)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--color-error)' }}>
              <strong>Review Error:</strong> {errorMessage}
              {errorDetails && errorDetails.length > 0 && (
                <ul style={{ marginTop: '6px', paddingLeft: '18px', fontSize: '0.8125rem' }}>
                  {errorDetails.map((det, idx) => (
                    <li key={idx}>
                      <code>{det.field}</code>: {det.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Main Grid: Left (Draft & Findings) + Right (Reference Truth) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: showReferenceDrawer ? 'minmax(400px, 1.4fr) minmax(320px, 1fr)' : '1fr',
          gap: '24px',
          alignItems: 'start',
        }} className="workspace-grid">
          {/* LEFT COLUMN: Draft Editor + Findings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Draft Editor Component */}
            <DraftEditor
              draftText={draftText}
              setDraftText={setDraftText}
              findings={reviewResponse?.findings || []}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
              isLoading={isLoading}
              onReview={handleReview}
            />

            {/* Review Summary Banner if review ran */}
            {reviewResponse && (
              <ReviewSummaryBanner response={reviewResponse} />
            )}

            {/* Findings & Advisory Section */}
            {reviewResponse && (
              <div className="card" style={{ padding: '20px' }}>
                {/* Findings Header & Filter Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-primary)',
                    }}>
                      Editorial Findings ({filteredFindings.length} of {findings.length})
                    </span>
                  </div>

                  {findings.some(f => f.category === 'Terminology' && !dismissedFindingIds.has(f.id)) && (
                    <button
                      type="button"
                      className="btn btn-accent btn-sm"
                      onClick={handleApplyAllSafe}
                      title="Apply all safe terminology replacements"
                    >
                      <Wand2 size={13} />
                      <span>Apply All Terminology Suggestions</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '18px',
                  fontSize: '0.75rem',
                }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Category:</span>
                  {['All', 'Terminology', 'Tone', 'Claims', 'Accessibility'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: categoryFilter === cat ? 'var(--color-burgundy)' : 'var(--color-surface)',
                        color: categoryFilter === cat ? '#FFFEFC' : 'var(--color-text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}

                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>Severity:</span>
                  {['All', 'High', 'Medium', 'Low'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverityFilter(sev)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: severityFilter === sev ? 'var(--color-copper)' : 'var(--color-surface)',
                        color: severityFilter === sev ? '#FFFEFC' : 'var(--color-text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                {/* Findings List */}
                {filteredFindings.length === 0 ? (
                  <div style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <CheckCircle2 size={28} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.0625rem',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: '4px',
                    }}>
                      {findings.length === 0
                        ? 'Draft complies with all active brand guidelines, terms, and facts.'
                        : 'No findings match the selected filters.'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {findings.length === 0
                        ? 'All statements and lexicon align with your reference truth baseline.'
                        : 'Try resetting the category or severity filter.'}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {filteredFindings.map(finding => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        isSelected={selectedFindingId === finding.id}
                        isDismissed={dismissedFindingIds.has(finding.id)}
                        onSelect={() => setSelectedFindingId(finding.id)}
                        onApplySuggestion={handleApplySuggestion}
                        onToggleDismiss={handleToggleDismiss}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Brand Reference Truth Drawer */}
          {showReferenceDrawer && (
            <div style={{ position: 'sticky', top: '84px' }}>
              <ReferenceManager
                guidelines={guidelines}
                setGuidelines={setGuidelines}
                terms={terms}
                setTerms={setTerms}
                facts={facts}
                setFacts={setFacts}
                onLoadBackendSamples={handleLoadBackendSamples}
                isCustomActive={isCustomActive}
                onResetToBackendDefault={handleResetToBackendDefault}
                isLoadingSamples={isLoadingSamples}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 992px) {
          .workspace-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
