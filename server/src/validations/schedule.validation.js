const z = require('zod');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm

const windowSchema = z.object({
  start: z.string().regex(timeRegex, 'Invalid start time format (HH:mm)'),
  end: z.string().regex(timeRegex, 'Invalid end time format (HH:mm)'),
});

const weeklyRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isWorking: z.boolean(),
  windows: z.array(windowSchema).max(4, 'Max 4 windows allowed per day'),
});

const updateScheduleSchema = z.object({
  params: z.object({
    type: z.enum(['PREMIUM', 'HOME_VISIT']),
  }),
  body: z.object({
    slotDurationMin: z
      .number()
      .int()
      .min(10)
      .max(120)
      .refine((val) => val % 5 === 0, 'Must be multiple of 5')
      .optional(),
    bufferMin: z.number().int().min(0).max(60).optional(),
    advanceBookingDays: z.number().int().min(1).max(90).optional(),
    minNoticeMinutes: z.number().int().min(0).optional(),
    weeklyRules: z
      .array(weeklyRuleSchema)
      .length(7, 'Must provide exactly 7 rules for days 0-6')
      .optional(),
  }),
});

const addExceptionSchema = z.object({
  body: z.object({
    dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    kind: z.enum(['LEAVE', 'CUSTOM_HOURS']),
    appliesTo: z.array(z.enum(['NORMAL', 'PREMIUM', 'HOME_VISIT'])).min(1),
    windows: z.array(windowSchema).max(4).optional(),
    reason: z.string().max(200).optional(),
  }),
});

const deleteExceptionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID'),
  }),
});

module.exports = {
  updateScheduleSchema,
  addExceptionSchema,
  deleteExceptionSchema,
};
