# Mudra

A secure, scalable authentication microservice that generates and validates JWT tokens across your ecosystem. Named after the Sanskrit word for "seal/token," Mudra provides robust identity management with minimal overhead.

## Overview

Built with:
- Node.js
- Express
- MongoDB
- Redis

## Key Features

- JWT token generation and validation
- Secure user authentication
- Scalable microservice architecture
- Redis caching for improved performance
- MongoDB for persistent storage

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis

## Getting Started

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mudra.git

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify MongoDB
mongosh

# Redis
brew install redis
brew services start redis

# Verify Redis
redis-cli ping  # Should return "PONG"
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mudra
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
```

## API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors who have helped shape Mudra
- Inspired by modern authentication best practices


