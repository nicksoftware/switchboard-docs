# InvokeFlow (TransferToFlow)

Transfer the contact to another contact flow. Used for modular flow design and complex routing.

## Signature

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
    .PlayPrompt("Welcome to Nick Software.")
    .GetCustomerInput("Press 1 for Sales, 2 for Support.")
        .OnDigit("1", sales => sales
            .TransferToFlow("SalesFlow")
            .Disconnect())
        .OnDigit("2", support => support
            .TransferToFlow("SupportFlow")
            .Disconnect())
        .OnDefault(def => def.Disconnect())
        .OnTimeout(t => t.Disconnect());
```

### Modular Authentication

```csharp
// Main flow transfers to authentication
Flow.Create("Main Flow")
    .PlayPrompt("Welcome.")
    .TransferToFlow("AuthenticationFlow")
    .Disconnect();

// Authentication flow handles PIN entry
Flow.Create("AuthenticationFlow")
    .SetType(FlowType.ContactFlow)
    .StoreCustomerInput("Enter your PIN.")
        .OnSuccess(s => s
            .InvokeLambda("ValidatePIN")
                .OnSuccess(valid => valid
                    .TransferToFlow("AuthenticatedMenuFlow"))
                .OnError(invalid => invalid
                    .PlayPrompt("Invalid PIN.")))
        .OnError(e => e.PlayPrompt("Invalid entry."))
    .Disconnect();
```

### Dynamic Flow Transfer

```csharp
Flow.Create("Dynamic Router")
    .InvokeLambda("GetRoutingInfo", lambda =>
    {
        lambda.InputParameters["CustomerType"] = Attributes.Contact("CustomerType");
    })
    .OnSuccess(s => s
        .SetContactAttributes(attrs =>
        {
            attrs["TargetFlow"] = Attributes.External("FlowArn");
        })
        .TransferToFlowDynamic("$.Attributes.TargetFlow"))
    .OnError(e => e
        .TransferToFlow("DefaultFlow"))
    .Disconnect();
```

### Flow Composition Pattern

```csharp
// Common greeting flow
Flow.Create("GreetingFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Thank you for calling Nick Software.")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(open => open
            .EndFlowExecution())  // Return to calling flow
        .OnOutOfHours(closed => closed
            .PlayPrompt("We're closed. Goodbye.")
            .Disconnect())
        .OnError(e => e.EndFlowExecution());

// Main flow uses greeting
Flow.Create("MainFlow")
    .TransferToFlow("GreetingFlow")  // Greeting plays
    .GetCustomerInput("Press 1 for Sales...")  // Continues here after EndFlowExecution
        .OnDigit("1", s => s.TransferToQueue("Sales"))
    .Disconnect();
```

### Language-Based Flow Routing

```csharp
Flow.Create("Language Router")
    .GetCustomerInput("Press 1 for English, 2 para Español.")
        .OnDigit("1", english => english
            .SetContactAttributes(attrs => attrs["Language"] = "en")
            .TransferToFlow("EnglishFlow"))
        .OnDigit("2", spanish => spanish
            .SetContactAttributes(attrs => attrs["Language"] = "es")
            .TransferToFlow("SpanishFlow"))
        .OnDefault(def => def.TransferToFlow("EnglishFlow"))
        .OnTimeout(t => t.TransferToFlow("EnglishFlow"));
```

## Flow Types

Different flow types serve different purposes:

| Flow Type | Description | Typical Use |
|-----------|-------------|-------------|
| `ContactFlow` | Standard contact flow | Main flows, menus |
| `CustomerQueue` | Plays while in queue | Hold music, updates |
| `CustomerHold` | Plays when on hold | Hold music |
| `CustomerWhisper` | Plays to customer before agent | "Your call is being connected" |
| `AgentWhisper` | Plays to agent before customer | "VIP customer, priority call" |
| `AgentHold` | Plays to agent when holding | Agent-side hold |
| `AgentTransfer` | For warm transfers | Transfer announcements |
| `OutboundWhisper` | Outbound call setup | Campaign identification |

## AWS Connect Block Type

This block generates the `TransferToFlow` action type in the exported flow JSON.

## Best Practices

1. **Design modular flows** - Reusable components reduce duplication
2. **Use EndFlowExecution** - Return to calling flow when appropriate
3. **Pass context via attributes** - Set attributes before transfer
4. **Handle all paths** - Each flow should handle all exit conditions
5. **Test flow chains** - Verify complete customer journeys

## See Also

- [EndFlowExecution](../terminate/end-flow-execution.md) - Return to calling flow
- [TransferToQueue](../terminate/transfer-to-queue.md) - Transfer to queue
- [SetContactAttributes](../set/set-contact-attributes.md) - Pass data between flows
