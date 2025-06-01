import { storage } from './storage';
import { MarketingCampaignModule } from './modules/MarketingCampaignModule';
import { GoogleTrendsModule } from './modules/GoogleTrendsModule';
import { ApiConnectorModule } from './modules/ApiConnectorModule';

async function createMarketingAgent() {
  try {
    // Create the marketing campaign agent
    const marketingAgent = await storage.createAgent({
      name: "Marketing Campaign Generator",
      goal: "Create comprehensive marketing campaigns with trend analysis, external data integration, and ROI optimization",
      role: "marketing_strategist",
      guardrails: {
        requireHumanApproval: false,
        contentFiltering: true,
        readOnlyMode: false,
        maxTokens: 6000,
        allowedDomains: ["*.googleapis.com", "localhost"],
        blockedKeywords: ["spam", "misleading"]
      },
      modules: [
        {
          moduleId: "marketing-campaign",
          version: "1.0.0",
          config: {
            targetAudience: {
              demographics: ["25-35", "36-45", "46-55"],
              interests: ["technology", "business", "innovation", "marketing"],
              geographicRegions: ["US", "Europe", "Global"]
            },
            campaignObjectives: ["brand awareness", "lead generation", "sales conversion", "customer retention"],
            budgetRange: {
              min: 1000,
              max: 100000,
              currency: "USD"
            },
            platforms: ["Google Ads", "Facebook", "LinkedIn", "Instagram", "Twitter"],
            contentTypes: ["video", "image", "text", "carousel", "story"],
            trendsIntegration: {
              enabled: true,
              regions: ["US"],
              categories: [0],
              timeframe: "today 12-m"
            },
            externalAPIs: {
              mockServerUrl: "http://localhost:3001/api/market-analysis",
              authToken: "Bearer mock-api-token-12345",
              timeout: 30000
            },
            responseFormat: {
              includeMetrics: true,
              includeTrends: true,
              includeRecommendations: true,
              maxRecommendations: 10,
              customFields: ["competitorAnalysis", "seasonalFactors", "budgetOptimization"]
            }
          },
          enabled: true
        }
      ],
      model: "gpt-4",
      vectorStoreId: "marketing-vector-store"
    });

    console.log('Marketing agent created:', marketingAgent.id);
    return marketingAgent;

  } catch (error) {
    console.error('Error creating marketing agent:', error);
    throw error;
  }
}

async function testMarketingAgent(agentId: string) {
  try {
    console.log('Testing marketing campaign module...');

    // Initialize the marketing campaign module
    const marketingConfig = {
      targetAudience: {
        demographics: ["25-35", "36-45", "46-55"],
        interests: ["technology", "business", "innovation", "marketing"],
        geographicRegions: ["US", "Europe", "Global"]
      },
      campaignObjectives: ["brand awareness", "lead generation", "sales conversion"],
      budgetRange: {
        min: 1000,
        max: 100000,
        currency: "USD"
      },
      platforms: ["Google Ads", "Facebook", "LinkedIn", "Instagram", "Twitter"],
      contentTypes: ["video", "image", "text", "carousel", "story"],
      trendsIntegration: {
        enabled: true,
        regions: ["US"],
        categories: [0],
        timeframe: "today 12-m"
      },
      externalAPIs: {
        mockServerUrl: "http://localhost:3001/api/market-analysis",
        authToken: "Bearer mock-api-token-12345",
        timeout: 30000
      },
      responseFormat: {
        includeMetrics: true,
        includeTrends: true,
        includeRecommendations: true,
        maxRecommendations: 5,
        customFields: ["competitorAnalysis", "seasonalFactors", "budgetOptimization"]
      }
    };

    const marketingModule = new MarketingCampaignModule(marketingConfig);

    // Test with sample campaign request
    const campaignRequest = {
      businessType: "SaaS",
      productDescription: "AI-powered project management tool for remote teams",
      targetMarket: "US",
      campaignGoals: ["lead generation", "brand awareness", "user acquisition"],
      budget: 25000,
      timeframe: "3 months",
      preferredPlatforms: ["Google Ads", "LinkedIn", "Facebook"],
      customRequirements: "Focus on B2B decision makers in tech companies"
    };

    console.log('Executing marketing campaign generation...');
    const result = await marketingModule.invoke(campaignRequest);

    if (result.success) {
      console.log('Marketing campaign generated successfully!');
      console.log('Total recommendations:', result.data?.totalRecommendations);
      console.log('Processing time:', result.data?.metadata.processingTime + 'ms');
      console.log('External APIs called:', result.data?.metadata.externalAPIsCalled);
      
      if (result.data?.recommendations) {
        console.log('\nTop 3 Campaign Recommendations:');
        result.data.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.title}`);
          console.log(`   Platform: ${rec.platform}`);
          console.log(`   Estimated Cost: $${rec.estimatedCost}`);
          console.log(`   Expected ROI: ${rec.expectedROI}`);
          console.log(`   Priority: ${rec.priority}`);
          console.log(`   Estimated Reach: ${rec.metrics.estimatedReach.toLocaleString()}`);
          console.log('');
        });
      }

      if (result.data?.trendingInsights) {
        console.log('Trending Insights:');
        result.data.trendingInsights.slice(0, 3).forEach((insight, index) => {
          console.log(`${index + 1}. ${insight.keyword} (Score: ${insight.trendingScore})`);
          console.log(`   Region: ${insight.region}`);
          console.log(`   Opportunity: ${insight.competitorAnalysis.opportunity}`);
          console.log('');
        });
      }

      return result.data;
    } else {
      console.error('Marketing campaign generation failed:', result.error);
      return null;
    }

  } catch (error) {
    console.error('Error testing marketing agent:', error);
    throw error;
  }
}

// Run the test
async function main() {
  try {
    console.log('Creating and testing Marketing Campaign Agent...\n');
    
    const agent = await createMarketingAgent();
    const testResult = await testMarketingAgent(agent.id);
    
    if (testResult) {
      console.log('\n✅ Marketing agent test completed successfully!');
      console.log('The agent is ready for external API testing with authentication tokens.');
    } else {
      console.log('\n❌ Marketing agent test failed.');
    }

  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Execute the main function
main();

export { createMarketingAgent, testMarketingAgent };