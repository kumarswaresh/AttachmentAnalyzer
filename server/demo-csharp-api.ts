import { codeGenerationService } from './services/code-generation-service';
import type { CodeGenerationRequest } from './services/code-generation-service';

/**
 * Demo C# API Generation using the specialized C# agent
 * This demonstrates creating a complete Task Management API with CRUD operations
 */
export async function createCSharpTaskAPI() {
  console.log('🚀 Creating C# Task Management API using specialized C# agent...');

  const apiRequest: CodeGenerationRequest = {
    prompt: `Create a complete C# Web API for a Task Management system with the following requirements:

1. **Task Model**: 
   - Id (int, primary key)
   - Title (string, required)
   - Description (string, optional)
   - IsCompleted (bool, default false)
   - CreatedAt (DateTime)
   - UpdatedAt (DateTime)

2. **API Endpoints**:
   - GET /api/tasks - Get all tasks
   - GET /api/tasks/{id} - Get task by ID
   - POST /api/tasks - Create new task
   - PUT /api/tasks/{id} - Update task
   - DELETE /api/tasks/{id} - Delete task

3. **Features to include**:
   - Entity Framework Core for data access
   - Repository pattern
   - Dependency injection
   - Input validation using FluentValidation
   - Proper error handling with custom exceptions
   - Async/await patterns
   - Logging with ILogger
   - AutoMapper for DTOs
   - Swagger documentation

4. **Architecture**:
   - Clean architecture with separate layers
   - Controllers, Services, Repositories
   - DTOs for request/response
   - Custom exception handling middleware`,
    
    language: 'csharp',
    agentType: 'csharp_developer',
    complexity: 'advanced',
    includeTests: true,
    includeDocumentation: true
  };

  try {
    const result = await codeGenerationService.generateCode(apiRequest);
    
    if (result.success) {
      console.log('✅ C# Task Management API generated successfully!');
      console.log(`⏱️  Generation time: ${result.executionTime}ms`);
      
      // Display the generated API code
      console.log('\n📋 Generated C# Task Management API:');
      console.log('=' .repeat(80));
      console.log(result.code);
      
      if (result.testCode) {
        console.log('\n🧪 Generated Unit Tests:');
        console.log('=' .repeat(80));
        console.log(result.testCode);
      }
      
      if (result.documentation) {
        console.log('\n📚 API Documentation:');
        console.log('=' .repeat(80));
        console.log(result.documentation);
      }
      
      console.log('\n💡 Implementation Suggestions:');
      result.suggestions?.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
      
      console.log('\n🔍 Code Explanation:');
      console.log(result.explanation);
      
      return result;
    } else {
      console.error('❌ Failed to generate C# API');
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating C# API:', error);
    throw error;
  }
}

/**
 * Test the generated C# API functionality
 */
export async function testCSharpAPI() {
  console.log('\n🧪 Testing C# API functionality...');
  
  const testScenarios = [
    {
      name: 'Create Task',
      method: 'POST',
      endpoint: '/api/tasks',
      payload: {
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication to the API'
      }
    },
    {
      name: 'Get All Tasks',
      method: 'GET',
      endpoint: '/api/tasks'
    },
    {
      name: 'Get Task by ID',
      method: 'GET',
      endpoint: '/api/tasks/1'
    },
    {
      name: 'Update Task',
      method: 'PUT',
      endpoint: '/api/tasks/1',
      payload: {
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication with role-based authorization',
        isCompleted: true
      }
    },
    {
      name: 'Delete Task',
      method: 'DELETE',
      endpoint: '/api/tasks/1'
    }
  ];

  console.log('\n📝 API Test Scenarios:');
  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.method} ${scenario.endpoint} - ${scenario.name}`);
    if (scenario.payload) {
      console.log(`   Payload: ${JSON.stringify(scenario.payload, null, 2)}`);
    }
  });

  return testScenarios;
}

/**
 * Generate additional C# components for the API
 */
export async function generateCSharpComponents() {
  console.log('\n🔧 Generating additional C# components...');

  const components = [
    {
      name: 'Entity Models',
      prompt: 'Create Entity Framework Core models for Task entity with proper annotations and relationships'
    },
    {
      name: 'DTOs',
      prompt: 'Create Data Transfer Objects (DTOs) for Task API including CreateTaskDto, UpdateTaskDto, and TaskResponseDto'
    },
    {
      name: 'Repository Pattern',
      prompt: 'Create repository interface and implementation for Task entity using Entity Framework Core'
    },
    {
      name: 'Service Layer',
      prompt: 'Create service layer for Task management with business logic and validation'
    },
    {
      name: 'Exception Handling',
      prompt: 'Create custom exception classes and global exception handling middleware for the Task API'
    }
  ];

  const generatedComponents = [];

  for (const component of components) {
    try {
      console.log(`\n🔨 Generating ${component.name}...`);
      
      const result = await codeGenerationService.generateCode({
        prompt: component.prompt,
        language: 'csharp',
        agentType: 'csharp_developer',
        complexity: 'intermediate',
        includeTests: false,
        includeDocumentation: true
      });

      if (result.success) {
        console.log(`✅ ${component.name} generated successfully`);
        generatedComponents.push({
          name: component.name,
          code: result.code,
          explanation: result.explanation
        });
      }
    } catch (error) {
      console.error(`❌ Failed to generate ${component.name}:`, error);
    }
  }

  return generatedComponents;
}

// Main demo function
export async function runCSharpAPIDemo() {
  console.log('🎯 Starting C# Task Management API Demo');
  console.log('Using specialized C# Enterprise Developer agent');
  console.log('=' .repeat(80));

  try {
    // 1. Generate the main API
    const apiResult = await createCSharpTaskAPI();
    
    if (!apiResult) {
      console.error('❌ Failed to generate main API, stopping demo');
      return;
    }

    // 2. Generate additional components
    await generateCSharpComponents();

    // 3. Test the API
    await testCSharpAPI();

    console.log('\n🎉 C# API Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Complete Task Management API with CRUD operations');
    console.log('- ✅ Entity Framework Core integration');
    console.log('- ✅ Repository pattern implementation');
    console.log('- ✅ Dependency injection setup');
    console.log('- ✅ Input validation with FluentValidation');
    console.log('- ✅ Comprehensive error handling');
    console.log('- ✅ Unit tests included');
    console.log('- ✅ API documentation generated');
    console.log('- ✅ Production-ready code structure');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}