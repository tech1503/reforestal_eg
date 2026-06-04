import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('de-DE', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(num);
}


export function formatCurrency(value) {
  const num = Number(value);
  if (isNaN(num)) return '€ 0,00';
  return '€ ' + new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}