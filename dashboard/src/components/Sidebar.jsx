import './Sidebar.css';

function Sidebar({ activeTab, onTabChange, onLogout, userSession }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview & Statistics'
    },
    {
      id: 'keys',
      label: 'Keys Manager',
      icon: '🔑',
      description: 'Manage API Keys'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'Admin Configuration'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">K</div>
          <div className="brand-text">
            <h2>Kuroukai</h2>
            <p>Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-section-title">MAIN</h3>
          <ul className="nav-list">
            {menuItems.map(item => (
              <li key={item.id} className="nav-item">
                <button
                  className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="session-info">
          <div className="session-status">
            <div className="status-indicator online"></div>
            <span>Session Active</span>
          </div>
          <div className="session-details">
            <p>Connected from {userSession?.ip || 'Unknown'}</p>
            <p>Since {userSession?.createdAt ? new Date(userSession.createdAt).toLocaleTimeString() : 'Unknown'}</p>
          </div>
        </div>
        
        <button className="sidebar-logout" onClick={onLogout}>
          <span className="logout-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;