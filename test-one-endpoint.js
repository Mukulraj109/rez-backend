const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testOneEndpoint() {
  console.log('\n🧪 Testing Single Endpoint\n');
  console.log('========================================');
  console.log('Endpoint: POST /api/merchant/notifications/mark-all-read');
  console.log('========================================\n');

  // First register and login
  console.log('Step 1: Registering merchant...');
  const registerData = {
    businessName: 'Debug Test Store',
    ownerName: 'Debug Owner',
    email: `debug-${Date.now()}@example.com`,
    phone: '+919999999999',
    password: 'Test@123456',
    businessAddress: {
      street: '123 Test Street',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    }
  };

  try {
    const registerResponse = await axios.post(`${BASE_URL}/api/merchant/auth/register`, registerData);
    const token = registerResponse.data.data.token;
    console.log('✅ Registration successful');
    console.log('✅ Token obtained\n');

    console.log('Step 2: Calling the failing endpoint...');
    console.log('⏳ Sending POST to /api/merchant/notifications/mark-all-read with null body\n');
    console.log('👀 NOW CHECK YOUR BACKEND CONSOLE FOR ERRORS!\n');
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const response = await axios({
        method: 'post',
        url: `${BASE_URL}/api/merchant/notifications/mark-all-read`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: null
      });

      console.log('\n✅ SUCCESS! Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('\n❌ ERROR! Status:', error.response?.status || 'NO RESPONSE');
      console.log('Error Details:', JSON.stringify(error.response?.data || error.message, null, 2));
      console.log('\n📋 Full Error Object:');
      console.log(error.response?.data);
    }

  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
  }

  console.log('\n========================================');
  console.log('Test completed. Check backend console above for the error trace.');
  console.log('========================================\n');
}

testOneEndpoint();
