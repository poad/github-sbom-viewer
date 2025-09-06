# GitHub SBOM Viewer - Frontend

SolidJS frontend application for visualizing GitHub SBOM data with
Canvas-based dependency graphs.

## Features

- GitHub OAuth authentication with localStorage
- Interactive Canvas visualization of SBOM dependencies
- Repository browsing for users and organizations
- Real-time SBOM data fetching and rendering

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
pnpm install
```

### Available Scripts

#### `pnpm dev` or `pnpm start`

Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.

#### `pnpm build`

Builds the app for production to the `dist` folder.
It correctly bundles Solid in production mode and optimizes the build for the
best performance.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!

#### `pnpm lint`

Runs ESLint to check for code quality issues.

## Environment Variables

- `VITE_GITHUB_APPS_CLIENT_ID`: GitHub App Client ID

## Deployment

You can deploy the `dist` folder to any static host provider
(Netlify, Surge, Vercel, etc.)

## Learn More

- [Solid Website](https://solidjs.com)
- [Solid Discord](https://discord.com/invite/solidjs)
