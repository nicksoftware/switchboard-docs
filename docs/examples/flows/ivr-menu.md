# IVR Menu System

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Multi-level IVR menu with timeout handling.

## Pattern

```csharp
[ContactFlow("IvrMenu")]
public partial class IvrMenuFlow : FlowDefinitionBase
{
    [Message("Welcome to Acme Corp")]
    public partial void Welcome();

    [GetUserInput("Main menu. For sales, press 1. For support, press 2.", MaxDigits = 1, Timeout = 5)]
    [Branch(OnDigit = "1", Target = nameof(SalesMenu))]
    [Branch(OnDigit = "2", Target = nameof(SupportMenu))]
    [Branch(OnTimeout = true, Target = nameof(Timeout))]
    public partial void MainMenu();

    // Sales sub-menu
    [GetUserInput("Sales. Press 1 for new orders, 2 for existing.", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(NewOrders))]
    [Branch(OnDigit = "2", Target = nameof(ExistingOrders))]
    public partial void SalesMenu();

    [TransferToQueue("NewOrders")]
    public partial void NewOrders();

    [TransferToQueue("ExistingOrders")]
    public partial void ExistingOrders();

    // Support sub-menu
    [GetUserInput("Support. Press 1 for technical, 2 for billing.", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Technical))]
    [Branch(OnDigit = "2", Target = nameof(Billing))]
    public partial void SupportMenu();

    [TransferToQueue("TechnicalSupport")]
    public partial void Technical();

    [TransferToQueue("BillingSupport")]
    public partial void Billing();

    [Message("We didn't receive your selection")]
    [Loop(Target = nameof(MainMenu), MaxIterations = 3)]
    public partial void Timeout();
}
```

## Next Steps

- **[Authentication](/examples/flows/authentication)** - Auth pattern
- **[Callback](/examples/flows/callback)** - Callback pattern
