import React, { useState } from 'react';
import type { Finding } from '../../types';
import { Copy, Check, RotateCcw, Eye, Edit3, Sparkles } from 'lucide-react';

interface DraftEditorProps {
  draftText: string;
  setDraftText: (text: string) => void;
  findings: Finding[];
  selectedFindingId?: string | null;
  onSelectFinding?: (id: string) => void;
  isLoading: boolean;
  onReview: () => void;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({
  draftText,
  setDraftText,
  findings,
  selectedFindingId,
  onSelectFinding,
  isLoading,
  onReview,
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'inspector'>('editor');
  const [copied, setCopied] = useState(false);

  const charCount = draftText.length;
  const maxChars = 10000;
  const isNearLimit = charCount > maxChars * 0.9;
  const isOverLimit = charCount > maxChars;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Helper to render annotated text with interactive highlights based on findings' start/end offsets
  const renderAnnotatedText = () => {
    if (!draftText) {
      return (
        <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '24px 0' }}>
          No draft copy entered yet. Switch to Editor mode to enter or load draft text.
        </div>
      );
    }

    // Filter findings that have valid start and end offsets within bounds
    const validFindings = findings
      .filter(f => f.start !== undefined && f.start !== null && f.end !== undefined && f.end !== null && f.start < f.end && f.end <= draftText.length)
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    if (validFindings.length === 0) {
      return (
        <div style={{
          whiteSpace: 'pre-wrap',
          fontSize: '0.9375rem',
          lineHeight: 1.7,
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
        }}>
          {draftText}
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            backgroundColor: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}>
            {findings.length > 0
              ? 'Findings exist in this review; inspect them in the findings list on the right.'
              : 'No issues detected in this draft. Content complies with the active reference truth.'}
          </div>
        </div>
      );
    }

    // Slice segments
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    validFindings.forEach((finding, idx) => {
      const start = finding.start ?? 0;
      const end = finding.end ?? 0;

      // Handle plain text before this finding
      if (start > currentIndex) {
        segments.push(
          <span key={`plain-${currentIndex}`}>
            {draftText.substring(currentIndex, start)}
          </span>
        );
      }

      const isSelected = selectedFindingId === finding.id;
      const highlightColor =
        finding.category === 'Claims' ? '#FCE8E6' :
        finding.category === 'Tone' ? '#F7EAEF' :
        finding.category === 'Accessibility' ? '#EBF0F3' : '#FAF0E6';

      const borderColor =
        finding.category === 'Claims' ? '#E57368' :
        finding.category === 'Tone' ? '#C26284' :
        finding.category === 'Accessibility' ? '#7A98AB' : '#D49561';

      segments.push(
        <mark
          key={`mark-${finding.id}-${idx}`}
          onClick={() => onSelectFinding?.(finding.id)}
          title={`[${finding.category}] ${finding.explanation}`}
          style={{
            backgroundColor: highlightColor,
            borderBottom: `2px solid ${borderColor}`,
            outline: isSelected ? `2px solid var(--color-burgundy)` : 'none',
            outlineOffset: '2px',
            borderRadius: '2px',
            padding: '1px 3px',
            margin: '0 1px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            color: 'inherit',
          }}
        >
          {draftText.substring(start, end)}
        </mark>
      );

      currentIndex = Math.max(currentIndex, end);
    });

    if (currentIndex < draftText.length) {
      segments.push(
        <span key={`plain-${currentIndex}`}>
          {draftText.substring(currentIndex)}
        </span>
      );
    }

    return (
      <div style={{
        whiteSpace: 'pre-wrap',
        fontSize: '0.9375rem',
        lineHeight: 1.7,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
      }}>
        {segments}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: '20px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Editor Header Bar */}
      <div className="draft-editor-header">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
          }}>
            Draft Copy
          </span>

          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-neutral-info)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            border: '1px solid var(--color-border)',
            minWidth: 0,
          }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'editor' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('editor')}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            >
              <Edit3 size={12} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'inspector' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('inspector')}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            >
              <Eye size={12} />
              <span>Inspector ({findings.length})</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopy}
            disabled={!draftText}
            title="Copy current draft text"
          >
            {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDraftText('')}
            disabled={!draftText}
            title="Clear text"
          >
            <RotateCcw size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Editor / Inspector Viewport */}
      {viewMode === 'editor' ? (
        <div>
          <textarea
            className="textarea"
            rows={9}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Paste or compose your marketing copy, launch announcement, or website copy here for editorial review..."
            style={{
              width: '100%',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans)',
              minHeight: '220px',
            }}
          />
        </div>
      ) : (
        <div style={{
          minHeight: '220px',
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '12px 14px',
          backgroundColor: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {renderAnnotatedText()}
        </div>
      )}

      {/* Editor Footer: Character Counter + Review Action */}
      <div className="draft-editor-footer" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: isOverLimit ? 'var(--color-error)' : isNearLimit ? 'var(--color-warning)' : 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>{charCount.toLocaleString()} / {maxChars.toLocaleString()} characters</span>
          {isOverLimit && <strong style={{ color: 'var(--color-error)' }}>(Exceeds maximum allowed length)</strong>}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onReview}
          disabled={isLoading || !draftText.trim() || isOverLimit}
          style={{
            boxShadow: '0 2px 6px rgba(112, 47, 61, 0.25)',
          }}
        >
          {isLoading ? (
            <>
              <span className="status-dot warning" style={{ animation: 'pulse 1s infinite' }} />
              <span>Analyzing Draft...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Run Brand Review</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
