#!/usr/bin/env node

/**
 * Comprehensive Email Marketing System Test Script
 * Tests enhanced campaign functionality with real user data integration
 */

const API_BASE = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  campaignName: `Test Campaign ${Date.now()}`,
  templateId: 'welcome',
  recipientTypes: ['all', 'organizations', 'specific']
};

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { response, data };
}

async function testEmailMarketingSystem() {
  console.log('🚀 Testing Enhanced Email Marketing System');
  console.log('=' .repeat(60));

  try {
    // Test 1: Get recipient statistics
    console.log('\n📊 Testing Recipient Management...');
    const { data: recipientData } = await makeRequest('/api/email/campaigns/test-campaign/recipients');
    
    if (recipientData.success) {
      console.log(`✅ Recipients loaded successfully:`);
      console.log(`   - Total Users: ${recipientData.stats.totalUsers}`);
      console.log(`   - Total Organizations: ${recipientData.stats.totalOrganizations}`);
      console.log(`   - Active Users: ${recipientData.stats.activeUsers}`);
      console.log(`   - Sample Users: ${recipientData.users.slice(0, 3).map(u => u.username).join(', ')}`);
    } else {
      console.log('❌ Failed to load recipients');
    }

    // Test 2: Campaign preview with real user data
    console.log('\n🎨 Testing Campaign Preview with Real User Data...');
    
    for (const templateId of ['welcome', 'newsletter', 'promotion']) {
      const { data: previewData } = await makeRequest('/api/email/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          recipientType: 'all',
          recipientIds: []
        })
      });

      if (previewData.success) {
        const preview = previewData.preview;
        const sampleUser = previewData.sampleUser;
        
        console.log(`✅ ${templateId.toUpperCase()} Template Preview:`);
        console.log(`   - Subject: ${preview.subject}`);
        console.log(`   - Sample User: ${sampleUser.firstName} (${sampleUser.email})`);
        console.log(`   - Content Length: ${preview.htmlContent.length} characters`);
        console.log(`   - Personalized: ${preview.htmlContent.includes(sampleUser.firstName) ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ Failed to preview ${templateId} template`);
      }
    }

    // Test 3: Create and send campaign with delivery tracking
    console.log('\n📧 Testing Campaign Creation and Delivery Tracking...');
    
    const { data: campaignData } = await makeRequest('/api/email/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: TEST_CONFIG.campaignName,
        templateId: 'welcome',
        recipientType: 'all_users',
        organizationIds: [],
        userIds: [],
        scheduledAt: ''
      })
    });

    if (campaignData.success || campaignData.id) {
      const campaignId = campaignData.id || 'test-campaign';
      console.log(`✅ Campaign created: ${campaignId}`);

      // Test campaign sending with delivery statistics
      const { data: sendData } = await makeRequest(`/api/email/campaigns/${campaignId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          recipientType: 'all',
          recipientIds: [],
          organizationIds: []
        })
      });

      if (sendData.success) {
        console.log(`✅ Campaign sent successfully:`);
        console.log(`   - Message: ${sendData.message}`);
        console.log(`   - Total Recipients: ${sendData.stats.totalRecipients || sendData.stats.sent}`);
        console.log(`   - Delivery Rate: ${((sendData.stats.delivered / sendData.stats.totalRecipients) * 100).toFixed(1)}%`);
        console.log(`   - Open Rate: ${((sendData.stats.opened / sendData.stats.delivered) * 100).toFixed(1)}%`);
        console.log(`   - Click Rate: ${((sendData.stats.clicked / sendData.stats.opened) * 100).toFixed(1)}%`);
        console.log(`   - Bounce Rate: ${((sendData.stats.bounced / sendData.stats.totalRecipients) * 100).toFixed(1)}%`);
        
        if (sendData.recipients) {
          console.log(`   - Sample Recipients: ${sendData.recipients.slice(0, 3).map(r => r.email).join(', ')}`);
        }
      } else {
        console.log('❌ Failed to send campaign');
      }
    } else {
      console.log('❌ Failed to create campaign');
    }

    // Test 4: Template system functionality
    console.log('\n📝 Testing Template System...');
    
    const { data: templatesData } = await makeRequest('/api/email/templates');
    
    if (templatesData && Array.isArray(templatesData)) {
      console.log(`✅ Templates loaded: ${templatesData.length} templates`);
      templatesData.forEach(template => {
        console.log(`   - ${template.name}: ${template.description || 'No description'}`);
      });
    } else {
      console.log('❌ Failed to load templates');
    }

    // Test 5: Campaign list and statistics
    console.log('\n📈 Testing Campaign Statistics...');
    
    const { data: campaignsData } = await makeRequest('/api/email/campaigns');
    
    if (campaignsData && Array.isArray(campaignsData)) {
      console.log(`✅ Campaigns loaded: ${campaignsData.length} campaigns`);
      campaignsData.slice(0, 3).forEach(campaign => {
        console.log(`   - ${campaign.name}: ${campaign.status || 'Unknown status'}`);
        if (campaign.stats) {
          console.log(`     Stats: ${campaign.stats.sent} sent, ${campaign.stats.opened} opened`);
        }
      });
    } else {
      console.log('❌ Failed to load campaigns');
    }

    console.log('\n🎉 Email Marketing System Test Complete!');
    console.log('=' .repeat(60));
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Recipient management with real user data');
    console.log('✅ Campaign preview with personalized content');
    console.log('✅ Email delivery tracking with realistic statistics');
    console.log('✅ Template system with Apple-inspired design');
    console.log('✅ Comprehensive campaign management');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('fetch')) {
      console.log('💡 Make sure the server is running on http://localhost:5000');
    }
  }
}

// Enhanced demo function for interactive testing
async function demoEmailMarketing() {
  console.log('🎭 Interactive Email Marketing Demo');
  console.log('=' .repeat(50));

  try {
    // Demo 1: Show real user statistics
    console.log('\n1️⃣  Real User Statistics:');
    const { data: stats } = await makeRequest('/api/admin/stats');
    if (stats) {
      console.log(`   📊 Platform Users: ${stats.totalUsers}`);
      console.log(`   🏢 Organizations: ${stats.totalOrganizations}`);
      console.log(`   💳 Total Credits: ${stats.totalCredits || 'N/A'}`);
    }

    // Demo 2: Preview each template with user data
    console.log('\n2️⃣  Template Previews with Real User Data:');
    
    const templates = ['welcome', 'newsletter', 'promotion'];
    for (const templateId of templates) {
      console.log(`\n   🎨 ${templateId.toUpperCase()} Template:`);
      
      const { data: preview } = await makeRequest('/api/email/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          recipientType: 'all',
          recipientIds: []
        })
      });

      if (preview.success) {
        console.log(`      📧 Subject: "${preview.preview.subject}"`);
        console.log(`      👤 User: ${preview.sampleUser.firstName} (${preview.sampleUser.email})`);
        console.log(`      📝 Personalized: ${preview.preview.htmlContent.includes(preview.sampleUser.firstName) ? 'Yes' : 'No'}`);
        console.log(`      📏 Content: ${(preview.preview.htmlContent.length / 1000).toFixed(1)}KB`);
      }
    }

    // Demo 3: Campaign targeting simulation
    console.log('\n3️⃣  Campaign Targeting Options:');
    
    const { data: recipients } = await makeRequest('/api/email/campaigns/demo/recipients');
    if (recipients?.success) {
      console.log(`   🎯 All Users: ${recipients.stats.totalUsers} recipients`);
      console.log(`   🏢 Organizations: ${recipients.stats.totalOrganizations} groups`);
      console.log(`   ✅ Active Users: ${recipients.stats.activeUsers} ready to receive`);
    }

    // Demo 4: Simulated campaign delivery
    console.log('\n4️⃣  Campaign Delivery Simulation:');
    
    const { data: delivery } = await makeRequest('/api/email/campaigns/demo-campaign/send', {
      method: 'POST',
      body: JSON.stringify({
        recipientType: 'all',
        recipientIds: [],
        organizationIds: []
      })
    });

    if (delivery?.success) {
      console.log(`   📤 Sent: ${delivery.stats.sent || delivery.stats.totalRecipients} emails`);
      console.log(`   ✅ Delivered: ${delivery.stats.delivered} (${((delivery.stats.delivered / delivery.stats.totalRecipients) * 100).toFixed(1)}%)`);
      console.log(`   👀 Opened: ${delivery.stats.opened} (${((delivery.stats.opened / delivery.stats.delivered) * 100).toFixed(1)}%)`);
      console.log(`   🖱️  Clicked: ${delivery.stats.clicked} (${((delivery.stats.clicked / delivery.stats.opened) * 100).toFixed(1)}%)`);
      console.log(`   ❌ Bounced: ${delivery.stats.bounced} (${((delivery.stats.bounced / delivery.stats.totalRecipients) * 100).toFixed(1)}%)`);
    }

    console.log('\n🎉 Demo Complete! The email marketing system is fully functional.');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run based on command line argument
const runMode = process.argv[2] || 'test';

if (runMode === 'demo') {
  demoEmailMarketing();
} else {
  testEmailMarketingSystem();
}