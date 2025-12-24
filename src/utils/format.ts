import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Format datetime to WIB (GMT+7)
 */
export function formatDateTimeWIB(date: Date | string): string {
  return dayjs(date).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm');
}
import { format, parse } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format number to Indonesian Rupiah currency
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Parse Rupiah string to number
 */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[^0-9-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Format date to DD-MM-YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd-MM-yyyy');
}

/**
 * Format date to full Indonesian format
 */
export function formatDateFull(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMMM yyyy', { locale: id });
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return format(d, 'dd-MM-yyyy HH:mm');
}

/**
 * Parse DD-MM-YYYY to Date
 */
export function parseDate(dateStr: string): Date {
  return parse(dateStr, 'dd-MM-yyyy', new Date());
}

/**
 * Format date for API (ISO string)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate transaction number
 */
export function generateTransactionNumber(prefix: string = 'TRX'): string {
  const date = new Date();
  const dateStr = format(date, 'yyyyMMdd');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}
