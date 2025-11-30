# TransferToFlow

Transfer the contact to another contact flow.

## Signatures

```csharp
// Static flow name
IFlowBuilder TransferToFlow(string flowName, string? identifier = null)

// Dynamic flow from attribute
IFlowBuilder TransferToFlowDynamic(string attributePath, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flowName` | `string` | Yes | Name or ARN of the target flow |
| `attributePath` | `string` | Yes | JSONPath to attribute containing flow ARN |
| `identifier` | `string?` | No | Optional identifier for the action |

## Examples

### Basic Flow Transfer

```csharp
Flow.Create("Main Menu")
    .GetCustomerInput("Press 1 for Sales, 2 for Support.")
        .OnDigit("1", sales => sales
            .TransferToFlow("SalesFlow")
            .Disconnect())
        .OnDigit("2", support => support
            .TransferToFlow("SupportFlow")
            .Disconnect())
        .OnDefault(def => def.Disconnect());
```

### Modular Design

```csharp
// Entry flow
Flow.Create("EntryFlow")
    .PlayPrompt("Welcome to Nick Software.")
    .TransferToFlow("MainMenu")
    .Disconnect();

// Main menu flow
Flow.Create("MainMenu")
    .GetCustomerInput("Press 1 for Orders, 2 for Returns.")
        .OnDigit("1", orders => orders.TransferToFlow("OrdersFlow"))
        .OnDigit("2", returns => returns.TransferToFlow("ReturnsFlow"))
        .OnDefault(def => def.TransferToQueue("General"))
    .Disconnect();
```

### Dynamic Flow Selection

```csharp
Flow.Create("Dynamic Router")
    .InvokeLambda("GetRoutingInfo")
        .OnSuccess(s => s
            .SetContactAttributes(attrs =>
            {
                attrs["TargetFlow"] = Attributes.External("FlowArn");
            })
            .TransferToFlowDynamic("$.Attributes.TargetFlow"))
        .OnError(e => e.TransferToFlow("DefaultFlow"))
    .Disconnect();
```

### Language-Based Routing

```csharp
Flow.Create("Language Router")
    .GetCustomerInput("Press 1 for English, 2 para Español.")
        .OnDigit("1", en => en.TransferToFlow("EnglishFlow"))
        .OnDigit("2", es => es.TransferToFlow("SpanishFlow"))
        .OnDefault(d => d.TransferToFlow("EnglishFlow"));
```

## See Also

- [EndFlowExecution](./end-flow-execution.md) - Return from subflow
- [Disconnect](./disconnect.md) - End contact

For more details, see [InvokeFlow](../integrate/invoke-flow.md).
