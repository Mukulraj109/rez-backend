# Merchant App Backend Integration Planner

## Executive Summary

This planner outlines the comprehensive integration of the Rez Merchant App (React Native Expo) with the backend API system. The integration will enable full functionality including authentication, dashboard data display, order management, cashback processing, and real-time updates.

## Current Status Analysis

### ✅ **Backend Status: READY**
- **TypeScript Compilation**: 100% error-free
- **API Endpoints**: All endpoints implemented and tested
- **Database**: MongoDB configured and connected
- **Authentication**: JWT system functional
- **Port**: Running on 3001 (configured in .env)
- **Real-time**: Socket.IO ready for live updates

### ✅ **Frontend Status: READY**
- **TypeScript Compilation**: 100% error-free (44/44 errors resolved)
- **Component Architecture**: All components functional
- **Theme System**: Complete and working
- **Navigation**: Expo Router properly configured
- **Dependencies**: All conflicts resolved

### 🔄 **Integration Status: PENDING**
- **API Service Layer**: Needs implementation
- **Authentication Flow**: Needs backend connection
- **Data Display**: Needs API integration
- **Real-time Updates**: Socket.IO integration required
- **Environment Configuration**: Frontend .env needed

## Integration Architecture

### **System Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Merchant App  │◄──►│   Backend API   │◄──►│    MongoDB      │
│  (React Native) │    │   (Node.js)     │    │   Database      │
│                 │    │                 │    │                 │
│  • Authentication   │    │  • JWT Auth     │    │  • Merchants    │
│  • Dashboard        │    │  • Dashboard    │    │  • Orders       │
│  • Orders           │    │  • Orders       │    │  • Products     │
│  • Cashback         │    │  • Cashback     │    │  • Cashback     │
│  • Products         │    │  • Products     │    │                 │
│  • Real-time UI    │    │  • Socket.IO    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │
        └────── Socket.IO ───────┘
         Real-time Updates
```

## Phase 1: Foundation Setup (Priority: Critical)

### **1.1 Environment Configuration**
- **Task**: Create merchant-app environment configuration
- **Files to Create**:
  - `merchant-app/.env`
  - `merchant-app/.env.example`
- **Configuration Required**:
  ```bash
  # API Configuration
  API_BASE_URL=http://localhost:3001
  API_TIMEOUT=10000
  
  # Socket.IO
  SOCKET_URL=http://localhost:3001
  SOCKET_TIMEOUT=5000
  
  # Development
  NODE_ENV=development
  EXPO_DEBUG=true
  
  # Security
  ENABLE_DEV_MENU=true
  ```

### **1.2 API Service Layer Creation**
- **Task**: Implement comprehensive API service
- **Files to Create**:
  - `merchant-app/services/api/index.ts` - Main API client
  - `merchant-app/services/api/auth.ts` - Authentication endpoints
  - `merchant-app/services/api/dashboard.ts` - Dashboard data
  - `merchant-app/services/api/orders.ts` - Order management
  - `merchant-app/services/api/cashback.ts` - Cashback operations
  - `merchant-app/services/api/products.ts` - Product management
  - `merchant-app/services/api/socket.ts` - Real-time connection
  - `merchant-app/services/storage.ts` - Token storage
  - `merchant-app/services/interceptors.ts` - Request/response handling

### **1.3 Type Definitions**
- **Task**: Create API response types
- **Files to Create**:
  - `merchant-app/types/api.ts` - API response types
  - `merchant-app/types/dashboard.ts` - Dashboard data types
  - `merchant-app/types/orders.ts` - Order types
  - `merchant-app/types/cashback.ts` - Cashback types
  - `merchant-app/types/socket.ts` - Socket event types

## Phase 2: Authentication Integration (Priority: Critical)

### **2.1 Auth Context Enhancement**
- **Task**: Connect AuthContext to backend API
- **Files to Modify**:
  - `merchant-app/contexts/AuthContext.tsx`
- **Features to Add**:
  - Login API integration
  - Register API integration
  - Token management
  - Auto-refresh logic
  - Logout functionality

### **2.2 Login & Register Screens**
- **Task**: Connect authentication screens to API
- **Files to Modify**:
  - `merchant-app/app/(auth)/login.tsx`
  - `merchant-app/app/(auth)/register.tsx`
- **Features to Add**:
  - Form validation
  - API error handling
  - Loading states
  - Success/error notifications

### **2.3 Protected Route System**
- **Task**: Implement route protection
- **Files to Modify**:
  - `merchant-app/app/_layout.tsx`
- **Features to Add**:
  - Token validation
  - Automatic redirects
  - Loading screens

## Phase 3: Dashboard Integration (Priority: High)

### **3.1 Dashboard Index Page**
- **Task**: Connect dashboard to backend metrics
- **Files to Modify**:
  - `merchant-app/app/(dashboard)/index.tsx`
- **API Endpoints to Integrate**:
  - `GET /api/dashboard/metrics`
  - `GET /api/dashboard/overview`
  - `GET /api/dashboard/revenue`
  - `GET /api/dashboard/top-products`
  - `GET /api/dashboard/recent-orders`

### **3.2 Dashboard Components**
- **Task**: Update dashboard components with real data
- **Files to Modify**:
  - `merchant-app/components/dashboard/AnimatedDashboardCard.tsx`
  - `merchant-app/components/charts/DashboardCharts.tsx`
  - `merchant-app/components/widgets/DashboardWidget.tsx`

### **3.3 Real-time Dashboard Updates**
- **Task**: Implement Socket.IO for live updates
- **Files to Create/Modify**:
  - `merchant-app/hooks/useRealTimeUpdates.ts`
- **Socket Events to Handle**:
  - `initial-dashboard-data`
  - `metrics-updated`
  - `order-event`
  - `system-notification`

## Phase 4: Orders Management (Priority: High)

### **4.1 Orders List Page**
- **Task**: Connect orders page to backend
- **Files to Modify**:
  - `merchant-app/app/(dashboard)/orders.tsx`
  - `merchant-app/app/(orders)/_layout.tsx`
- **API Endpoints**:
  - `GET /api/orders` (with pagination, filtering)
  - `GET /api/orders/:id`
  - `PUT /api/orders/:id/status`

### **4.2 Order Details & Analytics**
- **Task**: Implement order management features
- **Files to Modify**:
  - `merchant-app/app/(orders)/[id].tsx`
  - `merchant-app/app/(orders)/analytics.tsx`
- **Features**:
  - Order status updates
  - Order analytics
  - Bulk operations

## Phase 5: Cashback System (Priority: High)

### **5.1 Cashback Management**
- **Task**: Connect cashback system to backend
- **Files to Modify**:
  - `merchant-app/app/(dashboard)/cashback.tsx`
  - `merchant-app/app/(cashback)/_layout.tsx`
  - `merchant-app/app/(cashback)/[id].tsx`
  - `merchant-app/app/(cashback)/analytics.tsx`
  - `merchant-app/app/(cashback)/bulk-actions.tsx`

### **5.2 Cashback API Integration**
- **API Endpoints**:
  - `GET /api/cashback` (with filters)
  - `GET /api/cashback/metrics`
  - `PUT /api/cashback/:id/approve`
  - `PUT /api/cashback/:id/reject`
  - `POST /api/cashback/bulk-action`

## Phase 6: Products Management (Priority: Medium)

### **6.1 Products Pages**
- **Task**: Connect product management to backend
- **Files to Modify**:
  - `merchant-app/app/(dashboard)/products.tsx`
  - `merchant-app/app/products/[id].tsx`
  - `merchant-app/app/products/add.tsx`
  - `merchant-app/app/products/edit/[id].tsx`

### **6.2 Product Categories**
- **Task**: Implement category management
- **Files to Modify**:
  - `merchant-app/app/categories/index.tsx`
  - `merchant-app/app/categories/organize.tsx`

## Phase 7: Real-time Features (Priority: Medium)

### **7.1 Socket.IO Integration**
- **Task**: Implement comprehensive real-time features
- **Files to Create/Modify**:
  - `merchant-app/services/api/socket.ts`
  - `merchant-app/hooks/useRealTimeUpdates.ts`
  - `merchant-app/components/NotificationCenter.tsx`

### **7.2 Real-time Events**
- **Events to Handle**:
  - Order status changes
  - New cashback requests
  - System notifications
  - Metrics updates

## Phase 8: Notifications & UX (Priority: Low)

### **8.1 Notification System**
- **Task**: Implement push notifications
- **Files to Modify**:
  - `merchant-app/components/NotificationCenter.tsx`
  - `merchant-app/app.config.js`

### **8.2 Offline Support**
- **Task**: Add offline capabilities
- **Files to Create**:
  - `merchant-app/services/offline.ts`
  - `merchant-app/hooks/useNetworkStatus.ts`

## Technical Requirements

### **Dependencies to Install**
```bash
# API & Network
npm install axios socket.io-client

# State Management
npm install @tanstack/react-query

# Storage
npm install @react-native-async-storage/async-storage

# Notifications
npm install expo-notifications

# Network Detection
npm install @react-native-community/netinfo
```

### **Development Tools**
```bash
# API Testing
npm install --save-dev @types/socket.io-client

# Testing
npm install --save-dev @testing-library/react-native
```

## API Integration Checklist

### **Authentication Endpoints**
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/refresh`
- [ ] `GET /api/auth/profile`

### **Dashboard Endpoints**
- [ ] `GET /api/dashboard/metrics`
- [ ] `GET /api/dashboard/overview`
- [ ] `GET /api/dashboard/revenue`
- [ ] `GET /api/dashboard/top-products`
- [ ] `GET /api/dashboard/recent-orders`
- [ ] `GET /api/dashboard/analytics`

### **Orders Endpoints**
- [ ] `GET /api/orders`
- [ ] `GET /api/orders/:id`
- [ ] `POST /api/orders`
- [ ] `PUT /api/orders/:id`
- [ ] `PUT /api/orders/:id/status`
- [ ] `GET /api/orders/analytics`

### **Cashback Endpoints**
- [ ] `GET /api/cashback`
- [ ] `GET /api/cashback/metrics`
- [ ] `GET /api/cashback/:id`
- [ ] `PUT /api/cashback/:id/approve`
- [ ] `PUT /api/cashback/:id/reject`
- [ ] `PUT /api/cashback/:id/mark-paid`
- [ ] `POST /api/cashback/bulk-action`

### **Products Endpoints**
- [ ] `GET /api/products`
- [ ] `GET /api/products/:id`
- [ ] `POST /api/products`
- [ ] `PUT /api/products/:id`
- [ ] `DELETE /api/products/:id`
- [ ] `GET /api/products/categories`

## Error Handling Strategy

### **Network Errors**
- Connection timeouts
- Server unavailable
- Rate limiting

### **Authentication Errors**
- Token expiration
- Invalid credentials
- Unauthorized access

### **Data Errors**
- Validation failures
- Missing data
- Inconsistent state

## Testing Strategy

### **Unit Tests**
- API service functions
- Utility functions
- Component logic

### **Integration Tests**
- Authentication flow
- Data fetching
- Real-time updates

### **E2E Tests**
- Complete user journeys
- Error scenarios
- Offline behavior

## Performance Optimization

### **API Optimization**
- Request caching
- Pagination handling
- Background sync

### **Real-time Optimization**
- Event batching
- Connection management
- Memory cleanup

## Security Considerations

### **Token Management**
- Secure storage
- Automatic refresh
- Logout on expiration

### **API Security**
- Request validation
- HTTPS enforcement
- Rate limiting

## Deployment Preparation

### **Environment Configuration**
- Production API URLs
- SSL certificates
- Push notification keys

### **Build Configuration**
- Expo build settings
- Environment variables
- Asset optimization

## Risk Assessment

### **High Risk Items**
- Authentication token management
- Real-time connection stability
- Database performance

### **Medium Risk Items**
- Network connectivity issues
- API response consistency
- Mobile platform differences

### **Low Risk Items**
- UI performance
- Notification delivery
- Offline functionality

## Success Criteria

### **Phase 1 Complete**
- [ ] Environment variables configured
- [ ] API service layer implemented
- [ ] Type definitions created

### **Phase 2 Complete**
- [ ] Login/Register functionality working
- [ ] Token management implemented
- [ ] Protected routes functional

### **Phase 3 Complete**
- [ ] Dashboard displays real data
- [ ] Real-time updates working
- [ ] Charts and widgets functional

### **Phase 4 Complete**
- [ ] Orders CRUD operations working
- [ ] Order status updates functional
- [ ] Order analytics displaying

### **Phase 5 Complete**
- [ ] Cashback management working
- [ ] Approval/rejection workflow functional
- [ ] Bulk operations working

### **Phase 6 Complete**
- [ ] Product management working
- [ ] Category organization functional
- [ ] Product CRUD operations working

### **Phase 7 Complete**
- [ ] Real-time notifications working
- [ ] Socket.IO stable connection
- [ ] Live data updates functional

### **Final Integration Complete**
- [ ] All API endpoints integrated
- [ ] Authentication fully functional
- [ ] Dashboard showing live data
- [ ] Orders management complete
- [ ] Cashback system operational
- [ ] Products management working
- [ ] Real-time updates stable
- [ ] Error handling robust
- [ ] Performance optimized
- [ ] Security implemented
- [ ] Testing coverage adequate

## Timeline Estimation

- **Phase 1**: 1-2 days (Foundation)
- **Phase 2**: 1-2 days (Authentication)
- **Phase 3**: 2-3 days (Dashboard)
- **Phase 4**: 2-3 days (Orders)
- **Phase 5**: 2-3 days (Cashback)
- **Phase 6**: 1-2 days (Products)
- **Phase 7**: 1-2 days (Real-time)
- **Phase 8**: 1-2 days (Polish)

**Total Estimated Time**: 11-19 days

## Notes

- Backend is 100% ready and functional
- Frontend is 100% ready and error-free
- Integration is the final step for production readiness
- Real-time features will enhance user experience significantly
- Comprehensive error handling is crucial for mobile apps
- Performance optimization should be ongoing

---

*Created on: August 18, 2025*
*Status: Ready for Implementation*
*Backend Ready: ✅ | Frontend Ready: ✅ | Integration: 🔄 Pending*