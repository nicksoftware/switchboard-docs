# Check Blocks

Check blocks evaluate conditions and branch the flow based on the result. They are essential for creating dynamic, intelligent contact flows.

## Blocks in this Category

- [CheckContactAttribute](./check-contact-attribute.md) - Branch based on contact attribute values
- [CheckHoursOfOperation](./check-hours-of-operation.md) - Branch based on business hours
- [CheckStaffing](./check-staffing.md) - Branch based on agent availability
- [CheckQueueStatus](./check-queue-status.md) - Branch based on queue metrics

## Overview

Check blocks allow you to create conditional logic in your flows:

- **Route by customer data** - VIP customers, account status, language preference
- **Handle business hours** - Open vs. closed routing
- **Check agent availability** - Route based on staffing levels
- **Monitor queue health** - Handle high queue volumes

## Common Patterns

### Attribute-Based Routing

```csharp
Flow.Create("VIP Routing")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s.SetContactAttributes(a => a["CustomerTier"] = Attributes.External("Tier")))
        .OnError(e => e.TransferToQueue("General"))
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("CustomerTier"))
            .Equals("VIP", vip => vip.TransferToQueue("VIPSupport"))
            .Equals("Premium", premium => premium.TransferToQueue("PremiumSupport"))
            .Otherwise(standard => standard.TransferToQueue("General"));
    })
    .Disconnect();
```

### Hours-Based Routing

```csharp
Flow.Create("Business Hours")
    .CheckHoursOfOperation("MainBusinessHours")
        .OnInHours(open => open.TransferToQueue("Sales"))
        .OnOutOfHours(closed => closed
            .PlayPrompt("We're closed. Please call during business hours.")
            .Disconnect())
        .OnError(error => error.TransferToQueue("Support"));
```

### Staffing-Aware Routing

```csharp
Flow.Create("Smart Queue")
    .CheckStaffingForQueue("SupportQueue", StaffingMetricType.Available)
        .OnTrue(available => available
            .PlayPrompt("An agent is available.")
            .TransferToQueue("SupportQueue"))
        .OnFalse(unavailable => unavailable
            .PlayPrompt("All agents are busy. You'll be placed in queue.")
            .TransferToQueue("SupportQueue"))
        .OnError(error => error.TransferToQueue("SupportQueue"));
```

## Comparison Operators

CheckContactAttribute supports multiple comparison operators:

| Method | Description | Example |
|--------|-------------|---------|
| `.Equals(value)` | Exact match | `.Equals("VIP", ...)` |
| `.NotEquals(value)` | Not equal | `.NotEquals("Blocked", ...)` |
| `.Contains(value)` | Contains substring | `.Contains("Premium", ...)` |
| `.GreaterThan(value)` | Numeric greater than | `.GreaterThan("100", ...)` |
| `.LessThan(value)` | Numeric less than | `.LessThan("5", ...)` |
| `.Otherwise()` | Default case | `.Otherwise(...)` |

## Error Handling

All check blocks support error handling:

```csharp
.CheckHoursOfOperation("Hours")
    .OnInHours(...)
    .OnOutOfHours(...)
    .OnError(error => error
        .PlayPrompt("Unable to determine business hours. Transferring...")
        .TransferToQueue("Fallback"))
```

## See Also

- [Attributes Reference](../attributes.md) - Accessing attribute values
- [InvokeLambda](../integrate/invoke-lambda.md) - Getting data for checks
