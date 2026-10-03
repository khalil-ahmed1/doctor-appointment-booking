const { z } = require('zod');

const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format'),
      phone: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit phone number'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-zA-Z]/, 'Password must contain at least 1 letter')
        .regex(/[0-9]/, 'Password must contain at least 1 number'),
      dob: z.string().pipe(z.coerce.date()).optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    })
    .strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(1, 'Password is required'),
    })
    .strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
    })
    .strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const resetPasswordSchema = z.object({
  body: z
    .object({
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-zA-Z]/, 'Password must contain at least 1 letter')
        .regex(/[0-9]/, 'Password must contain at least 1 number'),
    })
    .strict(),
  params: z.object({
    token: z.string().min(1),
  }),
  query: z.object({}).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
