import https from 'https';
import http from 'http';

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = { usernameOrEmail: 'anand', password: 'password123' };

// Find marketing agent ID from the list
const MARKETING_AGENT_ID = 'c9690ace-eeef-41e0-9ed4-bdf78026df41'; // From the agents list

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
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

async function testMarketingAgent() {
  console.log('=== Marketing Agent Testing ===\n');

  try {
    // Test 1: Get default prompts for marketing agent
    console.log('1. Testing Default Prompts:');
    const defaultPromptsUrl = `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test/prompts`;
    const prompts = await makeRequest(defaultPromptsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (prompts.defaultPrompts) {
      console.log(`   Found ${prompts.defaultPrompts.length} default prompts for ${prompts.agentType} agent`);
      prompts.defaultPrompts.forEach((prompt, i) => {
        console.log(`   ${i + 1}. ${prompt.description}`);
        console.log(`      Prompt: "${prompt.prompt}"`);
        console.log(`      Expected: ${prompt.expectedBehavior}\n`);
      });
    }

    // Test 2: Test with default prompt (luxury business travel)
    console.log('2. Testing Default Prompt - Luxury Business Travel:');
    const defaultTestUrl = `${BASE_URL}/agents/${MARKETING_AGENT_ID}/test`;
    const defaultTest = await makeRequest(defaultTestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'default',
        promptIndex: 0
      })
    });
    
    if (defaultTest.actualOutput) {
      console.log('   ✓ Default test completed');
      console.log(`   Execution time: ${defaultTest.executionTime}ms`);
      console.log(`   Success: ${defaultTest.success}`);
      console.log(`   Response: ${defaultTest.actualOutput.substring(0, 200)}...\n`);
    }

    // Test 3: Custom prompt - 10 recommendations
    console.log('3. Testing Custom Prompt - 10 Hotel Recommendations:');
    const customTest1 = await makeRequest(defaultTestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'custom',
        prompt: 'I need 10 hotel recommendations across different categories - luxury, business, budget, resort, and boutique. Please provide 2 hotels from each category with details.',
        expectedOutput: 'Should provide 10 hotel recommendations across 5 categories with 2 hotels each'
      })
    });
    
    if (customTest1.actualOutput) {
      console.log('   ✓ Custom test (10 recommendations) completed');
      console.log(`   Execution time: ${customTest1.executionTime}ms`);
      console.log(`   Success: ${customTest1.success}`);
      console.log(`   Response: ${customTest1.actualOutput.substring(0, 300)}...\n`);
    }

    // Test 4: Custom prompt - Specific destination and season
    console.log('4. Testing Custom Prompt - Specific Request:');
    const customTest2 = await makeRequest(defaultTestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'custom',
        prompt: 'I\'m planning a honeymoon trip to Paris in summer. Can you recommend luxury hotels with romantic ambiance and also tell me about current travel trends for Paris?',
        expectedOutput: 'Should provide luxury Paris hotels for honeymoon and current Paris travel trends'
      })
    });
    
    if (customTest2.actualOutput) {
      console.log('   ✓ Custom test (Paris honeymoon) completed');
      console.log(`   Execution time: ${customTest2.executionTime}ms`);
      console.log(`   Success: ${customTest2.success}`);
      console.log(`   Response: ${customTest2.actualOutput.substring(0, 300)}...\n`);
    }

    // Test 5: Direct marketing API for comparison
    console.log('5. Testing Direct Marketing API:');
    const directApiUrl = `${BASE_URL}/marketing/recommend`;
    const directTest = await makeRequest(directApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'I need 10 hotel recommendations for different types of travelers',
        preferences: {
          budget: 'luxury',
          destination: 'paris',
          travelers: 2
        }
      })
    });
    
    if (directTest.recommendations) {
      console.log('   ✓ Direct marketing API test completed');
      console.log(`   Found ${directTest.recommendations.length} recommendations`);
      console.log(`   Trending destinations: ${directTest.trends.length}`);
      console.log(`   Total hotels in system: ${directTest.totalHotels}`);
      console.log(`   AI insights: ${directTest.insights.substring(0, 150)}...\n`);
    }

    console.log('=== All Marketing Agent Tests Completed ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testMarketingAgent();