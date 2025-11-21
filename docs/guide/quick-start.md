# Quick Start

::: warning PREVIEW RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). The API may change before the stable 1.0 release.
:::

Get up and running with Switchboard in 5 minutes.

## Prerequisites

- **.NET 10 SDK** or later
- **Node.js** 20+ (for AWS CDK)
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials

## Installation

### 1. Create a New Project

```bash
mkdir MyConnectApp
cd MyConnectApp
dotnet new console -n MyConnectApp -f net10.0
```

### 2. Install the Framework

```bash
# Install the framework package (preview version)
dotnet add package NickSoftware.Switchboard --version 0.1.0-preview.17

# Install AWS CDK CLI globally
npm install -g aws-cdk
```

### 3. Create Your First Flow

Create `SalesFlow.cs`:

```csharp
using Switchboard;
using Switchboard.Attributes;

namespace MyConnectApp;

[ContactFlow("SalesInbound")]
public partial class SalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to our sales team")]
    public partial void Welcome();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Text("For new customers, press 1. For existing, press 2.")]
    [MaxDigits(1)]
    public partial Task<string> GetCustomerType();

    [Action(Order = 3)]
    [TransferToQueue("Sales")]
    public partial void TransferToSales();
}
```

### 4. Configure Your CDK App

Update `Program.cs`:

```csharp
using Amazon.CDK;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

// Configure Switchboard 
builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();

// Create CDK app from DI container
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

### 5. Create cdk.json

```json
{
  "app": "dotnet run",
  "context": {
    "@aws-cdk/core:checkSecretUsage": true
  }
}
```

### 6. Deploy

```bash
# Bootstrap AWS account (first time only)
cdk bootstrap

# Synthesize CloudFormation
cdk synth

# Deploy to AWS
cdk deploy
```

## What You Just Created

The framework automatically created:

- ✅ Amazon Connect instance
- ✅ Sales queue
- ✅ Contact flow with welcome message and routing
- ✅ IAM roles and permissions
- ✅ CloudWatch logs

## Next Steps

- [Learn about patterns](/guide/patterns) - Understand declarative flow definition and usage patterns
- [View more examples](/examples/minimal-setup) - Complete working examples
- [Enterprise examples](/examples/enterprise-attributes) - Production-ready setups

## Troubleshooting

### CDK Bootstrap Failed

Make sure AWS credentials are configured:

```bash
aws configure
aws sts get-caller-identity
```

### Build Errors

Ensure .NET 10 SDK is installed:

```bash
dotnet --version  # Should be 10.0 or higher
```

### Deployment Errors

Check IAM permissions. Your user/role needs permissions for:
- CloudFormation
- Amazon Connect
- IAM role creation
- Lambda (if using dynamic config)
- DynamoDB (if using dynamic config)
