# Roslyn Analyzers Reference

::: warning PREVIEW RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). Analyzer rules may change before the stable 1.0 release.
:::

Switchboard includes Roslyn analyzers that provide **compile-time validation** of your contact center code. Catch errors during development, not deployment!

## Table of Contents

[[toc]]

## Overview

### What Are Roslyn Analyzers?

Roslyn analyzers are **real-time code validators** that:
- Run continuously in your IDE as you type
- Analyze your code for potential issues
- Provide instant feedback with squiggly underlines
- Offer automatic code fixes (Quick Actions)
- Catch errors before compilation

### Benefits

✅ **Catch Errors Early** - Find issues while coding, not during deployment
✅ **IntelliSense Integration** - See warnings and errors in IDE
✅ **Automatic Fixes** - Many issues can be fixed with one click
✅ **Prevent Runtime Failures** - Ensure flows are valid before they run
✅ **Team Consistency** - Enforce best practices across your team

---

## Installation

```bash
dotnet add package NickSoftware.Switchboard.Analyzers --version 0.1.0-preview.17
```

Analyzers are automatically included when you install the main Switchboard package.

---

## Analyzer Rules

### SWB001: Flow Must Have At Least One Action

**Severity:** Error ⛔

**Category:** Switchboard.Design

**Description:** A flow must contain at least one action to be valid.

**Problem Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("EmptyFlow")
    .Build(); // ❌ SWB001: Flow 'EmptyFlow' must have at least one action
```

**Fixed Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("EmptyFlow")
    .PlayPrompt("Welcome") // ✅ At least one action
    .Build();
```

**Why This Matters:**
An empty flow would cause runtime errors in Amazon Connect. This ensures every flow does something useful.

---

### SWB002: Flow Must End With Terminal Action

**Severity:** Warning ⚠️

**Category:** Switchboard.Design

**Description:** A flow should end with a terminal action (Disconnect or TransferToQueue) to properly terminate the contact.

**Problem Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("IncompleteFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input => input.MaxDigits = 1)
    .Build(); // ⚠️ SWB002: Flow should end with Disconnect() or TransferToQueue()
```

**Fixed Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("CompleteFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input => input.MaxDigits = 1)
    .TransferToQueue("Support") // ✅ Terminal action
    .Build();

// OR

var flow = new FlowBuilder()
    .SetName("CompleteFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input => input.MaxDigits = 1)
    .Disconnect() // ✅ Terminal action
    .Build();
```

**Why This Matters:**
Without a terminal action, callers might be left hanging. Always end flows with a clear termination.

---

### SWB003: Transitions Must Point To Valid Actions

**Severity:** Error ⛔

**Category:** Switchboard.Design

**Description:** Flow transitions must reference actions that exist in the flow.

**Problem Code:**
```csharp
[ContactFlow("BrokenFlow")]
public partial class BrokenFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Branch(AttributeName = "Input")]
    [Case("1", Target = "NonExistentAction")] // ❌ SWB003: Target action not found
    [DefaultCase(Target = "MainMenu")]
    public partial void RouteCall();
}
```

**Fixed Code:**
```csharp
[ContactFlow("FixedFlow")]
public partial class FixedFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Branch(AttributeName = "Input")]
    [Case("1", Target = "HandleSales")] // ✅ Points to existing action
    [DefaultCase(Target = "MainMenu")]
    public partial void RouteCall();

    [Action(Order = 2, Identifier = "HandleSales")] // ✅ Action exists
    [TransferToQueue("Sales")]
    public partial void HandleSales();

    [Action(Order = 3, Identifier = "MainMenu")]
    [Message("Returning to main menu")]
    public partial void MainMenu();
}
```

**Automatic Fix:**
The code fix provider can automatically create a stub for the missing action.

**Why This Matters:**
Broken references cause deployment failures. This ensures all flow paths are valid.

---

### SWB004: Flow Name Must Be Set

**Severity:** Error ⛔

**Category:** Switchboard.Design

**Description:** A flow must have a name set before it can be built.

**Problem Code:**
```csharp
var flow = new FlowBuilder()
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales")
    .Build(); // ❌ SWB004: Flow name must be set using SetName()
```

**Fixed Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("SalesFlow") // ✅ Name set
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales")
    .Build();
```

**Automatic Fix:**
Quick Action: "Add SetName() call" - automatically inserts `.SetName("FlowName")`.

**Why This Matters:**
Flows need names for identification in Amazon Connect. This prevents unnamed flows.

---

### SWB005: Queue Name Cannot Be Empty

**Severity:** Error ⛔

**Category:** Switchboard.Usage

**Description:** Queue name must be a valid, non-empty string.

**Problem Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("TransferFlow")
    .PlayPrompt("Transferring...")
    .TransferToQueue("") // ❌ SWB005: Queue name cannot be empty
    .Build();

// OR

var flow = new FlowBuilder()
    .SetName("TransferFlow")
    .PlayPrompt("Transferring...")
    .TransferToQueue(null) // ❌ SWB005: Queue name cannot be null
    .Build();
```

**Fixed Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("TransferFlow")
    .PlayPrompt("Transferring...")
    .TransferToQueue("Support") // ✅ Valid queue name
    .Build();
```

**Why This Matters:**
Empty queue names cause runtime errors. Ensure valid queue references.

---

### SWB006: Prompt Text Required

**Severity:** Error ⛔

**Category:** Switchboard.Usage

**Description:** Prompt text must be a valid, non-empty string.

**Problem Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("PromptFlow")
    .PlayPrompt("") // ❌ SWB006: Prompt text cannot be empty
    .TransferToQueue("Sales")
    .Build();

// OR

var flow = new FlowBuilder()
    .SetName("PromptFlow")
    .PlayPrompt(null) // ❌ SWB006: Prompt text cannot be null
    .TransferToQueue("Sales")
    .Build();
```

**Fixed Code:**
```csharp
var flow = new FlowBuilder()
    .SetName("PromptFlow")
    .PlayPrompt("Welcome to our service") // ✅ Valid prompt text
    .TransferToQueue("Sales")
    .Build();
```

**Why This Matters:**
Empty prompts confuse callers. Always provide meaningful messages.

---

### SWB007: Lambda Function Name Required

**Severity:** Error ⛔

**Category:** Switchboard.Usage

**Description:** Lambda function name must be specified and non-empty.

**Problem Code:**
```csharp
[Action(Order = 1)]
[InvokeLambda]
[FunctionName("")] // ❌ SWB007: Lambda function name required
public partial Task<LambdaResult> CallLambda();

// OR

[Action(Order = 1)]
[InvokeLambda]
// ❌ SWB007: FunctionName attribute missing
public partial Task<LambdaResult> CallLambda();
```

**Fixed Code:**
```csharp
[Action(Order = 1)]
[InvokeLambda]
[FunctionName("CustomerLookupFunction")] // ✅ Valid function name
public partial Task<LambdaResult> CallLambda();
```

**Why This Matters:**
Lambda invocations need valid function names. This prevents deployment errors.

---

### SWB008: Hours Of Operation Name Required

**Severity:** Error ⛔

**Category:** Switchboard.Usage

**Description:** Hours of operation name must be specified.

**Problem Code:**
```csharp
[Action(Order = 1)]
[CheckHoursOfOperation]
[HoursRef("")] // ❌ SWB008: Hours of operation name required
public partial Task<bool> CheckHours();
```

**Fixed Code:**
```csharp
[Action(Order = 1)]
[CheckHoursOfOperation]
[HoursRef("BusinessHours")] // ✅ Valid hours reference
public partial Task<bool> CheckHours();
```

**Why This Matters:**
Hours checks need valid references. Prevents broken business hours logic.

---

### SWB009: Circular Reference Detected

**Severity:** Error ⛔

**Category:** Switchboard.Design

**Description:** Flow contains circular references that would cause infinite loops.

**Problem Code:**
```csharp
[ContactFlow("CircularFlow")]
public partial class CircularFlow : FlowDefinitionBase
{
    [Action(Order = 1, Identifier = "Action1")]
    [Message("Step 1")]
    [Transition(Target = "Action2")]
    public partial void Step1();

    [Action(Order = 2, Identifier = "Action2")]
    [Message("Step 2")]
    [Transition(Target = "Action1")] // ❌ SWB009: Circular reference detected
    public partial void Step2();
}
```

**Fixed Code:**
```csharp
[ContactFlow("FixedFlow")]
public partial class FixedFlow : FlowDefinitionBase
{
    [Action(Order = 1, Identifier = "Action1")]
    [Message("Step 1")]
    [Transition(Target = "Action2")]
    public partial void Step1();

    [Action(Order = 2, Identifier = "Action2")]
    [Message("Step 2")]
    [TransferToQueue("Support")] // ✅ Terminal action, no circular reference
    public partial void Step2();
}
```

**Why This Matters:**
Circular references create infinite loops, hanging calls. Always have a termination path.

---

### SWB010: Action Identifier Must Be Unique

**Severity:** Error ⛔

**Category:** Switchboard.Design

**Description:** Each action in a flow must have a unique identifier.

**Problem Code:**
```csharp
[ContactFlow("DuplicateFlow")]
public partial class DuplicateFlow : FlowDefinitionBase
{
    [Action(Order = 1, Identifier = "SameId")]
    [Message("First action")]
    public partial void FirstAction();

    [Action(Order = 2, Identifier = "SameId")] // ❌ SWB010: Duplicate identifier
    [Message("Second action")]
    public partial void SecondAction();
}
```

**Fixed Code:**
```csharp
[ContactFlow("FixedFlow")]
public partial class FixedFlow : FlowDefinitionBase
{
    [Action(Order = 1, Identifier = "FirstAction")] // ✅ Unique
    [Message("First action")]
    public partial void FirstAction();

    [Action(Order = 2, Identifier = "SecondAction")] // ✅ Unique
    [Message("Second action")]
    public partial void SecondAction();
}
```

**Automatic Fix:**
Quick Action: "Generate unique identifier" - automatically creates a unique ID.

**Why This Matters:**
Duplicate IDs cause ambiguity in flow execution. Ensure unique identifiers.

---

## Using Analyzers in Your IDE

### Visual Studio

**View Warnings/Errors:**
1. Error List window (View → Error List)
2. Filter by "Switchboard" category
3. Double-click to navigate to issue

**Quick Fixes:**
1. Place cursor on squiggly line
2. Press `Ctrl+.` or click lightbulb
3. Select fix from menu

**Suppress Warnings:**
```csharp
#pragma warning disable SWB002
var flow = new FlowBuilder()
    .SetName("SpecialFlow")
    .PlayPrompt("Message") // Warning suppressed
    .Build();
#pragma warning restore SWB002
```

### Rider

**View Warnings/Errors:**
1. Problems window (View → Tool Windows → Problems)
2. Filter by severity or category
3. Click to navigate

**Quick Fixes:**
1. Place cursor on issue
2. Press `Alt+Enter`
3. Select fix

### VS Code

**View Warnings/Errors:**
1. Problems panel (View → Problems)
2. See inline squiggly lines
3. Click for details

**Quick Fixes:**
1. Click lightbulb icon
2. Select "Quick Fix"
3. Choose appropriate fix

---

## Configuring Analyzers

### Severity Levels

Create `.editorconfig` in your project root:

```ini
# Switchboard Analyzer Configuration

# Make all warnings errors in CI/CD
[*.cs]
dotnet_diagnostic.SWB002.severity = error

# Reduce severity for development
dotnet_diagnostic.SWB009.severity = suggestion

# Disable specific rules
dotnet_diagnostic.SWB010.severity = none
```

### Bulk Suppression

In `.globalconfig`:

```ini
# Suppress SWB002 globally
is_global = true
dotnet_diagnostic.SWB002.severity = none
```

### Per-Project Configuration

In `.csproj`:

```xml
<PropertyGroup>
  <!-- Treat all analyzer warnings as errors -->
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>

  <!-- Exclude specific rules -->
  <NoWarn>SWB002;SWB009</NoWarn>
</PropertyGroup>
```

---

## Code Fix Providers

Many analyzer rules include **automatic code fixes**:

### Available Fixes

| Rule | Fix Description |
|------|----------------|
| SWB001 | Add a basic action (PlayPrompt) |
| SWB002 | Add Disconnect() or TransferToQueue() |
| SWB003 | Create missing target action stub |
| SWB004 | Insert SetName() call |
| SWB005 | Replace with valid queue name placeholder |
| SWB006 | Replace with prompt text placeholder |
| SWB010 | Generate unique identifier |

### Using Code Fixes

**In Visual Studio:**
1. Press `Ctrl+.` on the error
2. Choose "Add terminal action (Disconnect)"
3. Code automatically inserted

**In Rider:**
1. Press `Alt+Enter` on the error
2. Select "Add terminal action"
3. Choose Disconnect or TransferToQueue

**In VS Code:**
1. Click lightbulb icon
2. Select "Quick Fix"
3. Choose the fix

---

## Best Practices

### 1. Enable All Analyzers

Don't disable analyzers unless absolutely necessary. They prevent real problems.

### 2. Fix Warnings Immediately

**Good:**
```csharp
// See warning, fix immediately
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Hello")
    .Disconnect(); // ✅ Fixed warning
```

**Bad:**
```csharp
#pragma warning disable SWB002
// Suppress and forget - might cause runtime issues
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Hello"); // ⚠️ Suppressed warning
#pragma warning restore SWB002
```

### 3. Use Code Fixes

Let the analyzer fix issues for you - it's faster and more accurate.

### 4. Configure for Your Team

Create shared `.editorconfig` for consistent analyzer behavior across your team.

### 5. Treat Warnings as Errors in CI/CD

```xml
<PropertyGroup>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
</PropertyGroup>
```

This prevents broken flows from being deployed.

---

## Troubleshooting

### Analyzer Not Running

**Check:**
1. Package installed: `NickSoftware.Switchboard.Analyzers`
2. Restart IDE
3. Clean and rebuild solution

```bash
dotnet clean
dotnet build
```

### False Positives

**Report them!**
- GitHub Issues: [Report issue](https://github.com/nicksoftware/AmazonConnectBuilderFramework/issues)
- Include code snippet and analyzer rule

### Performance Issues

If analyzers slow down IDE:

```xml
<!-- Disable analyzers in Debug builds -->
<PropertyGroup Condition="'$(Configuration)' == 'Debug'">
  <RunAnalyzersDuringBuild>false</RunAnalyzersDuringBuild>
</PropertyGroup>
```

Re-enable for Release builds and CI/CD.

---

## Complete Example

```csharp
using Switchboard.Attributes;

namespace MyApp.Flows;

// ✅ All analyzer rules satisfied
[ContactFlow("CustomerServiceFlow")]
public partial class CustomerServiceFlow : FlowDefinitionBase
{
    // ✅ SWB004: Flow has name (via ContactFlow attribute)

    [Action(Order = 1, Identifier = "Welcome")] // ✅ SWB010: Unique ID
    [Message("Welcome to customer service")] // ✅ SWB006: Non-empty prompt
    public partial void Welcome();

    [Action(Order = 2, Identifier = "GetInput")] // ✅ SWB010: Unique ID
    [GetCustomerInput]
    [Text("Press 1 for sales, 2 for support")] // ✅ SWB006: Non-empty
    [MaxDigits(1)]
    public partial Task<string> GetInput();

    [Action(Order = 3, Identifier = "RouteCall")] // ✅ SWB010: Unique ID
    [Branch(AttributeName = "CustomerInput")]
    [Case("1", Target = "SalesQueue")] // ✅ SWB003: Valid target
    [Case("2", Target = "SupportQueue")] // ✅ SWB003: Valid target
    [DefaultCase(Target = "DefaultQueue")] // ✅ SWB003: Valid target
    public partial void RouteCall();

    [Action(Order = 4, Identifier = "SalesQueue")] // ✅ SWB010: Unique ID
    [TransferToQueue("Sales")] // ✅ SWB005: Non-empty queue, ✅ SWB002: Terminal action
    public partial void TransferToSales();

    [Action(Order = 5, Identifier = "SupportQueue")] // ✅ SWB010: Unique ID
    [TransferToQueue("Support")] // ✅ SWB005: Non-empty queue, ✅ SWB002: Terminal action
    public partial void TransferToSupport();

    [Action(Order = 6, Identifier = "DefaultQueue")] // ✅ SWB010: Unique ID
    [TransferToQueue("General")] // ✅ SWB005: Non-empty queue, ✅ SWB002: Terminal action
    public partial void TransferToGeneral();

    // ✅ SWB001: Flow has at least one action
    // ✅ SWB009: No circular references
}
```

---

## See Also

- [Attributes Reference](/reference/attributes) - All available attributes
- [Source Generators](/reference/source-generators) - Code generation guide
- [Flow Building](/building/flows) - Complete flow construction guide
- [Examples](/examples/minimal-setup) - Working examples
