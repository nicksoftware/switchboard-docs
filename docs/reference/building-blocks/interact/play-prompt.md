# PlayPrompt

Play audio or text-to-speech (TTS) messages to the customer.

## Signature

```csharp
// Simple text prompt
IPlayPromptBuilder PlayPrompt(string text, string? identifier = null)

// Configured prompt
IPlayPromptBuilder PlayPrompt(Action<PlayPromptConfiguration> configure, string? identifier = null)

// Dynamic prompt from attribute
IPlayPromptBuilder PlayPromptDynamic(string attributePath, string? identifier = null)

// Multi-language prompt
IPlayPromptBuilder PlayPrompt(TranslationDictionary translations, string languageAttribute, string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | `string` | Yes | The text to speak using TTS |
| `configure` | `Action<PlayPromptConfiguration>` | Yes | Configuration for advanced prompts |
| `attributePath` | `string` | Yes | JSONPath to attribute containing prompt text |
| `translations` | `TranslationDictionary` | Yes | Multi-language translations |
| `languageAttribute` | `string` | Yes | JSONPath to language attribute |
| `identifier` | `string?` | No | Optional identifier for the action |

## PlayPromptConfiguration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `PromptType` | `PromptType` | `Text` | Type of prompt: `Text`, `SSML`, or `Audio` |
| `Text` | `string?` | `null` | Plain text for TTS |
| `SSML` | `string?` | `null` | SSML markup for advanced TTS |
| `AudioFile` | `string?` | `null` | S3 URI or prompt ID for audio file |
| `Voice` | `string?` | `null` | Amazon Polly voice name |
| `Language` | `string?` | `null` | Language code (e.g., "en-US") |

## Return Value

Returns `IPlayPromptBuilder` which provides:

- `.OnError(Action<IFlowBuilder> configure)` - Handle prompt playback errors

## Examples

### Simple Text Prompt

```csharp
Flow.Create("Welcome")
    .PlayPrompt("Welcome to Nick Software. How can we help you today?")
    .TransferToQueue("General")
    .Disconnect();
```

### SSML Prompt with Pauses

```csharp
Flow.Create("Welcome with SSML")
    .PlayPrompt(message =>
    {
        message.PromptType = PromptType.SSML;
        message.SSML = @"<speak>
            <break time='1s'/>
            Welcome to Nick Software.
            <break time='500ms'/>
            Please listen carefully as our menu options have changed.
        </speak>";
    })
    .GetCustomerInput("Press 1 for Sales, 2 for Support.");
```

### With Error Handling

```csharp
Flow.Create("Error Handled Prompt")
    .PlayPrompt("Important announcement.")
        .OnError(error => error
            .PlayPrompt("We're experiencing technical difficulties.")
            .TransferToQueue("Fallback")
            .Disconnect())
    .TransferToQueue("General");
```

### Dynamic Prompt from Attribute

```csharp
Flow.Create("Dynamic Greeting")
    // First, get customer name from Lambda
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(success => success
            .SetContactAttributes(attrs =>
            {
                attrs["CustomerName"] = Attributes.External("CustomerName");
                attrs["WelcomeMessage"] = Attributes.External("CustomGreeting");
            }))
        .OnError(error => error.PlayPrompt("Welcome!"))
    // Play personalized greeting
    .PlayPromptDynamic("$.Attributes.WelcomeMessage")
    .TransferToQueue("Support");
```

### Multi-Language Support

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our service. Press 1 for English.", "Joanna")
    .Add("es-ES", "Bienvenido a nuestro servicio. Presione 2 para español.", "Lucia")
    .Add("fr-FR", "Bienvenue. Appuyez sur 3 pour le français.", "Celine");

Flow.Create("Multi-Language Welcome")
    .PlayPrompt(translations, "$.Attributes.Language")
    .GetCustomerInput("Select your language.")
        .OnDigit("1", en => en.SetContactAttributes(a => a["Language"] = "en-US"))
        .OnDigit("2", es => es.SetContactAttributes(a => a["Language"] = "es-ES"))
        .OnDigit("3", fr => fr.SetContactAttributes(a => a["Language"] = "fr-FR"));
```

### Using Contact Attributes in Prompts

```csharp
Flow.Create("Personalized Prompt")
    .PlayPrompt($"Welcome back, {Attributes.Contact("CustomerName")}. " +
                $"Your current balance is {Attributes.External("AccountBalance")} dollars.")
    .GetCustomerInput("Press 1 for more options.");
```

### Chained Prompts with Label

```csharp
Flow.Create("Menu with Return")
    .PlayPrompt("Welcome!", "MainMenu")  // Named for ContinueAt
    .GetCustomerInput("Press 1 to continue, or 9 to repeat.")
        .OnDigit("1", cont => cont.TransferToQueue("Support").Disconnect())
        .OnDigit("9", repeat => repeat.ContinueAt("MainMenu"))  // Return to prompt
        .OnDefault(def => def.PlayPrompt("Invalid option.").Disconnect());
```

## AWS Connect Block Type

This block generates the `MessageParticipant` action type in the exported flow JSON.

## Best Practices

1. **Keep prompts concise** - Long prompts increase customer wait time
2. **Use SSML for natural speech** - Add pauses and emphasis for better comprehension
3. **Always handle errors** - Use `.OnError()` for graceful degradation
4. **Use dynamic prompts** - Personalize with customer data from Lambda responses
5. **Consider multi-language** - Support international customers

## See Also

- [Prompt Configuration Reference](../prompt-configuration.md)
- [GetCustomerInput](./get-customer-input.md)
- [Attributes Reference](../attributes.md)
