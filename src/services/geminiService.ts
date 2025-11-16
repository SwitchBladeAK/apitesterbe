import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { IApiEndpoint, ITestCase } from '../models/Project';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private model: any;
  private useHuggingFace: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.useHuggingFace = !apiKey;
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } else {
      this.genAI = null;
      this.model = null;
    }
  }

  private async callFreeAI(prompt: string): Promise<string> {
    const model = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
    
    const urls = [
      `https://router.huggingface.co/hf-inference/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`
    ];
    
    for (const url of urls) {
      try {
        const headers: any = {
          'Content-Type': 'application/json',
        };

        const response = await axios.post(
          url,
          {
            inputs: prompt,
            parameters: {
              max_new_tokens: 2048,
              temperature: 0.7,
              return_full_text: false,
            },
          },
          {
            headers,
            timeout: 60000,
          }
        );

        if (response.data?.error) {
          if (response.data.error.includes('loading')) {
            throw new Error('Model is loading, please try again in a few moments');
          }
          throw new Error(response.data.error);
        }

        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0].generated_text || response.data[0].text || '';
        }
        
        if (typeof response.data === 'string') {
          return response.data;
        }
        
        if (response.data.generated_text) {
          return response.data.generated_text;
        }

        throw new Error('Unexpected response format from AI API');
      } catch (error: any) {
        if (error.response?.status === 410) {
          continue;
        }
        if (error.response?.status === 503) {
          throw new Error('Model is loading, please try again in a few moments');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded, please try again later');
        }
        if (urls.indexOf(url) === urls.length - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('All AI services failed. Please try again later.');
  }


  async generateTestCases(endpoints: IApiEndpoint[]): Promise<ITestCase[]> {
    try {
      const prompt = this.buildTestGenerationPrompt(endpoints);
      let text: string;
      
      if (this.useHuggingFace || !this.model) {
        text = await this.callFreeAI(prompt);
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      } else {
        text = await this.callFreeAI(prompt);
      }
      
      return this.parseTestCasesFromResponse(text, endpoints);
    } catch (error: any) {
      console.error('Error generating test cases:', error);
      if (error.response?.status === 503) {
        throw new Error('Model is loading, please try again in a few moments');
      }
      throw new Error(`Failed to generate test cases: ${error.message || 'Unknown error'}`);
    }
  }

  async generateDocumentation(endpoints: IApiEndpoint[]): Promise<string> {
    try {
      const prompt = this.buildDocumentationPrompt(endpoints);
      let text: string;
      
      if (this.useHuggingFace || !this.model) {
        text = await this.callFreeAI(prompt);
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      } else {
        text = await this.callFreeAI(prompt);
      }
      
      return text;
    } catch (error: any) {
      console.error('Error generating documentation:', error);
      if (error.response?.status === 503) {
        throw new Error('Model is loading, please try again in a few moments');
      }
      throw new Error(`Failed to generate documentation: ${error.message || 'Unknown error'}`);
    }
  }

  private generateTemplateDocumentation(
    endpoints: IApiEndpoint[],
    folderStructure?: string
  ): string {
    const groupedByFolder: Record<string, IApiEndpoint[]> = {};
    
    endpoints.forEach(endpoint => {
      const folder = endpoint.folderPath || 'General';
      if (!groupedByFolder[folder]) {
        groupedByFolder[folder] = [];
      }
      groupedByFolder[folder].push(endpoint);
    });

    const getMethodColor = (method: string): string => {
      const colors: Record<string, string> = {
        GET: '🟢',
        POST: '🔵',
        PUT: '🟡',
        DELETE: '🔴',
        PATCH: '🟣'
      };
      return colors[method] || '⚪';
    };

    let doc = `# API Documentation\n\n`;
    doc += `> **Generated:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    doc += `> **Version:** 1.0.0\n`;
    doc += `> **Total Endpoints:** ${endpoints.length}\n\n`;
    doc += `---\n\n`;

    doc += `## 📋 Table of Contents\n\n`;
    doc += `1. [Overview](#overview)\n`;
    doc += `2. [Getting Started](#getting-started)\n`;
    Object.keys(groupedByFolder).forEach((folder, index) => {
      const anchor = folder.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      doc += `${index + 3}. [${folder}](#${anchor})\n`;
    });
    doc += `${Object.keys(groupedByFolder).length + 3}. [Error Handling](#error-handling)\n`;
    doc += `${Object.keys(groupedByFolder).length + 4}. [Best Practices](#best-practices)\n\n`;
    doc += `---\n\n`;

    doc += `## 📖 Overview\n\n`;
    doc += `> **Note:** This API provides comprehensive functionality for managing resources through RESTful endpoints.\n\n`;
    doc += `This API provides **${endpoints.length} endpoints** organized into **${Object.keys(groupedByFolder).length} main categories**.\n\n`;
    
    if (folderStructure) {
      doc += `### 📁 Project Structure\n\n`;
      doc += `\`\`\`\n${folderStructure}\n\`\`\`\n\n`;
    }

    doc += `## 🚀 Getting Started\n\n`;
    doc += `### Base URL\n\n`;
    doc += `\`\`\`\n{{base_url}}\n\`\`\`\n\n`;
    
    doc += `### Authentication\n\n`;
    doc += `> **Important:** Most endpoints require authentication. Include your JWT token in the Authorization header.\n\n`;
    doc += `\`\`\`http\nAuthorization: Bearer <your_token>\n\`\`\`\n\n`;
    doc += `**Example Request:**\n\n`;
    doc += `\`\`\`bash\ncurl -H "Authorization: Bearer YOUR_TOKEN" \\\n  "{{base_url}}/api/endpoint"\n\`\`\`\n\n`;

    doc += `### Common Headers\n\n`;
    doc += `| Header | Value | Required |\n`;
    doc += `|--------|-------|----------|\n`;
    doc += `| \`Content-Type\` | \`application/json\` | Yes |\n`;
    doc += `| \`Authorization\` | \`Bearer <token>\` | Yes (for protected endpoints) |\n\n`;

    doc += `### Rate Limiting\n\n`;
    doc += `> **Rate Limit:** API requests are rate-limited to ensure fair usage. Contact support for higher limits.\n\n`;

    doc += `---\n\n`;

    Object.keys(groupedByFolder).forEach((folder, folderIndex) => {
      const folderAnchor = folder.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      doc += `## ${folderIndex + 1}. ${folder}\n\n`;
      
      if (groupedByFolder[folder].length > 0) {
        doc += `> **Category:** ${folder}\n`;
        doc += `> **Endpoints:** ${groupedByFolder[folder].length}\n\n`;
      }
      
      groupedByFolder[folder].forEach((endpoint, index) => {
        const methodIcon = getMethodColor(endpoint.method);
        doc += `### ${index + 1}.${index + 1} ${methodIcon} \`${endpoint.method}\` \`${endpoint.url}\`\n\n`;
        
        if (endpoint.description) {
          doc += `**Description:**\n`;
          doc += `> ${endpoint.description}\n\n`;
        }

        doc += `**Request:**\n\n`;
        doc += `\`\`\`http\n${endpoint.method} /${endpoint.url}\nHost: {{base_url}}\nContent-Type: application/json\nAuthorization: Bearer <token>\n\`\`\`\n\n`;

        if (Object.keys(endpoint.headers || {}).length > 0) {
          doc += `#### Headers\n\n`;
          doc += `| Header | Value | Description |\n`;
          doc += `|--------|-------|-------------|\n`;
          Object.entries(endpoint.headers || {}).forEach(([key, value]) => {
            doc += `| \`${key}\` | \`${value}\` | - |\n`;
          });
          doc += `\n`;
        }

        if (Object.keys(endpoint.queryParams || {}).length > 0) {
          doc += `#### Query Parameters\n\n`;
          doc += `| Parameter | Type | Required | Description |\n`;
          doc += `|-----------|------|----------|-------------|\n`;
          Object.entries(endpoint.queryParams || {}).forEach(([key, value]) => {
            const valType = typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : 'any';
            doc += `| \`${key}\` | ${valType} | No | - |\n`;
          });
          doc += `\n`;
        }

        if (Object.keys(endpoint.body || {}).length > 0) {
          doc += `#### Request Body\n\n`;
          doc += `\`\`\`json\n${JSON.stringify(endpoint.body, null, 2)}\n\`\`\`\n\n`;
        }

        doc += `#### Example Request\n\n`;
        doc += `**cURL:**\n\n`;
        doc += `\`\`\`bash\ncurl -X ${endpoint.method} \\\n`;
        doc += `  "{{base_url}}/${endpoint.url}" \\\n`;
        if (Object.keys(endpoint.headers || {}).length > 0) {
          Object.entries(endpoint.headers || {}).forEach(([key, value]) => {
            doc += `  -H "${key}: ${value}" \\\n`;
          });
        }
        doc += `  -H "Content-Type: application/json" \\\n`;
        doc += `  -H "Authorization: Bearer YOUR_TOKEN"`;
        if (Object.keys(endpoint.body || {}).length > 0) {
          doc += ` \\\n  -d '${JSON.stringify(endpoint.body)}'`;
        }
        doc += `\n\`\`\`\n\n`;

        doc += `**JavaScript (Fetch):**\n\n`;
        doc += `\`\`\`javascript\nfetch('{{base_url}}/${endpoint.url}', {\n`;
        doc += `  method: '${endpoint.method}',\n`;
        doc += `  headers: {\n`;
        doc += `    'Content-Type': 'application/json',\n`;
        if (Object.keys(endpoint.headers || {}).length > 0) {
          Object.entries(endpoint.headers || {}).forEach(([key, value]) => {
            doc += `    '${key}': '${value}',\n`;
          });
        }
        doc += `    'Authorization': 'Bearer YOUR_TOKEN'\n`;
        doc += `  }`;
        if (Object.keys(endpoint.body || {}).length > 0) {
          doc += `,\n  body: JSON.stringify(${JSON.stringify(endpoint.body, null, 2)})`;
        }
        doc += `\n})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));\n\`\`\`\n\n`;

        doc += `**Python (Requests):**\n\n`;
        doc += `\`\`\`python\nimport requests\n\n`;
        doc += `url = "{{base_url}}/${endpoint.url}"\n`;
        doc += `headers = {\n`;
        doc += `    "Content-Type": "application/json",\n`;
        if (Object.keys(endpoint.headers || {}).length > 0) {
          Object.entries(endpoint.headers || {}).forEach(([key, value]) => {
            doc += `    "${key}": "${value}",\n`;
          });
        }
        doc += `    "Authorization": "Bearer YOUR_TOKEN"\n`;
        doc += `}\n`;
        if (Object.keys(endpoint.body || {}).length > 0) {
          doc += `data = ${JSON.stringify(endpoint.body, null, 2)}\n\n`;
          doc += `response = requests.${endpoint.method.toLowerCase()}(url, headers=headers, json=data)\n`;
        } else {
          doc += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)\n`;
        }
        doc += `print(response.json())\n\`\`\`\n\n`;

        doc += `#### Response\n\n`;
        doc += `**Success Response (200 OK):**\n\n`;
        doc += `\`\`\`json\n{\n  "status": "success",\n  "data": {},\n  "message": "Operation completed successfully"\n}\n\`\`\`\n\n`;

        doc += `**Status Codes:**\n\n`;
        doc += `| Code | Description |\n`;
        doc += `|------|-------------|\n`;
        doc += `| \`200\` | Success |\n`;
        doc += `| \`400\` | Bad Request |\n`;
        doc += `| \`401\` | Unauthorized |\n`;
        doc += `| \`404\` | Not Found |\n`;
        doc += `| \`500\` | Internal Server Error |\n\n`;

        doc += `**Error Response (400 Bad Request):**\n\n`;
        doc += `\`\`\`json\n{\n  "status": "error",\n  "message": "Invalid request parameters",\n  "errors": []\n}\n\`\`\`\n\n`;

        if (index < groupedByFolder[folder].length - 1) {
          doc += `---\n\n`;
        }
      });
      
      doc += `\n`;
    });

    doc += `## ⚠️ Error Handling\n\n`;
    doc += `The API uses standard HTTP status codes to indicate the result of API requests:\n\n`;
    doc += `| Status Code | Meaning | Description |\n`;
    doc += `|-------------|---------|-------------|\n`;
    doc += `| \`200\` | OK | Request succeeded |\n`;
    doc += `| \`201\` | Created | Resource created successfully |\n`;
    doc += `| \`400\` | Bad Request | Invalid request parameters |\n`;
    doc += `| \`401\` | Unauthorized | Authentication required or failed |\n`;
    doc += `| \`403\` | Forbidden | Insufficient permissions |\n`;
    doc += `| \`404\` | Not Found | Resource not found |\n`;
    doc += `| \`422\` | Unprocessable Entity | Validation error |\n`;
    doc += `| \`500\` | Internal Server Error | Server error occurred |\n\n`;

    doc += `### Error Response Format\n\n`;
    doc += `All error responses follow this structure:\n\n`;
    doc += `\`\`\`json\n{\n  "status": "error",\n  "message": "Error description",\n  "code": "ERROR_CODE",\n  "errors": [\n    {\n      "field": "fieldName",\n      "message": "Field-specific error message"\n    }\n  ]\n}\n\`\`\`\n\n`;

    doc += `### Common Error Scenarios\n\n`;
    doc += `> **Example:** When authentication fails...\n\n`;
    doc += `\`\`\`json\n{\n  "status": "error",\n  "message": "Invalid or expired token",\n  "code": "AUTH_ERROR"\n}\n\`\`\`\n\n`;

    doc += `---\n\n`;

    doc += `## 💡 Best Practices\n\n`;
    doc += `### Usage Guidelines\n\n`;
    doc += `> **Tip:** Always include proper error handling in your implementation.\n\n`;
    doc += `1. **Authentication:** Always include valid tokens in requests\n`;
    doc += `2. **Rate Limiting:** Respect rate limits and implement exponential backoff\n`;
    doc += `3. **Error Handling:** Implement comprehensive error handling\n`;
    doc += `4. **Validation:** Validate data before sending requests\n\n`;

    doc += `### Security Considerations\n\n`;
    doc += `- Use HTTPS for all requests\n`;
    doc += `- Never expose API keys in client-side code\n`;
    doc += `- Implement proper authentication\n`;
    doc += `- Validate and sanitize all inputs\n\n`;

    doc += `### Performance Tips\n\n`;
    doc += `- Use pagination for large datasets\n`;
    doc += `- Cache responses when appropriate\n`;
    doc += `- Minimize request payload size\n`;
    doc += `- Implement request retry logic with exponential backoff\n\n`;

    doc += `---\n\n`;

    doc += `## 📝 Notes\n\n`;
    doc += `- All timestamps are in ISO 8601 format\n`;
    doc += `- All dates are in UTC timezone\n`;
    doc += `- Rate limiting may apply to certain endpoints\n`;
    doc += `- Pagination is available for list endpoints\n`;
    doc += `- API versioning is handled through headers\n\n`;

    doc += `---\n\n`;
    doc += `*Documentation generated automatically on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n`;

    return doc;
  }

  async generateProfessionalDocumentation(
    endpoints: IApiEndpoint[],
    folderStructure?: string
  ): Promise<string> {
    try {
      if (!endpoints || endpoints.length === 0) {
        throw new Error('No endpoints provided for documentation generation');
      }

      const prompt = this.buildProfessionalDocumentationPrompt(endpoints, folderStructure);
      
      if (prompt.length > 30000) {
        console.warn('Prompt is very long, may cause issues. Length:', prompt.length);
      }

      try {
        const text = await this.callFreeAI(prompt);
        
        if (!text || text.trim().length === 0) {
          throw new Error('AI returned empty response');
        }
        
        return text;
      } catch (aiError: any) {
        console.warn('AI generation failed, using template fallback:', aiError.message);
        return this.generateTemplateDocumentation(endpoints, folderStructure);
      }
    } catch (error: any) {
      console.error('Error generating professional documentation:', error);
      
      if (error.message?.includes('No endpoints')) {
        throw error;
      }
      
      return this.generateTemplateDocumentation(endpoints, folderStructure);
    }
  }

  async analyzeSystemDesign(fileStructure: string): Promise<{
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, any> }>;
    edges: Array<{ id: string; source: string; target: string; type?: string }>;
  }> {
    try {
      const prompt = this.buildSystemDesignPrompt(fileStructure);
      let text: string;
      
      if (this.useHuggingFace || !this.model) {
        text = await this.callFreeAI(prompt);
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      } else {
        text = await this.callFreeAI(prompt);
      }
      
      return this.parseSystemDesignFromResponse(text);
    } catch (error: any) {
      console.error('Error analyzing system design:', error);
      if (error.response?.status === 503) {
        throw new Error('Model is loading, please try again in a few moments');
      }
      throw new Error(`Failed to analyze system design: ${error.message || 'Unknown error'}`);
    }
  }

  private buildTestGenerationPrompt(endpoints: IApiEndpoint[]): string {
    const endpointsJson = JSON.stringify(endpoints, null, 2);
    
    return `You are an expert QA engineer. Generate comprehensive test cases for the following API endpoints.

API Endpoints:
${endpointsJson}

Generate test cases in the following JSON format:
{
  "testCases": [
    {
      "name": "Test case name",
      "endpointId": "endpoint-id",
      "testSteps": ["step1", "step2"],
      "expectedResults": ["result1", "result2"]
    }
  ]
}

Consider:
- Happy path scenarios
- Edge cases
- Error handling
- Boundary conditions
- Security considerations

Return ONLY valid JSON, no markdown formatting.`;
  }

  private buildDocumentationPrompt(endpoints: IApiEndpoint[]): string {
    const endpointsJson = JSON.stringify(endpoints, null, 2);
    
    return `Generate comprehensive API documentation in Markdown format for the following endpoints:

${endpointsJson}

Include:
1. Overview
2. Authentication (if applicable)
3. Base URL
4. Endpoints with:
   - Method and path
   - Description
   - Request parameters
   - Request body schema
   - Response schema
   - Example requests/responses
   - Error codes

Format as clean, professional Markdown.`;
  }

  private buildProfessionalDocumentationPrompt(
    endpoints: IApiEndpoint[],
    folderStructure?: string
  ): string {
    const maxEndpoints = 50;
    const endpointsToUse = endpoints.slice(0, maxEndpoints);
    
    if (endpoints.length > maxEndpoints) {
      console.warn(`Too many endpoints (${endpoints.length}), using first ${maxEndpoints} for documentation`);
    }

    const endpointsJson = JSON.stringify(endpointsToUse, null, 2);
    const structureInfo = folderStructure 
      ? `\n\nProject Folder Structure:\n${folderStructure}\n`
      : '';
    
    const endpointCount = endpoints.length > maxEndpoints 
      ? `${endpointsToUse.length} of ${endpoints.length} endpoints`
      : `${endpoints.length} endpoints`;
    
    return `Generate comprehensive, professional API documentation in Markdown format with EXCELLENT structure and formatting.

${structureInfo}

API Endpoints (${endpointCount}):
${endpointsJson}

CRITICAL: Use proper Markdown formatting throughout. Follow this EXACT structure:

# API Documentation

> **Generated:** [Date]
> **Version:** 1.0.0
> **Total Endpoints:** ${endpointCount}

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## 📖 Overview

> **Note:** Brief introduction about the API, its purpose, and key features.

- **Base URL:** \`{{base_url}}\`
- **API Version:** 1.0.0
- **Authentication:** [Describe authentication method]

${folderStructure ? `### Project Structure\n\n\`\`\`\n${folderStructure}\n\`\`\`\n\n` : ''}

---

## 🚀 Getting Started

### Base URL

\`\`\`
{{base_url}}
\`\`\`

### Authentication

> **Important:** Most endpoints require authentication.

\`\`\`http
Authorization: Bearer <your_token>
\`\`\`

### Rate Limiting

> **Rate Limit:** [Specify if applicable]

### Common Headers

| Header | Value | Required |
|--------|-------|----------|
| \`Content-Type\` | \`application/json\` | Yes |
| \`Authorization\` | \`Bearer <token>\` | Yes |

---

## 📡 API Endpoints

${folderStructure ? 'Organize endpoints by folder structure. For each folder:' : 'For each endpoint:'}

### [Folder Name] (if applicable)

#### \`METHOD\` \`/endpoint/path\`

**Description:**
> [Detailed description of what this endpoint does]

**Request:**

\`\`\`http
METHOD /endpoint/path
Host: {{base_url}}
Content-Type: application/json
Authorization: Bearer <token>
\`\`\`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`param\` | string | No | Parameter description |

**Request Body:**

\`\`\`json
{
  "field": "value",
  "example": "data"
}
\`\`\`

**cURL Example:**

\`\`\`bash
curl -X METHOD \\
  "{{base_url}}/endpoint/path" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"field": "value"}'
\`\`\`

**JavaScript Example:**

\`\`\`javascript
fetch('{{base_url}}/endpoint/path', {
  method: 'METHOD',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    field: 'value'
  })
})
  .then(response => response.json())
  .then(data => console.log(data));
\`\`\`

**Python Example:**

\`\`\`python
import requests

url = "{{base_url}}/endpoint/path"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN"
}
data = {
    "field": "value"
}

response = requests.METHOD(url, headers=headers, json=data)
print(response.json())
\`\`\`

**Response:**

\`\`\`json
{
  "status": "success",
  "data": {},
  "message": "Operation completed"
}
\`\`\`

**Status Codes:**

| Code | Description |
|------|-------------|
| \`200\` | Success |
| \`400\` | Bad Request |
| \`401\` | Unauthorized |
| \`404\` | Not Found |

---

## 📊 Data Models

### Model Name

\`\`\`typescript
interface ModelName {
  field: string;
  example: number;
  optional?: boolean;
}
\`\`\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`field\` | string | Yes | Field description |
| \`example\` | number | Yes | Example description |
| \`optional\` | boolean | No | Optional field |

---

## ⚠️ Error Handling

### Error Response Format

\`\`\`json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
\`\`\`

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| \`200\` | OK | Request succeeded |
| \`201\` | Created | Resource created |
| \`400\` | Bad Request | Invalid request |
| \`401\` | Unauthorized | Authentication required |
| \`403\` | Forbidden | Insufficient permissions |
| \`404\` | Not Found | Resource not found |
| \`422\` | Unprocessable Entity | Validation error |
| \`500\` | Internal Server Error | Server error |

### Common Error Scenarios

> **Example:** When authentication fails...

\`\`\`json
{
  "status": "error",
  "message": "Invalid or expired token",
  "code": "AUTH_ERROR"
}
\`\`\`

---

## 💡 Best Practices

### Usage Guidelines

> **Tip:** Always include proper error handling in your implementation.

1. **Authentication:** Always include valid tokens
2. **Rate Limiting:** Respect rate limits
3. **Error Handling:** Implement proper error handling

### Security Considerations

- Use HTTPS for all requests
- Never expose API keys in client-side code
- Implement proper authentication

### Performance Tips

- Use pagination for large datasets
- Cache responses when appropriate
- Minimize request payload size

---

**FORMATTING REQUIREMENTS:**

1. Use \`#\` for main title (H1)
2. Use \`##\` for major sections (H2)
3. Use \`###\` for subsections (H3)
4. Use \`####\` for endpoint details (H4)
5. Use \`>\` for blockquotes and important notes
6. Use \`\`\`language\`\`\` for ALL code blocks with proper language tags (json, bash, javascript, python, http, typescript)
7. Use tables with proper alignment for parameters, status codes, etc.
8. Use \`backticks\` for inline code
9. Use \`---\` for horizontal rules between major sections
10. Use numbered lists (1., 2., 3.) and bullet lists (-, *, •)
11. Use **bold** for emphasis and *italic* for subtle emphasis
12. Include emojis in section headers for visual appeal (📋, 📖, 🚀, 📡, 📊, ⚠️, 💡)
13. Use proper spacing and line breaks for readability
14. Organize endpoints by folder structure if provided
15. Include comprehensive examples in multiple languages

Make it production-ready, professional, and well-structured!`;
  }

  private buildSystemDesignPrompt(fileStructure: string): string {
    return `Analyze the following API project file structure and generate a system design visualization:

${fileStructure}

Generate a JSON structure with nodes and edges representing:
- API endpoints as nodes
- Data flow as edges
- Service dependencies

Return JSON in this format:
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "endpoint" | "service" | "database",
      "position": {"x": 0, "y": 0},
      "data": {"label": "Node Name", "description": "..."}
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "type": "dataflow"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;
  }

  private parseTestCasesFromResponse(text: string, endpoints: IApiEndpoint[]): ITestCase[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const testCases: ITestCase[] = parsed.testCases.map((tc: any, index: number) => ({
        id: `test-${Date.now()}-${index}`,
        name: tc.name,
        endpointId: tc.endpointId,
        testSteps: tc.testSteps || [],
        expectedResults: tc.expectedResults || [],
        status: 'pending' as const,
        createdAt: new Date()
      }));
      
      return testCases;
    } catch (error) {
      console.error('Error parsing test cases:', error);
      return endpoints.map((endpoint, index) => ({
        id: `test-${Date.now()}-${index}`,
        name: `Test ${endpoint.method} ${endpoint.name}`,
        endpointId: endpoint.id,
        testSteps: [`Send ${endpoint.method} request to ${endpoint.url}`],
        expectedResults: ['Receive valid response'],
        status: 'pending' as const,
        createdAt: new Date()
      }));
    }
  }

  private parseSystemDesignFromResponse(text: string): {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, any> }>;
    edges: Array<{ id: string; source: string; target: string; type?: string }>;
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        nodes: parsed.nodes || [],
        edges: parsed.edges || []
      };
    } catch (error) {
      console.error('Error parsing system design:', error);
      return { nodes: [], edges: [] };
    }
  }


  async parseApiJson(jsonString: string): Promise<{
    apis: any[];
    folderStructure: string;
  }> {
    try {
      const prompt = `Extract API endpoints from the following JSON data. The format may vary (Postman collection, OpenAPI, custom format, etc.).

JSON Data:
${jsonString}

Extract all API endpoints and return them in this JSON format:
{
  "apis": [
    {
      "id": "unique-id",
      "name": "Endpoint name",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "url": "/api/path",
      "description": "Endpoint description",
      "headers": {},
      "queryParams": {},
      "body": {},
      "folderPath": "folder/path"
    }
  ],
  "folderStructure": "folder structure as text"
}

Return ONLY valid JSON, no markdown formatting.`;

      let text: string;
      
      if (this.useHuggingFace || !this.model) {
        text = await this.callFreeAI(prompt);
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      } else {
        text = await this.callFreeAI(prompt);
      }
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        apis: parsed.apis || [],
        folderStructure: parsed.folderStructure || ''
      };
    } catch (error) {
      console.error('Error parsing API JSON with AI:', error);
      return {
        apis: [],
        folderStructure: ''
      };
    }
  }
}

export const geminiService = new GeminiService();

