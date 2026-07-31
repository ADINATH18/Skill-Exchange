# Skill Exchange Platform

A platform for exchanging skills through courses with real-time chat functionality.

## Features

- User authentication (Register/Login)
- Course creation and management
- File uploads (PDF, images, videos)
- Real-time chat between students and instructors
- Dashboard for course browsing

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.io

## Setup

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd Server
npm install
node server.js
```

## Environment Variables

Create `.env` file in Server directory:
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000
```
