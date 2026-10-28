import React from 'react';
import type { ReviewResponse } from '../../types';
import { ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, Database } from 'lucide-react';

interface ReviewSummaryBannerProps {
  response: ReviewResponse;
}

export const ReviewSummaryBanner: React.FC<ReviewSummaryBannerProps> = ({ response }) => {
  const { findings, review_summary, ai_status, reference_source, warnings } = response;

  const ruleCount = findings.filter(f => f.source === 'rule').length;
  const aiCount = findings.filter(f => f.source === 'ai').length;

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderLeft: '4px solid var(--color-burgundy)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {findings.length === 0 ? (
            <CheckCircle2 size={18} color="var(--color-success)" />
          ) : (
            <ShieldAlert size={18} color="var(--color-burgundy)" />
          )}
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            {findings.length === 0 ? 'Compliant with Reference Truth' : `${findings.length} Issue${findings.length > 1 ? 's' : ''} Identified`}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-neutral" title="Source of guidelines, terms, and facts used for this review">
            <Database size={12} />
            Reference: {reference_source === 'sample' ? 'Default Catalog' : 'Custom Atelier Dataset'}
          </span>

          <span
            className={`badge ${ai_status === 'ok' ? 'badge-burgundy' : ai_status === 'unavailable' ? 'badge-high' : 'badge-neutral'}`}
            title="Status of AI tone and claims verification engine"
          >
            <Sparkles size={12} />
            AI Review: {ai_status.toUpperCase()}
          </span>

          <span className="badge badge-copper" title="BrandPilot design guarantee: AI never auto-approves">
            Advisory Only
          </span>
        </div>
      </div>

      <p style={{
        fontSize: '0.875rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
        marginBottom: '10px',
      }}>
        {review_summary}
      </p>

      {/* Engine breakdown pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 16px',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>Deterministic Rule Engine:</span>
          <strong style={{ color: 'var(--color-text-primary)' }}>{ruleCount}</strong>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>AI Heuristic Analysis:</span>
          <strong style={{ color: 'var(--color-text-primary)' }}>{aiCount}</strong>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>Human Review:</span>
          <strong style={{ color: 'var(--color-burgundy)' }}>Required</strong>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.8125rem',
          color: 'var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={15} />
          <span>{warnings.join(' ')}</span>
        </div>
      )}
    </div>
  );
};
