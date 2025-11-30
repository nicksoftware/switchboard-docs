# SetLoggingBehavior

Enable or disable contact flow logging for the contact.

## Signatures

```csharp
// Simple boolean
IFlowBuilder SetLoggingBehavior(bool enabled, string? identifier = null)

// With configuration
IFlowBuilder SetLoggingBehavior(
    Action<SetLoggingBehaviorAction> configure, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enabled` | `bool` | Yes | Enable or disable logging |
| `configure` | `Action<SetLoggingBehaviorAction>` | Yes | Configure logging behavior |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Enable Logging

```csharp
Flow.Create("Logged Flow")
    .SetLoggingBehavior(true)
    .PlayPrompt("This interaction is being logged.")
    .TransferToQueue("Support")
    .Disconnect();
```

### Disable Logging for Sensitive Data

```csharp
Flow.Create("Payment Flow")
    .SetLoggingBehavior(true)  // Log initial interactions
    .PlayPrompt("Welcome to payment processing.")
    
    // Disable logging before collecting sensitive info
    .SetLoggingBehavior(false)
    .StoreCustomerInput("Enter your credit card number.", input =>
    {
        input.MaxDigits = 16;
        input.EncryptInput = true;
    })
    .OnSuccess(s => s
        .InvokeLambda("ProcessPayment")
            .OnSuccess(paid => paid
                .SetLoggingBehavior(true)  // Re-enable after sensitive section
                .PlayPrompt("Payment processed successfully."))
            .OnError(e => e
                .SetLoggingBehavior(true)
                .PlayPrompt("Payment failed.")))
    .OnError(e => e
        .SetLoggingBehavior(true)
        .PlayPrompt("Invalid entry."))
    .Disconnect();
```

### Conditional Logging

```csharp
Flow.Create("Debug Mode")
    .InvokeLambda("GetConfig")
        .OnSuccess(s => s
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("DebugMode"))
                    .Equals(true, debug => debug
                        .SetLoggingBehavior(true)
                        .PlayPrompt("Debug logging enabled."))
                    .Otherwise(prod => prod
                        .SetLoggingBehavior(false));
            }))
        .OnError(e => e.SetLoggingBehavior(false))
    .TransferToQueue("Support")
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `UpdateContactEventLogging` action type in the exported flow JSON.

## Best Practices

1. **Enable for debugging** - Helps troubleshoot flow issues
2. **Disable for PCI compliance** - Don't log credit card collection
3. **Re-enable after sensitive sections** - Return to normal logging
4. **Consider storage costs** - Logs consume CloudWatch storage

## See Also

- [SetRecordingBehavior](./set-recording-behavior.md) - Call recording
- [StoreCustomerInput](../interact/store-customer-input.md) - Sensitive input
