import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'REZ Merchant Backend API',
      version: '1.0.0',
      description: `
# REZ Merchant Backend API Documentation

Complete API documentation for the REZ merchant backend system. This API enables merchants to manage their products, orders, analytics, team members, and more.

## Features
- **Authentication & Authorization** - JWT-based authentication with role-based access control
- **Product Management** - Complete CRUD operations for products, variants, and inventory
- **Order Management** - Process orders, manage statuses, generate invoices
- **Analytics & Reporting** - Real-time sales analytics, forecasting, and insights
- **Team Management** - Invite team members, assign roles, manage permissions
- **Audit Logging** - Complete activity tracking and audit trails
- **Real-time Updates** - WebSocket support for live data synchronization

## Authentication
Most endpoints require authentication using a Bearer token. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes
- **General endpoints**: 100 requests per minute
- **Bulk operations**: 10 requests per hour

## Error Responses
All endpoints return errors in a consistent format:
\`\`\`json
{
  "success": false,
  "message": "Error message description",
  "error": "ERROR_CODE"
}
\`\`\`

## Pagination
List endpoints support pagination with these query parameters:
- \`page\` (default: 1) - Page number
- \`limit\` (default: 20) - Items per page
      `,
      contact: {
        name: 'API Support',
        email: 'support@rezapp.com',
        url: 'https://rezapp.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://staging-api.rezapp.com',
        description: 'Staging server'
      },
      {
        url: 'https://api.rezapp.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from login endpoint. Format: Bearer <token>'
        }
      },
      schemas: {
        // Error Response
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message description'
            },
            error: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },

        // Pagination
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1,
              description: 'Current page number'
            },
            limit: {
              type: 'number',
              example: 20,
              description: 'Items per page'
            },
            total: {
              type: 'number',
              example: 100,
              description: 'Total number of items'
            },
            pages: {
              type: 'number',
              example: 5,
              description: 'Total number of pages'
            }
          }
        },

        // Merchant
        Merchant: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Merchant unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'merchant@example.com'
            },
            name: {
              type: 'string',
              example: 'John Doe'
            },
            businessName: {
              type: 'string',
              example: "John's Store"
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            avatar: {
              type: 'string',
              example: 'https://example.com/avatar.jpg'
            },
            isEmailVerified: {
              type: 'boolean',
              example: true
            },
            onboarding: {
              $ref: '#/components/schemas/OnboardingStatus'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Onboarding Status
        OnboardingStatus: {
          type: 'object',
          properties: {
            isComplete: {
              type: 'boolean',
              example: false
            },
            currentStep: {
              type: 'number',
              example: 1,
              description: 'Current onboarding step (1-16)'
            },
            completedSteps: {
              type: 'array',
              items: {
                type: 'number'
              },
              example: [1, 2, 3]
            },
            businessInfo: {
              type: 'object',
              properties: {
                businessType: { type: 'string', example: 'retail' },
                category: { type: 'string', example: 'fashion' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' }
              }
            },
            bankingInfo: {
              type: 'object',
              properties: {
                accountNumber: { type: 'string' },
                ifscCode: { type: 'string' },
                accountHolderName: { type: 'string' }
              }
            },
            taxInfo: {
              type: 'object',
              properties: {
                gstNumber: { type: 'string' },
                panNumber: { type: 'string' }
              }
            }
          }
        },

        // Product
        Product: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Premium T-Shirt'
            },
            description: {
              type: 'string',
              example: 'High quality cotton t-shirt with modern design'
            },
            price: {
              type: 'number',
              example: 29.99
            },
            compareAtPrice: {
              type: 'number',
              example: 39.99,
              description: 'Original price for showing discounts'
            },
            costPrice: {
              type: 'number',
              example: 15.00,
              description: 'Cost price for profit calculations'
            },
            sku: {
              type: 'string',
              example: 'TSH-BLU-M'
            },
            barcode: {
              type: 'string',
              example: '1234567890123'
            },
            inventory: {
              type: 'number',
              example: 100
            },
            lowStockThreshold: {
              type: 'number',
              example: 10
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
            },
            category: {
              type: 'string',
              example: 'Clothing'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['fashion', 'summer', 'casual']
            },
            variants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ProductVariant'
              }
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            isFeatured: {
              type: 'boolean',
              example: false
            },
            merchantId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Product Variant
        ProductVariant: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            type: {
              type: 'string',
              example: 'size',
              description: 'Variant type (e.g., size, color, material)'
            },
            value: {
              type: 'string',
              example: 'Medium'
            },
            sku: {
              type: 'string',
              example: 'TSH-BLU-M'
            },
            price: {
              type: 'number',
              example: 29.99
            },
            stock: {
              type: 'number',
              example: 50
            },
            image: {
              type: 'string',
              example: 'https://example.com/variant.jpg'
            }
          }
        },

        // Order
        Order: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            orderNumber: {
              type: 'string',
              example: 'ORD-2025-001'
            },
            customerId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            customerName: {
              type: 'string',
              example: 'Jane Smith'
            },
            customerEmail: {
              type: 'string',
              example: 'jane@example.com'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem'
              }
            },
            subtotal: {
              type: 'number',
              example: 99.99
            },
            tax: {
              type: 'number',
              example: 8.00
            },
            shipping: {
              type: 'number',
              example: 5.00
            },
            total: {
              type: 'number',
              example: 112.99
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
              example: 'pending'
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'paid', 'failed', 'refunded'],
              example: 'paid'
            },
            shippingAddress: {
              $ref: '#/components/schemas/Address'
            },
            trackingNumber: {
              type: 'string',
              example: 'TRK123456789'
            },
            merchantId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Order Item
        OrderItem: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            productName: {
              type: 'string',
              example: 'Premium T-Shirt'
            },
            variantId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            variantName: {
              type: 'string',
              example: 'Medium - Blue'
            },
            quantity: {
              type: 'number',
              example: 2
            },
            price: {
              type: 'number',
              example: 29.99
            },
            total: {
              type: 'number',
              example: 59.98
            }
          }
        },

        // Address
        Address: {
          type: 'object',
          properties: {
            street: {
              type: 'string',
              example: '123 Main St'
            },
            city: {
              type: 'string',
              example: 'New York'
            },
            state: {
              type: 'string',
              example: 'NY'
            },
            zipCode: {
              type: 'string',
              example: '10001'
            },
            country: {
              type: 'string',
              example: 'USA'
            }
          }
        },

        // Team Member
        TeamMember: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'string',
              example: 'team@example.com'
            },
            name: {
              type: 'string',
              example: 'Team Member'
            },
            role: {
              type: 'string',
              enum: ['owner', 'admin', 'manager', 'staff'],
              example: 'staff'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['products:read', 'orders:read']
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'suspended'],
              example: 'active'
            },
            invitedBy: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // Analytics Summary
        AnalyticsSummary: {
          type: 'object',
          properties: {
            revenue: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 12500.50 },
                trend: { type: 'number', example: 15.5, description: 'Percentage change' },
                comparison: { type: 'string', example: 'vs last month' }
              }
            },
            orders: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 245 },
                trend: { type: 'number', example: 8.3 },
                comparison: { type: 'string', example: 'vs last month' }
              }
            },
            products: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 150 },
                active: { type: 'number', example: 142 },
                lowStock: { type: 'number', example: 8 }
              }
            },
            customers: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 1250 },
                new: { type: 'number', example: 35 },
                returning: { type: 'number', example: 210 }
              }
            }
          }
        },

        // Audit Log
        AuditLog: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            action: {
              type: 'string',
              example: 'product:update',
              description: 'Action type in format resource:action'
            },
            merchantId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            userName: {
              type: 'string',
              example: 'John Doe'
            },
            resourceType: {
              type: 'string',
              example: 'product'
            },
            resourceId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            changes: {
              type: 'object',
              description: 'Details of what changed'
            },
            ipAddress: {
              type: 'string',
              example: '192.168.1.1'
            },
            userAgent: {
              type: 'string',
              example: 'Mozilla/5.0...'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Merchant authentication and account management'
      },
      {
        name: 'Onboarding',
        description: 'Merchant onboarding process (16 steps)'
      },
      {
        name: 'Products',
        description: 'Product management and inventory'
      },
      {
        name: 'Variants',
        description: 'Product variant management'
      },
      {
        name: 'Orders',
        description: 'Order processing and management'
      },
      {
        name: 'Analytics',
        description: 'Sales analytics and reporting'
      },
      {
        name: 'Team',
        description: 'Team member and role management'
      },
      {
        name: 'Audit',
        description: 'Audit logs and activity tracking'
      },
      {
        name: 'Dashboard',
        description: 'Merchant dashboard data'
      },
      {
        name: 'Categories',
        description: 'Product category management'
      },
      {
        name: 'Uploads',
        description: 'File upload management'
      },
      {
        name: 'Cashback',
        description: 'Cashback and rewards'
      },
      {
        name: 'Sync',
        description: 'Data synchronization'
      },
      {
        name: 'Reviews',
        description: 'Product reviews management'
      },
      {
        name: 'Bulk Operations',
        description: 'Bulk import/export operations'
      }
    ]
  },
  apis: [
    './src/merchantroutes/*.ts',
    './src/models/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
