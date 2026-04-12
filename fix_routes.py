import re

# Read file
with open('server/routes.ts', 'r') as f:
    content = f.read()

# OTP routes to insert
otp_routes = '''
  // OTP Authentication Routes
  app.post('/api/auth/otp/send', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || phone.length < 10) {
        return res.status(400).json({ success: false, error: 'Valid phone required' });
      }
      const result = await OTPService.sendOTP(phone);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });

  app.post('/api/auth/otp/verify', async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ success: false, error: 'Phone and code required' });
      const result = await OTPService.verifyOTP(phone, code);
      if (result.success) {
        res.cookie('m3r_session', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 604800000 });
      }
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Verification failed' });
    }
  });

  app.post('/api/auth/pin', async (req, res) => {
    res.status(410).json({ success: false, message: 'PIN deprecated. Use mobile OTP.', redirect: '/otp-login' });
  });
'''

# Find "return httpServer;" and insert before it
content = content.replace('  return httpServer;', otp_routes + '\n  return httpServer;')

# Write back
with open('server/routes.ts', 'w') as f:
    f.write(content)

print("Routes inserted successfully!")
