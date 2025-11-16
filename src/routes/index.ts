import express from 'express';
import { projectController } from '../controllers/projectController';
import { endpointController } from '../controllers/endpointController';
import { aiController } from '../controllers/aiController';
import { zipController } from '../controllers/zipController';
import { performanceController } from '../controllers/performanceController';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';
import { proxyController } from '../controllers/proxyController';
import { testsController } from '../controllers/testsController';
import { documentationController } from '../controllers/documentationController';

const router = express.Router();

router.post('/auth/register', authController.register as any);
router.post('/auth/login', authController.login as any);

router.use(authMiddleware as any);

router.post('/proxy', proxyController.proxy as any);

router.post('/projects/:projectId/tests/run', testsController.runTests as any);

router.get('/projects/:id/endpoints-list', projectController.listEndpoints as any);

router.get('/projects', projectController.getProjects);
router.get('/projects/:id', projectController.getProject);
router.post('/projects', projectController.createProject);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);
router.delete('/projects/:id/test-cases/:caseId', projectController.deleteTestCase as any);

router.post('/projects/:projectId/endpoints', endpointController.addEndpoint);
router.put('/projects/:projectId/endpoints/:endpointId', endpointController.updateEndpoint);
router.delete('/projects/:projectId/endpoints/:endpointId', endpointController.deleteEndpoint);
router.post('/projects/:projectId/endpoints/:endpointId/test', endpointController.testEndpoint);
router.get('/projects/:projectId/endpoints/:endpointId/history', endpointController.getHistory as any);
router.post('/projects/:projectId/endpoints/:endpointId/history/:historyId/rerun', endpointController.rerunFromHistory as any);
router.get('/projects/:projectId/endpoints/:endpointId/insights', endpointController.getInsights as any);

router.post('/projects/:projectId/ai/generate-test-cases', aiController.generateTestCases as any);
router.post('/projects/:projectId/ai/generate-documentation', aiController.generateDocumentation as any);
router.post('/projects/:projectId/ai/analyze-system-design', aiController.analyzeSystemDesign as any);

router.post('/projects/:projectId/import-zip', zipController.uploadZip as any);

router.post('/projects/:projectId/endpoints/:endpointId/performance-test', performanceController.runPerformanceTest);
router.get('/projects/:projectId/performance-tests', performanceController.getTestHistory);

router.get('/projects/:id/export', projectController.exportProject as any);
router.post('/projects/:id/import', projectController.importProject as any);
router.put('/projects/:id/env-vars', projectController.updateEnvVars as any);

// Standalone documentation generation routes
router.post('/documentation/import-zip', documentationController.importFromZip as any);
router.post('/documentation/import-json', documentationController.importFromJson as any);
router.post('/documentation/import-json-raw', documentationController.importFromJsonRaw as any);
router.post('/documentation/generate', documentationController.generateFromEndpoints as any);
router.get('/documentation', documentationController.getPreviousDocumentation as any);
router.get('/documentation/:id', documentationController.getDocumentationById as any);
router.delete('/documentation/:id', documentationController.deleteDocumentation as any);

export default router;

