import { describe, it, expect } from 'vitest';

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
});
