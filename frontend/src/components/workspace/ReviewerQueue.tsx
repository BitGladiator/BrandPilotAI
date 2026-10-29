import React, { useEffect, useState } from 'react';
import { api, ApiClientError } from '../../services/api';
import type { DraftDetail, DraftSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FindingCard } from './FindingCard';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';

export const ReviewerQueue: React.FC = () => {
  const { user, quickSwitchRole } = useAuth();
  const [queue, setQueue] = useState<DraftSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draftDetail, setDraftDetail] = useState<DraftDetail | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const items = await api.getReviewerQueue();
      setQueue(items);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load reviewer queue.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'reviewer') {
      fetchQueue();
    }
  }, [user]);

  const handleSelectDraft = async (draftId: string) => {
    setSelectedDraftId(draftId);
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDecisionComment('');
    try {
      const detail = await api.getDraft(draftId);
      setDraftDetail(detail);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load draft details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!draftDetail) return;

    if (draftDetail.creator_id === user?.id) {
      setErrorMessage('Unauthorized self-approval: Creators cannot approve or decide on their own drafts.');
      return;
    }

    if (!window.confirm(`Are you sure you want to mark this draft as ${decision.toUpperCase()}?`)) {
      return;
    }

    setIsSubmittingDecision(true);
    setErrorMessage(null);
    try {
      await api.decideDraft(draftDetail.id, decision, decisionComment);
      setSuccessMessage(`Draft successfully marked as ${decision}.`);
      await fetchQueue();
      // Reload draft detail
      const updated = await api.getDraft(draftDetail.id);
      setDraftDetail(updated);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(`Failed to record ${decision} decision.`);
      }
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Messages */}
      {successMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#EBF5EE',
          border: '1px solid #C4E2CE',
          color: 'var(--color-success)',
          fontSize: '0.875rem',
        }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FBEBEA',
          border: '1px solid #F3C7C4',
          color: 'var(--color-error)',
          fontSize: '0.875rem',
        }}>
          {errorMessage}
        </div>
      )}

      {!user ? (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface)',
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '32px auto',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <ShieldCheck size={40} style={{ color: 'var(--color-burgundy)', margin: '0 auto 14px auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '8px', color: 'var(--color-burgundy)' }}>
            Reviewer Sign-In Required
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            The approval queue is restricted to editorial reviewers to maintain strict separation of concerns between content creators and final approvers.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => quickSwitchRole('reviewer')}
            style={{ padding: '10px 22px', fontSize: '0.9rem' }}
          >
            Quick Sign-In as Reviewer
          </button>
        </div>
      ) : user.role !== 'reviewer' ? (
        <div style={{
          border: '1px solid #F5D380',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#FEF8EB',
          padding: '36px 28px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '32px auto',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <AlertTriangle size={36} style={{ color: '#8A5800', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: '#663C00', marginBottom: '8px' }}>
            Reviewer Account Required
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#8A5800', marginBottom: '20px', lineHeight: 1.6 }}>
            You are currently signed in as a Creator (<strong>{user.email}</strong>). In accordance with governance rules, creators cannot review or approve drafts.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => quickSwitchRole('reviewer')}
            style={{ backgroundColor: 'var(--color-burgundy)', borderColor: 'var(--color-burgundy)', padding: '10px 20px' }}
          >
            Switch to Reviewer Account
          </button>
        </div>
      ) : selectedDraftId && draftDetail ? (
        /* Detailed Review View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setSelectedDraftId(null); setDraftDetail(null); }}
            >
              <ArrowLeft size={14} />
              <span>Back to Reviewer Queue</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                Status: {draftDetail.current_status}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Revision #{draftDetail.latest_revision.revision_number}
              </span>
            </div>
          </div>

          {/* Draft Meta & Text */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', margin: '0 0 8px 0' }}>
              {draftDetail.title}
            </h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              <span>Author: <strong>{draftDetail.creator_name}</strong> ({draftDetail.creator_email})</span>
              <span>&bull;</span>
              <span>Updated: {new Date(draftDetail.updated_at).toLocaleString()}</span>
            </div>

            <div style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9375rem',
              lineHeight: 1.65,
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-wrap',
            }}>
              {draftDetail.latest_revision.draft_text}
            </div>
          </div>

          {/* Findings & Citations */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '12px' }}>
              Advisory Governance Findings ({draftDetail.findings.length})
            </h3>
            {draftDetail.findings.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
              }}>
                <FileCheck size={24} style={{ margin: '0 auto 8px auto' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No brand discrepancies flagged against reference standards.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {draftDetail.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            )}
          </div>

          {/* Decision Action Area */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: '0 0 8px 0' }}>
              Reviewer Decision & Editorial Notes
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
              Provide optional feedback or justification. Decisions and comments are permanently recorded in the draft audit trail.
            </p>

            <textarea
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              placeholder="e.g. Approved copy conforms to Q3 brand tone and regional availability claims..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-sans)',
                marginBottom: '16px',
                resize: 'vertical',
              }}
            />

            {draftDetail.creator_id === user?.id ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: '#FEF8EB',
                border: '1px solid #F5D380',
                borderRadius: 'var(--radius-xs)',
                color: '#8A5800',
                fontSize: '0.8125rem',
              }}>
                <AlertTriangle size={16} />
                <span>You created this draft. Governance rules require a separate reviewer to approve it.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDecision('approved')}
                  disabled={isSubmittingDecision}
                  style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                >
                  <CheckCircle size={16} />
                  <span>Approve Publication</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleDecision('rejected')}
                  disabled={isSubmittingDecision}
                  style={{ color: 'var(--color-error)' }}
                >
                  <XCircle size={16} />
                  <span>Request Revisions (Reject)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Queue List View */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>
                Reviewer Approval Queue
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Drafts submitted by creators awaiting formal review and sign-off.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchQueue}
              disabled={isLoading}
            >
              Refresh Queue
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              Loading reviewer queue...
            </div>
          ) : queue.length === 0 ? (
            <div style={{
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
            }}>
              <CheckCircle size={32} style={{ color: 'var(--color-success)', margin: '0 auto 10px auto' }} />
              <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '1rem' }}>Review queue is clear</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                All submitted content drafts have been reviewed and approved.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDraft(d.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-xs)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                        {d.title}
                      </strong>
                      <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                        {d.current_status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Rev #{d.latest_revision_number}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      <span>Author: {d.creator_name} ({d.creator_email})</span>
                      <span>&bull;</span>
                      <span>Submitted: {new Date(d.updated_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <button type="button" className="btn btn-primary btn-sm">
                    Open Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
