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
    /** Reversed payments are kept (and keep their UTR) so the audit trail stays complete. */
    status: { type: String, enum: ['RECEIVED', 'REVERSED'], default: 'RECEIVED', required: true },
    reversal: {
      type: new Schema(
        { reason: { type: String, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, at: { type: Date, required: true } },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;
export const Payment = model('Payment', paymentSchema);
