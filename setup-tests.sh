#!/bin/bash

# Test Suite Setup Script
# Installs required dependencies and prepares the test environment

echo "🔧 Setting up test environment..."
echo ""

# Install chalk if not already installed
echo "📦 Installing required dependencies..."
npm install --save-dev chalk

echo ""
echo "✅ Test environment setup complete!"
echo ""
echo "You can now run tests using:"
echo "  - node run-all-tests.js          # Run all tests with comprehensive report"
echo "  - node test-relationships.js     # Test database relationships only"
echo "  - node test-data-quality.js      # Test data quality only"
echo "  - node test-api-endpoints.js     # Test API endpoints only"
echo ""
echo "⚠️  Important:"
echo "  - Make sure MongoDB is running before running tests"
echo "  - Make sure backend server is running for API endpoint tests"
echo "  - Update .env file with correct MONGODB_URI and API_BASE_URL"
echo ""
