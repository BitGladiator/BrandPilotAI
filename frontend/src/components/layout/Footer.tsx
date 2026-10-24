import React from 'react';
import { Link } from 'react-router-dom';
import { BrandPilotLogo } from '../common/BrandPilotLogo';
import { ShieldCheck, Cpu, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border)',
      marginTop: 'auto',
      paddingTop: '48px',
      paddingBottom: '40px',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '36px',
          paddingBottom: '40px',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
          {/* Column 1: Brand & Manifesto */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BrandPilotLogo size={26} />
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}>
                BrandPilot
              </span>
            </div>
            <p style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              maxWidth: '320px',
            }}>
              The Brand Strategy Atelier. A disciplined workspace uniting factual ground truth, approved terminology, and voice governance under human editorial discretion.
            </p>
          </div>

          {/* Column 2: Architecture & Philosophy */}
          <div>
            <h4 style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-copper-hover)',
              marginBottom: '14px',
            }}>
              Engine Principles
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                <ShieldCheck size={14} color="var(--color-copper)" />
                <span>Zero Auto-Publish: Human in the loop</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                <Cpu size={14} color="var(--color-burgundy)" />
                <span>Deterministic lexical & accessibility rules</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                <BookOpen size={14} color="var(--color-copper)" />
                <span>Grounded anti-hallucination validation</span>
              </li>
            </ul>
          </div>

          {/* Column 3: API & Local Endpoints */}
          <div>
            <h4 style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-copper-hover)',
              marginBottom: '14px',
            }}>
              Local API Reference
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-burgundy)', fontWeight: 600 }}>POST</span> /api/review
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-copper-hover)', fontWeight: 600 }}>GET</span> /api/sample-data
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-copper-hover)', fontWeight: 600 }}>GET</span> /api/health
              </div>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--color-burgundy)', marginTop: '4px' }}
              >
                FastAPI Swagger Docs ↗
              </a>
            </div>
          </div>

          {/* Column 4: Quick Navigation */}
          <div>
            <h4 style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-copper-hover)',
              marginBottom: '14px',
            }}>
              Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
              <Link to="/" style={{ color: 'var(--color-text-secondary)' }}>Product Overview</Link>
              <Link to="/app" style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Open Content Workspace</Link>
              <a href="/#workflow" style={{ color: 'var(--color-text-secondary)' }}>Review Lifecycle</a>
              <a href="/#pillars" style={{ color: 'var(--color-text-secondary)' }}>Strategic Pillars</a>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingTop: '24px',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
        }}>
          <div>
            BrandPilot Atelier © 2026. Built with FastAPI and React TypeScript.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Advisory suggestions only</span>
            <span>•</span>
            <span>Needs human review: true</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
