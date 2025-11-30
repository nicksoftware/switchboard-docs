# EndFlowExecution

End the current flow without disconnecting the contact. Used in whisper flows and subflows.

## Signature

```csharp
IFlowBuilder EndFlowExecution(string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | `string?` | No | Optional identifier for the action |

## When to Use

| Scenario | Use EndFlowExecution |
|----------|---------------------|
| Agent whisper flow | ✅ Yes |
| Customer whisper flow | ✅ Yes |
| Subflow returning to parent | ✅ Yes |
| Main contact flow ending | ❌ No, use Disconnect |
| Queue transfer | ❌ No, use Disconnect |

## Examples

### Agent Whisper Flow

```csharp
Flow.Create("VIPAgentWhisper")
    .SetType(FlowType.AgentWhisper)
    .SetDescription("Notifies agent of VIP customer")
    .PlayPrompt(message =>
    {
        message.SSML = @"<speak>
            <emphasis level='strong'>VIP Customer</emphasis>
            <break time='300ms'/>
            Account: <say-as interpret-as='digits'>" + Attributes.Contact("AccountId") + @"</say-as>
        </speak>";
    })
    .EndFlowExecution();  // Returns control, doesn't disconnect
```

### Customer Whisper Flow

```csharp
Flow.Create("CustomerWhisper")
    .SetType(FlowType.CustomerWhisper)
    .SetDescription("Plays to customer before agent connection")
    .PlayPrompt("Your call is now being connected to an agent.")
    .EndFlowExecution();
```

### Subflow with Return

```csharp
// Authentication subflow
Flow.Create("AuthenticationFlow")
    .SetType(FlowType.ContactFlow)
    .StoreCustomerInput("Enter your PIN.", input => input.MaxDigits = 4)
        .OnSuccess(s => s
            .InvokeLambda("ValidatePIN")
                .OnSuccess(valid => valid
                    .SetContactAttributes(attrs => attrs["Authenticated"] = "true")
                    .EndFlowExecution())  // Return to calling flow
                .OnError(invalid => invalid
                    .SetContactAttributes(attrs => attrs["Authenticated"] = "false")
                    .EndFlowExecution()))
        .OnError(e => e
            .SetContactAttributes(attrs => attrs["Authenticated"] = "false")
            .EndFlowExecution());

// Main flow calls authentication
Flow.Create("MainFlow")
    .TransferToFlow("AuthenticationFlow")
    // Execution continues here after EndFlowExecution
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("Authenticated"))
            .Equals("true", auth => auth.TransferToQueue("Authenticated"))
            .Otherwise(unauth => unauth.TransferToQueue("General"));
    })
    .Disconnect();
```

### Hold Flow

```csharp
Flow.Create("CustomerHold")
    .SetType(FlowType.CustomerHold)
    .PlayPrompt("Please continue to hold. Your call is important to us.")
    .Wait(30)
    .PlayPrompt("Thank you for your patience.")
    .EndFlowExecution();  // Loop back to hold music
```

### Queue Flow

```csharp
Flow.Create("CustomerQueue")
    .SetType(FlowType.CustomerQueue)
    .PlayPrompt("You are caller number 5 in the queue.")
    .PlayPrompt("Expected wait time is approximately 10 minutes.")
    .EndFlowExecution();  // Continue queue handling
```

## Difference from Disconnect

| Aspect | EndFlowExecution | Disconnect |
|--------|-----------------|------------|
| Contact state | Active | Ended |
| Agent connection | Can proceed | Terminated |
| Use case | Whispers, subflows | End of interaction |
| Flow type | Any | Contact flows only |

## AWS Connect Block Type

This block generates the `EndFlowExecution` action type in the exported flow JSON.

## Best Practices

1. **Use in whisper flows** - Required for proper whisper termination
2. **Use in subflows** - When returning to parent flow
3. **Don't use for main flows** - Use Disconnect instead
4. **Set attributes before ending** - Pass data back to parent

## See Also

- [Disconnect](./disconnect.md) - End contact completely
- [TransferToFlow](./transfer-to-flow.md) - Call subflows
- [SetWhisperFlow](../set/set-whisper-flow.md) - Configure whispers
