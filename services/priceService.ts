/**
 * Price Variation Service
 * Handles calculation of alternate quotation prices
 * Alt quotations = basePrice + random 3%–12%
 */

import { PriceVariation } from '@/types';

function getRandomVariation(): number {
  const minVariation = 0.03;
  const maxVariation = 0.12;
  return minVariation + Math.random() * (maxVariation - minVariation);
}

function generateVariations(basePrice: number): PriceVariation[] {
  const variations: PriceVariation[] = [
    {
      type: 'main',
      multiplier: 1.0,
      finalPrice: basePrice,
    },
    {
      type: 'alt_1',
      multiplier: 1 + getRandomVariation(),
      finalPrice: 0,
    },
    {
      type: 'alt_2',
      multiplier: 1 + getRandomVariation(),
      finalPrice: 0,
    },
  ];

  // Calculate final prices
  variations.forEach((v) => {
    v.finalPrice = Math.round(basePrice * v.multiplier * 100) / 100;
  });

  return variations;
}

function formatPrice(price: number, currency: string = '₹'): string {
  return `${currency} ${price.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calculateGST(price: number, gstRate: number = 18): number {
  return Math.round((price * gstRate) / 100 * 100) / 100;
}

function calculateTotal(price: number, gstRate: number = 18): number {
  const gst = calculateGST(price, gstRate);
  return price + gst;
}

export const priceService = {
  generateVariations,
  getRandomVariation,
  formatPrice,
  calculateGST,
  calculateTotal,
};
