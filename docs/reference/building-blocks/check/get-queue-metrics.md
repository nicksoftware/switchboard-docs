# GetQueueMetrics

Retrieve real-time queue metrics such as contacts in queue and oldest contact age. Supports filtering by channel (Voice, Chat, Task, Email) and querying by queue or agent.

## Signatures

```csharp
// Get metrics for current queue context
IFlowBuilder GetQueueMetrics(
    QueueMetricChannel? channel = null,
    string? identifier = null)

// Get metrics for a specific queue
IFlowBuilder GetQueueMetricsForQueue(
    string queueNameOrArn,
    QueueMetricChannel? channel = null,
    string? identifier = null)

// Get metrics for a specific agent
IFlowBuilder GetQueueMetricsForAgent(
    string agentArn,
    QueueMetricChannel? channel = null,
    string? identifier = null)

// Get metrics with dynamic channel from attribute
IFlowBuilder GetQueueMetricsDynamicChannel(
    string? queueNameOrArn,
    string channelAttribute,
    string? identifier = null)
```

## Parameters

| Parameter          | Type                  | Required | Description                                        |
| ------------------ | --------------------- | -------- | -------------------------------------------------- |
| `queueNameOrArn`   | `string`              | Yes      | Queue name or ARN to retrieve metrics for          |
| `agentArn`         | `string`              | Yes      | Agent ARN to retrieve metrics for                  |
| `channel`          | `QueueMetricChannel?` | No       | Channel type filter (Voice, Chat, Task, Email)     |
| `channelAttribute` | `string`              | Yes      | Attribute reference for dynamic channel resolution |
| `identifier`       | `string?`             | No       | Optional identifier for the action                 |

## QueueMetricChannel Values

| Value   | Description        |
| ------- | ------------------ |
| `Voice` | Voice calls        |
| `Chat`  | Chat conversations |
| `Task`  | Task items         |
| `Email` | Email interactions |

## Available Metrics

After calling `GetQueueMetrics`, these values are available via `Attributes.Metrics()` or the `QueueMetrics` helper class:

| Helper Property                 | Attribute Path                     | Description                          |
| ------------------------------- | ---------------------------------- | ------------------------------------ |
| `QueueMetrics.QueueSize`        | `$.Metrics.Queue.Size`             | Number of contacts waiting in queue  |
| `QueueMetrics.OldestContactAge` | `$.Metrics.Queue.OldestContactAge` | Age of oldest contact (in seconds)   |
| `QueueMetrics.AgentsAvailable`  | `$.Metrics.Agents.Available.Count` | Number of agents available for calls |
| `QueueMetrics.AgentsOnline`     | `$.Metrics.Agents.Online.Count`    | Number of agents logged in           |
| `QueueMetrics.AgentsStaffed`    | `$.Metrics.Agents.Staffed.Count`   | Number of agents assigned to queue   |

### Accessing Metrics

```csharp
// Using QueueMetrics helper (type-safe)
.CheckContactAttribute(check => check
    .Attribute(QueueMetrics.QueueSize)
    .Equals(0, noWait => noWait.TransferToQueue("Support")))

// Using Attributes.Metrics() (flexible)
.CheckContactAttribute(check => check
    .Attribute(Attributes.Metrics("Queue.Size"))
    .Equals(0, noWait => noWait.TransferToQueue("Support")))
```

## Examples

### Basic Queue Metrics

```csharp
Flow.Create("Queue Status")
    .GetQueueMetrics()
    .CheckContactAttribute(check => check
        .Attribute(QueueMetrics.QueueSize)
        .Equals(0, noWait => noWait
            .PlayPrompt("No callers ahead of you!")
            .TransferToQueue("SupportQueue")
            .Disconnect())
        .Otherwise(hasWait => hasWait
            .PlayPrompt("There are callers ahead of you.")
            .TransferToQueue("SupportQueue")
            .Disconnect()))
    .Disconnect();
```

### Metrics for Specific Queue

```csharp
Flow.Create("Specific Queue Status")
    .GetQueueMetricsForQueue("SupportQueue")
    .PlayPrompt($"Support queue has {Attributes.Queue("ContactsInQueue")} waiting.")
    .Disconnect();
```

### Metrics with Channel Filter

```csharp
Flow.Create("Voice Queue Status")
    .GetQueueMetricsForQueue("SupportQueue", QueueMetricChannel.Voice)
    .PlayPrompt($"Voice queue: {Attributes.Queue("ContactsInQueue")} calls waiting.")
    .Disconnect();
```

### Chat Channel Metrics

```csharp
Flow.Create("Chat Queue Status")
    .GetQueueMetrics(QueueMetricChannel.Chat)
    .PlayPrompt($"Chat queue: {Attributes.Queue("ContactsInQueue")} conversations waiting.")
    .Disconnect();
```

### Agent-Specific Metrics

```csharp
Flow.Create("Agent Queue Metrics")
    .GetQueueMetricsForAgent("arn:aws:connect:us-east-1:123456789012:instance/abc/agent/xyz", QueueMetricChannel.Voice)
    .PlayPrompt("Retrieved agent queue metrics.")
    .Disconnect();
```

### Dynamic Channel from Attribute

```csharp
Flow.Create("Dynamic Channel Metrics")
    .SetContactAttributes(attrs => attrs["SelectedChannel"] = "Voice")
    .GetQueueMetricsDynamicChannel("SupportQueue", "$.Attributes.SelectedChannel")
    .PlayPrompt($"Queue has {Attributes.Queue("ContactsInQueue")} contacts waiting.")
    .Disconnect();
```

### Wait Time Messaging

```csharp
Flow.Create("Wait Time Estimate")
    .GetQueueMetricsForQueue("SupportQueue", QueueMetricChannel.Voice)
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Queue("ContactsInQueue"))
            .Equals("0", empty => empty
                .PlayPrompt("You are next! Connecting you now.")
                .TransferToQueue("SupportQueue")
                .Disconnect())
            .LessThan("5", shortWait => shortWait
                .PlayPrompt("Expected wait time is less than 5 minutes.")
                .TransferToQueue("SupportQueue")
                .Disconnect())
            .LessThan("15", mediumWait => mediumWait
                .PlayPrompt("Expected wait time is approximately 10 minutes.")
                .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                    .OnDigit("1", wait => wait.TransferToQueue("SupportQueue").Disconnect())
                    .OnDigit("2", callback => callback
                        .PlayPrompt("We'll call you back.")
                        .Disconnect())
                    .OnTimeout(t => t.TransferToQueue("SupportQueue").Disconnect())
                    .OnDefault(d => d.TransferToQueue("SupportQueue").Disconnect())
                    .OnError(e => e.TransferToQueue("SupportQueue").Disconnect()))
            .Otherwise(longWait => longWait
                .PlayPrompt("We're experiencing high call volume. Wait times exceed 20 minutes.")
                .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                    .OnDigit("1", wait => wait.TransferToQueue("SupportQueue").Disconnect())
                    .OnDigit("2", callback => callback
                        .PlayPrompt("We'll call you back within 2 hours.")
                        .Disconnect())
                    .OnTimeout(t => t.TransferToQueue("SupportQueue").Disconnect())
                    .OnDefault(d => d.TransferToQueue("SupportQueue").Disconnect())
                    .OnError(e => e.TransferToQueue("SupportQueue").Disconnect()));
    })
    .Disconnect();
```

### Queue Selection Based on Metrics

```csharp
Flow.Create("Smart Queue Selection")
    // Check primary queue metrics
    .GetQueueMetricsForQueue("PrimarySupport", QueueMetricChannel.Voice)
    .CheckContactAttribute(check =>
    {
        check.Attribute(QueueMetrics.QueueSize)
            // Empty queue - connect immediately
            .Equals(0, primaryOk => primaryOk
                .PlayPrompt("Connecting to support.")
                .TransferToQueue("PrimarySupport")
                .Disconnect())
            .Otherwise(primaryBusy => primaryBusy
                // Check overflow queue
                .GetQueueMetricsForQueue("OverflowSupport", QueueMetricChannel.Voice)
                .CheckContactAttribute(overflowCheck =>
                {
                    overflowCheck.Attribute(QueueMetrics.QueueSize)
                        .Equals(0, overflowAvailable => overflowAvailable
                            .PlayPrompt("Routing to our overflow team.")
                            .TransferToQueue("OverflowSupport")
                            .Disconnect())
                        .Otherwise(allBusy => allBusy
                            .PlayPrompt("All lines are busy. Please hold.")
                            .TransferToQueue("PrimarySupport")
                            .Disconnect());
                })
                .Disconnect());
    })
    .Disconnect();
```

### Using CheckContactAttribute with QueueMetrics

```csharp
Flow.Create("Metrics-Based Routing")
    .GetQueueMetricsForQueue("Support", QueueMetricChannel.Voice)

    // Branch based on queue size using type-safe QueueMetrics helper
    .CheckContactAttribute(check =>
    {
        check.Attribute(QueueMetrics.QueueSize)
            // No callers waiting
            .Equals(0, empty => empty
                .PlayPrompt("No wait! Connecting you now.")
                .TransferToQueue("Support")
                .Disconnect())
            // Default: callers waiting
            .Otherwise(hasCallers => hasCallers
                .PlayPrompt("There are callers ahead of you.")
                .TransferToQueue("Support")
                .Disconnect());
    })
    .Disconnect();
```

### Combined with Staffing and Hours Check

```csharp
Flow.Create("Comprehensive Status")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(open => open
            .CheckStaffingForQueue("Support", StaffingMetricType.Available)
                .OnTrue(available => available
                    .GetQueueMetricsForQueue("Support", QueueMetricChannel.Voice)
                    .CheckContactAttribute(check =>
                    {
                        check.Attribute(QueueMetrics.QueueSize)
                            .Equals(0, immediate => immediate
                                .PlayPrompt("Connecting you immediately.")
                                .TransferToQueue("Support")
                                .Disconnect())
                            .Otherwise(queued => queued
                                .PlayPrompt("There are callers ahead of you. Please hold.")
                                .TransferToQueue("Support")
                                .Disconnect());
                    })
                    .Disconnect())
                .OnFalse(unavailable => unavailable
                    .PlayPrompt("All agents are currently busy.")
                    .TransferToQueue("Support")
                    .Disconnect())
                .OnError(e => e.TransferToQueue("Support").Disconnect()))
        .OnOutOfHours(closed => closed
            .PlayPrompt("We're closed. Please call back during business hours.")
            .Disconnect())
        .OnError(e => e.TransferToQueue("Support").Disconnect())
    .Disconnect();
```

### Using CDK Token References

```csharp
// In your flow builder
public IFlow Build()
{
    var supportQueue = _registry.Get<QueueConstruct>(ResourceKeys.SupportQueue);

    return Flow.Create("Queue Metrics with CDK Tokens")
        .PlayPrompt("Checking queue status.")
        // Use CDK token for queue ARN - resolved at deployment
        .GetQueueMetricsForQueue(supportQueue.QueueArn, QueueMetricChannel.Voice)
        .PlayPrompt($"Queue has {Attributes.Queue("ContactsInQueue")} waiting.")
        .TransferToQueue(Queues.Support)
        .Disconnect()
        .Build();
}
```

## AWS Connect Block Type

This block generates the `GetMetricData` action type in the exported flow JSON.

```json
{
  "Type": "GetMetricData",
  "Parameters": {
    "QueueId": "arn:aws:connect:region:account:instance/queue-id",
    "QueueChannel": "Voice"
  },
  "Transitions": {
    "NextAction": "next-action-id",
    "Errors": [{ "ErrorType": "NoMatchingError", "NextAction": "error-action" }]
  }
}
```

### With Agent ID

```json
{
  "Type": "GetMetricData",
  "Parameters": {
    "AgentId": "arn:aws:connect:region:account:instance/agent-id",
    "QueueChannel": "Chat"
  }
}
```

### Without Channel (All Channels)

```json
{
  "Type": "GetMetricData",
  "Parameters": {
    "QueueId": "arn:aws:connect:region:account:instance/queue-id"
  }
}
```

## Best Practices

1. **Filter by channel when relevant** - Use channel filter for accurate metrics in multi-channel environments
2. **Use current context when queue is set** - `GetQueueMetrics()` uses the current working queue
3. **Estimate wait times** - Use `ContactsInQueue` for customer-facing wait estimates
4. **Offer alternatives** - Provide callback options when queues are long
5. **Be honest** - Don't overstate availability or underestimate wait times
6. **Update periodically** - Queue status changes rapidly, metrics are point-in-time
7. **Combine with CheckQueueStatus** - Use `CheckQueueStatus` for branching, `GetQueueMetrics` for data retrieval
8. **Use CDK tokens for queue ARNs** - Ensures correct ARNs at deployment time

## Differences from CheckQueueStatus

| Feature             | GetQueueMetrics                   | CheckQueueStatus                     |
| ------------------- | --------------------------------- | ------------------------------------ |
| **Purpose**         | Retrieve metric values            | Branch based on metric conditions    |
| **Output**          | Stores values in queue attributes | Routes flow to different branches    |
| **Channel Support** | Yes - filter by channel           | No - aggregate metrics only          |
| **Agent Support**   | Yes - query by agent              | Yes - query by agent                 |
| **Use Case**        | Display metrics, store for later  | Routing decisions, conditional logic |

## See Also

- [CheckQueueStatus](./check-queue-status.md) - Branch based on queue metrics
- [CheckStaffing](./check-staffing.md) - Agent availability checks
- [TransferToQueue](../terminate/transfer-to-queue.md) - Queue transfers
- [CheckContactAttribute](./check-contact-attribute.md) - Conditional branching
- [SetContactAttributes](../set/set-contact-attributes.md) - Store attribute values
