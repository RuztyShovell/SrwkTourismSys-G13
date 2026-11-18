import mongoose from 'mongoose';

// Trip - saved plan with attractions, dates and preferences (ODD 3.3.12)
const tripSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist', required: true },
    title: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    preferences: { type: String, trim: true }, // e.g. "nature, budget"
    stops: [
      {
        attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true },
        visitDate: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Trip', tripSchema);
