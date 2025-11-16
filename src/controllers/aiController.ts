import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { asyncHandler } from '../middlewares/errorHandler';
import { geminiService } from '../services/geminiService';
import { aiRateLimiter } from '../middlewares/rateLimiter';

export class AIController {
  generateTestCases = [aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { count } = (req.body || {}) as { count?: number };
    const desiredCount = Math.max(1, Math.min(20, Number.isFinite(count as any) ? (count as number) : 0));
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    if (project.endpoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No endpoints found in project'
      });
    }
    
    let testCases;
    try {
      testCases = await geminiService.generateTestCases(project.endpoints);
    } catch (e) {
      const base = project.endpoints.map((ep, index) => ({
        id: `test-${Date.now()}-${index}`,
        name: `Test ${ep.method} ${ep.name || ep.url}`,
        endpointId: ep.id,
        testSteps: [
          `Send ${ep.method} request to ${ep.url}`,
          'Validate response status is 2xx'
        ],
        expectedResults: [
          'Response status indicates success',
          'Response body is present'
        ],
        status: 'pending' as const,
        createdAt: new Date()
      }));

      if (desiredCount > 0) {
        const out: any[] = [];
        const now = Date.now();
        for (let i = 0; i < desiredCount; i++) {
          const ep = project.endpoints[i % project.endpoints.length];
          out.push({
            id: `test-${now}-${i}`,
            name: `Test ${ep.method} ${ep.name || ep.url} #${i + 1}`,
            endpointId: ep.id,
            testSteps: [
              `Send ${ep.method} request to ${ep.url}`,
              'Validate response status is 2xx'
            ],
            expectedResults: [
              'Response status indicates success',
              'Response body is present'
            ],
            status: 'pending' as const,
            createdAt: new Date()
          });
        }
        testCases = out;
      } else {
        testCases = base;
      }
    }
    
    project.testCases.push(...testCases);
    await project.save();
    
    res.json({
      success: true,
      data: testCases
    });
  })];

  generateDocumentation = [aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    if (project.endpoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No endpoints found in project'
      });
    }
    
    const documentation = await geminiService.generateDocumentation(project.endpoints);
    
    project.documentation = documentation;
    await project.save();
    
    res.json({
      success: true,
      data: { documentation }
    });
  })];

  analyzeSystemDesign = [aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { fileStructure } = req.body;
    
    if (!fileStructure) {
      return res.status(400).json({
        success: false,
        message: 'File structure is required'
      });
    }
    
    const systemDesign = await geminiService.analyzeSystemDesign(fileStructure);
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    project.systemDesign = systemDesign;
    await project.save();
    
    res.json({
      success: true,
      data: systemDesign
    });
  })];
}

export const aiController = new AIController();

