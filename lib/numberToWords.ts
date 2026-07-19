/**
 * Converts a number to Indian Rupee words format (Lakhs, Thousands, Hundreds, etc.).
 * Example: 62658 -> "Sixty Two Thousand Six Hundred Fifty Eight only"
 */

const units = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  let str = '';

  if (num >= 100) {
    str += units[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }

  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }

  if (num > 0) {
    str += units[num] + ' ';
  }

  return str.trim();
}

export function numberToWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero only';

  const isNegative = num < 0;
  num = Math.abs(Math.round(num * 100) / 100);

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = '';

  if (rupees === 0) {
    result = 'Zero';
  } else {
    let tempRupees = rupees;

    // Crore (10,00,00,00)
    const crore = Math.floor(tempRupees / 10000000);
    tempRupees %= 10000000;

    // Lakh (1,00,000)
    const lakh = Math.floor(tempRupees / 100000);
    tempRupees %= 100000;

    // Thousand (1,000)
    const thousand = Math.floor(tempRupees / 1000);
    tempRupees %= 1000;

    const remaining = tempRupees;

    if (crore > 0) {
      result += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (remaining > 0) {
      result += convertLessThanThousand(remaining) + ' ';
    }
  }

  result = result.trim();

  if (paise > 0) {
    result += ` and ${convertLessThanThousand(paise)} Paise`;
  }

  result += ' only';

  return isNegative ? `Minus ${result}` : result;
}
