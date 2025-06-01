#!/usr/bin/env node

/**
 * Test script for Agent Communication and Chaining system
 * This script demonstrates creating agents, setting up communication chains,
 * and executing multi-step agent workflows
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    throw error;
  }
}

async function testAgentCommunication() {
  console.log('🚀 Testing Agent Communication and Chaining System\n');

  try {
    // Step 1: Create test agents
    console.log('📝 Creating test agents...');
    
    const agent1 = await makeRequest('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Research Agent',
        role: 'Research Specialist',
        goal: 'Gather and analyze information from various sources',
        guardrails: {
          requireHumanApproval: false,
          contentFiltering: true,
          readOnlyMode: false,
          maxTokens: 4000,
          allowedDomains: ['*'],
          blockedKeywords: ['harmful', 'inappropriate']
        },
        modules: {
          enabled: ['web_search', 'data_analysis'],
          configuration: {
            web_search: { maxResults: 10 },
            data_analysis: { format: 'json' }
          }
        },
        model: 'gpt-4'
      })
    });

    const agent2 = await makeRequest('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Content Creator',
        role: 'Content Writer',
        goal: 'Create engaging content based on research data',
        guardrails: {
          requireHumanApproval: true,
          contentFiltering: true,
          readOnlyMode: false,
          maxTokens: 3000,
          allowedDomains: ['*'],
          blockedKeywords: ['harmful', 'inappropriate']
        },
        modules: {
          enabled: ['content_generation', 'formatting'],
          configuration: {
            content_generation: { style: 'professional' },
            formatting: { type: 'markdown' }
          }
        },
        model: 'gpt-4'
      })
    });

    const agent3 = await makeRequest('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Review Agent',
        role: 'Quality Reviewer',
        goal: 'Review and validate content quality',
        guardrails: {
          requireHumanApproval: false,
          contentFiltering: true,
          readOnlyMode: true,
          maxTokens: 2000,
          allowedDomains: ['*'],
          blockedKeywords: ['harmful', 'inappropriate']
        },
        modules: {
          enabled: ['quality_check', 'validation'],
          configuration: {
            quality_check: { criteria: ['accuracy', 'readability'] },
            validation: { strict: true }
          }
        },
        model: 'gpt-4'
      })
    });

    console.log(`✅ Created agents:
    - Research Agent (ID: ${agent1.id})
    - Content Creator (ID: ${agent2.id})
    - Review Agent (ID: ${agent3.id})\n`);

    // Step 2: Test direct agent-to-agent communication
    console.log('💬 Testing direct agent communication...');
    
    const message1 = await makeRequest('/api/agent-messages', {
      method: 'POST',
      body: JSON.stringify({
        fromAgentId: agent1.id,
        toAgentId: agent2.id,
        messageType: 'task',
        content: {
          task: 'Research AI trends for 2024',
          priority: 'high',
          context: {
            topic: 'Artificial Intelligence',
            focus: 'emerging trends',
            targetAudience: 'tech professionals'
          }
        },
        priority: 3
      })
    });

    console.log(`✅ Sent message from Research Agent to Content Creator (ID: ${message1.id})\n`);

    // Step 3: Create an agent chain
    console.log('🔗 Creating agent execution chain...');
    
    const chain = await makeRequest('/api/agent-chains', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Content Creation Pipeline',
        description: 'Research → Content Creation → Review workflow',
        steps: [
          {
            id: 'step1',
            name: 'Research Phase',
            agentId: agent1.id,
            inputMapping: {
              topic: '$.input.topic',
              requirements: '$.input.requirements'
            },
            outputMapping: {
              researchData: '$.output.data',
              insights: '$.output.insights'
            },
            timeout: 300000,
            retryCount: 2
          },
          {
            id: 'step2',
            name: 'Content Creation',
            agentId: agent2.id,
            condition: '$.step1.status === "completed"',
            inputMapping: {
              researchData: '$.step1.output.researchData',
              insights: '$.step1.output.insights',
              contentType: '$.input.contentType'
            },
            outputMapping: {
              content: '$.output.content',
              metadata: '$.output.metadata'
            },
            timeout: 240000,
            retryCount: 1
          },
          {
            id: 'step3',
            name: 'Quality Review',
            agentId: agent3.id,
            condition: '$.step2.status === "completed"',
            inputMapping: {
              content: '$.step2.output.content',
              metadata: '$.step2.output.metadata'
            },
            outputMapping: {
              approved: '$.output.approved',
              feedback: '$.output.feedback',
              finalContent: '$.output.finalContent'
            },
            timeout: 180000,
            retryCount: 1
          }
        ]
      })
    });

    console.log(`✅ Created agent chain: ${chain.name} (ID: ${chain.id})\n`);

    // Step 4: Execute the chain
    console.log('▶️ Executing agent chain...');
    
    const execution = await makeRequest(`/api/agent-chains/${chain.id}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        input: {
          topic: 'Machine Learning in Healthcare',
          requirements: 'Focus on practical applications and recent breakthroughs',
          contentType: 'blog_post'
        },
        variables: {
          targetLength: 1500,
          audience: 'healthcare professionals'
        }
      })
    });

    console.log(`✅ Chain execution started (ID: ${execution.id})\n`);

    // Step 5: Monitor execution progress
    console.log('📊 Monitoring execution progress...');
    
    let executionStatus = await makeRequest(`/api/chain-executions/${execution.id}`);
    let attempts = 0;
    const maxAttempts = 10;

    while (executionStatus.status === 'running' && attempts < maxAttempts) {
      console.log(`   Step ${executionStatus.currentStep + 1}/3 - ${executionStatus.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      executionStatus = await makeRequest(`/api/chain-executions/${execution.id}`);
      attempts++;
    }

    console.log(`✅ Chain execution ${executionStatus.status}\n`);

    // Step 6: Test communication analytics
    console.log('📈 Testing communication analytics...');
    
    const analytics = await makeRequest('/api/agent-communication/analytics');
    console.log(`✅ Analytics retrieved:
    - Total messages: ${analytics.totalMessages || 0}
    - Active chains: ${analytics.activeChains || 0}
    - Success rate: ${analytics.successRate || 'N/A'}%\n`);

    // Step 7: Test chain validation
    console.log('🔍 Validating chain configuration...');
    
    const validation = await makeRequest(`/api/agent-chains/${chain.id}/validate`, {
      method: 'POST'
    });

    console.log(`✅ Chain validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    if (validation.warnings?.length > 0) {
      console.log(`⚠️ Warnings: ${validation.warnings.join(', ')}`);
    }
    if (validation.errors?.length > 0) {
      console.log(`❌ Errors: ${validation.errors.join(', ')}`);
    }

    console.log('\n🎉 Agent Communication and Chaining test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAgentCommunication();