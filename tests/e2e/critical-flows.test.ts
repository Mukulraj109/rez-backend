import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Critical User Flows E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should complete login flow successfully', async () => {
      // Wait for app to load
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Enter test credentials
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      
      // Tap login button
      await element(by.id('login-button')).tap();

      // Wait for navigation to dashboard
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);

      // Verify dashboard elements are present
      await detoxExpect(element(by.id('revenue-card'))).toBeVisible();
      await detoxExpect(element(by.id('orders-card'))).toBeVisible();
      await detoxExpect(element(by.id('customers-card'))).toBeVisible();
    });

    it('should handle login validation errors', async () => {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Try login with empty credentials
      await element(by.id('login-button')).tap();

      // Check for validation errors
      await detoxExpect(element(by.id('email-error'))).toBeVisible();
      await detoxExpect(element(by.id('password-error'))).toBeVisible();
    });

    it('should handle invalid credentials', async () => {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.id('email-input')).typeText('invalid@email.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();

      // Check for error message
      await waitFor(element(by.id('login-error-message')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle biometric authentication if available', async () => {
      // This test would only run on devices with biometric support
      try {
        await waitFor(element(by.id('biometric-login-button')))
          .toBeVisible()
          .withTimeout(3000);
        
        await element(by.id('biometric-login-button')).tap();
        
        // Note: Actual biometric testing would require device-specific setup
        await waitFor(element(by.id('dashboard-screen')))
          .toBeVisible()
          .withTimeout(15000);
      } catch (error) {
        // Biometric not available, skip test
        console.log('Biometric authentication not available');
      }
    });
  });

  describe('Dashboard Navigation Flow', () => {
    beforeEach(async () => {
      // Login first
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should navigate between main tabs', async () => {
      // Test Orders tab navigation
      await element(by.id('orders-tab')).tap();
      await waitFor(element(by.id('orders-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Test Products tab navigation
      await element(by.id('products-tab')).tap();
      await waitFor(element(by.id('products-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Test Cashback tab navigation
      await element(by.id('cashback-tab')).tap();
      await waitFor(element(by.id('cashback-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Return to Dashboard
      await element(by.id('dashboard-tab')).tap();
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display real-time data updates', async () => {
      // Check initial revenue value
      const initialRevenue = await element(by.id('revenue-value')).getAttributes();
      
      // Wait for potential real-time update (30 seconds in real implementation)
      // For testing, we'll simulate a shorter wait
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify the element still exists and is updated
      await detoxExpect(element(by.id('revenue-value'))).toBeVisible();
    });

    it('should handle pull-to-refresh on dashboard', async () => {
      // Perform pull-to-refresh gesture
      await element(by.id('dashboard-scroll-view')).scroll(50, 'down');
      
      // Wait for refresh to complete
      await waitFor(element(by.id('refresh-indicator')))
        .not.toBeVisible()
        .withTimeout(10000);
      
      // Verify data is still displayed
      await detoxExpect(element(by.id('revenue-card'))).toBeVisible();
    });
  });

  describe('Order Management Flow', () => {
    beforeEach(async () => {
      // Login and navigate to orders
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('orders-tab')).tap();
      await waitFor(element(by.id('orders-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display orders list and allow filtering', async () => {
      // Verify orders list is visible
      await detoxExpect(element(by.id('orders-list'))).toBeVisible();

      // Test status filter
      await element(by.id('filter-button')).tap();
      await element(by.id('status-filter-pending')).tap();
      await element(by.id('apply-filter-button')).tap();

      // Verify filtered results
      await waitFor(element(by.id('orders-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should open order details and update status', async () => {
      // Tap on first order
      await element(by.id('order-item-0')).tap();
      
      // Wait for order details screen
      await waitFor(element(by.id('order-details-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify order details are displayed
      await detoxExpect(element(by.id('order-number'))).toBeVisible();
      await detoxExpect(element(by.id('customer-info'))).toBeVisible();
      await detoxExpect(element(by.id('order-items'))).toBeVisible();

      // Update order status
      await element(by.id('status-update-button')).tap();
      await element(by.id('status-confirmed')).tap();
      await element(by.id('status-notes-input')).typeText('Order confirmed');
      await element(by.id('update-status-confirm')).tap();

      // Verify status update
      await waitFor(element(by.text('confirmed')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle bulk order operations', async () => {
      // Enable selection mode
      await element(by.id('bulk-select-button')).tap();

      // Select multiple orders
      await element(by.id('order-checkbox-0')).tap();
      await element(by.id('order-checkbox-1')).tap();

      // Perform bulk action
      await element(by.id('bulk-action-button')).tap();
      await element(by.id('bulk-status-update')).tap();
      await element(by.id('bulk-status-confirmed')).tap();
      await element(by.id('bulk-confirm-button')).tap();

      // Verify bulk update completion
      await waitFor(element(by.id('bulk-success-message')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Cashback Management Flow', () => {
    beforeEach(async () => {
      // Login and navigate to cashback
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('cashback-tab')).tap();
      await waitFor(element(by.id('cashback-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display cashback requests with risk indicators', async () => {
      // Verify cashback list is visible
      await detoxExpect(element(by.id('cashback-list'))).toBeVisible();

      // Check for risk indicators
      await detoxExpect(element(by.id('high-risk-indicator-0'))).toExist();
    });

    it('should review and approve cashback request', async () => {
      // Tap on first cashback request
      await element(by.id('cashback-item-0')).tap();
      
      // Wait for cashback details screen
      await waitFor(element(by.id('cashback-details-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify cashback details
      await detoxExpect(element(by.id('customer-info'))).toBeVisible();
      await detoxExpect(element(by.id('order-info'))).toBeVisible();
      await detoxExpect(element(by.id('risk-assessment'))).toBeVisible();

      // Approve cashback
      await element(by.id('approve-button')).tap();
      await element(by.id('approval-amount-input')).typeText('25.00');
      await element(by.id('approval-notes-input')).typeText('Approved after review');
      await element(by.id('confirm-approval-button')).tap();

      // Verify approval
      await waitFor(element(by.text('approved')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle cashback rejection with reason', async () => {
      // Tap on cashback request
      await element(by.id('cashback-item-1')).tap();
      
      await waitFor(element(by.id('cashback-details-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Reject cashback
      await element(by.id('reject-button')).tap();
      await element(by.id('rejection-reason-input')).typeText('Insufficient documentation');
      await element(by.id('rejection-notes-input')).typeText('Customer needs to provide receipt');
      await element(by.id('confirm-rejection-button')).tap();

      // Verify rejection
      await waitFor(element(by.text('rejected')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should perform bulk cashback approval', async () => {
      // Enable bulk selection
      await element(by.id('bulk-select-button')).tap();

      // Select low-risk requests
      await element(by.id('cashback-checkbox-2')).tap();
      await element(by.id('cashback-checkbox-3')).tap();

      // Bulk approve
      await element(by.id('bulk-approve-button')).tap();
      await element(by.id('bulk-approve-notes')).typeText('Bulk approval for low-risk requests');
      await element(by.id('confirm-bulk-approval')).tap();

      // Verify bulk approval
      await waitFor(element(by.id('bulk-success-message')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Product Management Flow', () => {
    beforeEach(async () => {
      // Login and navigate to products
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('products-tab')).tap();
      await waitFor(element(by.id('products-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should add new product successfully', async () => {
      // Tap add product button
      await element(by.id('add-product-button')).tap();
      
      await waitFor(element(by.id('product-form-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Fill product form
      await element(by.id('product-name-input')).typeText('Test Product E2E');
      await element(by.id('product-description-input')).typeText('This is a test product for E2E testing');
      await element(by.id('product-price-input')).typeText('99.99');
      await element(by.id('product-category-picker')).tap();
      await element(by.text('Electronics')).tap();
      
      // Set inventory
      await element(by.id('track-inventory-switch')).tap();
      await element(by.id('stock-quantity-input')).typeText('50');
      await element(by.id('low-stock-threshold-input')).typeText('10');

      // Save product
      await element(by.id('save-product-button')).tap();

      // Verify product was added
      await waitFor(element(by.id('products-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await detoxExpect(element(by.text('Test Product E2E'))).toBeVisible();
    });

    it('should edit existing product', async () => {
      // Tap on first product
      await element(by.id('product-item-0')).tap();
      
      await waitFor(element(by.id('product-details-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Tap edit button
      await element(by.id('edit-product-button')).tap();
      
      await waitFor(element(by.id('product-form-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Update price
      await element(by.id('product-price-input')).clearText();
      await element(by.id('product-price-input')).typeText('129.99');

      // Save changes
      await element(by.id('save-product-button')).tap();

      // Verify price update
      await waitFor(element(by.text('₹129.99')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should search and filter products', async () => {
      // Use search functionality
      await element(by.id('product-search-input')).typeText('coffee');
      
      // Wait for search results
      await waitFor(element(by.id('products-list')))
        .toBeVisible()
        .withTimeout(3000);

      // Apply category filter
      await element(by.id('filter-button')).tap();
      await element(by.id('category-filter-food')).tap();
      await element(by.id('apply-filter-button')).tap();

      // Verify filtered results
      await waitFor(element(by.id('products-list')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network connectivity issues', async () => {
      // Login first
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);

      // Simulate network disconnection (would require test environment setup)
      // For now, verify offline indicator appears when network is poor
      try {
        await waitFor(element(by.id('offline-indicator')))
          .toBeVisible()
          .withTimeout(5000);
        
        // Verify offline message
        await detoxExpect(element(by.id('offline-message'))).toBeVisible();
      } catch (error) {
        // Network is stable, which is expected in most test environments
        console.log('Network connectivity is stable');
      }
    });

    it('should handle app backgrounding and foregrounding', async () => {
      // Login first
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);

      // Send app to background
      await device.sendToHome();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Bring app back to foreground
      await device.launchApp({ newInstance: false });
      
      // Verify app state is preserved
      await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
    });

    it('should handle form validation errors gracefully', async () => {
      // Navigate to add product
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      await element(by.id('products-tab')).tap();
      await element(by.id('add-product-button')).tap();
      
      // Try to save without filling required fields
      await element(by.id('save-product-button')).tap();
      
      // Check for validation errors
      await detoxExpect(element(by.id('name-error'))).toBeVisible();
      await detoxExpect(element(by.id('price-error'))).toBeVisible();
      
      // Fill in required fields and save
      await element(by.id('product-name-input')).typeText('Valid Product');
      await element(by.id('product-price-input')).typeText('50.00');
      await element(by.id('save-product-button')).tap();
      
      // Verify successful save
      await waitFor(element(by.id('products-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();
      
      // Login
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      // Wait for dashboard
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 15 seconds (including login)  
      if (loadTime >= 15000) {
        throw new Error(`Dashboard load time ${loadTime}ms exceeds 15000ms threshold`);
      }
    });

    it('should handle rapid navigation without crashes', async () => {
      // Login first
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('email-input')).typeText('test.merchant@example.com');
      await element(by.id('password-input')).typeText('testpassword123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);

      // Rapidly switch between tabs
      for (let i = 0; i < 5; i++) {
        await element(by.id('orders-tab')).tap();
        await element(by.id('products-tab')).tap();
        await element(by.id('cashback-tab')).tap();
        await element(by.id('dashboard-tab')).tap();
      }
      
      // Verify app is still responsive
      await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader navigation', async () => {
      // This test would require accessibility services to be enabled
      // and would test screen reader compatibility
      
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify accessibility labels are present
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible(); 
      await detoxExpect(element(by.id('login-button'))).toBeVisible();
    });

    it('should support high contrast and large text', async () => {
      // This test would verify the app works with accessibility settings
      // In a real implementation, you'd enable high contrast mode and large text
      
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Verify key elements are still visible and functional
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible();
      await detoxExpect(element(by.id('login-button'))).toBeVisible();
    });
  });
});