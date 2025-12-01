# CheckContactAttribute

Branch the flow based on contact attribute values. This is the primary method for conditional routing in Switchboard.

## Signature

```csharp
IFlowBuilder CheckContactAttribute(
    Action<CheckContactAttributeBuilder> configure,
    string? identifier = null)
```

## Parameters

| Parameter    | Type                                   | Required | Description                        |
| ------------ | -------------------------------------- | -------- | ---------------------------------- |
| `configure`  | `Action<CheckContactAttributeBuilder>` | Yes      | Configure the attribute check      |
| `identifier` | `string?`                              | No       | Optional identifier for the action |

## CheckContactAttributeBuilder Methods

| Method                           | Description                    |
| -------------------------------- | ------------------------------ |
| `.Attribute(AttributeReference)` | Specify the attribute to check |

After calling `.Attribute()`, comparison methods become available:

| Method                                     | Description                                    |
| ------------------------------------------ | ---------------------------------------------- |
| `.Equals(value, Action<IFlowBuilder>)`     | Branch with inline flow when equals value      |
| `.Equals(value, string targetLabel)`       | Jump to labeled action when equals value       |
| `.Equals(bool, Action<IFlowBuilder>)`      | Branch with inline flow when equals boolean    |
| `.Equals(bool, string targetLabel)`        | Jump to labeled action when equals boolean     |
| `.Equals(int, Action<IFlowBuilder>)`       | Branch with inline flow when equals number     |
| `.Equals(int, string targetLabel)`         | Jump to labeled action when equals number      |
| `.NotEquals(value, string targetLabel)`    | Jump to labeled action when not equal          |
| `.Contains(substring, string targetLabel)` | Jump to labeled action when contains substring |
| `.GreaterThan(value, string targetLabel)`  | Jump to labeled action when greater than value |
| `.LessThan(value, string targetLabel)`     | Jump to labeled action when less than value    |
| `.Otherwise(Action<IFlowBuilder>)`         | Default branch with inline flow                |
| `.Otherwise(string targetLabel)`           | Jump to labeled action when no match           |

## AttributeReference Types

Use the `Attributes` helper to reference attributes:

| Method                                  | Description               | Example                     |
| --------------------------------------- | ------------------------- | --------------------------- |
| `Attributes.Contact("name")`            | User-defined attribute    | `$.Attributes.CustomerTier` |
| `Attributes.System(SystemAttributes.*)` | System attribute          | `$.SystemEndpoint.Address`  |
| `Attributes.External("name")`           | Lambda response attribute | `$.External.StatusCode`     |
| `Attributes.Lex("slotName")`            | Lex bot slot              | `$.Lex.Slots.ProductType`   |

## Examples

### Simple String Comparison

```csharp
Flow.Create("VIP Router")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("CustomerTier"))
            .Equals("VIP", vip => vip
                .PlayPrompt("Welcome, valued customer!")
                .TransferToQueue("VIPSupport")
                .Disconnect())
            .Equals("Premium", premium => premium
                .TransferToQueue("PremiumSupport")
                .Disconnect())
            .Otherwise(standard => standard
                .TransferToQueue("General")
                .Disconnect());
    });
```

### Boolean Check (Lambda Response)

```csharp
Flow.Create("Authentication Flow")
    .InvokeLambda("ValidatePIN")
        .OnSuccess(success => success
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("Authenticated"))
                    .Equals(true, authenticated => authenticated
                        .PlayPrompt("Authentication successful.")
                        .TransferToQueue("Authenticated"))
                    .Otherwise(failed => failed
                        .PlayPrompt("Invalid PIN."));
            }))
        .OnError(error => error
            .PlayPrompt("Verification service unavailable."));
```

### HTTP Status Code Check

```csharp
Flow.Create("API Response Handler")
    .InvokeLambda("CustomerLookup")
        .OnSuccess(success => success
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("StatusCode"))
                    .Equals("200", found => found
                        .PlayPrompt("Customer found.")
                        .SetContactAttributes(attrs =>
                        {
                            attrs["CustomerName"] = Attributes.External("CustomerName");
                        }))
                    .Equals("404", notFound => notFound
                        .PlayPrompt("Customer not found."))
                    .Equals("500", serverError => serverError
                        .PlayPrompt("Service temporarily unavailable."))
                    .Otherwise(unexpected => unexpected
                        .PlayPrompt("Unexpected error occurred."));
            }))
        .OnError(error => error.Disconnect());
```

### Numeric Comparison

```csharp
Flow.Create("Balance Checker")
    .InvokeLambda("GetAccountBalance")
        .OnSuccess(s => s
            .SetContactAttributes(a => a["Balance"] = Attributes.External("Balance")))
        .OnError(e => e.Disconnect())
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("Balance"))
            .LessThan("0", negative => negative
                .PlayPrompt("Your account is overdrawn.")
                .TransferToQueue("Collections"))
            .LessThan("100", low => low
                .PlayPrompt("Your balance is low.")
                .TransferToQueue("Support"))
            .Otherwise(healthy => healthy
                .PlayPrompt("Your account is in good standing.")
                .TransferToQueue("General"));
    });
```

### Language-Based Routing

```csharp
Flow.Create("Multi-Language Flow")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("Language"))
            .Equals("es", spanish => spanish
                .PlayPrompt("Bienvenido. Transfiriendo al equipo de español.")
                .TransferToQueue("SpanishSupport"))
            .Equals("fr", french => french
                .PlayPrompt("Bienvenue. Transfert vers l'équipe française.")
                .TransferToQueue("FrenchSupport"))
            .Otherwise(english => english
                .PlayPrompt("Welcome. Transferring to support.")
                .TransferToQueue("EnglishSupport"));
    });
```

### Label-Based Targeting (Flat Flow Structure)

Use label-based targeting when you prefer a flat flow structure or need to reference actions defined elsewhere in the flow:

```csharp
Flow.Create("Customer Input Router")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, 3 for Billing.")
        .OnTimeout(timeout => timeout.Disconnect())
        .OnError(error => error.Disconnect())
        .OnDefault(def => def.Disconnect())

    // Route based on stored input using labels
    .CheckContactAttribute(check => check
        .Attribute("$.StoredCustomerInput")
        .Equals("1", "sales-handler")
        .Equals("2", "support-handler")
        .Equals("3", "billing-handler")
        .Otherwise("invalid-handler"))

    // Labeled handlers
    .JoinPoint("sales-handler")
    .PlayPrompt("Transferring to Sales.")
    .TransferToQueue("Sales")
    .Disconnect()

    .JoinPoint("support-handler")
    .PlayPrompt("Transferring to Support.")
    .TransferToQueue("Support")
    .Disconnect()

    .JoinPoint("billing-handler")
    .PlayPrompt("Transferring to Billing.")
    .TransferToQueue("Billing")
    .Disconnect()

    .JoinPoint("invalid-handler")
    .PlayPrompt("Invalid selection. Goodbye.")
    .Disconnect();
```

This approach is useful when:

- Actions need to be shared across multiple branches
- You want a flatter, more readable flow structure
- You're migrating from legacy flow patterns

### Complex Multi-Condition Flow

```csharp
Flow.Create("Smart Router")
    // First check customer tier
    .CheckContactAttribute(tierCheck =>
    {
        tierCheck.Attribute(Attributes.Contact("CustomerTier"))
            .Equals("VIP", vip => vip
                // VIP customers get immediate queue
                .TransferToQueue("VIPSupport")
                .Disconnect())
            .Otherwise(nonVip => nonVip
                // Non-VIP: check if within business hours
                .CheckHoursOfOperation("BusinessHours")
                    .OnInHours(open => open
                        // During hours: check staffing
                        .CheckStaffingForQueue("Support", StaffingMetricType.Available)
                            .OnTrue(agentsAvailable => agentsAvailable
                                .TransferToQueue("Support"))
                            .OnFalse(noAgents => noAgents
                                .PlayPrompt("High call volume. Please hold.")
                                .TransferToQueue("Support"))
                            .OnError(e => e.TransferToQueue("Support")))
                    .OnOutOfHours(closed => closed
                        .PlayPrompt("We're closed.")
                        .Disconnect())
                    .OnError(e => e.TransferToQueue("Support")));
    });
```

### Contains Check

```csharp
Flow.Create("Keyword Router")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("IssueDescription"))
            .Contains("urgent", urgent => urgent
                .TransferToQueue("UrgentSupport"))
            .Contains("billing", billing => billing
                .TransferToQueue("Billing"))
            .Contains("cancel", cancel => cancel
                .TransferToQueue("Retention"))
            .Otherwise(general => general
                .TransferToQueue("General"));
    });
```

### Checking System Attributes

```csharp
Flow.Create("Caller ID Router")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.System(SystemAttributes.CustomerEndpointAddress))
            .Equals("+18005551234", knownCaller => knownCaller
                .PlayPrompt("Welcome back!")
                .TransferToQueue("ReturningCustomers"))
            .Otherwise(newCaller => newCaller
                .PlayPrompt("Thank you for calling.")
                .TransferToQueue("NewCustomers"));
    });
```

## AWS Connect Block Type

This block generates the `CheckContactAttributes` action type in the exported flow JSON.

## Comparison with Legacy Branch()

`CheckContactAttribute` replaces the deprecated `Branch()` method:

```csharp
// ❌ Old deprecated way
.Branch(branch => branch
    .When(Attributes.Contact("Tier"), "VIP", vip => vip.TransferToQueue("VIP")))

// ✅ New preferred way
.CheckContactAttribute(check =>
{
    check.Attribute(Attributes.Contact("Tier"))
        .Equals("VIP", vip => vip.TransferToQueue("VIP"));
})
```

## Best Practices

1. **Always include Otherwise** - Handle unexpected values gracefully
2. **Check Lambda responses** - Validate StatusCode before using data
3. **Use typed attributes** - Use `Attributes.*` helpers for type safety
4. **Order conditions logically** - Most specific first, Otherwise last
5. **Keep nesting shallow** - Extract complex logic to helper methods

## See Also

- [Attributes Reference](../attributes.md) - All attribute types
- [InvokeLambda](../integrate/invoke-lambda.md) - Getting data for checks
- [CheckHoursOfOperation](./check-hours-of-operation.md) - Business hours check
- [CheckStaffing](./check-staffing.md) - Agent availability check
