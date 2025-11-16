import { Response } from 'express';
import { Project } from '../models/Project';
import { asyncHandler } from '../middlewares/errorHandler';
import { performanceTestService } from '../services/performanceTestService';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Performance Controller
 * Follows Single Responsibility Principle - handles performance testing operations
 */
export class PerformanceController {
  /**
   * Run performance test
   */
  runPerformanceTest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId, endpointId } = req.params;
    const { concurrentUsers, duration, rampUpTime } = req.body;
    
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const endpoint = project.endpoints.find(ep => ep.id === endpointId);
    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    }
    
    const testResult = await performanceTestService.runPerformanceTest(
      endpoint,
      projectId,
      {
        concurrentUsers: concurrentUsers || 10,
        duration: duration || 60,
        rampUpTime: rampUpTime || 0
      }
    );
    
    res.json({
      success: true,
      data: testResult
    });
  });

  /**
   * Get performance test history
   */
  getTestHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    // Ensure the project belongs to user before showing history
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const tests = await performanceTestService.getTestHistory(projectId);
    
    res.json({
      success: true,
      data: tests
    });
  });
}

export const performanceController = new PerformanceController();

