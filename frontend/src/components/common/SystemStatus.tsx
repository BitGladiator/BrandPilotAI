import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { HealthResponse } from '../../types';

interface SystemStatusProps {
  compact?: boolean;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ compact = false }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchHealth = async () => {
      try {
        const data = await api.getHealth();
        if (active) {
          setHealth(data);
          setError(false);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="status-pill" title="Checking backend health...">
        <span className="status-dot warning" />
        <span>Connecting to backend...</span>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="status-pill" title="Backend is offline or unreachable at http://127.0.0.1:8000">
        <span className="status-dot error" />
        <span>Backend: Offline</span>
      </div>
    );
  }

  return (
    <div
      className="status-pill"
      title={`BrandPilot API v${health.version} connected | AI engine: ${health.ai_provider}`}
    >
      <span className="status-dot online" />
      <span>
        {compact ? 'Online' : `Backend: Online (${health.ai_provider})`}
      </span>
    </div>
  );
};
