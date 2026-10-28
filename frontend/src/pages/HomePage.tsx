import React from 'react';
import { Link } from 'react-router-dom';
import { AtelierPreview } from '../components/home/AtelierPreview';
import { BrandPilotLogo } from '../components/common/BrandPilotLogo';
import {
  ArrowRight,
  ShieldCheck,
  Sliders,
  Sparkles,
  FileCheck2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(48px, 8vw, 80px)', paddingBottom: '80px' }}>
      {/* 1. HERO SECTION */}
      <section style={{
        paddingTop: 'clamp(28px, 5vw, 64px)',
        paddingBottom: '24px',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.25fr)',
            gap: '40px',
            alignItems: 'center',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
          }} className="hero-grid">
            {/* Left Column: Editorial Copy */}
            <div style={{ minWidth: 0, maxWidth: '100%', width: '100%' }}>
              <h1 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: 'var(--color-text-primary)',
                marginBottom: '20px',
              }}>
                Build a brand with direction.
              </h1>

              <p style={{
                fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)',
                lineHeight: 1.65,
                color: 'var(--color-text-secondary)',
                marginBottom: '32px',
                maxWidth: '520px',
              }}>
                Bring your brand voice, approved terminology, and verified facts into a disciplined editorial review workflow before publishing.
              </p>

              {/* CTAs */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '36px',
              }} className="hero-cta-group">
                <Link
                  to="/app"
                  className="btn btn-primary btn-lg"
                  style={{
                    boxShadow: '0 3px 12px rgba(112, 47, 61, 0.28)',
                  }}
                >
                  <span>Open BrandPilot</span>
                  <ArrowRight size={17} />
                </Link>

                <a
                  href="#workflow"
                  className="btn btn-secondary btn-lg"
                >
                  Explore the workflow
                </a>
              </div>

              {/* Atelier Guarantees */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                paddingTop: '20px',
                borderTop: '1px solid var(--color-border)',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
              }} className="hero-guarantees-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--color-burgundy)" style={{ flexShrink: 0 }} />
                  <span>Always Human-Reviewed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={16} color="var(--color-copper)" style={{ flexShrink: 0 }} />
                  <span>Deterministic Rule Precision</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="var(--color-burgundy)" style={{ flexShrink: 0 }} />
                  <span>Anti-Hallucination Grounding</span>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Strategy Canvas Preview */}
            <div style={{ minWidth: 0, maxWidth: '100%', width: '100%' }}>
              <AtelierPreview />
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE THREE PILLARS */}
      <section id="pillars" className="container">
        <div style={{ marginBottom: '40px', maxWidth: '640px' }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-copper-hover)',
            marginBottom: '8px',
          }}>
            Strategic Pillars
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            marginBottom: '12px',
          }}>
            Three foundations of brand integrity.
          </h2>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            BrandPilot reconciles marketing drafts against your definitive strategy baseline across three explicit vectors.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}>
          {/* Pillar 1 */}
          <div className="card" style={{ borderTop: '3px solid #A03328' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#FDF0EE',
              color: '#A03328',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <FileCheck2 size={20} />
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
            }}>
              Dimension 01
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}>
              Certified Fact Grounding
            </h3>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '14px' }}>
              Claims are cross-checked against authorized ground-truth statements. Factual contradictions are immediately escalated with high severity, while unverified claims are flagged for verification rather than blindly accepted.
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-neutral-info)',
              padding: '6px 10px',
              borderRadius: '4px',
              color: 'var(--color-text-secondary)',
            }}>
              Example: Flagging "12 regions" when approved fact states "10 regions".
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="card" style={{ borderTop: '3px solid var(--color-copper)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-copper-subtle)',
              color: 'var(--color-copper)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <Sliders size={20} />
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
            }}>
              Dimension 02
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}>
              Deterministic Lexicon Rules
            </h3>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '14px' }}>
              Terminology rules run deterministically with whole-word tokenization, preserving capitalization and plural inflections. Unapproved slang, deprecated terms, and competitor phrases are mapped to preferred brand vocabulary.
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-neutral-info)',
              padding: '6px 10px',
              borderRadius: '4px',
              color: 'var(--color-text-secondary)',
            }}>
              Example: "Consumers" → "Customers", "log in" → "sign in".
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="card" style={{ borderTop: '3px solid var(--color-burgundy)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-rose-bg)',
              color: 'var(--color-burgundy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <BrandPilotLogo size={24} />
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: '4px',
            }}>
              Dimension 03
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}>
              Voice & Tone Stewardship
            </h3>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '14px' }}>
              Heuristic semantic review highlights unsubstantiated superlatives ("the best", "revolutionary"), passive corporate voice, and vague link text ("click here") that harm accessibility and brand resonance.
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-neutral-info)',
              padding: '6px 10px',
              borderRadius: '4px',
              color: 'var(--color-text-secondary)',
            }}>
              Example: Flagging superlatives conflicting with VOICE-02 guidelines.
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE WORKFLOW */}
      <section id="workflow" style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        padding: '64px 0',
      }}>
        <div className="container">
          <div style={{ marginBottom: '40px', maxWidth: '640px' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-copper-hover)',
              marginBottom: '8px',
            }}>
              Review Lifecycle
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              marginBottom: '12px',
            }}>
              From rough draft to certified brand copy.
            </h2>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              A disciplined, transparent four-step cycle that respects editorial judgment.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
            gap: '24px',
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
          }}>
            {/* Step 1 */}
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-copper)',
                marginBottom: '12px',
              }}>
                STEP 01
              </div>
              <h4 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Define Reference Truth
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                Ingest or customize brand guidelines, preferred/avoided terminology dictionaries, and verified fact records.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-burgundy)',
                marginBottom: '12px',
              }}>
                STEP 02
              </div>
              <h4 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Draft in the Atelier
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                Paste or compose announcements, email drafts, marketing assets, or product changelogs with real-time character bounds.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-copper)',
                marginBottom: '12px',
              }}>
                STEP 03
              </div>
              <h4 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Dual-Engine Execution
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                The FastAPI service evaluates deterministic lexicon matching alongside AI tone and fact verification with strict anti-hallucination guards.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--color-burgundy)',
                marginBottom: '12px',
              }}>
                STEP 04
              </div>
              <h4 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                Editorial Sovereignty
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                Suggestions are advisory. The human editor inspects character-offset excerpts, applies one-click corrections, or accepts items as-is.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ENGINE ARCHITECTURE */}
      <section id="architecture" className="container">
        <div className="atelier-spec-card">
          <div style={{ maxWidth: '640px', marginBottom: '32px' }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-burgundy)',
              marginBottom: '8px',
            }}>
              Engineering Specification
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.875rem',
              fontWeight: 600,
              marginBottom: '10px',
            }}>
              Engine safeguards & offline reliability.
            </h2>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              BrandPilot was engineered for dependable execution without external API fragility.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '24px',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
          }}>
            <div style={{
              borderLeft: '2px solid var(--color-burgundy)',
              paddingLeft: '16px',
            }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '6px' }}>
                Anti-Hallucination Dropping
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                Any AI finding whose excerpt cannot be located in the original draft is immediately discarded, preventing phantom feedback.
              </p>
            </div>

            <div style={{
              borderLeft: '2px solid var(--color-copper)',
              paddingLeft: '16px',
            }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '6px' }}>
                Autonomous Mock Provider
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                A built-in heuristic reviewer operates entirely offline without external keys, while supporting standard OpenAI-compatible endpoints seamlessly.
              </p>
            </div>

            <div style={{
              borderLeft: '2px solid var(--color-text-primary)',
              paddingLeft: '16px',
            }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '6px' }}>
                Graceful Degradation
              </h4>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                If external AI models fail or timeout, the engine degrades gracefully to deterministic rule checks without interrupting the editor's work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CLOSING CTA */}
      <section className="container">
        <div className="atelier-cta-card">
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.75rem, 4vw, 2.125rem)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '14px',
          }}>
            Refine your brand copy with precision.
          </h2>
          <p style={{
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            maxWidth: '560px',
            margin: '0 auto 28px',
          }}>
            Enter the atelier workspace to test your content against brand guidelines, approved lexicon, and verified factual statements.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link
              to="/app"
              className="btn btn-primary btn-lg"
              style={{
                boxShadow: '0 4px 14px rgba(112, 47, 61, 0.28)',
              }}
            >
              <span>Open Content Workspace</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
        }
      `}</style>
    </div>
  );
};
