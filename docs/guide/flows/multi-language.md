# Multi-Language Support

Amazon Connect Switchboard Framework provides first-class support for building contact flows that serve customers in multiple languages. The framework handles voice selection, prompt translation, and runtime language detection automatically.

## Overview

Multi-language support allows you to:
- Define prompts in multiple languages with a single fluent API call
- Automatically select appropriate Amazon Polly voices for each language
- Dynamically choose the language at runtime based on contact attributes
- Provide fallback mechanisms when a language isn't available
- Configure advanced voice settings like neural voices and speaking rate per language

## Quick Start

```csharp
using Switchboard;
using Switchboard.Configuration;

var builder = new FlowBuilder()
    .SetName("Multi-Language Welcome Flow");

// Create translations
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our service")
    .Add("es-ES", "Bienvenido a nuestro servicio")
    .Add("fr-FR", "Bienvenue dans notre service");

// Add multi-language prompt
builder.PlayPrompt(translations, "$.Attributes.Language");

var flow = builder.Build();
```

At runtime, the framework will:
1. Read the language from the contact attribute `$.Attributes.Language`
2. Select the appropriate translation (English, Spanish, or French)
3. Use the default voice for that language
4. Fall back to the first language if the attribute is missing

## TranslationDictionary

The `TranslationDictionary` class manages prompt translations across multiple languages.

### Basic Usage

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome")           // Uses default voice "Joanna"
    .Add("es-ES", "Bienvenido")        // Uses default voice "Lucia"
    .Add("fr-FR", "Bonjour");          // Uses default voice "Celine"
```

### Explicit Voice Selection

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome", "Matthew")        // Male voice
    .Add("en-GB", "Welcome", "Brian")          // British voice
    .Add("es-ES", "Bienvenido", "Enrique")     // Spanish male voice
    .Add("fr-FR", "Bonjour", "Mathieu");       // French male voice
```

### Neural Voices and Speaking Rate

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our premium service", "Joanna",
         useNeuralVoice: true,
         speakingRate: 1.0)
    .Add("es-ES", "Bienvenido a nuestro servicio premium", "Lucia",
         useNeuralVoice: true,
         speakingRate: 0.9);  // Slightly slower
```

**Neural Voice Options:**
- `useNeuralVoice`: `true` for higher quality, more natural voices (default: `true`)
- `speakingRate`: Speed multiplier from 0.5 (slow) to 2.0 (fast), default: 1.0

### Available Methods

```csharp
var translations = new TranslationDictionary();

// Add a translation
translations.Add("en-US", "Hello", "Joanna");

// Get a translation (returns null if not found)
var prompt = translations.Get("en-US");

// Get with fallback to en-US
var prompt = translations.GetOrFallback("de-DE");  // Falls back to "en-US"
var prompt = translations.GetOrFallback("de-DE", "es-ES");  // Custom fallback

// Try get pattern
if (translations.TryGet("fr-FR", out var prompt))
{
    Console.WriteLine($"Found: {prompt.Text}");
}

// Check if locale exists
bool hasSpanish = translations.HasLocale("es-ES");

// Get all available locales
var locales = translations.AvailableLocales;  // IEnumerable<string>

// Get count
int count = translations.Count;

// Remove a translation
translations.Remove("fr-FR");

// Clear all translations
translations.Clear();
```

## VoiceHelper

The `VoiceHelper` static class provides locale-to-voice mapping for 40+ languages.

### Default Voices

```csharp
using Switchboard.Helpers;

// Get default voice for locale
string voice = VoiceHelper.GetDefaultVoice("en-US");  // "Joanna"
string voice = VoiceHelper.GetDefaultVoice("es-ES");  // "Lucia"
string voice = VoiceHelper.GetDefaultVoice("fr-FR");  // "Celine"

// Case-insensitive
string voice = VoiceHelper.GetDefaultVoice("EN-us");  // "Joanna"

// Language-only codes (matches first region)
string voice = VoiceHelper.GetDefaultVoice("en");  // "Joanna" (en-US)
string voice = VoiceHelper.GetDefaultVoice("es");  // "Lucia" (es-ES)

// With fallback
string voice = VoiceHelper.GetDefaultVoiceOrFallback("de-DE", "Matthew");
// Returns "Vicki" (default for de-DE)

string voice = VoiceHelper.GetDefaultVoiceOrFallback("xx-XX", "Matthew");
// Returns "Matthew" (fallback for unknown locale)
```

### Available Voices Per Locale

```csharp
// Get all voices for a locale
string[]? voices = VoiceHelper.GetVoicesForLocale("en-US");
// ["Joanna", "Matthew", "Kendra", "Kimberly", "Ivy", "Joey", "Justin", "Salli", "Stephen", "Ruth"]

string[]? voices = VoiceHelper.GetVoicesForLocale("es-ES");
// ["Lucia", "Conchita", "Enrique", "Sergio"]

// Returns null for unknown locales
string[]? voices = VoiceHelper.GetVoicesForLocale("xx-XX");  // null
```

### Locale Validation

```csharp
// Check if locale is supported
bool supported = VoiceHelper.IsLocaleSupported("en-US");  // true
bool supported = VoiceHelper.IsLocaleSupported("xx-XX");  // false

// Get all supported locales
var locales = VoiceHelper.GetSupportedLocales();
// Returns IEnumerable<string> with 40+ locales
```

### Supported Locales

The framework supports 40+ locales including:

| Locale | Language | Default Voice | All Voices |
|--------|----------|---------------|------------|
| `en-US` | English (US) | Joanna | Joanna, Matthew, Kendra, Kimberly, Ivy, Joey, Justin, Salli, Stephen, Ruth |
| `en-GB` | English (UK) | Emma | Emma, Brian, Amy, Arthur, Kajal |
| `en-AU` | English (Australian) | Olivia | Olivia, Russell |
| `en-IN` | English (Indian) | Aditi | Aditi, Kajal, Raveena |
| `es-ES` | Spanish (European) | Lucia | Lucia, Conchita, Enrique, Sergio |
| `es-MX` | Spanish (Mexican) | Mia | Mia, Andres |
| `es-US` | Spanish (US) | Lupe | Lupe, Penelope, Miguel, Pedro |
| `fr-FR` | French | Celine | Celine, Lea, Mathieu, Remi |
| `fr-CA` | French (Canadian) | Chantal | Chantal, Gabrielle, Liam |
| `de-DE` | German | Vicki | Vicki, Marlene, Hans, Daniel |
| `it-IT` | Italian | Carla | Carla, Bianca, Giorgio, Adriano |
| `pt-BR` | Portuguese (Brazilian) | Camila | Camila, Vitoria, Ricardo, Thiago |
| `pt-PT` | Portuguese (European) | Ines | Ines |
| `ja-JP` | Japanese | Mizuki | Mizuki, Takumi, Tomoko, Kazuha |
| `ko-KR` | Korean | Seoyeon | Seoyeon |
| `zh-CN` | Chinese (Mandarin) | Zhiyu | Zhiyu |
| `ar-AE` | Arabic (Gulf) | Zayd | Zayd, Hala |
| `hi-IN` | Hindi | Aditi | Aditi, Kajal |
| `ru-RU` | Russian | Tatyana | Tatyana, Maxim |
| `pl-PL` | Polish | Ewa | Ewa, Jacek, Jan |
| `nl-NL` | Dutch | Lotte | Lotte, Laura |
| `tr-TR` | Turkish | Filiz | Filiz |
| `sv-SE` | Swedish | Astrid | Astrid, Elin |
| `da-DK` | Danish | Naja | Naja, Mads |
| `no-NO` | Norwegian | Liv | Liv, Ida |
| `fi-FI` | Finnish | Suvi | Suvi |

*See [Amazon Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html) for complete voice details.*

## FlowBuilder API

### Multi-Language PlayPrompt

```csharp
IFlowBuilder PlayPrompt(
    TranslationDictionary translations,
    string languageAttribute,
    string? identifier = null)
```

**Parameters:**
- `translations`: Dictionary containing prompts in multiple languages
- `languageAttribute`: JSONPath to the contact attribute containing the language code (e.g., `"$.Attributes.Language"`)
- `identifier`: Optional custom identifier for this action

**Example:**
```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our service", "Joanna")
    .Add("es-ES", "Bienvenido a nuestro servicio", "Lucia")
    .Add("fr-FR", "Bienvenue dans notre service", "Celine");

builder.PlayPrompt(translations, "$.Attributes.Language");
```

## Runtime Behavior

### Language Detection

The framework resolves the language at runtime based on the `languageAttribute` JSONPath:

```csharp
// Customer's language is stored in contact attribute
builder.PlayPrompt(translations, "$.Attributes.Language");
```

**Example Contact Attributes:**
```json
{
  "Attributes": {
    "Language": "es-ES",
    "CustomerName": "Juan",
    "AccountType": "Premium"
  }
}
```

When the contact flow executes:
1. Amazon Connect reads `$.Attributes.Language` → `"es-ES"`
2. Framework looks up `"es-ES"` in the translation dictionary
3. Finds: `"Bienvenido a nuestro servicio"` with voice `"Lucia"`
4. Plays the Spanish prompt with the Lucia voice

### Fallback Mechanism

If the language attribute is missing or contains an unknown language:

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome")  // First language = fallback
    .Add("es-ES", "Bienvenido")
    .Add("fr-FR", "Bonjour");

builder.PlayPrompt(translations, "$.Attributes.Language");
```

**Fallback scenarios:**
1. **Attribute missing**: If `$.Attributes.Language` doesn't exist → uses first language (`"en-US"`)
2. **Unknown language**: If attribute is `"de-DE"` (not in dictionary) → uses first language (`"en-US"`)
3. **Empty attribute**: If attribute is `""` or `null` → uses first language (`"en-US"`)

**Recommendation:** Always add `"en-US"` as the first language for maximum compatibility.

### Generated JSON

For a multi-language prompt, the framework generates Amazon Connect JSON like:

```json
{
  "Identifier": "play-prompt-multilang-abc123",
  "Type": "MessageParticipant",
  "Parameters": {
    "TextToSpeechType": "text",
    "LanguageAttribute": "$.Attributes.Language",
    "AvailableLanguages": ["en-US", "es-ES", "fr-FR"],
    "Text": "Welcome",
    "TextToSpeechVoice": "Joanna",
    "Translations": [
      {
        "Locale": "en-US",
        "Text": "Welcome",
        "Voice": "Joanna",
        "UseNeuralVoice": true,
        "SpeakingRate": 1.0
      },
      {
        "Locale": "es-ES",
        "Text": "Bienvenido",
        "Voice": "Lucia",
        "UseNeuralVoice": true,
        "SpeakingRate": 1.0
      },
      {
        "Locale": "fr-FR",
        "Text": "Bonjour",
        "Voice": "Celine",
        "UseNeuralVoice": true,
        "SpeakingRate": 1.0
      }
    ]
  }
}
```

**Note:** The default `Text` and `TextToSpeechVoice` are set to the first language for fallback compatibility.

## Complete Examples

### Example 1: Basic Multi-Language Flow

```csharp
using Switchboard;
using Switchboard.Configuration;

public class BasicMultiLanguageFlow
{
    public static IFlow Create()
    {
        var builder = new FlowBuilder()
            .SetName("Basic Multi-Language")
            .SetDescription("Simple multi-language welcome flow");

        // Welcome message
        var welcome = new TranslationDictionary()
            .Add("en-US", "Welcome to Acme Corporation")
            .Add("es-ES", "Bienvenido a Acme Corporation")
            .Add("fr-FR", "Bienvenue chez Acme Corporation");

        builder.PlayPrompt(welcome, "$.Attributes.Language");

        // Menu prompt
        var menu = new TranslationDictionary()
            .Add("en-US", "Press 1 for Sales, 2 for Support")
            .Add("es-ES", "Presione 1 para Ventas, 2 para Soporte")
            .Add("fr-FR", "Appuyez sur 1 pour les Ventes, 2 pour le Support");

        builder.PlayPrompt(menu, "$.Attributes.Language")
               .GetCustomerInput(input =>
               {
                   input.MaxDigits = 1;
                   input.TimeoutSeconds = 5;
               })
               .TransferToQueue("Sales");

        return builder.Build();
    }
}
```

### Example 2: Advanced Multi-Language with Neural Voices

```csharp
public class PremiumMultiLanguageFlow
{
    public static IFlow Create()
    {
        var builder = new FlowBuilder()
            .SetName("Premium Multi-Language");

        // Premium welcome with neural voices and custom speaking rate
        var premiumWelcome = new TranslationDictionary()
            .Add("en-US",
                 "Thank you for being a valued customer",
                 "Joanna",
                 useNeuralVoice: true,
                 speakingRate: 1.0)
            .Add("es-ES",
                 "Gracias por ser un cliente valioso",
                 "Lucia",
                 useNeuralVoice: true,
                 speakingRate: 0.95)  // Slightly slower for clarity
            .Add("fr-FR",
                 "Merci d'être un client précieux",
                 "Lea",
                 useNeuralVoice: true,
                 speakingRate: 1.0)
            .Add("de-DE",
                 "Vielen Dank, dass Sie ein geschätzter Kunde sind",
                 "Vicki",
                 useNeuralVoice: true,
                 speakingRate: 0.9);  // Slower for German

        builder.PlayPrompt(premiumWelcome, "$.Attributes.Language");

        return builder.Build();
    }
}
```

### Example 3: Dynamic Language Detection with Lambda

```csharp
using Switchboard;
using Switchboard.Configuration;

public class DynamicLanguageFlow
{
    public static IFlow Create()
    {
        var builder = new FlowBuilder()
            .SetName("Dynamic Language Detection");

        // First, invoke Lambda to detect language from phone number
        builder.InvokeLambda(lambda =>
        {
            lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789:function:DetectLanguage";
            lambda.TimeoutSeconds = 3;
            lambda.InputParameters = new Dictionary<string, string>
            {
                ["PhoneNumber"] = "$.CustomerEndpoint.Address"
            };
            // Lambda should set $.External.Language based on country code
        });

        // Use detected language for prompts
        var welcome = new TranslationDictionary()
            .Add("en-US", "Welcome")
            .Add("es-ES", "Bienvenido")
            .Add("fr-FR", "Bienvenue")
            .Add("pt-BR", "Bem-vindo")
            .Add("de-DE", "Willkommen");

        // Use language set by Lambda
        builder.PlayPrompt(welcome, "$.External.Language");

        return builder.Build();
    }
}
```

### Example 4: Multi-Language with GetCustomerInput

```csharp
public class InteractiveMultiLanguageFlow
{
    public static IFlow Create()
    {
        var builder = new FlowBuilder()
            .SetName("Interactive Multi-Language");

        // Language selection menu
        var languagePrompt = new TranslationDictionary()
            .Add("en-US", "Press 1 for English, 2 for Spanish, 3 for French")
            .Add("es-ES", "Presione 1 para Inglés, 2 para Español, 3 para Francés")
            .Add("fr-FR", "Appuyez sur 1 pour l'Anglais, 2 pour l'Espagnol, 3 pour le Français");

        builder.PlayPrompt(languagePrompt, "$.Attributes.Language")
               .GetCustomerInput(config =>
               {
                   config.Primary.Prompt = "Select your language";
                   config.MaxDigits = 1;
                   config.TimeoutSeconds = 10;
               });

        // Main menu in selected language
        var mainMenu = new TranslationDictionary()
            .Add("en-US", "Press 1 for Sales, 2 for Support, 3 for Billing")
            .Add("es-ES", "Presione 1 para Ventas, 2 para Soporte, 3 para Facturación")
            .Add("fr-FR", "Appuyez sur 1 pour les Ventes, 2 pour le Support, 3 pour la Facturation");

        builder.PlayPrompt(mainMenu, "$.Attributes.SelectedLanguage");

        return builder.Build();
    }
}
```

## Best Practices

### 1. Always Include English Fallback

```csharp
// ✅ Good: English as first language (fallback)
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome")    // First = fallback
    .Add("es-ES", "Bienvenido")
    .Add("fr-FR", "Bienvenue");

// ❌ Avoid: No English fallback
var translations = new TranslationDictionary()
    .Add("es-ES", "Bienvenido")  // Not a safe fallback
    .Add("fr-FR", "Bienvenue");
```

### 2. Use Consistent Attribute Paths

```csharp
// ✅ Good: Consistent attribute naming
builder.PlayPrompt(welcome, "$.Attributes.Language")
       .PlayPrompt(menu, "$.Attributes.Language")
       .PlayPrompt(goodbye, "$.Attributes.Language");

// ❌ Avoid: Inconsistent attributes
builder.PlayPrompt(welcome, "$.Attributes.Language")
       .PlayPrompt(menu, "$.Attributes.PreferredLanguage")  // Different path!
       .PlayPrompt(goodbye, "$.External.Lang");             // Different path!
```

### 3. Match Voice Gender and Tone

```csharp
// ✅ Good: Consistent voice characteristics
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome", "Joanna")    // Female, professional
    .Add("es-ES", "Bienvenido", "Lucia")  // Female, professional
    .Add("fr-FR", "Bienvenue", "Celine"); // Female, professional

// OR all male voices
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome", "Matthew")   // Male, professional
    .Add("es-ES", "Bienvenido", "Enrique") // Male, professional
    .Add("fr-FR", "Bienvenue", "Mathieu"); // Male, professional
```

### 4. Use Neural Voices for Premium Experience

```csharp
// ✅ Best: Neural voices for natural sound
var translations = new TranslationDictionary()
    .Add("en-US", "Thank you for your patience", "Joanna", true, 1.0)
    .Add("es-ES", "Gracias por su paciencia", "Lucia", true, 1.0);

// ⚠️ Standard voices work but sound less natural
var translations = new TranslationDictionary()
    .Add("en-US", "Thank you", "Joanna")  // Defaults to standard engine
    .Add("es-ES", "Gracias", "Lucia");
```

### 5. Adjust Speaking Rate for Clarity

```csharp
// ✅ Good: Slower for complex messages
var complexMessage = new TranslationDictionary()
    .Add("en-US",
         "Your account number is 1-2-3-4-5-6-7-8-9",
         "Joanna",
         useNeuralVoice: true,
         speakingRate: 0.8)  // Slower for numbers
    .Add("es-ES",
         "Su número de cuenta es 1-2-3-4-5-6-7-8-9",
         "Lucia",
         useNeuralVoice: true,
         speakingRate: 0.75); // Even slower for Spanish
```

### 6. Test Fallback Scenarios

```csharp
// Ensure fallback works when attribute is missing
var translations = new TranslationDictionary()
    .Add("en-US", "Fallback message")  // Will be used if Language attribute is missing
    .Add("es-ES", "Mensaje alternativo")
    .Add("fr-FR", "Message de secours");

builder.PlayPrompt(translations, "$.Attributes.Language");
// If $.Attributes.Language doesn't exist → plays English
```

### 7. Document Language Codes

```csharp
// ✅ Good: Clear documentation of supported languages
/// <summary>
/// Welcome flow supporting:
/// - en-US: English (United States)
/// - es-ES: Spanish (Spain)
/// - es-MX: Spanish (Mexico)
/// - fr-FR: French (France)
/// - fr-CA: French (Canada)
/// </summary>
public static IFlow CreateWelcomeFlow()
{
    var translations = new TranslationDictionary()
        .Add("en-US", "Welcome")
        .Add("es-ES", "Bienvenido")
        .Add("es-MX", "Bienvenido")
        .Add("fr-FR", "Bienvenue")
        .Add("fr-CA", "Bienvenue");

    // ...
}
```

## Testing

### Unit Testing Multi-Language Flows

```csharp
using NUnit.Framework;
using FluentAssertions;

[TestFixture]
public class MultiLanguageFlowTests
{
    [Test]
    public void MultiLanguagePrompt_WithThreeLanguages_ShouldContainAllTranslations()
    {
        // Arrange
        var translations = new TranslationDictionary()
            .Add("en-US", "Welcome")
            .Add("es-ES", "Bienvenido")
            .Add("fr-FR", "Bienvenue");

        var builder = new FlowBuilder()
            .SetName("Test Flow")
            .PlayPrompt(translations, "$.Attributes.Language");

        // Act
        var flow = builder.Build();

        // Assert
        flow.Actions.Should().HaveCount(1);
        var action = flow.Actions[0] as PlayPromptAction;
        action.Should().NotBeNull();
        action!.IsMultiLanguage.Should().BeTrue();
        action.Translations.Should().NotBeNull();
        action.Translations!.Count.Should().Be(3);
        action.LanguageAttribute.Should().Be("$.Attributes.Language");
    }

    [Test]
    public void TranslationDictionary_GetOrFallback_ShouldReturnFallbackForUnknownLocale()
    {
        // Arrange
        var translations = new TranslationDictionary()
            .Add("en-US", "Welcome")
            .Add("es-ES", "Bienvenido");

        // Act
        var prompt = translations.GetOrFallback("de-DE");  // German not supported

        // Assert
        prompt.Should().NotBeNull();
        prompt.Locale.Should().Be("en-US");  // Falls back to en-US
        prompt.Text.Should().Be("Welcome");
    }
}
```

## Troubleshooting

### Issue: Wrong language plays despite correct attribute

**Cause:** Language attribute path is incorrect

**Solution:** Verify the attribute path matches your contact attributes:
```csharp
// Check attribute path in Amazon Connect console
// Attributes → Language: "es-ES"

// Correct path
builder.PlayPrompt(translations, "$.Attributes.Language");  // ✅

// Wrong paths
builder.PlayPrompt(translations, "$.Language");            // ❌
builder.PlayPrompt(translations, "$.Attributes.language");  // ❌ (case-sensitive!)
```

### Issue: Always plays English fallback

**Possible causes:**
1. Language attribute is not set on the contact
2. Language code doesn't match dictionary keys
3. Attribute path is incorrect

**Solution:**
```csharp
// Debug: Log the attribute value in a Lambda
// Then verify it matches your dictionary keys exactly

var translations = new TranslationDictionary()
    .Add("en-US", "Welcome")  // Must match exactly
    .Add("es-ES", "Bienvenido")
    .Add("fr-FR", "Bienvenue");

// Attribute value must be: "en-US", "es-ES", or "fr-FR"
// NOT: "en", "es", "English", "Spanish", etc.
```

### Issue: Voice doesn't match language

**Cause:** Incorrect voice specified for language

**Solution:** Use VoiceHelper to get valid voices:
```csharp
// ❌ Wrong: English voice for Spanish
.Add("es-ES", "Bienvenido", "Joanna")  // Joanna is English!

// ✅ Correct: Spanish voice for Spanish
.Add("es-ES", "Bienvenido", "Lucia")   // Lucia is Spanish

// ✅ Or use default
.Add("es-ES", "Bienvenido")  // Automatically uses "Lucia"
```

## Related Documentation

- [Flow Basics](./basics.md) - Learn about flow building fundamentals
- [Dynamic Prompts](./basics.md#dynamic-prompts) - Dynamic text resolution from attributes
- [Speech Recognition](./speech-recognition.md) - ASR and DTMF input modes
- [Amazon Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html) - Complete voice reference

## Next Steps

1. **Read the basics**: Start with [Flow Basics](./basics.md) if you're new to the framework
2. **Try the example**: Check out the complete multi-language example in the next section
3. **Explore voices**: Review all 40+ supported locales and voices in the [VoiceHelper](#supported-locales) reference
4. **Build your flow**: Combine multi-language with other features like branching and Lambda integration
