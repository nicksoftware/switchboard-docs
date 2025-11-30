# SetQueueMetrics (GetQueueMetrics)

Retrieve real-time queue statistics such as contacts in queue and oldest contact age.

## Signature

```csharp
IFlowBuilder GetQueueMetrics(
    string queueName, 
    Action<GetCustomerQueueMetricsAction>? configure = null, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueName` | `string` | Yes | Name or ARN of the queue |
| `configure` | `Action<GetCustomerQueueMetricsAction>` | No | Configure metrics retrieval |
| `identifier` | `string?` | No | Optional identifier for the action |

## Available Metrics

After calling `GetQueueMetrics`, these values are available via `Attributes.Queue()`:

| Attribute | Description |
|-----------|-------------|
| `ContactsInQueue` | Number of contacts waiting |
| `OldestContactInQueue` | Age of oldest contact (seconds) |
| `AgentsOnline` | Number of online agents |
| `AgentsAvailable` | Number of available agents |

## Examples

### Basic Queue Status

```csharp
Flow.Create("Queue Status")
    .GetQueueMetrics("SupportQueue")
    .PlayPrompt($"There are currently {Attributes.Queue("ContactsInQueue")} callers ahead of you.")
    .TransferToQueue("SupportQueue")
    .Disconnect();
```

### Dynamic Wait Time Messaging

```csharp
Flow.Create("Wait Time Estimate")
    .GetQueueMetrics("SupportQueue")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Queue("ContactsInQueue"))
            .Equals("0", empty => empty
                .PlayPrompt("You are next! Connecting you now.")
                .TransferToQueue("SupportQueue"))
            .LessThan("5", short => short
                .PlayPrompt("Expected wait time is less than 5 minutes.")
                .TransferToQueue("SupportQueue"))
            .LessThan("15", medium => medium
                .PlayPrompt("Expected wait time is approximately 10 minutes.")
                .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                    .OnDigit("1", wait => wait.TransferToQueue("SupportQueue"))
                    .OnDigit("2", callback => callback
                        .PlayPrompt("We'll call you back.")
                        .Disconnect())
                    .OnDefault(d => d.TransferToQueue("SupportQueue")))
            .Otherwise(long => long
                .PlayPrompt("We're experiencing high call volume. Wait times exceed 20 minutes.")
                .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                    .OnDigit("1", wait => wait.TransferToQueue("SupportQueue"))
                    .OnDigit("2", callback => callback
                        .PlayPrompt("We'll call you back within 2 hours.")
                        .Disconnect())
                    .OnDefault(d => d.TransferToQueue("SupportQueue")));
    })
    .Disconnect();
```

### Queue Selection Based on Status

```csharp
Flow.Create("Smart Queue Selection")
    // Check primary queue
    .GetQueueMetrics("PrimarySupport")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Queue("ContactsInQueue"))
            .LessThan("10", primaryOk => primaryOk
                .PlayPrompt("Connecting to support.")
                .TransferToQueue("PrimarySupport"))
            .Otherwise(primaryBusy => primaryBusy
                // Check overflow queue
                .GetQueueMetrics("OverflowSupport")
                .CheckContactAttribute(overflowCheck =>
                {
                    overflowCheck.Attribute(Attributes.Queue("AgentsAvailable"))
                        .GreaterThan("0", overflowAvailable => overflowAvailable
                            .PlayPrompt("Routing to our overflow team.")
                            .TransferToQueue("OverflowSupport"))
                        .Otherwise(allBusy => allBusy
                            .PlayPrompt("All lines are busy. Please hold.")
                            .TransferToQueue("PrimarySupport"));
                }));
    })
    .Disconnect();
```

### Combined with Staffing Check

```csharp
Flow.Create("Comprehensive Status")
    .GetQueueMetrics("Support")
    .CheckStaffingForQueue("Support", StaffingMetricType.Available)
        .OnTrue(available => available
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.Queue("ContactsInQueue"))
                    .Equals("0", immediate => immediate
                        .PlayPrompt("Connecting you immediately."))
                    .Otherwise(queued => queued
                        .PlayPrompt($"You are caller number {Attributes.Queue("ContactsInQueue")}."));
            })
            .TransferToQueue("Support"))
        .OnFalse(unavailable => unavailable
            .PlayPrompt("All agents are currently busy.")
            .TransferToQueue("Support"))
        .OnError(e => e.TransferToQueue("Support"))
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `GetQueueMetrics` action type in the exported flow JSON.

## Best Practices

1. **Estimate wait times** - Use ContactsInQueue for estimates
2. **Offer alternatives** - Callback when queues are long
3. **Be honest** - Don't overstate availability
4. **Update periodically** - Queue status changes rapidly

## See Also

- [CheckStaffing](../check/check-staffing.md) - Agent availability
- [TransferToQueue](../terminate/transfer-to-queue.md) - Queue transfers
- [CheckContactAttribute](../check/check-contact-attribute.md) - Conditional branching
