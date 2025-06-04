import { multiCredentialService } from './services/multi-credential-service';
import { storage } from './storage';
import type { InsertAgent } from '@shared/schema';

export async function createDemoMarketingAgent() {
  console.log('🚀 Starting Demo Agent Creation Workflow...\n');

  // Step 1: Initialize default credentials if not exists
  console.log('Step 1: Setting up demo credentials...');
  
  await multiCredentialService.initializeDefaultCredentials();
  
  // Add some configured demo credentials
  const demoCredentials = [
    {
      name: 'OpenAI Demo Key',
      provider: 'openai',
      keyType: 'api_key',
      category: 'AI Models',
      description: 'Demo OpenAI API key for GPT models',
      value: 'demo-key-openai-12345', // Demo value - user should replace
      isDefault: true,
      tags: ['demo', 'marketing']
    },
    {
      name: 'Anthropic Demo Key',
      provider: 'anthropic',
      keyType: 'api_key',
      category: 'AI Models',
      description: 'Demo Anthropic API key for Claude models',
      value: 'demo-key-anthropic-67890', // Demo value - user should replace
      isDefault: false,
      tags: ['demo', 'content']
    }
  ];

  for (const cred of demoCredentials) {
    try {
      const credential = await multiCredentialService.createCredential(cred);
      console.log(`✓ Created credential: ${credential.name} (ID: ${credential.id})`);
    } catch (error) {
      console.log(`- Credential ${cred.name} already exists or failed to create`);
    }
  }

  // Step 2: Create the demo marketing agent
  console.log('\nStep 2: Creating Marketing Content Specialist agent...');
  
  const openaiCredential = await multiCredentialService.getDefaultCredentialForProvider('openai');
  
  const demoAgent: InsertAgent = {
    name: 'Marketing Content Specialist',
    goal: 'Create compelling marketing content including blog posts, social media content, and email campaigns using market research and competitor analysis. Analyze trends and create data-driven content strategies.',
    role: 'senior_marketing_specialist',
    systemPrompt: `You are a Marketing Content Specialist with expertise in:

1. Content Strategy & Planning
   - Market research and trend analysis
   - Competitor content analysis
   - Content calendar development
   - SEO optimization strategies

2. Content Creation
   - Blog posts and articles
   - Social media content (Twitter, LinkedIn, Instagram)
   - Email marketing campaigns
   - Product descriptions and landing pages

3. Performance Analysis
   - Content performance metrics
   - A/B testing recommendations
   - Audience engagement analysis
   - ROI measurement and reporting

Guidelines:
- Always research current market trends before creating content
- Adapt tone and style to match brand voice
- Include data-driven insights and recommendations
- Optimize content for SEO and engagement
- Provide actionable next steps and performance metrics

Your responses should be well-structured, actionable, and include specific recommendations for content distribution and performance measurement.`,
    
    guardrails: {
      requireHumanApproval: true,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 8000,
      allowedDomains: ['company-website.com', 'social-media-platforms.com'],
      blockedKeywords: ['confidential', 'internal-only']
    },
    
    modules: [
      {
        moduleId: 'prompt-module',
        version: '2.1.0',
        config: {
          temperature: 0.7,
          systemPromptEnabled: true
        },
        enabled: true
      },
      {
        moduleId: 'logging-module',
        version: '1.5.0',
        config: {
          logLevel: 'info',
          includeTokenUsage: true
        },
        enabled: true
      },
      {
        moduleId: 'web-search-module',
        version: '1.3.0',
        config: {
          maxResults: 10,
          includeSnippets: true
        },
        enabled: true
      },
      {
        moduleId: 'content-generation-module',
        version: '1.2.0',
        config: {
          supportedFormats: ['blog', 'social', 'email'],
          seoOptimization: true
        },
        enabled: true
      }
    ],
    
    model: JSON.stringify({
      provider: 'openai',
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 4000,
      credentialId: openaiCredential?.id || null
    }),
    
    vectorStoreId: 'marketing-content-store',
    status: 'active'
  };

  try {
    const createdAgent = await storage.createAgent(demoAgent);
    console.log(`✓ Created agent: ${createdAgent.name} (ID: ${createdAgent.id})`);
    
    // Step 3: Assign credential to agent
    if (openaiCredential) {
      await multiCredentialService.assignCredentialToAgent({
        agentId: createdAgent.id,
        credentialId: openaiCredential.id,
        purpose: 'primary_llm'
      });
      console.log(`✓ Assigned credential ${openaiCredential.name} to agent`);
    }

    // Step 4: Create sample test prompts
    console.log('\nStep 3: Setting up demo test prompts...');
    
    const testPrompts = [
      {
        title: "Blog Post Creation",
        prompt: "Create a comprehensive blog post about 'The Future of Sustainable Fashion' for our eco-friendly clothing brand. Include market research insights, current trends, and 3 social media snippets for promotion.",
        expectedOutput: "Detailed blog post with SEO optimization, research backing, and social content"
      },
      {
        title: "Social Media Campaign",
        prompt: "Design a 7-day social media campaign for launching our new sustainable sneaker line. Include posts for Twitter, LinkedIn, and Instagram with hashtag strategies.",
        expectedOutput: "Complete social media calendar with platform-specific content"
      },
      {
        title: "Email Marketing Series",
        prompt: "Create a 3-email welcome series for new subscribers to our sustainable fashion newsletter. Focus on brand values, product highlights, and engagement.",
        expectedOutput: "Three email templates with subject lines and call-to-actions"
      }
    ];

    console.log('📝 Demo test prompts available:');
    testPrompts.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.title}`);
      console.log(`      Prompt: "${test.prompt.substring(0, 80)}..."`);
      console.log(`      Expected: ${test.expectedOutput}\n`);
    });

    console.log('🎉 Demo Agent Creation Workflow Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Agent Name: ${createdAgent.name}`);
    console.log(`   Agent ID: ${createdAgent.id}`);
    console.log(`   Model: GPT-4 Turbo with OpenAI credential`);
    console.log(`   Modules: 4 specialized modules enabled`);
    console.log(`   Capabilities: Content creation, research, SEO optimization`);
    console.log(`   Status: Ready for testing\n`);
    
    console.log('🔗 Next Steps:');
    console.log('   1. Navigate to Chat Console to test the agent');
    console.log('   2. Try the demo prompts listed above');
    console.log('   3. Monitor execution in the Monitoring dashboard');
    console.log('   4. Review credential usage and performance metrics\n');

    return {
      agent: createdAgent,
      credential: openaiCredential,
      testPrompts
    };

  } catch (error) {
    console.error('❌ Failed to create demo agent:', error);
    throw error;
  }
}

// Additional demo functions
export async function createDemoAgentChain() {
  console.log('🔗 Creating Demo Agent Chain Workflow...\n');
  
  // This would create a chain of agents:
  // Research Agent → Content Creator → Social Media Specialist → Analytics Agent
  
  console.log('This feature demonstrates multi-agent orchestration');
  console.log('where agents collaborate to complete complex marketing tasks.');
}

export async function demonstrateCredentialRotation() {
  console.log('🔄 Demonstrating Credential Rotation...\n');
  
  // Show how to switch between different API keys for the same provider
  const openaiCredentials = await multiCredentialService.getCredentialsByProvider('openai');
  
  console.log(`Found ${openaiCredentials.length} OpenAI credentials:`);
  openaiCredentials.forEach(cred => {
    console.log(`   - ${cred.name} (${cred.isDefault ? 'Default' : 'Alternative'})`);
  });
  
  console.log('\nCredential rotation allows you to:');
  console.log('   1. Switch between development and production keys');
  console.log('   2. Distribute load across multiple API keys');
  console.log('   3. Handle rate limiting and quota management');
  console.log('   4. Implement blue-green deployment strategies');
}