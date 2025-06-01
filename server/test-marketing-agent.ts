import { storage } from "./storage";
import { marketingAgentService } from "./services/MarketingAgentService";

async function createMarketingAgent() {
  try {
    const marketingAgent = await storage.createAgent({
      name: "Hotel Marketing Agent",
      goal: "Provide personalized hotel recommendations based on Google Trends and user preferences",
      role: "marketing_specialist",
      model: "gpt-4o",
      guardrails: {
        requireHumanApproval: false,
        contentFiltering: true,
        readOnlyMode: false,
        maxTokens: 2000,
        allowedDomains: ["hotels.com", "booking.com", "expedia.com"],
        blockedKeywords: ["illegal", "harmful"]
      },
      modules: [
        {
          moduleId: "google-trends",
          version: "1.0.0",
          config: { apiKey: "mock-trends-key" },
          enabled: true
        },
        {
          moduleId: "hotel-mcp",
          version: "1.0.0",
          config: { categories: ["luxury", "business", "budget", "resort", "boutique"] },
          enabled: true
        }
      ],
      vectorStoreId: "marketing-vector-store",
      status: "active",
      createdBy: 1
    });

    console.log("Marketing agent created:", marketingAgent.id);
    return marketingAgent;
  } catch (error) {
    console.error("Error creating marketing agent:", error);
    throw error;
  }
}

async function testMarketingAgent(agentId: string) {
  console.log("\n=== Testing Marketing Agent Functionality ===");

  try {
    // Test 1: Get Google Trends data
    console.log("\n1. Testing Google Trends data:");
    const trends = marketingAgentService.getGoogleTrends();
    console.log("Trends data:", JSON.stringify(trends.slice(0, 3), null, 2));

    // Test 2: Get hotel categories summary
    console.log("\n2. Testing hotel categories summary:");
    const summary = marketingAgentService.getHotelSummary();
    console.log("Hotel summary:", summary);

    // Test 3: Get hotels by category
    console.log("\n3. Testing hotels by category (luxury):");
    const luxuryHotels = marketingAgentService.getHotelsByCategory("luxury");
    console.log("Luxury hotels:", luxuryHotels.slice(0, 3));

    // Test 4: Generate recommendations (basic test without OpenAI)
    console.log("\n4. Testing recommendation generation:");
    try {
      const recommendations = await marketingAgentService.generateRecommendations({
        query: "I need a luxury hotel in Paris for my honeymoon",
        preferences: {
          budget: "luxury",
          destination: "paris",
          travelers: 2
        }
      });
      console.log("Recommendations:", JSON.stringify(recommendations, null, 2));
    } catch (error) {
      console.log("Recommendation test requires OpenAI API key:", error.message);
    }

    console.log("\n=== Marketing Agent Test Complete ===");
    
  } catch (error) {
    console.error("Error testing marketing agent:", error);
  }
}

async function main() {
  try {
    console.log("Starting marketing agent setup and testing...");
    
    const agent = await createMarketingAgent();
    await testMarketingAgent(agent.id);
    
  } catch (error) {
    console.error("Main test error:", error);
  }
}

// Run the test
main().then(() => {
  console.log("Test completed successfully");
}).catch(error => {
  console.error("Test failed:", error);
  process.exit(1);
});

export { createMarketingAgent, testMarketingAgent };