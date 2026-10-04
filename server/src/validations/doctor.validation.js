const z = require('zod');

// GET/PATCH /doctor/profile
const updateProfileSchema = z.object({
  body: z.object({
    headline: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    specializations: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID')).optional(),
    languages: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    awards: z.array(z.string()).optional(),
    videoUrl: z.string().url().or(z.literal('')).optional(),
    social: z
      .object({
        website: z.string().url().or(z.literal('')).optional(),
        twitter: z.string().url().or(z.literal('')).optional(),
        linkedin: z.string().url().or(z.literal('')).optional(),
      })
      .optional(),
    qualifications: z
      .array(
        z.object({
          degree: z.string().min(1),
          institute: z.string().min(1),
          year: z.number().int().min(1900).max(new Date().getFullYear()),
        }),
      )
      .optional(),
  }),
});

// POST/PATCH/DELETE /doctor/gallery
const addGalleryItemSchema = z.object({
  body: z.object({
    caption: z.string().max(200).optional(),
    order: z.coerce.number().int().optional(),
  }),
});

const updateGalleryItemSchema = z.object({
  params: z.object({
    imageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid image ID'),
  }),
  body: z.object({
    caption: z.string().max(200).optional(),
    order: z.coerce.number().int().optional(),
  }),
});

const deleteGalleryItemSchema = z.object({
  params: z.object({
    imageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid image ID'),
  }),
});

// PATCH /doctor/clinic
const updateClinicSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    landmark: z.string().max(100).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid 6-digit PIN code'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    mapsUrl: z.string().url().or(z.literal('')).optional(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Invalid 10-digit phone')
      .optional(),
    email: z.string().email().or(z.literal('')).optional(),
    timingsText: z.string().max(150).optional(),
  }),
});

// PATCH /doctor/fees
const updateFeesSchema = z.object({
  body: z.object({
    normal: z.number().int().min(100).max(10000000).optional(),
    premium: z.number().int().min(100).max(10000000).optional(),
    homeVisit: z.number().int().min(100).max(10000000).optional(),
  }),
});

// PATCH /doctor/types
const updateTypesSchema = z.object({
  body: z.object({
    normal: z
      .object({
        enabled: z.boolean().optional(),
        dailyTokenLimit: z.number().int().min(0).max(500).optional(),
        walkInHoursText: z.string().max(150).optional(),
      })
      .optional(),
    premium: z
      .object({
        enabled: z.boolean().optional(),
      })
      .optional(),
    homeVisit: z
      .object({
        enabled: z.boolean().optional(),
        serviceArea: z
          .object({
            mode: z.enum(['RADIUS', 'PINCODES']).optional(),
            radiusKm: z.number().min(1).max(100).optional(),
            pincodes: z.array(z.string().regex(/^[1-9][0-9]{5}$/)).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

const getAppointmentsSchema = z.object({
  query: z.object({
    type: z.enum(['NORMAL', 'PREMIUM', 'HOME_VISIT']).optional(),
    status: z.string().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
      .optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const updateAppointmentStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appointment ID'),
  }),
  body: z.object({
    status: z.enum([
      'CHECKED_IN',
      'EN_ROUTE',
      'IN_PROGRESS',
      'COMPLETED',
      'NO_SHOW',
      'CANCELLED_BY_DOCTOR',
    ]),
    reason: z.string().optional(), // Required for cancel
  }),
});

const updateAppointmentNoteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appointment ID'),
  }),
  body: z.object({
    note: z.string().max(1000),
  }),
});

const rescheduleAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appointment ID'),
  }),
  body: z.object({
    dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  }),
});

const getEarningsSchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const createSubscriptionOrderSchema = z.object({
  body: z.object({
    planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid plan ID'),
  }),
});

const verifySubscriptionPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1, 'Order ID is required'),
    razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
    razorpay_signature: z.string().min(1, 'Signature is required'),
    planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid plan ID'),
  }),
});

module.exports = {
  updateProfileSchema,
  addGalleryItemSchema,
  updateGalleryItemSchema,
  deleteGalleryItemSchema,
  updateClinicSchema,
  updateFeesSchema,
  updateTypesSchema,
  getAppointmentsSchema,
  updateAppointmentStatusSchema,
  updateAppointmentNoteSchema,
  rescheduleAppointmentSchema,
  getEarningsSchema,
  createSubscriptionOrderSchema,
  verifySubscriptionPaymentSchema,
};
