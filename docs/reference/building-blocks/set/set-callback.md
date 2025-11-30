# SetCallback

Configure callback settings for the contact.

## Signature

```csharp
IFlowBuilder SetCallbackNumber(string phoneNumber, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | `string` | Yes | Callback number or attribute reference |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Use Caller's Number

```csharp
Flow.Create("Callback Setup")
    .SetCallbackNumber(Attributes.System(SystemAttributes.CustomerEndpointAddress))
    .PlayPrompt("We will call you back at the number you called from.")
    .Disconnect();
```

### Collect Callback Number

```csharp
Flow.Create("Custom Callback")
    .GetCustomerInput("Press 1 to use your current number, or 2 to enter a different number.")
        .OnDigit("1", current => current
            .SetCallbackNumber(Attributes.System(SystemAttributes.CustomerEndpointAddress))
            .PlayPrompt("We'll call you back at your current number."))
        .OnDigit("2", different => different
            .StoreCustomerInput("Enter the callback number.", input => input.MaxDigits = 10)
                .OnSuccess(s => s
                    .SetCallbackNumber(Attributes.System(SystemAttributes.StoredCustomerInput))
                    .PlayPrompt("We'll call you back at the number you entered."))
                .OnError(e => e.PlayPrompt("Invalid number.")))
        .OnDefault(d => d.Disconnect())
    .Disconnect();
```

### From Lambda Response

```csharp
Flow.Create("Verified Callback")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s
            .SetContactAttributes(attrs =>
            {
                attrs["PreferredPhone"] = Attributes.External("PreferredPhone");
            })
            .SetCallbackNumber(Attributes.Contact("PreferredPhone"))
            .PlayPrompt($"We'll call you back at {Attributes.External("PreferredPhone")}."))
        .OnError(e => e
            .SetCallbackNumber(Attributes.System(SystemAttributes.CustomerEndpointAddress)))
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `UpdateContactTargetQueue` action with callback number configuration.

## Best Practices

1. **Validate numbers** - Use Lambda to verify format
2. **Confirm with customer** - Read back the callback number
3. **Handle international** - Support E.164 format

## See Also

- [StoreCustomerInput](../interact/store-customer-input.md) - Collect phone numbers
- [SetContactAttributes](./set-contact-attributes.md) - Store callback info
