# Installation

::: warning PREVIEW RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). The installation process may change before the stable 1.0 release.
:::

## Prerequisites

Before installing Switchboard, ensure you have:

### Required
- **.NET 10 SDK** or later ([Download](https://dotnet.microsoft.com/download))
- **Node.js 20+** (for AWS CDK CLI) ([Download](https://nodejs.org/))
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials ([Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))

### Verify Prerequisites

```bash
# Check .NET version
dotnet --version
# Should output: 10.0.0 or higher

# Check Node.js version
node --version
# Should output: v20.0.0 or higher

# Verify AWS credentials
aws sts get-caller-identity
# Should output your AWS account details
```

## Installation Steps

### 1. Create Your Project

```bash
# Create a new directory for your project
mkdir MyContactCenter
cd MyContactCenter

# Create a new .NET console application
dotnet new console -n MyContactCenter -f net10.0
cd MyContactCenter
```

### 2. Install Switchboard Framework

```bash
# Install the preview version
dotnet add package NickSoftware.Switchboard --version 0.1.0-preview.17
```

### 3. Install AWS CDK CLI

The AWS CDK CLI is required to deploy your infrastructure:

```bash
# Install globally via npm
npm install -g aws-cdk

# Verify installation
cdk --version
```

### 4. Bootstrap AWS CDK (First Time Only)

If this is your first time using AWS CDK in your AWS account/region:

```bash
# Bootstrap CDK in your default region
cdk bootstrap

# Or specify account and region
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### 5. Create CDK Configuration

Create a `cdk.json` file in your project root:

```json
{
  "app": "dotnet run",
  "context": {
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true
  }
}
```

## Verify Installation

Create a simple test file to verify everything is working:

**Program.cs**:
```csharp
using Amazon.CDK;
using Microsoft.Extensions.Hosting;
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "TestCallCenter";
    options.Region = "us-east-1";
});

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

Test the setup:

```bash
# Synthesize CloudFormation template
cdk synth

# If successful, you should see CloudFormation YAML output
```

## AWS Permissions Required

Your AWS user/role needs these permissions:

- **Amazon Connect**: Full access or custom permissions to create instances, flows, queues
- **IAM**: Create and manage roles
- **Lambda**: Create and manage functions (if using dynamic configuration)
- **DynamoDB**: Create and manage tables (if using dynamic configuration)
- **CloudFormation**: Deploy stacks
- **S3**: Access to CDK bootstrap bucket

### Example IAM Policy

For development/testing, you can use these managed policies:
- `AmazonConnectFullAccess`
- `IAMFullAccess`
- `AWSCloudFormationFullAccess`

For production, use a least-privilege custom policy.

## Optional Dependencies

### Source Generators Package

For advanced attribute-based code generation:

```bash
dotnet add package NickSoftware.Switchboard.SourceGenerators --version 0.1.0-preview.17
```

### Analyzers Package

For compile-time validation:

```bash
dotnet add package NickSoftware.Switchboard.Analyzers --version 0.1.0-preview.17
```

## Upgrading

To upgrade to a newer version:

```bash
# Update to specific version
dotnet add package NickSoftware.Switchboard --version 0.1.0-preview.17

# Or update to latest
dotnet add package NickSoftware.Switchboard
```

## Troubleshooting

### "dotnet: command not found"

Install the .NET SDK from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)

### "cdk: command not found"

Install the AWS CDK CLI:
```bash
npm install -g aws-cdk
```

### "Unable to resolve service 'ISwitchboardApp'"

Make sure you've called `AddSwitchboard()` in your service configuration.

### CDK Bootstrap Errors

Ensure your AWS credentials have CloudFormation and S3 permissions:
```bash
aws sts get-caller-identity
```

### Package Not Found

The alpha packages are published to NuGet.org. Ensure you have internet connectivity and try:
```bash
dotnet nuget locals all --clear
dotnet restore
```

## Next Steps

- **[Quick Start Guide](/guide/quick-start)** - Build your first contact center
- **[Minimal Examples](/examples/minimal-setup)** - 8 simple examples
- **[Framework Patterns](/guide/patterns)** - Learn usage patterns

## Getting Help

- 🐛 **Issues**: [GitHub Issues](https://github.com/nicksoftware/AmazonConnectBuilderFramework/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nicksoftware/AmazonConnectBuilderFramework/discussions)
- 📧 **Email**: nicolusmaluleke@gmail.com
