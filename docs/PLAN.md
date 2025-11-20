# LostLink - Smart Lost & Found Platform: Complete MVP Plan

## 1. Executive Summary

LostLink replaces chaotic poster/email-based lost & found systems with a centralized platform featuring automated smart matching, real-time secure chat, and campus map integration. Built for a 3-person team to deliver in 8 weeks.

**Core Value Proposition:**

- Automated matching between lost/found items (text + location similarity)
- 60% faster recovery times vs. current system
- Secure communication without exposing personal details
- Visual campus map for location context
- User-driven ownership verification through chat

---

## 2. Technical Architecture

The entire stack is TypeScript-based—Node/Express services share a unified typing strategy, and the React client runs on the Vite TypeScript template for consistent types across the API boundary.

### 2.1 High-Level System Design

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   React     │◄──────► │   Node.js API    │◄──────► │   MongoDB   │
│   Frontend  │         │   (Express)      │         │   Atlas     │
│             │         │                  │         └─────────────┘
│  - Leaflet  │         │  REST + WebSocket│
│  - Tailwind │         │                  │         ┌─────────────┐
│             │         │  Services:       │◄──────► │   MinIO     │
└─────────────┘         │  - Auth          │         │   (S3 API)  │
                        │  - Items         │         └─────────────┘
      ▲                 │  - Matching      │
      │                 │  - Chat          │
      │ Socket.IO       │  - Notifications │
      └─────────────────│  - Storage       │
                        └──────────────────┘
```

### 2.2 Backend Service Architecture

**Modular Structure:**

```
backend/
├── src/
│   ├── services/
│   │   ├── auth.service.ts          # JWT, bcrypt, email verification
│   │   ├── item.service.ts          # CRUD, search, filters
│   │   ├── matching.service.ts      # Smart matching algorithm
│   │   ├── chat.service.ts          # Real-time messaging
│   │   ├── notification.service.ts  # Email + in-app alerts
│   │   └── storage.service.ts       # MinIO S3 integration
│   ├── models/
│   │   ├── User.ts
│   │   ├── Item.ts
│   │   ├── Match.ts
│   │   ├── Chat.ts
│   │   └── Notification.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── items.routes.ts
│   │   ├── matches.routes.ts
│   │   └── chat.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── rateLimiter.middleware.ts
│   │   └── validator.middleware.ts  # Input sanitization
│   ├── websocket/
│   │   └── chatHandler.ts
│   └── utils/
│       ├── matchingAlgorithm.ts
│       ├── geoUtils.ts              # Haversine distance
│       └── textSimilarity.ts        # TF-IDF/cosine similarity
├── config/
│   ├── database.ts
│   ├── minio.ts
│   └── env.ts
├── tsconfig.json
└── server.ts
```

All backend services share a common `tsconfig.json` and rely on ts-node/ts-jest for development and testing to ensure a strictly TypeScript codebase.

### 2.3 MongoDB Schema Design

**Collections & Indexes:**

**users:**

```typescript
interface UserDocument {
  _id: Types.ObjectId;
  email: string;              // Required: @stud.h-da.de webmail domain
  passwordHash: string;       // bcrypt
  name: string;
  emailVerified: boolean;
  createdAt: Date;
}
// Indexes: { email: 1 } (unique)
```

**items:**

```typescript
interface ItemDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;          // Reporter
  type: 'lost' | 'found';
  title: string;
  description: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] GeoJSON format
    buildingName: string;
  };
  dateReported: Date;
  dateOccurred: Date;
  images: Array<{
    url: string;             // MinIO URL
    key: string;             // S3 key for deletion
    uploadedAt: Date;
  }>;
  tags: string[];
  status: 'open' | 'matched' | 'resolved' | 'closed';
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
}
// Indexes:
// 1. Text search: { title: "text", description: "text" }
// 2. Geo: { location: "2dsphere" }
// 3. Queries: { type: 1, status: 1, createdAt: -1 }
```

**matches:**

```typescript
interface MatchDocument {
  _id: Types.ObjectId;
  lostItemId: Types.ObjectId;
  foundItemId: Types.ObjectId;
  score: number;             // 0-1 match confidence
  breakdown: {
    textSimilarity: number;
    locationProximity: number;
  };
  status: 'pending' | 'verified' | 'rejected';
  chatRoomId: Types.ObjectId;
  verificationQuestions: Array<{
    question: string;
    askedBy: Types.ObjectId;
    answer: string;
    answeredAt: Date;
  }>;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;       // userId
}
// Indexes: { lostItemId: 1, foundItemId: 1, score: -1 }
```

**chats:**

```typescript
interface ChatDocument {
  _id: Types.ObjectId;
  matchId: Types.ObjectId;
  participants: [Types.ObjectId, Types.ObjectId];  // [finder, owner]
  messages: Array<{
    senderId: Types.ObjectId;
    content: string;
    timestamp: Date;
    read: boolean;
  }>;
  status: 'active' | 'closed';
  createdAt: Date;
}
// Indexes: { matchId: 1 }, { participants: 1 }
```

**notifications:**

```typescript
interface NotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'new_match' | 'new_message' | 'status_change';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
}
// Indexes: { userId: 1, read: 1, createdAt: -1 }
```

> All interfaces above assume `import { Types } from 'mongoose';` and live alongside their corresponding Mongoose schemas to guarantee end-to-end TypeScript typing.

### 2.4 API Endpoints Design

**Authentication:**

- `POST /api/auth/register` - Register with university email
- `POST /api/auth/login` - JWT token generation
- `POST /api/auth/verify-email` - Email verification link
- `POST /api/auth/forgot-password`
- `GET /api/auth/me` - Get current user

**Items:**

- `POST /api/items` - Create lost/found report (with image upload)
- `GET /api/items` - List items (filters: type, status, location bounds, date range)
- `GET /api/items/:id` - Get single item details
- `PATCH /api/items/:id` - Update item (owner only)
- `DELETE /api/items/:id` - Delete item (owner only)
- `GET /api/items/:id/matches` - Get potential matches for an item

**Matches:**

- `GET /api/matches` - Get all matches for current user's items
- `POST /api/matches/:id/verify` - Confirm a match
- `POST /api/matches/:id/reject` - Reject a match
- `POST /api/matches/:id/verify-question` - Ask verification question

**Chat:**

- `GET /api/chats/:matchId` - Get chat history
- WebSocket: `/ws/chat` - Real-time messaging

**Notifications:**

- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

---

## 3. Smart Matching Algorithm

### 3.1 Algorithm Design

**Scoring Formula:**

```
overallScore = 0.6 × textSimilarity + 0.4 × locationProximity
```

**Text Similarity (0-1):**

1. Tokenize and normalize: lowercase, remove stop words, stem
2. Compute TF-IDF vectors for title + description
3. Calculate cosine similarity between vectors
4. Boost score if key terms match (e.g., "wallet", "phone")

**Location Proximity (0-1):**

1. Calculate Haversine distance between coordinates
2. Normalize: `proximity = max(0, 1 - (distance / maxDistance))`
3. `maxDistance = 2km` (typical campus size)

**Implementation:**

```typescript
// utils/matchingAlgorithm.ts
export async function findMatches(
  itemId: Types.ObjectId,
  type: ItemType
): Promise<MatchResult[]> {
  const item = await Item.findById(itemId);
  if (!item) return [];

  const oppositeType: ItemType = type === 'lost' ? 'found' : 'lost';

  // MongoDB text search for candidates (performance)
  const candidates = await Item.find({
    $text: { $search: `${item.title} ${item.description}` },
    type: oppositeType,
    status: 'open'
  }).limit(50);

  // Calculate detailed scores
  const matches = candidates.map((candidate) => ({
    itemId: candidate._id,
    score: calculateMatchScore(item, candidate),
    breakdown: {
      textSimilarity: calculateTextSimilarity(item, candidate),
      locationProximity: calculateLocationProximity(item, candidate)
    }
  }));

  // Return top 10 matches with score >= 0.5
  return matches
    .filter((m) => m.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

### 3.2 Matching Workflow

1. User submits lost/found item → Item stored
2. Matching service runs automatically on creation
3. Top matches saved to `matches` collection
4. Notifications sent to relevant users
5. Users review matches → initiate chat
6. Verification questions exchanged in chat
7. Match confirmed by both parties → items marked 'resolved'

---

## 4. MinIO Storage Integration

### 4.1 Setup & Configuration

**Development:**

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  quay.io/minio/minio server /data --console-address ":9001"
```

**Bucket Structure:**

```
lostlink-items/
  ├── lost/
  │   └── {userId}/{itemId}/{timestamp}_{filename}.jpg
  └── found/
      └── {userId}/{itemId}/{timestamp}_{filename}.jpg
```

**Bucket Policy (Public Read):**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": ["*"]},
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::lostlink-items/*"]
  }]
}
```

### 4.2 Upload Workflow

1. Frontend: User selects image
2. Frontend: Validates client-side (size < 5MB, type: jpg/png/webp)
3. Backend: Receives multipart form data
4. Backend: Re-validates server-side
5. Backend: Generates unique key: `{type}/{userId}/{itemId}/{timestamp}_{sanitized_filename}`
6. Backend: Uploads to MinIO via S3 SDK
7. Backend: Stores URL + key in MongoDB `items.images[]`
8. Response: Returns item with image URLs

**Security Measures:**

- Content-Type validation (only images)
- File size limit: 5MB per image, 3 images max per item
- Filename sanitization (remove path traversal attempts)
- Virus scanning (optional: ClamAV integration)

---

## 5. Security Strategy

### 5.1 Authentication & Authorization

**Email Verification:**

- Registration requires university email domain (`@stud.h-da.de`)
- Verification token sent via Nodemailer
- Account inactive until verified

**Password Security:**

- bcrypt with salt rounds = 12
- Minimum 8 characters, 1 uppercase, 1 number
- Password reset via time-limited tokens (1 hour expiry)

**JWT Tokens:**

- Access token: 15-minute expiry
- Refresh token: 7-day expiry, stored in httpOnly cookie
- Payload: `{ userId, email }`

### 5.2 Abuse Prevention

**Rate Limiting:**

- General API: 100 requests/15min per IP
- Login: 5 attempts/15min per IP
- Registration: 3 accounts/hour per IP
- Item creation: 10 items/day per user

**Ownership Verification:**

1. Finder asks verification questions in chat
2. Owner provides answers
3. Both parties must agree to mark match as verified
4. Either party can reject a match

**Input Sanitization:**

- Express-validator for all inputs
- MongoDB query injection prevention
- XSS protection via DOMPurify on frontend

**Security Headers:**

- Helmet middleware: CSP, HSTS, X-Frame-Options
- CORS: Whitelist frontend domain only

---

## 6. Frontend Architecture

**Tech Stack:**

- **React 18** with Vite (TypeScript template)
- **Tailwind CSS** + **shadcn/ui** for components
- **React Router** for navigation
- **React Query** for API state management
- **Socket.IO Client** for WebSocket
- **Leaflet** (with `@types/leaflet`) for map integration
- **Zod** for form validation

**Key Pages:**

```
/                     → Landing page
/login                → Login form
/register             → Registration form
/dashboard            → User dashboard (my items, matches, notifications)
/items/new            → Report lost/found item (map picker)
/items/:id            → Item details
/matches              → All my potential matches
/matches/:id/chat     → Chat interface
/map                  → Campus map view (all items)
/profile              → User settings
```

**Reusable Components:**

- `ItemCard` - Display item with image, location, date
- `MatchCard` - Show match with score breakdown
- `ChatWindow` - Real-time messaging UI
- `MapPicker` - Leaflet map for location selection
- `NotificationBell` - Dropdown with unread alerts

---

## 7. Deployment Architecture

### 7.1 Docker Setup

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - minio
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"

volumes:
  minio-data:
```

### 7.2 Production Deployment

**Chosen Stack:**

- **Frontend:** Vercel or Netlify (free tier)
- **Backend:** Render.com or Railway.app
- **Database:** MongoDB Atlas
- **Storage:** MinIO self-hosted OR migrate to AWS S3
- **Domain:** Cloudflare DNS + SSL 

**Environment Variables:**

```env
# Backend
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-256-bit-key>
JWT_REFRESH_SECRET=<random-256-bit-key>

# MinIO/S3
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=lostlink-items

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Frontend
VITE_API_URL=https://api.lostlink.com
VITE_WS_URL=wss://api.lostlink.com
```

---

## 8. Eight-Week MVP Roadmap


### Week 1: Foundation & Setup

**Goals:** Project scaffolding, database, basic auth

- **A:** Initialize TypeScript Node.js project, Express setup, MongoDB connection, User model
- **B:** Initialize React + Vite, Tailwind + shadcn, routing setup
- **C:** Auth service (register, login, JWT), email verification stub
- **Deliverables:** Basic login/register flow, database connected

### Week 2: Core Item Management

**Goals:** CRUD operations for items, image upload

- **A:** Item model, item routes (POST/GET/PATCH/DELETE), text search index
- **B:** Item creation form with validation, item list page, item detail page
- **C:** MinIO setup (Docker), storage service, image upload middleware
- **Deliverables:** Users can create and view lost/found items with images

### Week 3: Map Integration & Geo Features

**Goals:** Leaflet map, location picker, geo queries

- **A:** Geo index (2dsphere), location-based queries, API filters
- **B:** Leaflet integration, map picker component, campus map with markers
- **C:** Cluster markers for performance, map search/filters
- **Deliverables:** Interactive map shows all items, users pick locations visually

### Week 4: Smart Matching System

**Goals:** Automated matching algorithm

- **A:** Matching service (text similarity + location proximity), Match model
- **B:** Matches page, match cards with score breakdown
- **C:** Notification model, basic email notifications (match found)
- **Deliverables:** System automatically suggests matches when items are posted

### Week 5: Real-Time Chat

**Goals:** WebSocket chat for matches

- **A:** Chat model, chat API routes, message persistence
- **B:** Chat UI component, message list, input form
- **C:** Socket.IO setup (server + client), real-time message delivery
- **Deliverables:** Users can chat in real-time about matches

### Week 6: Notifications & Security

**Goals:** Notification system, rate limiting, abuse prevention

- **A:** Notification service (in-app + email), notification API, rate limiting middleware
- **B:** Notification bell component, notification preferences page, UI polish
- **C:** Email templates (Nodemailer), status change triggers, verification workflow
- **Deliverables:** Full notification system, rate limiting active, verification flow complete

### Week 7: Testing & Polish

**Goals:** Testing, bug fixes, UI refinements

- **A:** Backend tests (ts-jest), API error handling improvements
- **B:** Frontend tests (Vitest + React Testing Library, TypeScript config), responsive design fixes, accessibility improvements
- **C:** Integration testing, performance optimization, security audit
- **Deliverables:** Tested and polished application ready for deployment

### Week 8: Deployment & Documentation

**Goals:** Deploy MVP

- **A:** API documentation, deployment scripts
- **B:** User guide, presentation slides
- **C:** Docker setup, deploy to Render + MongoDB Atlas, SSL setup
- **All:** Final user testing, bug fixes, presentation preparation
- **Deliverables:** Live MVP + presentation deck + documentation

---

## 9. Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Matching algorithm accuracy | High | Start with simple approach, iterate based on testing |
| WebSocket complexity | Medium | Use Socket.IO, limit chat features |
| MinIO setup issues | Medium | Document setup thoroughly, fallback to local filesystem |
| Scope creep | High | Strict \"MVP-only\" rule, defer AI/mobile to post-MVP |
| Integration delays | Medium | Weekly sync meetings, clear API contracts upfront |

---

## 10. Documentation Requirements

**For Submission:**

1. **README.md:** Setup instructions, tech stack
2. **API_DOCS.md:** All endpoints with examples
3. **ARCHITECTURE.md:** System design, database schema
4. **DEPLOYMENT.md:** Docker setup, environment variables
5. **USER_GUIDE.md:** How to use the platform
6. **PRESENTATION.pdf:** Slide deck (10-15 slides)

**Code Quality:**

- ESLint + Prettier configured
- Git branching strategy (feature branches → develop → main)
- Pull request reviews (2 approvals)
- Meaningful commit messages

---

