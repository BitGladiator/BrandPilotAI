import React, { useState } from 'react';
import type { Finding } from '../../types';
import { Sparkles, Sliders, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';

const INITIAL_DEMO_TEXT = 'Our consumer platform is the best, available in 12 regions. Visit our portal to explore regional availability.';

// Pre-configured illustrative findings matching the backend sample reference baseline
// (No automatic AI API calls on homepage load, saving Groq tokens and providing instant load)
const ILLUSTRATIVE_FINDINGS: Finding[] = [
  {
    id: 'F-001',
    category: 'Claims',
    severity: 'High',
    source: 'ai',
    excerpt: '12 regions',
    explanation: 'The draft states 12 regions, but approved ground truth FACT01 authorizes only 10 regions.',
    suggestion: '10 regions',
    evidence_ids: ['FACT01'],
    confidence: 'medium',
  },
  {
    id: 'F-002',
    category: 'Terminology',
    severity: 'Low',
    source: 'rule',
    excerpt: 'consumer',
    explanation: 'Approved term dictionary specifies "customer" instead of deprecated term "consumer".',
    suggestion: 'customer',
    evidence_ids: ['TERM01'],
    confidence: 'high',
  },
  {
    id: 'F-003',
    category: 'Tone',
    severity: 'Medium',
    source: 'ai',
    excerpt: 'best',
    explanation: 'Promotional superlative "best" conflicts with voice guideline VOICE-02 without verified benchmark.',
    suggestion: 'leading',
    evidence_ids: ['VOICE-02'],
    confidence: 'medium',
  },
];

export const AtelierPreview: React.FC = () => {
  const [draftText, setDraftText] = useState(INITIAL_DEMO_TEXT);
  const [findings, setFindings] = useState<Finding[]>(ILLUSTRATIVE_FINDINGS);
  const [selectedFindingId, setSelectedFindingId] = useState<string>('F-001');

  // Interactive local simulation: replaces text instantly without hitting Groq API
  const handleApplySuggestion = (finding: Finding) => {
    if (!finding.suggestion) return;
    const newText = draftText.replace(finding.excerpt, finding.suggestion);
    setDraftText(newText);
    const remaining = findings.filter(f => f.id !== finding.id);
    setFindings(remaining);
    if (remaining.length > 0) {
      setSelectedFindingId(remaining[0].id);
    } else {
      setSelectedFindingId('');
    }
  };

  const handleReset = () => {
    setDraftText(INITIAL_DEMO_TEXT);
    setFindings(ILLUSTRATIVE_FINDINGS);
    setSelectedFindingId('F-001');
  };

  const activeFinding = findings.find(f => f.id === selectedFindingId) || findings[0] || null;

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        backgroundColor: 'var(--color-surface-subtle)',
        borderBottom: '1px solid var(--color-border)',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-copper)',
          }} />
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            Brand Strategy Canvas
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '2px 5px' }}>
            Illustrative Sample
          </span>
        </div>

        {draftText !== INITIAL_DEMO_TEXT && (
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.6875rem', padding: '2px 6px', gap: '4px' }}
            title="Reset sample draft"
          >
            <RotateCcw size={11} />
            <span>Reset Demo</span>
          </button>
        )}
      </div>

      {/* 2. Editorial Manuscript Preview */}
      <div style={{ padding: '22px 24px 18px' }}>
        <div style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: '10px',
        }}>
          Draft Announcement Copy:
        </div>

        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.125rem',
          lineHeight: 1.75,
          color: 'var(--color-text-primary)',
          backgroundColor: '#FAF8F5',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
          marginBottom: '18px',
          wordBreak: 'break-word',
        }}>
          “{draftText}”
        </div>

        {/* 3. Finding Tabs */}
        {findings.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}>
            {findings.map((finding) => {
              const isSelected = selectedFindingId === finding.id;

              return (
                <button
                  key={finding.id}
                  type="button"
                  onClick={() => setSelectedFindingId(finding.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected
                      ? '1px solid var(--color-burgundy)'
                      : '1px solid var(--color-border)',
                    backgroundColor: isSelected
                      ? 'var(--color-rose-bg)'
                      : 'var(--color-surface)',
                    color: isSelected
                      ? 'var(--color-burgundy)'
                      : 'var(--color-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {finding.source === 'rule' ? (
                    <Sliders size={13} color="var(--color-copper)" />
                  ) : (
                    <Sparkles size={13} color="var(--color-burgundy)" />
                  )}
                  <span>{finding.category}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    opacity: 0.8,
                  }}>
                    [{finding.excerpt}]
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Active Finding Inspector Card */}
        {activeFinding ? (
          <div style={{
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderLeft: `3px solid ${
              activeFinding.severity === 'High' ? '#A03328' :
              activeFinding.category === 'Terminology' ? 'var(--color-copper)' : 'var(--color-burgundy)'
            }`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`badge ${
                  activeFinding.category === 'Claims' ? 'badge-cat-claims' :
                  activeFinding.category === 'Tone' ? 'badge-cat-tone' :
                  activeFinding.category === 'Accessibility' ? 'badge-cat-accessibility' : 'badge-cat-terminology'
                }`}>
                  {activeFinding.category}
                </span>
                <span className={`badge ${
                  activeFinding.severity === 'High' ? 'badge-high' :
                  activeFinding.severity === 'Medium' ? 'badge-medium' : 'badge-low'
                }`}>
                  {activeFinding.severity}
                </span>
                {activeFinding.evidence_ids && activeFinding.evidence_ids.length > 0 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    backgroundColor: 'var(--color-neutral-info)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    color: 'var(--color-text-secondary)',
                  }}>
                    Anchor: {activeFinding.evidence_ids.join(', ')}
                  </span>
                )}
              </div>

              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                {activeFinding.source === 'rule' ? <Sliders size={12} /> : <Sparkles size={12} />}
                <span>{activeFinding.source === 'rule' ? 'Deterministic Engine' : 'AI Review Engine'}</span>
              </div>
            </div>

            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
              marginBottom: '12px',
            }}>
              {activeFinding.explanation}
            </p>

            {activeFinding.suggestion && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                paddingTop: '10px',
                borderTop: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{ fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', marginRight: '6px' }}>Proposed Suggestion:</span>
                  <strong style={{ color: 'var(--color-burgundy)', fontFamily: 'var(--font-sans)' }}>
                    "{activeFinding.suggestion}"
                  </strong>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handleApplySuggestion(activeFinding)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                  }}
                >
                  <span>Apply Correction</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border)',
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-success)' }}>
              <CheckCircle2 size={16} />
              <span>Compliant — All demo statements aligned with brand baseline.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
