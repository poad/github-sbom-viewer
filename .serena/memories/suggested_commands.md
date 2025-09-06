# Suggested Commands

## Development Commands

### Root Level
- `pnpm install` - Install all dependencies
- `pnpm lint` - Run linting across all packages
- `pnpm lint-fix` - Fix linting issues across all packages  
- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages

### Frontend (app/)
- `cd app && pnpm dev` - Start development server
- `cd app && pnpm build` - Build for production
- `cd app && pnpm serve` - Preview production build
- `cd app && pnpm test` - Run tests
- `cd app && pnpm lint` - Run ESLint
- `cd app && pnpm lint-fix` - Fix ESLint issues

### Infrastructure (cdk/)
- `cd cdk && cdk deploy` - Deploy infrastructure
- `cd cdk && cdk diff` - Show deployment diff
- `cd cdk && cdk destroy` - Destroy infrastructure

## System Commands (macOS)
- `ls -la` - List files with details
- `find . -name "*.ts" -type f` - Find TypeScript files
- `grep -r "pattern" .` - Search for patterns
- `git status` - Check git status
- `git add .` - Stage all changes
- `git commit -m "message"` - Commit changes