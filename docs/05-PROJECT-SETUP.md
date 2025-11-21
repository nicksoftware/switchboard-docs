# 🚀 Project Setup & Getting Started

## Prerequisites

### Required Tools
- **.NET 8 SDK** or later
- **AWS CLI** v2 configured with credentials
- **Node.js** 18+ and npm (for AWS CDK)
- **AWS CDK** v2 installed globally: `npm install -g aws-cdk`
- **Git** for version control
- **IDE**: Visual Studio 2022, JetBrains Rider, or VS Code with C# extension

### AWS Prerequisites
- AWS Account with appropriate permissions
- IAM user/role with permissions for:
  - CloudFormation
  - Amazon Connect
  - Lambda
  - DynamoDB
  - S3
  - IAM role creation

### Verify Setup
```bash
# Check .NET version
dotnet --version  # Should be 8.0 or higher

# Check AWS CLI
aws --version
aws sts get-caller-identity  # Should show your AWS account

# Check CDK
cdk --version  # Should be 2.x

# Check Node.js
node --version  # Should be 18.x or higher
```

## Project Structure

### Recommended Repository Layout

```
Switchboard/
├── src/
│   ├── Switchboard.Framework/              # Main framework library
│   │   ├── Core/                                  # Core orchestration
│   │   │   ├── ConnectApplicationStack.cs
│   │   │   ├── ConnectApp.cs
│   │   │   └── FrameworkOrchestrator.cs
│   │   ├── Configuration/                         # Dynamic config
│   │   │   ├── ConfigurationManager.cs
│   │   │   ├── DynamoDbRepository.cs
│   │   │   └── Models/
│   │   ├── Infrastructure/                        # CDK constructs
│   │   │   ├── Constructs/
│   │   │   │   ├── SecureQueue.cs
│   │   │   │   ├── StandardRoutingProfile.cs
│   │   │   │   └── ContactFlowConstruct.cs
│   │   │   └── Builders/
│   │   │       ├── QueueBuilder.cs
│   │   │       └── FlowBuilder.cs
│   │   ├── Flows/                                 # Flow management
│   │   │   ├── FlowBuilder.cs
│   │   │   ├── FlowValidator.cs
│   │   │   ├── TemplateEngine.cs
│   │   │   └── Actions/
│   │   │       ├── MessageAction.cs
│   │   │       ├── TransferAction.cs
│   │   │       └── ...
│   │   ├── Models/                                # Shared models
│   │   │   ├── ContactFlow.cs
│   │   │   ├── FlowAction.cs
│   │   │   ├── QueueConfiguration.cs
│   │   │   └── ...
│   │   └── Switchboard.Framework.csproj
│   │
│   ├── Switchboard.Lambda.ConfigFetcher/   # Config Lambda
│   │   ├── Function.cs
│   │   ├── Models.cs
│   │   └── ConfigFetcher.csproj
│   │
│   ├── Switchboard.Lambda.Shared/          # Shared Lambda code
│   │   ├── BaseFunction.cs
│   │   ├── Extensions/
│   │   └── SharedLambda.csproj
│   │
│   └── Switchboard.Deployment/             # CDK app entry point
│       ├── Program.cs
│       ├── cdk.json
│       └── Deployment.csproj
│
├── test/
│   ├── Switchboard.Framework.Tests/
│   │   ├── Unit/
│   │   │   ├── Builders/
│   │   │   ├── Constructs/
│   │   │   └── Validators/
│   │   ├── Integration/
│   │   │   ├── DynamoDbTests.cs
│   │   │   └── LambdaTests.cs
│   │   └── Framework.Tests.csproj
│   │
│   └── Switchboard.Lambda.Tests/
│       ├── ConfigFetcherTests.cs
│       └── Lambda.Tests.csproj
│
├── examples/
│   ├── SimpleCallCenter/                         # Basic example
│   ├── EnterpriseCallCenter/                     # Advanced example
│   └── MigrationExample/                         # Migration from manual
│
├── docs/
│   ├── api/                                       # API documentation
│   ├── guides/                                    # How-to guides
│   └── architecture/                              # Architecture docs
│
├── .github/
│   └── workflows/
│       ├── build.yml
│       ├── test.yml
│       └── deploy.yml
│
├── .gitignore
├── README.md
├── LICENSE
└── amazon-connect-cdk-framework.sln
```

## Step-by-Step Setup

### 1. Create Solution and Projects

```bash
# Create solution directory
mkdir amazon-connect-cdk-framework
cd amazon-connect-cdk-framework

# Create solution
dotnet new sln -n Switchboard

# Create framework library (main project)
dotnet new classlib -n Switchboard.Framework -f net8.0 -o src/Switchboard.Framework

# Create Lambda projects
dotnet new lambda.EmptyFunction -n Switchboard.Lambda.ConfigFetcher -o src/Switchboard.Lambda.ConfigFetcher
dotnet new classlib -n Switchboard.Lambda.Shared -f net8.0 -o src/Switchboard.Lambda.Shared

# Create deployment app (CDK entry point)
dotnet new console -n Switchboard.Deployment -f net8.0 -o src/Switchboard.Deployment

# Create test projects
dotnet new xunit -n Switchboard.Framework.Tests -f net8.0 -o test/Switchboard.Framework.Tests
dotnet new xunit -n Switchboard.Lambda.Tests -f net8.0 -o test/Switchboard.Lambda.Tests

# Add projects to solution
dotnet sln add src/Switchboard.Framework/Switchboard.Framework.csproj
dotnet sln add src/Switchboard.Lambda.ConfigFetcher/ConfigFetcher.csproj
dotnet sln add src/Switchboard.Lambda.Shared/SharedLambda.csproj
dotnet sln add src/Switchboard.Deployment/Deployment.csproj
dotnet sln add test/Switchboard.Framework.Tests/Framework.Tests.csproj
dotnet sln add test/Switchboard.Lambda.Tests/Lambda.Tests.csproj

# Add project references
dotnet add test/Switchboard.Framework.Tests/Framework.Tests.csproj reference src/Switchboard.Framework/Switchboard.Framework.csproj
dotnet add src/Switchboard.Deployment/Deployment.csproj reference src/Switchboard.Framework/Switchboard.Framework.csproj
```

### 2. Install NuGet Packages

```bash
# Framework project - CDK and AWS SDK
cd src/Switchboard.Framework
dotnet add package Amazon.CDK.Lib -v 2.150.0
dotnet add package AWSSDK.DynamoDBv2
dotnet add package AWSSDK.S3
dotnet add package AWSSDK.Connect

# Lambda Config Fetcher - minimal dependencies
cd ../Switchboard.Lambda.ConfigFetcher
dotnet add package Amazon.Lambda.Core
dotnet add package Amazon.Lambda.RuntimeSupport
dotnet add package Amazon.Lambda.Serialization.SystemTextJson
dotnet add package AWSSDK.DynamoDBv2

# Test projects - testing frameworks
cd ../../test/Switchboard.Framework.Tests
dotnet add package Amazon.CDK.Assertions
dotnet add package xunit
dotnet add package xunit.runner.visualstudio
dotnet add package coverlet.collector
dotnet add package FluentAssertions
dotnet add package Moq
```

### 3. Initialize CDK in Deployment Project

```bash
cd ../../src/Switchboard.Deployment

# Create cdk.json
cat > cdk.json << 'EOF'
{
  "app": "dotnet run --project Deployment.csproj",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.csproj",
      "**/obj/**",
      "**/bin/**"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": [
      "aws",
      "aws-cn"
    ],
    "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
    "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
    "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
    "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
    "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
    "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
    "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
    "@aws-cdk/aws-route53-patters:useCertificate": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false,
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup": true,
    "@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId": true,
    "@aws-cdk/aws-ec2:launchTemplateDefaultUserData": true,
    "@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments": true,
    "@aws-cdk/aws-redshift:columnId": true,
    "@aws-cdk/aws-stepfunctions-tasks:enableEmrServicePolicyV2": true,
    "@aws-cdk/aws-ec2:restrictDefaultSecurityGroup": true,
    "@aws-cdk/aws-apigateway:requestValidatorUniqueId": true,
    "@aws-cdk/aws-kms:aliasNameRef": true,
    "@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig": true,
    "@aws-cdk/core:includePrefixInUniqueNameGeneration": true,
    "@aws-cdk/aws-efs:denyAnonymousAccess": true,
    "@aws-cdk/aws-opensearchservice:enableOpensearchMultiAzWithStandby": true,
    "@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion": true,
    "@aws-cdk/aws-efs:mountTargetOrderInsensitiveLogicalId": true,
    "@aws-cdk/aws-rds:auroraClusterChangeScopeOfInstanceParameterGroupWithEachParameters": true,
    "@aws-cdk/aws-appsync:useArnForSourceApiAssociationIdentifier": true,
    "@aws-cdk/aws-rds:preventRenderingDeprecatedCredentials": true,
    "@aws-cdk/aws-codepipeline-actions:useNewDefaultBranchForCodeCommitSource": true,
    "@aws-cdk/aws-cloudwatch-actions:changeLambdaPermissionLogicalIdForLambdaAction": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeysDefaultValueToFalse": true,
    "@aws-cdk/aws-codepipeline:defaultPipelineTypeToV2": true,
    "@aws-cdk/aws-kms:reduceCrossAccountRegionPolicyScope": true,
    "@aws-cdk/aws-eks:nodegroupNameAttribute": true,
    "@aws-cdk/aws-ec2:ebsDefaultGp3Volume": true,
    "@aws-cdk/aws-ecs:removeDefaultDeploymentAlarm": true,
    "@aws-cdk/custom-resources:logApiResponseDataPropertyTrueDefault": false,
    "@aws-cdk/aws-s3:keepNotificationInImportedBucket": false
  }
}
EOF
```

### 4. Create Initial Framework Code

**src/Switchboard.Framework/Core/ConnectApp.cs**:
```csharp
using Amazon.CDK;

namespace Switchboard.Framework.Core;

/// <summary>
/// Entry point for creating Amazon Connect applications.
/// Provides high-level, opinionated APIs for common scenarios.
/// </summary>
public static class ConnectApp
{
    /// <summary>
    /// Create a standard call center with common defaults.
    /// </summary>
    public static ConnectApplicationStack CreateStandard(
        App app,
        string id,
        Action<StandardOptions> configure)
    {
        var options = new StandardOptions();
        configure(options);

        var stack = new ConnectApplicationStack(app, id, new StackProps
        {
            Env = new Amazon.CDK.Environment
            {
                Account = options.Account,
                Region = options.Region
            }
        });

        // Configure with provided options
        stack.SetupStandardConfiguration(options);

        return stack;
    }
}

public class StandardOptions
{
    public string? Account { get; set; }
    public string Region { get; set; } = "us-east-1";
    public string[]? Queues { get; set; }
    public bool EnableDynamicConfiguration { get; set; } = true;
    public BusinessHours BusinessHours { get; set; } = BusinessHours.Default;
}

public enum BusinessHours
{
    Default,
    AlwaysOpen,
    Custom
}
```

**src/Switchboard.Deployment/Program.cs**:
```csharp
using Amazon.CDK;
using Switchboard.Framework.Core;

namespace Switchboard.Deployment;

public class Program
{
    public static void Main(string[] args)
    {
        var app = new App();

        // Simple example - creates entire call center
        ConnectApp.CreateStandard(app, "MyCallCenter", options =>
        {
            options.Region = "us-east-1";
            options.Queues = new[] { "Sales", "Support", "Billing" };
            options.EnableDynamicConfiguration = true;
        });

        app.Synth();
    }
}
```

### 5. Create .gitignore

```bash
cd ../../..
cat > .gitignore << 'EOF'
# CDK output
cdk.out/
cdk.context.json
*.js
*.d.ts
node_modules/

# .NET
bin/
obj/
*.user
*.suo
*.cache
*.dll
*.pdb
*.exe
TestResults/
.vs/

# Rider
.idea/

# OS
.DS_Store
Thumbs.db

# AWS
.aws-sam/
samconfig.toml

# Sensitive
*.pfx
*.key
appsettings.*.json
!appsettings.json
EOF
```

### 6. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Project structure and setup"
```

### 7. Bootstrap AWS CDK

```bash
# Bootstrap CDK in your AWS account (one-time per account/region)
cd src/Switchboard.Deployment
cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
```

### 8. Build and Test

```bash
# Build entire solution
cd ../../..
dotnet build

# Run tests
dotnet test

# Synth CDK (should succeed even with minimal code)
cd src/Switchboard.Deployment
cdk synth
```

## Next Steps

### Phase 1: Core Models (Week 1)
1. Create data models in `Models/` directory
   - `ContactFlow.cs`
   - `FlowAction.cs`
   - `QueueConfiguration.cs`
   - `RoutingConfiguration.cs`

2. Add JSON serialization attributes
3. Create unit tests for models

### Phase 2: Flow Builder (Week 2)
1. Implement `FlowBuilder.cs`
2. Implement fluent interface
3. Add action types
4. Create flow validation
5. Add comprehensive tests

### Phase 3: CDK Constructs (Week 3)
1. Create L2 wrapper constructs
   - `SecureQueue.cs`
   - `StandardRoutingProfile.cs`
   - `ContactFlowConstruct.cs`

2. Implement dependency management
3. Add construct tests

### Phase 4: Dynamic Configuration (Week 4)
1. Create DynamoDB tables
2. Implement Lambda config fetcher
3. Build configuration manager
4. Add caching layer
5. Test end-to-end

## Development Workflow

### Daily Development
```bash
# Make changes to code
# Run tests frequently
dotnet test

# Synth to check CloudFormation
cd src/Switchboard.Deployment
cdk synth

# Deploy to dev environment
cdk deploy --profile dev

# Check diff before deploying
cdk diff
```

### Before Committing
```bash
# Build
dotnet build

# Run all tests
dotnet test --collect:"XPlat Code Coverage"

# Check CDK synth
cd src/Switchboard.Deployment
cdk synth

# Format code (if using dotnet format)
dotnet format
```

### CI/CD Setup

**.github/workflows/build.yml**:
```yaml
name: Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install AWS CDK
        run: npm install -g aws-cdk

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore

      - name: Test
        run: dotnet test --no-build --verbosity normal --collect:"XPlat Code Coverage"

      - name: CDK Synth
        run: |
          cd src/Switchboard.Deployment
          cdk synth
```

## Useful Commands

### CDK Commands
```bash
# List all stacks
cdk ls

# Show CloudFormation template
cdk synth

# Compare deployed stack with current state
cdk diff

# Deploy to AWS
cdk deploy

# Deploy specific stack
cdk deploy MyCallCenter

# Destroy stack
cdk destroy
```

### .NET Commands
```bash
# Build solution
dotnet build

# Run tests
dotnet test

# Run specific test
dotnet test --filter "FullyQualifiedName~QueueBuilderTests"

# Code coverage
dotnet test --collect:"XPlat Code Coverage"

# Create new class
dotnet new class -n MyClass -o src/Switchboard.Framework/Core

# Add package
dotnet add package PackageName
```

### Lambda Commands
```bash
# Build Lambda for deployment
cd src/Switchboard.Lambda.ConfigFetcher
dotnet lambda package

# Test Lambda locally (requires AWS SAM)
sam local invoke ConfigFetcher -e event.json
```

## Troubleshooting

### CDK Bootstrap Issues
```bash
# If bootstrap fails, check AWS credentials
aws sts get-caller-identity

# Bootstrap with verbose output
cdk bootstrap --verbose

# Specify toolkit stack name
cdk bootstrap --toolkit-stack-name CDKToolkit
```

### Build Issues
```bash
# Clean and rebuild
dotnet clean
dotnet build

# Restore packages
dotnet restore --force
```

### Lambda Issues
```bash
# Check Lambda logs
aws logs tail /aws/lambda/ConfigFetcher --follow

# Invoke Lambda directly
aws lambda invoke --function-name ConfigFetcher --payload '{"flowId":"test"}' response.json
```

## Resources

- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Amazon Connect API**: https://docs.aws.amazon.com/connect/latest/APIReference/
- **.NET Lambda**: https://docs.aws.amazon.com/lambda/latest/dg/csharp-handler.html
- **DynamoDB SDK**: https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/dynamodb-intro.html

## Getting Help

1. Check the docs in `docs/` directory
2. Review examples in `examples/` directory
3. Search GitHub issues
4. Ask in team Slack/Discord
5. Consult AWS documentation

**You're now ready to start building the framework!**
