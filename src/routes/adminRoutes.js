const express = require('express');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Canonicalize base path: ensure trailing slash for the admin root
router.get('', (req, res) => res.redirect(301, '/admin/'));

// Admin authentication routes (public)
router.post('/auth/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], adminAuth.authenticate.bind(adminAuth));

router.post('/auth/logout', adminAuth.logout.bind(adminAuth));

// Admin login page (public)
router.get('/login', adminController.getAdminLogin.bind(adminController));

// Serve static dashboard assets when built (public assets)
const path = require('path');
const fs = require('fs');
const dashboardDist = path.join(__dirname, '../../dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  router.use('/assets', express.static(path.join(dashboardDist, 'assets')));
}

// Middleware to check auth for protected routes
function requireAuthOrRedirect(req, res, next) {
  const sessionToken = req.cookies?.admin_session;

  if (!sessionToken) {
    // For API requests, return JSON 401 instead of redirect
    const wantsJson = req.path.startsWith('/api') ||
      req.xhr ||
      (req.get('Accept') || '').includes('application/json');

    if (wantsJson) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Redirect to login page for HTML navigation
    return res.redirect('/admin/login');
  }

  // Use the auth middleware for validation
  adminAuth.requireAuth(req, res, next);
}

// Protected admin routes (require authentication)
router.use('/', requireAuthOrRedirect);

// Admin dashboard main page
router.get('/', adminController.getAdminDashboard.bind(adminController));

// Admin API endpoints
router.get('/api/stats', adminController.getAdminStats.bind(adminController));
router.get('/api/session', adminAuth.getSessionInfo.bind(adminAuth));
router.get('/api/sessions', adminAuth.getActiveSessions.bind(adminAuth));
router.delete('/api/sessions', adminAuth.clearAllSessions.bind(adminAuth));

module.exports = router;
