export interface DocumentGenerationConfig {
  supportedFormats: string[];
  templates: Record<string, DocumentTemplate>;
  maxDocumentLength: number;
  includeMetadata: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  format: string;
  sections: DocumentSection[];
  variables: Record<string, any>;
}

export interface DocumentSection {
  id: string;
  title: string;
  type: "text" | "list" | "table" | "code" | "image";
  required: boolean;
  template?: string;
  placeholder?: string;
}

export interface DocumentGenerationRequest {
  templateId?: string;
  format: "markdown" | "html" | "confluence" | "json" | "text";
  title: string;
  content: Record<string, any>;
  variables?: Record<string, any>;
  sections?: string[];
}

export class DocumentGenerationModule {
  private config: DocumentGenerationConfig;

  constructor(config: DocumentGenerationConfig) {
    this.config = config;
  }

  async invoke(input: DocumentGenerationRequest): Promise<{
    document: string;
    metadata: any;
  }> {
    try {
      // Validate format support
      if (!this.config.supportedFormats.includes(input.format)) {
        throw new Error(`Format ${input.format} is not supported`);
      }

      const startTime = Date.now();

      let document: string;
      let templateUsed: DocumentTemplate | null = null;

      if (input.templateId && this.config.templates[input.templateId]) {
        // Generate from template
        templateUsed = this.config.templates[input.templateId];
        document = await this.generateFromTemplate(templateUsed, input);
      } else {
        // Generate free-form document
        document = await this.generateFreeForm(input);
      }

      const processingTime = Date.now() - startTime;

      return {
        document,
        metadata: {
          format: input.format,
          templateUsed: templateUsed?.id,
          wordCount: this.countWords(document),
          characterCount: document.length,
          sections: this.extractSections(document),
          processingTime
        }
      };
    } catch (error) {
      throw new Error(`Document generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async generateFromTemplate(
    template: DocumentTemplate,
    input: DocumentGenerationRequest
  ): Promise<string> {
    const variables = { ...template.variables, ...input.variables };
    let document = "";

    // Add title
    document += this.formatTitle(input.title, input.format);
    document += "\n\n";

    // Process each section
    for (const section of template.sections) {
      // Skip sections not requested
      if (input.sections && !input.sections.includes(section.id) && !section.required) {
        continue;
      }

      const sectionContent = await this.generateSection(section, input.content, variables);
      document += this.formatSection(section, sectionContent, input.format);
      document += "\n\n";
    }

    return this.finalizeDocument(document, input.format, variables);
  }

  private async generateFreeForm(input: DocumentGenerationRequest): Promise<string> {
    let document = "";

    // Add title
    document += this.formatTitle(input.title, input.format);
    document += "\n\n";

    // Generate content based on provided data
    for (const [key, value] of Object.entries(input.content)) {
      document += this.formatSection(
        { id: key, title: this.toTitleCase(key), type: "text", required: false },
        value,
        input.format
      );
      document += "\n\n";
    }

    return this.finalizeDocument(document, input.format, input.variables);
  }

  private async generateSection(
    section: DocumentSection,
    content: Record<string, any>,
    variables: Record<string, any>
  ): Promise<string> {
    const sectionData = content[section.id];
    
    if (!sectionData && section.required) {
      throw new Error(`Required section ${section.id} is missing`);
    }

    if (!sectionData) {
      return section.placeholder || `[${section.title} content will be added here]`;
    }

    switch (section.type) {
      case "text":
        return this.generateTextSection(sectionData, section.template, variables);
      
      case "list":
        return this.generateListSection(sectionData);
      
      case "table":
        return this.generateTableSection(sectionData);
      
      case "code":
        return this.generateCodeSection(sectionData);
      
      default:
        return String(sectionData);
    }
  }

  private generateTextSection(
    data: any,
    template?: string,
    variables?: Record<string, any>
  ): string {
    let text = String(data);
    
    if (template) {
      text = this.replaceTemplateVariables(template, { content: data, ...variables });
    }
    
    return text;
  }

  private generateListSection(data: any): string {
    if (Array.isArray(data)) {
      return data.map(item => `- ${String(item)}`).join('\n');
    }
    
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `- **${key}**: ${String(value)}`)
        .join('\n');
    }
    
    return `- ${String(data)}`;
  }

  private generateTableSection(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return "No data available";
    }

    const firstRow = data[0];
    if (typeof firstRow !== 'object') {
      // Simple array to single-column table
      return `| Item |\n|------|\n${data.map(item => `| ${String(item)} |`).join('\n')}`;
    }

    // Object array to multi-column table
    const headers = Object.keys(firstRow);
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `|${headers.map(() => '------').join('|')}|`;
    const dataRows = data.map(row => 
      `| ${headers.map(header => String(row[header] || '')).join(' | ')} |`
    ).join('\n');

    return `${headerRow}\n${separatorRow}\n${dataRows}`;
  }

  private generateCodeSection(data: any): string {
    const code = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    return `\`\`\`\n${code}\n\`\`\``;
  }

  private formatTitle(title: string, format: string): string {
    switch (format) {
      case "markdown":
        return `# ${title}`;
      
      case "html":
        return `<h1>${title}</h1>`;
      
      case "confluence":
        return `h1. ${title}`;
      
      default:
        return title;
    }
  }

  private formatSection(
    section: DocumentSection,
    content: string,
    format: string
  ): string {
    const title = this.formatSectionTitle(section.title, format);
    return `${title}\n\n${content}`;
  }

  private formatSectionTitle(title: string, format: string): string {
    switch (format) {
      case "markdown":
        return `## ${title}`;
      
      case "html":
        return `<h2>${title}</h2>`;
      
      case "confluence":
        return `h2. ${title}`;
      
      default:
        return title;
    }
  }

  private finalizeDocument(
    document: string,
    format: string,
    variables?: Record<string, any>
  ): string {
    // Replace any remaining variables
    if (variables) {
      document = this.replaceTemplateVariables(document, variables);
    }

    // Format-specific finalization
    switch (format) {
      case "html":
        return `<!DOCTYPE html>\n<html>\n<head>\n<title>Document</title>\n</head>\n<body>\n${document}\n</body>\n</html>`;
      
      case "confluence":
        // Add Confluence-specific formatting
        return document.replace(/\*\*(.*?)\*\*/g, '*$1*'); // Convert bold syntax
      
      case "json":
        return JSON.stringify({
          content: document,
          metadata: {
            format,
            generatedAt: new Date().toISOString()
          }
        }, null, 2);
      
      default:
        return document;
    }
  }

  private replaceTemplateVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
    }
    
    return result;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractSections(document: string): string[] {
    const sections: string[] = [];
    const lines = document.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('<h')) {
        sections.push(line.replace(/^#+\s*/, '').replace(/<\/?h[1-6]>/g, ''));
      }
    }
    
    return sections;
  }

  private toTitleCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/^./, match => match.toUpperCase());
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          description: "ID of the template to use"
        },
        format: {
          type: "string",
          enum: this.config.supportedFormats,
          description: "Output format for the document"
        },
        title: {
          type: "string",
          description: "Document title"
        },
        content: {
          type: "object",
          description: "Content data for sections"
        },
        variables: {
          type: "object",
          description: "Variables for template replacement"
        },
        sections: {
          type: "array",
          items: { type: "string" },
          description: "Specific sections to include"
        }
      },
      required: ["format", "title", "content"]
    };
  }
}
