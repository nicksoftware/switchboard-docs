# CheckContactAttribute

Branch the flow based on contact attribute values. This is the primary method for conditional routing in Switchboard.

## Signature

```csharp
IFlowBuilder CheckContactAttribute(
    Action<CheckContactAttributeBuilder> configure, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `configure` | `Action<CheckContactAttributeBuilder>` | Yes | Configure the attribute check |
| `identifier` | `string?` | No | Optional identifier for the action |

## CheckContactAttributeBuilder Methods

| Method | Description |
|--------|-------------|
| `.Attribute(AttributeReference)` | Specify the attribute to check |

After calling `.Attribute()`, comparison methods become available:

| Method | Description |
|--------|-------------|
| `.Equals(value, Action<IFlowBuilder>)` | Branch when attribute equals value |
| `.Equals(bool, Action<IFlowBuilder>)` | Branch when attribute equals boolean |
| `.NotEquals(value, Action<IFlowBuilder>)` | Branch when attribute doesn't equal value |
| `.Contains(value, Action<IFlowBuilder>)` | Branch when attribute contains value |
| `.GreaterThan(value, Action<IFlowBuilder>)` | Branch when attribute is greater than value |
| `.LessThan(value, Action<IFlowBuilder>)` | Branch when attribute is less than value |
| `.Otherwise(Action<IFlowBuilder>)` | Default branch when no conditions match |

## AttributeReference Types

Use the `Attributes` helper to reference attributes:

| Method | Description | Example |
|--------|-------------|---------|
| `Attributes.Contact("name")` | User-defined attribute | `$.Attributes.CustomerTier` |
| `Attributes.System(SystemAttributes.*)` | System attribute | `$.SystemEndpoint.Address` |
| `Attributes.External("name")` | Lambda response attribute | `$.External.StatusCode` |
| `Attributes.Lex("slotName")` | Lex bot slot | `$.Lex.Slots.ProductType` |

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
