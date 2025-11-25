# API Documentation

## Accessing API Documentation

The LostLink API documentation is available via Swagger UI at:

**Local Development:** `http://localhost:5000/api-docs`

## Features

- **Interactive API Explorer** - Test endpoints directly from your browser
- **Request/Response Schemas** - See all required fields and data types
- **Authentication Testing** - Try authenticated endpoints with JWT tokens
- **Example Requests** - Pre-filled examples for each endpoint

## Using Swagger UI

### 1. View Documentation
Simply navigate to `http://localhost:5000/api-docs` when the server is running.

### 2. Test Authenticated Endpoints

For endpoints that require authentication (marked with a lock icon 🔒):

1. **Register/Login** to get a JWT token
   - Use the `/api/auth/register` or `/api/auth/login` endpoint
   - Copy the `token` from the response

2. **Authorize in Swagger**
   - Click the **"Authorize"** button at the top right
   - Enter: `Bearer <your-token-here>`
   - Click **"Authorize"**
   - Click **"Close"**

3. **Test Protected Endpoints**
   - Now you can test endpoints like `/api/auth/me`
   - The JWT token will be automatically included in requests

### 3. Try It Out

For any endpoint:
1. Click **"Try it out"**
2. Fill in the request body/parameters
3. Click **"Execute"**
4. View the response below

## Available Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user (requires auth)

### Health (`/api`)

- `GET /api/health` - Health check

## Development

The API documentation is auto-generated from JSDoc comments in the route files using:
- `swagger-jsdoc` - Generates OpenAPI spec from code comments
- `swagger-ui-express` - Renders interactive Swagger UI

To add documentation for new endpoints, add JSDoc comments above your route handlers:

```typescript
/**
 * @openapi
 * /your-endpoint:
 *   post:
 *     tags:
 *       - YourTag
 *     summary: Brief description
 *     description: Detailed description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/your-endpoint', async (req, res) => {
  // ... your code
});
```

## Notes

- All endpoints are prefixed with `/api`
- Authentication uses JWT Bearer tokens
- Email addresses must be from `@stud.h-da.de` domain
- Passwords must be at least 8 characters long

