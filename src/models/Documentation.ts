import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDocumentation extends Document {
  userId: Types.ObjectId;
  title: string;
  documentation: string;
  endpoints: any[];
  fileStructure?: string;
  endpointCount: number;
  source: 'zip' | 'json' | 'endpoints';
  createdAt: Date;
  updatedAt: Date;
}

const documentationSchema: Schema<IDocumentation> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: {
      type: String,
      required: [true, 'Documentation title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    documentation: {
      type: String,
      required: true
    },
    endpoints: [{
      type: Schema.Types.Mixed
    }],
    fileStructure: {
      type: String
    },
    endpointCount: {
      type: Number,
      required: true,
      default: 0
    },
    source: {
      type: String,
      enum: ['zip', 'json', 'endpoints'],
      required: true
    }
  },
  {
    timestamps: true
  }
);

documentationSchema.index({ userId: 1, createdAt: -1 });
documentationSchema.index({ title: 1 });

export const Documentation: Model<IDocumentation> = mongoose.model<IDocumentation>('Documentation', documentationSchema);

