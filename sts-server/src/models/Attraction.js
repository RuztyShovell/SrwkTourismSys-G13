import mongoose from 'mongoose';

// Attraction - Sarawak point of interest managed by Staff (ODD 3.3.6)
const attractionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    type: { type: String, enum: ['nature', 'culture', 'historical', 'event_venue', 'other'], default: 'other' },
    description: { type: String, trim: true },
    openingHours: { type: String, trim: true }, // e.g. "09:00-17:00"
    status: { type: String, enum: ['open', 'temporarily_unavailable', 'inactive'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.model('Attraction', attractionSchema);
