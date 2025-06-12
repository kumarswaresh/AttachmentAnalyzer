import { marketingCampaignService } from './services/MarketingCampaignService';

// Direct demo function to test marketing campaign generation
export async function demoMarketingCampaign() {
  console.log("🚀 Starting Marketing Campaign Demo...");
  
  const testRequest = {
    clientName: "ACME Travel Agency",
    targetAudience: "Families with children aged 5-12",
    destination: "Cancun, Mexico",
    travelType: "family",
    months: ["March", "April"],
    starRating: 4,
    propertyCount: 12,
    additionalCriteria: "Focus on beachfront properties with kids clubs and water parks"
  };

  try {
    console.log("📋 Campaign Request:", JSON.stringify(testRequest, null, 2));
    
    const campaign = await marketingCampaignService.generateCampaign(testRequest);
    
    console.log("✅ Campaign Generated Successfully!");
    console.log("📊 Campaign Title:", campaign.campaignTitle);
    console.log("🎯 Target Message:", campaign.targetMessage);
    console.log("📈 Seasonal Insights:", campaign.seasonalInsights);
    console.log("📊 Booking Trends:", campaign.bookingTrends);
    
    console.log("\n🏨 Hotel Recommendations:");
    campaign.recommendations.forEach((hotel, index) => {
      console.log(`\n${index + 1}. ${hotel.name}`);
      console.log(`   📍 Location: ${hotel.location}`);
      console.log(`   ⭐ Rating: ${hotel.starRating} stars`);
      console.log(`   👨‍👩‍👧‍👦 Family Friendly: ${hotel.familyFriendly ? 'Yes' : 'No'}`);
      console.log(`   🏊 Amenities: ${hotel.amenities.join(', ')}`);
      console.log(`   💡 Reasoning: ${hotel.reasoning}`);
      
      if (hotel.bookingData.length > 0) {
        console.log(`   📊 Booking Data:`);
        hotel.bookingData.forEach(data => {
          console.log(`     - ${data.month}: ${data.bookings} bookings at $${data.averageRate}/night`);
        });
      }
    });

    // Store the campaign result
    const timestamp = new Date().toISOString();
    const campaignData = {
      timestamp,
      request: testRequest,
      response: campaign,
      generatedBy: "OpenAI GPT-4o-mini"
    };

    // Save to a simple JSON file for backup
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(process.cwd(), 'campaign-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filename = `campaign-${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(campaignData, null, 2));
    console.log(`\n💾 Campaign saved to: ${filepath}`);
    
    return campaign;
    
  } catch (error) {
    console.error("❌ Campaign Generation Failed:", error);
    throw error;
  }
}

// Test OpenAI connection
export async function testOpenAIConnection() {
  console.log("🔗 Testing OpenAI Connection...");
  
  try {
    const result = await marketingCampaignService.testConnection();
    
    if (result.success) {
      console.log("✅ OpenAI Connection Successful!");
      console.log(`📡 Model: ${result.model}`);
      console.log(`💬 Response: ${result.message}`);
    } else {
      console.log("❌ OpenAI Connection Failed!");
      console.log(`💬 Error: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Connection Test Error:", error);
    throw error;
  }
}