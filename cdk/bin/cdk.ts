#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {
  CloudfrontCdnTemplateStack,
  Config,
} from '../lib/cdk-stack';

const app = new cdk.App();

const config = app.node.tryGetContext('config') as Config;
const clientId = app.node.tryGetContext('clientId');
const clientSecret = app.node.tryGetContext('clientSecret');
const domain = app.node.tryGetContext('domain');
const debug = app.node.tryGetContext('debug') === 'true';

new CloudfrontCdnTemplateStack(app, config.stackName, {
  config,
  debug,
  clientId,
  clientSecret,
  domain,
  env: {
    account: app.account,
    region: app.region,
  },
});
