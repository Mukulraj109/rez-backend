// Test script for loyalty points credit endpoint
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001';

// Replace with a valid token from your app
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVmNGQ0MTA2MWZhYWYwNDUyMjI1MDYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MTYzNzk0MiwiZXhwIjoxNzYxNzI0MzQyfQ.d_RKprSZO8CT-7v9HUzwVpHPLXWVpCeaIY-2udc9FCI';

async function testCreditLoyaltyPoints() {
  console.log('🧪 Testing credit loyalty points endpoint...\n');

  try {
    // Step 1: Get current wallet balance
    console.log('📊 Step 1: Getting current wallet balance...');
    const balanceResponse = await fetch(`${BASE_URL}/api/wallet/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    const balanceData = await balanceResponse.json();
    console.log('✅ Current balance:', JSON.stringify(balanceData, null, 2));

    const currentWasilCoins = balanceData.data?.coins?.find(c => c.type === 'wasil')?.amount || 0;
    console.log(`💎 Current Wasil Coins: ${currentWasilCoins}\n`);

    // Step 2: Credit 50 loyalty points
    console.log('📊 Step 2: Crediting 50 loyalty points...');
    const creditResponse = await fetch(`${BASE_URL}/api/wallet/credit-loyalty-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({
        amount: 50,
        source: {
          type: 'test',
          description: 'Test credit from script'
        }
      })
    });

    const creditData = await creditResponse.json();
    console.log('✅ Credit response:', JSON.stringify(creditData, null, 2));

    if (creditData.success) {
      const newWasilCoins = creditData.data?.coins?.find(c => c.type === 'wasil')?.amount || 0;
      console.log(`\n💎 New Wasil Coins: ${newWasilCoins}`);
      console.log(`🎯 Difference: +${newWasilCoins - currentWasilCoins}`);
    }

    // Step 3: Verify balance again
    console.log('\n📊 Step 3: Verifying balance again...');
    const verifyResponse = await fetch(`${BASE_URL}/api/wallet/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    const verifyData = await verifyResponse.json();
    const finalWasilCoins = verifyData.data?.coins?.find(c => c.type === 'wasil')?.amount || 0;
    console.log(`💎 Final Wasil Coins: ${finalWasilCoins}`);
    console.log(`\n${finalWasilCoins > currentWasilCoins ? '✅' : '❌'} Test ${finalWasilCoins > currentWasilCoins ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

// Instructions
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Loyalty Points Credit Test Script                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');
console.log('📝 Instructions:');
console.log('1. Make sure the backend is running on http://localhost:5001');
console.log('2. Get a valid auth token from the browser console');
console.log('3. Replace AUTH_TOKEN in this file with your token');
console.log('4. Run: node test-loyalty-credit.js\n');

if (AUTH_TOKEN === 'YOUR_TOKEN_HERE') {
  console.log('⚠️  Please set AUTH_TOKEN in the script first!');
  console.log('\nTo get your auth token:');
  console.log('1. Open the app in browser');
  console.log('2. Open browser console (F12)');
  console.log('3. Look for API requests and copy the Bearer token');
  console.log('4. Or check localStorage for the auth token\n');
} else {
  testCreditLoyaltyPoints();
}

