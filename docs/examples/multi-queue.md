# Multi-Queue Setup

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Route calls to different queues based on user input.

## Full Example

```csharp
using Microsoft.Extensions.Hosting;
using NickSoftware.Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MultiQueueCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();

[Queue("Sales", MaxContacts = 20)]
[Queue("Support", MaxContacts = 15)]
[Queue("Billing", MaxContacts = 10)]
[ContactFlow("MainMenu")]
public partial class MainMenuFlow : FlowDefinitionBase
{
    [Message("Welcome to Acme Corp")]
    public partial void Welcome();

    [GetUserInput("For sales, press 1. For support, press 2. For billing, press 3.", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Sales))]
    [Branch(OnDigit = "2", Target = nameof(Support))]
    [Branch(OnDigit = "3", Target = nameof(Billing))]
    public partial void GetSelection();

    [TransferToQueue("Sales")]
    public partial void Sales();

    [TransferToQueue("Support")]
    public partial void Support();

    [TransferToQueue("Billing")]
    public partial void Billing();
}
```

## Deploy

```bash
cdk deploy
```

## Next Steps

- **[IVR Menu](/examples/flows/ivr-menu)** - Advanced menu patterns
- **[Enterprise Examples](/examples/enterprise-attributes)** - Production setups
