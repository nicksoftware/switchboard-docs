---
layout: home

hero:
  name: Switchboard
  text: Code-First Contact Center Infrastructure
  tagline: Build and manage Amazon Connect with AWS CDK and .NET - No more JSON wrestling
  actions:
    - theme: brand
      text: Get Started in 5 Minutes
      link: /guide/quick-start
    - theme: alt
      text: See Examples
      link: https://nicksoftware.github.io/switchboard-docs/examples/minimal-setup.html
    - theme: alt
      text: Why Switchboard?
      link: #why-i-built-this

features:
  - icon: 🎯
    title: Fluent & Type-Safe
    details: Define flows, queues, and routing with a fluent API. IntelliSense guides you through every step.

  - icon: 🏗️
    title: Infrastructure as Code
    details: Version-controlled, reviewable, testable contact center config. Built on AWS CDK - no manual console clicking.

  - icon: 🔗
    title: Existing Instance Support
    details: Create new Connect instances or manage existing ones. Import your current setup and start adding resources with code.

  - icon: 📦
    title: Simple Installation
    details: "One command: dotnet add package. No framework cloning, no complex setup. Install and start building."

  - icon: 🔌
    title: Lambda Integration
    details: First-class support for Lambda functions in your flows. Build dynamic IVRs with customer lookups and business logic.

  - icon: 🚀
    title: Complete Resource Management
    details: Queues, flows, hours of operation, routing profiles, DynamoDB tables, and Lambda functions - all from code.

  - icon: 🌍
    title: Multi-Language Support
    details: Build contact flows that serve customers in multiple languages with automatic voice selection and translation management.

  - icon: 📚
    title: Architecture Documentation
    details: Deep-dive into design patterns, best practices, and advanced .NET architecture for enterprise deployments.
---

## Quick Example

```csharp
using Switchboard.Infrastructure;

var app = new SwitchboardApp();

// Create a new Connect instance
var callCenter = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Add business hours
var businessHours = HoursOfOperation
    .Create("Business Hours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build(callCenter);

// Add queues
var salesQueue = Queue
    .Create("Sales")
    .SetDescription("Sales inquiries")
    .SetMaxContacts(50)
    .Build(callCenter, businessHours.HoursOfOperation.Name);

// Create a contact flow with IVR menu
Flow
    .Create("Main Menu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our call center!")
    .GetCustomerInput("Press 1 for sales, 2 for support.")
    .OnDigit("1", sales => sales
        .PlayPrompt("Transferring to sales...")
        .TransferToQueue("Sales")
        .Disconnect())
    .OnDigit("2", support => support
        .PlayPrompt("Transferring to support...")
        .TransferToQueue("Support")
        .Disconnect())
    .Disconnect()
    .Build(callCenter);

app.Synth();
```

## Installation

```bash
dotnet add package NickSoftware.Switchboard
npm install -g aws-cdk
```

## Why I Built This

### The Problem

Traditional Amazon Connect development is painful:

- **Massive JSON templates** that are impossible to read or maintain
- **Manual ARN replacement** every time you export/import a flow
- **Zero validation** until deployment—errors only appear after pushing to AWS
- **No meaningful version control**—diffing JSON files with generated IDs is useless
- **Hidden bugs** that are hard to catch before they cause issues

**I'm a developer. I wanted to write code, not wrestle with JSON.**

### The Solution: Code-First Contact Centers

With a code-first approach:

✅ **Code is readable and understandable**—flows look like actual logic, not configuration soup
✅ **Real collaboration**—code reviews, pull requests, team development
✅ **Self-documenting**—the code speaks for itself about what gets created
✅ **Fluent API**—IntelliSense guides you through every configuration option
✅ **Built on CDK**—you still have full power to customize when needed
✅ **Version control that works**—meaningful diffs, rollback capability, audit trail

### For Developers, By a Developer

Switchboard was built to solve **my** problems. Maybe you have the same ones:

- You prefer writing code over clicking through consoles
- You want type safety and IntelliSense support
- You believe infrastructure should be version-controlled
- You think bugs should be caught at compile-time, not runtime
- You need to collaborate with your team effectively

If this resonates with you, **Switchboard is for you.**

---

**Ready to stop wrestling with JSON and start writing code?**

👉 [Get Started in 5 Minutes](/guide/quick-start)

---

## 📚 Documentation

### Getting Started

- [Introduction](/guide/introduction) - Learn the basics
- [Quick Start](/guide/quick-start) - Build your first flow in 5 minutes
- [Installation](/guide/installation) - Package setup and dependencies

### Building Resources

- [Contact Flows](/building/flows) - Create IVR menus and call routing
- [Queues](/building/queues) - Configure agent queues
- [Hours of Operation](/building/hours-of-operation) - Set business hours

### Advanced Topics

- [Multi-Language Support](/guide/flows/multi-language) - Build flows for multiple languages
- [Speech Recognition (ASR)](/guide/flows/speech-recognition) - Conversational IVR with voice input
- [Dynamic Attributes](/guide/flows/dynamic-attributes) - Runtime configuration

### Architecture & Design

- [Project Hub](/00-PROJECT-HUB) - Architecture overview and planning
- [Design Patterns](/02-ARCHITECTURE-PATTERNS) - GOF patterns and system design
- [Flow Blocks Reference](/09-FLOW-BLOCKS-REFERENCE) - Complete flow block documentation
- [Quick Reference](/QUICK-REFERENCE) - Decision summary and cheat sheet
