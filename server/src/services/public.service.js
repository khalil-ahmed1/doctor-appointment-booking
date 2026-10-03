const DoctorProfile = require('../models/DoctorProfile');
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const slotService = require('./slot.service'); // for availability check

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Doctor visibility rule:
 * isPublished && status = ACTIVE && subscription ∈ {TRIAL, ACTIVE, GRACE} && payout.status = ACTIVE
 */
const getVisibilityQuery = () => {
  return {
    isPublished: true,
    status: 'ACTIVE',
    'subscription.status': { $in: ['TRIAL', 'ACTIVE', 'GRACE'] },
    // 'payout.status': 'ACTIVE', // TODO: F-27 - Uncomment when Razorpay Route is implemented
    isDeleted: false,
  };
};

/**
 * Search doctors based on filters
 */
const searchDoctors = async (filters) => {
  const {
    q,
    specializations,
    city,
    pincode,
    lat,
    lng,
    radiusKm,
    type,
    minFee,
    maxFee,
    gender,
    language,
    minExperience,
    available,
    sort,
    page,
    limit,
  } = filters;

  const pipeline = [];

  // GeoNear must be the first stage if coordinates are provided
  let hasGeoNear = false;
  if (lat && lng && (sort === 'DISTANCE' || radiusKm)) {
    hasGeoNear = true;
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distance',
        maxDistance: (radiusKm || 10) * 1000, // convert km to meters
        spherical: true,
      },
    });
  }

  // Base Match Query
  const matchQuery = { ...getVisibilityQuery() };

  // Text search
  if (q) {
    matchQuery.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { 'clinic.city': { $regex: q, $options: 'i' } },
      { services: { $regex: q, $options: 'i' } },
      { headline: { $regex: q, $options: 'i' } },
    ];
  }

  // Specializations
  if (specializations) {
    const specArray = Array.isArray(specializations) ? specializations : [specializations];
    matchQuery.specializations = {
      $in: specArray.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  // City and Pincode
  if (city) {
    matchQuery['clinic.city'] = { $regex: city, $options: 'i' };
  }
  if (pincode) {
    matchQuery['clinic.pincode'] = pincode;
  }

  // Type and Fees
  if (type === 'NORMAL') {
    matchQuery['types.normal.enabled'] = true;
    if (minFee !== undefined) matchQuery['fees.normal'] = { ...matchQuery['fees.normal'], $gte: minFee };
    if (maxFee !== undefined) matchQuery['fees.normal'] = { ...matchQuery['fees.normal'], $lte: maxFee };
  } else if (type === 'PREMIUM') {
    matchQuery['types.premium.enabled'] = true;
    if (minFee !== undefined) matchQuery['fees.premium'] = { ...matchQuery['fees.premium'], $gte: minFee };
    if (maxFee !== undefined) matchQuery['fees.premium'] = { ...matchQuery['fees.premium'], $lte: maxFee };
  } else if (type === 'HOME') {
    matchQuery['types.homeVisit.enabled'] = true;
    if (minFee !== undefined) matchQuery['fees.homeVisit'] = { ...matchQuery['fees.homeVisit'], $gte: minFee };
    if (maxFee !== undefined) matchQuery['fees.homeVisit'] = { ...matchQuery['fees.homeVisit'], $lte: maxFee };
  } else {
    // If type is not specified but fees are
    if (minFee !== undefined || maxFee !== undefined) {
      matchQuery.$or = [
        {
          'types.normal.enabled': true,
          'fees.normal': {
            ...(minFee !== undefined && { $gte: minFee }),
            ...(maxFee !== undefined && { $lte: maxFee }),
          },
        },
        {
          'types.premium.enabled': true,
          'fees.premium': {
            ...(minFee !== undefined && { $gte: minFee }),
            ...(maxFee !== undefined && { $lte: maxFee }),
          },
        },
        {
          'types.homeVisit.enabled': true,
          'fees.homeVisit': {
            ...(minFee !== undefined && { $gte: minFee }),
            ...(maxFee !== undefined && { $lte: maxFee }),
          },
        },
      ];
    }
  }

  // Gender, Language, MinExperience
  if (gender) matchQuery.gender = gender;
  if (language) matchQuery.languages = language; // matches if array contains language
  if (minExperience !== undefined) matchQuery.experienceYears = { $gte: minExperience };

  pipeline.push({ $match: matchQuery });

  // Populating User and Specializations for sorting and returning
  pipeline.push({
    $lookup: {
      from: 'specializations',
      localField: 'specializations',
      foreignField: '_id',
      as: 'specializationsData',
    },
  });

  // Sorting
  let sortObj = {};
  if (sort === 'DISTANCE' && hasGeoNear) {
    sortObj = { distance: 1 };
  } else if (sort === 'EXPERIENCE') {
    sortObj = { experienceYears: -1 };
  } else if (sort === 'FEE_ASC') {
    sortObj = { 'fees.premium': 1 }; // Defaulting to premium fee for general sort
    if (type === 'NORMAL') sortObj = { 'fees.normal': 1 };
    if (type === 'HOME') sortObj = { 'fees.homeVisit': 1 };
  } else if (sort === 'FEE_DESC') {
    sortObj = { 'fees.premium': -1 };
    if (type === 'NORMAL') sortObj = { 'fees.normal': -1 };
    if (type === 'HOME') sortObj = { 'fees.homeVisit': -1 };
  } else if (sort === 'NEWEST') {
    sortObj = { createdAt: -1 };
  } else {
    // RELEVANCE (fallback to newest or experience)
    sortObj = { createdAt: -1 };
  }

  pipeline.push({ $sort: sortObj });

  // Pagination
  console.log('Filters received:', { page, limit });
  const skip = (Number(page) - 1) * Number(limit);
  console.log('Calculated skip:', skip);

  // We need to count total documents matching before pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await DoctorProfile.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  let doctors = await DoctorProfile.aggregate(pipeline);

  // Formatting output
  doctors = doctors.map((doc) => {
    const formatted = { ...doc, specializations: doc.specializationsData };
    delete formatted.specializationsData;
    return formatted;
  });

  // Optional: Available filtering (TODAY / THIS_WEEK) for Premium slots
  if (available && doctors.length > 0) {
    // Note: Availability computation requires fetching slots from slot.service.js which can be expensive in a loop.
    // In production, we'd cache it or compute simplified availability flags via cron.
    // We will do a quick check for Premium slots
    const today = dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const endDate = available === 'THIS_WEEK' ? dayjs().tz('Asia/Kolkata').add(7, 'day').format('YYYY-MM-DD') : today;

    const availabilityPromises = doctors.map(async (doc) => {
      // Find if any available slots between today and endDate
      let hasSlots = false;
      let curr = dayjs(today);
      const end = dayjs(endDate);
      while (curr.isBefore(end) || curr.isSame(end, 'day')) {
        const slots = await slotService.generateSlots(doc._id, 'PREMIUM', curr.format('YYYY-MM-DD'));
        if (slots.some(s => s.status === 'AVAILABLE')) {
          hasSlots = true;
          break;
        }
        curr = curr.add(1, 'day');
      }
      return { doc, hasSlots };
    });

    const availabilityResults = await Promise.all(availabilityPromises);
    doctors = availabilityResults.filter(r => r.hasSlots).map(r => r.doc);
    // Note: The total count will be slightly inaccurate due to post-filtering, but it's okay for Phase 1.
  }

  return {
    doctors,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get doctor details by slug
 */
const getDoctorBySlug = async (slug) => {
  const query = { slug, ...getVisibilityQuery() };
  const doctor = await DoctorProfile.findOne(query).populate('specializations');
  return doctor;
};

module.exports = {
  searchDoctors,
  getDoctorBySlug,
};
