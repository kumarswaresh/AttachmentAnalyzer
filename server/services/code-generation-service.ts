import { type Request, type Response } from "express";

/**
 * Mock Code Generation Service
 * Provides comprehensive mock functionality for testing code-based agents
 * Will be enhanced with Claude API integration when ANTHROPIC_API_KEY is available
 */

export interface CodeGenerationRequest {
  prompt: string;
  language: string;
  agentType: string;
  complexity?: 'simple' | 'intermediate' | 'advanced';
  includeTests?: boolean;
  includeDocumentation?: boolean;
}

export interface CodeGenerationResponse {
  success: boolean;
  code: string;
  explanation: string;
  suggestions: string[];
  testCode?: string;
  documentation?: string;
  executionTime: number;
}

export interface CodeReviewRequest {
  code: string;
  language: string;
  focusAreas?: string[];
}

export interface CodeReviewResponse {
  success: boolean;
  overallScore: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    line: number;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  suggestions: string[];
  securityIssues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  performanceIssues: string[];
  bestPractices: string[];
}

export class CodeGenerationService {
  private mockCodeTemplates = {
    typescript: {
      simple: `// Generated TypeScript code
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  addUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      id: Date.now(),
      ...user
    };
    this.users.push(newUser);
    return newUser;
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}

export { UserService, type User };`,
      intermediate: `// Advanced TypeScript with error handling and validation
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional()
});

type User = z.infer<typeof UserSchema> & { id: string };

class UserRepository {
  private users: Map<string, User> = new Map();

  async create(userData: z.infer<typeof UserSchema>): Promise<Result<User, ValidationError>> {
    try {
      const validatedData = UserSchema.parse(userData);
      const user: User = {
        id: crypto.randomUUID(),
        ...validatedData
      };
      
      this.users.set(user.id, user);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: new ValidationError('Invalid user data', error) };
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
}

type Result<T, E> = { success: true; data: T } | { success: false; error: E };

class ValidationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}`,
      advanced: `// Production-ready TypeScript with comprehensive features
import { z } from 'zod';
import { EventEmitter } from 'events';

interface DatabaseConnection {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: DatabaseConnection) => Promise<T>): Promise<T>;
}

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional(),
  preferences: z.record(z.any()).optional()
});

type User = z.infer<typeof UserSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

interface UserEvents {
  'user:created': [user: User];
  'user:updated': [user: User, previousData: Partial<User>];
  'user:deleted': [userId: string];
}

class UserService extends EventEmitter {
  constructor(private db: DatabaseConnection) {
    super();
  }

  async create(userData: z.infer<typeof UserSchema>): Promise<Result<User, ServiceError>> {
    try {
      const validatedData = UserSchema.parse(userData);
      
      // Check for existing email
      const existingUser = await this.findByEmail(validatedData.email);
      if (existingUser) {
        return { success: false, error: new ServiceError('Email already exists', 'DUPLICATE_EMAIL') };
      }

      const user: User = {
        id: crypto.randomUUID(),
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.query(
        'INSERT INTO users (id, name, email, age, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.email, user.age, JSON.stringify(user.preferences), user.createdAt, user.updatedAt]
      );

      this.emit('user:created', user);
      return { success: true, data: user };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: new ServiceError('Validation failed', 'VALIDATION_ERROR', error.errors) };
      }
      return { success: false, error: new ServiceError('Database error', 'DATABASE_ERROR', error) };
    }
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.db.query<User>('SELECT * FROM users WHERE id = ?', [id]);
    return users[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.db.query<User>('SELECT * FROM users WHERE email = ?', [email]);
    return users[0] || null;
  }

  async update(id: string, updates: Partial<z.infer<typeof UserSchema>>): Promise<Result<User, ServiceError>> {
    return this.db.transaction(async (tx) => {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return { success: false, error: new ServiceError('User not found', 'NOT_FOUND') };
      }

      const validatedUpdates = UserSchema.partial().parse(updates);
      const updatedUser = {
        ...existingUser,
        ...validatedUpdates,
        updatedAt: new Date()
      };

      await tx.query(
        'UPDATE users SET name = ?, email = ?, age = ?, preferences = ?, updated_at = ? WHERE id = ?',
        [updatedUser.name, updatedUser.email, updatedUser.age, JSON.stringify(updatedUser.preferences), updatedUser.updatedAt, id]
      );

      this.emit('user:updated', updatedUser, updates);
      return { success: true, data: updatedUser };
    });
  }
}

type Result<T, E> = { success: true; data: T } | { success: false; error: E };

class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}`
    },
    javascript: {
      simple: `// Generated JavaScript code
class TaskManager {
  constructor() {
    this.tasks = [];
    this.nextId = 1;
  }

  addTask(title, description = '') {
    const task = {
      id: this.nextId++,
      title,
      description,
      completed: false,
      createdAt: new Date()
    };
    this.tasks.push(task);
    return task;
  }

  completeTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = true;
      task.completedAt = new Date();
    }
    return task;
  }

  getTasks() {
    return [...this.tasks];
  }

  getPendingTasks() {
    return this.tasks.filter(task => !task.completed);
  }
}

module.exports = { TaskManager };`,
      intermediate: `// JavaScript with modern features and error handling
const EventEmitter = require('events');

class TaskManager extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map();
    this.nextId = 1;
  }

  async addTask(title, description = '', priority = 'medium') {
    if (!title || typeof title !== 'string') {
      throw new Error('Task title is required and must be a string');
    }

    const task = {
      id: this.nextId++,
      title: title.trim(),
      description: description.trim(),
      priority,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.emit('taskAdded', task);
    
    return task;
  }

  async updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(\`Task with id \${id} not found\`);
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    this.tasks.set(id, updatedTask);
    this.emit('taskUpdated', updatedTask);
    
    return updatedTask;
  }

  async deleteTask(id) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(\`Task with id \${id} not found\`);
    }

    this.tasks.delete(id);
    this.emit('taskDeleted', { id, task });
    
    return true;
  }

  getTasks(filter = {}) {
    let tasks = Array.from(this.tasks.values());

    if (filter.completed !== undefined) {
      tasks = tasks.filter(task => task.completed === filter.completed);
    }

    if (filter.priority) {
      tasks = tasks.filter(task => task.priority === filter.priority);
    }

    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }
}

module.exports = { TaskManager };`
    },
    python: {
      simple: `# Generated Python code
from datetime import datetime
from typing import List, Optional, Dict, Any

class Task:
    def __init__(self, title: str, description: str = ""):
        self.id = id(self)
        self.title = title
        self.description = description
        self.completed = False
        self.created_at = datetime.now()
        self.completed_at: Optional[datetime] = None

    def complete(self):
        self.completed = True
        self.completed_at = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class TaskManager:
    def __init__(self):
        self.tasks: List[Task] = []

    def add_task(self, title: str, description: str = "") -> Task:
        task = Task(title, description)
        self.tasks.append(task)
        return task

    def get_task(self, task_id: int) -> Optional[Task]:
        return next((task for task in self.tasks if task.id == task_id), None)

    def complete_task(self, task_id: int) -> bool:
        task = self.get_task(task_id)
        if task:
            task.complete()
            return True
        return False

    def get_all_tasks(self) -> List[Dict[str, Any]]:
        return [task.to_dict() for task in self.tasks]

    def get_pending_tasks(self) -> List[Dict[str, Any]]:
        return [task.to_dict() for task in self.tasks if not task.completed]`
    }
  };

  private mockTestTemplates = {
    typescript: `// Generated test code
import { describe, it, expect, beforeEach } from '@jest/globals';
import { UserService, type User } from './user-service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('addUser', () => {
    it('should add a new user with generated id', () => {
      const userData = { name: 'John Doe', email: 'john@example.com' };
      const user = userService.addUser(userData);

      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
    });

    it('should add user to internal storage', () => {
      const userData = { name: 'Jane Doe', email: 'jane@example.com' };
      const user = userService.addUser(userData);

      const retrievedUser = userService.getUserById(user.id);
      expect(retrievedUser).toEqual(user);
    });
  });

  describe('getUserById', () => {
    it('should return user when id exists', () => {
      const userData = { name: 'Test User', email: 'test@example.com' };
      const user = userService.addUser(userData);

      const result = userService.getUserById(user.id);
      expect(result).toEqual(user);
    });

    it('should return undefined when id does not exist', () => {
      const result = userService.getUserById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users', () => {
      const users = userService.getAllUsers();
      expect(users).toEqual([]);
    });

    it('should return all users', () => {
      const user1 = userService.addUser({ name: 'User 1', email: 'user1@example.com' });
      const user2 = userService.addUser({ name: 'User 2', email: 'user2@example.com' });

      const users = userService.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users).toContain(user1);
      expect(users).toContain(user2);
    });
  });
});`,
    javascript: `// Generated test code
const { TaskManager } = require('./task-manager');

describe('TaskManager', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe('addTask', () => {
    it('should add a new task', async () => {
      const task = await taskManager.addTask('Test Task', 'Test Description');
      
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.completed).toBe(false);
      expect(task.id).toBeDefined();
    });

    it('should emit taskAdded event', async () => {
      let emittedTask;
      taskManager.on('taskAdded', (task) => {
        emittedTask = task;
      });

      const task = await taskManager.addTask('Event Test');
      expect(emittedTask).toEqual(task);
    });

    it('should throw error for empty title', async () => {
      await expect(taskManager.addTask('')).rejects.toThrow();
      await expect(taskManager.addTask(null)).rejects.toThrow();
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      const task = await taskManager.addTask('Original Title');
      const updated = await taskManager.updateTask(task.id, { 
        title: 'Updated Title',
        priority: 'high'
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskManager.updateTask(999, { title: 'Test' }))
        .rejects.toThrow('Task with id 999 not found');
    });
  });
});`,
    python: `# Generated test code
import unittest
from datetime import datetime
from task_manager import Task, TaskManager

class TestTask(unittest.TestCase):
    def test_task_creation(self):
        task = Task("Test Task", "Test Description")
        
        self.assertEqual(task.title, "Test Task")
        self.assertEqual(task.description, "Test Description")
        self.assertFalse(task.completed)
        self.assertIsInstance(task.created_at, datetime)
        self.assertIsNone(task.completed_at)

    def test_task_completion(self):
        task = Task("Test Task")
        task.complete()
        
        self.assertTrue(task.completed)
        self.assertIsInstance(task.completed_at, datetime)

    def test_task_to_dict(self):
        task = Task("Test Task", "Description")
        task_dict = task.to_dict()
        
        self.assertEqual(task_dict['title'], "Test Task")
        self.assertEqual(task_dict['description'], "Description")
        self.assertFalse(task_dict['completed'])

class TestTaskManager(unittest.TestCase):
    def setUp(self):
        self.task_manager = TaskManager()

    def test_add_task(self):
        task = self.task_manager.add_task("Test Task", "Description")
        
        self.assertEqual(task.title, "Test Task")
        self.assertEqual(task.description, "Description")
        self.assertEqual(len(self.task_manager.tasks), 1)

    def test_get_task(self):
        task = self.task_manager.add_task("Test Task")
        retrieved_task = self.task_manager.get_task(task.id)
        
        self.assertEqual(retrieved_task, task)

    def test_get_nonexistent_task(self):
        result = self.task_manager.get_task(999)
        self.assertIsNone(result)

    def test_complete_task(self):
        task = self.task_manager.add_task("Test Task")
        result = self.task_manager.complete_task(task.id)
        
        self.assertTrue(result)
        self.assertTrue(task.completed)

if __name__ == '__main__':
    unittest.main()`
  };

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const language = request.language.toLowerCase();
    const complexity = request.complexity || 'intermediate';
    
    let code = this.mockCodeTemplates[language]?.[complexity] || 
               this.mockCodeTemplates.typescript.intermediate;
    
    // Customize code based on prompt
    if (request.prompt.toLowerCase().includes('api')) {
      code = this.generateApiCode(language);
    } else if (request.prompt.toLowerCase().includes('database')) {
      code = this.generateDatabaseCode(language);
    }

    const testCode = request.includeTests ? this.mockTestTemplates[language] : undefined;
    
    return {
      success: true,
      code,
      explanation: `Generated ${language} code based on your prompt: "${request.prompt}". The code includes error handling, type safety, and follows best practices for ${complexity} complexity level.`,
      suggestions: [
        `Consider adding input validation for better error handling`,
        `Add logging for debugging and monitoring`,
        `Implement caching for better performance`,
        `Add comprehensive unit tests`,
        `Consider using dependency injection for better testability`
      ],
      testCode,
      documentation: request.includeDocumentation ? this.generateDocumentation(request) : undefined,
      executionTime: Date.now() - startTime
    };
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const issues = this.analyzeCodeIssues(request.code);
    const securityIssues = this.analyzeSecurityIssues(request.code);
    const performanceIssues = this.analyzePerformanceIssues(request.code);
    
    const overallScore = this.calculateOverallScore(issues, securityIssues, performanceIssues);
    
    return {
      success: true,
      overallScore,
      issues,
      suggestions: [
        'Add comprehensive error handling',
        'Implement input validation',
        'Add unit tests for all functions',
        'Consider using TypeScript for better type safety',
        'Add JSDoc comments for better documentation'
      ],
      securityIssues,
      performanceIssues,
      bestPractices: [
        'Use meaningful variable and function names',
        'Keep functions small and focused on a single responsibility',
        'Implement proper error handling and logging',
        'Use consistent code formatting',
        'Add comprehensive documentation'
      ]
    };
  }

  private generateApiCode(language: string): string {
    return `// Generated ${language.toUpperCase()} API code
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional()
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    // Mock data - replace with actual database query
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 }
    ];
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  try {
    const userData = UserSchema.parse(req.body);
    
    // Mock user creation - replace with actual database insert
    const newUser = {
      id: Date.now(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
  }

  private generateDatabaseCode(language: string): string {
    return `// Generated ${language.toUpperCase()} Database code
import { Pool } from 'pg';
import { z } from 'zod';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional()
});

export class UserRepository {
  async create(userData: z.infer<typeof UserSchema>) {
    const client = await pool.connect();
    try {
      const validatedData = UserSchema.parse(userData);
      
      const query = \`
        INSERT INTO users (name, email, age, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, name, email, age, created_at
      \`;
      
      const values = [validatedData.name, validatedData.email, validatedData.age];
      const result = await client.query(query, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findById(id: number) {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findAll() {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM users ORDER BY created_at DESC';
      const result = await client.query(query);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async update(id: number, updates: Partial<z.infer<typeof UserSchema>>) {
    const client = await pool.connect();
    try {
      const validatedUpdates = UserSchema.partial().parse(updates);
      
      const fields = Object.keys(validatedUpdates);
      const values = Object.values(validatedUpdates);
      const setClause = fields.map((field, index) => \`\${field} = $\${index + 2}\`).join(', ');
      
      const query = \`
        UPDATE users 
        SET \${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      \`;
      
      const result = await client.query(query, [id, ...values]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async delete(id: number) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}`;
  }

  private generateDocumentation(request: CodeGenerationRequest): string {
    return `# ${request.agentType} Documentation

## Overview
This code was generated based on the prompt: "${request.prompt}"

## Features
- **Language**: ${request.language}
- **Complexity**: ${request.complexity || 'intermediate'}
- **Error Handling**: Comprehensive error handling with proper error types
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing**: ${request.includeTests ? 'Unit tests included' : 'Tests not included'}

## Usage
\`\`\`${request.language}
// Basic usage example
const service = new UserService();
const user = await service.addUser({ name: 'John Doe', email: 'john@example.com' });
console.log('Created user:', user);
\`\`\`

## API Reference

### Methods
- \`addUser(userData)\` - Creates a new user
- \`getUserById(id)\` - Retrieves user by ID
- \`getAllUsers()\` - Gets all users

### Error Handling
The code includes comprehensive error handling for:
- Validation errors
- Database connection issues
- Network timeouts
- Invalid input data

## Best Practices Implemented
- Input validation using Zod schemas
- Proper error handling and propagation
- Type safety with TypeScript
- Clean code principles
- SOLID design patterns

## Testing
${request.includeTests ? 'Comprehensive unit tests are included covering all major functionality.' : 'Consider adding unit tests for better code reliability.'}
`;
  }

  private analyzeCodeIssues(code: string) {
    const issues = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('console.log')) {
        issues.push({
          type: 'warning' as const,
          line: index + 1,
          message: 'Avoid using console.log in production code',
          severity: 'low' as const
        });
      }
      
      if (line.includes('any')) {
        issues.push({
          type: 'warning' as const,
          line: index + 1,
          message: 'Avoid using "any" type, use specific types instead',
          severity: 'medium' as const
        });
      }
      
      if (line.includes('throw new Error') && !line.includes('instanceof')) {
        issues.push({
          type: 'suggestion' as const,
          line: index + 1,
          message: 'Consider using custom error types for better error handling',
          severity: 'low' as const
        });
      }
    });
    
    return issues;
  }

  private analyzeSecurityIssues(code: string) {
    const securityIssues = [];
    
    if (code.includes('eval(')) {
      securityIssues.push({
        type: 'Code Injection',
        description: 'Use of eval() can lead to code injection vulnerabilities',
        severity: 'critical' as const
      });
    }
    
    if (code.includes('innerHTML') && !code.includes('sanitize')) {
      securityIssues.push({
        type: 'XSS Vulnerability',
        description: 'Direct innerHTML usage without sanitization can lead to XSS attacks',
        severity: 'high' as const
      });
    }
    
    if (code.includes('SELECT *') || code.includes('${}')) {
      securityIssues.push({
        type: 'SQL Injection',
        description: 'Potential SQL injection vulnerability detected',
        severity: 'high' as const
      });
    }
    
    return securityIssues;
  }

  private analyzePerformanceIssues(code: string) {
    const performanceIssues = [];
    
    if (code.includes('for') && code.includes('.push(')) {
      performanceIssues.push('Consider using array methods like map() or filter() instead of loops with push()');
    }
    
    if (code.includes('JSON.parse') && code.includes('JSON.stringify')) {
      performanceIssues.push('Multiple JSON operations detected - consider caching parsed objects');
    }
    
    if (code.includes('await') && code.includes('for')) {
      performanceIssues.push('Sequential async operations in loop - consider using Promise.all() for parallel execution');
    }
    
    return performanceIssues;
  }

  private calculateOverallScore(issues: any[], securityIssues: any[], performanceIssues: string[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });
    
    securityIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    });
    
    score -= performanceIssues.length * 3;
    
    return Math.max(0, score);
  }
}

export const codeGenerationService = new CodeGenerationService();