import { withSession } from '../../middleware/sessionMiddleware';

const handler = async (req, res) => {
  try {
    // Get or set a test value in the session
    if (!req.session.testValue) {
      req.session.testValue = 'session-test-' + Date.now();
      await new Promise(resolve => req.session.save(resolve));
    }

    // Return all session data and request info for debugging
    return res.status(200).json({
      success: true,
      sessionId: req.session.id || 'No session ID',
      testValue: req.session.testValue,
      hasCaptchaText: !!req.session.captchaText,
      cookies: req.headers.cookie,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    console.error('Session debug error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Session debug error',
      error: error.message
    });
  }
};

export default withSession(handler); 