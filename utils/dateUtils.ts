/**
 * Date formatting utility for local timezone ISO-like date strings (YYYY-MM-DD).
 * Avoids UTC timezone conversion bugs from toISOString().split('T')[0].
 */
export const getLocalDateString = (date?: Date): string => {
  const targetDate = date ?? new Date();
  if (isNaN(targetDate.getTime())) {
    return new Date().toLocaleDateString('sv-SE');
  }
  return targetDate.toLocaleDateString('sv-SE');
};
