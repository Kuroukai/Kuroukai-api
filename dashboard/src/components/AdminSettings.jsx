import { useState, useEffect } from 'react';
import './AdminSettings.css';

function AdminSettings() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/admin/api/sessions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        throw new Error('Failed to fetch sessions');
      }
    } catch (error) {
      setError('Error fetching sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAllSessions = async () => {
    if (!window.confirm('Are you sure you want to clear all admin sessions? This will log out all users.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/admin/api/sessions', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        // Redirect to login since our session will be cleared too
        window.location.href = '/admin/login';
      } else {
        throw new Error('Failed to clear sessions');
      }
    } catch (error) {
      setError('Error clearing sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="admin-settings">
      <div className="settings-header">
        <h2>Admin Settings</h2>
        <p>Manage admin sessions and system configuration</p>
      </div>

      <div className="settings-sections">
        {/* Authentication Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h3>🔐 Authentication</h3>
            <p>Manage admin passwords and sessions</p>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <h4>Environment Variables</h4>
              <p>Configure passwords via environment variables for security</p>
              <div className="env-vars">
                <code>ADMIN_DEFAULT_PASSWORD=your_default_password</code>
              </div>
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div className="settings-section">
          <div className="section-header">
            <h3>👥 Active Sessions</h3>
            <p>Monitor and manage active admin sessions</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="sessions-controls">
            <button
              onClick={fetchSessions}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? '🔄' : '🔄'} Refresh Sessions
            </button>

            <button
              onClick={clearAllSessions}
              className="danger-btn"
              disabled={loading}
            >
              🗑️ Clear All Sessions
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading sessions...</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="empty-sessions">
                  <div className="empty-icon">👤</div>
                  <h4>No Active Sessions</h4>
                  <p>No admin sessions are currently active</p>
                </div>
              ) : (
                <div className="sessions-table">
                  <div className="table-header">
                    <div className="header-cell">Session ID</div>
                    <div className="header-cell">IP Address</div>
                    <div className="header-cell">Created</div>
                    <div className="header-cell">User Agent</div>
                  </div>
                  {sessions.map((session) => (
                    <div key={session.id} className="table-row">
                      <div className="table-cell session-id">
                        <code>{session.id.substring(0, 12)}...</code>
                      </div>
                      <div className="table-cell ip-address">
                        {session.ip}
                      </div>
                      <div className="table-cell created-date">
                        {formatDate(session.createdAt)}
                      </div>
                      <div className="table-cell user-agent">
                        <span title={session.userAgent}>
                          {session.userAgent?.substring(0, 50)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="settings-section">
          <div className="section-header">
            <h3>💻 System Information</h3>
            <p>Current system configuration and status</p>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <h4>API Version</h4>
              <p>Current version of Kuroukai Free API</p>
              <code className="version-display">v2.0.0</code>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <h4>Documentation</h4>
              <p>Links to documentation and resources</p>
              <div className="links">
                <a href="https://github.com/Kuroukai/Kuroukai-free-api" target="_blank" rel="noopener noreferrer" className="doc-link">
                  📚 GitHub Repository
                </a>
                <a href="/health" target="_blank" rel="noopener noreferrer" className="doc-link">
                  🏥 API Health Check
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
