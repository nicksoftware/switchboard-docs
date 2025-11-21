# Introduction

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). The API is not yet stable and may change between releases. We welcome feedback and contributions as we work toward a stable 1.0 release.
:::

Switchboard is a code-first, type-safe framework for building and managing Amazon Connect contact centers using AWS CDK and .NET 10.

## What is it?

Instead of clicking through the AWS Console or writing YAML/JSON, you define your contact center infrastructure in **C# code** using **attributes** and **fluent builders**. The framework then:

1. **Generates the implementation** using source generators
2. **Validates at compile-time** using Roslyn analyzers
3. **Deploys via CDK** to your AWS account
4. **Enables runtime updates** through DynamoDB configuration

## Core Philosophy

### Code-First, Not Console-First

```csharp
// ❌ Traditional Approach: Click through console, export JSON
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

// ✅ This Framework: Write C# with attributes
[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow
{
    [Message("Welcome")]
    public partial void Welcome();

    [TransferToQueue("Sales")]
    public partial void Transfer();
}
```

### Type-Safe, Not Error-Prone

The framework uses C#'s type system to catch errors **before deployment**:

```csharp
// ✅ Compile-time error if queue doesn't exist
flow.TransferTo<SalesQueue>();

// ✅ IntelliSense shows available methods
flow.PlayPrompt(...)  // IDE autocomplete works

// ✅ Roslyn analyzer catches issues
[TransferToQueue("NonExistent")]  // Analyzer error: Queue not defined
```

### Declarative, Not Imperative

Tell the framework **what** you want, not **how** to build it:

```csharp
[ContactFlow("CustomerService")]
[Queue("Support", MaxContacts = 50)]
[BusinessHours("9am-5pm", TimeZone = "America/New_York")]
public partial class CustomerServiceFlow
{
    // Framework generates everything automatically
}
```

## Key Features

### 🎯 Attribute-Based Configuration

Define infrastructure using C# attributes:

```csharp
[Queue("VIPSupport")]
[MaxContacts(25)]
[ServiceLevel(Threshold = 20, Target = 0.95)]
[RoutingStrategy(typeof(SkillBasedRouting))]
public class VipQueue : QueueDefinitionBase { }
```

### 🏗️ Fluent Builders

Programmatic alternative with full control:

```csharp
var flow = new FlowBuilder()
    .SetName("SalesFlow")
    .PlayPrompt("Welcome to sales")
    .GetCustomerInput(input => {
        input.Text = "Press 1 for...";
        input.OnDigit("1", "sales-queue");
    })
    .Build();
```

### ⚡ Dynamic Configuration

Update flow behavior at runtime without redeployment:

```csharp
// Store in DynamoDB
await configManager.UpdateFlowParameter(
    flowId: "sales-inbound",
    parameter: "maxQueueTime",
    value: 300
);

// Next call automatically uses new value - no CDK deployment needed
```

### 🔍 Compile-Time Validation

Roslyn analyzers catch errors during development:

```csharp
[TransferToQueue("Sales")]  // ✅ OK - queue exists

[TransferToQueue("Typo")]   // ❌ Analyzer error at compile-time
                            //    "Queue 'Typo' is not defined"
```

### 📦 Source Generators

Write minimal code, framework generates the rest:

```csharp
// You write:
[ContactFlow("Sales")]
public partial class SalesFlow
{
    [Message("Welcome")]
    public partial void Welcome();
}

// Generator creates:
// - Full ContactFlow implementation
// - CDK constructs
// - Validation logic
// - CloudFormation templates
```

### 🧩 Dependency Injection

ASP.NET Core-style DI for clean architecture:

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddFlowDefinitions(typeof(Program).Assembly)
    .AddDynamicConfiguration(config => config.UseDynamoDB())
    .UseMiddleware<LoggingMiddleware>();
```

## Architecture

```
┌─────────────────────────────────────────────┐
│   Your Code (Attributes + Minimal Logic)    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│   Framework (Source Generators + Builders)   │
│   • Generates implementation                 │
│   • Validates flows                          │
│   • Creates CDK constructs                   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│   AWS CDK (Infrastructure as Code)           │
│   • Synthesizes CloudFormation               │
│   • Deploys to AWS                           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│   AWS (Amazon Connect + Supporting Services) │
│   • Connect instance                         │
│   • Queues, flows, routing                   │
│   • Lambda, DynamoDB, S3                     │
└──────────────────────────────────────────────┘
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
var flow = builder
  .SetName("MyFlow")
  .PlayPrompt("Hello")
  .Build();
```

### Why C# Was Chosen

Switchboard uses C# because of unique technical capabilities that other languages don't offer:

**Advanced Language Features:**

- **Source Generators** - Generate code at compile-time from attributes (unique to C#/Roslyn compiler)
- **Roslyn Analyzers** - Custom compiler extensions catch errors during development, not deployment
- **Attributes** - Declarative metadata for clean, expressive configuration
- **Strong Typing** - Catch errors before deployment with compile-time type checking
- **Pattern Matching** - Clean, expressive conditional logic
- **LINQ** - Query and transform data elegantly
- **Async/Await** - First-class asynchronous support for all AWS SDK calls

**Infrastructure-as-Code Benefits:**

- **Type-Safe CloudFormation** - Generate CloudFormation from strongly-typed C# code
- **Refactoring Support** - Rename variables/methods across your entire project with IDE support
- **Compile-Time Validation** - Errors surface before `cdk deploy`, not after
- **Testable Infrastructure** - Unit test your infrastructure code like application code

**Ecosystem Advantages:**

- **AWS CDK Official Support** - First-class AWS CDK library maintained by AWS
- **Cross-Platform** - Runs on Windows, macOS, Linux via .NET
- **Modern Tooling** - Visual Studio, VS Code, Rider provide excellent IDE experiences
- **Built-In Testing** - xUnit, NUnit, MSTest included - no external dependencies needed

**BUT: Your Lambda Functions Can Use Any Runtime**

The framework provisions infrastructure using C#, but your Lambda functions can be written in **any language**:

```csharp
// Framework code (C#)
[ContactFlow("Support")]
public partial class SupportFlow
{
    // Invoke a Python Lambda for ML inference
    [InvokeLambda("arn:aws:lambda:...:sentiment-analysis-python")]
    public partial void AnalyzeSentiment();

    // Invoke a Node.js Lambda for API calls
    [InvokeLambda("arn:aws:lambda:...:crm-lookup-nodejs")]
    public partial void LookupCustomer();

    // Invoke a Go Lambda for high-performance processing
    [InvokeLambda("arn:aws:lambda:...:data-processor-go")]
    public partial void ProcessData();
}
```

✅ JavaScript/TypeScript Lambdas
✅ Python Lambdas
✅ Go Lambdas
✅ Java Lambdas
✅ Rust Lambdas

The framework just invokes Lambda ARNs - runtime doesn't matter. Use the best language for each Lambda's specific task.

## Who Is This For?

### Perfect For:

- **DevOps Engineers** managing Contact Center infrastructure as code (regardless of primary language)
- **JavaScript/TypeScript Developers** - C# syntax is nearly identical to TypeScript
- **Python Developers** - If you know Python, C# basics take a day to learn
- **Java Developers** - C# is similar to modern Java with less boilerplate
- **Go Developers** - C# offers similar performance with more features
- **.NET Developers** - Obviously a great fit
- **Contact Center Teams** wanting version control and CI/CD
- **System Architects** designing scalable contact center solutions
- **Teams migrating** from manual console configuration to IaC

### Not Ideal For:

- Teams requiring **pure** Python/TypeScript for everything (though Lambdas can be any language)
- One-time setups that won't change (console might be faster)
- Teams unwilling to learn any new syntax (even if minimal)

## How It Works

### 1. Define Your Infrastructure

```csharp
[ContactFlow("CustomerSupport")]
public partial class SupportFlow : FlowDefinitionBase
{
    [Message("Welcome to support")]
    public partial void Welcome();

    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

### 2. Framework Generates Code

Source generators create the full implementation at compile-time:

- Flow JSON structure
- CDK constructs
- Validation logic
- Type-safe builders

### 3. Deploy with CDK

```bash
cdk synth  # Generate CloudFormation
cdk deploy # Deploy to AWS
```

### 4. Manage at Runtime

Update configuration in DynamoDB for zero-downtime changes:

```csharp
// Update queue timeout
await config.UpdateAsync("SupportFlow", new
{
    maxQueueTime = 600  // Changed from 300 to 600
});
// Next call uses new value automatically
```

## Comparison with Alternatives

| Approach           | Version Control | Type Safety | Testing      | Runtime Updates      | Learning Curve |
| ------------------ | --------------- | ----------- | ------------ | -------------------- | -------------- |
| **AWS Console**    | ❌ Manual       | ❌ None     | ❌ Manual    | ❌ Requires redeploy | ⭐ Easy        |
| **CloudFormation** | ✅ Git          | ⚠️ Limited  | ⚠️ Difficult | ❌ Requires redeploy | ⭐⭐ Medium    |
| **Terraform**      | ✅ Git          | ⚠️ Limited  | ⚠️ Difficult | ❌ Requires redeploy | ⭐⭐⭐ Hard    |
| **Switchboard**    | ✅ Git          | ✅ Full     | ✅ Easy      | ✅ DynamoDB          | ⭐⭐ Medium    |

## What You Can Build

- ✅ **IVR Systems** - Multi-level menus with intelligent routing
- ✅ **Customer Authentication** - Secure flows with Lambda integration
- ✅ **Multi-Language Support** - Route based on language selection
- ✅ **Business Hours Routing** - Different flows for hours/after-hours
- ✅ **Callback Flows** - Queue callbacks, scheduled callbacks
- ✅ **Voicemail Systems** - Record and route messages
- ✅ **Agent Assist** - Screen pops, whisper coaching
- ✅ **Complex Routing** - Skills-based, VIP, geographic routing

## Example: Before and After

### Before (Console/CloudFormation)

1. ✏️ Design flow in Connect Console
2. 💾 Export flow as JSON
3. 📋 Copy JSON to CloudFormation
4. 🔧 Manually wire up queues, ARNs
5. ✅ Deploy via CloudFormation
6. 🐛 Debug JSON syntax errors
7. 🔁 Repeat for each change

**Result**: Time-consuming, error-prone, hard to test

### After (This Framework)

1. 💻 Write C# with attributes
2. ✅ Compile (catches errors immediately)
3. 🚀 `cdk deploy`

**Result**: Fast, type-safe, testable

## Next Steps

Ready to get started?

1. **[Quick Start](/guide/quick-start)** - Build your first flow in 5 minutes
2. **[Minimal Examples](/examples/minimal-setup)** - Simple, focused examples
3. **[Framework Patterns](/guide/patterns)** - Understand the framework patterns
4. **[Enterprise Examples](/examples/enterprise-attributes)** - Production-ready setups

## Get Help

- 📖 **Documentation**: You're reading it!
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nicksoftware/AmazonConnectBuilderFramework/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/nicksoftware/AmazonConnectBuilderFramework/issues)
- 📧 **Email**: nicolusmaluleke@gmail.com
