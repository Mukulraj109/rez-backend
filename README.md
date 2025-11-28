# Rez Merchant Platform

A comprehensive merchant-side React Native application for product management, order processing, and cashback administration, built to complement the existing Rez customer app.

## Project Structure

```
admin-project/
├── merchant-app/          # React Native/Expo merchant app
├── backend/              # Node.js/Express backend with MongoDB
├── shared/               # Shared TypeScript types
└── README.md
```

## Phase 1 Status: COMPLETED ✅

### What's Been Implemented

#### ✅ Full Project Setup
- **Admin-project directory structure** with merchant-app, backend, and shared folders
- **React Native/Expo app** initialized with TypeScript
- **Node.js backend** with Express, MongoDB, and JWT authentication
- **Shared TypeScript types** for frontend/backend compatibility

#### ✅ Backend Foundation
- Express server with security middleware (helmet, CORS, rate limiting)
- MongoDB connection with Mongoose ODM
- JWT authentication system
- Merchant and Product schema models
- RESTful API structure with placeholder routes
- Real-time WebSocket support with Socket.io

#### ✅ React Native App Foundation
- Expo Router file-based navigation
- Authentication screens (Login/Register)
- Main dashboard with tab navigation
- Themed components (ThemedText, ThemedView)
- Context providers (AuthContext, MerchantContext)
- Purple-themed design system matching Rez branding

#### ✅ Key Features Working
- **Authentication flow** with token storage
- **Dashboard overview** with metrics cards
- **Tab navigation** (Dashboard, Products, Orders, Cashback)
- **Real-time context** management
- **Error handling** and loading states

### Technology Stack

#### Frontend (React Native/Expo)
- **React Native**: 0.79.5
- **Expo**: ~53.0.20
- **TypeScript**: ~5.8.3
- **Expo Router**: File-based routing
- **AsyncStorage**: Secure token storage
- **Expo Linear Gradient**: UI styling

#### Backend (Node.js)
- **Express**: 5.1.0
- **MongoDB**: 8.17.1 with Mongoose ODM
- **JWT**: jsonwebtoken 9.0.2
- **Socket.io**: 4.8.1 for real-time features
- **Security**: Helmet, CORS, bcryptjs, rate limiting

#### Shared
- **TypeScript**: Complete type definitions
- **API Types**: Request/response interfaces
- **Domain Models**: Merchant, Product, Order, Cashback types

## Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas connection
- Expo CLI (`npm install -g @expo/cli`)
- React Native development environment

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd admin-project/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:3001`

### Merchant App Setup

1. **Navigate to merchant app directory:**
   ```bash
   cd admin-project/merchant-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Expo development server:**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator:**
   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for web

### Test Login Credentials
- **Email**: `merchant@test.com`
- **Password**: `password123`

## Features Implemented in Phase 1

### 🔐 Authentication System
- **Login/Register screens** with form validation
- **JWT token management** with secure storage
- **Session persistence** across app restarts
- **Logout functionality** with token cleanup

### 📱 Navigation & UI
- **Expo Router** file-based navigation
- **Tab navigation** for main features
- **Purple gradient branding** matching Rez design
- **Responsive design** with theme support
- **Loading states** and error handling

### 📊 Dashboard
- **Welcome section** with merchant info
- **Metrics cards** for revenue, orders, cashback
- **Quick action buttons** for common tasks
- **Recent activity feed** (mock data)

### 🔧 Backend Infrastructure
- **RESTful API** structure
- **MongoDB schemas** for merchants and products
- **Authentication middleware** for protected routes
- **Real-time WebSocket** support
- **Error handling** and validation

## API Endpoints

### Authentication
- `POST /api/auth/register` - Merchant registration
- `POST /api/auth/login` - Merchant login
- `GET /api/auth/me` - Get current merchant
- `POST /api/auth/logout` - Logout

### Merchants
- `GET /api/merchants/profile` - Get merchant profile
- `PUT /api/merchants/profile` - Update merchant profile

### Products (Placeholder)
- `GET /api/products` - List products
- `POST /api/products` - Create product

### Orders (Placeholder)
- `GET /api/orders` - List orders
- `PUT /api/orders/:id/status` - Update order status

### Cashback (Placeholder)
- `GET /api/cashback` - List cashback requests
- `POST /api/cashback/:id/approve` - Approve cashback

## Next Steps (Phase 2)

### Week 3: Product Management System
- [ ] Complete product CRUD operations
- [ ] Image upload functionality
- [ ] Inventory tracking
- [ ] Category management
- [ ] Barcode scanning

### Week 4: Order Management System
- [ ] Real-time order processing
- [ ] Status update workflows
- [ ] Batch operations
- [ ] Print receipt functionality
- [ ] Order analytics

### Week 5: Cashback Management
- [ ] Approval workflows
- [ ] Fraud detection algorithms
- [ ] Bulk approval system
- [ ] Analytics dashboard
- [ ] Payment processing

### Week 6: Dashboard & Analytics
- [ ] Interactive charts
- [ ] Real-time data updates
- [ ] Custom widgets
- [ ] Export functionality
- [ ] Performance optimization

## Project Documentation

- **`planner.md`** - Detailed implementation plan
- **`tracker.md`** - Progress tracking and milestones
- **Shared types** - Complete TypeScript definitions in `shared/types/`

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript strictly with proper type definitions
3. Match the purple branding theme
4. Test authentication flows before committing
5. Update the tracker with completed tasks

## Security Notes

- JWT secrets are set for development only
- Change all secrets before production deployment
- MongoDB connection uses local development database
- CORS is open for development (configure for production)

---

**Status**: Phase 1 Complete ✅ | Ready for Phase 2 Development 🚀