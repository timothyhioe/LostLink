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

### Items (`/api/items`)

| Method   | Endpoint                      | Description                         | Auth Required |
| -------- | ----------------------------- | ----------------------------------- | ------------- |
| `POST`   | `/api/items`                  | Create new item                     | Yes           |
| `GET`    | `/api/items`                  | Get all items with optional filters | No            |
| `GET`    | `/api/items/my`               | Get current user's items            | Yes           |
| `GET`    | `/api/items/:id`              | Get single item by ID               | No            |
| `GET`    | `/api/items/images/:filename` | Get image file                      | No            |
| `PATCH`  | `/api/items/:id`              | Update item (owner only)            | Yes           |
| `DELETE` | `/api/items/:id`              | Delete item (owner only)            | Yes           |

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

## Items Management

### Create Item

**POST** `/api/items`

- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `title` (string, required): Item title
  - `description` (string, required): Item description
  - `type` (string, required): `"lost"` or `"found"`
  - `buildingName` (string, optional for lost, required for found): Location name
  - `tags` (string, optional): Comma-separated tags
  - `image` (file, optional): Image file (max 7MB, images only)
- **Response:** Created item object with image URL

### Get All Items

**GET** `/api/items`

- **Auth Required:** No
- **Query Parameters:**
  - `type` (string, optional): Filter by `"lost"` or `"found"`
  - `status` (string, optional): Filter by `"open"`, `"matched"`, `"resolved"`, or `"closed"`
  - `search` (string, optional): Text search in title and description
  - `limit` (integer, optional): Items per page (default: 20)
  - `page` (integer, optional): Page number (default: 1)
- **Response:** Object with `items` array and `pagination` info

### Get User's Items

**GET** `/api/items/my`

- **Auth Required:** Yes
- **Response:** Array of items created by authenticated user

### Get Single Item

**GET** `/api/items/:id`

- **Auth Required:** No
- **Response:** Item object with populated user information

### Get Image

**GET** `/api/items/images/:filename`

- **Auth Required:** No
- **Response:** Image file (JPEG, PNG, GIF, or WebP)
- **Note:** Swagger UI cannot display binary images. Copy the Request URL to view in browser.

### Update Item

**PATCH** `/api/items/:id`

- **Auth Required:** Yes (must be item owner)
- **Content-Type:** `multipart/form-data`
- **Body:** Any combination of:
  - `title` (string)
  - `description` (string)
  - `buildingName` (string)
  - `tags` (string): Comma-separated tags
  - `status` (string): `"open"`, `"matched"`, `"resolved"`, or `"closed"`
  - `image` (file): New image to add
- **Response:** Updated item object

### Delete Item

**DELETE** `/api/items/:id`

- **Auth Required:** Yes (must be item owner)
- **Response:** Success message
- **Note:** Also deletes associated images from MinIO storage
