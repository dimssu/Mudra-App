# Auth Routes — cURL Examples

Base URL: `http://localhost:3001`

---

## Register

```bash
curl -X POST http://localhost:3001/mudra/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "userName": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "profile_picture_url": "https://example.com/avatar.jpg",
    "phone_number": "+1234567890"
  }'
```

**Optional fields:** `userName`, `first_name`, `last_name`, `profile_picture_url`, `phone_number`

**Password requirements:** At least 8 characters, one uppercase, one lowercase, one number, one special character

---

## Login

```bash
curl -X POST http://localhost:3001/mudra/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

## Refresh Token

```bash
curl -X POST http://localhost:3001/mudra/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<your-refresh-token>"
  }'
```

---

## Logout

Requires `Authorization: Bearer <access-token>` header.

```bash
curl -X POST http://localhost:3001/mudra/auth/logout \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json"
```

---

## Google Get Access

```bash
curl -X POST http://localhost:3001/mudra/auth/google/get-access \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "<google-id-token>"
  }'
```

---

## Verify Token

Pass the access token in the `Authorization` header.

```bash
curl -X POST http://localhost:3001/mudra/auth/verify-token \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json"
```

---

## Alternative Base Path (`/auth`)

Register, login, and refresh-token also accept validation via `/auth`:

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!", "userName": "johndoe"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# Refresh Token
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your-refresh-token>"}'
```
