import http from 'http';
import fs from 'fs';

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = { usernameOrEmail: 'anand', password: 'password123' };
const MARKETING_AGENT_ID = 'c9690ace-eeef-41e0-9ed4-bdf78026df41';

// Store all requests and responses for verification
const testResults = {
  timestamp: new Date().toISOString(),
  tests: []
};

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

function saveTestResult(testName, request, response) {
  testResults.tests.push({
    testName,
    timestamp: new Date().toISOString(),
    request,
    response
  });
  console.log(`✓ ${testName} - Status: ${response.status}`);
}

async function authenticateUser() {
  console.log('=== Authentication Process ===');
  
  // First try to register a new user
  const registerRequest = {
    url: `${BASE_URL}/auth/register`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    })
  };

  try {
    console.log('   Attempting user registration...');
    const registerResponse = await makeRequest(registerRequest.url, {
      method: registerRequest.method,
      headers: registerRequest.headers,
      body: registerRequest.body
    });

    saveTestResult('User Registration', registerRequest, registerResponse);

    if (registerResponse.body.success && registerResponse.body.sessionToken) {
      console.log(`   ✓ Registration and authentication successful`);
      console.log(`   Token: ${registerResponse.body.sessionToken.substring(0, 20)}...`);
      return registerResponse.body.sessionToken;
    }
  } catch (error) {
    console.log('   Registration failed, trying login...');
  }

  // If registration fails, try login with test user
  const loginRequest = {
    url: `${BASE_URL}/auth/login`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameOrEmail: 'testuser',
      password: 'testpassword123'
    })
  };

  try {
    const response = await makeRequest(loginRequest.url, {
      method: loginRequest.method,
      headers: loginRequest.headers,
      body: loginRequest.body
    });

    saveTestResult('User Login', loginRequest, response);

    if (response.body.success && response.body.sessionToken) {
      console.log(`   ✓ Login successful`);
      console.log(`   Token: ${response.body.sessionToken.substring(0, 20)}...`);
      return response.body.sessionToken;
    } else {
      throw new Error(`Authentication failed: ${response.body.message}`);
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    return null;
  }
}

async function testMarketingAgentWithAuth() {
  console.log('\n=== Marketing Agent Testing with Authentication ===\n');

  // Step 1: Authenticate and get token
  const sessionToken = await authenticateUser();
  if (!sessionToken) {
    console.error('Cannot proceed without authentication');
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  };

  try {
    // Test 1: Get agent information
    console.log('\n1. Getting Marketing Agent Information:');
    const agentRequest = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}`,
      method: 'GET',
      headers: authHeaders
    };

    const agentInfo = await makeRequest(agentRequest.url, {
      method: agentRequest.method,
      headers: agentRequest.headers
    });
    saveTestResult('Get Agent Information', agentRequest, agentInfo);

    // Test 2: Get available default prompts
    console.log('\n2. Getting Default Prompts for Marketing Agent:');
    const promptsRequest = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test/prompts`,
      method: 'GET',
      headers: authHeaders
    };

    const prompts = await makeRequest(promptsRequest.url, {
      method: promptsRequest.method,
      headers: promptsRequest.headers
    });
    saveTestResult('Get Default Prompts', promptsRequest, prompts);

    if (prompts.body.defaultPrompts) {
      console.log(`   Found ${prompts.body.defaultPrompts.length} default prompts`);
      prompts.body.defaultPrompts.forEach((prompt, i) => {
        console.log(`   ${i}: ${prompt.description}`);
      });
    }

    // Test 3: Test with default prompt
    console.log('\n3. Testing Default Marketing Prompt:');
    const defaultTestRequest = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test`,
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        testType: 'default',
        promptIndex: 0
      })
    };

    const defaultTest = await makeRequest(defaultTestRequest.url, {
      method: defaultTestRequest.method,
      headers: defaultTestRequest.headers,
      body: defaultTestRequest.body
    });
    saveTestResult('Default Prompt Test', defaultTestRequest, defaultTest);

    // Test 4: Custom prompt - 10 hotel recommendations
    console.log('\n4. Testing Custom Prompt - 10 Hotel Recommendations:');
    const customTest1Request = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test`,
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        testType: 'custom',
        prompt: 'I need 10 hotel recommendations across different categories - luxury, business, budget, resort, and boutique. Please provide 2 hotels from each category with details including location, price range, and key amenities.',
        expectedOutput: 'Should provide 10 hotel recommendations across 5 categories with 2 hotels each'
      })
    };

    const customTest1 = await makeRequest(customTest1Request.url, {
      method: customTest1Request.method,
      headers: customTest1Request.headers,
      body: customTest1Request.body
    });
    saveTestResult('Custom 10 Hotels Test', customTest1Request, customTest1);

    // Test 5: Custom prompt - Specific destination
    console.log('\n5. Testing Custom Prompt - Paris Honeymoon Trip:');
    const customTest2Request = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test`,
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        testType: 'custom',
        prompt: 'I\'m planning a romantic honeymoon trip to Paris in summer. Can you recommend luxury hotels with romantic ambiance, spa services, and also provide insights about current travel trends for Paris?',
        expectedOutput: 'Should provide luxury Paris hotels for honeymoon and current Paris travel trends'
      })
    };

    const customTest2 = await makeRequest(customTest2Request.url, {
      method: customTest2Request.method,
      headers: customTest2Request.headers,
      body: customTest2Request.body
    });
    saveTestResult('Custom Paris Honeymoon Test', customTest2Request, customTest2);

    // Test 6: Direct marketing API test
    console.log('\n6. Testing Direct Marketing API:');
    const marketingRequest = {
      url: `${BASE_URL}/marketing/recommend`,
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        query: 'I need 10 hotel recommendations for different types of travelers with diverse budgets',
        preferences: {
          budget: 'mixed',
          destination: 'global',
          travelers: 2,
          categories: ['luxury', 'business', 'budget', 'resort', 'boutique']
        }
      })
    };

    const marketingTest = await makeRequest(marketingRequest.url, {
      method: marketingRequest.method,
      headers: marketingRequest.headers,
      body: marketingRequest.body
    });
    saveTestResult('Direct Marketing API Test', marketingRequest, marketingTest);

    // Test 7: Get marketing hotels data
    console.log('\n7. Testing Marketing Hotels Data:');
    const hotelsRequest = {
      url: `${BASE_URL}/marketing/hotels`,
      method: 'GET',
      headers: authHeaders
    };

    const hotelsData = await makeRequest(hotelsRequest.url, {
      method: hotelsRequest.method,
      headers: hotelsRequest.headers
    });
    saveTestResult('Marketing Hotels Data', hotelsRequest, hotelsData);

    // Test 8: Get test history
    console.log('\n8. Getting Agent Test History:');
    const historyRequest = {
      url: `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test/history`,
      method: 'GET',
      headers: authHeaders
    };

    const testHistory = await makeRequest(historyRequest.url, {
      method: historyRequest.method,
      headers: historyRequest.headers
    });
    saveTestResult('Agent Test History', historyRequest, testHistory);

    console.log('\n=== All Marketing Agent Tests Completed ===');

  } catch (error) {
    console.error('Test failed:', error.message);
    testResults.error = error.message;
  }

  // Save all test results to file
  const fileName = `marketing-agent-test-results-${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(testResults, null, 2));
  console.log(`\n✓ All test results saved to: ${fileName}`);
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Total tests: ${testResults.tests.length}`);
  console.log(`Successful tests: ${testResults.tests.filter(t => t.response.status < 400).length}`);
  console.log(`Failed tests: ${testResults.tests.filter(t => t.response.status >= 400).length}`);

  return testResults;
}

// Run the test
testMarketingAgentWithAuth();