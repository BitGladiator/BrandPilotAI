import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { X, User as UserIcon, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickSwitchRole } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('creator');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register(email, password, fullName, role);
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (targetRole: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await quickSwitchRole(targetRole);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to sign into demo account.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '440px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.2rem' }}>
            {isRegisterMode ? 'Create BrandPilot Account' : 'Sign in to Atelier'}
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: '#FBEBEA',
              color: 'var(--color-error)',
              fontSize: '0.8125rem',
            }}>
              {errorMessage}
            </div>
          )}

          {isRegisterMode && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Karan Sharma"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editor@brandpilot.ai"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {isRegisterMode && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Select Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--color-surface)',
                }}
              >
                <option value="creator">Creator (Drafts, Reviews & Submissions)</option>
                <option value="reviewer">Reviewer (Queue, Approvals & Governance)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
          >
            {isLoading ? 'Processing...' : isRegisterMode ? 'Register Account' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.8125rem' }}>
            {isRegisterMode ? (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-burgundy)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-burgundy)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Register
                </button>
              </span>
            )}
          </div>

          {/* Quick Demo Role Switcher for Seamless Testing */}
          <div style={{
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Quick Demo Accounts (Instant Role Switching)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('creator')}
                disabled={isLoading}
                style={{ fontSize: '0.75rem' }}
              >
                <UserIcon size={12} />
                <span>Login as Creator</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickDemo('reviewer')}
                disabled={isLoading}
                style={{ fontSize: '0.75rem' }}
              >
                <Shield size={12} />
                <span>Login as Reviewer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
