# TransferToQueue

Transfer the contact to an agent queue for handling by an agent.

## Signatures

```csharp
// Static queue name
IFlowBuilder TransferToQueue(string queueName, string? identifier = null)

// Dynamic queue from attribute
IFlowBuilder TransferToQueueDynamic(string attributePath, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | `string` | Yes | Name or ARN of the queue |
| `attributePath` | `string` | Yes | JSONPath to attribute containing queue ARN |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Basic Transfer

```csharp
Flow.Create("Simple Transfer")
    .PlayPrompt("Transferring you to support.")
    .TransferToQueue("SupportQueue")
    .Disconnect();
```

### Menu-Based Routing

```csharp
Flow.Create("Menu Routing")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, 3 for Billing.")
        .OnDigit("1", sales => sales
            .PlayPrompt("Transferring to Sales.")
            .TransferToQueue("Sales")
            .Disconnect())
        .OnDigit("2", support => support
            .PlayPrompt("Transferring to Support.")
            .TransferToQueue("Support")
            .Disconnect())
        .OnDigit("3", billing => billing
            .PlayPrompt("Transferring to Billing.")
            .TransferToQueue("Billing")
            .Disconnect())
        .OnDefault(def => def
            .TransferToQueue("General")
            .Disconnect())
        .OnTimeout(t => t
            .TransferToQueue("General")
            .Disconnect());
```

### With Whisper Flow

```csharp
Flow.Create("VIP Transfer")
    .SetWhisperFlow("VIPAgentWhisper", "Agent")
    .PlayPrompt("Connecting you to a VIP specialist.")
    .TransferToQueue("VIPSupport")
    .Disconnect();
```

### Dynamic Queue Transfer

```csharp
Flow.Create("Dynamic Routing")
    .InvokeLambda("GetRoutingInfo")
        .OnSuccess(s => s
            .SetContactAttributes(attrs =>
            {
                attrs["TargetQueue"] = Attributes.External("QueueArn");
            })
            .TransferToQueueDynamic("$.Attributes.TargetQueue"))
        .OnError(e => e
            .TransferToQueue("Fallback"))
    .Disconnect();
```

### With Queue Metrics

```csharp
Flow.Create("Informed Transfer")
    .GetQueueMetrics("SupportQueue")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Queue("ContactsInQueue"))
            .LessThan("5", low => low
                .PlayPrompt("Your call will be answered shortly.")
                .TransferToQueue("SupportQueue"))
            .Otherwise(high => high
                .PlayPrompt($"There are {Attributes.Queue("ContactsInQueue")} callers ahead of you.")
                .TransferToQueue("SupportQueue"));
    })
    .Disconnect();
```

### With Staffing Check

```csharp
Flow.Create("Smart Transfer")
    .CheckStaffingForQueue("PrimaryQueue", StaffingMetricType.Available)
        .OnTrue(available => available
            .PlayPrompt("Connecting you now.")
            .TransferToQueue("PrimaryQueue"))
        .OnFalse(unavailable => unavailable
            .CheckStaffingForQueue("BackupQueue", StaffingMetricType.Available)
                .OnTrue(backup => backup
                    .PlayPrompt("Routing to our backup team.")
                    .TransferToQueue("BackupQueue"))
                .OnFalse(none => none
                    .PlayPrompt("Please hold for the next available agent.")
                    .TransferToQueue("PrimaryQueue"))
                .OnError(e => e.TransferToQueue("PrimaryQueue")))
        .OnError(e => e.TransferToQueue("PrimaryQueue"))
    .Disconnect();
```

### VIP Priority Routing

```csharp
Flow.Create("Priority Routing")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("Tier"))
                    .Equals("VIP", vip => vip
                        .SetWhisperFlow("VIPWhisper")
                        .TransferToQueue("VIPQueue"))
                    .Equals("Premium", premium => premium
                        .TransferToQueue("PremiumQueue"))
                    .Otherwise(standard => standard
                        .TransferToQueue("StandardQueue"));
            }))
        .OnError(e => e.TransferToQueue("StandardQueue"))
    .Disconnect();
```

### With Set Working Queue

```csharp
Flow.Create("Working Queue Pattern")
    // Set working queue first
    .SetWorkingQueue("SupportQueue")
    
    // Get metrics for working queue
    .GetQueueMetrics("SupportQueue")
    
    // Transfer to working queue
    .TransferToQueue("SupportQueue")
    .Disconnect();
```

## Important Notes

1. **Always call Disconnect after TransferToQueue** - Required for proper flow termination
2. **Queue must exist** - Reference valid queue names or ARNs
3. **Whisper flows play during transfer** - Configure before transfer

## AWS Connect Block Type

This block generates the `TransferContactToQueue` action type in the exported flow JSON.

## Best Practices

1. **Announce transfers** - Tell customer what's happening
2. **Set whisper flows** - Prepare agents for the call
3. **Use staffing checks** - Route intelligently
4. **Provide wait estimates** - Use queue metrics
5. **Have fallbacks** - Handle queue unavailability

## See Also

- [CheckStaffing](../check/check-staffing.md) - Agent availability
- [SetQueueMetrics](../set/set-queue-metrics.md) - Queue statistics
- [SetWhisperFlow](../set/set-whisper-flow.md) - Agent preparation
- [Disconnect](./disconnect.md) - End contact after transfer
