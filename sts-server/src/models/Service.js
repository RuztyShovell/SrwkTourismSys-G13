import mongoose from 'mongoose';

// Service - one class for all four types via `type` (Factory Method simplification, ODD 2.2/5.1.1)
const serviceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['accommodation', 'transportation', 'food', 'guided_tour'], required: true },
    price: { type: Number, required: true, min: 0 }, // MYR
    location: { type: String, trim: true },
    maxGuests: { type: Number, default: 10, min: 1 },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'inactive'], default: 'pending' },
    // Provider's own cancellation and refund rules (A10)
    cancellationPolicy: {
      freeCancelHours: { type: Number, default: 24 },
      refundPercent: { type: Number, default: 100, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Service', serviceSchema);
