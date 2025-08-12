const Logger = require('../utils/logger');
const config = require('../config');

const logger = new Logger(config.logging.level);

class AdminController {
        /**
         * Serve admin dashboard HTML (built) or a minimal fallback
         */
        getAdminDashboard(req, res) {
            const path = require('path');
            const fs = require('fs');
            const distIndex = path.join(__dirname, '../../dashboard/dist/index.html');

            if (fs.existsSync(distIndex)) {
                // Serve built index.html
                return res.sendFile(distIndex);
            }

            // Fallback minimal page
            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kuroukai Admin</title>
    <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;margin:0;background:#0b0b0b;color:#fff}
        .card{max-width:720px;margin:0 auto;background:#141414;border:1px solid #222;border-radius:12px;padding:24px}
        h1{margin:0 0 8px}
        .muted{color:#9aa0a6}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px}
        .kpi{background:#0f0f0f;border:1px solid #222;border-radius:10px;padding:16px}
        code{background:#0f0f0f;border:1px solid #222;border-radius:6px;padding:2px 6px}
        a{color:#8ab4f8}
    </style>
    <script>window.ADMIN_SESSION='${req.adminSession?.id || ''}'</script>
    </head>
    <body>
        <div class="card">
            <h1>Kuroukai Admin</h1>
            <div class="muted">Sessão: <code>${req.adminSession?.id || 'n/d'}</code></div>
            <div class="grid">
                <div class="kpi"><div class="muted">Ambiente</div><div><code>${config.nodeEnv}</code></div></div>
                <div class="kpi"><div class="muted">Uptime</div><div><code>${Math.floor(process.uptime())}s</code></div></div>
            </div>
            <p style="margin-top:16px">Use os endpoints de administração via API: <code>/admin/api/*</code></p>
        </div>
    </body>
    </html>`;
        res.send(html);
  }

        /**
         * Serve admin login page
         */
  getAdminLogin(req, res) {
    const loginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kuroukai Admin - Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }

        .login-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            width: 100%;
            max-width: 400px;
        }

        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .login-header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .login-header p {
            opacity: 0.8;
            font-size: 1.1rem;
        }

        .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-group label {
            font-weight: 600;
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .form-group input {
            padding: 12px 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .form-group input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }

        .login-button {
            padding: 14px 20px;
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .login-button:active {
            transform: translateY(0);
        }

        .login-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .error-message {
            color: #fef2f2;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            font-size: 0.9rem;
            display: none;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Kuroukai</h1>
            <p>Admin Dashboard</p>
        </div>

        <form class="login-form" id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Enter admin username"
                    required
                >
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter admin password"
                    required
                >
            </div>

            <div class="error-message" id="errorMessage"></div>

            <button type="submit" class="login-button" id="loginButton">
                Sign In
            </button>
        </form>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
        const loginButton = document.getElementById('loginButton');
        const errorMessage = document.getElementById('errorMessage');

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }

        function setLoading(loading) {
            if (loading) {
                loginButton.disabled = true;
                loginButton.innerHTML = '<span class="loading"></span> Signing in...';
            } else {
                loginButton.disabled = false;
                loginButton.innerHTML = 'Sign In';
            }
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;
            if (!username || !password) {
                showError('Please enter username and password');
                return;
            }

            setLoading(true);

            try {
                const response = await fetch('/admin/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.success) {
                    // Redirect to canonical admin base with trailing slash to match Vite base
                    window.location.href = '/admin/';
                } else {
                    showError(data.message || 'Invalid password');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Connection error. Please try again.');
            } finally {
                setLoading(false);
            }
        });

    // Focus username input on load
    usernameInput.focus();
    </script>
</body>
</html>`;

    res.send(loginHtml);
  }

    /**
     * Get admin dashboard statistics
     */
  async getAdminStats(req, res) {
    try {
      const keyService = require('../services/keyService');

      // Get various statistics
      const [
        totalKeys,
        activeKeys,
        expiredKeys,
        recentKeys
      ] = await Promise.all([
        keyService.getTotalKeysCount(),
        keyService.getActiveKeysCount(),
        keyService.getExpiredKeysCount(),
        keyService.getRecentKeys(24) // Last 24 hours
      ]);

      res.json({
        success: true,
        stats: {
          total_keys: totalKeys,
          active_keys: activeKeys,
          expired_keys: expiredKeys,
          recent_keys: recentKeys.length,
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          environment: config.nodeEnv
        }
      });
    } catch (error) {
      logger.error('Error getting admin stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving statistics'
      });
    }
  }
}

module.exports = new AdminController();
