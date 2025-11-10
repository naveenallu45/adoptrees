# API Documentation

## Overview

This application includes comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Accessing the Documentation

### Interactive Swagger UI

Once the development server is running, you can access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Interactive API testing
- Authentication information
- Example requests and responses

### OpenAPI Specification

The OpenAPI 3.0 specification file is available at:

```
/swagger.json
```

You can use this file with:
- Swagger Editor
- Postman
- Insomnia
- Any OpenAPI-compatible tool

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register a new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth authentication

### Health & System
- `GET /api/health` - Health check endpoint
- `HEAD /api/health` - Ping endpoint

### Trees
- `GET /api/trees` - Get all active trees
- `GET /api/admin/trees` - Get all trees (Admin)
- `POST /api/admin/trees` - Create a new tree (Admin)
- `PUT /api/admin/trees/{id}` - Update a tree (Admin)
- `DELETE /api/admin/trees/{id}` - Delete a tree (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create a new order

### Payments
- `POST /api/payments/create-order` - Create Razorpay payment order
- `POST /api/payments/verify-payment` - Verify Razorpay payment

### Certificates
- `GET /api/certificates/{orderId}` - Download certificate for an order

### Users
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/public-id` - Get or generate public ID
- `POST /api/users/profile-picture` - Upload profile picture
- `DELETE /api/users/profile-picture` - Delete profile picture

### Public
- `GET /api/public/users/{publicId}/orders` - Get public user orders

### Admin - Adoptions
- `GET /api/admin/adoptions` - Get all adoptions with filters
- `PUT /api/admin/adoptions` - Update adoption status
- `GET /api/admin/adoptions/all` - Get all adoptions without pagination

### Admin - Users
- `GET /api/admin/users` - Get users by type
- `GET /api/admin/users/{id}` - Get user by ID
- `DELETE /api/admin/users/{id}` - Delete user

### Admin - Wellwishers
- `GET /api/admin/wellwishers` - Get all wellwishers
- `POST /api/admin/wellwishers` - Create a new wellwisher
- `GET /api/admin/wellwishers/{id}` - Get wellwisher by ID
- `PUT /api/admin/wellwishers/{id}` - Update wellwisher
- `DELETE /api/admin/wellwishers/{id}` - Delete wellwisher

### Wellwisher
- `GET /api/wellwisher/tasks` - Get wellwisher tasks
- `PUT /api/wellwisher/tasks` - Update task status
- `POST /api/wellwisher/planting` - Upload planting details
- `GET /api/wellwisher/planting` - Get planting details
- `POST /api/wellwisher/growth-update` - Upload growth update

### Other
- `POST /api/geolocation/google` - Get geolocation from Google API
- `GET /api/cron/init` - Initialize cron jobs
- `POST /api/test-razorpay-credentials` - Test Razorpay credentials
- `POST /api/webhooks/razorpay` - Razorpay webhook handler

## Authentication

Most endpoints require authentication via NextAuth session cookies. The Swagger UI will handle authentication automatically when you're logged in.

## Generating/Updating Documentation

The OpenAPI specification is maintained in `swagger.json`. To update the documentation:

1. Edit `swagger.json` with your changes
2. Copy it to the public folder: `cp swagger.json public/swagger.json`
3. The changes will be reflected in the Swagger UI

## Scripts

Run the following command to see where the API documentation is available:

```bash
npm run api-docs
```

## Notes

- All endpoints that require authentication are marked with a lock icon in Swagger UI
- Request/response examples are provided for most endpoints
- The documentation includes validation schemas for request bodies
- Error responses are documented for all endpoints

