# Set Blocks

Set blocks configure contact properties, behaviors, and retrieve metrics.

## Blocks in this Category

- [SetContactAttributes](./set-contact-attributes.md) - Set or update contact attributes
- [SetLoggingBehavior](./set-logging-behavior.md) - Enable or disable flow logging
- [SetRecordingBehavior](./set-recording-behavior.md) - Control call recording
- [SetWhisperFlow](./set-whisper-flow.md) - Configure whisper flows for agents
- [SetQueueMetrics](./set-queue-metrics.md) - Retrieve queue statistics
- [SetCallback](./set-callback.md) - Configure callback settings

## Overview

Set blocks allow you to:

- **Store customer data** - Account info, preferences, selections
- **Configure behaviors** - Logging, recording, whispers
- **Prepare for routing** - Set working queue, callback number
- **Gather metrics** - Queue status, wait times

## Common Patterns

### Storing Customer Information

```csharp
Flow.Create("Customer Setup")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s.SetContactAttributes(attrs =>
        {
            attrs["CustomerName"] = Attributes.External("Name");
            attrs["AccountId"] = Attributes.External("AccountId");
            attrs["CustomerTier"] = Attributes.External("Tier");
        }))
        .OnError(e => e.PlayPrompt("Welcome!"))
    .PlayPrompt($"Welcome, {Attributes.Contact("CustomerName")}!")
    .TransferToQueue("Support");
```

### Enabling Features

```csharp
Flow.Create("Configured Flow")
    .SetLoggingBehavior(true)
    .SetRecordingBehavior(true)
    .SetWhisperFlow("AgentWhisper")
    .PlayPrompt("Your call may be recorded.")
    .TransferToQueue("Support");
```

### Queue Selection

```csharp
Flow.Create("Queue Selection")
    .GetCustomerInput("Press 1 for Sales, 2 for Support.")
        .OnDigit("1", s => s.SetWorkingQueue("Sales"))
        .OnDigit("2", s => s.SetWorkingQueue("Support"))
        .OnDefault(d => d.SetWorkingQueue("General"))
    .TransferToQueue("$.Attributes.SelectedQueue");  // Dynamic transfer
```

## Attribute Types

| Type | Description | Persistence |
|------|-------------|-------------|
| Contact Attributes | User-defined values | Persist for contact duration |
| Flow Attributes | Temporary variables | Only in current flow |
| Segment Attributes | Complex nested values | For analytics/reporting |

## See Also

- [Attributes Reference](../attributes.md) - Attribute types and access patterns
