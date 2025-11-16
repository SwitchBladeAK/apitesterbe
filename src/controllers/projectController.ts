import { Response } from 'express';
import { Project, IProject } from '../models/Project';
import { asyncHandler } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';

export class ProjectController {
  getProjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const projects = await Project.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: projects
    });
  });

  getProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  });

  createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description } = req.body;
    
    const project = new Project({
      ownerId: req.userId,
      name,
      description,
      endpoints: [],
      testCases: []
    });
    
    await project.save();
    
    res.status(201).json({
      success: true,
      data: project
    });
  });

  updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const project = await Project.findOneAndUpdate(
      { _id: id, ownerId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  });

  deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const project = await Project.findOneAndDelete({ _id: id, ownerId: req.userId });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  });

  listEndpoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { search = '', folder = '', method = '', page = '1', limit = '10' } = req.query as Record<string, string>;

    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let endpoints = project.endpoints || [];
    const s = (search || '').toLowerCase();

    if (s) {
      endpoints = endpoints.filter(ep =>
        (ep.name || '').toLowerCase().includes(s) ||
        (ep.url || '').toLowerCase().includes(s)
      );
    }
    if (folder) {
      const f = folder.trim();
      endpoints = endpoints.filter(ep => (ep.folderPath || '') === f);
    }
    if (method) {
      endpoints = endpoints.filter(ep => (ep.method || '').toUpperCase() === method.toUpperCase());
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const total = endpoints.length;
    const start = (pageNum - 1) * limitNum;
    const items = endpoints.slice(start, start + limitNum);

    res.json({
      success: true,
      data: {
        items,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  });

  deleteTestCase = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, caseId } = req.params as { id: string; caseId: string };

    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const before = project.testCases.length;
    project.testCases = project.testCases.filter((tc: any) => tc.id !== caseId);
    if (project.testCases.length === before) {
      return res.status(404).json({ success: false, message: 'Test case not found' });
    }

    await project.save();
    res.json({ success: true, message: 'Test case deleted' });
  });

  exportProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, data: project.toObject() });
  });

  importProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { data, mode } = req.body as { data: any; mode?: 'merge' | 'replace' };
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }
    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    if (mode === 'replace') {
      project.name = data.name ?? project.name;
      project.description = data.description ?? project.description;
      project.endpoints = Array.isArray(data.endpoints) ? data.endpoints : project.endpoints;
      project.testCases = Array.isArray(data.testCases) ? data.testCases : project.testCases;
      project.systemDesign = data.systemDesign ?? project.systemDesign;
      project.documentation = data.documentation ?? project.documentation;
      project.envVars = data.envVars ?? project.envVars;
    } else {
      // merge
      if (data.name) project.name = data.name;
      if (data.description) project.description = data.description;
      if (Array.isArray(data.endpoints)) {
        // concat new endpoints (naive merge by id uniqueness)
        const existingIds = new Set(project.endpoints.map(e => e.id));
        const toAdd = data.endpoints.filter((e: any) => e && e.id && !existingIds.has(e.id));
        project.endpoints.push(...toAdd);
      }
      if (Array.isArray(data.testCases)) {
        const existingIds = new Set(project.testCases.map(t => t.id));
        const toAdd = data.testCases.filter((t: any) => t && t.id && !existingIds.has(t.id));
        project.testCases.push(...toAdd);
      }
      if (data.systemDesign) {
        project.systemDesign = data.systemDesign;
      }
      if (data.documentation) {
        project.documentation = data.documentation;
      }
      if (data.envVars) {
        project.envVars = { ...(project.envVars || {}), ...data.envVars };
      }
    }
    await project.save();
    res.json({ success: true, data: project });
  });

  updateEnvVars = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { envVars } = req.body as { envVars: Record<string, string> };
    const project = await Project.findOne({ _id: id, ownerId: req.userId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    project.envVars = envVars || {};
    await project.save();
    res.json({ success: true, data: project.envVars });
  });
}

export const projectController = new ProjectController();

