# github-sbom-viewer

## deploy

1. Create GitHub App

### Create GitHub App

Specify an appropriate URL for the Homepage URL to create a GitHub App.
Callback URL is updated at the end of the deployment procedure.
For permissions, set the following values.
Generate a client secret and keep it.

#### permissions

| Action  | role |
|:--------|:-------|
| Contents | Read-only |
| Email addresses | Read-only |
| Profile | Read and Write |

2. cdk deploy

```shell
cd cdk
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} -c clientSecret=${GITHUB_APP_CLIENT_SECRET}
# Copy the CloudFront distribution domain from the deployment log to the clipboard.
cdk deploy -c clientId=${GITHUB_APP_CLIENT_ID} -c clientSecret=${GITHUB_APP_CLIENT_SECRET} -c domain=${CLOUDFRONT_DISTRIBUTION_DOMAIN_HOST} # ${CLOUDFRONT_DISTRIBUTION_DOMAIN_HOST} should be a value excluding http://, i.e., FQDN.
```

3. Update the Callback URL

Update the Callback URL in the GitHub App with the following values ${CLOUDFRONT_DISTRIBUTION_DOMAIN} should be the distribution domain URL in CloudFront that was deployed and generated during the cdk deploy procedure.

```plaintext
${CLOUDFRONT_DISTRIBUTION_DOMAIN}/api/
```
