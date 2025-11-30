# Introduction

Switchboard is a code-first, type-safe framework for building and managing Amazon Connect contact centers using AWS CDK and .NET 10.

## What is it?

Instead of clicking through the AWS Console or writing YAML/JSON, you define your contact center infrastructure in **C# code** using a **fluent API**. The framework then:

1. **Provides type-safe builders** for all Connect resources
2. **Deploys via CDK** to your AWS account
3. **Manages existing instances** or creates new ones

## Core Philosophy

### Code-First, Not Console-First

```csharp
// Traditional Approach: Click through console, export JSON
{
  "Version": "2019-10-30",
  "StartAction": "abc-123",
  "Actions": [
    {
      "Identifier": "abc-123",
      "Type": "MessageParticipant",
      "Parameters": { "Text": "Welcome" },
      "Transitions": { "NextAction": "def-456" }
    }
    // ... hundreds of lines of JSON
  ]
}

// This Framework: Write C# with a fluent API
var flow = Flow.Create("WelcomeFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales")
    .Disconnect()
    .Build();

stack.AddFlow(flow);
```

### Fluent and Readable

The framework uses a fluent API that guides you through configuration:

```csharp
// IntelliSense shows available methods at each step
var queue = Queue.Create("Sales")
    .SetDescription("Sales inquiries")
    .SetMaxContacts(50)
    .AddTag("Department", "Sales")
    .Build();

stack.AddQueue(queue, "BusinessHours");
```

### Declarative, Not Imperative

Tell the framework **what** you want, not **how** to build it:

```csharp
var stack = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Add hours of operation
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();

stack.AddHoursOfOperation(hours);

// Framework generates everything automatically
```

## Key Features

### Fluent API

Define all resources with intuitive, chainable methods:

```csharp
// Create a queue
var salesQueue = Queue.Create("VIPSupport")
    .SetDescription("VIP customer support")
    .SetMaxContacts(25)
    .AddTag("Priority", "High")
    .Build();

var queueConstruct = stack.AddQueue(salesQueue, "BusinessHours");

// Create a routing profile (routing profiles are configured separately)
```

### Contact Flow Builder

Build IVR flows with branching, menus, and Lambda integration:

```csharp
var flow = Flow.Create("SalesFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to sales")
    .GetCustomerInput("Press 1 for orders, 2 for support.", input =>
    {
        input.TimeoutSeconds = 5;
    })
    .OnPressed("1", orders => orders
        .TransferToQueue("Orders"))
    .OnPressed("2", support => support
        .TransferToQueue("Support"))
    .OnTimeout(timeout => timeout
        .PlayPrompt("No input received.")
        .Disconnect())
    .OnError(error => error.Disconnect())
    .OnDefault(def => def.Disconnect())
    .Build();

stack.AddFlow(flow);
```

### Lambda Integration

First-class support for Lambda functions in your flows:

```csharp
// Create a Lambda function (using CDK constructs)
// Note: Lambda creation is outside Switchboard scope - use AWS CDK directly
// var validateLambda = new Function(stack, "ValidateAccount", ...);

// Use Lambda in a flow
var flow = Flow.Create("AuthFlow")
    .InvokeLambda("arn:aws:lambda:us-east-1:123456789012:function:validate-account", "validate-account")
    .OnSuccess(success => success.TransferToQueue("Support"))
    .OnError(error => error.Disconnect())
    .Build();

stack.AddFlow(flow);
```

### Existing Instance Support

Work with existing Amazon Connect instances without creating new ones:

```csharp
// Use an existing Connect instance by ARN
var stack = app.UseExistingCallCenter(
    "MyStack",
    "arn:aws:connect:us-east-1:123456789012:instance/abc-123",
    "my-existing-call-center"
);

// Add new resources to your existing instance
var queue = Queue.Create("NewQueue")
    .Build();

stack.AddQueue(queue, "BusinessHours");
```

### Fluent API

Add all resources using the fluent API:

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
    .Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = Queue.Create("Support")
    .SetDescription("Customer support")
    .Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add flow
var flow = Flow.Create("MainMenu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome!")
    .TransferToQueue("Sales")
    .Disconnect()
    .Build();
stack.AddFlow(flow);
```

## Architecture

```
+---------------------------------------------+
|   Your Code (Fluent API)                    |
+---------------------+-----------------------+
                      |
+---------------------v-----------------------+
|   Framework (Builders + CDK Constructs)     |
|   - Type-safe configuration                 |
|   - Flow JSON generation                    |
|   - CDK construct wrappers                  |
+---------------------+-----------------------+
                      |
+---------------------v-----------------------+
|   AWS CDK (Infrastructure as Code)          |
|   - Synthesizes CloudFormation              |
|   - Deploys to AWS                          |
+---------------------+-----------------------+
                      |
+---------------------v-----------------------+
|   AWS (Amazon Connect + Supporting Services)|
|   - Connect instance                        |
|   - Queues, flows, routing                  |
|   - Lambda, DynamoDB, S3                    |
+---------------------------------------------+
```

## Why C# for This Framework?

### Coming from JavaScript, Python, Java, or Go?

**You're welcome here!** If you know any C-family language (JavaScript, TypeScript, Java, C++, Go), you already know 80% of C# syntax. The learning curve is gentle, and the framework is designed to be self-explanatory with IntelliSense guiding you every step of the way.

**You don't need to be a .NET expert** to use Switchboard. If you can read this:

```javascript
// JavaScript
const flow = builder.setName("MyFlow").PlayPrompt("Hello").build();
```

You can read this:

```csharp
// C# - nearly identical!
var flow = Flow.Create("MyFlow")
    .PlayPrompt("Hello")
    .Disconnect()
    .Build();
```

### Why C# Was Chosen

Switchboard uses C# because of unique technical capabilities:

**Language Features:**

- **Strong Typing** - Catch errors before deployment with compile-time type checking
- **Fluent API** - IntelliSense guides you through configuration options
- **Pattern Matching** - Clean, expressive conditional logic
- **LINQ** - Query and transform data elegantly
- **Async/Await** - First-class asynchronous support for all AWS SDK calls

**Infrastructure-as-Code Benefits:**

- **Type-Safe CloudFormation** - Generate CloudFormation from strongly-typed C# code
- **Refactoring Support** - Rename variables/methods across your entire project with IDE support
- **Testable Infrastructure** - Unit test your infrastructure code like application code

**Ecosystem Advantages:**

- **AWS CDK Official Support** - First-class AWS CDK library maintained by AWS
- **Cross-Platform** - Runs on Windows, macOS, Linux via .NET
- **Modern Tooling** - Visual Studio, VS Code, Rider provide excellent IDE experiences

**BUT: Your Lambda Functions Can Use Any Runtime**

The framework provisions infrastructure using C#, but your Lambda functions can be written in **any language**:

```csharp
// Framework code (C#)
var flow = Flow.Create("Support")
    .SetType(FlowType.ContactFlow)
    // Invoke a Python Lambda for ML inference
    .InvokeLambda("arn:aws:lambda:...:sentiment-analysis-python", "sentiment-analysis")
    .OnSuccess(success => success
        // Invoke a Node.js Lambda for API calls
        .InvokeLambda("arn:aws:lambda:...:crm-lookup-nodejs", "crm-lookup")
        .OnSuccess(s => s.TransferToQueue("Support"))
        .OnError(e => e.Disconnect()))
    .OnError(error => error.Disconnect())
    .Build();

stack.AddFlow(flow);
```

The framework just invokes Lambda ARNs - runtime doesn't matter.

## Who Is This For?

### Perfect For:

- **DevOps Engineers** managing Contact Center infrastructure as code
- **JavaScript/TypeScript Developers** - C# syntax is nearly identical to TypeScript
- **Python Developers** - If you know Python, C# basics take a day to learn
- **Java Developers** - C# is similar to modern Java with less boilerplate
- **.NET Developers** - Obviously a great fit
- **Contact Center Teams** wanting version control and CI/CD
- **Teams migrating** from manual console configuration to IaC

### Not Ideal For:

- One-time setups that won't change (console might be faster)
- Teams unwilling to learn any new syntax (even if minimal)

## How It Works

### 1. Define Your Infrastructure

```csharp
var app = new SwitchboardApp();
var stack = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Add hours of operation
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Add a queue
var queue = Queue.Create("Support")
    .SetDescription("Customer support")
    .Build();
stack.AddQueue(queue, "BusinessHours");

// Add a flow
var flow = Flow.Create("WelcomeFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to support")
    .TransferToQueue("Support")
    .Disconnect()
    .Build();
stack.AddFlow(flow);

app.Synth();
```

### 2. Deploy with CDK

```bash
cdk synth  # Generate CloudFormation
cdk deploy # Deploy to AWS
```

### 3. Resources Created

The framework automatically creates:

- Amazon Connect instance (or uses existing)
- Queues with hours of operation
- Contact flows with proper action structure
- IAM roles and permissions
- CloudWatch logs

## What You Can Build

- **IVR Systems** - Multi-level menus with intelligent routing
- **Customer Authentication** - Secure flows with Lambda integration
- **Multi-Language Support** - Route based on language selection
- **Business Hours Routing** - Different flows for hours/after-hours
- **Complex Routing** - Skills-based, VIP, geographic routing

## Next Steps

Ready to get started?

1. **[Quick Start](/guide/quick-start)** - Build your first flow in 5 minutes
2. **[Minimal Examples](https://nicksoftware.github.io/switchboard-docs/examples/minimal-setup.html)** - Simple, focused examples
3. **[Framework Patterns](/guide/patterns)** - Understand the framework patterns

## Future Features

The following features are planned for future releases:

- **Attribute-Based Configuration** - Define flows using C# attributes
- **Source Generators** - Generate implementation code at compile-time
- **Roslyn Analyzers** - Compile-time validation of flows and queue references
- **Dynamic Configuration** - Update flow behavior at runtime via DynamoDB

## Get Help

- **Documentation**: You're reading it!
- **Discussions**: [GitHub Discussions](https://github.com/nicksoftware/switchboard-docs/discussions)
- **Issues**: [GitHub Issues](https://github.com/nicksoftware/switchboard-docs/issues)
