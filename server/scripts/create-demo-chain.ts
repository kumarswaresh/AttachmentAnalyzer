import { storage } from './storage';
import { nanoid } from 'nanoid';

// Create a demo content creation pipeline chain
export async function createDemoContentChain() {
  const chainId = nanoid();
  
  const contentChain = {
    id: chainId,
    name: "Content Creation Pipeline Demo",
    description: "Automated content creation workflow: Research → Writing → Review",
    steps: [
      {
        id: "research_phase",
        name: "Research Phase",
        description: "Gather information and insights on the topic",
        agentRole: "Research Specialist",
        condition: "$.input.topic !== undefined",
        inputMapping: {
          topic: "$.input.topic",
          sources: "$.input.sources || ['web', 'academic']",
          depth: "$.input.depth || 'comprehensive'"
        },
        outputMapping: {
          research_data: "$.output.findings",
          key_points: "$.output.insights",
          sources_used: "$.output.sources"
        },
        timeout: 120000,
        retryCount: 2
      },
      {
        id: "content_creation",
        name: "Content Creation",
        description: "Generate content based on research findings",
        agentRole: "Content Writer",
        condition: "$.previous_step.status === 'completed'",
        inputMapping: {
          research_data: "$.research_phase.output.research_data",
          key_points: "$.research_phase.output.key_points",
          content_type: "$.input.content_type || 'article'",
          tone: "$.input.tone || 'professional'"
        },
        outputMapping: {
          content: "$.output.generated_content",
          word_count: "$.output.word_count",
          metadata: "$.output.content_metadata"
        },
        timeout: 180000,
        retryCount: 2
      },
      {
        id: "quality_review",
        name: "Quality Review",
        description: "Review and validate the generated content",
        agentRole: "Content Reviewer",
        condition: "$.previous_step.status === 'completed'",
        inputMapping: {
          content: "$.content_creation.output.content",
          criteria: "$.input.review_criteria || ['accuracy', 'readability', 'engagement']",
          standards: "$.input.quality_standards || 'high'"
        },
        outputMapping: {
          approved_content: "$.output.final_content",
          quality_score: "$.output.score",
          suggestions: "$.output.improvements",
          status: "$.output.approval_status"
        },
        timeout: 90000,
        retryCount: 1
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  };

  // Store the demo chain
  await storage.createChain(contentChain);
  return contentChain;
}

// Create a demo data analysis pipeline chain
export async function createDemoAnalysisChain() {
  const chainId = nanoid();
  
  const analysisChain = {
    id: chainId,
    name: "Data Analysis Pipeline Demo",
    description: "Automated data analysis workflow: Validation → Analysis → Reporting",
    steps: [
      {
        id: "data_validation",
        name: "Data Validation",
        description: "Clean and validate input data",
        agentRole: "Data Validator",
        condition: "$.input.dataset !== undefined",
        inputMapping: {
          dataset: "$.input.dataset",
          validation_rules: "$.input.rules || ['completeness', 'consistency', 'accuracy']",
          threshold: "$.input.quality_threshold || 0.95"
        },
        outputMapping: {
          clean_data: "$.output.validated_data",
          quality_report: "$.output.validation_report",
          issues_found: "$.output.data_issues"
        },
        timeout: 60000,
        retryCount: 2
      },
      {
        id: "statistical_analysis",
        name: "Statistical Analysis",
        description: "Perform comprehensive data analysis",
        agentRole: "Data Analyst",
        condition: "$.previous_step.status === 'completed'",
        inputMapping: {
          data: "$.data_validation.output.clean_data",
          analysis_type: "$.input.analysis_type || 'descriptive'",
          metrics: "$.input.metrics || ['mean', 'median', 'std', 'correlation']"
        },
        outputMapping: {
          results: "$.output.analysis_results",
          visualizations: "$.output.charts",
          insights: "$.output.key_insights"
        },
        timeout: 120000,
        retryCount: 2
      },
      {
        id: "report_generation",
        name: "Report Generation",
        description: "Create comprehensive analysis report",
        agentRole: "Report Generator",
        condition: "$.previous_step.status === 'completed'",
        inputMapping: {
          analysis_results: "$.statistical_analysis.output.results",
          visualizations: "$.statistical_analysis.output.visualizations",
          insights: "$.statistical_analysis.output.insights",
          format: "$.input.report_format || 'executive_summary'"
        },
        outputMapping: {
          final_report: "$.output.complete_report",
          executive_summary: "$.output.summary",
          recommendations: "$.output.action_items"
        },
        timeout: 90000,
        retryCount: 1
      }
    ],
    createdAt: new Date().toISOString(),
    isActive: true
  };

  await storage.createChain(analysisChain);
  return analysisChain;
}

// Initialize demo chains
export async function initializeDemoChains() {
  try {
    const contentChain = await createDemoContentChain();
    const analysisChain = await createDemoAnalysisChain();
    
    console.log('Demo chains created successfully:');
    console.log(`- Content Creation Pipeline: ${contentChain.id}`);
    console.log(`- Data Analysis Pipeline: ${analysisChain.id}`);
    
    return { contentChain, analysisChain };
  } catch (error) {
    console.error('Error creating demo chains:', error);
    throw error;
  }
}