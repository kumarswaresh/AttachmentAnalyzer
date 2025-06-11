# Development Setup

## Linting and Formatting

ESLint and Prettier are configured for code quality and consistency.

### Available Commands

```bash
# Check code formatting
npx prettier --check .

# Fix formatting issues
npx prettier --write .

# Run ESLint (requires eslint.config.js)
npx eslint . --ext .ts,.tsx

# Fix ESLint issues
npx eslint . --ext .ts,.tsx --fix
```

## Separate Frontend and Backend Development

### Backend Only
```bash
node dev-backend.js
```
- Runs Express server on port 5000
- Includes all API routes and database connections
- No frontend assets served

### Frontend Only
```bash
node dev-frontend.js
```
- Runs Vite development server on port 3000
- Proxies API calls to backend on port 5000
- Hot module replacement enabled
- Requires backend to be running separately

### Full Stack (Default)
```bash
npm run dev
```
- Runs both frontend and backend together
- Express serves Vite-built frontend
- Single port (5000) for complete application

## Development Workflow

1. Start backend: `node dev-backend.js`
2. In another terminal, start frontend: `node dev-frontend.js`
3. Access application at http://localhost:3000
4. API requests automatically proxy to http://localhost:5000

## Code Quality

- ESLint v9 configuration with TypeScript and React support
- Prettier for consistent code formatting
- Pre-configured rules for React hooks and TypeScript best practices