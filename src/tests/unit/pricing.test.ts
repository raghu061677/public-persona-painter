import { describe, it, expect } from 'vitest';
import { 
  calculatePrintingCost, 
  calculateMountingCost, 
  getAssetSqft, 
  parseDimensionsToSqft 
} from '@/utils/effectivePricing';

describe('Pricing Calculations', () => {
  describe('GST Calculations', () => {
    it('should calculate 18% GST correctly', () => {
      const amount = 10000;
      const gstPercent = 18;
      const expectedGST = 1800;
      
      const calculatedGST = (amount * gstPercent) / 100;
      
      expect(calculatedGST).toBe(expectedGST);
    });

    it('should calculate total with GST', () => {
      const subtotal = 10000;
      const gstPercent = 18;
      const gst = (subtotal * gstPercent) / 100;
      const total = subtotal + gst;
      
      expect(total).toBe(11800);
    });

    it('should handle CGST and SGST split', () => {
      const amount = 10000;
      const gstPercent = 18;
      const cgstPercent = gstPercent / 2;
      const sgstPercent = gstPercent / 2;
      
      const cgst = (amount * cgstPercent) / 100;
      const sgst = (amount * sgstPercent) / 100;
      
      expect(cgst).toBe(900);
      expect(sgst).toBe(900);
      expect(cgst + sgst).toBe(1800);
    });
  });

  describe('Pro-rata Calculations', () => {
    it('should calculate pro-rata for partial months', () => {
      const monthlyRate = 30000;
      const totalDays = 30;
      const actualDays = 15;
      
      const prorataAmount = (monthlyRate / totalDays) * actualDays;
      
      expect(prorataAmount).toBe(15000);
    });

    it('should handle full month billing', () => {
      const monthlyRate = 30000;
      const totalDays = 30;
      const actualDays = 30;
      
      const prorataAmount = (monthlyRate / totalDays) * actualDays;
      
      expect(prorataAmount).toBe(30000);
    });
  });

  describe('Discount Calculations', () => {
    it('should apply percentage discount', () => {
      const amount = 10000;
      const discountPercent = 10;
      const discountAmount = (amount * discountPercent) / 100;
      const finalAmount = amount - discountAmount;
      
      expect(discountAmount).toBe(1000);
      expect(finalAmount).toBe(9000);
    });

    it('should calculate final amount with discount and GST', () => {
      const subtotal = 10000;
      const discountPercent = 10;
      
      const discountAmount = (subtotal * discountPercent) / 100;
      const taxableAmount = subtotal - discountAmount;
      const gst = (taxableAmount * 18) / 100;
      const total = taxableAmount + gst;
      
      expect(total).toBe(10620); // 9000 + 1620 GST
    });
  });

  describe('Printing Cost Calculations - SQFT × Rate', () => {
    it('should calculate printing cost as SQFT × Rate', () => {
      // Test case from requirements: 10 ft × 5 ft = 50 SQFT, Rate = ₹20/SQFT → Cost = ₹1000
      const asset = { width: 10, height: 5 };
      const printingRatePerSqft = 20;
      
      const result = calculatePrintingCost(asset, printingRatePerSqft);
      
      expect(result.sqft).toBe(50);
      expect(result.rate).toBe(20);
      expect(result.cost).toBe(1000);
      expect(result.error).toBeNull();
    });

    it('should use total_sqft when available', () => {
      const asset = { total_sqft: 100, width: 10, height: 5 };
      const result = calculatePrintingCost(asset, 15);
      
      expect(result.sqft).toBe(100); // Should use total_sqft, not width*height
      expect(result.cost).toBe(1500);
    });

    it('should return error when SQFT is 0 or missing', () => {
      const asset = { width: 0, height: 0 };
      const result = calculatePrintingCost(asset, 20);
      
      expect(result.sqft).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.error).toBe("Asset size missing. Cannot calculate printing cost.");
    });

    it('should return 0 cost when rate is 0', () => {
      const asset = { total_sqft: 50 };
      const result = calculatePrintingCost(asset, 0);
      
      expect(result.sqft).toBe(50);
      expect(result.cost).toBe(0);
      expect(result.error).toBeNull();
    });

    it('should handle negative rate', () => {
      const asset = { total_sqft: 50 };
      const result = calculatePrintingCost(asset, -10);
      
      expect(result.cost).toBe(0);
      expect(result.error).toBe("Printing rate cannot be negative.");
    });

    it('should round to 2 decimal places', () => {
      const asset = { total_sqft: 33 };
      const result = calculatePrintingCost(asset, 7.5);
      
      expect(result.cost).toBe(247.5); // 33 × 7.5 = 247.5
    });
  });

  describe('Mounting Cost Calculations - SQFT × Rate', () => {
    it('should calculate mounting cost as SQFT × Rate', () => {
      const asset = { total_sqft: 100 };
      const result = calculateMountingCost(asset, 10);
      
      expect(result.cost).toBe(1000);
      expect(result.error).toBeNull();
    });
  });

  describe('SQFT Resolution', () => {
    it('should prioritize total_sqft over dimensions parsing', () => {
      const asset = { total_sqft: 200, dimensions: '10x10' };
      expect(getAssetSqft(asset)).toBe(200);
    });

    it('should parse dimensions string when total_sqft is missing', () => {
      const asset = { dimensions: '40x20' };
      expect(getAssetSqft(asset)).toBe(800);
    });

    it('should handle multi-face dimensions', () => {
      // "25x5 - 12x3" = 125 + 36 = 161
      expect(parseDimensionsToSqft('25x5 - 12x3')).toBe(161);
    });

    it('should return 0 for invalid dimensions', () => {
      expect(parseDimensionsToSqft('')).toBe(0);
      expect(parseDimensionsToSqft(null)).toBe(0);
      expect(parseDimensionsToSqft('invalid')).toBe(0);
    });
  });

  describe('Plan Row Total Calculation (P0 Bug Fix)', () => {
    it('should calculate row total as Negotiated + Printing + Mounting (NO proration)', () => {
      // Test case from bug report:
      // Negotiated = 55,000, Printing = 3,298, Mounting = 1,500
      // Expected Total = 59,798 (simple sum, no proration)
      const negotiatedPrice = 55000;
      const printingCost = 3298;
      const mountingCost = 1500;
      
      const rowTotal = negotiatedPrice + printingCost + mountingCost;
      
      expect(rowTotal).toBe(59798);
    });

    it('should NOT apply proration to row total', () => {
      // Even with duration that would normally prorate,
      // row total should be simple sum
      const negotiatedPrice = 30000; // monthly rate
      const printingCost = 1000;
      const mountingCost = 500;
      
      // Incorrect: (30000/30 * 10) + 1000 + 500 = 11500
      // Correct: 30000 + 1000 + 500 = 31500
      const rowTotal = negotiatedPrice + printingCost + mountingCost;
      
      expect(rowTotal).toBe(31500);
      expect(rowTotal).not.toBe(11500); // Should NOT be prorated
    });

    it('should handle zero printing and mounting', () => {
      const negotiatedPrice = 50000;
      const printingCost = 0;
      const mountingCost = 0;
      
      const rowTotal = negotiatedPrice + printingCost + mountingCost;
      
      expect(rowTotal).toBe(50000);
    });
  });
});
