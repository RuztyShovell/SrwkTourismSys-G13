import mongoose from 'mongoose';

// ServiceProvider - business/individual listing owner (ODD 3.3.3)
const serviceProviderSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('ServiceProvider', serviceProviderSchema);
