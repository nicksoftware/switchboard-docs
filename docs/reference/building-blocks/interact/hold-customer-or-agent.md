# HoldCustomerOrAgent

Place the customer or agent on hold during a call. This block is typically used in agent whisper flows or when the agent needs to consult with a supervisor.

## Signature

```csharp
IFlowBuilder HoldCustomerOrAgent(
    HoldTarget target, 
    Action<HoldConfiguration>? configure = null,
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | `HoldTarget` | Yes | Who to place on hold: `Customer` or `Agent` |
| `configure` | `Action<HoldConfiguration>` | No | Configure hold settings |
| `identifier` | `string?` | No | Optional identifier for the action |

## HoldTarget Values

| Value | Description |
|-------|-------------|
| `Customer` | Place the customer on hold |
| `Agent` | Place the agent on hold |

## HoldConfiguration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `HoldMusic` | `string?` | `null` | Custom hold music prompt |

## Examples

### Basic Customer Hold

```csharp
Flow.Create("Consultation Flow")
    .PlayPrompt("Please hold while I consult with my supervisor.")
    .HoldCustomerOrAgent(HoldTarget.Customer)
    // Agent can now speak to supervisor
    .PlayPrompt("Thank you for holding.")
    .TransferToQueue("Support");
```

### Agent Whisper with Hold

```csharp
Flow.Create("Agent Whisper")
    .SetType(FlowType.AgentWhisper)
    .PlayPrompt("Incoming call from a VIP customer.")
    .HoldCustomerOrAgent(HoldTarget.Agent)
    // Customer hears welcome while agent prepares
    .EndFlowExecution();
```

## AWS Connect Block Type

This block generates the `HoldParticipant` action type in the exported flow JSON.

## Best Practices

1. **Inform the customer** - Always play a message before placing on hold
2. **Keep hold time short** - Monitor hold duration
3. **Use in whisper flows** - Common in agent whisper scenarios
4. **Consider hold music** - Provide pleasant experience during hold

## See Also

- [SetWhisperFlow](../set/set-whisper-flow.md) - Configure whisper flows
- [PlayPrompt](./play-prompt.md) - Announce hold to customer
