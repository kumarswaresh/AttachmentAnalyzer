import fs from 'fs';
import http from 'http';

// Fetch swagger.json and extract all endpoints
async function getSwaggerEndpoints() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5000/api-docs/swagger.json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const swagger = JSON.parse(data);
          const endpoints = [];
          
          for (const [path, methods] of Object.entries(swagger.paths || {})) {
            for (const [method, details] of Object.entries(methods)) {
              if (method.toUpperCase() === 'GET') {
                endpoints.push({
                  method: method.toUpperCase(),
                  path: path,
                  summary: details.summary || '',
                  tags: details.tags || []
                });
              }
            }
          }
          
          resolve(endpoints.sort((a, b) => a.path.localeCompare(b.path)));
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
  });
}

// Test a single endpoint
async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Authorization': 'Bearer wLqlM_otVQyp1SCCrlrWsarhP94HpKYA',
        'Content-Type': 'application/json'
      }
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          ...endpoint,
          status: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          error: res.statusCode >= 400 ? data : null
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        ...endpoint,
        status: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: err.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        ...endpoint,
        status: 0,
        responseTime: 5000,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

// Main test function
async function runTests() {
  try {
    console.log('Fetching Swagger endpoints...');
    const endpoints = await getSwaggerEndpoints();
    console.log(`Found ${endpoints.length} GET endpoints to test\n`);

    const results = [];
    for (const endpoint of endpoints) {
      console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
      const result = await testEndpoint(endpoint);
      results.push(result);
      
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`  ${statusIcon} ${result.status} (${result.responseTime}ms)`);
      
      if (!result.success && result.error) {
        console.log(`  Error: ${result.error.substring(0, 100)}...`);
      }
    }

    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('API ENDPOINT TEST REPORT');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\nSUMMARY:`);
    console.log(`Total endpoints tested: ${results.length}`);
    console.log(`Successful (2xx): ${successful.length}`);
    console.log(`Failed (4xx/5xx/errors): ${failed.length}`);
    console.log(`Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);

    if (failed.length > 0) {
      console.log(`\nFAILED ENDPOINTS:`);
      failed.forEach(result => {
        console.log(`❌ ${result.method} ${result.path} - Status: ${result.status}`);
        if (result.error) {
          console.log(`   Error: ${result.error.substring(0, 200)}...`);
        }
      });
    }

    console.log(`\nSUCCESSFUL ENDPOINTS:`);
    successful.forEach(result => {
      console.log(`✅ ${result.method} ${result.path} - ${result.status} (${result.responseTime}ms)`);
    });

    // Save detailed results to file
    fs.writeFileSync('api_test_results.json', JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to api_test_results.json`);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();