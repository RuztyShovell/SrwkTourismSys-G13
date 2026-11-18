import mongoose from 'mongoose';

// Package - bundled services sold as a single unit; booked like a Service (Composite pattern, ODD 5.3.1)
const packageSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 }, // MYR
    includedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    maxGuests: { type: Number, default: 10, min: 1 },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'inactive'], default: 'pending' },
    cancellationPolicy: {
      freeCancelHours: { type: Number, default: 24 },
      refundPercent: { type: Number, default: 100, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Package', packageSchema);
