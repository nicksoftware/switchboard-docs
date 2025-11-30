# Terminate Blocks

Terminate blocks end or transfer the contact flow.

## Blocks in this Category

- [Disconnect](./disconnect.md) - End the contact
- [EndFlowExecution](./end-flow-execution.md) - End the current flow without disconnecting
- [TransferToQueue](./transfer-to-queue.md) - Transfer to an agent queue
- [TransferToFlow](./transfer-to-flow.md) - Transfer to another flow
- [TransferToThirdParty](./transfer-to-third-party.md) - Transfer to external phone number

## Overview

Terminate blocks define how a contact flow ends:

- **Disconnect** - Completely end the call
- **EndFlowExecution** - Return to a parent flow
- **TransferToQueue** - Connect to an agent
- **TransferToFlow** - Continue in another flow
- **TransferToThirdParty** - Connect to external number

## Common Patterns

### Menu with Transfers

```csharp
Flow.Create("Main Menu")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, 3 to disconnect.")
        .OnDigit("1", sales => sales
            .TransferToQueue("Sales")
            .Disconnect())
        .OnDigit("2", support => support
            .TransferToQueue("Support")
            .Disconnect())
        .OnDigit("3", bye => bye
            .PlayPrompt("Thank you for calling. Goodbye.")
            .Disconnect())
        .OnDefault(d => d.Disconnect())
        .OnTimeout(t => t.Disconnect());
```

### Graceful Disconnect

```csharp
Flow.Create("Graceful Exit")
    .PlayPrompt("Thank you for calling Nick Software.")
    .PlayPrompt("Have a great day!")
    .Disconnect();
```

### Whisper Flow Pattern

```csharp
// Whisper flows use EndFlowExecution
Flow.Create("AgentWhisper")
    .SetType(FlowType.AgentWhisper)
    .PlayPrompt("VIP Customer from account 12345.")
    .EndFlowExecution();  // Returns control to the system
```

## Best Practices

1. **Always end flows** - Every path should terminate
2. **Say goodbye** - Play a closing message before disconnect
3. **Use appropriate termination** - Match the use case
4. **Handle errors** - Error paths should terminate properly
