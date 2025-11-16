import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Performance Test Document Interface
 */
export interface IPerformanceTest extends Document {
  projectId: Types.ObjectId;
  endpointId: string;
  testName: string;
  config: {
    concurrentUsers: number;
    duration: number; // in seconds
    rampUpTime: number; // in seconds
  };
  results: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    percentiles: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Performance Test Schema
 */
const performanceTestSchema: Schema<IPerformanceTest> = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    endpointId: {
      type: String,
      required: true
    },
    testName: {
      type: String,
      required: true
    },
    config: {
      concurrentUsers: { type: Number, required: true, min: 1 },
      duration: { type: Number, required: true, min: 1 },
      rampUpTime: { type: Number, default: 0 }
    },
    results: {
      totalRequests: { type: Number, default: 0 },
      successfulRequests: { type: Number, default: 0 },
      failedRequests: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
      minResponseTime: { type: Number, default: 0 },
      maxResponseTime: { type: Number, default: 0 },
      requestsPerSecond: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
      percentiles: {
        p50: Number,
        p95: Number,
        p99: Number
      }
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  },
  {
    timestamps: true
  }
);

performanceTestSchema.index({ projectId: 1, status: 1 });
performanceTestSchema.index({ startedAt: -1 });

export const PerformanceTest: Model<IPerformanceTest> = mongoose.model<IPerformanceTest>('PerformanceTest', performanceTestSchema);

