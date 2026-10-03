const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const { uploadImage, deleteImage } = require('./upload.service');

const getDoctorProfileByUser = async (userId) => {
  const profile = await DoctorProfile.findOne({ user: userId })
    .populate('user', 'firstName lastName avatarUrl')
    .populate('specializations');
  if (!profile) {
    throw new ApiError(404, 'NOT_FOUND', 'Doctor profile not found');
  }
  return profile;
};

const updateProfile = async (userId, data) => {
  const profile = await getDoctorProfileByUser(userId);

  // Update allowed fields
  if (data.headline !== undefined) profile.headline = data.headline;
  if (data.bio !== undefined) profile.bio = data.bio;
  if (data.experienceYears !== undefined) profile.experienceYears = data.experienceYears;
  if (data.gender !== undefined) profile.gender = data.gender;
  if (data.specializations !== undefined) profile.specializations = data.specializations;
  if (data.languages !== undefined) profile.languages = data.languages;
  if (data.services !== undefined) profile.services = data.services;
  if (data.awards !== undefined) profile.awards = data.awards;
  if (data.videoUrl !== undefined) profile.videoUrl = data.videoUrl;
  if (data.social !== undefined) profile.social = data.social;
  if (data.qualifications !== undefined) profile.qualifications = data.qualifications;

  await profile.save();
  return profile.populate('specializations');
};

const updateProfilePicture = async (userId, imageBuffer, originalName) => {
  const profile = await getDoctorProfileByUser(userId);

  const imageUrl = await uploadImage(imageBuffer, originalName, 'profile');

  // We are overriding the avatarUrl on the User model as well if needed, but the PRD says
  // profile picture is under `avatarUrl` in User, wait, the DoctorProfile schema does not have `avatarUrl` or `profilePicture`.
  // Let me check PRD / models. 
  // Wait, let's look at `User` model for `avatarUrl`.
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  // Delete old picture if exists
  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl);
  }

  user.avatarUrl = imageUrl;
  await user.save();

  return imageUrl;
};

const deleteProfilePicture = async (userId) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl);
    user.avatarUrl = null;
    await user.save();
  }
};

const addGalleryImage = async (userId, imageBuffer, originalName, caption, order) => {
  const profile = await getDoctorProfileByUser(userId);

  if (profile.gallery && profile.gallery.length >= 12) {
    throw new ApiError(422, 'LIMIT_EXCEEDED', 'Maximum 12 gallery images allowed');
  }

  const imageUrl = await uploadImage(imageBuffer, originalName, 'gallery');

  const nextOrder = order !== undefined ? order : (profile.gallery.length + 1);

  profile.gallery.push({
    url: imageUrl,
    caption: caption || '',
    order: nextOrder,
  });

  await profile.save();
  return profile.gallery;
};

const updateGalleryImage = async (userId, imageId, caption, order) => {
  const profile = await getDoctorProfileByUser(userId);

  const image = profile.gallery.id(imageId);
  if (!image) {
    throw new ApiError(404, 'NOT_FOUND', 'Image not found in gallery');
  }

  if (caption !== undefined) image.caption = caption;
  if (order !== undefined) image.order = order;

  await profile.save();
  return profile.gallery;
};

const deleteGalleryImage = async (userId, imageId) => {
  const profile = await getDoctorProfileByUser(userId);

  const image = profile.gallery.id(imageId);
  if (!image) {
    throw new ApiError(404, 'NOT_FOUND', 'Image not found in gallery');
  }

  await deleteImage(image.url);
  profile.gallery.pull(imageId);

  await profile.save();
  return profile.gallery;
};

const updateClinic = async (userId, clinicData) => {
  const profile = await getDoctorProfileByUser(userId);

  const { lat, lng, ...rest } = clinicData;

  profile.clinic = {
    ...profile.clinic,
    ...rest,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };

  await profile.save();
  return profile.clinic;
};

const updateFees = async (userId, feesData) => {
  const profile = await getDoctorProfileByUser(userId);

  if (feesData.normal !== undefined) profile.fees.normal = feesData.normal;
  if (feesData.premium !== undefined) profile.fees.premium = feesData.premium;
  if (feesData.homeVisit !== undefined) profile.fees.homeVisit = feesData.homeVisit;

  await profile.save();
  return profile.fees;
};

const updateTypes = async (userId, typesData) => {
  const profile = await getDoctorProfileByUser(userId);

  if (typesData.normal) {
    if (typesData.normal.enabled !== undefined) profile.types.normal.enabled = typesData.normal.enabled;
    if (typesData.normal.dailyTokenLimit !== undefined) profile.types.normal.dailyTokenLimit = typesData.normal.dailyTokenLimit;
    if (typesData.normal.walkInHoursText !== undefined) profile.types.normal.walkInHoursText = typesData.normal.walkInHoursText;
  }

  if (typesData.premium) {
    if (typesData.premium.enabled !== undefined) profile.types.premium.enabled = typesData.premium.enabled;
  }

  if (typesData.homeVisit) {
    if (typesData.homeVisit.enabled !== undefined) profile.types.homeVisit.enabled = typesData.homeVisit.enabled;
    if (typesData.homeVisit.serviceArea) {
      if (typesData.homeVisit.serviceArea.mode !== undefined) profile.types.homeVisit.serviceArea.mode = typesData.homeVisit.serviceArea.mode;
      if (typesData.homeVisit.serviceArea.radiusKm !== undefined) profile.types.homeVisit.serviceArea.radiusKm = typesData.homeVisit.serviceArea.radiusKm;
      if (typesData.homeVisit.serviceArea.pincodes !== undefined) profile.types.homeVisit.serviceArea.pincodes = typesData.homeVisit.serviceArea.pincodes;
    }
  }

  await profile.save();
  return profile.types;
};

module.exports = {
  getDoctorProfileByUser,
  updateProfile,
  updateProfilePicture,
  deleteProfilePicture,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  updateClinic,
  updateFees,
  updateTypes,
};
