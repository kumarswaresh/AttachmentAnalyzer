import { storage } from "./storage";
import type { InsertAgent } from "@shared/schema";

export async function createCSharpCodingAgent() {
  const csharpAgent: InsertAgent = {
    name: "C# Enterprise Developer",
    goal: "Create enterprise-grade C# applications with .NET framework, including web APIs, desktop apps, and microservices with best practices",
    role: "Senior C# Developer",
    instructions: `You are an expert C# developer specializing in:

**Core Technologies:**
- .NET Core/.NET Framework
- ASP.NET Core Web API
- Entity Framework Core
- LINQ and Lambda expressions
- Dependency Injection patterns
- xUnit/NUnit testing frameworks

**Specializations:**
- Enterprise application architecture
- RESTful API design and implementation
- Database-first and code-first approaches with EF Core
- Async/await patterns and performance optimization
- SOLID principles and design patterns
- Authentication and authorization (JWT, OAuth)
- Microservices architecture with Docker

**Code Generation Guidelines:**
1. Always include proper error handling with try-catch blocks
2. Use dependency injection for better testability
3. Implement logging using ILogger interface
4. Follow C# naming conventions (PascalCase for methods, camelCase for variables)
5. Include XML documentation comments for public methods
6. Use nullable reference types when appropriate
7. Implement proper validation using FluentValidation or Data Annotations
8. Create comprehensive unit tests with xUnit
9. Use async/await for I/O operations
10. Follow repository pattern for data access

**Response Format:**
- Provide complete, compilable C# code
- Include necessary using statements
- Add XML documentation for public methods
- Include example usage or test cases
- Explain architectural decisions and patterns used`,
    
    modules: [
      {
        moduleId: "code-generation-module",
        version: "1.0.0",
        config: { 
          language: "csharp",
          framework: "dotnet-core",
          patterns: ["repository", "dependency-injection", "cqrs"]
        },
        enabled: true
      },
      {
        moduleId: "testing-module",
        version: "1.0.0",
        config: { 
          framework: "xUnit",
          coverage: "enabled"
        },
        enabled: true
      },
      {
        moduleId: "database-module",
        version: "1.0.0",
        config: { 
          orm: "EntityFramework",
          provider: "SqlServer"
        },
        enabled: true
      },
      {
        moduleId: "api-module",
        version: "1.0.0",
        config: { 
          type: "WebAPI",
          authentication: "JWT"
        },
        enabled: true
      }
    ],
    
    model: "claude-3-sonnet-20240229",
    
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 8000,
      allowedDomains: [
        "docs.microsoft.com",
        "nuget.org",
        "stackoverflow.com",
        "github.com",
        "learn.microsoft.com"
      ],
      blockedKeywords: ["malicious", "exploit", "hack", "unsafe"]
    },
    
    vectorStoreId: "default",
    userId: 1, // Admin user
    organizationId: 1
  };

  try {
    const createdAgent = await storage.createAgent(csharpAgent);
    console.log(`Created C# Coding Agent with ID: ${createdAgent.id}`);
    return createdAgent;
  } catch (error) {
    console.error("Failed to create C# coding agent:", error);
    throw error;
  }
}

// Auto-create the agent when this module is imported
createCSharpCodingAgent()
  .then((agent) => {
    console.log("C# Coding Agent created successfully:", {
      id: agent.id,
      name: agent.name,
      role: agent.role
    });
  })
  .catch((error) => {
    console.error("Failed to create C# agent:", error);
  });