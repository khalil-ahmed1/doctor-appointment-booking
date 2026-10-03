const { z } = require('zod');

const emptyToUndefined = (val) => (val === '' ? undefined : val);

const coerceNumberOptional = z.preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().optional());

const searchDoctorsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    specializations: z.union([z.string(), z.array(z.string())]).optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    lat: coerceNumberOptional,
    lng: coerceNumberOptional,
    radiusKm: z.preprocess((val) => (val === undefined || val === '' ? 10 : Number(val)), z.number().default(10).optional()),
    type: z.preprocess(emptyToUndefined, z.enum(['NORMAL', 'PREMIUM', 'HOME']).optional()),
    minFee: coerceNumberOptional,
    maxFee: coerceNumberOptional,
    gender: z.preprocess(emptyToUndefined, z.enum(['MALE', 'FEMALE', 'OTHER']).optional()),
    language: z.string().optional(),
    minExperience: coerceNumberOptional,
    available: z.preprocess(emptyToUndefined, z.enum(['TODAY', 'THIS_WEEK']).optional()),
    sort: z.preprocess(emptyToUndefined, z.enum(['RELEVANCE', 'EXPERIENCE', 'FEE_ASC', 'FEE_DESC', 'DISTANCE', 'NEWEST']).default('RELEVANCE')),
    page: z.preprocess((val) => (val === undefined || val === '' ? 1 : Number(val)), z.number().min(1).default(1)),
    limit: z.preprocess((val) => (val === undefined || val === '' ? 12 : Number(val)), z.number().min(1).max(50).default(12)),
  }),
});

module.exports = {
  searchDoctorsSchema,
};
