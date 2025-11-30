# CheckStaffing

Branch the flow based on agent availability and staffing metrics.

## Signatures

```csharp
// Check current queue context
ICheckStaffingBranchBuilder CheckStaffing(
    StaffingMetricType metricType = StaffingMetricType.Available, 
    string? identifier = null)

// Check specific queue
ICheckStaffingBranchBuilder CheckStaffingForQueue(
    string queueNameOrArn, 
    StaffingMetricType metricType = StaffingMetricType.Available, 
    string? identifier = null)

// Check specific agent
ICheckStaffingBranchBuilder CheckStaffingForAgent(
    string agentArn, 
    StaffingMetricType metricType = StaffingMetricType.Available, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queueNameOrArn` | `string` | Yes | Queue name or ARN to check |
| `agentArn` | `string` | Yes | Agent ARN to check |
| `metricType` | `StaffingMetricType` | No | Type of staffing metric (default: Available) |
| `identifier` | `string?` | No | Optional identifier for the action |

## StaffingMetricType Values

| Value | Description |
|-------|-------------|
| `Available` | Agents ready to take calls (not on call, not in ACW) |
| `Staffed` | Agents logged in and assigned to queue (may be busy) |
| `Online` | Agents logged into the system |

## Return Value

Returns `ICheckStaffingBranchBuilder` which provides:

| Method | Description |
|--------|-------------|
| `.OnTrue(Action<IFlowBuilder>)` | Branch when condition is true (agents available/staffed/online) |
| `.OnFalse(Action<IFlowBuilder>)` | Branch when condition is false |
| `.OnError(Action<IFlowBuilder>)` | Branch when an error occurs |

## Examples

### Basic Availability Check

```csharp
Flow.Create("Staffing Aware")
    .PlayPrompt("Welcome to Nick Software.")
    .CheckStaffingForQueue("SupportQueue", StaffingMetricType.Available)
        .OnTrue(available => available
            .PlayPrompt("An agent is available to help you.")
            .TransferToQueue("SupportQueue")
            .Disconnect())
        .OnFalse(unavailable => unavailable
            .PlayPrompt("All agents are busy. You will be placed in the queue.")
            .TransferToQueue("SupportQueue")
            .Disconnect())
        .OnError(error => error
            .PlayPrompt("Transferring your call.")
            .TransferToQueue("SupportQueue")
            .Disconnect());
```

### Multi-Level Staffing Check

```csharp
Flow.Create("Smart Queue Routing")
    .PlayPrompt("Let me check agent availability.")
    
    // First check if anyone is available
    .CheckStaffingForQueue("SupportQueue", StaffingMetricType.Available)
        .OnTrue(available => available
            .PlayPrompt("Great! An agent is ready to assist.")
            .TransferToQueue("SupportQueue")
            .Disconnect())
        .OnFalse(notAvailable => notAvailable
            // No one available - check if anyone is staffed (logged in but busy)
            .CheckStaffingForQueue("SupportQueue", StaffingMetricType.Staffed)
                .OnTrue(staffed => staffed
                    .PlayPrompt("Agents are busy. Would you like to wait?")
                    .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                        .OnDigit("1", wait => wait
                            .TransferToQueue("SupportQueue")
                            .Disconnect())
                        .OnDigit("2", callback => callback
                            .PlayPrompt("We'll call you back.")
                            .Disconnect())
                        .OnTimeout(t => t.TransferToQueue("SupportQueue").Disconnect())
                        .OnDefault(d => d.TransferToQueue("SupportQueue").Disconnect()))
                .OnFalse(noStaff => noStaff
                    .PlayPrompt("No agents are currently available. Please call back later.")
                    .Disconnect())
                .OnError(e => e.TransferToQueue("SupportQueue").Disconnect()))
        .OnError(e => e.TransferToQueue("SupportQueue").Disconnect());
```

### Combined with Hours Check

```csharp
Flow.Create("Intelligent Routing")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(open => open
            .CheckStaffingForQueue("Support", StaffingMetricType.Available)
                .OnTrue(available => available
                    .TransferToQueue("Support"))
                .OnFalse(unavailable => unavailable
                    .CheckStaffingForQueue("Support", StaffingMetricType.Staffed)
                        .OnTrue(staffed => staffed
                            .PlayPrompt("High call volume. Please hold.")
                            .TransferToQueue("Support"))
                        .OnFalse(noStaff => noStaff
                            .PlayPrompt("Unexpected staffing issue. Please hold.")
                            .TransferToQueue("Support"))
                        .OnError(e => e.TransferToQueue("Support")))
                .OnError(e => e.TransferToQueue("Support")))
        .OnOutOfHours(closed => closed
            .PlayPrompt("We're closed.")
            .Disconnect())
        .OnError(e => e.TransferToQueue("Support"))
    .Disconnect();
```

### Queue Fallback Pattern

```csharp
Flow.Create("Queue Fallback")
    .PlayPrompt("Checking availability.")
    
    // Try primary queue
    .CheckStaffingForQueue("PrimarySupport", StaffingMetricType.Available)
        .OnTrue(primary => primary
            .TransferToQueue("PrimarySupport")
            .Disconnect())
        .OnFalse(noPrimary => noPrimary
            // Try secondary queue
            .CheckStaffingForQueue("SecondarySupport", StaffingMetricType.Available)
                .OnTrue(secondary => secondary
                    .PlayPrompt("Connecting to our overflow team.")
                    .TransferToQueue("SecondarySupport")
                    .Disconnect())
                .OnFalse(noSecondary => noSecondary
                    // Try sales as last resort
                    .CheckStaffingForQueue("Sales", StaffingMetricType.Available)
                        .OnTrue(sales => sales
                            .PlayPrompt("Connecting to an available agent.")
                            .TransferToQueue("Sales")
                            .Disconnect())
                        .OnFalse(noSales => noSales
                            .PlayPrompt("All lines are busy. Please call back later.")
                            .Disconnect())
                        .OnError(e => e.TransferToQueue("PrimarySupport").Disconnect()))
                .OnError(e => e.TransferToQueue("PrimarySupport").Disconnect()))
        .OnError(e => e.TransferToQueue("PrimarySupport").Disconnect());
```

### VIP Priority Routing

```csharp
Flow.Create("VIP Routing")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(s => s.SetContactAttributes(a => a["Tier"] = Attributes.External("Tier")))
        .OnError(e => e.TransferToQueue("General").Disconnect())
    
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Contact("Tier"))
            .Equals("VIP", vip => vip
                // VIP always gets transferred, check just for messaging
                .CheckStaffingForQueue("VIPSupport", StaffingMetricType.Available)
                    .OnTrue(available => available
                        .PlayPrompt("A VIP specialist is ready for you.")
                        .TransferToQueue("VIPSupport"))
                    .OnFalse(unavailable => unavailable
                        .PlayPrompt("Your call is priority. Next available VIP specialist.")
                        .TransferToQueue("VIPSupport"))
                    .OnError(e => e.TransferToQueue("VIPSupport")))
            .Otherwise(regular => regular
                .CheckStaffingForQueue("General", StaffingMetricType.Available)
                    .OnTrue(available => available
                        .TransferToQueue("General"))
                    .OnFalse(unavailable => unavailable
                        .PlayPrompt("Please hold for the next available agent.")
                        .TransferToQueue("General"))
                    .OnError(e => e.TransferToQueue("General")));
    })
    .Disconnect();
```

### Using Current Queue Context

```csharp
Flow.Create("Queue Context Check")
    // Set working queue first
    .SetWorkingQueue("Support")
    
    // CheckStaffing uses current queue context
    .CheckStaffing(StaffingMetricType.Available)
        .OnTrue(available => available
            .PlayPrompt("Agent available.")
            .TransferToQueue("Support"))
        .OnFalse(unavailable => unavailable
            .PlayPrompt("Please hold."))
        .OnError(e => e.TransferToQueue("Support"))
    .Disconnect();
```

## Understanding Metric Types

| Metric | True When | Use Case |
|--------|-----------|----------|
| **Available** | At least one agent is ready to take a call | Best customer experience messaging |
| **Staffed** | At least one agent is logged in to the queue | Determining if queue is operational |
| **Online** | At least one agent is logged into Connect | System health check |

### Staffing Hierarchy

```
Online (broadest)
  └── Staffed (subset - assigned to queue)
        └── Available (subset - ready to take calls)
```

## AWS Connect Block Type

This block generates the `CheckStaffing` action type in the exported flow JSON.

## Best Practices

1. **Use Available for customer messaging** - Most accurate for "agent ready" scenarios
2. **Use Staffed for queue health** - Determines if queue is operational
3. **Always handle OnError** - Staffing checks can fail
4. **Provide fallback queues** - Don't strand customers
5. **Don't over-promise** - "Available" can change between check and transfer

## See Also

- [CheckHoursOfOperation](./check-hours-of-operation.md) - Business hours check
- [GetQueueMetrics](../set/set-queue-metrics.md) - Detailed queue statistics
- [TransferToQueue](../terminate/transfer-to-queue.md) - Queue transfers
