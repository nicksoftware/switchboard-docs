# Disconnect

End the contact and disconnect the caller.

## Signature

```csharp
IFlowBuilder Disconnect(string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Basic Disconnect

```csharp
Flow.Create("Simple Flow")
    .PlayPrompt("Thank you for calling. Goodbye.")
    .Disconnect();
```

### After Queue Transfer

```csharp
Flow.Create("Queue Transfer")
    .TransferToQueue("Support")
    .Disconnect();  // Required after TransferToQueue
```

### In All Branches

```csharp
Flow.Create("Complete Flow")
    .GetCustomerInput("Press 1 for Sales, 2 for Support.")
        .OnDigit("1", sales => sales
            .PlayPrompt("Transferring to Sales.")
            .TransferToQueue("Sales")
            .Disconnect())  // Each branch ends
        .OnDigit("2", support => support
            .PlayPrompt("Transferring to Support.")
            .TransferToQueue("Support")
            .Disconnect())
        .OnDefault(def => def
            .PlayPrompt("Invalid selection. Goodbye.")
            .Disconnect())
        .OnTimeout(timeout => timeout
            .PlayPrompt("No input received. Goodbye.")
            .Disconnect())
        .OnError(error => error
            .PlayPrompt("An error occurred. Goodbye.")
            .Disconnect());
```

### After Lambda Error

```csharp
Flow.Create("Lambda Flow")
    .InvokeLambda("CustomerLookup")
        .OnSuccess(success => success
            .TransferToQueue("Support")
            .Disconnect())
        .OnError(error => error
            .PlayPrompt("Service unavailable. Please try again later.")
            .Disconnect());
```

### Graceful Shutdown

```csharp
Flow.Create("Graceful Exit")
    .PlayPrompt("Thank you for contacting Nick Software.")
    .PlayPrompt("Your feedback is important to us.")
    .PlayPrompt("Have a wonderful day!")
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `DisconnectParticipant` action type in the exported flow JSON.

## Best Practices

1. **Always include Disconnect** - Required after queue transfers
2. **Play goodbye message** - Professional closing
3. **End all branches** - Every path should terminate
4. **Don't orphan contacts** - Ensure flows always end

## See Also

- [EndFlowExecution](./end-flow-execution.md) - End flow without disconnect
- [TransferToQueue](./transfer-to-queue.md) - Queue transfers
