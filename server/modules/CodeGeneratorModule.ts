export interface CodeGeneratorConfig {
  supportedLanguages: string[];
  maxOutputLength: number;
  includeComments: boolean;
  includeTests: boolean;
  codeStyle: {
    indentation: "spaces" | "tabs";
    indentSize: number;
    maxLineLength: number;
  };
}

export interface CodeGenerationRequest {
  language: string;
  description: string;
  requirements?: string[];
  framework?: string;
  style?: "functional" | "object-oriented" | "procedural";
  includeDocumentation?: boolean;
}

export class CodeGeneratorModule {
  private config: CodeGeneratorConfig;

  constructor(config: CodeGeneratorConfig) {
    this.config = config;
  }

  async invoke(input: CodeGenerationRequest): Promise<{
    code: string;
    tests?: string;
    documentation?: string;
    metadata: any;
  }> {
    try {
      // Validate language support
      if (!this.config.supportedLanguages.includes(input.language)) {
        throw new Error(`Language ${input.language} is not supported`);
      }

      const startTime = Date.now();

      // Generate main code
      const code = await this.generateCode(input);

      // Generate tests if enabled
      let tests: string | undefined;
      if (this.config.includeTests) {
        tests = await this.generateTests(input, code);
      }

      // Generate documentation if requested
      let documentation: string | undefined;
      if (input.includeDocumentation) {
        documentation = await this.generateDocumentation(input, code);
      }

      const processingTime = Date.now() - startTime;

      return {
        code,
        tests,
        documentation,
        metadata: {
          language: input.language,
          framework: input.framework,
          style: input.style,
          linesOfCode: code.split('\n').length,
          estimatedComplexity: this.estimateComplexity(code),
          processingTime
        }
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async generateCode(input: CodeGenerationRequest): Promise<string> {
    const { language, description, requirements = [], framework, style = "functional" } = input;

    // This would typically call an LLM or use code generation templates
    // For now, providing template-based generation for common patterns

    switch (language.toLowerCase()) {
      case "typescript":
      case "javascript":
        return this.generateJavaScriptCode(description, requirements, framework, style);
      
      case "python":
        return this.generatePythonCode(description, requirements, framework, style);
      
      case "java":
        return this.generateJavaCode(description, requirements, framework, style);
      
      case "sql":
        return this.generateSQLCode(description, requirements);
      
      default:
        throw new Error(`Code generation for ${language} not implemented`);
    }
  }

  private generateJavaScriptCode(
    description: string,
    requirements: string[],
    framework?: string,
    style?: string
  ): string {
    const indent = this.getIndentation();
    
    if (framework === "express") {
      return `// ${description}
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
${indent}res.json({ message: 'API is running' });
});

${requirements.map(req => `// TODO: Implement ${req}`).join('\n')}

// Start server
app.listen(port, () => {
${indent}console.log(\`Server running on port \${port}\`);
});

export default app;`;
    }

    if (style === "functional") {
      return `// ${description}

/**
 * Main function implementing the required functionality
 */
export const main = () => {
${indent}// TODO: Implement core functionality
${requirements.map(req => `${indent}// - ${req}`).join('\n')}
${indent}
${indent}return {
${indent}${indent}status: 'success',
${indent}${indent}data: null
${indent}};
};

// Export utility functions
export const helper = {
${indent}// Add helper functions here
};`;
    }

    return `// ${description}
class Implementation {
${requirements.map(req => `${indent}// TODO: ${req}`).join('\n')}

${indent}constructor() {
${indent}${indent}// Initialize
${indent}}

${indent}execute() {
${indent}${indent}// Main execution logic
${indent}${indent}return { status: 'success' };
${indent}}
}

export default Implementation;`;
  }

  private generatePythonCode(
    description: string,
    requirements: string[],
    framework?: string,
    style?: string
  ): string {
    const indent = "    "; // Python uses 4 spaces

    if (framework === "fastapi") {
      return `"""${description}"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="${description}")

class Response(BaseModel):
    status: str
    data: dict = None

@app.get("/")
async def root():
    return {"message": "API is running"}

${requirements.map(req => `# TODO: Implement ${req}`).join('\n')}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`;
    }

    if (style === "functional") {
      return `"""${description}"""

def main():
    """Main function implementing the required functionality"""
${requirements.map(req => `${indent}# TODO: ${req}`).join('\n')}
    
    return {
        'status': 'success',
        'data': None
    }

def helper_function():
    """Helper function"""
    pass

if __name__ == "__main__":
    result = main()
    print(result)`;
    }

    return `"""${description}"""

class Implementation:
    """Main implementation class"""
    
    def __init__(self):
        """Initialize the implementation"""
${requirements.map(req => `${indent}${indent}# TODO: ${req}`).join('\n')}
        pass
    
    def execute(self):
        """Execute the main functionality"""
        return {'status': 'success'}

if __name__ == "__main__":
    impl = Implementation()
    result = impl.execute()
    print(result)`;
  }

  private generateJavaCode(
    description: string,
    requirements: string[],
    framework?: string,
    style?: string
  ): string {
    const className = this.toPascalCase(description.split(' ').slice(0, 2).join(''));
    
    return `/**
 * ${description}
 */
public class ${className} {
    
${requirements.map(req => `    // TODO: ${req}`).join('\n')}
    
    public ${className}() {
        // Constructor
    }
    
    public Result execute() {
        // Main execution logic
        return new Result("success", null);
    }
    
    // Result class
    public static class Result {
        private String status;
        private Object data;
        
        public Result(String status, Object data) {
            this.status = status;
            this.data = data;
        }
        
        // Getters and setters
        public String getStatus() { return status; }
        public Object getData() { return data; }
    }
    
    public static void main(String[] args) {
        ${className} impl = new ${className}();
        Result result = impl.execute();
        System.out.println("Status: " + result.getStatus());
    }
}`;
  }

  private generateSQLCode(description: string, requirements: string[]): string {
    return `-- ${description}

${requirements.map(req => `-- TODO: ${req}`).join('\n')}

-- Example table structure
CREATE TABLE IF NOT EXISTS example_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example query
SELECT * FROM example_table 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;`;
  }

  private async generateTests(input: CodeGenerationRequest, code: string): Promise<string> {
    const { language } = input;
    
    switch (language.toLowerCase()) {
      case "typescript":
      case "javascript":
        return this.generateJavaScriptTests(code);
      
      case "python":
        return this.generatePythonTests(code);
      
      case "java":
        return this.generateJavaTests(code);
      
      default:
        return `// Tests for ${language} not implemented yet`;
    }
  }

  private generateJavaScriptTests(code: string): string {
    return `// Generated tests
import { describe, test, expect } from 'vitest';
import { main } from './implementation';

describe('Implementation Tests', () => {
    test('should execute successfully', () => {
        const result = main();
        expect(result.status).toBe('success');
    });
    
    test('should handle edge cases', () => {
        // TODO: Add edge case tests
        expect(true).toBe(true);
    });
});`;
  }

  private generatePythonTests(code: string): string {
    return `"""Generated tests"""
import unittest
from implementation import main

class TestImplementation(unittest.TestCase):
    
    def test_main_execution(self):
        """Test main function execution"""
        result = main()
        self.assertEqual(result['status'], 'success')
    
    def test_edge_cases(self):
        """Test edge cases"""
        # TODO: Add edge case tests
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()`;
  }

  private generateJavaTests(code: string): string {
    return `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

public class ImplementationTest {
    
    private Implementation implementation;
    
    @BeforeEach
    void setUp() {
        implementation = new Implementation();
    }
    
    @Test
    void testExecution() {
        Implementation.Result result = implementation.execute();
        assertEquals("success", result.getStatus());
    }
    
    @Test
    void testEdgeCases() {
        // TODO: Add edge case tests
        assertTrue(true);
    }
}`;
  }

  private async generateDocumentation(input: CodeGenerationRequest, code: string): Promise<string> {
    return `# ${input.description}

## Overview
${input.description}

## Requirements
${input.requirements?.map(req => `- ${req}`).join('\n') || 'No specific requirements'}

## Language
${input.language}${input.framework ? ` (${input.framework})` : ''}

## Style
${input.style || 'Default'}

## Usage
\`\`\`${input.language}
// Example usage
${this.extractUsageExample(code)}
\`\`\`

## API Reference
- Main functions and classes are documented in the code
- Follow the patterns established in the generated code

## Notes
- Generated code should be reviewed and tested before production use
- Add error handling and validation as needed
- Consider performance implications for large-scale usage
`;
  }

  private extractUsageExample(code: string): string {
    // Extract the first few lines that look like usage
    const lines = code.split('\n');
    const exampleLines = lines.slice(0, 5).filter(line => 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      line.trim().length > 0
    );
    
    return exampleLines.slice(0, 3).join('\n') || '// See generated code for usage';
  }

  private estimateComplexity(code: string): "low" | "medium" | "high" {
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    const cyclomatic = (code.match(/if|for|while|switch|catch/g) || []).length;
    
    if (lines.length < 50 && cyclomatic < 5) return "low";
    if (lines.length < 200 && cyclomatic < 15) return "medium";
    return "high";
  }

  private getIndentation(): string {
    if (this.config.codeStyle.indentation === "tabs") {
      return "\t";
    }
    return " ".repeat(this.config.codeStyle.indentSize);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|\s)\S/g, match => match.toUpperCase()).replace(/\s+/g, '');
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: this.config.supportedLanguages,
          description: "Programming language for code generation"
        },
        description: {
          type: "string",
          description: "Description of what the code should do"
        },
        requirements: {
          type: "array",
          items: { type: "string" },
          description: "Specific requirements for the code"
        },
        framework: {
          type: "string",
          description: "Framework or library to use"
        },
        style: {
          type: "string",
          enum: ["functional", "object-oriented", "procedural"],
          description: "Programming style to use"
        },
        includeDocumentation: {
          type: "boolean",
          description: "Whether to generate documentation"
        }
      },
      required: ["language", "description"]
    };
  }
}
