# Introduction

::: warning PREVIEW RELEASE
Switchboard is currently in **preview**. The API may change between releases as we work toward a stable 1.0 release. We welcome your feedback and contributions!
:::

Switchboard is a **code-first framework** for building Amazon Connect contact centers using **C#** and **AWS CDK**.

## What is Switchboard?

Instead of clicking through the AWS Console or writing complex JSON, you define your contact center in **C# code**. The framework handles the rest - generating the necessary AWS resources and deploying them to your account.

### Simple Example

```csharp
using Switchboard;

var app = new App();
var stack = new SwitchboardStack(app, "MyCallCenter");

// Create a simple inbound flow
stack.CreateFlow("CustomerService")
    .PlayPrompt("Welcome to customer service")
    .GetCustomerInput("Press 1 for sales, 2 for support")
        .OnDigit("1", sales => sales.TransferToQueue("Sales"))
        .OnDigit("2", support => support.TransferToQueue("Support"))
        .OnTimeout(timeout => timeout.PlayPrompt("No input received").Disconnect())
    .Build();

app.Synth();
```

That's it! This creates a working contact flow with an IVR menu.

## Why Use Switchboard?

### 🚀 **Faster Development**
Write contact flows in C# instead of clicking through the AWS Console. Your IDE helps you with autocomplete, refactoring, and navigation.

### 🔒 **Type-Safe**
Catch errors at build time, not when customers call. The compiler ensures queues, flows, and resources exist before deployment.

### 📦 **Infrastructure as Code**
Your entire contact center is defined in code - version controlled, reviewable, and reproducible.

### ⚡ **AWS CDK Integration**
Leverages AWS CDK for deployment. Works alongside your existing CDK stacks and follows AWS best practices.

### 🔄 **Dynamic Configuration**
Update flow behavior at runtime without redeploying infrastructure. Perfect for business hours, prompts, and routing rules that change frequently.

## Core Concepts

### Fluent API

Switchboard provides a fluent, chainable API for building contact flows:

```csharp
flow.PlayPrompt("Hello")
    .GetCustomerInput("Enter account number")
    .OnDigit("1", digit => {
        digit.PlayPrompt("You pressed 1")
             .Disconnect();
    })
    .Build();
```

### Building Blocks

The framework provides high-level building blocks:

- **Flows**: Customer journeys through your contact center
- **Queues**: Where customers wait for agents
- **Routing Profiles**: How calls are distributed to agents
- **Hours of Operation**: When your contact center is open
- **Users**: Agents who handle customer contacts

### AWS CDK Foundation

Under the hood, Switchboard uses AWS CDK to:
- Create Amazon Connect instances
- Deploy contact flows
- Configure queues and routing
- Set up IAM permissions
- Provision supporting resources

You don't need to know CDK internals - the framework handles that for you.

## What You Can Build

- **IVR Menus**: Multi-level phone menus with digit and speech input
- **Call Routing**: Route calls based on customer input, time of day, or business logic
- **Queue Management**: Configure queues, priorities, and routing profiles
- **Multi-Language Support**: Serve customers in multiple languages
- **Authentication Flows**: Verify callers before routing
- **Callback Systems**: Offer callbacks instead of holding

## Next Steps

- [Quick Start](/guide/quick-start) - Get started in 5 minutes
- [Installation](/guide/installation) - Set up your development environment
- [Building Flows](/guide/flows/basics) - Learn the fluent API
- [Examples](/examples/minimal-setup) - See complete examples

## Getting Help

- **Documentation**: You're reading it!
- **GitHub Issues**: [Report bugs or request features](https://github.com/nicksoftware/switchboard/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/nicksoftware/switchboard-docs/discussions)

---

Ready to build your contact center? Start with the [Quick Start guide](/guide/quick-start)!
