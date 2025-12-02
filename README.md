# 🛠️ Visual API Testing Platform — Backend

### Node.js + Express + TypeScript + MongoDB

The backend powers AI-driven test generation, API testing, ZIP import analysis, performance benchmarking, and project management. Built with extensibility, modularity, and SOLID principles.

---

# 📦 Core Features

* 🤖 **AI Test Generation** using Google Gemini API + Huggingface
* 📦 **ZIP Import & System Extraction** (route, controller & file structure parsing)
* ⚙️ **Performance Testing Engine** (concurrency, latency, throughput)
* 📝 **Auto-Documentation Generator**
* 🔐 **Security Middleware** (Helmet, CORS, rate-limiting)
* 🧱 **Layered Architecture** (Controllers → Services → Models)

---

# 🧱 Folder Structure

```
be/
├── src/
│   ├── config/         # ENV, DB connection
│   ├── controllers/    # Handles HTTP requests
│   ├── services/       # Business logic (AI, performance, parsing)
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API route definitions
│   ├── middlewares/    # Error handling, validation, multer
│   └── utils/          # Parsers, regex, helpers
└── package.json
```

---

# 🛠️ Tech Stack

* **Node.js + Express**
* **TypeScript**
* **MongoDB + Mongoose**
* **Google Gemini API + Huggingface**
* **Multer** (file uploads)
* **Helmet / CORS / Express Rate Limit**
* **Zlib / Streams** for ZIP parsing

---

# 🖥️ Local Development

## 1️⃣ Clone Repository

```bash
git clone https://github.com/SwitchBladeAK/apitesterbe.git
cd api_tester_project/be
```

## 2️⃣ Install Dependencies

```bash
npm install
```

## 3️⃣ Setup Environment Variables

```bash
cp .env.example .env
```

### Required ENV Keys:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/api_tester_db
GEMINI_API_KEY=your_google_gemini_key
CORS_ORIGIN=http://localhost:3000
```

---

# 🚀 Run Development Server

```bash
npm run dev
```

Server runs at:
📌 **[http://localhost:5000](http://localhost:5000)**

MongoDB must be running.

---

# 📦 Build for Production

```bash
npm run build
```

Output folder:

```
be/dist/
```

---

# 🧰 Available Scripts

| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Start dev server (ts-node) |
| `npm run build` | Build TypeScript → JS      |
| `npm start`     | Start production server    |
| `npm test`      | Run tests (optional)       |

---

# 🧪 API Endpoints Overview

### 🔹 Projects

```
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### 🔹 Endpoints

```
POST   /api/projects/:projectId/endpoints
PUT    /api/projects/:projectId/endpoints/:endpointId
DELETE /api/projects/:projectId/endpoints/:endpointId
POST   /api/projects/:projectId/endpoints/:endpointId/test
```

### 🔹 AI Features

```
POST /api/projects/:projectId/ai/generate-test-cases
POST /api/projects/:projectId/ai/generate-documentation
POST /api/projects/:projectId/ai/analyze-system-design
```

### 🔹 ZIP Import

```
POST /api/projects/:projectId/import-zip
```

### 🔹 Performance Testing

```
POST /api/projects/:projectId/endpoints/:endpointId/performance-test
```

---

# 🔐 Security

* Helmet for secure HTTP headers
* CORS whitelisting
* Rate limiting
* Sanitized file uploads
* Input validation

---

# 🧪 Recommended Testing Stack

* **Jest**
* **Supertest** for API integration tests
* **MongoDB Memory Server** for isolated test DB

---

# 🐳 Docker Support

```bash
docker build -t api-tester-be .
docker run -p 5000:5000 api-tester-be
```

---

# 🌐 Architecture Diagram

```mermaid
---
config:
  layout: dagre
---
flowchart TB
subgraph FE_BOX["Frontend"]
    FE_Pages["Pages / Dashboard / Builder"]
    FE_Components["Reusable UI Components"]
    FE_Services["API Services (Axios)"]
    FE_Flow["System Visualization (React Flow)"]
end

subgraph BE_BOX["Backend (Node.js + Express + TS)"]
    BE_Routes["Routes Layer"]
    BE_Controllers["Controllers"]
    BE_Services["Services: AI, Performance, ZIP Parser"]
    BE_Models["Models (Mongoose)"]
    BE_Middlewares["Middlewares: Validation, Security, Uploads"]
end

A["User / Developer"] -- Uses App --> FE["Frontend (React + TS)"]
FE_Pages --> FE_Components & FE_Services & FE_Flow
FE --> FE_Pages
BE_Routes --> BE_Controllers
BE_Controllers --> BE_Services & BE_Middlewares
BE_Services --> BE_Models
FE_Services -- REST JSON --> BE_Routes
BE_Models --> DB["(MongoDB)"]
BE_Services -- Send Prompts / Receive Test Cases & Docs --> Gemini["Google Gemini AI + Huggingface"]
BE_Services -- Forward API Calls --> TargetAPI["Target API / Endpoints"]
TargetAPI -- Response + Metrics --> BE_Services
BE_Controllers -- Return Test Results / AI Data / System Model --> FE_Pages
FE_Pages -- Visualize / Interact --> A

FE_Pages:::feNode
FE_Components:::feNode
FE_Services:::feNode
FE_Flow:::feNode
BE_Routes:::beNode
BE_Controllers:::beNode
BE_Services:::beNode
BE_Models:::beNode
BE_Middlewares:::beNode
A:::user
FE:::feMain
DB:::storage
Gemini:::ai
TargetAPI:::external

classDef feNode fill:#f2f6fc,stroke:#7cbafd,color:#222,font-size:13px,font-family:Inter,stroke-width:2px
classDef beNode fill:#f7fef9,stroke:#80cbc4,color:#283646,font-size:13px,font-family:Inter,stroke-width:2px
classDef feMain fill:#e3f2fd,stroke:#2196f3,stroke-width:2.5px,color:#17394b,font-weight:bold,font-size:15px
classDef storage fill:#f4f5fb,stroke:#b0b8c1,color:#373737,font-size:13px,font-family:Inter,stroke-width:2px
classDef ai fill:#f3edfc,stroke:#b39ddb,color:#483365,font-size:13px,font-family:Inter,stroke-width:2px
classDef user fill:#fff9ea,stroke:#ffd54f,color:#6d4c10,font-size:14px,font-family:Inter,stroke-width:2.5px,font-weight:bold
classDef external fill:#eaf7fa,stroke:#7ed5ea,color:#195a63,font-size:13px,font-family:Inter,stroke-width:2px

style FE_BOX fill:#e6ebf5,stroke:#bbdefb,stroke-width:2px,color:#26425a
style BE_BOX fill:#edf7ee,stroke:#b2dfdb,stroke-width:2px,color:#265148
```

---

