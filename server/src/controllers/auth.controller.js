const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== 'localhost') {
  cookieOptions.domain = env.COOKIE_DOMAIN;
}

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      // Temporarily returning token for dev/testing until email is integrated
      emailVerifyToken:
        env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
          ? result.emailVerifyToken
          : undefined,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const reqInfo = {
    ip: req.ip,
    userAgent: req.get('user-agent') || 'Unknown',
  };

  const { user, accessToken, refreshToken } = await authService.loginUser(email, password, reqInfo);

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.status(200).json({
    success: true,
    data: {
      user,
      accessToken,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token provided');
  }

  const reqInfo = {
    ip: req.ip,
    userAgent: req.get('user-agent') || 'Unknown',
  };

  const {
    user,
    accessToken,
    refreshToken: newRefreshToken,
  } = await authService.refreshAuthToken(refreshToken, reqInfo);

  res.cookie('refreshToken', newRefreshToken, cookieOptions);

  res.status(200).json({
    success: true,
    data: {
      user,
      accessToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken && req.user) {
    await authService.logoutUser(req.user._id, refreshToken);
  }

  res.clearCookie('refreshToken', {
    ...cookieOptions,
    maxAge: 0,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    throw new ApiError(400, 'BAD_REQUEST', 'Token is required');
  }

  await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  res.status(200).json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.',
    data: {
      resetToken:
        env.NODE_ENV === 'development' || env.NODE_ENV === 'test' ? result?.resetToken : undefined,
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  await authService.resetPassword(token, password);

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully',
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  getMe,
  forgotPassword,
  resetPassword,
};
