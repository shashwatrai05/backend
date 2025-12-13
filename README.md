# DSA Master Backend API

Backend REST API for DSA Master problem tracker application.

## Technology Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt for password hashing

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
Create a `.env` file or use the existing one:
```env
MONGODB_URI=mongodb://localhost:27017/dsa-tracker
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

3. Start the server:
```bash
npm run dev
```

The API will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Progress
- `GET /api/progress` - Get user's progress (Protected)
- `POST /api/progress/:problemId` - Update problem progress (Protected)
- `DELETE /api/progress/:problemId` - Delete progress entry (Protected)
- `GET /api/progress/stats` - Get user statistics (Protected)

## Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── middleware/
│   └── auth.js            # JWT authentication
├── models/
│   └── User.js            # User schema
├── routes/
│   ├── auth.js            # Auth routes
│   └── progress.js        # Progress routes
├── .env                   # Environment variables
├── .gitignore
├── package.json
└── index.js               # Entry point
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run server` - Alias for dev
