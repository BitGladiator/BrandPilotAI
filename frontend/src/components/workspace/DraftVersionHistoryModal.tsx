import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { AuditEventItem, RevisionItem } from '../../types';
import { X, History, RotateCcw, ShieldCheck } from 'lucide-react';

interface DraftVersionHistoryModalProps {
  draftId: string;
  currentRevisionNumber: number;
  onClose: () => void;
  onRestore: (revisionId: string) => void;
}

export const DraftVersionHistoryModal: React.FC<DraftVersionHistoryModalProps> = ({
  draftId,
  currentRevisionNumber,
  onClose,
  onRestore,
}) => {
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'revisions' | 'audit'>('revisions');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [revs, audits] = await Promise.all([
          api.getRevisions(draftId),
          api.getAuditTrail(draftId),
        ]);
        setRevisions(revs);
        setAuditEvents(audits);
        if (revs.length > 0) {
          setSelectedRevId(revs[revs.length - 1].id);
        }
      } catch {
        // Ignored
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [draftId]);

  const selectedRev = revisions.find((r) => r.id === selectedRevId);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} style={{ color: 'var(--color-burgundy)' }} />
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.2rem' }}>
                Draft Version History & Audit Trail
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Immutable revision snapshots preserved in PostgreSQL
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#FAF8F5',
          padding: '0 24px',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('revisions')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'revisions' ? 600 : 400,
              color: activeTab === 'revisions' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'revisions' ? '2px solid var(--color-burgundy)' : '2px solid transparent',
              fontSize: '0.875rem',
            }}
          >
            Revisions ({revisions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === 'audit' ? 600 : 400,
              color: activeTab === 'audit' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'audit' ? '2px solid var(--color-burgundy)' : '2px solid transparent',
              fontSize: '0.875rem',
            }}
          >
            Audit Trail ({auditEvents.length})
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              Loading history...
            </div>
          ) : activeTab === 'revisions' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', minHeight: '320px' }}>
              {/* Revision List Sidebar */}
              <div style={{ borderRight: '1px solid var(--color-border)', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {revisions.map((r) => {
                  const isSelected = r.id === selectedRevId;
                  const isLatest = r.revision_number === currentRevisionNumber;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRevId(r.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: isSelected ? 'var(--color-burgundy-subtle)' : '#FAF8F5',
                        border: `1px solid ${isSelected ? 'var(--color-burgundy)' : 'var(--color-border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <strong style={{ fontSize: '0.875rem', color: isSelected ? 'var(--color-burgundy)' : 'var(--color-text-primary)' }}>
                          Rev #{r.revision_number}
                        </strong>
                        {isLatest && (
                          <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>
                            Current
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Revision Snapshot Details */}
              {selectedRev ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>
                        Revision #{selectedRev.revision_number} Content
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Captured on {new Date(selectedRev.created_at).toLocaleString()}
                      </p>
                    </div>

                    {selectedRev.revision_number !== currentRevisionNumber && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onRestore(selectedRev.id)}
                        title="Restore this revision by appending a new revision with its text"
                      >
                        <RotateCcw size={13} />
                        <span>Restore This Version</span>
                      </button>
                    )}
                  </div>

                  {selectedRev.review_summary && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--color-neutral-info)',
                      fontSize: '0.78125rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <strong>Review Summary:</strong> {selectedRev.review_summary}
                    </div>
                  )}

                  <div style={{
                    backgroundColor: '#FAF8F5',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '14px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    {selectedRev.draft_text}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>Select a revision to inspect</div>
              )}
            </div>
          ) : (
            /* Audit Trail Timeline */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {auditEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--color-copper)' }} />
                    <div>
                      <strong style={{ color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                        {ev.action_type.replace(/_/g, ' ')}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Actor: {ev.actor_email || 'System'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
