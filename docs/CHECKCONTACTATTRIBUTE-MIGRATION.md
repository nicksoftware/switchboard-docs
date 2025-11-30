# Migration Guide: Branch → CheckContactAttribute

## Overview

The `Branch` method has been replaced with `CheckContactAttribute` to:
1. **Align with AWS Connect naming** - Uses the actual block name from Amazon Connect
2. **Eliminate magic strings** - Type-safe attribute references and comparisons
3. **Provide strong typing** - C# types are converted to Connect strings automatically
4. **Improve IntelliSense** - Better developer experience with method discovery

## Before (Old API with Magic Strings)

```csharp
// ❌ Magic strings, no type safety, error-prone
.Branch(branch =>
{
    branch
        .When("$.External.Authenticated == \"True\"", "authenticated-menu")
        .Otherwise("authentication-failed");
})
```

**Problems:**
- Magic string for attribute path: `"$.External.Authenticated"`
- Magic string for comparison: `== \"True\"`
- No compile-time validation
- Easy to make typos
- Boolean values require knowing Connect's string conversion

## After (New Type-Safe API)

```csharp
// ✅ Type-safe, IntelliSense support, automatic string conversion
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Authenticated"))
        .Equals(true, "authenticated-menu")  // Boolean automatically becomes "True"
        .Otherwise("authentication-failed");
})
```

**Benefits:**
- Type-safe attribute reference using `Attributes.External()`
- Strong typing: `true` (C# bool) → `"True"` (Connect string) automatically
- IntelliSense shows available comparison methods
- Compile-time validation
- AWS-aligned naming

## Type-Safe Attribute References

### Static Helper Methods

```csharp
using Switchboard.Models;

// External attributes (from Lambda)
Attributes.External("Authenticated")     // → $.External.Authenticated
Attributes.External("AccountBalance")    // → $.External.AccountBalance
Attributes.External("CustomerName")      // → $.External.CustomerName

// Contact attributes (user-defined)
Attributes.Contact("CustomerType")       // → $.Attributes.CustomerType
Attributes.Contact("PremiumMember")      // → $.Attributes.PremiumMember

// System attributes
SystemAttributes.CustomerInputValue      // → $.CustomerInput.Value
SystemAttributes.LexIntentName          // → $.Lex.IntentName
SystemAttributes.CustomerNumber         // → $.CustomerEndpoint.Address
```

### Comparison Methods with Strong Typing

```csharp
.CheckContactAttribute(check =>
{
    check.Attribute(Attributes.External("AccountBalance"))

    // Boolean comparison (automatically converts to "True"/"False")
    .Equals(true, "is-authenticated")

    // String comparison
    .Equals("VIP", "vip-queue")

    // Numeric comparison
    .GreaterThan(1000, "high-value-customer")
    .LessThan(100, "low-balance-warning")

    // String operations
    .Contains("Premium", "premium-customer")
    .StartsWith("US", "us-customer")

    // Not equals
    .NotEquals("Inactive", "active-customer")

    // Default case
    .Otherwise("standard-queue");
})
```

## Real-World Examples

### Example 1: Lambda Authentication Check

```csharp
// Lambda returns: { "Authenticated": true, "CustomerName": "John" }

.InvokeLambda(lambdaArn, lambda => { /* ... */ })
.OnSuccess(success =>
{
    success
        .CheckContactAttribute(check =>
        {
            check
                .Attribute(Attributes.External("Authenticated"))
                .Equals(true, "authenticated-menu")  // C# bool → "True" string
                .Otherwise("authentication-failed");
        })
        .PlayPrompt("Welcome!", "authenticated-menu")
        // ... rest of flow
})
```

### Example 2: Customer Type Routing

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.Contact("CustomerType"))
        .Equals("VIP", "vip-queue")
        .Equals("Premium", "premium-queue")
        .Equals("Standard", "standard-queue")
        .Otherwise("general-queue");
})
```

### Example 3: Account Balance Thresholds

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("AccountBalance"))
        .GreaterThan(10000, "high-value-route")
        .GreaterThan(1000, "medium-value-route")
        .Otherwise("standard-route");
})
```

### Example 4: Lex Intent Routing

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.LexIntentName)
        .Equals("OrderStatus", "order-status-flow")
        .Equals("AccountBalance", "balance-flow")
        .Equals("SpeakToAgent", "agent-transfer")
        .Otherwise("main-menu");
})
```

## Boolean Handling

Amazon Connect stores all attributes as strings. The framework handles this automatically:

| C# Type | Developer Writes | Framework Generates | Connect Sees |
|---------|------------------|---------------------|--------------|
| `bool` | `.Equals(true, ...)` | `CompareValue = "True"` | String "True" |
| `bool` | `.Equals(false, ...)` | `CompareValue = "False"` | String "False" |
| `int` | `.Equals(100, ...)` | `CompareValue = "100"` | String "100" |
| `string` | `.Equals("VIP", ...)` | `CompareValue = "VIP"` | String "VIP" |

**You write strongly-typed C# code, the framework handles Connect's string requirements.**

## Attribute Namespaces in Amazon Connect

Amazon Connect uses JSON path notation for attributes:

- **System**: `$.CustomerInput.Value`, `$.Queue.Name`, etc.
- **User-defined**: `$.Attributes.{name}` (set via SetContactAttributes)
- **External** (Lambda): `$.External.{name}` (returned from Lambda)
- **Lex**: `$.Lex.IntentName`, `$.Lex.Slots.{slotName}`, etc.

The framework provides type-safe helpers for all of these.

## Best Practice: Static Label Constants

To eliminate magic strings for jump targets, create a static class with label constants:

```csharp
// FlowLabels.cs
public static class FlowLabels
{
    public const string AuthenticatedMenu = "authenticated-menu";
    public const string AuthenticationFailed = "authentication-failed";

    public static class Account
    {
        public const string EnterAccountNumber = "enter-account-number";
        public const string EnterPin = "enter-pin";
    }

    public static class Menu
    {
        public const string MainMenu = "main-menu";
        public const string SalesMenu = "sales-menu";
    }
}
```

**Usage:**

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Authenticated"))
        .Equals(true, FlowLabels.AuthenticatedMenu)  // ✅ Type-safe constant
        .Otherwise(FlowLabels.AuthenticationFailed); // ✅ Type-safe constant
})
.PlayPrompt("Welcome!", FlowLabels.AuthenticatedMenu)  // ✅ Same constant reused
```

**Benefits:**
- ✅ Compile-time validation of label names
- ✅ IntelliSense support for discovering available labels
- ✅ Refactor-friendly (rename propagates everywhere)
- ✅ No typos in label strings
- ✅ Self-documenting code

## Migration Checklist

- [ ] Add `using Switchboard.Models;` to your files
- [ ] Create a `FlowLabels.cs` file with static label constants (recommended)
- [ ] Replace `.Branch()` calls with `.CheckContactAttribute()`
- [ ] Replace magic attribute strings with `Attributes.External()`, `Attributes.Contact()`, or `SystemAttributes.*`
- [ ] Replace string comparisons (`"== \"True\""`) with typed comparisons (`.Equals(true, ...)`)
- [ ] Replace magic label strings with `FlowLabels.*` constants
- [ ] Test your flows to ensure behavior is identical

## Backward Compatibility

The old `Branch` method is still available but marked as `[Obsolete]`:

```csharp
[Obsolete("Use CheckContactAttribute instead. This method will be removed in a future version.")]
public IFlowBuilder Branch(Action<BranchBuilder> configure, string? identifier = null)
```

You'll receive compiler warnings until you migrate. The method will be removed in a future major version.

## Benefits Summary

✅ **Type Safety**: Compile-time validation of attribute paths and comparison values
✅ **IntelliSense**: Discover available comparison methods and attributes
✅ **AWS Alignment**: Method name matches the actual Amazon Connect block
✅ **Less Error-Prone**: No more typos in attribute paths or comparison strings
✅ **Automatic Conversion**: Boolean and numeric types converted to Connect strings automatically
✅ **Better Testing**: Type-safe code is easier to unit test
✅ **Documentation**: Self-documenting code with clear intent

## Questions?

See the [Check Contact Attributes AWS Documentation](https://docs.aws.amazon.com/connect/latest/adminguide/check-contact-attributes.html) for more information about how this block works in Amazon Connect.
