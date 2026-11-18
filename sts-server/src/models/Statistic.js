import mongoose from 'mongoose';

// Statistic - saved aggregated report generated for Admin (ODD 3.3.13)
const statisticSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dateFrom: { type: Date },
    dateTo: { type: Date },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  },
  { timestamps: true }
);

export default mongoose.model('Statistic', statisticSchema);
