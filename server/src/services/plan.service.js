const Plan = require('../models/Plan');
const ApiError = require('../utils/ApiError');

const createPlan = async (planData) => {
  const existing = await Plan.findOne({ code: planData.code });
  if (existing) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Plan code already exists');
  }
  const plan = await Plan.create(planData);
  return plan;
};

const getPlans = async (query) => {
  const { isActive } = query;
  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  const plans = await Plan.find(filter).sort({ displayOrder: 1, createdAt: -1 });
  return plans;
};

const getPlanById = async (id) => {
  const plan = await Plan.findById(id);
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', 'Plan not found');
  }
  return plan;
};

const updatePlan = async (id, updateData) => {
  if (updateData.code) {
    const existing = await Plan.findOne({ code: updateData.code, _id: { $ne: id } });
    if (existing) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Plan code already exists');
    }
  }
  const plan = await Plan.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', 'Plan not found');
  }
  return plan;
};

const deletePlan = async (id) => {
  const plan = await Plan.findById(id);
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', 'Plan not found');
  }
  // Soft delete or hard delete? PRD says plans CRUD. We can hard delete or mark inactive.
  // We'll mark as inactive for safety.
  plan.isActive = false;
  await plan.save();
  return plan;
};

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
};
