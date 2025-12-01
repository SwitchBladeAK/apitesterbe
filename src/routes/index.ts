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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/register', authController.register as any);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/login', authController.login as any);

router.use(authMiddleware as any);

/**
 * @swagger
 * /proxy:
 *   post:
 *     summary: Proxy API request
 *     tags: [Proxy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - method
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://api.example.com/users
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, PATCH, DELETE]
 *                 example: GET
 *               headers:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *               body:
 *                 type: object
 *               queryParams:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: Proxy request successful
 *       400:
 *         description: Invalid request
 */
router.post('/proxy', proxyController.proxy as any);

/**
 * @swagger
 * /projects/{projectId}/tests/run:
 *   post:
 *     summary: Run test cases for a project
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Tests executed successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/tests/run', testsController.runTests as any);

/**
 * @swagger
 * /projects/{id}/endpoints-list:
 *   get:
 *     summary: List endpoints in a project with filtering
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for endpoint name or URL
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Filter by folder path
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, PATCH, DELETE]
 *         description: Filter by HTTP method
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiEndpoint'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/projects/:id/endpoints-list', projectController.listEndpoints as any);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects for the authenticated user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/projects', projectController.getProjects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', projectController.getProject);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My API Project
 *               description:
 *                 type: string
 *                 example: A project for testing APIs
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 */
router.post('/projects', projectController.createProject);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               endpoints:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ApiEndpoint'
 *               testCases:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TestCase'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.put('/projects/:id', projectController.updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Project not found
 */
router.delete('/projects/:id', projectController.deleteProject);

/**
 * @swagger
 * /projects/{id}/test-cases/{caseId}:
 *   delete:
 *     summary: Delete a test case from a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test case ID
 *     responses:
 *       200:
 *         description: Test case deleted successfully
 *       404:
 *         description: Project or test case not found
 */
router.delete('/projects/:id/test-cases/:caseId', projectController.deleteTestCase as any);

/**
 * @swagger
 * /projects/{projectId}/endpoints:
 *   post:
 *     summary: Add a new endpoint to a project
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiEndpoint'
 *     responses:
 *       201:
 *         description: Endpoint added successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/endpoints', endpointController.addEndpoint);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}:
 *   put:
 *     summary: Update an endpoint
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiEndpoint'
 *     responses:
 *       200:
 *         description: Endpoint updated successfully
 *       404:
 *         description: Project or endpoint not found
 */
router.put('/projects/:projectId/endpoints/:endpointId', endpointController.updateEndpoint);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}:
 *   delete:
 *     summary: Delete an endpoint
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     responses:
 *       200:
 *         description: Endpoint deleted successfully
 *       404:
 *         description: Project or endpoint not found
 */
router.delete('/projects/:projectId/endpoints/:endpointId', endpointController.deleteEndpoint);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}/test:
 *   post:
 *     summary: Test an endpoint
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               headers:
 *                 type: object
 *               body:
 *                 type: object
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Endpoint test executed successfully
 *       404:
 *         description: Project or endpoint not found
 */
router.post('/projects/:projectId/endpoints/:endpointId/test', endpointController.testEndpoint);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}/history:
 *   get:
 *     summary: Get endpoint test history
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     responses:
 *       200:
 *         description: Endpoint test history
 *       404:
 *         description: Project or endpoint not found
 */
router.get('/projects/:projectId/endpoints/:endpointId/history', endpointController.getHistory as any);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}/history/{historyId}/rerun:
 *   post:
 *     summary: Rerun a test from history
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: string
 *         description: History entry ID
 *     responses:
 *       200:
 *         description: Test rerun successfully
 *       404:
 *         description: Project, endpoint, or history entry not found
 */
router.post('/projects/:projectId/endpoints/:endpointId/history/:historyId/rerun', endpointController.rerunFromHistory as any);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}/insights:
 *   get:
 *     summary: Get endpoint insights
 *     tags: [Endpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     responses:
 *       200:
 *         description: Endpoint insights
 *       404:
 *         description: Project or endpoint not found
 */
router.get('/projects/:projectId/endpoints/:endpointId/insights', endpointController.getInsights as any);

/**
 * @swagger
 * /projects/{projectId}/ai/generate-test-cases:
 *   post:
 *     summary: Generate test cases using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpointIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of endpoint IDs to generate tests for
 *     responses:
 *       200:
 *         description: Test cases generated successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/ai/generate-test-cases', aiController.generateTestCases as any);

/**
 * @swagger
 * /projects/{projectId}/ai/generate-documentation:
 *   post:
 *     summary: Generate API documentation using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Documentation generated successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/ai/generate-documentation', aiController.generateDocumentation as any);

/**
 * @swagger
 * /projects/{projectId}/ai/analyze-system-design:
 *   post:
 *     summary: Analyze system design using AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: System design analyzed successfully
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/ai/analyze-system-design', aiController.analyzeSystemDesign as any);

/**
 * @swagger
 * /projects/{projectId}/import-zip:
 *   post:
 *     summary: Import endpoints from a ZIP file
 *     tags: [Import/Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ZIP file containing API endpoints
 *     responses:
 *       200:
 *         description: ZIP file imported successfully
 *       400:
 *         description: Invalid file format
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/import-zip', zipController.uploadZip as any);

/**
 * @swagger
 * /projects/{projectId}/endpoints/{endpointId}/performance-test:
 *   post:
 *     summary: Run a performance test on an endpoint
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requests:
 *                 type: integer
 *                 example: 100
 *                 description: Total number of requests
 *               concurrency:
 *                 type: integer
 *                 example: 10
 *                 description: Number of concurrent requests
 *               duration:
 *                 type: integer
 *                 example: 60
 *                 description: Test duration in seconds
 *     responses:
 *       200:
 *         description: Performance test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceTest'
 *       404:
 *         description: Project or endpoint not found
 */
router.post('/projects/:projectId/endpoints/:endpointId/performance-test', performanceController.runPerformanceTest);

/**
 * @swagger
 * /projects/{projectId}/performance-tests:
 *   get:
 *     summary: Get performance test history for a project
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Performance test history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PerformanceTest'
 *       404:
 *         description: Project not found
 */
router.get('/projects/:projectId/performance-tests', performanceController.getTestHistory);

/**
 * @swagger
 * /projects/{id}/export:
 *   get:
 *     summary: Export a project as JSON
 *     tags: [Import/Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id/export', projectController.exportProject as any);

/**
 * @swagger
 * /projects/{id}/import:
 *   post:
 *     summary: Import project data
 *     tags: [Import/Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 $ref: '#/components/schemas/Project'
 *               mode:
 *                 type: string
 *                 enum: [merge, replace]
 *                 default: merge
 *                 description: Import mode - merge or replace existing data
 *     responses:
 *       200:
 *         description: Project imported successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Project not found
 */
router.post('/projects/:id/import', projectController.importProject as any);

/**
 * @swagger
 * /projects/{id}/env-vars:
 *   put:
 *     summary: Update environment variables for a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - envVars
 *             properties:
 *               envVars:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   BASE_URL: https://api.example.com
 *                   API_KEY: your-api-key
 *     responses:
 *       200:
 *         description: Environment variables updated successfully
 *       404:
 *         description: Project not found
 */
router.put('/projects/:id/env-vars', projectController.updateEnvVars as any);

// Standalone documentation generation routes
/**
 * @swagger
 * /documentation/import-zip:
 *   post:
 *     summary: Import documentation from ZIP file
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ZIP file containing API documentation
 *     responses:
 *       200:
 *         description: Documentation imported successfully
 *       400:
 *         description: Invalid file format
 */
router.post('/documentation/import-zip', documentationController.importFromZip as any);

/**
 * @swagger
 * /documentation/import-json:
 *   post:
 *     summary: Import documentation from JSON file
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON file containing API documentation
 *     responses:
 *       200:
 *         description: Documentation imported successfully
 *       400:
 *         description: Invalid file format
 */
router.post('/documentation/import-json', documentationController.importFromJson as any);

/**
 * @swagger
 * /documentation/import-json-raw:
 *   post:
 *     summary: Import documentation from raw JSON data
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: Raw JSON data for documentation
 *     responses:
 *       200:
 *         description: Documentation imported successfully
 *       400:
 *         description: Invalid data format
 */
router.post('/documentation/import-json-raw', documentationController.importFromJsonRaw as any);

/**
 * @swagger
 * /documentation/generate:
 *   post:
 *     summary: Generate documentation from endpoints
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoints:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ApiEndpoint'
 *     responses:
 *       200:
 *         description: Documentation generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Documentation'
 */
router.post('/documentation/generate', documentationController.generateFromEndpoints as any);

/**
 * @swagger
 * /documentation:
 *   get:
 *     summary: Get previous documentation
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of previous documentation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Documentation'
 */
router.get('/documentation', documentationController.getPreviousDocumentation as any);

/**
 * @swagger
 * /documentation/{id}:
 *   get:
 *     summary: Get documentation by ID
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Documentation ID
 *     responses:
 *       200:
 *         description: Documentation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Documentation'
 *       404:
 *         description: Documentation not found
 */
router.get('/documentation/:id', documentationController.getDocumentationById as any);

/**
 * @swagger
 * /documentation/{id}:
 *   delete:
 *     summary: Delete documentation
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Documentation ID
 *     responses:
 *       200:
 *         description: Documentation deleted successfully
 *       404:
 *         description: Documentation not found
 */
router.delete('/documentation/:id', documentationController.deleteDocumentation as any);

export default router;

