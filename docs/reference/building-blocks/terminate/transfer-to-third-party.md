# TransferToThirdParty

Transfer the contact to an external phone number outside of Amazon Connect.

## Signature

```csharp
IFlowBuilder TransferToThirdParty(
    string phoneNumber, 
    int timeoutSeconds = 30, 
    bool continueFlowExecution = true, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumber` | `string` | Yes | Phone number in E.164 format (e.g., "+12025551234") |
| `timeoutSeconds` | `int` | No | Connection timeout (default: 30) |
| `continueFlowExecution` | `bool` | No | Continue flow after transfer (default: true) |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Basic External Transfer

```csharp
Flow.Create("External Transfer")
    .PlayPrompt("Transferring you to our partner company.")
    .TransferToThirdParty("+18005551234")
    .Disconnect();
```

### With Timeout

```csharp
Flow.Create("Transfer with Timeout")
    .PlayPrompt("Connecting you to our external support team.")
    .TransferToThirdParty("+18005551234", timeoutSeconds: 45)
    .Disconnect();
```

### Vendor Routing

```csharp
Flow.Create("Vendor Router")
    .GetCustomerInput("Press 1 for our billing partner, 2 for our warranty provider.")
        .OnDigit("1", billing => billing
            .PlayPrompt("Connecting to billing services.")
            .TransferToThirdParty("+18005551111")
            .Disconnect())
        .OnDigit("2", warranty => warranty
            .PlayPrompt("Connecting to warranty services.")
            .TransferToThirdParty("+18005552222")
            .Disconnect())
        .OnDefault(def => def.TransferToQueue("General").Disconnect());
```

### Emergency Services

```csharp
Flow.Create("Emergency Transfer")
    .GetCustomerInput("For emergency services, press 1.")
        .OnDigit("1", emergency => emergency
            .PlayPrompt("Connecting to emergency services.")
            .TransferToThirdParty("+18005559911", timeoutSeconds: 60)
            .Disconnect())
        .OnDefault(def => def.TransferToQueue("Support").Disconnect());
```

### Dynamic External Number

```csharp
Flow.Create("Dynamic External")
    .InvokeLambda("GetVendorNumber")
        .OnSuccess(s => s
            .SetContactAttributes(attrs =>
            {
                attrs["ExternalNumber"] = Attributes.External("VendorPhone");
            })
            // Note: For dynamic numbers, you may need to use Lambda
            // or predefined number mappings
            .PlayPrompt("Connecting to our vendor.")
            .TransferToThirdParty("+18005551234"))
        .OnError(e => e.TransferToQueue("Support"))
    .Disconnect();
```

## Phone Number Format

Phone numbers must be in E.164 format:
- Start with `+`
- Country code
- No spaces, dashes, or parentheses

Examples:
- US: `+12025551234`
- UK: `+442071234567`
- Australia: `+61212345678`

## AWS Connect Block Type

This block generates the `TransferParticipantToThirdParty` action type in the exported flow JSON.

## Best Practices

1. **Use E.164 format** - Required for international compatibility
2. **Set appropriate timeout** - Allow enough time for connection
3. **Announce transfer** - Tell customer before transferring
4. **Have fallback** - Handle connection failures
5. **Log external transfers** - Track for billing and analytics

## See Also

- [TransferToQueue](./transfer-to-queue.md) - Transfer to internal queue
- [TransferToFlow](./transfer-to-flow.md) - Transfer to another flow
- [Disconnect](./disconnect.md) - End contact
