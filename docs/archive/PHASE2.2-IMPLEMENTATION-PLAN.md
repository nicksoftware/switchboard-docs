# Phase 2.2 Implementation Plan

**Goal:** Complete all remaining Phase 2.2 features to finish the core fluent API
**Status:** Sprint 2 Complete (4/7) → Sprint 3-5 will complete remaining 3 features
**Timeline:** 3 sprints (ASR → Multi-Language → Dynamic Menus)

---

## Sprint 3: Speech Recognition (ASR) Integration

**Duration:** 1 sprint
**Priority:** HIGH
**Depends On:** GetCustomerInput (✅ Complete)

### Overview

Enable voice input using Amazon Lex instead of (or in addition to) DTMF. This allows customers to speak naturally instead of pressing buttons.

### Architecture Decision: Sequential Mode (Primary/Fallback Pattern)

Amazon Connect supports **sequential input modes** where:
1. **Primary** input is attempted first (e.g., ASR)
2. If primary fails (timeout, no match, low confidence), **Fallback** input is used (e.g., DTMF)

This is already partially implemented in `InputConfiguration.cs` with:
- `PrimaryInputConfiguration` - First attempt (ASR, DTMF)
- `FallbackInputConfiguration` - Backup if primary fails
- `IsSequential` property - Indicates sequential mode

**We need to complete this implementation.**

### User Stories

1. **As a developer**, I want to configure Lex bot input so customers can speak their choice
2. **As a developer**, I want to set confidence thresholds so low-confidence results retry
3. **As a developer**, I want to configure fallback to DTMF when ASR fails
4. **As a customer**, I want to speak naturally instead of pressing buttons

### API Design

#### Fluent API

```csharp
// Pure ASR (no fallback)
.GetCustomerInput(input =>
{
    input.Primary.Mode = InputMode.ASR;
    input.Primary.LexBot = "CustomerServiceBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.LexBotVersion = "V2";
    input.Primary.Locale = "en-US";
    input.Primary.Prompt = "How can I help you today?";
    input.Primary.ConfidenceThreshold = 0.7;
    input.TimeoutSeconds = 10;
})

// ASR with DTMF fallback (Sequential Mode)
.GetCustomerInput(input =>
{
    // Primary: ASR
    input.Primary.Mode = InputMode.ASR;
    input.Primary.LexBot = "MenuBot";
    input.Primary.Prompt = "You can say 'sales', 'support', or 'billing'.";
    input.Primary.ConfidenceThreshold = 0.6;

    // Fallback: DTMF
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Or press 1 for sales, 2 for support, 3 for billing.";

    input.MaxDigits = 1;
    input.TimeoutSeconds = 8;
})

// Route based on intents (not digits)
.RouteByInput(router => router
    .When("sales_intent", "sales", sales => /* ... */)
    .When("support_intent", "support", support => /* ... */)
    .Otherwise(fallback => /* ... */))
```

#### Attribute-Based API

```csharp
[GetCustomerInput(
    PrimaryMode = InputMode.ASR,
    LexBot = "MenuBot",
    Prompt = "How can I help you?",
    FallbackMode = InputMode.DTMF,
    FallbackPrompt = "Or press 1 for sales, 2 for support.",
    MaxDigits = 1,
    Timeout = 8)]
public partial void GetCustomerChoice();
```

### Implementation Tasks

#### 1. Extend Enums (`/src/Switchboard/Enums/InputMode.cs`)

```csharp
public enum InputMode
{
    DTMF,
    ASR,      // NEW
    Text      // NEW - for chat/messaging channels
}
```

#### 2. Extend PrimaryInputConfiguration (`/src/Switchboard/Configuration/InputConfiguration.cs`)

Add ASR-specific properties:

```csharp
public class PrimaryInputConfiguration
{
    // Existing
    public InputMode Mode { get; set; } = InputMode.DTMF;
    public string? Prompt { get; set; }

    // NEW: Amazon Lex Configuration
    public string? LexBot { get; set; }
    public string? LexBotAlias { get; set; } = "$LATEST";
    public string? LexBotVersion { get; set; } = "V2"; // V1 or V2
    public string? Locale { get; set; } = "en-US";

    // NEW: ASR Configuration
    public double ConfidenceThreshold { get; set; } = 0.4; // 0.0 to 1.0
    public int? MaxSpeechDurationSeconds { get; set; }
}
```

#### 3. Update GetCustomerInputAction (`/src/Switchboard/Actions/GetCustomerInputAction.cs`)

No changes needed - `InputConfiguration` property already exists and will contain ASR config.

#### 4. Update FlowBuilder JSON Generation (`/src/Switchboard/Builders/FlowBuilder.cs`)

Update `GenerateGetCustomerInputParameters()` method to handle ASR:

```csharp
private object GenerateGetCustomerInputParameters(GetCustomerInputAction getInput)
{
    if (getInput.InputConfiguration?.IsSequential == true)
    {
        var config = getInput.InputConfiguration;

        if (config.Primary.Mode == InputMode.ASR)
        {
            return new
            {
                Text = config.Primary.Prompt,
                LexBot = new
                {
                    Name = config.Primary.LexBot,
                    Alias = config.Primary.LexBotAlias,
                    LocaleId = config.Primary.Locale
                },
                LexVersion = config.Primary.LexBotVersion,
                ConfidenceThreshold = config.Primary.ConfidenceThreshold,
                // Fallback DTMF parameters if configured
                DTMF = config.Fallback.Mode == InputMode.DTMF ? new
                {
                    MaxDigits = config.MaxDigits,
                    TimeoutSeconds = config.TimeoutSeconds
                } : null
            };
        }
    }

    // Existing DTMF logic...
}
```

#### 5. Update RouteByInput (`/src/Switchboard/Builders/InputRouter.cs`)

Already supports intent-based routing via the second parameter in `When()`:

```csharp
.When("sales_intent", "sales", /* ... */)
                      ^^^^^^^^
                      This is the intent/digit value
```

Just need to document that it works for both intents and digits.

#### 6. Update GetCustomerInputAttribute

```csharp
public class GetCustomerInputAttribute : Attribute
{
    // Existing properties...

    // NEW: ASR properties
    public InputMode PrimaryMode { get; set; } = InputMode.DTMF;
    public string? LexBot { get; set; }
    public string? LexBotAlias { get; set; }
    public string? LexBotVersion { get; set; } = "V2";
    public string? Locale { get; set; } = "en-US";
    public double ConfidenceThreshold { get; set; } = 0.4;

    public InputMode? FallbackMode { get; set; }
    public string? FallbackPrompt { get; set; }
}
```

### Testing Strategy

#### Unit Tests (`/tests/Switchboard.Tests/Configuration/InputConfigurationTests.cs`)

```csharp
[Test]
public void InputConfiguration_ASR_SetsCorrectMode()
{
    var config = new InputConfiguration();
    config.Primary.Mode = InputMode.ASR;
    config.Primary.LexBot = "MenuBot";

    config.Primary.Mode.Should().Be(InputMode.ASR);
    config.Primary.LexBot.Should().Be("MenuBot");
}

[Test]
public void InputConfiguration_Sequential_ASR_To_DTMF()
{
    var config = new InputConfiguration();
    config.Primary.Mode = InputMode.ASR;
    config.Fallback.Mode = InputMode.DTMF;

    config.IsSequential.Should().BeTrue();
}

[Test]
public void InputConfiguration_ConfidenceThreshold_DefaultsTo04()
{
    var config = new InputConfiguration();
    config.Primary.ConfidenceThreshold.Should().Be(0.4);
}
```

#### Builder Tests (`/tests/Switchboard.Tests/Builders/FlowBuilderASRTests.cs`)

```csharp
[Test]
public void FlowBuilder_GetCustomerInput_ASR_GeneratesCorrectJSON()
{
    var flow = new FlowBuilder()
        .SetName("ASRTest")
        .GetCustomerInput(input =>
        {
            input.Primary.Mode = InputMode.ASR;
            input.Primary.LexBot = "MenuBot";
            input.Primary.Prompt = "How can I help?";
        })
        .Build();

    var json = flow.Content;
    json.Should().Contain("MenuBot");
    json.Should().Contain("LexVersion");
}

[Test]
public void FlowBuilder_GetCustomerInput_ASR_WithDTMFFallback()
{
    var flow = new FlowBuilder()
        .SetName("SequentialTest")
        .GetCustomerInput(input =>
        {
            input.Primary.Mode = InputMode.ASR;
            input.Primary.LexBot = "Bot";
            input.Fallback.Mode = InputMode.DTMF;
            input.MaxDigits = 1;
        })
        .Build();

    flow.Actions.Should().HaveCount(1);
    var action = flow.Actions[0] as GetCustomerInputAction;
    action!.InputConfiguration!.IsSequential.Should().BeTrue();
}

[Test]
public void FlowBuilder_RouteByInput_WorksWithIntents()
{
    var flow = new FlowBuilder()
        .SetName("IntentRouting")
        .GetCustomerInput(input =>
        {
            input.Primary.Mode = InputMode.ASR;
            input.Primary.LexBot = "MenuBot";
        })
        .RouteByInput(router => router
            .When("sales", "sales_intent", s => s.Disconnect())
            .Otherwise(o => o.Disconnect()))
        .Build();

    flow.Actions.Should().HaveCountGreaterThan(1);
}
```

#### Integration Tests (`/tests/Switchboard.IntegrationTests/ASRFlowTests.cs`)

```csharp
[Test]
public void ASRFlow_GeneratesValidConnectJSON()
{
    var app = new SwitchboardApp();
    var stack = app.CreateStack("ASRTest", "asr-test");

    var flow = new FlowBuilder()
        .SetName("ASRFlow")
        .GetCustomerInput(input =>
        {
            input.Primary.Mode = InputMode.ASR;
            input.Primary.LexBot = "TestBot";
            input.Primary.Locale = "en-US";
            input.Fallback.Mode = InputMode.DTMF;
            input.MaxDigits = 1;
        })
        .RouteByInput(router => router
            .When("sales", "1", s => s.Disconnect())
            .Otherwise(o => o.Disconnect()))
        .Build();

    stack.AddFlow(flow);

    // Synth and verify
    var template = app.Synth();
    template.Should().NotBeNull();
}
```

### Documentation

#### 1. Create `/docs/guide/flows/speech-recognition.md`

```markdown
# Speech Recognition (ASR)

Enable natural voice input using Amazon Lex instead of touchtone (DTMF) input.

## Overview

Speech Recognition (ASR) allows customers to speak their choices naturally:
- "I need technical support" instead of "Press 2"
- "Talk to billing" instead of "Press 3"
- More accessible for customers

## Amazon Lex Integration

Switchboard integrates with Amazon Lex V2 bots for speech recognition.

### Prerequisites

1. **Create a Lex V2 Bot** in AWS Console
2. **Define intents** (sales_intent, support_intent, etc.)
3. **Deploy bot** to an alias (e.g., "Production")

### Basic ASR Input

```csharp
.GetCustomerInput(input =>
{
    input.Primary.Mode = InputMode.ASR;
    input.Primary.LexBot = "CustomerServiceBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.Prompt = "How can I help you today?";
})
```

### ASR with DTMF Fallback (Recommended)

Provide touchtone as backup if speech fails:

```csharp
.GetCustomerInput(input =>
{
    // Try speech first
    input.Primary.Mode = InputMode.ASR;
    input.Primary.LexBot = "MenuBot";
    input.Primary.Prompt = "You can say sales, support, or billing.";

    // Fall back to DTMF
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Or press 1 for sales, 2 for support, 3 for billing.";

    input.MaxDigits = 1;
})
```

### Routing by Intent

Use `RouteByInput()` with intent names:

```csharp
.RouteByInput(router => router
    .When("sales_intent", "1", sales => sales
        .TransferToQueue("Sales")
        .Disconnect())
    .When("support_intent", "2", support => support
        .TransferToQueue("Support")
        .Disconnect())
    .Otherwise(fallback => fallback
        .PlayPrompt("I didn't understand. Transferring to general support.")
        .TransferToQueue("General")
        .Disconnect()))
```

**Note:** The second parameter supports both:
- **Intent names** for ASR: "sales_intent"
- **Digit values** for DTMF: "1"

### Confidence Threshold

Control how confident the bot must be:

```csharp
input.Primary.ConfidenceThreshold = 0.7; // 70% confidence required
```

- **0.4** (default) - Accept most matches
- **0.6** - Medium confidence
- **0.8** - High confidence only

Lower threshold = more false positives
Higher threshold = more fallbacks to DTMF

### Multi-Language ASR

```csharp
input.Primary.Locale = "es-ES"; // Spanish (Spain)
input.Primary.Locale = "fr-FR"; // French (France)
input.Primary.Locale = "de-DE"; // German
```

See [Multi-Language Support](./multi-language.md) for full list.

## Complete Example

```csharp
var flow = new FlowBuilder()
    .SetName("SmartIVR")

    .PlayPrompt("Welcome to Acme Corporation")

    .GetCustomerInput(input =>
    {
        // ASR primary
        input.Primary.Mode = InputMode.ASR;
        input.Primary.LexBot = "AcmeMenuBot";
        input.Primary.LexBotAlias = "Production";
        input.Primary.Locale = "en-US";
        input.Primary.Prompt = "You can say sales, technical support, billing, or operator.";
        input.Primary.ConfidenceThreshold = 0.6;

        // DTMF fallback
        input.Fallback.Mode = InputMode.DTMF;
        input.Fallback.PromptText = "Or use your keypad: press 1 for sales, 2 for support, 3 for billing, or 0 for operator.";

        input.MaxDigits = 1;
        input.TimeoutSeconds = 8;
    })

    .RouteByInput(router => router
        .When("sales_intent", "1", sales => sales
            .PlayPrompt("Connecting you to our sales team.")
            .TransferToQueue("Sales")
            .Disconnect())

        .When("support_intent", "2", support => support
            .PlayPrompt("Transferring to technical support.")
            .TransferToQueue("TechnicalSupport")
            .Disconnect())

        .When("billing_intent", "3", billing => billing
            .PlayPrompt("Routing to billing.")
            .TransferToQueue("Billing")
            .Disconnect())

        .When("operator_intent", "0", operator => operator
            .PlayPrompt("Please hold for the next available operator.")
            .TransferToQueue("General")
            .Disconnect())

        .Otherwise(fallback => fallback
            .PlayPrompt("I'm sorry, I didn't understand. Let me connect you to someone who can help.")
            .TransferToQueue("General")
            .Disconnect()))

    .Build();
```

## Best Practices

1. **Always provide DTMF fallback** - Not all customers can/want to speak
2. **Set appropriate confidence thresholds** - Balance accuracy vs. fallback rate
3. **Keep prompts concise** - "Say sales or support" not "You may say..."
4. **Test with real users** - Speech recognition accuracy varies by accent/environment
5. **Monitor metrics** - Track ASR success rate vs. DTMF fallback rate

## Troubleshooting

### High Fallback Rate

**Problem:** Too many customers falling back to DTMF
**Solutions:**
- Lower confidence threshold (0.4 - 0.5)
- Simplify bot intents
- Add more sample utterances in Lex

### False Positives

**Problem:** Wrong intent being matched
**Solutions:**
- Raise confidence threshold (0.7 - 0.8)
- Improve intent separation in Lex
- Add negative examples to intents

### Timeout Issues

**Problem:** Customers not responding in time
**Solutions:**
- Increase `TimeoutSeconds` (8-10)
- Provide clearer prompting
- Add retry logic

## See Also

- [Input Basics](./basics.md#customer-input)
- [Multi-Language Support](./multi-language.md)
- [Amazon Lex Documentation](https://docs.aws.amazon.com/lex/)
```

#### 2. Update `/docs/guide/flows/basics.md`

Add ASR example in the Customer Input section.

#### 3. Update VitePress sidebar (`/docs/.vitepress/config.mts`)

Add "Speech Recognition" link.

### Example Code

#### Create `/examples/EnterpriseFluentExample/Flows/ASR/SmartIVRFlowBuilder.cs`

```csharp
using Switchboard.Builders;
using Switchboard.Configuration;
using Switchboard.Enums;
using Switchboard.Models;

namespace EnterpriseFluentExample.Flows.ASR;

/// <summary>
/// Smart IVR with voice recognition (ASR) and DTMF fallback.
/// Demonstrates Amazon Lex integration for natural language input.
/// </summary>
public static class SmartIVRFlowBuilder
{
    public static IFlow Build()
    {
        return new FlowBuilder()
            .SetName("SmartIVR")
            .SetDescription("Voice-enabled IVR with speech recognition")
            .SetType(FlowType.ContactFlow)

            .PlayPrompt("Welcome to Acme Corporation. Our menu has changed to serve you better.")

            .GetCustomerInput(input =>
            {
                // Primary: Amazon Lex ASR
                input.Primary.Mode = InputMode.ASR;
                input.Primary.LexBot = "AcmeMenuBot";
                input.Primary.LexBotAlias = "Production";
                input.Primary.LexBotVersion = "V2";
                input.Primary.Locale = "en-US";
                input.Primary.Prompt = "You can say: sales, technical support, billing, or operator.";
                input.Primary.ConfidenceThreshold = 0.6;

                // Fallback: DTMF
                input.Fallback.Mode = InputMode.DTMF;
                input.Fallback.PromptText = "Or use your phone's keypad: press 1 for sales, 2 for support, 3 for billing, or 0 for operator.";

                input.MaxDigits = 1;
                input.TimeoutSeconds = 8;
            })

            .RouteByInput(router => router
                .When("sales_intent", "1", sales => sales
                    .PlayPrompt("Connecting you to our sales team. Please hold.")
                    .TransferToQueue("Sales")
                    .Disconnect())

                .When("support_intent", "2", support => support
                    .PlayPrompt("Transferring to technical support.")
                    .TransferToQueue("TechnicalSupport")
                    .Disconnect())

                .When("billing_intent", "3", billing => billing
                    .PlayPrompt("Routing to our billing department.")
                    .TransferToQueue("Billing")
                    .Disconnect())

                .When("operator_intent", "0", operator => operator
                    .PlayPrompt("Please hold for the next available operator.")
                    .TransferToQueue("General")
                    .Disconnect())

                .Otherwise(fallback => fallback
                    .PlayPrompt("I'm sorry, I didn't understand your selection. Let me connect you to someone who can help.")
                    .TransferToQueue("General")
                    .Disconnect()))

            .Build();
    }
}
```

### Test Coverage Target

- **Unit Tests**: 15+ tests (InputConfiguration, ASR mode, confidence, fallback)
- **Builder Tests**: 10+ tests (JSON generation, routing)
- **Integration Tests**: 5+ tests (full flow synthesis)
- **Target Coverage**: >95%

### Success Criteria

- [ ] InputMode.ASR enum value exists
- [ ] PrimaryInputConfiguration has all Lex properties
- [ ] FlowBuilder generates correct Amazon Connect JSON for ASR
- [ ] RouteByInput works with intent names
- [ ] Sequential mode (ASR → DTMF fallback) works
- [ ] All tests passing (30+ new tests)
- [ ] Documentation complete with examples
- [ ] Example flow in EnterpriseFluentExample
- [ ] VitePress docs updated

---

## Sprint 4: Multi-Language Support

**Duration:** 1 sprint
**Priority:** MEDIUM
**Depends On:** PlayPrompt (✅), ASR (Sprint 3)

### Overview

Enable flows to support multiple languages with:
- Language-specific prompts
- Voice selection by language
- Locale-aware ASR
- Translation helpers

### User Stories

1. **As a developer**, I want to define prompts in multiple languages
2. **As a developer**, I want to select appropriate voices for each language
3. **As a customer**, I want to hear prompts in my preferred language

### API Design

#### Option 1: Translation Dictionary (Simple)

```csharp
var translations = new TranslationDictionary()
    .Add("en-US", "Welcome to our service", "Joanna")
    .Add("es-ES", "Bienvenido a nuestro servicio", "Lupe")
    .Add("fr-FR", "Bienvenue dans notre service", "Celine");

.PlayPrompt(translations, language: "$.Attributes.CustomerLanguage")
```

#### Option 2: Multi-Language Configuration (Advanced)

```csharp
.PlayPrompt(prompt =>
{
    prompt.AddLanguage("en-US", config =>
    {
        config.Text = "Welcome to our service";
        config.Voice = "Joanna";
    });

    prompt.AddLanguage("es-ES", config =>
    {
        config.Text = "Bienvenido a nuestro servicio";
        config.Voice = "Lupe";
    });

    prompt.LanguageAttribute = "$.Attributes.PreferredLanguage";
})
```

#### Option 3: External Translation Service (Dynamic)

```csharp
.InvokeLambda("TranslationService", lambda =>
{
    lambda.InputParameters["MessageKey"] = "welcome_message";
    lambda.InputParameters["Language"] = "$.Attributes.Language";
})
.OnSuccess(s => s
    .PlayPromptDynamic("$.External.TranslatedText"))
```

**Decision: Implement Option 1 first (simple), Option 2 later**

### Implementation Tasks

#### 1. Create TranslationDictionary (`/src/Switchboard/Configuration/TranslationDictionary.cs`)

```csharp
public class TranslationDictionary
{
    private Dictionary<string, LanguagePrompt> _translations = new();

    public TranslationDictionary Add(string locale, string text, string? voice = null)
    {
        _translations[locale] = new LanguagePrompt
        {
            Text = text,
            Voice = voice ?? GetDefaultVoice(locale)
        };
        return this;
    }

    public LanguagePrompt? Get(string locale) =>
        _translations.TryGetValue(locale, out var prompt) ? prompt : null;

    private static string GetDefaultVoice(string locale) => locale switch
    {
        "en-US" => "Joanna",
        "es-ES" => "Lupe",
        "fr-FR" => "Celine",
        "de-DE" => "Vicki",
        "pt-BR" => "Vitoria",
        "it-IT" => "Carla",
        "ja-JP" => "Mizuki",
        _ => "Joanna"
    };
}

public class LanguagePrompt
{
    public required string Text { get; set; }
    public string? Voice { get; set; }
    public bool UseNeuralVoice { get; set; } = true;
}
```

#### 2. Add Multi-Language PlayPrompt Overload

```csharp
// In FlowBuilder
public IFlowBuilder PlayPrompt(TranslationDictionary translations, string languageAttribute)
{
    // Generate PlayPrompt action with language resolution logic
    // Amazon Connect will evaluate languageAttribute at runtime
}
```

#### 3. Voice Mapping Helper

```csharp
public static class VoiceHelper
{
    public static readonly Dictionary<string, string[]> VoicesByLocale = new()
    {
        ["en-US"] = new[] { "Joanna", "Matthew", "Kendra", "Kimberly", "Ivy", "Joey", "Justin", "Salli" },
        ["en-GB"] = new[] { "Amy", "Emma", "Brian" },
        ["en-AU"] = new[] { "Nicole", "Russell" },
        ["en-IN"] = new[] { "Aditi", "Raveena" },
        ["es-ES"] = new[] { "Lucia", "Conchita", "Enrique" },
        ["es-MX"] = new[] { "Mia" },
        ["es-US"] = new[] { "Lupe", "Penelope", "Miguel" },
        ["fr-FR"] = new[] { "Celine", "Lea", "Mathieu" },
        ["fr-CA"] = new[] { "Chantal" },
        ["de-DE"] = new[] { "Vicki", "Marlene", "Hans" },
        ["it-IT"] = new[] { "Carla", "Bianca", "Giorgio" },
        ["pt-BR"] = new[] { "Vitoria", "Camila", "Ricardo" },
        ["pt-PT"] = new[] { "Ines", "Cristiano" },
        ["ja-JP"] = new[] { "Mizuki", "Takumi" },
        ["ko-KR"] = new[] { "Seoyeon" },
        ["zh-CN"] = new[] { "Zhiyu" }
    };

    public static string GetDefaultVoice(string locale) =>
        VoicesByLocale.TryGetValue(locale, out var voices) ? voices[0] : "Joanna";
}
```

### Testing Strategy

- Translation dictionary tests
- Voice mapping tests
- Multi-language flow JSON generation
- Integration tests

### Documentation

Create `/docs/guide/flows/multi-language.md` with examples for all supported locales.

### Success Criteria

- [ ] TranslationDictionary class implemented
- [ ] Multi-language PlayPrompt() overload
- [ ] Voice mapping helper
- [ ] Tests passing (20+ tests)
- [ ] Documentation complete
- [ ] Example flow

---

## Sprint 5: Dynamic Menu Framework

**Duration:** 1 sprint
**Priority:** HIGH
**Depends On:** GetCustomerInput (✅), InvokeLambda (✅), ASR (Sprint 3)

### Overview

Enable menus to be configured in DynamoDB and updated without code deployments. Supports:
- Dynamic menu structure
- Multi-tenant menu configurations
- Sub-menu recursion
- Intent and DTMF routing

### Architecture: Dual Approach

#### Approach 1: Lambda-Based (Manual)

Developer creates Lambda functions manually, framework provides helpers.

```csharp
.InvokeLambda("MenuConfigFetcher", lambda =>
{
    lambda.FunctionArn = "arn:...";
    lambda.InputParameters["MenuId"] = "main_menu";
})
.OnSuccess(success => success
    .PlayPromptDynamic("$.External.MenuPrompt")
    .GetCustomerInput(input => { /* ... */ })
    .InvokeLambda("MenuRouter", lambda => { /* ... */ })
    .OnSuccess(routed => routed
        .TransferToQueueDynamic("$.External.TargetQueue")))
```

#### Approach 2: Framework Helper (Automatic)

Framework generates and deploys Lambda functions automatically.

```csharp
.DynamicMenu("main_menu", menu =>
{
    menu.TableName = "MenuConfigurations";
    menu.TenantIdAttribute = "$.Attributes.TenantId";
    menu.MaxDepth = 3;
    menu.DefaultLanguage = "en-US";
})
```

**Decision: Implement Approach 1 first (gives developers full control)**

### DynamoDB Schema

#### MenuConfigurations Table

```json
{
  "MenuId": "main_menu",
  "TenantId": "acme-corp",
  "Prompt": "For sales, press 1. For support, press 2.",
  "Voice": "Joanna",
  "Options": [
    {
      "Digit": "1",
      "Intent": "sales_intent",
      "TargetType": "Queue",
      "TargetArn": "arn:aws:connect:...",
      "Prompt": "Connecting to sales..."
    },
    {
      "Digit": "2",
      "Intent": "support_intent",
      "TargetType": "SubMenu",
      "SubMenuId": "support_submenu"
    }
  ],
  "DefaultOption": {
    "TargetType": "Queue",
    "TargetArn": "arn:aws:connect:..."
  },
  "TTL": 3600,
  "UpdatedAt": "2025-10-27T00:00:00Z"
}
```

### Lambda Functions

#### MenuConfigFetcher

```typescript
// Fetches menu config from DynamoDB
export const handler = async (event: any) => {
    const menuId = event.Details.Parameters.MenuId;
    const tenantId = event.Details.ContactData.Attributes.TenantId;

    const config = await getMenuConfig(menuId, tenantId);

    return {
        MenuPrompt: config.Prompt,
        Voice: config.Voice,
        Options: JSON.stringify(config.Options)
    };
};
```

#### MenuRouter

```typescript
// Routes based on customer input and menu config
export const handler = async (event: any) => {
    const customerInput = event.Details.ContactData.CustomerInput;
    const options = JSON.parse(event.Details.Parameters.Options);

    const selectedOption = options.find(o =>
        o.Digit === customerInput || o.Intent === customerInput);

    return {
        TargetType: selectedOption.TargetType,
        TargetArn: selectedOption.TargetArn,
        SubMenuId: selectedOption.SubMenuId,
        Prompt: selectedOption.Prompt
    };
};
```

### Implementation Tasks

1. Create DynamoDB schema
2. Create Lambda function templates
3. Add CDK construct for deploying Lambdas
4. Create helper methods for menu flows
5. Add caching layer (ElastiCache/DAX)
6. Write tests
7. Create documentation
8. Create example

### Testing Strategy

- Unit tests for menu config models
- Lambda function tests (with DynamoDB Local)
- Integration tests (full menu flow)
- Multi-tenant tests

### Documentation

Create `/docs/guide/flows/dynamic-menus.md` with:
- DynamoDB schema reference
- Lambda function templates
- Multi-tenant setup
- Caching strategies

### Success Criteria

- [ ] DynamoDB schema defined
- [ ] Lambda function templates created
- [ ] CDK construct for Lambda deployment
- [ ] Helper methods for menu flows
- [ ] Tests passing (25+ tests)
- [ ] Documentation complete
- [ ] Example implementation

---

## Summary: Sprint 3-5 Deliverables

### Sprint 3: ASR
- ✅ InputMode.ASR enum
- ✅ Lex bot configuration
- ✅ Sequential mode (ASR → DTMF)
- ✅ Intent-based routing
- ✅ 30+ tests
- ✅ Documentation
- ✅ Example flow

### Sprint 4: Multi-Language
- ✅ TranslationDictionary
- ✅ Voice mapping helper
- ✅ Multi-language PlayPrompt
- ✅ 20+ tests
- ✅ Documentation
- ✅ Example flow

### Sprint 5: Dynamic Menus
- ✅ DynamoDB schema
- ✅ Lambda templates
- ✅ CDK construct
- ✅ Helper methods
- ✅ 25+ tests
- ✅ Documentation
- ✅ Example implementation

### Total New Tests: 75+
### Total New Features: 3
### Phase 2.2 Status: ✅ COMPLETE (7/7)

---

## Next Steps After Completion

After Sprint 5:
1. Update `/docs/PHASE2-ROADMAP.md` - mark Phase 2.2 as complete
2. Create release notes for v0.2.0
3. Publish updated NuGet packages
4. Begin Phase 2.3: Source Generators (make attributes work!)

Ready to begin Sprint 3 (ASR)? 🚀
