# Task Completion Checklist

## Before Committing Code
1. Run `pnpm lint-fix` to fix any linting issues
2. Run `pnpm test` to ensure all tests pass
3. Run `pnpm build` to verify build succeeds
4. Test functionality in development environment

## For Frontend Changes
1. Test in browser with `pnpm dev`
2. Verify responsive design
3. Check console for errors
4. Test authentication flow if modified

## For Infrastructure Changes  
1. Run `cdk diff` to review changes
2. Test deployment in development environment
3. Verify all resources are properly configured
4. Update documentation if needed

## For Authentication Changes
1. Test OAuth flow end-to-end
2. Verify token handling and expiration
3. Test both authenticated and unauthenticated states
4. Check security implications of changes