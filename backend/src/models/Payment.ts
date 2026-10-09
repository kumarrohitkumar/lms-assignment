import { type InferSchemaType, model, Schema } from 'mongoose';

const paymentSchema = new Schema(
  {
    loan: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    /** Bank transfer reference; unique across all payments. Stored uppercase so duplicates can't differ by case. */
    utr: { type: String, required: true, unique: true, uppercase: true, trim: true },
    /** paise */
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const Payment = model('Payment', paymentSchema);
