# Code Style and Conventions

## TypeScript Configuration
- Strict TypeScript configuration enabled
- ESLint with TypeScript support
- Import resolver for TypeScript paths

## Code Style
- ESLint with stylistic plugin for formatting
- Consistent import organization
- Solid.js conventions for reactive components
- JSX.Element return types for components

## File Organization
- Monorepo structure with workspaces
- Feature-based organization in `app/src/`
- Separate directories for pages, features, components
- CDK infrastructure in separate `cdk/` directory

## Naming Conventions
- PascalCase for component files and functions
- camelCase for variables and functions
- kebab-case for route parameters
- CSS modules for styling

## Authentication Patterns
- Currently uses document.cookie for client-side user detection
- Server-side cookie management with Hono
- Token stored as httpOnly cookie for security
- User info stored as regular cookie for client access