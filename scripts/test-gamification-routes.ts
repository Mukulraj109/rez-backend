import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVmNGQ0MTA2MWZhYWYwNDUyMjI1MDYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2MTI4NDA4NiwiZXhwIjoxNzYxMzcwNDg2fQ.Egd9J4T-i-mOrH2qPqUWpJew4MjKOFCQluepqnhuSm4';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

async function testEndpoint(method: string, endpoint: string, data?: any) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers,
      data
    };

    const response = await axios(config);

    results.push({
      endpoint,
      method,
      status: 'PASS',
      statusCode: response.status,
      response: response.data
    });

    console.log(`✅ ${method} ${endpoint} - ${response.status}`);
    return response.data;
  } catch (error: any) {
    results.push({
      endpoint,
      method,
      status: 'FAIL',
      statusCode: error.response?.status,
      error: error.response?.data?.message || error.message
    });

    console.log(`❌ ${method} ${endpoint} - ${error.response?.status || 'ERROR'}: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING GAMIFICATION ROUTES\n');
  console.log('='.repeat(60));

  // Challenges
  console.log('\n🎯 Testing Challenges:');
  await testEndpoint('GET', '/gamification/challenges');
  await testEndpoint('GET', '/gamification/challenges/active');

  // Achievements
  console.log('\n🏆 Testing Achievements:');
  await testEndpoint('GET', '/gamification/achievements');
  const userId = '68ef4d41061faaf045222506';
  await testEndpoint('GET', `/gamification/achievements/user/${userId}`);

  // Badges
  console.log('\n🎖️ Testing Badges:');
  await testEndpoint('GET', '/gamification/badges');
  await testEndpoint('GET', `/gamification/badges/user/${userId}`);

  // Leaderboard
  console.log('\n🏅 Testing Leaderboard:');
  await testEndpoint('GET', '/gamification/leaderboard?type=spending&period=weekly&limit=10');
  await testEndpoint('GET', `/gamification/leaderboard/rank/${userId}`);

  // Coins
  console.log('\n💰 Testing Coins System:');
  await testEndpoint('GET', '/gamification/coins/balance');
  await testEndpoint('GET', '/gamification/coins/transactions');

  // Daily Streak
  console.log('\n🔥 Testing Daily Streak:');
  await testEndpoint('GET', `/gamification/streak/${userId}`);

  // Mini-Games
  console.log('\n🎮 Testing Mini-Games:');

  // Spin Wheel
  await testEndpoint('GET', '/gamification/spin-wheel/eligibility');
  await testEndpoint('POST', '/gamification/spin-wheel/create');

  // Scratch Card
  await testEndpoint('POST', '/gamification/scratch-card/create');

  // Quiz (only test progress, don't start a new quiz)
  // await testEndpoint('POST', '/gamification/quiz/start', { quizId: 'test-quiz-1' });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 GAMIFICATION ROUTES TEST SUMMARY\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`);

  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}`);
      console.log(`    Status: ${r.statusCode}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
