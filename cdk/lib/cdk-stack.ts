import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as awslogs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { buildFrontend } from './process/setup';
import * as deployment from 'aws-cdk-lib/aws-s3-deployment';

export interface Config {
  stackName: string;
  bucketName: string;
  appName: string;
  cloudfront: {
    comment: string;
  };
}

interface CloudfrontCdnTemplateStackProps extends cdk.StackProps {
  clientId: string;
  clientSecret: string;
  debug: boolean;
  domain?: string;
  config: Config;
}

export class CloudfrontCdnTemplateStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: CloudfrontCdnTemplateStackProps,
  ) {
    super(scope, id, props);

    const {
      clientId,
      clientSecret,
      domain,
      debug,
      config: {
        bucketName,
        appName,
        cloudfront: { comment },
      },
    } = props;

    buildFrontend(clientId);

    const functionName = appName;
    new awslogs.LogGroup(this, 'LambdaFunctionLogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: awslogs.RetentionDays.ONE_DAY,
    });

    const devOptions = debug ? {
      bundling: {
        sourceMap: true,
        sourceMapMode: nodejs.SourceMapMode.BOTH,
        sourcesContent: true,
        keepNames: true,
      },
    } : {
      bundling: {
      },
    };

    const apiRootPath = '/api/';

    const fn = new nodejs.NodejsFunction(this, 'Lambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: './lambda/index.ts',
      functionName,
      retryAttempts: 0,
      environment: {
        ...( debug? { NODE_OPTIONS: '--enable-source-maps', POWERTOOLS_LOG_LEVEL: 'DEBUG' } : {}),
        API_ROOT_PATH: apiRootPath,
        GITHUB_APP_CLIENT_ID: clientId,
        GITHUB_APP_CLIENT_SECRET: clientSecret,
        ...(domain ? { DOMAIN: domain } : {}),
      },
      bundling: {
        minify: true,
        format: cdk.aws_lambda_nodejs.OutputFormat.ESM,
        ...devOptions.bundling,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const s3bucket = new s3.Bucket(this, 'S3Bucket', {
      bucketName,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const apiRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'APIRequestPolicy', {
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });

    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: 'default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\' data: https:; connect-src \'self\' https://api.github.com https://github.com; font-src \'self\'; manifest-src \'self\'; frame-ancestors \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'self\'; form-action \'self\'; upgrade-insecure-requests; block-all-mixed-content; require-trusted-types-for \'script\'; report-uri /api/csp-report;',
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
            override: true,
          },
          {
            header: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
            override: true,
          },
          {
            header: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
            override: true,
          },
          {
            header: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
            override: true,
          },
        ],
      },
    });

    const cf = new cloudfront.Distribution(this, 'CloudFront', {
      comment,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: new origins.HttpOrigin(s3bucket.bucketWebsiteDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          originId: 's3',
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeadersPolicy,
      },
      additionalBehaviors: {
        [`${apiRootPath}*`]: {
          origin: new origins.FunctionUrlOrigin(fn.addFunctionUrl({
            authType: cdk.aws_lambda.FunctionUrlAuthType.AWS_IAM,
          }), {
            originId: 'api',
            connectionAttempts: 1,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: apiRequestPolicy,
          responseHeadersPolicy: securityHeadersPolicy,
        },
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    const deployRole = new iam.Role(this, 'DeployWebsiteRole', {
      roleName: `${appName}-deploy-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        's3-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [`${s3bucket.bucketArn}/`, `${s3bucket.bucketArn}/*`],
            }),
          ],
        }),
      },
    });

    new deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [deployment.Source.asset(`${process.cwd()}/../app/dist`)],
      destinationBucket: s3bucket,
      destinationKeyPrefix: '/',
      exclude: ['.DS_Store', '*/.DS_Store'],
      prune: true,
      retainOnDelete: false,
      role: deployRole,
    });

    // OAC
    const cfnOriginAccessControl =
      new cdk.aws_cloudfront.CfnOriginAccessControl(
        this,
        'OriginAccessControl',
        {
          originAccessControlConfig: {
            name: `OAC for Lambda Functions URL (${appName})`,
            originAccessControlOriginType: 'lambda',
            signingBehavior: 'always',
            signingProtocol: 'sigv4',
          },
        },
      );

    const cfnDistribution = cf.node.defaultChild as cdk.aws_cloudfront.CfnDistribution;

    // Set OAC
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Origins.1.OriginAccessControlId',
      cfnOriginAccessControl.attrId,
    );

    // Add permission Lambda Function URLs
    fn.addPermission('AllowCloudFrontServicePrincipal', {
      principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
      action: 'lambda:InvokeFunctionUrl',
      sourceArn: `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${cf.distributionId}`,
    });

    new cdk.CfnOutput(this, 'AccessURLOutput', {
      value: `https://${cf.distributionDomainName}`,
    });
  }
}
