import React, { useState } from 'react';
import type { Guideline, ApprovedTerm, ApprovedFact } from '../../types';
import { Plus, Trash2, RotateCcw, Download, BookMarked, Layers, Check } from 'lucide-react';

interface ReferenceManagerProps {
  guidelines: Guideline[];
  setGuidelines: React.Dispatch<React.SetStateAction<Guideline[]>>;
  terms: ApprovedTerm[];
  setTerms: React.Dispatch<React.SetStateAction<ApprovedTerm[]>>;
  facts: ApprovedFact[];
  setFacts: React.Dispatch<React.SetStateAction<ApprovedFact[]>>;
  onLoadBackendSamples: () => void;
  isCustomActive: boolean;
  onResetToBackendDefault: () => void;
  isLoadingSamples?: boolean;
}

export const ReferenceManager: React.FC<ReferenceManagerProps> = ({
  guidelines,
  setGuidelines,
  terms,
  setTerms,
  facts,
  setFacts,
  onLoadBackendSamples,
  isCustomActive,
  onResetToBackendDefault,
  isLoadingSamples = false,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'facts' | 'guidelines'>('terms');

  // Input states for quick adding
  const [newTermPref, setNewTermPref] = useState('');
  const [newTermAvoid, setNewTermAvoid] = useState('');

  const [newFactId, setNewFactId] = useState('');
  const [newFactText, setNewFactText] = useState('');

  const [newGuideId, setNewGuideId] = useState('');
  const [newGuideText, setNewGuideText] = useState('');

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermPref.trim()) return;
    const avoidList = newTermAvoid
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setTerms(prev => [
      ...prev,
      {
        id: `TERM${(prev.length + 1).toString().padStart(2, '0')}`,
        preferred: newTermPref.trim(),
        avoid: avoidList,
      },
    ]);
    setNewTermPref('');
    setNewTermAvoid('');
  };

  const handleAddFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    setFacts(prev => [
      ...prev,
      {
        id: newFactId.trim() || `FACT${(prev.length + 1).toString().padStart(2, '0')}`,
        text: newFactText.trim(),
      },
    ]);
    setNewFactId('');
    setNewFactText('');
  };

  const handleAddGuideline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuideText.trim()) return;
    setGuidelines(prev => [
      ...prev,
      {
        id: newGuideId.trim() || `VOICE-${(prev.length + 1).toString().padStart(2, '0')}`,
        text: newGuideText.trim(),
      },
    ]);
    setNewGuideId('');
    setNewGuideText('');
  };

  const removeTerm = (idx: number) => {
    setTerms(prev => prev.filter((_, i) => i !== idx));
  };

  const removeFact = (id: string) => {
    setFacts(prev => prev.filter(f => f.id !== id));
  };

  const removeGuideline = (id: string) => {
    setGuidelines(prev => prev.filter(g => g.id !== id));
  };

  const totalItems = terms.length + facts.length + guidelines.length;

  return (
    <div className="card" style={{ padding: '20px' }}>
      {/* Header with Dataset status and actions */}
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
        <div>
          <div style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-copper-hover)',
            marginBottom: '2px',
          }}>
            Brand Reference Baseline
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {isCustomActive
              ? `Using ${totalItems} customized reference rules in request payload`
              : 'Using backend sample reference set (zero configuration needed)'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLoadBackendSamples}
            disabled={isLoadingSamples}
            title="Load sample references from backend (/api/sample-data)"
          >
            <Download size={13} />
            <span>Load Samples</span>
          </button>

          {isCustomActive && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onResetToBackendDefault}
              title="Reset to backend default"
            >
              <RotateCcw size={13} />
              <span>Use Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '16px',
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'terms' ? '2px solid var(--color-burgundy)' : '2px solid transparent',
            color: activeTab === 'terms' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Layers size={14} />
          <span>Approved Terms ({terms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('facts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'facts' ? '2px solid var(--color-burgundy)' : '2px solid transparent',
            color: activeTab === 'facts' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Check size={14} />
          <span>Approved Facts ({facts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guidelines')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'guidelines' ? '2px solid var(--color-burgundy)' : '2px solid transparent',
            color: activeTab === 'guidelines' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <BookMarked size={14} />
          <span>Voice Guidelines ({guidelines.length})</span>
        </button>
      </div>

      {/* Tab 1: Terms */}
      {activeTab === 'terms' && (
        <div>
          <form onSubmit={handleAddTerm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="Preferred (e.g. customer)"
              value={newTermPref}
              onChange={e => setNewTermPref(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <input
              type="text"
              placeholder="Avoid list (comma separated, e.g. consumer, user)"
              value={newTermAvoid}
              onChange={e => setNewTermAvoid(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newTermPref.trim()}>
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {terms.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No custom terms defined. (Backend will use default sample terms: customer, sign in, email).
              </div>
            ) : (
              terms.map((t, idx) => (
                <div
                  key={`${t.id || 'term'}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--color-burgundy)', marginRight: '6px' }}>
                      {t.preferred}
                    </strong>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                      replaces: {t.avoid.join(', ') || 'none'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTerm(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                    title="Remove term"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Facts */}
      {activeTab === 'facts' && (
        <div>
          <form onSubmit={handleAddFact} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '8px', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="FACT04"
              value={newFactId}
              onChange={e => setNewFactId(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <input
              type="text"
              placeholder="Approved fact statement (e.g. Founded in 2018)"
              value={newFactText}
              onChange={e => setNewFactText(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newFactText.trim()}>
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {facts.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No custom facts defined. (Backend will use default sample facts: 10 regions, 24-hr support, founded 2018).
              </div>
            ) : (
              facts.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-copper-hover)',
                      marginRight: '8px',
                    }}>
                      [{f.id}]
                    </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{f.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFact(f.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                    title="Remove fact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Guidelines */}
      {activeTab === 'guidelines' && (
        <div>
          <form onSubmit={handleAddGuideline} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '8px', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="VOICE-04"
              value={newGuideId}
              onChange={e => setNewGuideId(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <input
              type="text"
              placeholder="Voice rule (e.g. Avoid hype and superlatives)"
              value={newGuideText}
              onChange={e => setNewGuideText(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newGuideText.trim()}>
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {guidelines.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No custom guidelines defined. (Backend will use default sample voice rules).
              </div>
            ) : (
              guidelines.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-burgundy)',
                      marginRight: '8px',
                    }}>
                      [{g.id}]
                    </span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{g.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGuideline(g.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                    title="Remove guideline"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
