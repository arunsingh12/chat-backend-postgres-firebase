import { format, isThisWeek, isToday, isYesterday } from 'date-fns';

export const formatMessageTime = (iso: string) => format(new Date(iso), 'HH:mm');

/** Compact timestamp for the chat list: 14:05 · Yesterday · Mon · 12 Mar */
export const formatListTime = (iso: string) => {
  const date = new Date(iso);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE');
  return format(date, 'd MMM');
};

export const formatDayDivider = (iso: string) => {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMMM yyyy');
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
