# Quick Start

Get up and running with Switchboard in 5 minutes.

## Prerequisites

- **.NET 10 SDK** or later
- **Node.js** 20+ (for AWS CDK)
- **AWS Account** with appropriate permissions
- **AWS CLI** configured with credentials

## Option 1: Using Project Templates (Recommended)

The fastest way to get started is with our project templates:

```bash
# Install templates from NuGet
dotnet new install NickSoftware.Switchboard.Templates

# List available templates
dotnet new list switchboard
```

### Choose Your Template

We offer two templates to match your needs:

| Template    | Command                          | Best For                                     |
| ----------- | -------------------------------- | -------------------------------------------- |
| **Minimal** | `dotnet new switchboard-minimal` | Learning, simple projects, single-file setup |
| **Starter** | `dotnet new switchboard`         | Production projects, multi-file organization |

### Minimal Template (Single File)

Everything in one `Program.cs` - perfect for learning or simple projects:

```bash
# Create minimal project
dotnet new switchboard-minimal -n MyContactCenter

# Deploy
cd MyContactCenter
cdk bootstrap    # First time only
cdk deploy
```

**What you get:**

- Single `Program.cs` with direct flow/resource creation
- No assembly scanning - explicit, simple code
- Uses `ExistingConnectStack.FromArn()` helper
- Minimal files: `Program.cs`, `GlobalUsings.cs`, `appsettings.json`, `cdk.json`

### Starter Template (Multi-File)

Organized project structure matching production patterns:

```bash
# Create full starter project
dotnet new switchboard -n MyContactCenter

# Deploy
cd MyContactCenter
cdk bootstrap    # First time only
cdk deploy
```

**What you get:**

- Organized folders: `Configuration/`, `Resources/`, `Flows/`
- Assembly scanning pattern for auto-discovery
- Type-safe constants (`Queues`, `FlowLabels`, `ResourceKeys`)
- Resource providers implementing interfaces (`IHoursOfOperationProvider`, etc.)
- Flow builders implementing `IDiscoverableFlowBuilder`

### Template Options

Both templates support these options:

```bash
# Create with custom settings
dotnet new switchboard -n MyContactCenter \
  --instance-alias my-instance \
  --region us-west-2 \
  --framework net9.0
```

| Parameter          | CLI Flag                | Default               | Description            |
| ------------------ | ----------------------- | --------------------- | ---------------------- |
| Framework          | `-f`                    | `net10.0`             | Target framework       |
| InstanceAlias      | `--instance-alias`      | `my-connect-instance` | Connect instance alias |
| Region             | `--region`              | `us-east-1`           | AWS region             |
| SwitchboardVersion | `--switchboard-version` | `0.1.0-alpha.1`       | Package version        |

::: tip View Template Help

```bash
dotnet new switchboard-minimal --help
dotnet new switchboard --help
```

:::

---

## Option 2: Manual Installation

### 1. Create a New Project

```bash
mkdir MyConnectApp
cd MyConnectApp
dotnet new console -n MyConnectApp -f net10.0
```

### 2. Install the Framework

```bash
# Install the framework package
dotnet add package NickSoftware.Switchboard

# Install AWS CDK CLI globally
npm install -g aws-cdk
```

### 3. Create Your First Contact Center

Replace `Program.cs` with:

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

// Create a new Connect instance
var stack = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Add business hours
var businessHours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(businessHours);

// Add a queue
var supportQueue = Queue.Create("Support")
    .SetDescription("Customer support queue")
    .SetMaxContacts(100)
    .Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add a simple contact flow
var flow = Flow.Create("WelcomeFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our call center!")
    .TransferToQueue("Support")
    .Disconnect()
    .Build();
stack.AddFlow(flow);

app.Synth();
```

### 4. Create cdk.json

```json
{
  "app": "dotnet run",
  "context": {
    "@aws-cdk/core:checkSecretUsage": true
  }
}
```

### 5. Deploy

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

- Amazon Connect instance
- Support queue with business hours
- Contact flow with welcome message and routing
- IAM roles and permissions
- CloudWatch logs

## Using an Existing Connect Instance

If you already have a Connect instance:

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

// Use existing Connect instance
var stack = app.UseExistingCallCenter(
    "MyStack",
    "arn:aws:connect:us-east-1:123456789012:instance/abc-123",
    "my-call-center"  // optional alias
);

// Add resources to existing instance
var queue = Queue.Create("Sales")
    .SetMaxContacts(50)
    .Build();
stack.AddQueue(queue, "BusinessHours");

app.Synth();
```

## Fluent API

You can also use the fluent API for all resources:

```csharp
var app = new SwitchboardApp();
var stack = app.CreateCallCenter("MyStack", "my-call-center");

// Add hours of operation
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Add queues
var salesQueue = Queue.Create("Sales")
    .SetDescription("Sales inquiries")
    .SetMaxContacts(50)
    .Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = Queue.Create("Support")
    .SetDescription("Customer support")
    .SetMaxContacts(100)
    .Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add flow with GetCustomerInput
var flow = Flow.Create("MainMenu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome!")
    .GetCustomerInput("Press 1 for sales, 2 for support")
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    .OnTimeout(t => t.Disconnect())
    .OnError(e => e.Disconnect())
    .OnDefault(d => d.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

## Next Steps

- [Building Queues](/building/queues) - Learn about queue configuration
- [Building Flows](/building/flows) - Create IVR menus and routing
- [View more examples](https://nicksoftware.github.io/switchboard-docs/examples/minimal-setup.html) - Complete working examples

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
- Lambda (if using Lambda functions)
- DynamoDB (if using DynamoDB tables)
