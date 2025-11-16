import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  folderPath?: string;
  routePath?: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  queryParams?: Record<string, string>;
  description?: string;
  position?: { x: number; y: number };
  responseHistory?: Array<{
    id: string;
    createdAt: Date;
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      queryParams?: Record<string, string>;
      body?: any;
    };
    response: {
      statusCode: number;
      headers: Record<string, any>;
      body: any;
      responseTime: number;
    };
  }>;
}

export interface ITestCase {
  id: string;
  name: string;
  endpointId: string;
  testSteps: string[];
  expectedResults: string[];
  status: 'pass' | 'fail' | 'pending';
  createdAt: Date;
}

export interface IProject extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  endpoints: IApiEndpoint[];
  testCases: ITestCase[];
  envVars?: Record<string, string>;
  systemDesign?: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
    }>;
  };
  documentation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema: Schema<IProject> = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    endpoints: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      folderPath: { type: String, default: '' },
      routePath: { type: String, default: '' },
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        required: true
      },
      url: { type: String, required: true },
      headers: { type: Map, of: String },
      body: { type: Map, of: Schema.Types.Mixed },
      queryParams: { type: Map, of: String },
      description: String,
      position: {
        x: Number,
        y: Number
      },
      responseHistory: [{
        id: String,
        createdAt: { type: Date, default: Date.now },
        request: {
          url: String,
          method: String,
          headers: { type: Map, of: String },
          queryParams: { type: Map, of: String },
          body: Schema.Types.Mixed
        },
        response: {
          statusCode: Number,
          headers: Schema.Types.Mixed,
          body: Schema.Types.Mixed,
          responseTime: Number
        }
      }]
    }],
    testCases: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      endpointId: { type: String, required: true },
      testSteps: [String],
      expectedResults: [String],
      status: {
        type: String,
        enum: ['pass', 'fail', 'pending'],
        default: 'pending'
      },
      createdAt: { type: Date, default: Date.now }
    }],
    systemDesign: {
      nodes: [{
        id: String,
        type: String,
        position: { x: Number, y: Number },
        data: Schema.Types.Mixed
      }],
      edges: [{
        id: String,
        source: String,
        target: String,
        type: String
      }]
    },
    documentation: String
  },
  {
    timestamps: true
  }
);

projectSchema.index({ name: 1 });
projectSchema.index({ createdAt: -1 });

export const Project: Model<IProject> = mongoose.model<IProject>('Project', projectSchema);

