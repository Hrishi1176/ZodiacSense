import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReading extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'palm_reading' | 'birth_chart' | 'marriage_bichar' | 'horoscope';
  inputData: Record<string, any>;
  result: string;
  metadata?: Record<string, any>;
  isAccurate?: boolean;
  createdAt: Date;
}

const ReadingSchema: Schema<IReading> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['palm_reading', 'birth_chart', 'marriage_bichar', 'horoscope'], required: true },
    inputData: { type: Schema.Types.Mixed, default: {} },
    result: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isAccurate: { type: Boolean, default: null },
  },
  { timestamps: true }
);

const Reading: Model<IReading> = mongoose.models.Reading || mongoose.model<IReading>('Reading', ReadingSchema);

export default Reading;
