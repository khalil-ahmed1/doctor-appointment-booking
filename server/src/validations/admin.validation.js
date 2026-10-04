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

const updatePatientBlockStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'BLOCKED']),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const updatePatientSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z
      .string()
      .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
      .optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dob: z.string().optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const getPatientParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    durationDays: z.number().int().min(1, 'Duration must be at least 1 day'),
    price: z.number().int().min(0, 'Price must be non-negative'),
    gstPercent: z.number().int().min(0).max(100).default(18),
    isActive: z.boolean().default(true),
    displayOrder: z.number().int().default(0),
    features: z.array(z.string()).default([]),
  }),
});

const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    durationDays: z.number().int().min(1).optional(),
    price: z.number().int().min(0).optional(),
    gstPercent: z.number().int().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
    features: z.array(z.string()).optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

const getPlanParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const getSubscriptionsSchema = z.object({
  query: z
    .object({
      doctorId: objectIdSchema.optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
    })
    .optional(),
});

const manualSubscriptionUpdateSchema = z.object({
  body: z.object({
    action: z.enum(['GRANT_DAYS', 'SET_END_DATE', 'CHANGE_PLAN', 'SUSPEND', 'REACTIVATE']),
    doctorId: objectIdSchema,
    days: z.number().int().min(1).optional(),
    endDate: z.string().optional(), // YYYY-MM-DD
    planId: objectIdSchema.optional(),
    reason: z.string().min(5, 'Reason is required (min 5 chars)'),
  }).refine((data) => {
    if (data.action === 'GRANT_DAYS' && !data.days) return false;
    if (data.action === 'SET_END_DATE' && !data.endDate) return false;
    if (data.action === 'CHANGE_PLAN' && !data.planId) return false;
    return true;
  }, {
    message: 'Missing required fields for the selected action',
  }),
});

const getAppointmentsSchema = z.object({
  query: z
    .object({
      status: z.string().optional(),
      type: z.string().optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
    })
    .optional(),
});

const getAppointmentParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const cancelAppointmentSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().min(5, 'Reason is required (min 5 chars)'),
  }),
});

const rescheduleAppointmentSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm'),
  }),
});

const getPaymentsSchema = z.object({
  query: z
    .object({
      status: z.string().optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
    })
    .optional(),
});

const paymentActionParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

const manualRefundSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().min(5, 'Reason is required (min 5 chars)'),
  }),
});

module.exports = {
  onboardDoctorSchema,
  updateDoctorStatusSchema,
  updateDoctorPublishSchema,
  getDoctorParamsSchema,
  updatePatientBlockStatusSchema,
  updatePatientSchema,
  getPatientParamsSchema,
  createPlanSchema,
  updatePlanSchema,
  getPlanParamsSchema,
  getSubscriptionsSchema,
  manualSubscriptionUpdateSchema,
  getAppointmentsSchema,
  getAppointmentParamsSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  getPaymentsSchema,
  paymentActionParamsSchema,
  manualRefundSchema,
};
