# CheckContactAttribute Inline Branching

## Overview

The `CheckContactAttribute` builder now supports **inline branching** using lambda expressions, providing a cleaner and more intuitive alternative to label-based flow control.

## Why Inline Branching?

### Traditional Label-Based Approach

Previously, you had to use labels to define different execution paths:

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Authenticated"))
        .Equals(true, "AuthenticatedMenu")
        .Otherwise("AuthenticationFailed");
})
// Code continues linearly - you need to remember the labels
.PlayPrompt("Welcome! Authenticated.", "AuthenticatedMenu")
.PlayPrompt("Your balance is $100.")
.TransferToQueue("Support")
.Disconnect()
.PlayPrompt("Access denied.", "AuthenticationFailed")
.Disconnect()
```

**Problems:**
- ❌ Labels are scattered throughout the flow
- ❌ Hard to understand the flow structure at a glance
- ❌ Easy to make mistakes with label names
- ❌ Difficult to maintain as flows grow

### New Inline Branching Approach

With inline branching, the flow structure matches your mental model:

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Authenticated"))
        .Equals(true, authenticatedBranch =>
        {
            // This entire block executes ONLY when Authenticated == true
            authenticatedBranch
                .PlayPrompt("Welcome! Authenticated.")
                .PlayPrompt("Your balance is $100.")
                .TransferToQueue("Support")
                .Disconnect();
        })
        .Otherwise(notAuthenticatedBranch =>
        {
            // This block executes when authentication fails
            notAuthenticatedBranch
                .PlayPrompt("Access denied.")
                .Disconnect();
        });
})
```

**Benefits:**
- ✅ Clear visual structure - nested code shows nested logic
- ✅ Self-documenting - no need to track labels
- ✅ Type-safe - compiler catches errors
- ✅ Easier to refactor and maintain

## Supported Overloads

All comparison methods now support inline branching:

### Boolean Comparisons

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("IsVIP"))
        .Equals(true, vipPath =>
        {
            vipPath
                .PlayPrompt("Welcome, VIP!")
                .TransferToQueue("VIP-Support")
                .Disconnect();
        })
        .Otherwise(standardPath =>
        {
            standardPath
                .TransferToQueue("General-Support")
                .Disconnect();
        });
})
```

### String Comparisons

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Department"))
        .Equals("Sales", salesPath =>
        {
            salesPath.TransferToQueue("Sales").Disconnect();
        })
        .Equals("Support", supportPath =>
        {
            supportPath.TransferToQueue("Support").Disconnect();
        })
        .Otherwise(defaultPath =>
        {
            defaultPath.TransferToQueue("General").Disconnect();
        });
})
```

### Numeric Comparisons

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.User("RetryCount"))
        .Equals(0, firstAttempt =>
        {
            firstAttempt.PlayPrompt("First try.").Disconnect();
        })
        .Equals(1, secondAttempt =>
        {
            secondAttempt.PlayPrompt("Second try.").Disconnect();
        })
        .Otherwise(tooMany =>
        {
            tooMany.PlayPrompt("Too many attempts.").Disconnect();
        });
})
```

## Advanced Examples

### Example 1: Multi-Tier Customer Service

```csharp
var flow = new FlowBuilder()
    .SetName("Tiered Support")
    .SetType(FlowType.ContactFlow)

    .CheckContactAttribute(check =>
    {
        check
            .Attribute(Attributes.External("CustomerTier"))
            .Equals("VIP", vip =>
            {
                vip
                    .PlayPrompt("Welcome, VIP customer!")
                    .SetContactAttributes(attrs =>
                    {
                        attrs["Priority"] = "High";
                        attrs["MaxWaitTime"] = "30";
                    })
                    .TransferToQueue("VIP-Support")
                    .Disconnect();
            })
            .Equals("Premium", premium =>
            {
                premium
                    .PlayPrompt("Hello, Premium customer!")
                    .SetContactAttributes(attrs =>
                    {
                        attrs["Priority"] = "Medium";
                        attrs["MaxWaitTime"] = "120";
                    })
                    .TransferToQueue("Premium-Support")
                    .Disconnect();
            })
            .Otherwise(standard =>
            {
                standard
                    .PlayPrompt("Thank you for calling.")
                    .TransferToQueue("General-Support")
                    .Disconnect();
            });
    })
    .Build();
```

### Example 2: Nested Branching with Input

```csharp
var flow = new FlowBuilder()
    .SetName("Authenticated Menu")
    .SetType(FlowType.ContactFlow)

    // Invoke Lambda to check authentication
    .InvokeLambda("CheckAuthFunction", lambda =>
    {
        lambda.InputParameters["UserId"] = "$.Attributes.UserId";
    })

    // Branch based on authentication result
    .OnSuccess(lambdaSuccess =>
    {
        lambdaSuccess
            .CheckContactAttribute(check =>
            {
                check
                    .Attribute(Attributes.External("Authenticated"))
                    .Equals(true, authenticated =>
                    {
                        // Show authenticated menu
                        authenticated
                            .PlayPrompt("Welcome, $.External.CustomerName!")
                            .GetCustomerInput("Press 1 for orders, 2 for billing.", input =>
                            {
                                input.TimeoutSeconds = 5;
                            })
                            .OnDigit("1", orders =>
                            {
                                orders
                                    .PlayPrompt("Checking your orders...")
                                    .InvokeLambda("GetOrdersFunction")
                                    .OnSuccess(ordersSuccess =>
                                    {
                                        ordersSuccess
                                            .PlayPrompt("You have $.External.OrderCount orders.")
                                            .TransferToQueue("Orders")
                                            .Disconnect();
                                    })
                                    .OnError(ordersError =>
                                    {
                                        ordersError
                                            .PlayPrompt("Unable to retrieve orders.")
                                            .Disconnect();
                                    });
                            })
                            .OnDigit("2", billing =>
                            {
                                billing
                                    .PlayPrompt("Your balance is $.External.Balance")
                                    .TransferToQueue("Billing")
                                    .Disconnect();
                            })
                            .OnDefault(invalid => invalid.Disconnect())
                            .OnTimeout(timeout => timeout.Disconnect())
                            .OnError(error => error.Disconnect());
                    })
                    .Otherwise(notAuthenticated =>
                    {
                        // Authentication failed
                        notAuthenticated
                            .PlayPrompt("Authentication failed.")
                            .PlayPrompt("Please contact customer support.")
                            .TransferToQueue("Support")
                            .Disconnect();
                    });
            });
    })
    .OnError(lambdaError =>
    {
        lambdaError
            .PlayPrompt("System error. Please try again.")
            .Disconnect();
    })
    .Build();
```

### Example 3: Retry Logic with Counter

```csharp
var flow = new FlowBuilder()
    .SetName("PIN Verification with Retries")
    .SetType(FlowType.ContactFlow)

    .StoreCustomerInput("Enter your PIN:", input =>
    {
        input.MaxDigits = 4;
    })
    .OnSuccess(pinEntered =>
    {
        pinEntered
            .InvokeLambda("VerifyPIN", lambda =>
            {
                lambda.InputParameters["PIN"] = "$.StoredCustomerInput";
            })
            .OnSuccess(verified =>
            {
                verified
                    .CheckContactAttribute(check =>
                    {
                        check
                            .Attribute(Attributes.External("PINValid"))
                            .Equals(true, validPin =>
                            {
                                validPin
                                    .PlayPrompt("PIN accepted. Welcome!")
                                    .TransferToQueue("Authenticated")
                                    .Disconnect();
                            })
                            .Otherwise(invalidPin =>
                            {
                                // Check retry count
                                invalidPin
                                    .CheckContactAttribute(retryCheck =>
                                    {
                                        retryCheck
                                            .Attribute(Attributes.User("RetryCount"))
                                            .Equals(0, firstFail =>
                                            {
                                                firstFail
                                                    .PlayPrompt("Incorrect PIN. Please try again.")
                                                    .SetContactAttributes(attrs =>
                                                    {
                                                        attrs["RetryCount"] = "1";
                                                    })
                                                    .Disconnect(); // Loop back
                                            })
                                            .Equals(1, secondFail =>
                                            {
                                                secondFail
                                                    .PlayPrompt("Incorrect PIN. One more try.")
                                                    .SetContactAttributes(attrs =>
                                                    {
                                                        attrs["RetryCount"] = "2";
                                                    })
                                                    .Disconnect();
                                            })
                                            .Otherwise(tooManyFails =>
                                            {
                                                tooManyFails
                                                    .PlayPrompt("Too many failed attempts.")
                                                    .PlayPrompt("Your account has been locked.")
                                                    .Disconnect();
                                            });
                                    });
                            });
                    });
            });
    })
    .Build();
```

## Backward Compatibility

The original label-based approach is still fully supported. You can mix and match:

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Status"))
        .Equals("Active", activeFlow =>
        {
            // Use inline branching for active status
            activeFlow
                .PlayPrompt("Account is active")
                .TransferToQueue("Active")
                .Disconnect();
        })
        .Equals("Inactive", "InactiveLabel")  // Still use labels if you prefer
        .Otherwise("DefaultLabel");
})
.PlayPrompt("Account inactive", "InactiveLabel")
.Disconnect()
.PlayPrompt("Unknown status", "DefaultLabel")
.Disconnect()
```

## When to Use Each Approach

### Use Inline Branching When:
- ✅ You want clear, readable code
- ✅ Each branch has distinct logic
- ✅ You're building new flows
- ✅ You want to avoid label management

### Use Labels When:
- ✅ Multiple conditions need to jump to the same destination
- ✅ You need to jump to a label defined elsewhere in the flow
- ✅ You're maintaining existing flows with labels
- ✅ You need to create reusable flow sections

## Implementation Details

### How It Works

When you use inline branching:

1. The framework creates a new `FlowBuilder` instance for each nested branch
2. The nested builder shares the parent's action counter (for unique IDs)
3. The nested builder has access to the parent's join point scope
4. Each branch is stored in the `BranchAction.Branches` dictionary
5. During flow generation, nested flows are flattened into the main flow

### Performance Considerations

- No runtime performance difference between inline and label-based approaches
- Both compile to the same Amazon Connect flow JSON
- Inline branching may generate slightly larger code (more lambdas), but this is negligible

## Migration Guide

### Before (Label-Based)

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Type"))
        .Equals("A", "TypeA")
        .Equals("B", "TypeB")
        .Otherwise("TypeDefault");
})
.PlayPrompt("Type A flow", "TypeA")
.Disconnect()
.PlayPrompt("Type B flow", "TypeB")
.Disconnect()
.PlayPrompt("Default flow", "TypeDefault")
.Disconnect()
```

### After (Inline Branching)

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("Type"))
        .Equals("A", typeA =>
        {
            typeA.PlayPrompt("Type A flow").Disconnect();
        })
        .Equals("B", typeB =>
        {
            typeB.PlayPrompt("Type B flow").Disconnect();
        })
        .Otherwise(typeDefault =>
        {
            typeDefault.PlayPrompt("Default flow").Disconnect();
        });
})
```

## Best Practices

1. **Keep branches focused**: Each branch should have a clear purpose
2. **Avoid deep nesting**: If you have >3 levels of nesting, consider extracting to separate flows
3. **Use meaningful parameter names**: `vipBranch`, `authenticatedPath`, etc.
4. **Be consistent**: Pick one style (inline or labels) per flow for clarity
5. **Comment complex branching**: Explain the business logic, not the syntax

## See Also

- [CheckContactAttribute API Reference](../api/CheckContactAttributeBuilder.md)
- [Flow Builder Patterns](./patterns.md)
- [Label-Based Flow Control](./labels.md)
- [Nested Branching Examples](../examples/nested-branching.md)
