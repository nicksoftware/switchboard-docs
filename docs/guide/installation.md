# Installation

::: warning PREVIEW RELEASE
Switchboard is currently in **preview** (v0.1.0-alpha.1). The installation process may change before the stable 1.0 release.
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

## Installation Methods

Choose the method that best fits your needs:

| Method                                                       | Best For                        |
| ------------------------------------------------------------ | ------------------------------- |
| [Project Templates](#option-1-project-templates-recommended) | New projects, fastest setup     |
| [Manual Installation](#option-2-manual-installation)         | Existing projects, custom setup |

---

## Option 1: Project Templates (Recommended)

The easiest way to get started is with our `dotnet new` templates:

### Install Templates

```bash
dotnet new install NickSoftware.Switchboard.Templates
```

### Available Templates

We provide two templates for different use cases:

| Template                | Short Name            | Description                             |
| ----------------------- | --------------------- | --------------------------------------- |
| **Switchboard Minimal** | `switchboard-minimal` | Single-file setup, perfect for learning |
| **Switchboard Starter** | `switchboard`         | Multi-file organization for production  |

### Minimal Template

Everything in one `Program.cs` - explicit, simple code:

```bash
dotnet new switchboard-minimal -n MyContactCenter
```

**Project structure:**

```
MyContactCenter/
├── Program.cs           # All code here - flows, resources, stack
├── GlobalUsings.cs      # Common using statements
├── appsettings.json     # Configuration
├── cdk.json             # CDK config
└── MyContactCenter.csproj
```

### Starter Template

Organized multi-file structure with assembly scanning:

```bash
dotnet new switchboard -n MyContactCenter
```

**Project structure:**

```
MyContactCenter/
├── Program.cs
├── Configuration/
│   ├── Queues.cs           # Type-safe queue constants
│   ├── FlowLabels.cs       # Flow label constants
│   └── ResourceKeys.cs     # Resource key constants
├── Resources/
│   ├── HoursProvider.cs    # IHoursOfOperationProvider
│   └── QueuesProvider.cs   # IQueueProvider
├── Flows/
│   └── MainMenuFlow.cs     # IDiscoverableFlowBuilder
├── appsettings.json
├── cdk.json
└── MyContactCenter.csproj
```

### Template Parameters

Both templates support these options:

| Parameter          | CLI Flag                | Default               | Description                   |
| ------------------ | ----------------------- | --------------------- | ----------------------------- |
| Framework          | `-f`                    | `net10.0`             | Target .NET framework         |
| InstanceAlias      | `--instance-alias`      | `my-connect-instance` | Amazon Connect instance alias |
| Region             | `--region`              | `us-east-1`           | AWS region for deployment     |
| SwitchboardVersion | `--switchboard-version` | `0.1.0-alpha.1`       | Switchboard package version   |

### Usage Examples

```bash
# Create minimal project with defaults
dotnet new switchboard-minimal -n MyProject

# Create starter project with custom options
dotnet new switchboard -n MyProject \
  --instance-alias my-instance \
  --region us-west-2 \
  --framework net9.0

# View all options for a template
dotnet new switchboard-minimal --help
dotnet new switchboard --help
```

### Manage Templates

```bash
# List installed Switchboard templates
dotnet new list switchboard

# Update templates to latest version
dotnet new install NickSoftware.Switchboard.Templates

# Uninstall templates
dotnet new uninstall NickSoftware.Switchboard.Templates
```

### Deploy

```bash
cd MyContactCenter
cdk bootstrap    # First time only
cdk deploy
```

::: tip Which Template Should I Use?

- **New to Switchboard?** Start with `switchboard-minimal` to learn the basics
- **Building for production?** Use `switchboard` for organized, maintainable code
  :::

---

## Option 2: Manual Installation

Use this method if you have an existing project or want more control over setup.

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
# Install the framework
dotnet add package NickSoftware.Switchboard
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
using Switchboard.Core;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

// Create a new Connect instance
var stack = app.CreateCallCenter("TestCallCenter", "test-call-center");

// Add a simple queue
var queue = Queue.Create("TestQueue")
    .SetDescription("Test queue")
    .Build();
stack.AddQueue(queue, "24x7");

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

::: info FUTURE FEATURE
The source generators and analyzers packages are planned for a future release. They will provide:

- Attribute-based flow definitions
- Compile-time validation of flows and queue references
  :::

<!--
### Source Generators Package (Coming Soon)

For advanced attribute-based code generation:

```bash
dotnet add package NickSoftware.Switchboard.SourceGenerators
```

### Analyzers Package (Coming Soon)

For compile-time validation:

```bash
dotnet add package NickSoftware.Switchboard.Analyzers
```
-->

## Upgrading

To upgrade to a newer version:

```bash
# Update to latest version
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

- 🐛 **Issues**: [GitHub Issues](https://github.com/nicksoftware/switchboard-docs/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nicksoftware/switchboard-docs/discussions)
- 📧 **Email**: nicolas@nicksoftware.co.za
