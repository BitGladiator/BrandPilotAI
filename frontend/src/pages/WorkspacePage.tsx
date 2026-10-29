import React, { useState } from 'react';
import { api, ApiClientError } from '../services/api';
import type {
  Finding,
  ReviewResponse,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { DraftEditor } from '../components/workspace/DraftEditor';
import { FindingCard } from '../components/workspace/FindingCard';
import { ReviewSummaryBanner } from '../components/workspace/ReviewSummaryBanner';
import { BrandGuidelineLibrary } from '../components/documents/BrandGuidelineLibrary';
import { ReviewerQueue } from '../components/workspace/ReviewerQueue';
import { RecurringIssuesDashboard } from '../components/analytics/RecurringIssuesDashboard';
import { EvaluationDashboard } from '../components/evaluation/EvaluationDashboard';
import { DraftVersionHistoryModal } from '../components/workspace/DraftVersionHistoryModal';
import { AuthModal } from '../components/auth/AuthModal';
import {
  BookOpen,
  Send,
  History,
  ShieldCheck,
  BarChart3,
  Target,
  Sparkles,
  FileEdit,
  LogIn,
} from 'lucide-react';

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

type WorkspaceTab = 'studio' | 'guidelines' | 'queue' | 'analytics' | 'evaluation';

export const WorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('studio');

  // Draft state
  const [draftTitle, setDraftTitle] = useState('Marketing Launch Campaign Draft');
  const [draftText, setDraftText] = useState(PRESETS[0].text);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentDraftStatus, setCurrentDraftStatus] = useState<string>('draft');
  const [currentRevisionNumber, setCurrentRevisionNumber] = useState<number>(1);

  // Review response state
  const [isLoading, setIsLoading] = useState(false);
  const [reviewResponse, setReviewResponse] = useState<ReviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selection & filter
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [dismissedFindingIds, setDismissedFindingIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Run Review & persist draft in PostgreSQL if authenticated
  const handleReview = async () => {
    if (!draftText.trim()) {
      setErrorMessage('Please enter draft text before running a review.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // If user is authenticated, create or update the persistent Draft entity
      if (user) {
        if (!currentDraftId) {
          const draftObj = await api.createDraft(draftTitle, draftText);
          setCurrentDraftId(draftObj.id);
          setCurrentDraftStatus(draftObj.current_status);
          setCurrentRevisionNumber(draftObj.latest_revision.revision_number);
          setReviewResponse({
            findings: draftObj.findings,
            review_summary: draftObj.latest_revision.review_summary || 'Review completed against brand guidelines.',
            needs_human_review: draftObj.latest_revision.needs_human_review,
            ai_status: (draftObj.latest_revision.ai_status as 'ok' | 'skipped' | 'unavailable') || 'ok',
            reference_source: 'indexed_database',
            warnings: [],
          });
          setSuccessMessage(`Draft created and saved as Revision #${draftObj.latest_revision.revision_number} in PostgreSQL.`);
          setIsLoading(false);
          return;
        } else {
          const draftObj = await api.updateDraft(currentDraftId, draftTitle, draftText);
          setCurrentDraftStatus(draftObj.current_status);
          setCurrentRevisionNumber(draftObj.latest_revision.revision_number);
          setReviewResponse({
            findings: draftObj.findings,
            review_summary: draftObj.latest_revision.review_summary || 'Review completed against brand guidelines.',
            needs_human_review: draftObj.latest_revision.needs_human_review,
            ai_status: (draftObj.latest_revision.ai_status as 'ok' | 'skipped' | 'unavailable') || 'ok',
            reference_source: 'indexed_database',
            warnings: [],
          });
          setSuccessMessage(`Updated to Revision #${draftObj.latest_revision.revision_number}.`);
          setIsLoading(false);
          return;
        }
      }

      // Fallback for unauthenticated direct review
      const payload = {
        draft_text: draftText,
        use_indexed_guidelines: true,
      };

      const response = await api.reviewDraft(payload);
      setReviewResponse(response);
      setDismissedFindingIds(new Set());
      setSelectedFindingId(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unexpected error during review.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit draft to reviewer queue
  const handleSubmitForApproval = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!currentDraftId) {
      // Create first
      try {
        const draftObj = await api.createDraft(draftTitle, draftText);
        setCurrentDraftId(draftObj.id);
        await api.submitDraft(draftObj.id);
        setCurrentDraftStatus('submitted');
        setSuccessMessage('Draft saved and submitted to the reviewer approval queue!');
      } catch (err: unknown) {
        if (err instanceof ApiClientError) setErrorMessage(err.message);
      }
      return;
    }

    try {
      await api.submitDraft(currentDraftId);
      setCurrentDraftStatus('submitted');
      setSuccessMessage('Draft successfully submitted to reviewer queue.');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to submit draft.');
      }
    }
  };

  // Suggestion action
  const handleApplySuggestion = async (finding: Finding) => {
    if (!finding.suggestion) return;

    if (finding.start !== undefined && finding.end !== undefined && finding.start !== null && finding.end !== null) {
      const before = draftText.slice(0, finding.start);
      const after = draftText.slice(finding.end);
      setDraftText(before + finding.suggestion + after);
    } else {
      setDraftText((prev) => prev.replace(finding.excerpt, finding.suggestion));
    }

    // Record decision if persistent draft
    if (currentDraftId && user) {
      try {
        await api.recordSuggestionAction(currentDraftId, finding.id, 'accept');
      } catch {
        // Ignored
      }
    }

    setDismissedFindingIds((prev) => new Set(prev).add(finding.id));
  };

  const handleToggleDismiss = async (findingId: string) => {
    const isDismissed = dismissedFindingIds.has(findingId);
    const action = isDismissed ? 'override' : 'dismiss';

    setDismissedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      return next;
    });

    if (currentDraftId && user) {
      try {
        await api.recordSuggestionAction(currentDraftId, findingId, action);
      } catch {
        // Ignored
      }
    }
  };

  const handleRestoreRevision = async (revisionId: string) => {
    if (!currentDraftId) return;
    try {
      const restored = await api.restoreRevision(currentDraftId, revisionId);
      setDraftText(restored.latest_revision.draft_text);
      setCurrentRevisionNumber(restored.latest_revision.revision_number);
      setCurrentDraftStatus(restored.current_status);
      setReviewResponse({
        findings: restored.findings,
        review_summary: restored.latest_revision.review_summary || 'Restored historical revision.',
        needs_human_review: restored.latest_revision.needs_human_review,
        ai_status: 'ok',
        reference_source: 'indexed_database',
        warnings: [],
      });
      setShowHistoryModal(false);
      setSuccessMessage(`Restored to Revision #${restored.latest_revision.revision_number}. Historical records remain immutable.`);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) setErrorMessage(err.message);
    }
  };

  // Filter findings
  const allFindings = reviewResponse?.findings || [];
  const filteredFindings = allFindings.filter((f) => {
    if (categoryFilter !== 'All' && f.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '60px' }}>
      {/* Top Workspace Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`btn btn-sm ${activeTab === 'studio' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <FileEdit size={14} />
            <span>Atelier Draft Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={`btn btn-sm ${activeTab === 'guidelines' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <BookOpen size={14} />
            <span>Brand Guidelines Library</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <ShieldCheck size={14} />
            <span>Reviewer Approval Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <BarChart3 size={14} />
            <span>Recurring-Issues Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluation')}
            className={`btn btn-sm ${activeTab === 'evaluation' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Target size={14} />
            <span>Accuracy Benchmark</span>
          </button>
        </div>

        {/* User Account / Role Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
              <span className="badge badge-neutral" style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {user.role} Account: {user.full_name}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAuthModal(true)}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Switch Account
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={13} />
              <span>Sign In / Demo Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#EBF5EE',
          border: '1px solid #C4E2CE',
          color: 'var(--color-success)',
          fontSize: '0.875rem',
          marginBottom: '20px',
        }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FBEBEA',
          border: '1px solid #F3C7C4',
          color: 'var(--color-error)',
          fontSize: '0.875rem',
          marginBottom: '20px',
        }}>
          {errorMessage}
        </div>
      )}

      {/* TAB CONTENT: Guidelines Library */}
      {activeTab === 'guidelines' && (
        <BrandGuidelineLibrary />
      )}

      {/* TAB CONTENT: Reviewer Queue */}
      {activeTab === 'queue' && (
        <ReviewerQueue />
      )}

      {/* TAB CONTENT: Recurring Issues */}
      {activeTab === 'analytics' && (
        <RecurringIssuesDashboard />
      )}

      {/* TAB CONTENT: Accuracy Evaluation */}
      {activeTab === 'evaluation' && (
        <EvaluationDashboard />
      )}

      {/* TAB CONTENT: Draft Studio */}
      {activeTab === 'studio' && (
        <div>
          {/* Header Controls for Studio */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            backgroundColor: 'var(--color-surface)',
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Draft Title..."
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-text-primary)',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentDraftId && (
                <>
                  <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                    {currentDraftStatus}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    <History size={14} />
                    <span>Rev #{currentRevisionNumber} History</span>
                  </button>
                </>
              )}

              {/* Preset Selector */}
              <select
                onChange={(e) => {
                  const p = PRESETS.find((x) => x.name === e.target.value);
                  if (p) setDraftText(p.text);
                }}
                defaultValue=""
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="" disabled>Load Sample Presets...</option>
                {PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSubmitForApproval}
                disabled={currentDraftStatus === 'submitted' || currentDraftStatus === 'approved'}
                title="Submit this draft to the reviewer queue"
              >
                <Send size={13} />
                <span>Submit to Reviewer</span>
              </button>
            </div>
          </div>

          {/* Review Summary Banner */}
          {reviewResponse && (
            <div style={{ marginBottom: '20px' }}>
              <ReviewSummaryBanner
                response={reviewResponse}
              />
            </div>
          )}

          {/* Main Studio 2-Column Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}>
            {/* Left: Draft Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DraftEditor
                draftText={draftText}
                setDraftText={setDraftText}
                onReview={handleReview}
                isLoading={isLoading}
                findings={allFindings}
                selectedFindingId={selectedFindingId}
                onSelectFinding={setSelectedFindingId}
              />
            </div>

            {/* Right: Findings & Exact Citations Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', margin: 0 }}>
                  Findings & Source Citations ({filteredFindings.length})
                </h4>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Terminology">Terminology</option>
                    <option value="Tone">Tone</option>
                    <option value="Claims">Claims</option>
                    <option value="Accessibility">Accessibility</option>
                  </select>
                </div>
              </div>

              {allFindings.length === 0 ? (
                <div style={{
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface)',
                }}>
                  <Sparkles size={28} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px auto' }} />
                  <p style={{ fontWeight: 500, margin: '0 0 4px 0' }}>Ready for Review</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Click "Run Editorial Review" to reconcile this draft against brand guidelines with exact pgvector citations.
                  </p>
                </div>
              ) : filteredFindings.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No findings match the current category filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredFindings.map((finding) => (
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
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && currentDraftId && (
        <DraftVersionHistoryModal
          draftId={currentDraftId}
          currentRevisionNumber={currentRevisionNumber}
          onClose={() => setShowHistoryModal(false)}
          onRestore={handleRestoreRevision}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};
