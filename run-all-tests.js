/**
 * Master Test Runner
 * Runs all test suites and generates a comprehensive report
 */

const { exec } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');

const printHeader = (title) => {
  console.log('\n' + chalk.cyan('═'.repeat(70)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(70)) + '\n');
};

const runCommand = (command, description) => {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`\n🏃 Running: ${description}...`));
    console.log(chalk.gray(`   Command: ${command}\n`));

    const startTime = Date.now();
    const process = exec(command);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data;
      console.log(data);
    });

    process.stderr.on('data', (data) => {
      stderr += data;
      console.error(chalk.red(data));
    });

    process.on('close', (code) => {
      const duration = Date.now() - startTime;
      if (code === 0) {
        console.log(chalk.green(`\n✅ ${description} completed in ${duration}ms\n`));
        resolve({ success: true, duration, stdout, stderr });
      } else {
        console.log(chalk.red(`\n❌ ${description} failed with code ${code}\n`));
        resolve({ success: false, duration, stdout, stderr, exitCode: code });
      }
    });

    process.on('error', (error) => {
      console.log(chalk.red(`\n❌ ${description} error: ${error.message}\n`));
      reject(error);
    });
  });
};

async function runAllTests() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  printHeader('🧪 COMPREHENSIVE TEST SUITE - STARTING ALL TESTS');

  console.log(chalk.yellow('⚠️  Important Notes:'));
  console.log(chalk.gray('   - Make sure MongoDB is running'));
  console.log(chalk.gray('   - Make sure backend server is running for API tests'));
  console.log(chalk.gray('   - Tests will run sequentially to avoid conflicts\n'));

  // Test 1: Relationship Integrity
  printHeader('TEST 1/3: RELATIONSHIP INTEGRITY');
  const test1 = await runCommand(
    'node test-relationships.js',
    'Relationship Integrity Tests'
  );
  results.tests.push({
    name: 'Relationship Integrity',
    ...test1
  });

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Data Quality
  printHeader('TEST 2/3: DATA QUALITY');
  const test2 = await runCommand(
    'node test-data-quality.js',
    'Data Quality Tests'
  );
  results.tests.push({
    name: 'Data Quality',
    ...test2
  });

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: API Endpoints
  printHeader('TEST 3/3: API ENDPOINTS');
  const test3 = await runCommand(
    'node test-api-endpoints.js',
    'API Endpoint Tests'
  );
  results.tests.push({
    name: 'API Endpoints',
    ...test3
  });

  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.success).length;
  results.summary.failed = results.tests.filter(t => !t.success).length;

  // Print final summary
  printHeader('📊 FINAL TEST SUMMARY');

  console.log(`Total Test Suites: ${chalk.cyan(results.summary.total)}`);
  console.log(`Passed: ${chalk.green(results.summary.passed)}`);
  console.log(`Failed: ${chalk.red(results.summary.failed)}`);
  console.log('');

  // Test suite details
  console.log(chalk.bold('Test Suite Results:'));
  for (const test of results.tests) {
    const status = test.success ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
    const duration = (test.duration / 1000).toFixed(2);
    console.log(`   ${status} - ${chalk.cyan(test.name)} (${duration}s)`);
  }
  console.log('');

  // Load individual test results
  console.log(chalk.bold('Detailed Results:'));
  console.log('');

  try {
    // Relationship test results
    if (fs.existsSync('./test-results-relationships.json')) {
      const relResults = JSON.parse(fs.readFileSync('./test-results-relationships.json', 'utf8'));
      console.log(chalk.cyan('   Relationship Integrity:'));
      console.log(`      Overall Health: ${relResults.overallHealth >= 95 ? chalk.green(relResults.overallHealth + '%') : chalk.yellow(relResults.overallHealth + '%')}`);
      console.log(`      Tests: ${relResults.tests.length}`);
      const brokenLinks = relResults.tests.reduce((sum, t) => sum + t.brokenLinks, 0);
      console.log(`      Broken Links: ${brokenLinks > 0 ? chalk.red(brokenLinks) : chalk.green('0')}`);
      console.log('');
    }

    // Data quality results
    if (fs.existsSync('./test-results-data-quality.json')) {
      const qualityResults = JSON.parse(fs.readFileSync('./test-results-data-quality.json', 'utf8'));
      console.log(chalk.cyan('   Data Quality:'));
      console.log(`      Collections Tested: ${qualityResults.collections.length}`);
      console.log(`      Issues Found: ${qualityResults.issues.length > 0 ? chalk.yellow(qualityResults.issues.length) : chalk.green('0')}`);
      const passedCollections = qualityResults.collections.filter(c => c.status === 'PASSED').length;
      console.log(`      Clean Collections: ${chalk.green(passedCollections)}/${qualityResults.collections.length}`);
      console.log('');
    }

    // API endpoint results
    if (fs.existsSync('./test-results-api-endpoints.json')) {
      const apiResults = JSON.parse(fs.readFileSync('./test-results-api-endpoints.json', 'utf8'));
      console.log(chalk.cyan('   API Endpoints:'));
      console.log(`      Total Endpoints: ${apiResults.endpoints.length}`);
      console.log(`      Passed: ${chalk.green(apiResults.passed)}`);
      console.log(`      Failed: ${apiResults.failed > 0 ? chalk.red(apiResults.failed) : chalk.green('0')}`);
      const avgTime = apiResults.endpoints
        .filter(e => e.responseTime)
        .reduce((sum, e) => sum + e.responseTime, 0) / apiResults.endpoints.filter(e => e.responseTime).length;
      console.log(`      Avg Response Time: ${chalk.cyan(avgTime.toFixed(2) + 'ms')}`);
      console.log('');
    }
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  Could not load detailed results'));
  }

  // Overall status
  if (results.summary.failed === 0) {
    console.log(chalk.green.bold('✅ ALL TEST SUITES PASSED!'));
    console.log(chalk.green('   Your application is ready for production! 🚀'));
  } else {
    console.log(chalk.yellow.bold('⚠️  SOME TEST SUITES FAILED'));
    console.log(chalk.yellow('   Please review the failed tests and fix issues before deployment.'));
  }

  console.log('\n' + chalk.cyan('═'.repeat(70)) + '\n');

  // Save master results
  fs.writeFileSync(
    './test-results-master.json',
    JSON.stringify(results, null, 2)
  );
  console.log(chalk.green('✅ Master test results saved to test-results-master.json'));

  // Generate HTML report
  generateHtmlReport(results);

  console.log('');
}

function generateHtmlReport(results) {
  let relationshipData = {};
  let qualityData = {};
  let apiData = {};

  try {
    if (fs.existsSync('./test-results-relationships.json')) {
      relationshipData = JSON.parse(fs.readFileSync('./test-results-relationships.json', 'utf8'));
    }
    if (fs.existsSync('./test-results-data-quality.json')) {
      qualityData = JSON.parse(fs.readFileSync('./test-results-data-quality.json', 'utf8'));
    }
    if (fs.existsSync('./test-results-api-endpoints.json')) {
      apiData = JSON.parse(fs.readFileSync('./test-results-api-endpoints.json', 'utf8'));
    }
  } catch (error) {
    console.log(chalk.yellow('   ⚠️  Could not load some test results for HTML report'));
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        .summary { background: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .stat { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
        .stat-label { opacity: 0.9; font-size: 14px; }
        .section { background: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h2 { color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; color: #555; }
        .success { color: #10b981; font-weight: bold; }
        .warning { color: #f59e0b; font-weight: bold; }
        .error { color: #ef4444; font-weight: bold; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-error { background: #fee2e2; color: #991b1b; }
        .timestamp { color: #666; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Comprehensive Test Results Report</h1>
        <p class="timestamp">Generated: ${new Date(results.timestamp).toLocaleString()}</p>

        <div class="summary">
            <h2>Overall Summary</h2>
            <div class="stat-grid">
                <div class="stat">
                    <div class="stat-value">${results.summary.total}</div>
                    <div class="stat-label">Test Suites</div>
                </div>
                <div class="stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="stat-value">${results.summary.passed}</div>
                    <div class="stat-label">Passed</div>
                </div>
                <div class="stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="stat-value">${results.summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="stat-value">${relationshipData.overallHealth || 'N/A'}%</div>
                    <div class="stat-label">DB Health</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Test Suite Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Status</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.tests.map(test => `
                        <tr>
                            <td>${test.name}</td>
                            <td><span class="badge ${test.success ? 'badge-success' : 'badge-error'}">${test.success ? '✅ PASSED' : '❌ FAILED'}</span></td>
                            <td>${(test.duration / 1000).toFixed(2)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${relationshipData.tests ? `
        <div class="section">
            <h2>Relationship Integrity (${relationshipData.overallHealth}%)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Relationship</th>
                        <th>Total Records</th>
                        <th>Valid Links</th>
                        <th>Broken Links</th>
                        <th>Health</th>
                    </tr>
                </thead>
                <tbody>
                    ${relationshipData.tests.map(test => `
                        <tr>
                            <td>${test.name}</td>
                            <td>${test.total}</td>
                            <td class="success">${test.validLinks}</td>
                            <td class="${test.brokenLinks > 0 ? 'error' : 'success'}">${test.brokenLinks}</td>
                            <td><span class="badge ${test.brokenLinks === 0 ? 'badge-success' : 'badge-warning'}">${test.percentage}%</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${qualityData.collections ? `
        <div class="section">
            <h2>Data Quality</h2>
            <table>
                <thead>
                    <tr>
                        <th>Collection</th>
                        <th>Total Records</th>
                        <th>Issues Found</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${qualityData.collections.map(col => `
                        <tr>
                            <td>${col.collection}</td>
                            <td>${col.total}</td>
                            <td class="${col.issues > 0 ? 'warning' : 'success'}">${col.issues}</td>
                            <td><span class="badge ${col.status === 'PASSED' ? 'badge-success' : 'badge-warning'}">${col.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${apiData.endpoints ? `
        <div class="section">
            <h2>API Endpoints (${apiData.passed}/${apiData.passed + apiData.failed} passed)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Response Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${apiData.endpoints.slice(0, 50).map(endpoint => `
                        <tr>
                            <td>${endpoint.endpoint}</td>
                            <td><span class="badge badge-${endpoint.method === 'GET' ? 'success' : 'warning'}">${endpoint.method}</span></td>
                            <td><span class="badge ${endpoint.status === 'PASSED' ? 'badge-success' : 'badge-error'}">${endpoint.status}</span></td>
                            <td>${endpoint.responseTime ? endpoint.responseTime + 'ms' : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    </div>
</body>
</html>
  `;

  fs.writeFileSync('./test-results-report.html', html);
  console.log(chalk.green('✅ HTML report generated: test-results-report.html'));
  console.log(chalk.gray('   Open this file in your browser to view detailed results'));
}

// Run all tests
runAllTests().catch(error => {
  console.error(chalk.red('❌ Test runner failed:'), error);
  process.exit(1);
});
