const { z } = require('zod');
const { isValidObjectId } = require('mongoose');

const objectIdSchema = z.string().refine((val) => isValidObjectId(val), {
  message: 'Invalid ObjectId format',
});

const onboardDoctorSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    sendInvite: z.boolean().default(true),

    // Professional
    specializations: z.array(objectIdSchema).min(1, 'At least one specialization is required'),
    qualifications: z
      .array(
        z.object({
          degree: z.string().min(1, 'Degree is required'),
          institute: z.string().min(1, 'Institute is required'),
          year: z.number().int().min(1900).max(new Date().getFullYear()),
        }),
      )
      .min(1, 'At least one qualification is required'),
    experienceYears: z.number().int().min(0).default(0),
    registration: z.object({
      number: z.string().min(1, 'Registration number is required'),
      council: z.string().min(1, 'Council is required'),
      year: z.number().int().min(1900).max(new Date().getFullYear()),
    }),
    languages: z.array(z.string()).default([]),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    bio: z.string().optional(),

    // Clinic
    clinic: z.object({
      name: z.string().min(1, 'Clinic name is required'),
      line1: z.string().min(1, 'Address line 1 is required'),
      line2: z.string().optional(),
      landmark: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().min(1, 'Pincode is required'),
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }),

    // Fees & Types
    fees: z
      .object({
        normal: z.number().int().min(0).default(0),
        premium: z.number().int().min(0).default(0),
        homeVisit: z.number().int().min(0).default(0),
      })
      .optional(),
    types: z
      .object({
        normal: z
          .object({
            enabled: z.boolean().default(false),
            dailyTokenLimit: z.number().int().min(0).default(0),
          })
          .optional(),
        premium: z
          .object({
            enabled: z.boolean().default(false),
          })
          .optional(),
        homeVisit: z
          .object({
            enabled: z.boolean().default(false),
            serviceArea: z
              .object({
                mode: z.enum(['RADIUS', 'PINCODES']).default('RADIUS'),
                radiusKm: z.number().int().min(1).optional(),
                pincodes: z.array(z.string()).optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),

    // Payout (Stubbed)
    payout: z
      .object({
        legalName: z.string().optional(),
        businessType: z.string().optional(),
        panLast4: z.string().optional(),
        bankLast4: z.string().optional(),
        ifsc: z.string().optional(),
      })
      .optional(),
  }),
});

const updateDoctorStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const updateDoctorPublishSchema = z.object({
  body: z.object({
    isPublished: z.boolean(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const getDoctorParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

module.exports = {
  onboardDoctorSchema,
  updateDoctorStatusSchema,
  updateDoctorPublishSchema,
  getDoctorParamsSchema,
};
