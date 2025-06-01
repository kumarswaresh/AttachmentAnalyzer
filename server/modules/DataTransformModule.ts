export interface DataTransformConfig {
  transformations: Record<string, TransformationConfig>;
  validationRules: ValidationRule[];
  outputFormats: string[];
  enableCaching: boolean;
  cacheTimeout: number;
  maxBatchSize: number;
}

export interface TransformationConfig {
  type: "mapping" | "aggregation" | "filtering" | "enrichment" | "normalization";
  rules: TransformRule[];
  outputSchema?: any;
  preserveMetadata: boolean;
}

export interface TransformRule {
  name: string;
  operation: string;
  sourceField?: string;
  targetField?: string;
  parameters: Record<string, any>;
  condition?: string;
}

export interface ValidationRule {
  field: string;
  type: "required" | "type" | "range" | "pattern" | "custom";
  parameters: Record<string, any>;
  errorMessage: string;
}

export interface DataTransformRequest {
  data: any;
  transformation: string;
  outputFormat?: "json" | "csv" | "xml" | "yaml";
  validationLevel?: "strict" | "lenient" | "none";
  batchMode?: boolean;
}

export class DataTransformModule {
  private config: DataTransformConfig;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: DataTransformConfig) {
    this.config = config;
  }

  async invoke(input: DataTransformRequest): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    metadata: {
      recordsProcessed: number;
      transformationTime: number;
      validationErrors: string[];
      cached: boolean;
    };
  }> {
    const startTime = Date.now();
    let cached = false;
    const validationErrors: string[] = [];

    try {
      // Check cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(input);
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
          cached = true;
          return {
            success: true,
            data: cachedResult,
            metadata: {
              recordsProcessed: Array.isArray(cachedResult) ? cachedResult.length : 1,
              transformationTime: Date.now() - startTime,
              validationErrors: [],
              cached: true,
            },
          };
        }
      }

      // Get transformation configuration
      const transformConfig = this.config.transformations[input.transformation];
      if (!transformConfig) {
        throw new Error(`Transformation '${input.transformation}' not found`);
      }

      // Validate input data
      if (input.validationLevel !== "none") {
        const errors = await this.validateData(input.data, input.validationLevel === "strict");
        validationErrors.push(...errors);
        
        if (input.validationLevel === "strict" && errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(", ")}`);
        }
      }

      // Transform data
      const transformedData = await this.transformData(input.data, transformConfig);

      // Format output
      const formattedData = await this.formatOutput(transformedData, input.outputFormat || "json");

      // Cache result
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(input);
        this.cacheResult(cacheKey, formattedData);
      }

      return {
        success: true,
        data: formattedData,
        metadata: {
          recordsProcessed: Array.isArray(input.data) ? input.data.length : 1,
          transformationTime: Date.now() - startTime,
          validationErrors,
          cached: false,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          recordsProcessed: 0,
          transformationTime: Date.now() - startTime,
          validationErrors,
          cached,
        },
      };
    }
  }

  private async validateData(data: any, strict: boolean): Promise<string[]> {
    const errors: string[] = [];

    for (const rule of this.config.validationRules) {
      try {
        const fieldValue = this.getFieldValue(data, rule.field);
        const isValid = await this.applyValidationRule(fieldValue, rule);
        
        if (!isValid) {
          errors.push(rule.errorMessage);
          if (strict) break;
        }
      } catch (error) {
        errors.push(`Validation error for field '${rule.field}': ${(error as Error).message}`);
      }
    }

    return errors;
  }

  private async applyValidationRule(value: any, rule: ValidationRule): Promise<boolean> {
    switch (rule.type) {
      case "required":
        return value !== null && value !== undefined && value !== "";
      
      case "type":
        const expectedType = rule.parameters.type;
        return typeof value === expectedType;
      
      case "range":
        const { min, max } = rule.parameters;
        const numValue = Number(value);
        return !isNaN(numValue) && numValue >= min && numValue <= max;
      
      case "pattern":
        const pattern = new RegExp(rule.parameters.pattern);
        return pattern.test(String(value));
      
      case "custom":
        // Execute custom validation function
        const customFunction = rule.parameters.function;
        if (typeof customFunction === "function") {
          return customFunction(value);
        }
        return true;
      
      default:
        return true;
    }
  }

  private async transformData(data: any, config: TransformationConfig): Promise<any> {
    let result = data;

    // Apply transformation rules in order
    for (const rule of config.rules) {
      result = await this.applyTransformRule(result, rule, config);
    }

    return result;
  }

  private async applyTransformRule(data: any, rule: TransformRule, config: TransformationConfig): Promise<any> {
    switch (rule.operation) {
      case "map":
        return this.mapOperation(data, rule);
      
      case "filter":
        return this.filterOperation(data, rule);
      
      case "aggregate":
        return this.aggregateOperation(data, rule);
      
      case "enrich":
        return this.enrichOperation(data, rule);
      
      case "normalize":
        return this.normalizeOperation(data, rule);
      
      case "sort":
        return this.sortOperation(data, rule);
      
      case "group":
        return this.groupOperation(data, rule);
      
      case "flatten":
        return this.flattenOperation(data, rule);
      
      case "pivot":
        return this.pivotOperation(data, rule);
      
      default:
        throw new Error(`Unknown transformation operation: ${rule.operation}`);
    }
  }

  private mapOperation(data: any, rule: TransformRule): any {
    if (Array.isArray(data)) {
      return data.map(item => this.mapSingleItem(item, rule));
    } else {
      return this.mapSingleItem(data, rule);
    }
  }

  private mapSingleItem(item: any, rule: TransformRule): any {
    const result = { ...item };
    
    if (rule.sourceField && rule.targetField) {
      const sourceValue = this.getFieldValue(item, rule.sourceField);
      const transformedValue = this.applyFieldTransformation(sourceValue, rule.parameters);
      this.setFieldValue(result, rule.targetField, transformedValue);
    }

    return result;
  }

  private filterOperation(data: any, rule: TransformRule): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { condition, field, operator, value } = rule.parameters;

    return data.filter(item => {
      if (condition) {
        return this.evaluateCondition(item, condition);
      }
      
      if (field && operator && value !== undefined) {
        const fieldValue = this.getFieldValue(item, field);
        return this.compareValues(fieldValue, operator, value);
      }

      return true;
    });
  }

  private aggregateOperation(data: any, rule: TransformRule): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { operation, field, groupBy } = rule.parameters;

    if (groupBy) {
      const groups = this.groupBy(data, groupBy);
      const result: any = {};
      
      for (const [key, items] of Object.entries(groups)) {
        result[key] = this.performAggregation(items as any[], operation, field);
      }
      
      return result;
    } else {
      return this.performAggregation(data, operation, field);
    }
  }

  private enrichOperation(data: any, rule: TransformRule): any {
    const { enrichmentData, joinField, targetFields } = rule.parameters;
    
    if (Array.isArray(data)) {
      return data.map(item => this.enrichSingleItem(item, enrichmentData, joinField, targetFields));
    } else {
      return this.enrichSingleItem(data, enrichmentData, joinField, targetFields);
    }
  }

  private normalizeOperation(data: any, rule: TransformRule): any {
    const { fields, method = "minmax" } = rule.parameters;
    
    if (!Array.isArray(data) || !fields) {
      return data;
    }

    // Calculate normalization parameters
    const stats = this.calculateFieldStats(data, fields);
    
    return data.map(item => {
      const normalizedItem = { ...item };
      
      for (const field of fields) {
        const value = this.getFieldValue(item, field);
        if (typeof value === "number") {
          const normalizedValue = this.normalizeValue(value, stats[field], method);
          this.setFieldValue(normalizedItem, field, normalizedValue);
        }
      }
      
      return normalizedItem;
    });
  }

  private sortOperation(data: any, rule: TransformRule): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { field, direction = "asc" } = rule.parameters;
    
    return [...data].sort((a, b) => {
      const aValue = this.getFieldValue(a, field);
      const bValue = this.getFieldValue(b, field);
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return direction === "desc" ? -comparison : comparison;
    });
  }

  private groupOperation(data: any, rule: TransformRule): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { field } = rule.parameters;
    return this.groupBy(data, field);
  }

  private flattenOperation(data: any, rule: TransformRule): any {
    const { separator = "." } = rule.parameters;
    
    if (Array.isArray(data)) {
      return data.map(item => this.flattenObject(item, separator));
    } else {
      return this.flattenObject(data, separator);
    }
  }

  private pivotOperation(data: any, rule: TransformRule): any {
    if (!Array.isArray(data)) {
      return data;
    }

    const { indexField, columnField, valueField } = rule.parameters;
    const result: any = {};

    data.forEach(item => {
      const index = this.getFieldValue(item, indexField);
      const column = this.getFieldValue(item, columnField);
      const value = this.getFieldValue(item, valueField);

      if (!result[index]) {
        result[index] = {};
      }
      result[index][column] = value;
    });

    return result;
  }

  // Utility methods
  private getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setFieldValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private applyFieldTransformation(value: any, parameters: Record<string, any>): any {
    const { transform } = parameters;
    
    switch (transform) {
      case "uppercase":
        return String(value).toUpperCase();
      case "lowercase":
        return String(value).toLowerCase();
      case "trim":
        return String(value).trim();
      case "round":
        return Math.round(Number(value));
      case "abs":
        return Math.abs(Number(value));
      default:
        return value;
    }
  }

  private evaluateCondition(item: any, condition: string): boolean {
    // Simple condition evaluation - in production, use a proper expression parser
    try {
      return new Function('item', `return ${condition}`)(item);
    } catch {
      return false;
    }
  }

  private compareValues(a: any, operator: string, b: any): boolean {
    switch (operator) {
      case "eq": return a === b;
      case "ne": return a !== b;
      case "gt": return a > b;
      case "gte": return a >= b;
      case "lt": return a < b;
      case "lte": return a <= b;
      case "contains": return String(a).includes(String(b));
      default: return false;
    }
  }

  private groupBy(data: any[], field: string): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = this.getFieldValue(item, field);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private performAggregation(data: any[], operation: string, field?: string): any {
    switch (operation) {
      case "count":
        return data.length;
      case "sum":
        return data.reduce((sum, item) => sum + (Number(this.getFieldValue(item, field!)) || 0), 0);
      case "avg":
        const values = data.map(item => Number(this.getFieldValue(item, field!)) || 0);
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case "min":
        return Math.min(...data.map(item => Number(this.getFieldValue(item, field!)) || 0));
      case "max":
        return Math.max(...data.map(item => Number(this.getFieldValue(item, field!)) || 0));
      default:
        return data;
    }
  }

  private enrichSingleItem(item: any, enrichmentData: any, joinField: string, targetFields: string[]): any {
    const enriched = { ...item };
    const joinValue = this.getFieldValue(item, joinField);
    
    // Find matching enrichment data
    const matchingData = Array.isArray(enrichmentData) 
      ? enrichmentData.find(ed => this.getFieldValue(ed, joinField) === joinValue)
      : enrichmentData[joinValue];

    if (matchingData) {
      for (const field of targetFields) {
        const value = this.getFieldValue(matchingData, field);
        this.setFieldValue(enriched, field, value);
      }
    }

    return enriched;
  }

  private calculateFieldStats(data: any[], fields: string[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const field of fields) {
      const values = data.map(item => Number(this.getFieldValue(item, field))).filter(v => !isNaN(v));
      
      if (values.length > 0) {
        stats[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
        };
      }
    }
    
    return stats;
  }

  private normalizeValue(value: number, stats: any, method: string): number {
    switch (method) {
      case "minmax":
        return (value - stats.min) / (stats.max - stats.min);
      case "zscore":
        return (value - stats.mean) / Math.sqrt(stats.variance || 1);
      default:
        return value;
    }
  }

  private flattenObject(obj: any, separator: string, prefix = ""): any {
    const flattened: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}${separator}${key}` : key;
        
        if (obj[key] !== null && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], separator, newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }

  private async formatOutput(data: any, format: string): Promise<any> {
    switch (format) {
      case "json":
        return data;
      case "csv":
        return this.convertToCSV(data);
      case "xml":
        return this.convertToXML(data);
      case "yaml":
        return this.convertToYAML(data);
      default:
        return data;
    }
  }

  private convertToCSV(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    const csvRows = data.map((row: any) => 
      headers.map(header => JSON.stringify(row[header] || "")).join(",")
    );
    
    return [csvHeaders, ...csvRows].join("\n");
  }

  private convertToXML(data: any): string {
    // Basic XML conversion - in production use a proper XML library
    const toXML = (obj: any, root = "data"): string => {
      if (Array.isArray(obj)) {
        return `<${root}>${obj.map((item, i) => toXML(item, `item_${i}`)).join("")}</${root}>`;
      } else if (typeof obj === "object" && obj !== null) {
        const entries = Object.entries(obj);
        return `<${root}>${entries.map(([key, value]) => toXML(value, key)).join("")}</${root}>`;
      } else {
        return `<${root}>${obj}</${root}>`;
      }
    };
    
    return `<?xml version="1.0" encoding="UTF-8"?>${toXML(data)}`;
  }

  private convertToYAML(data: any): string {
    // Basic YAML conversion - in production use a proper YAML library
    const toYAML = (obj: any, indent = 0): string => {
      const spaces = "  ".repeat(indent);
      
      if (Array.isArray(obj)) {
        return obj.map(item => `${spaces}- ${toYAML(item, indent + 1).trim()}`).join("\n");
      } else if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj)
          .map(([key, value]) => `${spaces}${key}: ${toYAML(value, indent + 1).trim()}`)
          .join("\n");
      } else {
        return String(obj);
      }
    };
    
    return toYAML(data);
  }

  private generateCacheKey(input: DataTransformRequest): string {
    return `${input.transformation}:${JSON.stringify(input.data)}:${input.outputFormat}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private cacheResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (this.config.cacheTimeout * 1000),
    });
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        data: {
          description: "Data to transform (object or array)",
        },
        transformation: {
          type: "string",
          description: "Transformation to apply",
          enum: Object.keys(this.config.transformations),
        },
        outputFormat: {
          type: "string",
          description: "Output format",
          enum: this.config.outputFormats,
          default: "json",
        },
        validationLevel: {
          type: "string",
          description: "Validation strictness",
          enum: ["strict", "lenient", "none"],
          default: "lenient",
        },
        batchMode: {
          type: "boolean",
          description: "Process in batch mode",
          default: false,
        },
      },
      required: ["data", "transformation"],
    };
  }
}