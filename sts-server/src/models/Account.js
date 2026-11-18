import mongoose from 'mongoose';

// Account - credentials, role and access status (ODD 3.3.2)
const accountSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['tourist', 'service_provider', 'staff', 'admin'], required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: 'Tourist' },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider' },
  },
  { timestamps: true }
);

export default mongoose.model('Account', accountSchema);
