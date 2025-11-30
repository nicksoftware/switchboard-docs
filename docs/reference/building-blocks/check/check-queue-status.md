# CheckQueueStatus

Branch the flow based on queue metrics such as queue size and wait times.

> **Note**: This block is under development. For current queue metrics, use `GetQueueMetrics` combined with `CheckContactAttribute`.

## Current Approach

```csharp
Flow.Create("Queue Aware Routing")
    .GetQueueMetrics("SupportQueue")
    .CheckContactAttribute(check =>
    {
        check.Attribute(Attributes.Queue("ContactsInQueue"))
            .LessThan("5", lowQueue => lowQueue
                .PlayPrompt("Minimal wait time.")
                .TransferToQueue("SupportQueue"))
            .LessThan("20", mediumQueue => mediumQueue
                .PlayPrompt("Wait time approximately 10 minutes.")
                .TransferToQueue("SupportQueue"))
            .Otherwise(highQueue => highQueue
                .PlayPrompt("Extended wait times. Consider calling back later.")
                .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
                    .OnDigit("1", wait => wait.TransferToQueue("SupportQueue"))
                    .OnDigit("2", callback => callback.Disconnect())
                    .OnDefault(d => d.TransferToQueue("SupportQueue"))
                    .OnTimeout(t => t.TransferToQueue("SupportQueue")));
    })
    .Disconnect();
```

## See Also

- [GetQueueMetrics](../set/set-queue-metrics.md) - Retrieve queue statistics
- [CheckStaffing](./check-staffing.md) - Check agent availability
- [CheckContactAttribute](./check-contact-attribute.md) - Condition checking
