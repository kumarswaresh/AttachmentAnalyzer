#!/usr/bin/env node

/**
 * Agent Export Script
 * Exports all agents and related data to a JSON file for migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
};

async function exportAgents() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting agent export...');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      agents: [],
      agentCredentials: [],
      agentExecutions: [],
      agentMessages: [],
      executionLogs: [],
      marketingCampaigns: [],
      metadata: {}
    };

    // Export agents
    console.log('📦 Exporting agents...');
    const agentsResult = await pool.query(`
      SELECT * FROM agents 
      ORDER BY "createdAt" DESC
    `);
    exportData.agents = agentsResult.rows;
    console.log(`   ✓ Exported ${agentsResult.rows.length} agents`);

    // Export agent credentials
    console.log('🔑 Exporting agent credentials...');
    const credentialsResult = await pool.query(`
      SELECT * FROM agent_credentials 
      ORDER BY "createdAt" DESC
    `);
    exportData.agentCredentials = credentialsResult.rows;
    console.log(`   ✓ Exported ${credentialsResult.rows.length} agent credentials`);

    // Export agent executions
    console.log('⚡ Exporting agent executions...');
    const executionsResult = await pool.query(`
      SELECT * FROM agent_executions 
      ORDER BY "createdAt" DESC
      LIMIT 1000
    `);
    exportData.agentExecutions = executionsResult.rows;
    console.log(`   ✓ Exported ${executionsResult.rows.length} agent executions`);

    // Export agent messages
    console.log('💬 Exporting agent messages...');
    const messagesResult = await pool.query(`
      SELECT * FROM agent_messages 
      ORDER BY "createdAt" DESC
      LIMIT 1000
    `);
    exportData.agentMessages = messagesResult.rows;
    console.log(`   ✓ Exported ${messagesResult.rows.length} agent messages`);

    // Export execution logs
    console.log('📋 Exporting execution logs...');
    const logsResult = await pool.query(`
      SELECT * FROM execution_logs 
      ORDER BY "createdAt" DESC
      LIMIT 1000
    `);
    exportData.executionLogs = logsResult.rows;
    console.log(`   ✓ Exported ${logsResult.rows.length} execution logs`);

    // Export marketing campaigns (if table exists)
    try {
      console.log('📈 Exporting marketing campaigns...');
      const campaignsResult = await pool.query(`
        SELECT * FROM marketing_campaigns 
        ORDER BY "createdAt" DESC
      `);
      exportData.marketingCampaigns = campaignsResult.rows;
      console.log(`   ✓ Exported ${campaignsResult.rows.length} marketing campaigns`);
    } catch (error) {
      console.log('   ⚠️ Marketing campaigns table not found, skipping...');
    }

    // Add metadata
    exportData.metadata = {
      totalAgents: exportData.agents.length,
      totalCredentials: exportData.agentCredentials.length,
      totalExecutions: exportData.agentExecutions.length,
      totalMessages: exportData.agentMessages.length,
      totalLogs: exportData.executionLogs.length,
      totalCampaigns: exportData.marketingCampaigns.length,
      exportedBy: process.env.USER || 'system',
      sourceDatabase: dbConfig.connectionString.split('@')[1]?.split('/')[0] || 'unknown'
    };

    // Create export filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `agent-export-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'exports', filename);

    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write export file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log('\n✅ Export completed successfully!');
    console.log(`📁 File: ${filepath}`);
    console.log(`💾 Size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n📊 Export Summary:');
    console.log(`   • Agents: ${exportData.metadata.totalAgents}`);
    console.log(`   • Credentials: ${exportData.metadata.totalCredentials}`);
    console.log(`   • Executions: ${exportData.metadata.totalExecutions}`);
    console.log(`   • Messages: ${exportData.metadata.totalMessages}`);
    console.log(`   • Logs: ${exportData.metadata.totalLogs}`);
    console.log(`   • Campaigns: ${exportData.metadata.totalCampaigns}`);

    return filepath;

  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run export if called directly
if (require.main === module) {
  exportAgents()
    .then((filepath) => {
      console.log(`\n🎉 Ready for transfer to another machine!`);
      console.log(`📋 Use import-agents.js to restore on target system.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Export failed:', error);
      process.exit(1);
    });
}

module.exports = { exportAgents };