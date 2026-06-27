# Hunger Bridge - Food Sharing Platform

A complete MERN stack web application for connecting food donors with receivers to reduce food waste and fight hunger.

## Features

- **Dual Login System**: Separate login flows for Food Donors and Food Receivers
- **Food Donation Management**: Donors can upload food with details like quantity, expiry time, and location
- **Food Request System**: Receivers can browse and request available food
- **Point System**: Earn points for donations and pickups
- **Certificate Generation**: Automatic PDF certificate generation for milestones
- **Real-time Updates**: Auto-refresh every 5 seconds to keep data current

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- PDFKit (for certificate generation)

### Frontend
- React.js (Vite)
- Tailwind CSS
- Axios
- React Router
- React Toastify

## Project Structure

```
hunger-bridge/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Food.js            # Food schema
│   ├── routes/
│   │   ├── auth.js            # Auth routes
│   │   ├── food.js            # Food routes
│   │   └── user.js            # User routes
│   ├── utils/
│   │   └── certificate.js     # PDF certificate generation
│   ├── .env                   # Environment variables
│   ├── .gitignore
│   ├── package.json
│   └── server.js              # Entry point
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── LoginDonor.jsx
    │   │   ├── LoginReceiver.jsx
    │   │   ├── DonorDashboard.jsx
    │   │   ├── ReceiverDashboard.jsx
    │   │   ├── UploadFoodForm.jsx
    │   │   ├── FoodCard.jsx
    │   │   └── CertificatePage.jsx
    │   ├── App.jsx
    │   ├── api.js
    │   ├── index.css
    │   └── main.jsx
    ├── .env
    ├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB installed and running locally, or MongoDB Atlas account

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
MONGO_URI=mongodb://localhost:27017/hunger-bridge
JWT_SECRET=your-secret-key-here-change-in-production
PORT=5000
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Food
- `POST /api/food/addFood` - Add new food donation (Donor only)
- `GET /api/food/available` - Get available food (Receiver only)
- `GET /api/food/myDonations` - Get donor's donations
- `POST /api/food/request/:id` - Request food (Receiver only)
- `PUT /api/food/pickup/:id` - Mark food as picked up (Receiver only)

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/points` - Get points and progress
- `GET /api/user/certificates` - Get earned certificates

## Point System & Certificates

### Donor Certificates
- **Bronze Certificate**: 50 points (50 meals donated)
- **Silver Certificate**: 100 points (100 meals donated)
- **Gold Certificate**: 200 points (200 meals donated)

### Receiver Certificates
- **Volunteer Certificate**: 5 pickups
- **Gold Volunteer Certificate**: 10 pickups

## User Roles

### Food Donor Sub-roles
- Restaurant
- Event Management
- Hostel / College
- Individual Donor

### Food Receiver Sub-roles
- NGO
- NSS Student
- Volunteer
- Individual

## Security Features

- Password hashing with bcryptjs
- JWT-based authentication
- Protected routes middleware
- Role-based access control

## Notes

- The application automatically generates PDF certificates when users reach milestones
- Certificates are stored in the `backend/certificates/` folder
- Food status automatically updates to "completed" when remaining quantity reaches 0
- The receiver dashboard auto-refreshes every 5 seconds to show real-time updates
