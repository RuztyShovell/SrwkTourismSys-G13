import mongoose from 'mongoose';

// Tourist - visitor profile linked to an Account (ODD 3.3.1)
const touristSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    nationality: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Tourist', touristSchema);
