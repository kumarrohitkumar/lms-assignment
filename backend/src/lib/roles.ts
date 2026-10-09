export const Role = {
  ADMIN: 'ADMIN',
  SALES: 'SALES',
  SANCTION: 'SANCTION',
  DISBURSEMENT: 'DISBURSEMENT',
  COLLECTION: 'COLLECTION',
  BORROWER: 'BORROWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role);

export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.SALES, Role.SANCTION, Role.DISBURSEMENT, Role.COLLECTION];

/** Dashboard modules and who may use them. Admin has every module. */
export const MODULE_ROLES = {
  sales: [Role.SALES, Role.ADMIN],
  sanction: [Role.SANCTION, Role.ADMIN],
  disbursement: [Role.DISBURSEMENT, Role.ADMIN],
  collection: [Role.COLLECTION, Role.ADMIN],
} as const satisfies Record<string, Role[]>;
