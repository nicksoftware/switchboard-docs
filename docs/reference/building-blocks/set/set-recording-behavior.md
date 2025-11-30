# SetRecordingBehavior

Enable or disable call recording for the contact.

## Signature

```csharp
IFlowBuilder SetRecordingBehavior(bool enabled, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enabled` | `bool` | Yes | Enable or disable recording |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Enable Recording

```csharp
Flow.Create("Recorded Call")
    .SetRecordingBehavior(true)
    .PlayPrompt("This call may be recorded for quality and training purposes.")
    .TransferToQueue("Support")
    .Disconnect();
```

### Pause for Sensitive Data

```csharp
Flow.Create("Payment Flow")
    .SetRecordingBehavior(true)
    .PlayPrompt("Your call is being recorded.")
    .GetCustomerInput("Press 1 to make a payment.")
        .OnDigit("1", payment => payment
            // Pause recording for payment info
            .SetRecordingBehavior(false)
            .PlayPrompt("Recording paused. Please enter your card number.")
            .StoreCustomerInput("Card number:", input => input.MaxDigits = 16)
                .OnSuccess(s => s
                    .InvokeLambda("ProcessPayment")
                        .OnSuccess(paid => paid
                            // Resume recording
                            .SetRecordingBehavior(true)
                            .PlayPrompt("Recording resumed. Payment successful."))
                        .OnError(e => e
                            .SetRecordingBehavior(true)
                            .PlayPrompt("Payment failed.")))
                .OnError(e => e.Disconnect()))
        .OnDefault(d => d.TransferToQueue("Support"))
    .Disconnect();
```

### VIP Recording Option

```csharp
Flow.Create("VIP Recording")
    .InvokeLambda("GetCustomerPreferences")
        .OnSuccess(s => s
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("AllowRecording"))
                    .Equals(true, allow => allow
                        .SetRecordingBehavior(true)
                        .PlayPrompt("Your call will be recorded."))
                    .Otherwise(deny => deny
                        .SetRecordingBehavior(false)
                        .PlayPrompt("Per your preferences, this call will not be recorded."));
            }))
        .OnError(e => e.SetRecordingBehavior(true))
    .TransferToQueue("VIP")
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `UpdateContactRecordingBehavior` action type in the exported flow JSON.

## Best Practices

1. **Notify customers** - Announce recording per legal requirements
2. **Pause for sensitive data** - Disable during payment collection
3. **Resume after sensitive sections** - Return to recording
4. **Consider compliance** - GDPR, PCI-DSS requirements

## See Also

- [SetLoggingBehavior](./set-logging-behavior.md) - Flow logging
- [StoreCustomerInput](../interact/store-customer-input.md) - Sensitive input collection
