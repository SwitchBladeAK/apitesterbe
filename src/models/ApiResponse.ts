import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * API Response Document Interface
 */
export interface IApiResponse extends Document {
  endpointId: string;
  projectId: Types.ObjectId;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  timestamp: Date;
  testRunId?: string;
}

/**
 * API Response Schema
 * Stores response data for analysis and comparison
 */
const apiResponseSchema: Schema<IApiResponse> = new Schema(
  {
    endpointId: {
      type: String,
      required: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    statusCode: {
      type: Number,
      required: true
    },
    headers: {
      type: Map,
      of: String
    },
    body: {
      type: Schema.Types.Mixed
    },
    responseTime: {
      type: Number,
      required: true // in milliseconds
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    testRunId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
apiResponseSchema.index({ projectId: 1, endpointId: 1, timestamp: -1 });

export const ApiResponse: Model<IApiResponse> = mongoose.model<IApiResponse>('ApiResponse', apiResponseSchema);

