# 🏭 Production-Ready Examples & Deployment Patterns

## Overview

This document provides production-ready example project structures, configurations, and deployment patterns for real-world scenarios.

---

## Table of Contents

1. [Production Project Structure](#1-production-project-structure)
2. [Scenario 1: New Connect Instance](#2-scenario-1-new-connect-instance-greenfield)
3. [Scenario 2: Existing Connect Instance](#3-scenario-2-existing-connect-instance-brownfield)
4. [Environment Configuration](#4-environment-configuration)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Security Best Practices](#6-security-best-practices)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Disaster Recovery](#8-disaster-recovery)
9. [Multi-Region Deployment](#9-multi-region-deployment)
10. [Complete Example Projects](#10-complete-example-projects)

---

## 1. Production Project Structure

### Recommended Folder Structure

```
ProductionCallCenter/
├── src/
│   ├── Flows/                          # Contact flow definitions
│   │   ├── Inbound/
│   │   │   ├── SalesInboundFlow.cs
│   │   │   ├── SupportInboundFlow.cs
│   │   │   └── AfterHoursFlow.cs
│   │   ├── Outbound/
│   │   │   ├── CustomerFollowUpFlow.cs
│   │   │   └── SurveyFlow.cs
│   │   ├── Transfer/
│   │   │   ├── AgentTransferFlow.cs
│   │   │   └── QueueTransferFlow.cs
│   │   └── Shared/
│   │       ├── AuthenticationModule.cs
│   │       ├── VoicemailModule.cs
│   │       └── CallbackModule.cs
│   │
│   ├── Queues/                         # Queue definitions
│   │   ├── SalesQueues.cs
│   │   ├── SupportQueues.cs
│   │   └── EscalationQueues.cs
│   │
│   ├── RoutingProfiles/                # Routing profile definitions
│   │   ├── SalesAgentProfile.cs
│   │   ├── SupportAgentProfile.cs
│   │   └── SupervisorProfile.cs
│   │
│   ├── Hours/                          # Hours of operation
│   │   ├── BusinessHours.cs
│   │   ├── HolidayHours.cs
│   │   └── ExtendedSupportHours.cs
│   │
│   ├── Prompts/                        # Audio prompts
│   │   ├── PromptDefinitions.cs
│   │   └── AudioFiles/
│   │       ├── welcome.wav
│   │       ├── hold-music.wav
│   │       └── after-hours.wav
│   │
│   ├── Lambdas/                        # Custom Lambda functions
│   │   ├── CustomerLookup/
│   │   │   ├── Function.cs
│   │   │   ├── Models.cs
│   │   │   └── CustomerLookup.csproj
│   │   ├── CallDisposition/
│   │   │   ├── Function.cs
│   │   │   └── CallDisposition.csproj
│   │   └── Shared/
│   │       ├── ConnectExtensions.cs
│   │       └── SharedModels.cs
│   │
│   ├── Stacks/                         # CDK Stack definitions
│   │   ├── ConnectInstanceStack.cs
│   │   ├── FlowsStack.cs
│   │   ├── QueuesStack.cs
│   │   ├── LambdasStack.cs
│   │   ├── DynamoDbStack.cs
│   │   └── MonitoringStack.cs
│   │
│   ├── Configuration/                  # Configuration models
│   │   ├── ConnectConfiguration.cs
│   │   ├── FlowConfiguration.cs
│   │   └── EnvironmentConfiguration.cs
│   │
│   └── Program.cs                      # Entry point
│
├── config/                             # Environment configurations
│   ├── appsettings.json                # Base configuration
│   ├── appsettings.Development.json
│   ├── appsettings.Staging.json
│   ├── appsettings.Production.json
│   └── secrets/                        # Secrets (gitignored)
│       ├── dev-secrets.json
│       └── prod-secrets.json
│
├── infrastructure/                     # Infrastructure as Code
│   ├── cdk.json
│   ├── cdk.context.json
│   └── environments/
│       ├── dev.json
│       ├── staging.json
│       └── production.json
│
├── scripts/                            # Deployment scripts
│   ├── deploy.sh
│   ├── rollback.sh
│   ├── validate.sh
│   └── seed-data.sh
│
├── tests/                              # Tests
│   ├── Unit/
│   ├── Integration/
│   └── E2E/
│
├── docs/                               # Documentation
│   ├── architecture.md
│   ├── deployment.md
│   ├── runbook.md
│   └── flow-diagrams/
│
├── .github/                            # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-dev.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── .gitignore
├── README.md
└── ProductionCallCenter.sln
```

---

## 2. Scenario 1: New Connect Instance (Greenfield)

### Use Case
Creating a brand new Amazon Connect contact center from scratch.

### Project Structure

**Program.cs**:
```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Amazon.CDK;
using Switchboard;
using ProductionCallCenter.Stacks;

var builder = Host.CreateApplicationBuilder(args);

// Load configuration based on environment
var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("config/appsettings.json", optional: false)
    .AddJsonFile($"config/appsettings.{environment}.json", optional: true)
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(optional: true);

// Configure Switchboard
builder.Services.AddSwitchboard(options =>
{
    var connectConfig = builder.Configuration.GetSection("AmazonConnect");
    options.InstanceName = connectConfig["InstanceName"];
    options.Region = connectConfig["Region"];
    options.IdentityManagementType = connectConfig["IdentityManagement"];
})
// Auto-discover flow and queue definitions
.AddFlowDefinitions(typeof(Program).Assembly)
.AddQueueDefinitions(typeof(Program).Assembly)
.AddRoutingProfiles(typeof(Program).Assembly)
.AddHoursOfOperation(typeof(Program).Assembly)

// Dynamic configuration
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.UseS3ForFlowTemplates();
    config.EnableVersioning();
    config.CacheTTL = TimeSpan.FromMinutes(5);
})

// Lambda integrations
.AddLambdaFunctions(lambda =>
{
    lambda.AddFromAssembly(typeof(Program).Assembly);
    lambda.DefaultMemorySize = 512;
    lambda.DefaultTimeout = Duration.Seconds(30);
})

// Middleware
.UseMiddleware<LoggingMiddleware>()
.UseMiddleware<ValidationMiddleware>()
.UseMiddleware<MetricsMiddleware>()
.UseMiddleware<ErrorHandlingMiddleware>()

// Observability
.AddTelemetry(telemetry =>
{
    telemetry.UseCloudWatch();
    telemetry.UseXRay();
    telemetry.EnableDetailedMetrics = true;
});

var host = builder.Build();

// Create CDK App
var app = new App();

// Get environment-specific configuration
var envConfig = builder.Configuration.GetSection("Environment").Get<EnvironmentConfiguration>();

// Create stacks
var instanceStack = new ConnectInstanceStack(app, $"{envConfig.StackPrefix}-Instance", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = envConfig.AwsAccount,
        Region = envConfig.AwsRegion
    },
    Tags = new Dictionary<string, string>
    {
        { "Environment", envConfig.Name },
        { "ManagedBy", "CDK" },
        { "Project", "ProductionCallCenter" },
        { "CostCenter", envConfig.CostCenter }
    }
});

var lambdaStack = new LambdasStack(app, $"{envConfig.StackPrefix}-Lambdas", new LambdaStackProps
{
    Env = instanceStack.Env,
    InstanceArn = instanceStack.Instance.AttrArn
});

var dynamoStack = new DynamoDbStack(app, $"{envConfig.StackPrefix}-DynamoDB", new StackProps
{
    Env = instanceStack.Env
});

var queuesStack = new QueuesStack(app, $"{envConfig.StackPrefix}-Queues", new QueueStackProps
{
    Env = instanceStack.Env,
    InstanceArn = instanceStack.Instance.AttrArn,
    HoursOfOperation = instanceStack.HoursOfOperation
});

var flowsStack = new FlowsStack(app, $"{envConfig.StackPrefix}-Flows", new FlowStackProps
{
    Env = instanceStack.Env,
    InstanceArn = instanceStack.Instance.AttrArn,
    Queues = queuesStack.Queues,
    Lambdas = lambdaStack.Functions,
    ConfigTable = dynamoStack.FlowConfigTable
});

var monitoringStack = new MonitoringStack(app, $"{envConfig.StackPrefix}-Monitoring", new MonitoringStackProps
{
    Env = instanceStack.Env,
    InstanceId = instanceStack.Instance.AttrId,
    Queues = queuesStack.Queues
});

// Stack dependencies
lambdaStack.AddDependency(instanceStack);
queuesStack.AddDependency(instanceStack);
flowsStack.AddDependency(queuesStack);
flowsStack.AddDependency(lambdaStack);
monitoringStack.AddDependency(flowsStack);

app.Synth();
```

### Configuration (appsettings.Production.json)

```json
{
  "AmazonConnect": {
    "InstanceName": "ProductionCallCenter",
    "Region": "us-east-1",
    "IdentityManagement": "SAML",
    "InboundCallsEnabled": true,
    "OutboundCallsEnabled": true,
    "ContactFlowLogsEnabled": true,
    "ContactLensEnabled": true,
    "EarlyMediaEnabled": true,
    "Encryption": {
      "Enabled": true,
      "KmsKeyArn": "arn:aws:kms:us-east-1:123456789012:key/..."
    },
    "InstanceAlias": "production-call-center"
  },

  "Environment": {
    "Name": "Production",
    "StackPrefix": "prod-callcenter",
    "AwsAccount": "123456789012",
    "AwsRegion": "us-east-1",
    "CostCenter": "CC-001"
  },

  "Queues": {
    "Sales": {
      "MaxContacts": 100,
      "ServiceLevel": {
        "Threshold": 20,
        "Target": 0.80
      },
      "OutboundCallerId": {
        "Name": "Sales Team",
        "Number": "+18005551234"
      },
      "Tags": {
        "Department": "Sales",
        "Priority": "High"
      }
    },
    "Support": {
      "MaxContacts": 150,
      "ServiceLevel": {
        "Threshold": 30,
        "Target": 0.75
      }
    }
  },

  "DynamicConfiguration": {
    "Enabled": true,
    "Provider": "DynamoDB",
    "TableNames": {
      "FlowConfigurations": "prod-connect-flow-configs",
      "QueueConfigurations": "prod-connect-queue-configs",
      "RoutingConfigurations": "prod-connect-routing-configs"
    },
    "CacheTTL": "00:05:00",
    "EnableVersioning": true,
    "EnableAuditLog": true
  },

  "Lambda": {
    "CustomerLookup": {
      "MemorySize": 1024,
      "Timeout": 30,
      "Environment": {
        "CRM_API_ENDPOINT": "https://api.crm.example.com",
        "CACHE_ENABLED": "true",
        "LOG_LEVEL": "INFO"
      },
      "VpcConfig": {
        "SubnetIds": ["subnet-xxx", "subnet-yyy"],
        "SecurityGroupIds": ["sg-xxx"]
      }
    },
    "CallDisposition": {
      "MemorySize": 512,
      "Timeout": 15
    }
  },

  "Monitoring": {
    "CloudWatch": {
      "Enabled": true,
      "DetailedMetrics": true,
      "LogRetentionDays": 30
    },
    "Alarms": {
      "QueuedCallsThreshold": 25,
      "LongestWaitTimeThreshold": 300,
      "AbandonedCallsPercentage": 0.05,
      "SNSTopicArn": "arn:aws:sns:us-east-1:123456789012:connect-alerts"
    },
    "XRay": {
      "Enabled": true,
      "SamplingRate": 0.1
    }
  },

  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "AmazonConnect": "Debug",
      "System": "Warning"
    },
    "CloudWatch": {
      "LogGroupName": "/aws/connect/production",
      "RetentionInDays": 30
    },
    "S3": {
      "Enabled": true,
      "BucketName": "prod-connect-logs-archive",
      "Prefix": "contact-flows/"
    }
  },

  "Security": {
    "EnableEncryption": true,
    "KmsKeyId": "alias/connect-production",
    "CallRecording": {
      "Enabled": true,
      "EncryptionEnabled": true,
      "S3Bucket": "prod-connect-recordings",
      "RetentionDays": 90
    },
    "ContactLens": {
      "Enabled": true,
      "RedactPII": true,
      "S3OutputBucket": "prod-connect-contactlens"
    }
  },

  "BackupAndRecovery": {
    "DynamoDBBackup": {
      "Enabled": true,
      "PointInTimeRecovery": true
    },
    "S3Versioning": true,
    "CrossRegionReplication": {
      "Enabled": true,
      "DestinationRegion": "us-west-2"
    }
  }
}
```

---

## 3. Scenario 2: Existing Connect Instance (Brownfield)

### Use Case
Importing an existing Amazon Connect instance and managing it with the framework.

### Program.cs (Existing Instance)

```csharp
using Amazon.CDK;
using Switchboard;
using ProductionCallCenter.Stacks;

var builder = Host.CreateApplicationBuilder(args);

// Configure for existing instance
builder.Services.AddSwitchboard(options =>
{
    // Import existing instance instead of creating new one
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    options.ExistingInstanceArn = "arn:aws:connect:us-east-1:123456789012:instance/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Only manage specific resources
    options.ManageFlows = true;
    options.ManageQueues = false;          // Don't touch existing queues
    options.ManageRoutingProfiles = false; // Don't touch existing routing profiles
    options.ManageUsers = false;           // Don't touch existing users
    options.ManageHours = true;            // We can manage hours of operation
})
// Import existing resources
.ImportExistingQueues(import =>
{
    // Reference existing queues by ARN
    import.AddQueue("Sales", "arn:aws:connect:us-east-1:123456789012:instance/.../queue/...");
    import.AddQueue("Support", "arn:aws:connect:us-east-1:123456789012:instance/.../queue/...");
})
.ImportExistingRoutingProfiles(import =>
{
    import.AddProfile("BasicRouting", "arn:aws:connect:...");
})

// Add new flows that use existing resources
.AddFlowDefinitions(typeof(Program).Assembly)

// Add dynamic configuration (new feature)
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.TableNamePrefix = "existing-connect-";
});

var host = builder.Build();
var app = new App();

var envConfig = builder.Configuration.GetSection("Environment").Get<EnvironmentConfiguration>();

// Stack for existing instance - only imports, doesn't create
var instanceStack = new ExistingInstanceStack(app, $"{envConfig.StackPrefix}-Instance", new ExistingInstanceStackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = envConfig.AwsAccount,
        Region = envConfig.AwsRegion
    },
    InstanceId = envConfig.ExistingInstanceId,
    ImportOnly = true
});

// Only create new resources (flows, lambdas, config tables)
var lambdaStack = new LambdasStack(app, $"{envConfig.StackPrefix}-Lambdas", new LambdaStackProps
{
    Env = instanceStack.Env,
    InstanceArn = instanceStack.InstanceArn
});

var dynamoStack = new DynamoDbStack(app, $"{envConfig.StackPrefix}-DynamoDB", new StackProps
{
    Env = instanceStack.Env
});

// Flows stack that references existing queues
var flowsStack = new FlowsStack(app, $"{envConfig.StackPrefix}-Flows", new FlowStackProps
{
    Env = instanceStack.Env,
    InstanceArn = instanceStack.InstanceArn,
    ExistingQueues = instanceStack.ImportedQueues,  // Use existing queues
    Lambdas = lambdaStack.Functions,
    ConfigTable = dynamoStack.FlowConfigTable
});

app.Synth();
```

### Existing Instance Stack

```csharp
namespace ProductionCallCenter.Stacks;

using Amazon.CDK;
using Amazon.CDK.AWS.Connect;
using Constructs;
using System.Collections.Generic;

public class ExistingInstanceStackProps : StackProps
{
    public string InstanceId { get; set; }
    public bool ImportOnly { get; set; } = true;
}

public class ExistingInstanceStack : Stack
{
    public string InstanceArn { get; }
    public string InstanceId { get; }
    public Dictionary<string, IQueue> ImportedQueues { get; } = new();
    public Dictionary<string, IRoutingProfile> ImportedRoutingProfiles { get; } = new();

    public ExistingInstanceStack(Construct scope, string id, ExistingInstanceStackProps props)
        : base(scope, id, props)
    {
        InstanceId = props.InstanceId;
        InstanceArn = $"arn:aws:connect:{props.Env.Region}:{props.Env.Account}:instance/{props.InstanceId}";

        // Import existing resources (read-only)
        ImportQueues();
        ImportRoutingProfiles();
        ImportHoursOfOperation();

        // Output ARNs for reference
        new CfnOutput(this, "ExistingInstanceArn", new CfnOutputProps
        {
            Value = InstanceArn,
            Description = "ARN of existing Connect instance",
            ExportName = $"{id}-InstanceArn"
        });
    }

    private void ImportQueues()
    {
        // Import existing queues by looking them up
        var salesQueue = Queue.FromQueueArn(this, "ExistingSalesQueue",
            "arn:aws:connect:us-east-1:123456789012:instance/.../queue/sales-queue-id");

        ImportedQueues["Sales"] = salesQueue;

        var supportQueue = Queue.FromQueueArn(this, "ExistingSupportQueue",
            "arn:aws:connect:us-east-1:123456789012:instance/.../queue/support-queue-id");

        ImportedQueues["Support"] = supportQueue;
    }

    private void ImportRoutingProfiles()
    {
        // Similar pattern for routing profiles
    }

    private void ImportHoursOfOperation()
    {
        // Similar pattern for hours of operation
    }
}
```

### Configuration (appsettings.ExistingInstance.json)

```json
{
  "AmazonConnect": {
    "ImportExistingInstance": true,
    "ExistingInstanceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "ExistingInstanceArn": "arn:aws:connect:us-east-1:123456789012:instance/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "ManageFlows": true,
    "ManageQueues": false,
    "ManageRoutingProfiles": false,
    "ManageUsers": false,
    "ManageHours": true
  },

  "ExistingResources": {
    "Queues": {
      "Sales": {
        "Arn": "arn:aws:connect:us-east-1:123456789012:instance/.../queue/sales-id",
        "Name": "Sales",
        "Import": true
      },
      "Support": {
        "Arn": "arn:aws:connect:us-east-1:123456789012:instance/.../queue/support-id",
        "Name": "Support",
        "Import": true
      }
    },
    "RoutingProfiles": {
      "BasicRouting": {
        "Arn": "arn:aws:connect:us-east-1:123456789012:instance/.../routing-profile/basic-id",
        "Import": true
      }
    }
  },

  "NewResources": {
    "Flows": [
      "NewSalesFlow",
      "NewSupportFlow",
      "EnhancedRoutingFlow"
    ],
    "Lambdas": [
      "CustomerLookup",
      "CallDisposition"
    ]
  }
}
```

### Migration Strategy

```csharp
namespace ProductionCallCenter.Migration;

public class MigrationStrategy
{
    // Phase 1: Import existing resources (read-only)
    public async Task Phase1_ImportExisting()
    {
        // Deploy stack with ImportOnly = true
        // Verify all resources are correctly imported
        // No changes to existing infrastructure
    }

    // Phase 2: Add new flows alongside existing ones
    public async Task Phase2_AddNewFlows()
    {
        // Deploy new flows that reference existing queues
        // Test new flows in parallel with existing ones
        // Gradually route traffic to new flows
    }

    // Phase 3: Add dynamic configuration
    public async Task Phase3_AddDynamicConfig()
    {
        // Deploy DynamoDB tables
        // Deploy config fetcher Lambda
        // Migrate flow configurations to DynamoDB
    }

    // Phase 4: Gradually take ownership
    public async Task Phase4_TakeOwnership()
    {
        // Once proven stable, start managing more resources
        // options.ManageQueues = true;
        // options.ManageRoutingProfiles = true;
    }
}
```

---

## 4. Environment Configuration

### Multi-Environment Setup

**appsettings.Development.json**:
```json
{
  "AmazonConnect": {
    "InstanceName": "DevCallCenter",
    "Region": "us-east-1",
    "IdentityManagement": "CONNECT_MANAGED"
  },
  "Environment": {
    "Name": "Development",
    "StackPrefix": "dev-callcenter",
    "AwsAccount": "111111111111",
    "AwsRegion": "us-east-1"
  },
  "Monitoring": {
    "CloudWatch": {
      "DetailedMetrics": false
    },
    "Alarms": {
      "Enabled": false
    }
  },
  "Security": {
    "CallRecording": {
      "Enabled": false
    }
  }
}
```

**appsettings.Staging.json**:
```json
{
  "AmazonConnect": {
    "InstanceName": "StagingCallCenter",
    "Region": "us-east-1",
    "IdentityManagement": "SAML"
  },
  "Environment": {
    "Name": "Staging",
    "StackPrefix": "staging-callcenter",
    "AwsAccount": "222222222222",
    "AwsRegion": "us-east-1"
  },
  "Monitoring": {
    "CloudWatch": {
      "DetailedMetrics": true
    },
    "Alarms": {
      "Enabled": true,
      "SNSTopicArn": "arn:aws:sns:us-east-1:222222222222:staging-alerts"
    }
  }
}
```

**appsettings.Production.json**:
```json
{
  "AmazonConnect": {
    "InstanceName": "ProductionCallCenter",
    "Region": "us-east-1",
    "IdentityManagement": "SAML"
  },
  "Environment": {
    "Name": "Production",
    "StackPrefix": "prod-callcenter",
    "AwsAccount": "333333333333",
    "AwsRegion": "us-east-1",
    "RequireApproval": true,
    "EnableTerminationProtection": true
  },
  "Monitoring": {
    "CloudWatch": {
      "DetailedMetrics": true
    },
    "Alarms": {
      "Enabled": true,
      "SNSTopicArn": "arn:aws:sns:us-east-1:333333333333:production-alerts-critical"
    },
    "XRay": {
      "Enabled": true,
      "SamplingRate": 0.1
    }
  },
  "Security": {
    "EnableEncryption": true,
    "CallRecording": {
      "Enabled": true,
      "RetentionDays": 90
    },
    "ContactLens": {
      "Enabled": true,
      "RedactPII": true
    }
  },
  "BackupAndRecovery": {
    "DynamoDBBackup": {
      "Enabled": true,
      "PointInTimeRecovery": true
    },
    "CrossRegionReplication": {
      "Enabled": true,
      "DestinationRegion": "us-west-2"
    }
  }
}
```

### Environment-Specific Deployment Script

**scripts/deploy.sh**:
```bash
#!/bin/bash

set -e

ENVIRONMENT=$1
AWS_PROFILE=$2

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy.sh <environment> <aws-profile>"
    echo "Example: ./deploy.sh production prod-admin"
    exit 1
fi

echo "Deploying to $ENVIRONMENT environment..."

# Set environment
export ASPNETCORE_ENVIRONMENT=$ENVIRONMENT

# Load environment-specific variables
case $ENVIRONMENT in
    "Development")
        AWS_ACCOUNT="111111111111"
        AWS_REGION="us-east-1"
        REQUIRE_APPROVAL="never"
        ;;
    "Staging")
        AWS_ACCOUNT="222222222222"
        AWS_REGION="us-east-1"
        REQUIRE_APPROVAL="any-change"
        ;;
    "Production")
        AWS_ACCOUNT="333333333333"
        AWS_REGION="us-east-1"
        REQUIRE_APPROVAL="broadening"
        # Require MFA for production
        echo "Production deployment requires MFA..."
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Bootstrap if needed
echo "Ensuring CDK is bootstrapped..."
cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION --profile $AWS_PROFILE

# Run tests
echo "Running tests..."
dotnet test

# Validate configuration
echo "Validating configuration..."
dotnet run --project src/ProductionCallCenter.csproj -- validate

# Synthesize
echo "Synthesizing CloudFormation templates..."
cdk synth --profile $AWS_PROFILE

# Show diff
echo "Showing changes..."
cdk diff --profile $AWS_PROFILE

# Deploy
echo "Deploying stacks..."
cdk deploy --all \
    --profile $AWS_PROFILE \
    --require-approval $REQUIRE_APPROVAL \
    --context environment=$ENVIRONMENT

echo "Deployment complete!"

# Post-deployment validation
echo "Running post-deployment validation..."
./scripts/validate.sh $ENVIRONMENT $AWS_PROFILE
```

---

## 5. CI/CD Pipeline

### GitHub Actions Workflow

**.github/workflows/deploy-production.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      confirm_deployment:
        description: 'Type "deploy-production" to confirm'
        required: true

env:
  DOTNET_VERSION: '10.0.x'
  NODE_VERSION: '20.x'
  AWS_REGION: 'us-east-1'

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run unit tests
        run: dotnet test --no-build --configuration Release --filter Category=Unit

      - name: Run integration tests
        run: dotnet test --no-build --configuration Release --filter Category=Integration
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/dotnet@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run CFN-NAG on synthesized templates
        run: |
          gem install cfn-nag
          cdk synth
          cfn_nag_scan --input-path cdk.out/

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [validate, security-scan]
    environment:
      name: staging
      url: https://staging.connect.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install CDK
        run: npm install -g aws-cdk

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.STAGING_AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.STAGING_AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to staging
        run: |
          export ASPNETCORE_ENVIRONMENT=Staging
          cdk deploy --all --require-approval never
        env:
          CDK_DEFAULT_ACCOUNT: ${{ secrets.STAGING_AWS_ACCOUNT }}

      - name: Run smoke tests
        run: dotnet test --filter Category=Smoke
        env:
          CONNECT_INSTANCE_URL: ${{ secrets.STAGING_CONNECT_URL }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.confirm_deployment == 'deploy-production'
    environment:
      name: production
      url: https://connect.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install CDK
        run: npm install -g aws-cdk

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          role-to-assume: ${{ secrets.PROD_DEPLOYMENT_ROLE }}
          role-duration-seconds: 3600

      - name: Create backup
        run: ./scripts/backup.sh production

      - name: Deploy to production
        run: |
          export ASPNETCORE_ENVIRONMENT=Production
          cdk deploy --all --require-approval broadening
        env:
          CDK_DEFAULT_ACCOUNT: ${{ secrets.PROD_AWS_ACCOUNT }}

      - name: Run smoke tests
        run: dotnet test --filter Category=Smoke
        env:
          CONNECT_INSTANCE_URL: ${{ secrets.PROD_CONNECT_URL }}

      - name: Notify deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  rollback:
    name: Rollback Production
    runs-on: ubuntu-latest
    if: failure()
    needs: deploy-production
    steps:
      - name: Rollback deployment
        run: ./scripts/rollback.sh production
```

---

## 6. Security Best Practices

### Secrets Management

**Using AWS Secrets Manager**:

```csharp
namespace ProductionCallCenter.Configuration;

using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;

public class SecretsManagerConfigurationProvider : ConfigurationProvider
{
    private readonly IAmazonSecretsManager _secretsManager;
    private readonly string _secretName;

    public override void Load()
    {
        var request = new GetSecretValueRequest
        {
            SecretId = _secretName
        };

        var response = _secretsManager.GetSecretValueAsync(request).Result;
        var secrets = JsonSerializer.Deserialize<Dictionary<string, string>>(response.SecretString);

        foreach (var secret in secrets)
        {
            Data[secret.Key] = secret.Value;
        }
    }
}

// Usage in Program.cs
builder.Configuration.AddSecretsManager(
    region: RegionEndpoint.USEast1,
    secretName: "production/connect/secrets"
);
```

### IAM Roles and Policies

```csharp
namespace ProductionCallCenter.Stacks;

public class SecurityStack : Stack
{
    public SecurityStack(Construct scope, string id, StackProps props) : base(scope, id, props)
    {
        // Lambda execution role with least privilege
        var lambdaRole = new Role(this, "LambdaExecutionRole", new RoleProps
        {
            AssumedBy = new ServicePrincipal("lambda.amazonaws.com"),
            ManagedPolicies = new[]
            {
                ManagedPolicy.FromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
            }
        });

        // Grant minimal DynamoDB permissions
        var configTable = Table.FromTableName(this, "ConfigTable", "connect-config");
        configTable.GrantReadData(lambdaRole);

        // Connect service role
        var connectRole = new Role(this, "ConnectServiceRole", new RoleProps
        {
            AssumedBy = new ServicePrincipal("connect.amazonaws.com"),
            Description = "Service role for Amazon Connect to invoke Lambda functions"
        });

        // Enable encryption
        var encryptionKey = new Key(this, "ConnectEncryptionKey", new KeyProps
        {
            EnableKeyRotation = true,
            Description = "Encryption key for Connect recordings and data",
            RemovalPolicy = RemovalPolicy.RETAIN
        });

        // CloudTrail for audit logging
        var trail = new Trail(this, "ConnectAuditTrail", new TrailProps
        {
            IsMultiRegionTrail = true,
            IncludeGlobalServiceEvents = true,
            EnableFileValidation = true
        });
    }
}
```

### Network Security

```csharp
public class NetworkStack : Stack
{
    public NetworkStack(Construct scope, string id, StackProps props) : base(scope, id, props)
    {
        // VPC for Lambda functions
        var vpc = new Vpc(this, "ConnectVPC", new VpcProps
        {
            MaxAzs = 3,
            NatGateways = 2,
            SubnetConfiguration = new[]
            {
                new SubnetConfiguration
                {
                    Name = "Private",
                    SubnetType = SubnetType.PRIVATE_WITH_EGRESS,
                    CidrMask = 24
                },
                new SubnetConfiguration
                {
                    Name = "Public",
                    SubnetType = SubnetType.PUBLIC,
                    CidrMask = 24
                }
            }
        });

        // Security group for Lambda
        var lambdaSg = new SecurityGroup(this, "LambdaSecurityGroup", new SecurityGroupProps
        {
            Vpc = vpc,
            Description = "Security group for Connect Lambda functions",
            AllowAllOutbound = false
        });

        // Allow HTTPS to AWS services
        lambdaSg.AddEgressRule(Peer.AnyIpv4(), Port.Tcp(443), "HTTPS to AWS services");

        // VPC Endpoints for AWS services
        vpc.AddInterfaceEndpoint("DynamoDBEndpoint", new InterfaceVpcEndpointOptions
        {
            Service = InterfaceVpcEndpointAwsService.DYNAMODB
        });

        vpc.AddInterfaceEndpoint("SecretsManagerEndpoint", new InterfaceVpcEndpointOptions
        {
            Service = InterfaceVpcEndpointAwsService.SECRETS_MANAGER
        });
    }
}
```

---

## 7. Monitoring & Observability

### CloudWatch Dashboards

```csharp
namespace ProductionCallCenter.Stacks;

using Amazon.CDK.AWS.CloudWatch;

public class MonitoringStack : Stack
{
    public MonitoringStack(Construct scope, string id, MonitoringStackProps props)
        : base(scope, id, props)
    {
        var dashboard = new Dashboard(this, "ConnectDashboard", new DashboardProps
        {
            DashboardName = "Production-Connect-Dashboard"
        });

        // Queue metrics
        dashboard.AddWidgets(
            new GraphWidget(new GraphWidgetProps
            {
                Title = "Queue Metrics",
                Left = new[]
                {
                    new Metric(new MetricProps
                    {
                        Namespace = "AWS/Connect",
                        MetricName = "CallsQueued",
                        DimensionsMap = new Dictionary<string, string>
                        {
                            { "InstanceId", props.InstanceId },
                            { "QueueName", "Sales" }
                        },
                        Statistic = "Average",
                        Period = Duration.Minutes(5)
                    }),
                    new Metric(new MetricProps
                    {
                        Namespace = "AWS/Connect",
                        MetricName = "LongestQueueWaitTime",
                        DimensionsMap = new Dictionary<string, string>
                        {
                            { "InstanceId", props.InstanceId },
                            { "QueueName", "Sales" }
                        },
                        Statistic = "Maximum",
                        Period = Duration.Minutes(5)
                    })
                }
            })
        );

        // Lambda metrics
        foreach (var lambda in props.Lambdas)
        {
            dashboard.AddWidgets(
                new GraphWidget(new GraphWidgetProps
                {
                    Title = $"Lambda: {lambda.FunctionName}",
                    Left = new[]
                    {
                        lambda.MetricInvocations(),
                        lambda.MetricErrors(),
                        lambda.MetricDuration()
                    }
                })
            );
        }

        // Alarms
        CreateAlarms(props);
    }

    private void CreateAlarms(MonitoringStackProps props)
    {
        // High queue wait time alarm
        var highQueueWaitAlarm = new Alarm(this, "HighQueueWaitAlarm", new AlarmProps
        {
            Metric = new Metric(new MetricProps
            {
                Namespace = "AWS/Connect",
                MetricName = "LongestQueueWaitTime",
                DimensionsMap = new Dictionary<string, string>
                {
                    { "InstanceId", props.InstanceId }
                },
                Statistic = "Maximum",
                Period = Duration.Minutes(5)
            }),
            Threshold = 300, // 5 minutes
            EvaluationPeriods = 2,
            ComparisonOperator = ComparisonOperator.GREATER_THAN_THRESHOLD,
            ActionsEnabled = true
        });

        var snsTopic = Topic.FromTopicArn(this, "AlertTopic", props.AlertTopicArn);
        highQueueWaitAlarm.AddAlarmAction(new SnsAction(snsTopic));

        // High abandon rate alarm
        var highAbandonAlarm = new Alarm(this, "HighAbandonRateAlarm", new AlarmProps
        {
            Metric = new Metric(new MetricProps
            {
                Namespace = "AWS/Connect",
                MetricName = "CallsAbandoned",
                Statistic = "Sum",
                Period = Duration.Minutes(15)
            }),
            Threshold = 10,
            EvaluationPeriods = 1,
            ComparisonOperator = ComparisonOperator.GREATER_THAN_THRESHOLD
        });

        highAbandonAlarm.AddAlarmAction(new SnsAction(snsTopic));

        // Lambda error alarm
        foreach (var lambda in props.Lambdas)
        {
            var lambdaErrorAlarm = new Alarm(this, $"{lambda.FunctionName}ErrorAlarm", new AlarmProps
            {
                Metric = lambda.MetricErrors(),
                Threshold = 5,
                EvaluationPeriods = 2
            });

            lambdaErrorAlarm.AddAlarmAction(new SnsAction(snsTopic));
        }
    }
}
```

### Application Insights

```csharp
// Add to Lambda functions
public class CustomerLookupFunction
{
    private readonly ILogger<CustomerLookupFunction> _logger;
    private readonly IMetrics _metrics;

    public async Task<APIGatewayProxyResponse> FunctionHandler(
        APIGatewayProxyRequest request,
        ILambdaContext context)
    {
        using var activity = Activity.Current?.Source.StartActivity("CustomerLookup");

        try
        {
            _logger.LogInformation("Looking up customer {CustomerId}", customerId);

            var stopwatch = Stopwatch.StartNew();
            var customer = await _customerService.GetCustomerAsync(customerId);
            stopwatch.Stop();

            _metrics.PutMetric("CustomerLookupDuration", stopwatch.ElapsedMilliseconds, Unit.MILLISECONDS);
            _metrics.PutMetric("CustomerLookupSuccess", 1, Unit.COUNT);

            activity?.SetTag("customer.tier", customer.Tier);
            activity?.SetTag("customer.id", customer.Id);

            return new APIGatewayProxyResponse
            {
                StatusCode = 200,
                Body = JsonSerializer.Serialize(customer)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to lookup customer {CustomerId}", customerId);
            _metrics.PutMetric("CustomerLookupError", 1, Unit.COUNT);

            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);

            throw;
        }
    }
}
```

---

## 8. Disaster Recovery

### Backup Strategy

```csharp
namespace ProductionCallCenter.Stacks;

public class BackupStack : Stack
{
    public BackupStack(Construct scope, string id, StackProps props) : base(scope, id, props)
    {
        // DynamoDB backup vault
        var backupVault = new BackupVault(this, "ConnectBackupVault", new BackupVaultProps
        {
            BackupVaultName = "connect-backup-vault",
            EncryptionKey = Key.FromKeyArn(this, "EncryptionKey", "arn:aws:kms:...")
        });

        // Backup plan
        var backupPlan = new BackupPlan(this, "ConnectBackupPlan", new BackupPlanProps
        {
            BackupPlanName = "connect-backup-plan",
            BackupVault = backupVault
        });

        // Daily backup rule
        backupPlan.AddRule(new BackupPlanRule(new BackupPlanRuleProps
        {
            RuleName = "DailyBackup",
            ScheduleExpression = Schedule.Cron(new CronOptions
            {
                Hour = "2",
                Minute = "0"
            }),
            DeleteAfter = Duration.Days(30),
            MoveToColdStorageAfter = Duration.Days(7)
        }));

        // Weekly backup rule (long-term retention)
        backupPlan.AddRule(new BackupPlanRule(new BackupPlanRuleProps
        {
            RuleName = "WeeklyBackup",
            ScheduleExpression = Schedule.Cron(new CronOptions
            {
                Hour = "2",
                Minute = "0",
                WeekDay = "SUN"
            }),
            DeleteAfter = Duration.Days(90)
        }));

        // Add DynamoDB tables to backup
        backupPlan.AddSelection("DynamoDBBackup", new BackupSelectionOptions
        {
            Resources = new[]
            {
                BackupResource.FromTag("backup", "true")
            }
        });

        // S3 versioning for flow templates
        var flowTemplateBucket = new Bucket(this, "FlowTemplateBucket", new BucketProps
        {
            Versioned = true,
            LifecycleRules = new[]
            {
                new LifecycleRule
                {
                    NoncurrentVersionExpiration = Duration.Days(90),
                    NoncurrentVersionTransitions = new[]
                    {
                        new NoncurrentVersionTransition
                        {
                            StorageClass = StorageClass.GLACIER,
                            TransitionAfter = Duration.Days(30)
                        }
                    }
                }
            }
        });

        // Cross-region replication for critical data
        var replicationBucket = new Bucket(this, "ReplicationBucket", new BucketProps
        {
            BucketName = "connect-recordings-replica",
            Versioned = true
        });

        var recordingsBucket = Bucket.FromBucketName(this, "RecordingsBucket", "connect-recordings");

        // Note: Actual replication setup requires additional configuration
    }
}
```

### Rollback Script

**scripts/rollback.sh**:
```bash
#!/bin/bash

set -e

ENVIRONMENT=$1
BACKUP_ID=$2

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./rollback.sh <environment> [backup-id]"
    exit 1
fi

echo "Rolling back $ENVIRONMENT environment..."

# If no backup ID provided, use latest
if [ -z "$BACKUP_ID" ]; then
    echo "Finding latest backup..."
    BACKUP_ID=$(aws backup list-recovery-points-by-backup-vault \
        --backup-vault-name connect-backup-vault \
        --query 'RecoveryPoints[0].RecoveryPointArn' \
        --output text)
fi

echo "Using backup: $BACKUP_ID"

# Restore DynamoDB tables
echo "Restoring DynamoDB tables..."
aws backup start-restore-job \
    --recovery-point-arn $BACKUP_ID \
    --metadata file://restore-metadata.json

# Revert flow configurations
echo "Reverting flow configurations..."
aws s3 sync s3://connect-flow-templates-backup/$BACKUP_ID s3://connect-flow-templates

# Redeploy previous CDK stack version
echo "Redeploying previous stack version..."
git checkout $BACKUP_ID
export ASPNETCORE_ENVIRONMENT=$ENVIRONMENT
cdk deploy --all --require-approval never

echo "Rollback complete!"
```

---

## 9. Multi-Region Deployment

### Multi-Region Stack

```csharp
namespace ProductionCallCenter.Stacks;

public class MultiRegionStack : Stack
{
    public MultiRegionStack(Construct scope, string id) : base(scope, id)
    {
        var primaryRegion = "us-east-1";
        var secondaryRegion = "us-west-2";

        // Primary region stack
        var primaryStack = new ConnectStack(this, "PrimaryRegion", new StackProps
        {
            Env = new Amazon.CDK.Environment
            {
                Region = primaryRegion
            }
        });

        // Secondary region stack (disaster recovery)
        var secondaryStack = new ConnectStack(this, "SecondaryRegion", new StackProps
        {
            Env = new Amazon.CDK.Environment
            {
                Region = secondaryRegion
            }
        });

        // Global DynamoDB table with replication
        var globalTable = new GlobalTable(this, "GlobalConfigTable", new GlobalTableProps
        {
            TableName = "connect-global-config",
            PartitionKey = new Attribute
            {
                Name = "pk",
                Type = AttributeType.STRING
            },
            Regions = new[] { primaryRegion, secondaryRegion },
            Stream = StreamViewType.NEW_AND_OLD_IMAGES
        });

        // Route 53 health checks and failover
        var hostedZone = HostedZone.FromLookup(this, "Zone", new HostedZoneProviderProps
        {
            DomainName = "example.com"
        });

        var primaryHealthCheck = new CfnHealthCheck(this, "PrimaryHealthCheck", new CfnHealthCheckProps
        {
            HealthCheckConfig = new CfnHealthCheck.HealthCheckConfigProperty
            {
                Type = "HTTPS",
                ResourcePath = "/health",
                FullyQualifiedDomainName = "connect-primary.example.com",
                RequestInterval = 30,
                FailureThreshold = 3
            }
        });

        // Failover routing policy
        new ARecord(this, "FailoverRecord", new ARecordProps
        {
            Zone = hostedZone,
            RecordName = "connect",
            Target = RecordTarget.FromAlias(new Route53Targets.CloudFrontTarget(/* ... */))
        });
    }
}
```

---

## 10. Complete Example Projects

### Example 1: Enterprise Call Center (New Instance)

Location: `examples/EnterpriseCallCenter/`

**Key Features**:
- Multi-queue setup (Sales, Support, Escalation, VIP)
- Skill-based routing
- Business hours checking
- Customer authentication via Lambda
- Call recording with encryption
- Contact Lens for sentiment analysis
- Full monitoring and alerting
- Multi-environment configuration

### Example 2: Existing Instance Migration

Location: `examples/ExistingInstanceMigration/`

**Key Features**:
- Import existing Connect instance
- Reference existing queues and routing profiles
- Add new flows alongside existing ones
- Gradual migration strategy
- Rollback capabilities
- Parallel testing approach

### Example 3: Multi-Brand Contact Center

Location: `examples/MultiB randCallCenter/`

**Key Features**:
- Multiple brands sharing infrastructure
- Brand-specific routing and flows
- Shared agent pools
- Brand-specific reporting
- Tenant isolation

### Example 4: High-Volume Contact Center

Location: `examples/HighVolumeCallCenter/`

**Key Features**:
- Optimized for >10,000 concurrent calls
- Auto-scaling Lambda functions
- DynamoDB with provisioned capacity
- ElastiCache for caching
- Advanced monitoring and auto-remediation

---

## Summary

This document provides production-ready examples covering:

✅ **New Connect instances** - Greenfield deployments
✅ **Existing Connect instances** - Brownfield migrations
✅ **Multi-environment setup** - Dev, Staging, Production
✅ **CI/CD pipelines** - Automated deployments
✅ **Security best practices** - Encryption, IAM, secrets
✅ **Monitoring** - CloudWatch, alarms, dashboards
✅ **Disaster recovery** - Backups, rollbacks, multi-region
✅ **Real-world configurations** - Production-ready settings

All examples include:
- Complete folder structures
- Configuration files
- Deployment scripts
- Security setup
- Monitoring configuration
- Disaster recovery procedures
