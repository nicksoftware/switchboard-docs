# Wait

Pause flow execution for a specified duration.

## Signature

```csharp
IFlowBuilder Wait(int seconds, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `seconds` | `int` | Yes | Duration to wait in seconds (must be positive) |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Simple Pause

```csharp
Flow.Create("Announcement")
    .PlayPrompt("Important information:")
    .Wait(2)  // 2 second pause
    .PlayPrompt("Our hours have changed.")
    .TransferToQueue("Support")
    .Disconnect();
```

### Between Menu Options

```csharp
Flow.Create("Clear Menu")
    .PlayPrompt("Welcome to Nick Software.")
    .Wait(1)
    .PlayPrompt("Press 1 for Sales.")
    .Wait(1)
    .PlayPrompt("Press 2 for Support.")
    .Wait(1)
    .PlayPrompt("Press 3 for Billing.")
    .GetCustomerInput("Please make your selection.")
        .OnDigit("1", s => s.TransferToQueue("Sales"))
        .OnDigit("2", s => s.TransferToQueue("Support"))
        .OnDigit("3", s => s.TransferToQueue("Billing"))
        .OnDefault(d => d.Disconnect())
    .Disconnect();
```

### After Error

```csharp
Flow.Create("Error Recovery")
    .InvokeLambda("ProcessRequest")
        .OnSuccess(s => s.TransferToQueue("Support"))
        .OnError(e => e
            .PlayPrompt("An error occurred.")
            .Wait(2)
            .PlayPrompt("Please try again later.")
            .Disconnect());
```

### Hold Pattern

```csharp
Flow.Create("CustomerHold")
    .SetType(FlowType.CustomerHold)
    .PlayPrompt("Please continue to hold.")
    .Wait(30)  // 30 second hold music/silence
    .PlayPrompt("Your call is important to us.")
    .Wait(30)
    .PlayPrompt("An agent will be with you shortly.")
    .EndFlowExecution();  // Loop back
```

### Paced Announcements

```csharp
Flow.Create("Queue Announcement")
    .SetType(FlowType.CustomerQueue)
    .PlayPrompt("You are caller number 5 in the queue.")
    .Wait(3)
    .PlayPrompt("Expected wait time is approximately 10 minutes.")
    .Wait(3)
    .PlayPrompt("Thank you for your patience.")
    .Wait(60)  // Wait before repeating
    .EndFlowExecution();
```

## AWS Connect Block Type

This block generates the `Wait` action type in the exported flow JSON.

## Limitations

| Limit | Value |
|-------|-------|
| Maximum wait | 300 seconds (5 minutes) |
| Minimum wait | 1 second |

## Best Practices

1. **Keep waits short** - Long waits frustrate customers
2. **Use for pacing** - Improve comprehension of announcements
3. **Consider queue flows** - Use in hold/queue flows for periodic messages
4. **Don't overuse** - Avoid excessive pauses

## See Also

- [PlayPrompt](../interact/play-prompt.md) - Audio announcements
- [EndFlowExecution](../terminate/end-flow-execution.md) - Loop queue/hold flows
