import { db } from './db';
import { users, agents, agentApps } from '@shared/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Simple demo setup that works with existing schema
export async function setupSimpleDemo() {
  console.log('Setting up simple demo environment...');

  try {
    // Create 3 SuperAdmin users
    const superAdmins = [
      { username: 'superadmin1', email: 'superadmin1@platform.com', globalRole: 'superadmin' },
      { username: 'superadmin2', email: 'superadmin2@platform.com', globalRole: 'superadmin' },
      { username: 'superadmin3', email: 'superadmin3@platform.com', globalRole: 'superadmin' }
    ];

    const createdAdmins = [];
    for (const admin of superAdmins) {
      try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const [createdUser] = await db.insert(users).values({
          ...admin,
          password: hashedPassword,
          isActive: true,
          metadata: {
            preferences: { theme: 'dark', notifications: true },
            notifications: { email: true, push: false },
            timezone: 'UTC'
          }
        }).returning();
        createdAdmins.push(createdUser);
        console.log(`Created SuperAdmin: ${createdUser.username}`);
      } catch (error) {
        console.log(`SuperAdmin ${admin.username} may already exist, skipping...`);
      }
    }

    // Create organization admin users
    const orgAdmins = [
      { username: 'admin_techcorp', email: 'admin@techcorp.com', globalRole: 'admin' },
      { username: 'admin_marketing', email: 'admin@marketingpro.com', globalRole: 'admin' },
      { username: 'admin_finance', email: 'admin@financewise.com', globalRole: 'admin' },
      { username: 'admin_health', email: 'admin@healthtech.com', globalRole: 'admin' },
      { username: 'admin_edu', email: 'admin@edulearn.com', globalRole: 'admin' }
    ];

    const createdOrgAdmins = [];
    for (const admin of orgAdmins) {
      try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [createdUser] = await db.insert(users).values({
          ...admin,
          password: hashedPassword,
          isActive: true,
          metadata: {
            preferences: { theme: 'light', notifications: true },
            notifications: { email: true, push: true },
            timezone: 'UTC'
          }
        }).returning();
        createdOrgAdmins.push(createdUser);
        console.log(`Created Org Admin: ${createdUser.username}`);
      } catch (error) {
        console.log(`Org Admin ${admin.username} may already exist, skipping...`);
      }
    }

    // Create regular users
    const regularUsers = [
      { username: 'dev1_techcorp', email: 'dev1@techcorp.com', globalRole: 'user' },
      { username: 'dev2_techcorp', email: 'dev2@techcorp.com', globalRole: 'user' },
      { username: 'user1_marketing', email: 'user1@marketingpro.com', globalRole: 'user' },
      { username: 'user2_marketing', email: 'user2@marketingpro.com', globalRole: 'user' },
      { username: 'analyst1_finance', email: 'analyst1@financewise.com', globalRole: 'user' },
      { username: 'analyst2_finance', email: 'analyst2@financewise.com', globalRole: 'user' },
      { username: 'dev1_health', email: 'dev1@healthtech.com', globalRole: 'user' },
      { username: 'dev2_health', email: 'dev2@healthtech.com', globalRole: 'user' },
      { username: 'instructor1_edu', email: 'instructor1@edulearn.com', globalRole: 'user' },
      { username: 'instructor2_edu', email: 'instructor2@edulearn.com', globalRole: 'user' }
    ];

    const createdUsers = [];
    for (const user of regularUsers) {
      try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const [createdUser] = await db.insert(users).values({
          ...user,
          password: hashedPassword,
          isActive: true,
          metadata: {
            preferences: { theme: 'light', notifications: true },
            notifications: { email: true, push: true },
            timezone: 'UTC'
          }
        }).returning();
        createdUsers.push(createdUser);
        console.log(`Created User: ${createdUser.username}`);
      } catch (error) {
        console.log(`User ${user.username} may already exist, skipping...`);
      }
    }

    // Create sample agents for different organizations
    const agentTemplates = [
      { name: 'TechCorp Customer Support Agent', role: 'customer_support', goal: 'Provide technical support for software products', userId: createdOrgAdmins[0]?.id || 1 },
      { name: 'TechCorp Code Review Agent', role: 'code_reviewer', goal: 'Review code quality and suggest improvements', userId: createdOrgAdmins[0]?.id || 1 },
      { name: 'Marketing Campaign Agent', role: 'marketing_assistant', goal: 'Create and optimize marketing campaigns', userId: createdOrgAdmins[1]?.id || 1 },
      { name: 'Marketing Content Agent', role: 'content_creator', goal: 'Generate engaging marketing content', userId: createdOrgAdmins[1]?.id || 1 },
      { name: 'Finance Analysis Agent', role: 'financial_analyst', goal: 'Analyze financial data and generate reports', userId: createdOrgAdmins[2]?.id || 1 },
      { name: 'Finance Compliance Agent', role: 'compliance_checker', goal: 'Ensure financial compliance and regulations', userId: createdOrgAdmins[2]?.id || 1 },
      { name: 'HealthTech Diagnosis Agent', role: 'medical_assistant', goal: 'Assist with medical diagnosis and recommendations', userId: createdOrgAdmins[3]?.id || 1 },
      { name: 'HealthTech Patient Care Agent', role: 'patient_care', goal: 'Provide patient care guidance and support', userId: createdOrgAdmins[3]?.id || 1 },
      { name: 'EduLearn Tutor Agent', role: 'educational_tutor', goal: 'Provide personalized tutoring and learning support', userId: createdOrgAdmins[4]?.id || 1 },
      { name: 'EduLearn Assessment Agent', role: 'assessment_grader', goal: 'Grade assignments and provide feedback', userId: createdOrgAdmins[4]?.id || 1 }
    ];

    const createdAgents = [];
    for (const agentTemplate of agentTemplates) {
      try {
        const [createdAgent] = await db.insert(agents).values({
          id: crypto.randomUUID(),
          name: agentTemplate.name,
          goal: agentTemplate.goal,
          role: agentTemplate.role,
          userId: agentTemplate.userId,
          guardrails: {
            requireHumanApproval: false,
            contentFiltering: true,
            readOnlyMode: false,
            maxTokens: 2000,
            allowedDomains: ['*'],
            blockedKeywords: ['sensitive', 'confidential']
          },
          modules: [],
          modelId: 'gpt-4',
          isActive: true,
          isPublic: false
        }).returning();
        createdAgents.push(createdAgent);
        console.log(`Created agent: ${createdAgent.name}`);
      } catch (error) {
        console.log(`Agent ${agentTemplate.name} may already exist, skipping...`);
      }
    }

    // Create sample agent apps
    const appTemplates = [
      { name: 'TechCorp Support Workflow', category: 'customer_service', description: 'Automated customer support ticket resolution', userId: createdOrgAdmins[0]?.id || 1 },
      { name: 'Marketing Campaign Optimizer', category: 'marketing', description: 'Optimize marketing campaigns for better ROI', userId: createdOrgAdmins[1]?.id || 1 },
      { name: 'Financial Risk Analyzer', category: 'finance', description: 'Analyze and assess financial risks', userId: createdOrgAdmins[2]?.id || 1 },
      { name: 'Patient Care Coordinator', category: 'healthcare', description: 'Coordinate patient care and scheduling', userId: createdOrgAdmins[3]?.id || 1 },
      { name: 'Learning Path Generator', category: 'education', description: 'Generate personalized learning paths for students', userId: createdOrgAdmins[4]?.id || 1 }
    ];

    const createdApps = [];
    for (const appTemplate of appTemplates) {
      try {
        const [createdApp] = await db.insert(agentApps).values({
          id: crypto.randomUUID(),
          name: appTemplate.name,
          description: appTemplate.description,
          category: appTemplate.category,
          flowDefinition: [
            { id: 'start', type: 'trigger', config: { event: 'user_input' } },
            { id: 'process', type: 'agent', config: { agentId: 'auto-assign' } },
            { id: 'end', type: 'response', config: { format: 'json' } }
          ],
          isActive: true,
          isPublic: false,
          createdBy: appTemplate.userId,
          executionCount: Math.floor(Math.random() * 100),
          avgExecutionTime: Math.floor(Math.random() * 5000) + 1000
        }).returning();
        createdApps.push(createdApp);
        console.log(`Created app: ${createdApp.name}`);
      } catch (error) {
        console.log(`App ${appTemplate.name} may already exist, skipping...`);
      }
    }

    console.log('\n✅ Simple demo setup completed successfully!');
    console.log('\nCreated:');
    console.log(`- ${createdAdmins.length} SuperAdmin users`);
    console.log(`- ${createdOrgAdmins.length} Organization admin users`);
    console.log(`- ${createdUsers.length} Regular users`);
    console.log(`- ${createdAgents.length} Agents across different domains`);
    console.log(`- ${createdApps.length} Agent apps for various use cases`);

    return {
      summary: {
        totalSuperAdmins: createdAdmins.length,
        totalOrgAdmins: createdOrgAdmins.length,
        totalUsers: createdUsers.length,
        totalAgents: createdAgents.length,
        totalApps: createdApps.length
      },
      users: {
        superAdmins: createdAdmins,
        orgAdmins: createdOrgAdmins,
        regularUsers: createdUsers
      },
      agents: createdAgents,
      apps: createdApps
    };

  } catch (error) {
    console.error('Error setting up simple demo:', error);
    throw error;
  }
}

// Run the setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSimpleDemo().then(() => {
    console.log('Simple demo setup completed');
    process.exit(0);
  }).catch(error => {
    console.error('Simple demo setup failed:', error);
    process.exit(1);
  });
}