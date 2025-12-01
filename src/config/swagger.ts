import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Visual API Testing Platform API',
      version: '1.0.0',
      description: 'A comprehensive API for Visual API Testing Platform with AI-powered test generation, auto-documentation, and performance monitoring.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.API_URL,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            ownerId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'My API Project',
            },
            description: {
              type: 'string',
              example: 'A project for testing APIs',
            },
            endpoints: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ApiEndpoint',
              },
            },
            testCases: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TestCase',
              },
            },
            envVars: {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
              example: {
                BASE_URL: 'https://api.example.com',
                API_KEY: 'your-api-key',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ApiEndpoint: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'endpoint-1234567890-abc123',
            },
            name: {
              type: 'string',
              example: 'Get User Profile',
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              example: 'GET',
            },
            url: {
              type: 'string',
              example: 'https://api.example.com/users/123',
            },
            folderPath: {
              type: 'string',
              example: '/users',
            },
            routePath: {
              type: 'string',
              example: '/users/:id',
            },
            headers: {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
              example: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token',
              },
            },
            body: {
              type: 'object',
              example: {
                name: 'John Doe',
                email: 'john@example.com',
              },
            },
            queryParams: {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
              example: {
                page: '1',
                limit: '10',
              },
            },
            description: {
              type: 'string',
              example: 'Retrieves user profile information',
            },
            position: {
              type: 'object',
              properties: {
                x: {
                  type: 'number',
                  example: 100,
                },
                y: {
                  type: 'number',
                  example: 200,
                },
              },
            },
          },
        },
        TestCase: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'test-case-1234567890-abc123',
            },
            name: {
              type: 'string',
              example: 'Test User Creation',
            },
            endpointId: {
              type: 'string',
              example: 'endpoint-1234567890-abc123',
            },
            testSteps: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['Send POST request', 'Verify status code is 201', 'Verify response body'],
            },
            expectedResults: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['Status code should be 201', 'Response should contain user data'],
            },
            status: {
              type: 'string',
              enum: ['pass', 'fail', 'pending'],
              example: 'pending',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PerformanceTest: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            projectId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            endpointId: {
              type: 'string',
              example: 'endpoint-1234567890-abc123',
            },
            config: {
              type: 'object',
              properties: {
                requests: {
                  type: 'number',
                  example: 100,
                },
                concurrency: {
                  type: 'number',
                  example: 10,
                },
                duration: {
                  type: 'number',
                  example: 60,
                },
              },
            },
            results: {
              type: 'object',
              properties: {
                totalRequests: {
                  type: 'number',
                },
                successfulRequests: {
                  type: 'number',
                },
                failedRequests: {
                  type: 'number',
                },
                averageResponseTime: {
                  type: 'number',
                },
                minResponseTime: {
                  type: 'number',
                },
                maxResponseTime: {
                  type: 'number',
                },
                requestsPerSecond: {
                  type: 'number',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Documentation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            title: {
              type: 'string',
              example: 'API Documentation',
            },
            content: {
              type: 'string',
              example: 'Markdown formatted documentation content',
            },
            endpoints: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ApiEndpoint',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Projects',
        description: 'Project management endpoints',
      },
      {
        name: 'Endpoints',
        description: 'API endpoint management',
      },
      {
        name: 'AI',
        description: 'AI-powered features (test generation, documentation)',
      },
      {
        name: 'Tests',
        description: 'Test execution and management',
      },
      {
        name: 'Performance',
        description: 'Performance testing endpoints',
      },
      {
        name: 'Documentation',
        description: 'API documentation generation and management',
      },
      {
        name: 'Proxy',
        description: 'API proxy endpoints',
      },
      {
        name: 'Import/Export',
        description: 'Project import and export functionality',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

