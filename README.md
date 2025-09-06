# GitHub SBOM Viewer

A web application to visualize Software Bill of Materials (SBOM) from GitHub
repositories with interactive Canvas-based dependency graphs.

## Features

- GitHub OAuth authentication using localStorage
- SBOM data retrieval from GitHub repositories
- Interactive Canvas visualization of dependency relationships
- Support for both user and organization repositories
- Real-time dependency graph rendering

## Architecture

- **Frontend**: SolidJS application with Canvas-based visualization
- **Backend**: AWS Lambda with Hono framework
- **Infrastructure**: AWS CDK for deployment
- **Authentication**: GitHub OAuth with localStorage token management

## Deployment

### 1. Create GitHub App

1. Navigate to GitHub Developer Settings and create a new GitHub App
2. Set an appropriate Homepage URL
3. Configure the following permissions:

   | Permission | Access Level |
   |:-----------|:-------------|
   | Contents | Read-only |
   | Email addresses | Read-only |
   | Profile | Read and Write |

4. Generate a client secret and save it securely
5. Note the Client ID for deployment

### 2. Deploy Infrastructure

```shell
cd cdk
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} \
  -c clientSecret=${GITHUB_APP_CLIENT_SECRET}
# Copy the CloudFront distribution domain from the deployment output
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} \
  -c clientSecret=${GITHUB_APP_CLIENT_SECRET} \
  -c domain=${CLOUDFRONT_DISTRIBUTION_DOMAIN_HOST}
```

**Note**: `${CLOUDFRONT_DISTRIBUTION_DOMAIN_HOST}` should be the FQDN
without `http://` or `https://`

### 3. Update GitHub App Callback URL

Update the Authorization callback URL in your GitHub App settings:

```plaintext
${CLOUDFRONT_DISTRIBUTION_DOMAIN}/api/
```

Where `${CLOUDFRONT_DISTRIBUTION_DOMAIN}` is the CloudFront distribution URL
from step 2.

## Development

### Prerequisites

- Node.js 18+
- pnpm
- AWS CLI configured
- AWS CDK CLI

### Local Development

```shell
# Install dependencies
pnpm install

# Start development server
cd app
pnpm dev

# Deploy infrastructure
cd cdk
pnpm deploy
```

## License

MIT License
