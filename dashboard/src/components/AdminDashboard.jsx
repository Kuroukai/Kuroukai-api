import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import Sidebar from './Sidebar';
import DashboardStats from './DashboardStats';
import KeysManager from './KeysManager';
import AdminSettings from './AdminSettings';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/admin/api/session', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserSession(data.session);
      } else {
        // Redirect to login if not authenticated
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/admin/login';
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      window.location.href = '/admin/login';
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="admin-dashboard">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        userSession={userSession}
      />
      
      <main className="main-content">
        <div className="content-header">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'keys' && 'Keys Manager'}
            {activeTab === 'settings' && 'Admin Settings'}
          </h1>
          <div className="header-actions">
            <div className="user-info">
              <span className="session-id">Session: {userSession?.id?.substring(0, 8)}...</span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="content-body">
          {activeTab === 'dashboard' && <DashboardStats />}
          {activeTab === 'keys' && <KeysManager />}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;