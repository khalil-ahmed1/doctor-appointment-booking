const ApiError = require('../utils/ApiError');

/**
 * Calculates the exact fee breakdown for a consultation booking.
 * All inputs and outputs are in integer paise (1 INR = 100 paise).
 *
 * @param {number} consultationFee - Doctor's fee in paise
 * @param {Object} settings - System settings containing fee config
 * @param {string} settings.feeBearer - 'PATIENT' or 'DOCTOR'
 * @param {number} settings.gatewayFeePercent - Gateway fee % (e.g. 2 for 2%)
 * @param {number} settings.gstOnFeePercent - GST on gateway fee % (e.g. 18 for 18%)
 * @param {number} settings.platformCommissionPercent - Platform commission % (e.g. 10 for 10%)
 * @returns {Object} Fee breakdown
 */
const calculateFeeBreakdown = (consultationFee, settings) => {
  if (consultationFee < 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Consultation fee cannot be negative');
  }

  const {
    feeBearer = 'PATIENT',
    gatewayFeePercent = 2,
    gstOnFeePercent = 18,
    platformCommissionPercent = 0,
  } = settings || {};

  const commissionRate = platformCommissionPercent / 100;
  const platformCommission = Math.round(consultationFee * commissionRate);

  if (feeBearer === 'PATIENT') {
    // Gross up formula so doctor gets exactly the consultationFee (before our platform commission)
    // total = ceil( consultationFee / (1 - r * (1 + g)) )
    const r = gatewayFeePercent / 100;
    const g = gstOnFeePercent / 100;
    const denominator = 1 - r * (1 + g);

    // Protect against weird denominator (e.g. gateway fee > 100%)
    if (denominator <= 0) {
      throw new ApiError(500, 'SERVER_ERROR', 'Invalid gateway fee percentage configuration');
    }

    const total = Math.ceil(consultationFee / denominator);
    const convenienceFee = total - consultationFee;

    // Transfer to doctor doesn't subtract convenience fee because patient paid for it.
    // It only subtracts our platform commission.
    const transferToDoctor = Math.max(0, consultationFee - platformCommission);

    return {
      consultationFee,
      convenienceFee,
      platformCommission,
      total,
      feeBearer: 'PATIENT',
      transferToDoctor,
    };
  } else if (feeBearer === 'DOCTOR') {
    // Patient pays exactly the consultation fee
    const total = consultationFee;
    const convenienceFee = 0;

    // Actual gateway deduction is resolved post-capture via webhook/API from Razorpay.
    // For estimation/preview purposes, we can compute an estimated transfer amount:
    // estimatedFee = total * gatewayFeePercent + GST
    // But PRD specifies: transferToDoctor = total - actualFee - actualTax - platformCommission
    // We'll calculate the estimated deductions here so the UI can show a preview to the doctor.
    const estimatedActualFee = Math.round(total * (gatewayFeePercent / 100));
    const estimatedActualTax = Math.round(estimatedActualFee * (gstOnFeePercent / 100));

    const estimatedTransferToDoctor = Math.max(
      0,
      total - estimatedActualFee - estimatedActualTax - platformCommission,
    );

    return {
      consultationFee,
      convenienceFee,
      platformCommission,
      total,
      feeBearer: 'DOCTOR',
      // We pass the estimated transfer. The final payout happens in the webhook handler `finalizePayment`
      estimatedTransferToDoctor,
      // Pass these for the receipt
      estimatedGatewayFee: estimatedActualFee,
      estimatedGatewayGst: estimatedActualTax,
    };
  }

  throw new ApiError(500, 'SERVER_ERROR', 'Invalid feeBearer configuration');
};

module.exports = {
  calculateFeeBreakdown,
};
