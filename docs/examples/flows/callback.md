# Callback Flow

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Offer callback when queue wait time is long.

## Pattern

```csharp
[ContactFlow("CallbackFlow")]
public partial class CallbackFlow : FlowDefinitionBase
{
    [GetQueueMetrics("Support", Metric = "CallsInQueue")]
    [CheckAttribute("CallsInQueue", CompareType.GreaterThan, "10")]
    [OnTrue(Target = nameof(OfferCallback))]
    [OnFalse(Target = nameof(TransferDirectly))]
    public partial void CheckQueue();

    [Message("Current wait time is over 10 minutes")]
    [GetUserInput("Press 1 to hold, 2 for callback", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(TransferDirectly))]
    [Branch(OnDigit = "2", Target = nameof(CreateCallback))]
    public partial void OfferCallback();

    [TransferToQueue("Support")]
    public partial void TransferDirectly();

    [Message("We'll call you back within the hour")]
    [SetCallback(Queue = "Support", DelayMinutes = 5)]
    [Disconnect]
    public partial void CreateCallback();
}
```

## Next Steps

- **[After Hours](/examples/flows/after-hours)** - Business hours pattern
- **[Authentication](/examples/flows/authentication)** - Auth pattern
