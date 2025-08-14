const express = require('express');
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Canonicalization handled by vercel.json rewrites

// Admin authentication routes (public)
router.post('/auth/login', adminAuth.authenticate.bind(adminAuth));

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
    // Para qualquer rota /admin/api/*, sempre retorna JSON 401
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Para outras rotas, mantém o comportamento de redirecionar
    return res.redirect('/admin/login');
  }

  // Use o middleware de autenticação
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
