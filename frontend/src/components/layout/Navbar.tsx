import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SystemStatus } from '../common/SystemStatus';
import { BrandPilotLogo } from '../common/BrandPilotLogo';
import { Menu, X, ArrowUpRight } from 'lucide-react';

type NavTab = 'overview' | 'pillars' | 'workflow' | 'architecture';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const location = useLocation();
  const navigate = useNavigate();
  const isWorkspace = location.pathname.startsWith('/app');

  // Handle active tab synchronization with scroll position and hash
  useEffect(() => {
    if (isWorkspace) return;

    const handleHashAndScroll = () => {
      const hash = window.location.hash.replace('#', '') as NavTab;
      if (['pillars', 'workflow', 'architecture'].includes(hash)) {
        setActiveTab(hash);
        return;
      }

      // Scroll spy on homepage sections
      const pillarsEl = document.getElementById('pillars');
      const workflowEl = document.getElementById('workflow');
      const architectureEl = document.getElementById('architecture');

      const scrollPos = window.scrollY + 120;

      if (architectureEl && scrollPos >= architectureEl.offsetTop) {
        setActiveTab('architecture');
      } else if (workflowEl && scrollPos >= workflowEl.offsetTop) {
        setActiveTab('workflow');
      } else if (pillarsEl && scrollPos >= pillarsEl.offsetTop) {
        setActiveTab('pillars');
      } else {
        setActiveTab('overview');
      }
    };

    handleHashAndScroll();
    window.addEventListener('scroll', handleHashAndScroll, { passive: true });
    window.addEventListener('hashchange', handleHashAndScroll);

    return () => {
      window.removeEventListener('scroll', handleHashAndScroll);
      window.removeEventListener('hashchange', handleHashAndScroll);
    };
  }, [isWorkspace, location.pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: NavTab, targetId?: string) => {
    e.preventDefault();
    setActiveTab(tab);
    setMobileMenuOpen(false);

    if (isWorkspace) {
      navigate(targetId ? `/#${targetId}` : '/');
      return;
    }

    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, '', '/');
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#${targetId}`);
      }
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(255, 254, 252, 0.96)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--color-border)',
      transition: 'all 0.2s ease',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Brand Wordmark */}
        <Link
          to="/"
          onClick={(e) => handleNavClick(e as unknown as React.MouseEvent<HTMLAnchorElement>, 'overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: 'var(--color-text-primary)',
          }}
        >
          <BrandPilotLogo size={34} />
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1,
              color: 'var(--color-text-primary)',
            }}>
              BrandPilot
            </div>
         
          </div>
        </Link>

        {/* Desktop Nav Links with Dynamic Highlighting Underline */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          height: '64px',
        }} className="desktop-nav">
          <a
            href="/"
            onClick={(e) => handleNavClick(e, 'overview')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              fontSize: '0.875rem',
              fontWeight: !isWorkspace && activeTab === 'overview' ? 600 : 500,
              color: !isWorkspace && activeTab === 'overview' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            Overview
            {!isWorkspace && activeTab === 'overview' && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'var(--color-burgundy)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </a>

          <a
            href="/#pillars"
            onClick={(e) => handleNavClick(e, 'pillars', 'pillars')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              fontSize: '0.875rem',
              fontWeight: !isWorkspace && activeTab === 'pillars' ? 600 : 500,
              color: !isWorkspace && activeTab === 'pillars' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            Core Pillars
            {!isWorkspace && activeTab === 'pillars' && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'var(--color-burgundy)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </a>

          <a
            href="/#workflow"
            onClick={(e) => handleNavClick(e, 'workflow', 'workflow')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              fontSize: '0.875rem',
              fontWeight: !isWorkspace && activeTab === 'workflow' ? 600 : 500,
              color: !isWorkspace && activeTab === 'workflow' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            Workflow
            {!isWorkspace && activeTab === 'workflow' && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'var(--color-burgundy)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </a>

          <a
            href="/#architecture"
            onClick={(e) => handleNavClick(e, 'architecture', 'architecture')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              fontSize: '0.875rem',
              fontWeight: !isWorkspace && activeTab === 'architecture' ? 600 : 500,
              color: !isWorkspace && activeTab === 'architecture' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            Engine Spec
            {!isWorkspace && activeTab === 'architecture' && (
              <span style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'var(--color-burgundy)',
                borderRadius: '2px 2px 0 0',
              }} />
            )}
          </a>
        </nav>

        {/* Status + CTA Area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}>
          <div className="desktop-status">
            <SystemStatus compact />
          </div>

          {isWorkspace ? (
            <Link
              to="/"
              className="btn btn-secondary btn-sm navbar-top-cta"
            >
              Exit to Overview
            </Link>
          ) : (
            <Link
              to="/app"
              className="btn btn-primary btn-sm navbar-top-cta"
              style={{
                boxShadow: '0 2px 6px rgba(112, 47, 61, 0.25)',
              }}
            >
              <span>Open Atelier</span>
              <ArrowUpRight size={15} />
            </Link>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="mobile-toggle btn btn-ghost btn-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              padding: '6px',
              display: 'none',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '20px 20px 26px',
          boxShadow: '0 10px 24px rgba(41, 36, 33, 0.08)',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          zIndex: 100,
        }} className="mobile-menu">
          <div style={{ marginBottom: '18px' }}>
            <Link
              to={isWorkspace ? '/' : '/app'}
              onClick={() => setMobileMenuOpen(false)}
              className={`btn ${isWorkspace ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', justifyContent: 'center', minHeight: '44px' }}
            >
              {isWorkspace ? 'Exit to Overview' : 'Open BrandPilot Atelier'}
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <a
              href="/"
              onClick={(e) => handleNavClick(e, 'overview')}
              style={{
                fontSize: '1rem',
                fontWeight: !isWorkspace && activeTab === 'overview' ? 600 : 500,
                color: !isWorkspace && activeTab === 'overview' ? 'var(--color-burgundy)' : 'var(--color-text-primary)',
                textDecoration: 'none',
                padding: '6px 0',
              }}
            >
              Overview
            </a>
            <a
              href="/#pillars"
              onClick={(e) => handleNavClick(e, 'pillars', 'pillars')}
              style={{
                fontSize: '1rem',
                fontWeight: !isWorkspace && activeTab === 'pillars' ? 600 : 500,
                color: !isWorkspace && activeTab === 'pillars' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '6px 0',
              }}
            >
              Core Pillars
            </a>
            <a
              href="/#workflow"
              onClick={(e) => handleNavClick(e, 'workflow', 'workflow')}
              style={{
                fontSize: '1rem',
                fontWeight: !isWorkspace && activeTab === 'workflow' ? 600 : 500,
                color: !isWorkspace && activeTab === 'workflow' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '6px 0',
              }}
            >
              Workflow
            </a>
            <a
              href="/#architecture"
              onClick={(e) => handleNavClick(e, 'architecture', 'architecture')}
              style={{
                fontSize: '1rem',
                fontWeight: !isWorkspace && activeTab === 'architecture' ? 600 : 500,
                color: !isWorkspace && activeTab === 'architecture' ? 'var(--color-burgundy)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: '6px 0',
              }}
            >
              Engine Spec
            </a>
          </div>

          <div>
            <SystemStatus />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 820px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-status {
            display: none !important;
          }
          .mobile-toggle {
            display: inline-flex !important;
          }
        }
        @media (max-width: 540px) {
          .navbar-top-cta {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
