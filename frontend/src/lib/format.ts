const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatINR = (value: number) => (Number.isInteger(value) ? inrWhole : inr).format(value);

export const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDays = (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`;

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const employmentLabel = { SALARIED: 'Salaried', SELF_EMPLOYED: 'Self-employed', UNEMPLOYED: 'Unemployed' } as const;
