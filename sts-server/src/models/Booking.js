import mongoose from 'mongoose';

// Booking - reservation for one service or package (ODD 3.3.7)
const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, required: true, unique: true },
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true },
    itemType: { type: String, enum: ['service', 'package'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, required: true }, // Service or Package
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    totalCost: { type: Number, required: true, min: 0 }, // MYR
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
