# Basic Call Center

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

A complete basic call center setup with welcome message and queue transfer.

## Full Example

```csharp
using Microsoft.Extensions.Hosting;
using NickSoftware.Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "BasicCallCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();

[Queue("GeneralSupport", MaxContacts = 10, Timeout = 300)]
[ContactFlow("MainInbound")]
public partial class MainInboundFlow : FlowDefinitionBase
{
    [Message("Thank you for calling. Please wait while we connect you.")]
    public partial void Welcome();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

## Deploy

```bash
dotnet build
cdk bootstrap  # First time only
cdk deploy
```

## Next Steps

- **[Multi-Queue](/examples/multi-queue)** - Multiple queue routing
- **[Flow Basics](/guide/flows/basics)** - Learn flow fundamentals
