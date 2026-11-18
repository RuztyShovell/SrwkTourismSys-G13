import mongoose from 'mongoose';

// Review - feedback tied to a completed booking (ODD 3.3.11, A13)
const reviewSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    itemType: { type: String, enum: ['service', 'package'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

reviewSchema.index({ booking: 1 }, { unique: true }); // one review per booking

export default mongoose.model('Review', reviewSchema);
