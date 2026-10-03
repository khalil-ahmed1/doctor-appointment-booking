const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken, hashToken, generateRandomToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');

const registerUser = async (userData) => {
  const { name, email, phone, password, dob, gender } = userData;

  const existingUserEmail = await User.findOne({ email });
  if (existingUserEmail) {
    throw new ApiError(400, 'BAD_REQUEST', 'Email is already registered');
  }

  const existingUserPhone = await User.findOne({ phone });
  if (existingUserPhone) {
    throw new ApiError(400, 'BAD_REQUEST', 'Phone is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  
  const emailVerifyToken = generateRandomToken();
  const hashedEmailToken = hashToken(emailVerifyToken);
  const emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    dob,
    gender,
    role: 'PATIENT',
    emailVerifyToken: hashedEmailToken,
    emailVerifyExpires,
  });

  // TODO: Send verification email here (F-04)
  // For now, we just return the unhashed token in dev/test, though in real life we send it via email
  return { user, emailVerifyToken };
};

const loginUser = async (email, password, reqInfo) => {
  const user = await User.findOne({ email }).select('+passwordHash');
  
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  if (user.status === 'BLOCKED' || user.isDeleted) {
    throw new ApiError(401, 'BLOCKED', 'User is blocked or deleted');
  }

  // Check lockout
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(401, 'LOCKED_OUT', 'Account temporarily locked out. Please try again later.');
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordMatch) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
    }
    await user.save();
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  // Reset lockout
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = Date.now();

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);
  const hashedRefreshToken = hashToken(refreshToken);

  // Add refresh token to DB (rotating token logic)
  user.refreshTokens.push({
    tokenHash: hashedRefreshToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    userAgent: reqInfo.userAgent,
    ip: reqInfo.ip,
  });

  await user.save();
  user.passwordHash = undefined;

  return { user, accessToken, refreshToken };
};

const refreshAuthToken = async (refreshToken, reqInfo) => {
  if (!refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token not found');
  }

  const hashedToken = hashToken(refreshToken);

  const user = await User.findOne({
    'refreshTokens.tokenHash': hashedToken,
    'refreshTokens.expiresAt': { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
  
  if (user.status === 'BLOCKED' || user.isDeleted) {
    throw new ApiError(401, 'BLOCKED', 'User is blocked or deleted');
  }

  // Remove the used refresh token (rotation)
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.tokenHash !== hashedToken);

  const newAccessToken = generateAccessToken(user._id, user.role);
  const newRefreshToken = generateRefreshToken(user._id, user.role);
  const newHashedRefreshToken = hashToken(newRefreshToken);

  user.refreshTokens.push({
    tokenHash: newHashedRefreshToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    userAgent: reqInfo.userAgent,
    ip: reqInfo.ip,
  });

  await user.save();

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logoutUser = async (userId, refreshToken) => {
  const hashedToken = hashToken(refreshToken);
  
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { tokenHash: hashedToken } }
  });
};

const verifyEmail = async (token) => {
  const hashedToken = hashToken(token);
  
  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid or expired verification token');
  }

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  
  return user;
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Return true anyway to prevent email enumeration attacks
    return true;
  }

  const resetToken = generateRandomToken();
  const hashedResetToken = hashToken(resetToken);
  
  user.resetTokenHash = hashedResetToken;
  user.resetTokenExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  // TODO: Send email with resetToken (F-04)
  // Returning it for dev/test
  return { resetToken };
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetTokenHash: hashedToken,
    resetTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'BAD_REQUEST', 'Invalid or expired password reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  user.passwordHash = passwordHash;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  
  // Also log out from all sessions (optional but good practice)
  user.refreshTokens = [];
  
  await user.save();
};

module.exports = {
  registerUser,
  loginUser,
  refreshAuthToken,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resetPassword
};
