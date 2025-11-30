# Interact Blocks

Interact blocks are used to communicate with customers through audio prompts and collect their input.

## Blocks in this Category

- [PlayPrompt](./play-prompt.md) - Play audio or text-to-speech to the customer
- [GetCustomerInput](./get-customer-input.md) - Collect DTMF or voice input from customers
- [StoreCustomerInput](./store-customer-input.md) - Securely capture and encrypt sensitive input
- [HoldCustomerOrAgent](./hold-customer-or-agent.md) - Place customer or agent on hold

## Overview

Interact blocks form the foundation of customer communication in Amazon Connect flows. They enable you to:

- **Greet customers** with welcome messages
- **Present menus** with options
- **Collect information** like account numbers, PINs, and menu selections
- **Provide feedback** on customer actions
- **Guide customers** through self-service workflows

## Common Patterns

### Simple Greeting

```csharp
Flow.Create("Welcome Flow")
    .PlayPrompt("Welcome to our service. How can we help you today?")
    .TransferToQueue("General")
    .Disconnect();
```

### Menu with Options

```csharp
Flow.Create("Main Menu")
    .PlayPrompt("Thank you for calling.")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, or 3 for Billing.")
        .OnDigit("1", sales => sales.TransferToQueue("Sales").Disconnect())
        .OnDigit("2", support => support.TransferToQueue("Support").Disconnect())
        .OnDigit("3", billing => billing.TransferToQueue("Billing").Disconnect())
        .OnDefault(def => def.PlayPrompt("Invalid selection.").Disconnect())
        .OnTimeout(timeout => timeout.PlayPrompt("No input received.").Disconnect());
```

### Secure Input Collection

```csharp
Flow.Create("PIN Entry")
    .StoreCustomerInput("Please enter your PIN followed by the pound key.", input =>
    {
        input.MaxDigits = 4;
        input.EncryptInput = true;
        input.CustomTerminatingKeypress = "#";
    })
    .OnSuccess(success => success.InvokeLambda("ValidatePIN"))
    .OnError(error => error.PlayPrompt("Invalid entry."));
```

## Error Handling

All interact blocks support error handling to gracefully handle failures:

```csharp
.PlayPrompt("Important message")
    .OnError(error => error
        .PlayPrompt("We're experiencing technical difficulties.")
        .TransferToQueue("Fallback")
        .Disconnect())
```

## Multi-Language Support

PlayPrompt supports multi-language content:

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our service", "Joanna")
    .Add("es-ES", "Bienvenido a nuestro servicio", "Lucia")
    .Add("fr-FR", "Bienvenue dans notre service", "Celine");

.PlayPrompt(translations, "$.Attributes.Language")
```

## See Also

- [Prompt Configuration](../prompt-configuration.md) - Advanced prompt configuration options
- [Input Configuration](../input-configuration.md) - Detailed input configuration reference
