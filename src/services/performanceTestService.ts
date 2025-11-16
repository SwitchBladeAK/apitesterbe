import axios, { AxiosResponse } from 'axios';
import mongoose from 'mongoose';
import { IApiEndpoint } from '../models/Project';
import { PerformanceTest, IPerformanceTest } from '../models/PerformanceTest';

/**
 * Performance Test Service
 * Follows Single Responsibility Principle - handles performance testing
 */
export class PerformanceTestService {
  /**
   * Run performance test for an endpoint
   */
  async runPerformanceTest(
    endpoint: IApiEndpoint,
    projectId: string,
    config: {
      concurrentUsers: number;
      duration: number;
      rampUpTime: number;
    }
  ): Promise<IPerformanceTest> {
    // Create performance test record
    const testRecord = new PerformanceTest({
      projectId: new mongoose.Types.ObjectId(projectId),
      endpointId: endpoint.id,
      testName: `Load Test: ${endpoint.method} ${endpoint.name}`,
      config,
      status: 'running',
      startedAt: new Date()
    });
    await testRecord.save();

    try {
      const results = await this.executeLoadTest(endpoint, config);
      
      testRecord.results = results;
      testRecord.status = 'completed';
      testRecord.completedAt = new Date();
      await testRecord.save();
      
      return testRecord;
    } catch (error) {
      testRecord.status = 'failed';
      testRecord.completedAt = new Date();
      await testRecord.save();
      throw error;
    }
  }

  /**
   * Execute load test
   * Uses concurrent requests to simulate load
   */
  private async executeLoadTest(
    endpoint: IApiEndpoint,
    config: { concurrentUsers: number; duration: number; rampUpTime: number }
  ): Promise<IPerformanceTest['results']> {
    const startTime = Date.now();
    const endTime = startTime + (config.duration * 1000);
    const responseTimes: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    const makeRequest = async (): Promise<void> => {
      while (Date.now() < endTime) {
        const requestStart = Date.now();
        try {
          await this.executeEndpointRequest(endpoint);
          const responseTime = Date.now() - requestStart;
          responseTimes.push(responseTime);
          totalRequests++;
          successfulRequests++;
        } catch (error) {
          totalRequests++;
          failedRequests++;
        }
        
        // Small delay to prevent overwhelming
        await this.sleep(100);
      }
    };

    // Create concurrent workers
    const workers = Array(config.concurrentUsers).fill(null).map(() => makeRequest());
    await Promise.all(workers);

    // Calculate statistics
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
    const minResponseTime = sortedResponseTimes[0] || 0;
    const maxResponseTime = sortedResponseTimes[sortedResponseTimes.length - 1] || 0;
    const requestsPerSecond = totalRequests / config.duration;
    const errorRate = (failedRequests / totalRequests) * 100 || 0;

    // Calculate percentiles
    const percentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate,
      percentiles: {
        p50: percentile(sortedResponseTimes, 50),
        p95: percentile(sortedResponseTimes, 95),
        p99: percentile(sortedResponseTimes, 99)
      }
    };
  }

  /**
   * Execute a single endpoint request
   */
  private async executeEndpointRequest(endpoint: IApiEndpoint): Promise<AxiosResponse> {
    const config: any = {
      method: endpoint.method,
      url: endpoint.url,
      headers: endpoint.headers || {},
    };

    if (endpoint.queryParams) {
      config.params = endpoint.queryParams;
    }

    if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
      config.data = endpoint.body;
    }

    return axios(config);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance test history
   */
  async getTestHistory(projectId: string): Promise<IPerformanceTest[]> {
    return PerformanceTest.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ startedAt: -1 })
      .limit(50)
      .exec();
  }
}

export const performanceTestService = new PerformanceTestService();

