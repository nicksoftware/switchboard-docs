# Flow Validation

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard automatically validates your contact flows at build time to ensure they're correct before deployment. This guide explains how validation works and how to fix common validation errors.

## Automatic Validation

When you build your flows using the fluent API, Switchboard runs validators automatically before generating the AWS CDK infrastructure. This catches errors early, before deployment.

```
┌─────────────────────────────────────────┐
│   Build-Time (CDK Synthesis)             │
│   • Flow structure valid                 │
│   • Terminal actions present             │
│   • All transitions valid                │
│   • No orphaned actions                  │
│   • Identifiers unique                   │
└──────────────────────────────────────────┘
```

**Zero configuration needed** - validation runs automatically when you call `.Build()`.

## Built-In Validators

Switchboard includes several validators that run automatically in a specific order:

### 1. Empty Flow Validator
**Checks:** Flow has at least one action

```csharp
// ❌ ERROR: Flow has no actions
var flow = new FlowBuilder()
    .SetName("EmptyFlow")
    .Build();  // Throws FlowValidationException

// ✅ VALID: Flow has actions
var flow = new FlowBuilder()
    .SetName("ValidFlow")
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();
```

**Error Message:**
```
Flow 'EmptyFlow' has no actions
```

### 2. Terminal Action Validator
**Checks:** Flow ends with a terminal action (Disconnect, TransferToFlow, or EndFlowExecution)

```csharp
// ❌ ERROR: Flow doesn't end with terminal action
var flow = new FlowBuilder()
    .SetName("NoTerminal")
    .PlayPrompt("Welcome")
    .Build();  // Throws FlowValidationException

// ✅ VALID: Flow ends with Disconnect
var flow = new FlowBuilder()
    .SetName("WithTerminal")
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();

// ✅ VALID: Flow ends with TransferToQueue (which is terminal in this context)
var flow = new FlowBuilder()
    .SetName("QueueTransfer")
    .PlayPrompt("Welcome")
    .TransferToQueue("Support")
    .Build();
```

::: tip Terminal Actions
Terminal actions end the flow execution:
- **Disconnect** - Hang up the call
- **TransferToQueue** - Transfer to queue and end this flow
- **TransferToFlow** - Transfer to another flow
- **EndFlowExecution** - Explicitly end the flow
:::

**Error Message:**
```
Flow 'NoTerminal' must end with a terminal action (Disconnect, TransferToQueue, TransferToFlow, or EndFlowExecution)
```

### 3. Block Structure Validator
**Checks:**
- All actions have unique identifiers
- No duplicate identifiers
- Branch actions have conditions
- No unreachable actions

```csharp
// ✅ VALID: All actions are reachable and have unique IDs
var flow = new FlowBuilder()
    .SetName("WellStructured")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1 or 2", input =>
    {
        input.MaxDigits = 1;
    })
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    .Build();
```

### 4. Lambda Validator
**Checks:** InvokeLambda actions have function ARN specified

```csharp
// ❌ ERROR: Lambda action missing FunctionArn
var flow = new FlowBuilder()
    .SetName("MissingLambda")
    .InvokeLambda(lambda =>
    {
        // FunctionArn not set
    })
    .Disconnect()
    .Build();  // Throws FlowValidationException

// ✅ VALID: Lambda has FunctionArn
var flow = new FlowBuilder()
    .SetName("WithLambda")
    .InvokeLambda(lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789:function:MyFunc";
    })
    .Disconnect()
    .Build();
```

### 5. Flow Graph Validator
**Checks:**
- No disconnected blocks
- All transitions reference valid actions
- No orphaned actions
- Terminal actions don't have NextAction

```csharp
// ✅ VALID: All actions are connected
var flow = new FlowBuilder()
    .SetName("ConnectedFlow")
    .PlayPrompt("Step 1")
    .PlayPrompt("Step 2")
    .TransferToQueue("Support")
    .Build();
```

## Common Validation Errors

### Error: "Flow has no actions"

```csharp
// ❌ Problem
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .Build();  // ERROR: No actions added

// ✅ Solution: Add at least one action
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Welcome to our contact center")
    .Disconnect()
    .Build();
```

### Error: "Flow must end with a terminal action"

```csharp
// ❌ Problem: Flow doesn't end properly
var flow = new FlowBuilder()
    .SetName("IncompleteFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input => input.MaxDigits = 1)
    .Build();  // ERROR: Missing terminal action

// ✅ Solution 1: Add Disconnect
var flow = new FlowBuilder()
    .SetName("CompleteFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input => input.MaxDigits = 1)
    .Disconnect()
    .Build();

// ✅ Solution 2: Transfer to queue
var flow = new FlowBuilder()
    .SetName("TransferFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Support")
    .Build();

// ✅ Solution 3: All branches must end with terminal actions
var flow = new FlowBuilder()
    .SetName("BranchingFlow")
    .GetCustomerInput("Press 1 or 2", input => input.MaxDigits = 1)
    .OnDigit("1", sales =>
    {
        sales.PlayPrompt("Connecting to sales")
             .TransferToQueue("Sales");  // ✅ Terminal
    })
    .OnDigit("2", support =>
    {
        support.PlayPrompt("Connecting to support")
               .TransferToQueue("Support");  // ✅ Terminal
    })
    .OnTimeout(timeout =>
    {
        timeout.PlayPrompt("No input received")
               .Disconnect();  // ✅ Terminal
    })
    .Build();
```

### Error: "InvokeLambda action must have FunctionArn"

```csharp
// ❌ Problem: Lambda ARN not specified
var flow = new FlowBuilder()
    .SetName("LambdaFlow")
    .InvokeLambda(lambda => { })  // ERROR: FunctionArn missing
    .Disconnect()
    .Build();

// ✅ Solution: Provide Lambda ARN
var flow = new FlowBuilder()
    .SetName("LambdaFlow")
    .InvokeLambda(lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789:function:CustomerLookup";
    })
    .Disconnect()
    .Build();
```

### Error: "Action is not reachable"

```csharp
// ❌ Problem: Orphaned actions
// This typically happens when manually constructing flows
// The fluent API prevents this by design

// ✅ Solution: Use fluent API properly
var flow = new FlowBuilder()
    .SetName("ConnectedFlow")
    .PlayPrompt("Step 1")
    .PlayPrompt("Step 2")  // All actions automatically connected
    .TransferToQueue("Support")
    .Build();
```

## Custom Validators

You can create custom validators to enforce your own rules:

### Implementing IFlowValidator

```csharp
using Switchboard.Validation;
using Switchboard.Middleware;

public class MinimumMessageLengthValidator : IFlowValidator
{
    public int Order => 100;  // Run after built-in validators
    public bool EnabledByDefault => true;

    public ValidationResult Validate(FlowContext context)
    {
        var result = new ValidationResult { IsValid = true };

        // Find all PlayPrompt actions
        var prompts = context.Flow.Actions.OfType<PlayPromptAction>();

        foreach (var prompt in prompts)
        {
            if (!string.IsNullOrEmpty(prompt.Text) && prompt.Text.Length < 5)
            {
                result.AddWarning(
                    $"Prompt text '{prompt.Text}' is very short (under 5 characters)",
                    "CUSTOM001",
                    $"Actions[{prompt.Identifier}].Text");
            }
        }

        return result;
    }
}
```

### Registering Custom Validators

```csharp
// In Program.cs
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
})
.AddFlowDefinitions(typeof(Program).Assembly);

// Register custom validator
builder.Services.AddSingleton<IFlowValidator, MinimumMessageLengthValidator>();

var host = builder.Build();
```

### Disabling Validators

You can disable specific validators if needed:

```csharp
using Switchboard.Validation;

var registry = serviceProvider.GetRequiredService<FlowValidatorRegistry>();

// Disable a specific validator
registry.Disable<TerminalActionValidator>();

// Enable it again
registry.Enable<TerminalActionValidator>();
```

## Best Practices

### 1. Always End Flows with Terminal Actions

```csharp
// ✅ Good: Clear terminal action
var flow = new FlowBuilder()
    .SetName("CustomerService")
    .PlayPrompt("Welcome")
    .TransferToQueue("Support")  // Terminal action
    .Build();

// ✅ Good: Disconnect explicitly
var flow = new FlowBuilder()
    .SetName("AfterHours")
    .PlayPrompt("We're closed")
    .Disconnect()  // Terminal action
    .Build();
```

### 2. Handle All Input Branches

```csharp
// ✅ Good: All branches handled
var flow = new FlowBuilder()
    .SetName("Menu")
    .GetCustomerInput("Press 1 or 2", input => input.MaxDigits = 1)
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => sales.TransferToQueue("Support"))
    .OnTimeout(timeout => timeout.Disconnect())  // Don't forget timeout!
    .Build();

// ❌ Bad: Timeout not handled
var flow = new FlowBuilder()
    .SetName("IncompleteMenu")
    .GetCustomerInput("Press 1 or 2", input => input.MaxDigits = 1)
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    // Missing OnTimeout() - what happens if customer doesn't press anything?
    .Build();
```

### 3. Use Fluent API for Type Safety

The fluent API prevents many common errors at compile time:

```csharp
// ✅ Good: Fluent API ensures proper structure
var flow = new FlowBuilder()
    .SetName("TypeSafe")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1", input =>
    {
        input.MaxDigits = 1;
        input.TimeoutSeconds = 5;
    })
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnTimeout(timeout => timeout.Disconnect())
    .Build();
```

### 4. Validate Builds in Tests

```csharp
using Xunit;
using FluentAssertions;
using Switchboard;

public class FlowTests
{
    [Fact]
    public void CustomerServiceFlow_ShouldBuildSuccessfully()
    {
        // Arrange & Act
        var buildAction = () =>
        {
            var flow = new FlowBuilder()
                .SetName("CustomerService")
                .PlayPrompt("Welcome")
                .TransferToQueue("Support")
                .Build();
        };

        // Assert - should not throw
        buildAction.Should().NotThrow();
    }

    [Fact]
    public void EmptyFlow_ShouldFailValidation()
    {
        // Arrange & Act
        var buildAction = () =>
        {
            var flow = new FlowBuilder()
                .SetName("EmptyFlow")
                .Build();  // No actions
        };

        // Assert
        buildAction.Should().Throw<FlowValidationException>()
            .WithMessage("*no actions*");
    }
}
```

### 5. Handle Validation Errors Gracefully

```csharp
try
{
    var flow = new FlowBuilder()
        .SetName("MyFlow")
        // ... build flow
        .Build();
}
catch (FlowValidationException ex)
{
    // Log validation errors
    foreach (var error in ex.ValidationResult.Errors)
    {
        Console.WriteLine($"Validation Error: {error}");
    }

    // Don't deploy invalid flows
    throw;
}
```

## Validation Reference

### Built-In Validators

| Validator | Order | Purpose |
|-----------|-------|---------|
| `EmptyFlowValidator` | -100 | Ensures flow has at least one action |
| `TerminalActionValidator` | -90 | Ensures flow ends with terminal action |
| `BlockStructureValidator` | 10 | Validates identifiers, reachability, branches |
| `InvokeLambdaValidator` | 0 | Validates Lambda actions have FunctionArn |
| `FlowGraphValidator` | 0 | Validates graph connectivity and transitions |

### Terminal Actions

Actions that end flow execution:
- **Disconnect** - End the call
- **TransferToQueue** - Transfer to queue (flow ends for this contact flow)
- **TransferToFlow** - Transfer to another flow
- **EndFlowExecution** - Explicitly end execution

### Validation Errors Reference

| Error Code | Description | Fix |
|------------|-------------|-----|
| EMPTY_FLOW | Flow has no actions | Add at least one action |
| TERMINAL_ACTION | Missing terminal action | End with Disconnect, TransferToQueue, or TransferToFlow |
| SWB104 | Lambda missing FunctionArn | Set lambda.FunctionArn |
| SWB105 | Action missing identifier | Automatic - report as bug if seen |
| SWB106 | Duplicate identifier | Automatic - report as bug if seen |
| ORPHANED_ACTION | Action not reachable | Ensure all actions are connected |

## Next Steps

- **[Flow Basics](/guide/flows/basics)** - Learn flow fundamentals
- **[Customer Input Handling](/guide/flows/input-handling)** - Handle user input
- **[Dependency Injection](/guide/advanced/dependency-injection)** - Advanced DI patterns
- **[Middleware Pipeline](/guide/advanced/middleware)** - Customize validation pipeline

## Related Examples

- [Minimal Setup](/examples/minimal-setup) - Simple validated flows
- [Basic Call Center](/examples/basic-call-center) - Production-ready example
- [IVR Menu](/examples/flows/ivr-menu) - Complex branching flows
