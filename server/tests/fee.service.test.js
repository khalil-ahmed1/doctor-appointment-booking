const { calculateFeeBreakdown } = require('../src/services/fee.service');
const ApiError = require('../src/utils/ApiError');

describe('Fee Service - calculateFeeBreakdown', () => {
  describe('Fee Bearer: PATIENT', () => {
    it('calculates gross-up correctly when Patient pays gateway fees', () => {
      // 500 INR = 50000 paise
      const consultationFee = 50000;
      
      const settings = {
        feeBearer: 'PATIENT',
        gatewayFeePercent: 2,
        gstOnFeePercent: 18,
        platformCommissionPercent: 0
      };

      const result = calculateFeeBreakdown(consultationFee, settings);

      // Denominator = 1 - (0.02 * 1.18) = 1 - 0.0236 = 0.9764
      // Total = 50000 / 0.9764 = 51208.52... = 51209 (ceil)
      // Convenience Fee = 51209 - 50000 = 1209 paise (₹12.09)
      
      expect(result.consultationFee).toBe(50000);
      expect(result.feeBearer).toBe('PATIENT');
      expect(result.total).toBe(51209);
      expect(result.convenienceFee).toBe(1209);
      expect(result.platformCommission).toBe(0);
      expect(result.transferToDoctor).toBe(50000);
    });

    it('deducts platform commission from doctor payout if configured', () => {
      // 1000 INR = 100000 paise
      const consultationFee = 100000;
      
      const settings = {
        feeBearer: 'PATIENT',
        gatewayFeePercent: 2,
        gstOnFeePercent: 18,
        platformCommissionPercent: 10 // 10%
      };

      const result = calculateFeeBreakdown(consultationFee, settings);

      // Commission = 10% of 100000 = 10000 paise
      expect(result.platformCommission).toBe(10000);
      expect(result.transferToDoctor).toBe(90000); // 100000 - 10000
    });
  });

  describe('Fee Bearer: DOCTOR', () => {
    it('sets total exactly to consultation fee and estimates deductions for Doctor', () => {
      // 500 INR = 50000 paise
      const consultationFee = 50000;
      
      const settings = {
        feeBearer: 'DOCTOR',
        gatewayFeePercent: 2,
        gstOnFeePercent: 18,
        platformCommissionPercent: 0
      };

      const result = calculateFeeBreakdown(consultationFee, settings);

      // Patient pays exactly 50000
      expect(result.total).toBe(50000);
      expect(result.convenienceFee).toBe(0);
      expect(result.feeBearer).toBe('DOCTOR');

      // Estimated gateway fee = 2% of 50000 = 1000
      // Estimated GST = 18% of 1000 = 180
      // Estimated Transfer = 50000 - 1000 - 180 = 48820
      expect(result.estimatedGatewayFee).toBe(1000);
      expect(result.estimatedGatewayGst).toBe(180);
      expect(result.estimatedTransferToDoctor).toBe(48820);
    });

    it('deducts platform commission correctly for DOCTOR fee bearer', () => {
      const consultationFee = 50000;
      
      const settings = {
        feeBearer: 'DOCTOR',
        gatewayFeePercent: 2,
        gstOnFeePercent: 18,
        platformCommissionPercent: 10
      };

      const result = calculateFeeBreakdown(consultationFee, settings);

      // Commission = 10% of 50000 = 5000
      expect(result.platformCommission).toBe(5000);
      // Transfer = 48820 - 5000 = 43820
      expect(result.estimatedTransferToDoctor).toBe(43820);
    });
  });

  describe('Edge Cases', () => {
    it('throws error for negative consultation fee', () => {
      expect(() => {
        calculateFeeBreakdown(-1000);
      }).toThrow(ApiError);
      
      expect(() => {
        calculateFeeBreakdown(-1000);
      }).toThrow('Consultation fee cannot be negative');
    });

    it('defaults to PATIENT if settings are missing', () => {
      const result = calculateFeeBreakdown(10000, null);
      expect(result.feeBearer).toBe('PATIENT');
      expect(result.total).toBeGreaterThan(10000);
    });
    
    it('handles 0 fee correctly', () => {
      const result = calculateFeeBreakdown(0);
      expect(result.total).toBe(0);
      expect(result.transferToDoctor).toBe(0);
    });
  });
});
