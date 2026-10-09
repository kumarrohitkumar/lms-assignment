/** All money is persisted as integer paise; the API speaks rupees. */
export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export const toRupees = (paise: number): number => paise / 100;

export const hasAtMostTwoDecimals = (value: number): boolean =>
  Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
