import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuotaUsage extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  counts: {
    palm_reading: number;
    birth_chart: number;
    marriage_bichar: number;
    chatbot: number;
    horoscope_daily: number;
    horoscope_weekly: number;
    horoscope_monthly: number;
    horoscope_yearly: number;
    horoscope_custom: number;
  };
}

const QuotaSchema: Schema<IQuotaUsage> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    counts: {
      palm_reading: { type: Number, default: 0 },
      birth_chart: { type: Number, default: 0 },
      marriage_bichar: { type: Number, default: 0 },
      chatbot: { type: Number, default: 0 },
      horoscope_daily: { type: Number, default: 0 },
      horoscope_weekly: { type: Number, default: 0 },
      horoscope_monthly: { type: Number, default: 0 },
      horoscope_yearly: { type: Number, default: 0 },
      horoscope_custom: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

QuotaSchema.index({ userId: 1, date: 1 }, { unique: true });

const Quota: Model<IQuotaUsage> = mongoose.models.Quota || mongoose.model<IQuotaUsage>('Quota', QuotaSchema);

export default Quota;
