#!/usr/bin/env node

/**
 * Agent Import Script
 * Imports agents and related data from exported JSON file
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
};

async function importAgents(importFilePath) {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting agent import...');
    
    // Validate import file
    if (!fs.existsSync(importFilePath)) {
      throw new Error(`Import file not found: ${importFilePath}`);
    }

    // Read and parse import file
    console.log('📖 Reading import file...');
    const importData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
    
    console.log(`   ✓ Import file created: ${importData.timestamp}`);
    console.log(`   ✓ Export version: ${importData.version}`);
    console.log(`   ✓ Source: ${importData.metadata?.sourceDatabase || 'unknown'}`);

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Import agents
      if (importData.agents && importData.agents.length > 0) {
        console.log('📦 Importing agents...');
        for (const agent of importData.agents) {
          await client.query(`
            INSERT INTO agents (
              id, name, description, category, capabilities, endpoint, status, 
              version, author, "createdAt", "updatedAt", "userId", "organizationId",
              config, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              capabilities = EXCLUDED.capabilities,
              "updatedAt" = EXCLUDED."updatedAt"
          `, [
            agent.id, agent.name, agent.description, agent.category,
            JSON.stringify(agent.capabilities), agent.endpoint, agent.status,
            agent.version, agent.author, agent.createdAt, agent.updatedAt,
            agent.userId, agent.organizationId, JSON.stringify(agent.config),
            JSON.stringify(agent.metadata)
          ]);
        }
        console.log(`   ✓ Imported ${importData.agents.length} agents`);
      }

      // Import agent credentials
      if (importData.agentCredentials && importData.agentCredentials.length > 0) {
        console.log('🔑 Importing agent credentials...');
        for (const credential of importData.agentCredentials) {
          await client.query(`
            INSERT INTO agent_credentials (
              id, "agentId", "credentialId", "isRequired", "createdAt"
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
          `, [
            credential.id, credential.agentId, credential.credentialId,
            credential.isRequired, credential.createdAt
          ]);
        }
        console.log(`   ✓ Imported ${importData.agentCredentials.length} credentials`);
      }

      // Import agent executions
      if (importData.agentExecutions && importData.agentExecutions.length > 0) {
        console.log('⚡ Importing agent executions...');
        for (const execution of importData.agentExecutions) {
          await client.query(`
            INSERT INTO agent_executions (
              id, "agentId", "userId", status, input, output, "createdAt",
              "updatedAt", "startedAt", "completedAt", error, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO NOTHING
          `, [
            execution.id, execution.agentId, execution.userId, execution.status,
            JSON.stringify(execution.input), JSON.stringify(execution.output),
            execution.createdAt, execution.updatedAt, execution.startedAt,
            execution.completedAt, execution.error, JSON.stringify(execution.metadata)
          ]);
        }
        console.log(`   ✓ Imported ${importData.agentExecutions.length} executions`);
      }

      // Import agent messages
      if (importData.agentMessages && importData.agentMessages.length > 0) {
        console.log('💬 Importing agent messages...');
        for (const message of importData.agentMessages) {
          await client.query(`
            INSERT INTO agent_messages (
              id, "fromAgentId", "toAgentId", "messageType", content, status,
              "createdAt", priority, "responseRequired", "responseTimeout",
              "chainExecutionId", metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO NOTHING
          `, [
            message.id, message.fromAgentId, message.toAgentId, message.messageType,
            JSON.stringify(message.content), message.status, message.createdAt,
            message.priority, message.responseRequired, message.responseTimeout,
            message.chainExecutionId, JSON.stringify(message.metadata)
          ]);
        }
        console.log(`   ✓ Imported ${importData.agentMessages.length} messages`);
      }

      // Import execution logs
      if (importData.executionLogs && importData.executionLogs.length > 0) {
        console.log('📋 Importing execution logs...');
        for (const log of importData.executionLogs) {
          await client.query(`
            INSERT INTO execution_logs (
              id, "executionId", "agentId", level, message, "timestamp",
              metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
          `, [
            log.id, log.executionId, log.agentId, log.level, log.message,
            log.timestamp, JSON.stringify(log.metadata)
          ]);
        }
        console.log(`   ✓ Imported ${importData.executionLogs.length} logs`);
      }

      // Import marketing campaigns
      if (importData.marketingCampaigns && importData.marketingCampaigns.length > 0) {
        try {
          console.log('📈 Importing marketing campaigns...');
          for (const campaign of importData.marketingCampaigns) {
            await client.query(`
              INSERT INTO marketing_campaigns (
                id, name, description, "targetAudience", "campaignType",
                status, "createdAt", "updatedAt", "userId", "organizationId",
                config, metrics
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                "updatedAt" = EXCLUDED."updatedAt"
            `, [
              campaign.id, campaign.name, campaign.description, campaign.targetAudience,
              campaign.campaignType, campaign.status, campaign.createdAt,
              campaign.updatedAt, campaign.userId, campaign.organizationId,
              JSON.stringify(campaign.config), JSON.stringify(campaign.metrics)
            ]);
          }
          console.log(`   ✓ Imported ${importData.marketingCampaigns.length} campaigns`);
        } catch (error) {
          console.log('   ⚠️ Marketing campaigns table not found, skipping...');
        }
      }

      await client.query('COMMIT');
      
      console.log('\n✅ Import completed successfully!');
      console.log('\n📊 Import Summary:');
      console.log(`   • Agents: ${importData.agents?.length || 0}`);
      console.log(`   • Credentials: ${importData.agentCredentials?.length || 0}`);
      console.log(`   • Executions: ${importData.agentExecutions?.length || 0}`);
      console.log(`   • Messages: ${importData.agentMessages?.length || 0}`);
      console.log(`   • Logs: ${importData.executionLogs?.length || 0}`);
      console.log(`   • Campaigns: ${importData.marketingCampaigns?.length || 0}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run import if called directly
if (require.main === module) {
  const importFile = process.argv[2];
  
  if (!importFile) {
    console.error('❌ Usage: node import-agents.js <import-file.json>');
    console.log('\nExample:');
    console.log('  node import-agents.js exports/agent-export-2024-06-12.json');
    process.exit(1);
  }

  importAgents(importFile)
    .then(() => {
      console.log('\n🎉 Agents successfully imported to new database!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importAgents };