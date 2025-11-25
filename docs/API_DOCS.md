# API Documentation

## Swagger UI

Interactive API documentation: `http://localhost:5000/api-docs`

**Using Authentication:**

1. Register/login to get JWT token
2. Click **"Authorize"** → Enter `Bearer <token>`
3. Test protected endpoints

## Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint                | Description                    | Auth Required |
| ------ | ----------------------- | ------------------------------ | ------------- |
| `POST` | `/api/auth/register`    | Register new user              | No            |
| `POST` | `/api/auth/verify-code` | Verify email with 6-digit code | No            |
| `POST` | `/api/auth/login`       | Login and get JWT token        | No            |
| `GET`  | `/api/auth/me`          | Get current user               | Yes           |

### Health (`/api`)

| Method | Endpoint      | Description  | Auth Required |
| ------ | ------------- | ------------ | ------------- |
| `GET`  | `/api/health` | Health check | No            |

## Authentication Flow

1. **Register** → `POST /api/auth/register`

   - Body: `{ name, email, password }`
   - Email must be `@stud.h-da.de`
   - Returns verification code (check backend logs)

2. **Verify** → `POST /api/auth/verify-code`

   - Body: `{ email, code }`
   - Code expires in 15 minutes

3. **Login** → `POST /api/auth/login`

   - Body: `{ email, password }`
   - Returns JWT token (expires in 7 days)

4. **Get User** → `GET /api/auth/me`
   - Header: `Authorization: Bearer <token>`


