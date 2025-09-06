# GitHub SBOM Viewer - Project Overview

## Purpose
A web application to visualize Software Bill of Materials (SBOM) from GitHub repositories with interactive Canvas-based dependency graphs.

## Tech Stack
- **Frontend**: SolidJS application with Canvas-based visualization
- **Backend**: AWS Lambda with Hono framework  
- **Infrastructure**: AWS CDK for deployment
- **Authentication**: GitHub OAuth with cookie-based token management
- **Package Manager**: pnpm with workspace configuration
- **Build Tool**: Vite
- **Testing**: Vitest
- **Linting**: ESLint

## Architecture
- Monorepo structure with `app/` (frontend) and `cdk/` (infrastructure)
- GitHub OAuth flow handled by Lambda backend
- Token and user info stored in cookies
- SBOM data retrieved from GitHub API
- Interactive visualization using Canvas

## Current Authentication Flow
- Uses cookies for token storage (httpOnly for token, non-httpOnly for user)
- Backend sets cookies after OAuth callback
- Frontend reads user cookie to determine login state
- Token cookie used for API authentication