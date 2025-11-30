# GetCustomerInput

Collect DTMF (keypad) or voice input from customers. This block presents a prompt and waits for the customer to respond.

## Signature

```csharp
// Simple prompt with optional configuration
IInputBuilder GetCustomerInput(
    string promptText, 
    Action<GetCustomerInputAction>? configure = null, 
    string? identifier = null)

// Advanced configuration with InputConfiguration
IFlowBuilder GetCustomerInput(
    Action<InputConfiguration> configure, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `promptText` | `string` | Yes | The prompt text to play |
| `configure` | `Action<GetCustomerInputAction>` | No | Configure input settings |
| `identifier` | `string?` | No | Optional identifier for the action |

## GetCustomerInputAction Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `TimeoutSeconds` | `int` | `5` | Time to wait for input |
| `MaxDigits` | `int` | `1` | Maximum digits to collect |
| `EncryptInput` | `bool` | `false` | Encrypt collected input |
| `MaxAttempts` | `int` | `1` | Number of retry attempts |
| `TerminatingDigit` | `string?` | `null` | Digit that ends input (e.g., "#") |

## Return Value

Returns `IInputBuilder` which provides branch handlers:

| Method | Description |
|--------|-------------|
| `.OnDigit(string digit, Action<IFlowBuilder>)` | Handle specific digit input |
| `.OnDigits(Action<IFlowBuilder>)` | Handle any collected digits |
| `.OnTimeout(Action<IFlowBuilder>)` | Handle input timeout |
| `.OnError(Action<IFlowBuilder>)` | Handle errors |
| `.OnDefault(Action<IFlowBuilder>)` | Handle unmatched input |
| `.OnIntent(string, Action<IFlowBuilder>)` | Handle Lex bot intent (ASR) |
| `.OnNoMatch(Action<IFlowBuilder>)` | Handle ASR no match |
| `.OnLowConfidence(Action<IFlowBuilder>)` | Handle low confidence ASR |
| `.WithRetry(Action<IRetryBuilder>)` | Configure automatic retry |
| `.WithLexBot(Action<LexBotConfiguration>)` | Configure Lex bot for ASR |

## Examples

### Simple Menu

```csharp
Flow.Create("Main Menu")
    .PlayPrompt("Welcome to Nick Software.")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, or 3 for Billing.")
        .OnDigit("1", sales => sales
            .PlayPrompt("Transferring to Sales.")
            .TransferToQueue("Sales")
            .Disconnect())
        .OnDigit("2", support => support
            .PlayPrompt("Transferring to Support.")
            .TransferToQueue("Support")
            .Disconnect())
        .OnDigit("3", billing => billing
            .PlayPrompt("Transferring to Billing.")
            .TransferToQueue("Billing")
            .Disconnect())
        .OnTimeout(timeout => timeout
            .PlayPrompt("No input received. Goodbye.")
            .Disconnect())
        .OnDefault(def => def
            .PlayPrompt("Invalid selection. Goodbye.")
            .Disconnect());
```

### With Configuration

```csharp
Flow.Create("Account Entry")
    .GetCustomerInput("Please enter your account number followed by the pound key.", 
        input =>
        {
            input.TimeoutSeconds = 15;
            input.MaxDigits = 10;
            input.TerminatingDigit = "#";
        })
        .OnDigits(digits => digits
            .SetContactAttributes(attrs =>
            {
                attrs["AccountNumber"] = Attributes.System(SystemAttributes.LastCollectedDigits);
            })
            .InvokeLambda("ValidateAccount"))
        .OnTimeout(timeout => timeout
            .PlayPrompt("We didn't receive your account number.")
            .Disconnect())
        .OnError(error => error
            .PlayPrompt("An error occurred.")
            .Disconnect());
```

### With Retry Logic

```csharp
Flow.Create("PIN with Retry")
    .Loop(3, loop => loop
        .WhileLooping(attempt => attempt
            .GetCustomerInput("Please enter your PIN.", input =>
            {
                input.MaxDigits = 4;
                input.TimeoutSeconds = 10;
            })
            .OnDigits(pin => pin
                .InvokeLambda("ValidatePIN")
                    .OnSuccess(success => success
                        .PlayPrompt("PIN accepted.")
                        .TransferToQueue("Authenticated")
                        .Disconnect())
                    .OnError(error => error
                        .PlayPrompt("Invalid PIN. Please try again.")))
            .OnTimeout(timeout => timeout
                .PlayPrompt("No input received. Please try again."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Goodbye.")
            .Disconnect()));
```

### With Lex Bot (ASR)

```csharp
Flow.Create("Voice Menu")
    .GetCustomerInput("How can I help you today?")
        .WithLexBot(lex =>
        {
            lex.BotName = "CustomerServiceBot";
            lex.BotAlias = "$LATEST";
            lex.Locale = "en_US";
        })
        .OnIntent("OrderStatus", orderStatus => orderStatus
            .PlayPrompt("Let me check your order status.")
            .InvokeLambda("GetOrderStatus"))
        .OnIntent("ReturnItem", returnItem => returnItem
            .PlayPrompt("I can help you return an item.")
            .TransferToQueue("Returns"))
        .OnNoMatch(noMatch => noMatch
            .PlayPrompt("I didn't understand. Let me transfer you to an agent.")
            .TransferToQueue("General"))
        .OnError(error => error
            .PlayPrompt("An error occurred.")
            .Disconnect());
```

### Sequential ASR to DTMF Fallback

```csharp
Flow.Create("Sequential Input")
    .GetCustomerInput("Say or press 1 for Sales, 2 for Support.")
        .WithSequentialInput(
            asrPrompt: "I can help with Sales or Support. Which would you like?",
            dtmfPrompt: "Press 1 for Sales, or 2 for Support.",
            lexBotName: "MenuBot",
            maxDigits: 1,
            fallbackTriggers: FallbackTrigger.AnyError)
        .OnDigit("1", sales => sales.TransferToQueue("Sales").Disconnect())
        .OnDigit("2", support => support.TransferToQueue("Support").Disconnect())
        .OnIntent("Sales", sales => sales.TransferToQueue("Sales").Disconnect())
        .OnIntent("Support", support => support.TransferToQueue("Support").Disconnect());
```

### Complex Authenticated Menu

```csharp
private static void BuildAuthenticatedMenu(IFlowBuilder flow)
{
    flow.PlayPrompt($"Welcome {Attributes.External("CustomerName")}. You are now authenticated.")
        .GetCustomerInput("""
            To check your balance, press 1.
            To check your orders, press 2.
            To speak to an agent, press 3.
            """, input =>
        {
            input.TimeoutSeconds = 10;
        })
        .OnDigit("1", balance => balance
            .PlayPrompt($"Your balance is {Attributes.External("Balance")} dollars.")
            .GetCustomerInput("Press 1 to return to the menu, or 2 to disconnect.")
                .OnDigit("1", returnMenu => returnMenu.ContinueAt("AuthMenu"))
                .OnDigit("2", disconnect => disconnect.Disconnect()))
        .OnDigit("2", orders => orders
            .InvokeLambda("GetOrders")
                .OnSuccess(s => s.PlayPrompt("You have 3 active orders."))
                .OnError(e => e.PlayPrompt("Could not retrieve orders.")))
        .OnDigit("3", agent => agent
            .PlayPrompt("Transferring to an agent.")
            .TransferToQueue("Support")
            .Disconnect())
        .OnTimeout(timeout => timeout
            .PlayPrompt("No selection received. Goodbye.")
            .Disconnect())
        .OnDefault(def => def
            .PlayPrompt("Invalid selection.")
            .ContinueAt("AuthMenu"));
}
```

### Branch Continuation

```csharp
Flow.Create("Menu with Continuation")
    .GetCustomerInput("Press 1 or 2")
        .OnDigit("1", one => one
            .SetContactAttributes(attrs => attrs["Selection"] = "Option1")
            .ThenContinue())  // Continue to TransferToQueue
        .OnDigit("2", two => two
            .SetContactAttributes(attrs => attrs["Selection"] = "Option2")
            .ThenContinue())  // Continue to TransferToQueue
    .TransferToQueue("General")  // Both branches continue here
    .Disconnect();
```

## AWS Connect Block Type

This block generates the `GetParticipantInput` action type in the exported flow JSON.

## Input Types

| Type | Description | Use Case |
|------|-------------|----------|
| DTMF | Keypad digit input | Menu selection, account numbers |
| ASR | Automatic Speech Recognition | Natural language input |
| Sequential | ASR with DTMF fallback | Best user experience |

## Best Practices

1. **Always handle all branches** - Include OnTimeout, OnError, and OnDefault
2. **Keep menus simple** - Maximum 4-5 options per menu
3. **Set appropriate timeouts** - 5-10 seconds for simple selections
4. **Use retry loops** - Allow multiple attempts for complex input
5. **Provide clear prompts** - Tell customers exactly what to press
6. **Use ThenContinue()** - When branches should converge

## See Also

- [Input Configuration Reference](../input-configuration.md)
- [Loop](../logic/loop.md) - For retry patterns
- [StoreCustomerInput](./store-customer-input.md) - For secure input
