import React, { useEffect, useState } from 'react';
import { api, ApiClientError } from '../../services/api';
import type { RecurringIssuesResponse } from '../../types';
import {
  AlertTriangle,
  Filter,
  BarChart3,
} from 'lucide-react';

export const RecurringIssuesDashboard: React.FC = () => {
  const [data, setData] = useState<RecurringIssuesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getRecurringIssues(undefined, undefined, categoryFilter);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load recurring-issues analytics.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [categoryFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 4px 0' }}>
            Recurring-Issues & Editorial Friction Analytics
          </h3>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Real-time telemetry aggregated from content review events and human reviewer decisions in PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <Filter size={14} />
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="All">All Categories</option>
            <option value="Terminology">Terminology</option>
            <option value="Tone">Tone & Voice</option>
            <option value="Claims">Claims & Verification</option>
            <option value="Accessibility">Accessibility</option>
          </select>

          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAnalytics}>
            Refresh
          </button>
        </div>
      </div>

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

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          Computing recurring issue telemetry...
        </div>
      ) : !data || data.summary.is_empty ? (
        <div style={{
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px',
          textAlign: 'center',
          backgroundColor: 'var(--color-surface)',
        }}>
          <BarChart3 size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px auto' }} />
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', margin: '0 0 6px 0' }}>
            No Review Telemetry Recorded Yet
          </h4>
          <p style={{ fontSize: '0.84375rem', color: 'var(--color-text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            Run draft reviews, accept or dismiss suggestions, and submit drafts to populate the recurring-issues telemetry dashboard.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Findings Triggered
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-burgundy)', marginTop: '4px' }}>
                {data.summary.total_findings_recorded}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Across {data.summary.unique_drafts_analyzed} unique drafts
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Decision Actions
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-copper)', marginTop: '4px' }}>
                {data.summary.total_decisions_recorded}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Accept, dismiss & overrides
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Governance Rules
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {data.summary.unique_rules_triggered}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Enforced across terminology & style
              </span>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                High Friction Warnings
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: data.most_dismissed_rules.some(r => r.has_friction_warning) ? '#A43D35' : 'var(--color-success)', marginTop: '4px' }}>
                {data.most_dismissed_rules.filter(r => r.has_friction_warning).length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Frequently dismissed rules
              </span>
            </div>
          </div>

          {/* Friction Warning Alerts */}
          {data.most_dismissed_rules.some(r => r.has_friction_warning) && (
            <div style={{
              backgroundColor: '#FEF8EB',
              border: '1px solid #F5D380',
              borderRadius: 'var(--radius-md)',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#8A5800' }}>
                <AlertTriangle size={18} />
                <span>Editorial Friction Detected — Guidelines Needing Clarification</span>
              </div>
              {data.most_dismissed_rules.filter(r => r.has_friction_warning).map((r) => (
                <p key={r.rule_id} style={{ margin: 0, fontSize: '0.84375rem', color: '#684300', lineHeight: 1.45 }}>
                  &bull; {r.friction_note}
                </p>
              ))}
            </div>
          )}

          {/* Most Triggered vs Dismissed Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Most Triggered */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: '0 0 14px 0' }}>
                Most Frequently Triggered Guidelines
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.most_triggered_rules.slice(0, 5).map((r) => (
                  <div
                    key={r.rule_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#FAF8F5',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.84375rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--color-burgundy)' }}>{r.rule_id}</strong>
                      <span className="badge badge-neutral" style={{ marginLeft: '8px', fontSize: '0.6875rem' }}>
                        {r.category}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78125rem' }}>
                      <span>Triggered: <strong>{r.triggered_count}x</strong></span>
                      <span style={{ color: 'var(--color-text-muted)' }}>({r.unique_drafts_affected} drafts)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Dismissed */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', margin: '0 0 14px 0' }}>
                Most Dismissed Findings (Resistance / Clarification)
              </h4>
              {data.most_dismissed_rules.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                  No findings have been dismissed yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.most_dismissed_rules.slice(0, 5).map((r) => (
                    <div
                      key={r.rule_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#FAF8F5',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.84375rem',
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{r.rule_id}</strong>
                        <span className="badge badge-neutral" style={{ marginLeft: '8px', fontSize: '0.6875rem' }}>
                          {r.category}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78125rem' }}>
                        <span>Dismissed: <strong>{r.dismissed_count}x</strong></span>
                        <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                          {Math.round(r.dismiss_rate * 100)}% Dismiss Rate
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category & Severity Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', margin: '0 0 14px 0' }}>
                Category Distribution
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.category_distribution).map(([cat, cnt]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{cat}</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{cnt}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', margin: '0 0 14px 0' }}>
                Severity Distribution
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.severity_distribution).map(([sev, cnt]) => (
                  <div key={sev} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{sev}</span>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{cnt}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
