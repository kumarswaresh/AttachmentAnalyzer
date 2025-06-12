import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

async function testMarketingCampaign() {
  console.log("🚀 Testing Marketing Campaign Generator...");
  
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

  const prompt = `
Create a comprehensive hotel recommendation campaign for:

Client: ${testRequest.clientName}
Target Audience: ${testRequest.targetAudience}
Destination: ${testRequest.destination}
Travel Type: ${testRequest.travelType}
Months: ${testRequest.months.join(', ')}
Minimum Star Rating: ${testRequest.starRating}
Number of Properties: ${testRequest.propertyCount}
Additional Criteria: ${testRequest.additionalCriteria}

Generate a JSON response with realistic booking data and insights:

{
  "recommendations": [
    {
      "name": "Hotel Name",
      "location": "Specific location within destination",
      "starRating": 4,
      "familyFriendly": true,
      "bookingData": [
        {"month": "March", "bookings": 1250, "averageRate": 289},
        {"month": "April", "bookings": 1450, "averageRate": 329}
      ],
      "amenities": ["Pool", "Kids Club", "Beach Access"],
      "reasoning": "Why this hotel fits the criteria"
    }
  ],
  "campaignTitle": "Engaging campaign title",
  "targetMessage": "Key marketing message for the target audience",
  "seasonalInsights": "Analysis of seasonal booking patterns",
  "bookingTrends": "Trends and insights for the specified period"
}

Focus on authentic data patterns and family-friendly features for Cancun.
`;

  try {
    console.log("📋 Campaign Request:", JSON.stringify(testRequest, null, 2));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert travel marketing analyst specializing in hotel recommendations and campaign development. Provide detailed, data-driven recommendations in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const campaign = JSON.parse(response.choices[0].message.content || '{}');
    
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
      
      if (hotel.bookingData && hotel.bookingData.length > 0) {
        console.log(`   📊 Booking Data:`);
        hotel.bookingData.forEach(data => {
          console.log(`     - ${data.month}: ${data.bookings} bookings at $${data.averageRate}/night`);
        });
      }
    });

    // Save the campaign result
    
    const backupDir = path.join(process.cwd(), 'campaign-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const campaignData = {
      timestamp: new Date().toISOString(),
      request: testRequest,
      response: campaign,
      generatedBy: "OpenAI GPT-4o-mini"
    };
    
    const filename = `campaign-${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(campaignData, null, 2));
    console.log(`\n💾 Campaign saved to: ${filepath}`);
    
    return campaign;
    
  } catch (error) {
    console.error("❌ Campaign Generation Failed:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    throw error;
  }
}

async function testConnection() {
  console.log("🔗 Testing OpenAI Connection...");
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello, please respond with 'Connection successful'" }],
      max_tokens: 10
    });

    console.log("✅ OpenAI Connection Successful!");
    console.log(`📡 Model: gpt-4o-mini`);
    console.log(`💬 Response: ${response.choices[0].message.content}`);
    
    return true;
  } catch (error) {
    console.error("❌ OpenAI Connection Failed:", error.message);
    return false;
  }
}

async function main() {
  try {
    const connected = await testConnection();
    if (connected) {
      await testMarketingCampaign();
    }
  } catch (error) {
    console.error("Demo failed:", error.message);
  }
}

main();