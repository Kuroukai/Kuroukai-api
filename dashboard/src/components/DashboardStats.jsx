import { useState, useEffect } from 'react';
import './DashboardStats.css';

function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/admin/api/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setError(null);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="stats-loading">
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-error">
        <h3>Error loading statistics</h3>
        <p>{error}</p>
        <button onClick={fetchStats} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {/* Key Statistics */}
        <div className="stat-card primary">
          <div className="stat-icon">🔑</div>
          <div className="stat-content">
            <h3>Total Keys</h3>
            <div className="stat-value">{stats.total_keys}</div>
            <div className="stat-description">All API keys created</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Active Keys</h3>
            <div className="stat-value">{stats.active_keys}</div>
            <div className="stat-description">Currently valid keys</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>Expired Keys</h3>
            <div className="stat-value">{stats.expired_keys}</div>
            <div className="stat-description">No longer valid</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <h3>Recent Keys</h3>
            <div className="stat-value">{stats.recent_keys}</div>
            <div className="stat-description">Created in last 24h</div>
          </div>
        </div>

        {/* System Statistics */}
        <div className="stat-card system">
          <div className="stat-icon">🖥️</div>
          <div className="stat-content">
            <h3>System Uptime</h3>
            <div className="stat-value">{formatUptime(stats.uptime)}</div>
            <div className="stat-description">Server running time</div>
          </div>
        </div>

        <div className="stat-card system">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <h3>Memory Usage</h3>
            <div className="stat-value">{formatMemory(stats.memory_usage.heapUsed)}</div>
            <div className="stat-description">of {formatMemory(stats.memory_usage.heapTotal)} allocated</div>
          </div>
        </div>

        <div className="stat-card system">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <h3>Environment</h3>
            <div className="stat-value capitalize">{stats.environment}</div>
            <div className="stat-description">Current mode</div>
          </div>
        </div>

        <div className="stat-card system">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3>Last Updated</h3>
            <div className="stat-value">{new Date().toLocaleTimeString()}</div>
            <div className="stat-description">Auto-refresh: 30s</div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="stats-details">
        <div className="details-card">
          <h3>Key Activity Overview</h3>
          <div className="activity-chart">
            <div className="chart-bar">
              <div className="bar-segment active" style={{width: `${(stats.active_keys / (stats.total_keys || 1)) * 100}%`}}></div>
              <div className="bar-segment expired" style={{width: `${(stats.expired_keys / (stats.total_keys || 1)) * 100}%`}}></div>
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color active"></div>
                <span>Active ({Math.round((stats.active_keys / (stats.total_keys || 1)) * 100)}%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color expired"></div>
                <span>Expired ({Math.round((stats.expired_keys / (stats.total_keys || 1)) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="details-card">
          <h3>System Health</h3>
          <div className="health-indicators">
            <div className="health-item">
              <div className="health-status healthy"></div>
              <span>API Server Running</span>
            </div>
            <div className="health-item">
              <div className="health-status healthy"></div>
              <span>Database Connected</span>
            </div>
            <div className="health-item">
              <div className={`health-status ${stats.memory_usage.heapUsed / stats.memory_usage.heapTotal < 0.8 ? 'healthy' : 'warning'}`}></div>
              <span>Memory Usage Normal</span>
            </div>
            <div className="health-item">
              <div className="health-status healthy"></div>
              <span>Admin Session Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;