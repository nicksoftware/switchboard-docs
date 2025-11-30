# SetWhisperFlow

Configure whisper flows that play to agents or customers before connecting.

## Signature

```csharp
IFlowBuilder SetWhisperFlow(
    string flowName, 
    string whisperType = "Agent", 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flowName` | `string` | Yes | Name or ARN of the whisper flow |
| `whisperType` | `string` | No | Type: "Agent", "Customer", or "Both" (default: "Agent") |
| `identifier` | `string?` | No | Optional identifier for the action |

## Whisper Types

| Type | Description |
|------|-------------|
| `Agent` | Plays to agent before connecting to customer |
| `Customer` | Plays to customer while waiting for agent |
| `Both` | Plays to both parties |

## Examples

### Agent Whisper for VIP

```csharp
Flow.Create("VIP Routing")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("Tier"))
                    .Equals("VIP", vip => vip
                        .SetWhisperFlow("VIPAgentWhisper", "Agent")
                        .TransferToQueue("VIPSupport"))
                    .Otherwise(regular => regular
                        .TransferToQueue("General"));
            }))
        .OnError(e => e.TransferToQueue("General"))
    .Disconnect();
```

### Customer Whisper

```csharp
Flow.Create("Customer Notification")
    .SetWhisperFlow("CustomerConnectingWhisper", "Customer")
    .TransferToQueue("Support")
    .Disconnect();
```

### Creating a Whisper Flow

```csharp
// Agent whisper flow
Flow.Create("VIPAgentWhisper")
    .SetType(FlowType.AgentWhisper)
    .SetDescription("Notifies agent of VIP customer")
    .PlayPrompt($"VIP customer: {Attributes.Contact("CustomerName")}. Account: {Attributes.Contact("AccountId")}.")
    .EndFlowExecution();
```

## AWS Connect Block Type

This block generates the `UpdateContactTargetQueue` action with whisper configuration.

## Best Practices

1. **Keep whispers short** - 2-5 seconds maximum
2. **Include relevant info** - Customer name, tier, issue summary
3. **Use SSML** - Control timing and emphasis
4. **Test timing** - Ensure whisper completes before connection

## See Also

- [TransferToQueue](../terminate/transfer-to-queue.md) - Queue transfers
- [PlayPrompt](../interact/play-prompt.md) - Audio prompts
- [EndFlowExecution](../terminate/end-flow-execution.md) - End whisper flow
