# GitHub SBOM Viewer - Infrastructure

AWS CDK infrastructure for the GitHub SBOM Viewer application.

## Architecture

- **API Gateway**: REST API endpoints
- **Lambda Functions**: Backend handlers with Hono framework
- **CloudFront**: CDN for frontend distribution
- **S3**: Static website hosting

## Prerequisites

- AWS CLI configured
- AWS CDK CLI installed
- Node.js 18+
- pnpm

## Deployment

### Install Dependencies

```shell
pnpm install
```

### Deploy

```shell
# Initial deployment
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} -c clientSecret=${GITHUB_APP_CLIENT_SECRET}

# Update with domain after first deployment
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} \
  -c clientSecret=${GITHUB_APP_CLIENT_SECRET} \
  -c domain=${CLOUDFRONT_DISTRIBUTION_DOMAIN_HOST}
```

### Context Parameters

- `clientId`: GitHub App Client ID
- `clientSecret`: GitHub App Client Secret
- `domain`: CloudFront distribution domain (FQDN without protocol)

## Development

### Local Testing

```shell
# Run tests
pnpm test

# Lint code
pnpm lint

# Build Lambda functions
pnpm build
```

## Environment

The CDK stack creates the following resources:

- Lambda functions for GitHub API integration
- API Gateway for REST endpoints
- CloudFront distribution for frontend
- S3 bucket for static assets
