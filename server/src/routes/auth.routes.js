const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', validate(authValidation.registerSchema), authController.register);
router.post('/login', validate(authValidation.loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout); // require valid token to logout properly

router.get('/verify-email/:token', authController.verifyEmail);
router.post(
  '/forgot-password',
  validate(authValidation.forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password/:token',
  validate(authValidation.resetPasswordSchema),
  authController.resetPassword,
);

router.get('/me', protect, authController.getMe);

module.exports = router;
