import { type InferSchemaType, model, Schema } from 'mongoose';
import { EMPLOYMENT_MODES } from '../lib/bre';

export const salarySlipSchema = new Schema(
  {
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const borrowerProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, uppercase: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    /** paise */
    monthlySalary: { type: Number, required: true, min: 0 },
    employmentMode: { type: String, enum: EMPLOYMENT_MODES, required: true },
    bre: {
      passed: { type: Boolean, required: true },
      failures: [{ _id: false, rule: String, message: String }],
      checkedAt: { type: Date, required: true },
    },
    salarySlip: { type: salarySlipSchema, default: null },
  },
  { timestamps: true },
);

export type BorrowerProfileDoc = InferSchemaType<typeof borrowerProfileSchema>;
export const BorrowerProfile = model('BorrowerProfile', borrowerProfileSchema);
