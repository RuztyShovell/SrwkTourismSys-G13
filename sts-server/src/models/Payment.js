import mongoose from 'mongoose';

// Payment - single transaction result; never stores card/bank details (ODD 3.3.8, A11)
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true }, // MYR
    method: { type: String, enum: ['card', 'fpx', 'duitnow'], default: 'card' },
    type: { type: String, enum: ['payment', 'refund', 'extra_charge'], default: 'payment' },
    status: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
    transactionRef: { type: String }, // reference from the third-party provider
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
