# Speech Recognition (ASR)

Amazon Connect supports speech recognition through integration with Amazon Lex, allowing callers to interact with your contact flows using natural language instead of pressing buttons.

## Overview

Speech recognition (also called Automatic Speech Recognition or ASR) enables:

- **Natural conversation** - Callers can speak instead of navigating DTMF menus
- **Intent recognition** - Understand what callers want, not just what they say
- **Multi-language support** - Over 20 languages and dialects
- **Fallback to DTMF** - Automatic fallback when speech recognition fails
- **Better caller experience** - Faster, more intuitive interactions

## Amazon Lex Integration

The Switchboard framework integrates with Amazon Lex V2 (recommended) and V1 bots.

### Prerequisites

1. **Amazon Lex Bot** - Create and train a Lex bot with intents
2. **Bot Permissions** - Grant Amazon Connect access to invoke the bot
3. **Bot Alias** - Deploy bot to an alias (e.g., "Production", "Development")

### Lex Bot Setup Example

```json
// Example Lex V2 Bot Configuration
{
  "botName": "CustomerServiceBot",
  "intents": [
    {
      "name": "Sales",
      "sampleUtterances": [
        "I want to talk to sales",
        "Sales department",
        "I need to buy something"
      ]
    },
    {
      "name": "Support",
      "sampleUtterances": [
        "I need help",
        "Technical support",
        "Something is broken"
      ]
    },
    {
      "name": "Billing",
      "sampleUtterances": [
        "I have a question about my bill",
        "Billing department",
        "Invoice question"
      ]
    }
  ]
}
```

## Basic ASR Input

### Using Fluent API

```csharp
using Switchboard;
using Switchboard.Configuration;
using Switchboard.Enums;

public class SmartIVRFlow : FlowBuilderBase
{
    protected override void Build(FlowBuilder builder)
    {
        builder.ThenGetInput(input =>
        {
            // Configure ASR
            input.Primary.Mode = InputMode.ASR;
            input.Primary.LexBot = "CustomerServiceBot";
            input.Primary.LexBotAlias = "Production";
            input.Primary.LexBotVersion = "V2";
            input.Primary.Locale = "en_US";
            input.Primary.Prompt = "How can I help you today?";
            input.Primary.ConfidenceThreshold = 0.6;

            // Disable fallback for pure ASR
            input.EnableFallback = false;
        })
        .RouteByInput(router =>
        {
            router.OnIntent("Sales", flow =>
            {
                flow.PlayPrompt("Transferring you to sales...")
                    .ThenTransferToQueue("SalesQueue");
            });

            router.OnIntent("Support", flow =>
            {
                flow.PlayPrompt("Connecting you to technical support...")
                    .ThenTransferToQueue("SupportQueue");
            });

            router.OnIntent("Billing", flow =>
            {
                flow.PlayPrompt("Let me get you to our billing team...")
                    .ThenTransferToQueue("BillingQueue");
            });

            router.OnNoMatch(flow =>
            {
                flow.PlayPrompt("I didn't understand. Let me connect you to an agent.")
                    .ThenTransferToQueue("GeneralQueue");
            });

            router.OnError(flow =>
            {
                flow.PlayPrompt("Sorry, we're experiencing technical difficulties.")
                    .ThenDisconnect();
            });
        });
    }
}
```

### Using Attributes

```csharp
using Switchboard.Attributes;
using Switchboard.Actions;

[ContactFlow("SmartIVR")]
public partial class SmartIVRFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput(
        InputType = CustomerInputType.ASR,
        Text = "How can I help you today?",
        LexBot = "CustomerServiceBot",
        LexBotAlias = "Production",
        Locale = "en-US",
        ConfidenceThreshold = 0.6)]
    public partial void GetIntent();

    [Action(Order = 2)]
    [Branch(Input = "$.CustomerInput")]
    public partial void RouteByIntent()
    {
        [Case("Sales")]
        void Sales()
        {
            [Message("Transferring to sales...")]
            void NotifySales();

            [TransferToQueue("SalesQueue")]
            void TransferSales();
        }

        [Case("Support")]
        void Support()
        {
            [Message("Connecting to support...")]
            void NotifySupport();

            [TransferToQueue("SupportQueue")]
            void TransferSupport();
        }

        [Case("Billing")]
        void Billing()
        {
            [Message("Routing to billing...")]
            void NotifyBilling();

            [TransferToQueue("BillingQueue")]
            void TransferBilling();
        }

        [Default]
        void NoMatch()
        {
            [Message("I didn't understand.")]
            void NotifyNoMatch();

            [TransferToQueue("GeneralQueue")]
            void TransferGeneral();
        }
    }
}
```

## Sequential Mode (ASR → DTMF Fallback)

**Recommended approach** - Try speech recognition first, automatically fall back to DTMF if it fails.

### Fluent API

```csharp
builder.ThenGetInput(input =>
{
    // Primary input: ASR
    input.Primary.Mode = InputMode.ASR;
    input.Primary.LexBot = "MenuBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.Prompt = "You can say sales, support, or billing";
    input.Primary.ConfidenceThreshold = 0.6;
    input.Primary.MaxRetries = 2;

    // Fallback input: DTMF
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Or press 1 for sales, 2 for support, 3 for billing";
    input.Fallback.MaxDigits = 1;
    input.Fallback.TimeoutSeconds = 5;

    // Enable fallback
    input.EnableFallback = true;
    input.FallbackTriggers = FallbackTrigger.AnyError;  // Timeout, NoMatch, LowConfidence, etc.
})
.RouteByInput(router =>
{
    // Route by intent name (ASR) OR digit (DTMF)
    router.OnIntent("Sales", flow => /* ... */)
          .OnDigit("1", flow => /* ... */);  // Same queue

    router.OnIntent("Support", flow => /* ... */)
          .OnDigit("2", flow => /* ... */);

    router.OnIntent("Billing", flow => /* ... */)
          .OnDigit("3", flow => /* ... */);
});
```

### Attributes

```csharp
[Action(Order = 1)]
[GetCustomerInput(
    InputType = CustomerInputType.Sequential,  // ASR → DTMF
    Text = "You can say sales, support, or billing",
    LexBot = "MenuBot",
    LexBotAlias = "Production",
    ConfidenceThreshold = 0.6,
    FallbackText = "Or press 1 for sales, 2 for support, 3 for billing")]
[MaxDigits(1)]
[Timeout(5)]
public partial void GetDepartmentChoice();
```

### Fallback Triggers

Control when fallback to DTMF occurs:

```csharp
using Switchboard.Enums;

input.FallbackTriggers = FallbackTrigger.Timeout | FallbackTrigger.NoMatch;

// Available triggers:
// - Timeout: Customer didn't respond in time
// - InvalidInput: Input format invalid
// - NoMatch: No intent matched
// - Error: Lex bot error
// - LowConfidence: Below confidence threshold
// - MaxRetriesExceeded: Exceeded retry attempts
// - AnyError: Timeout | InvalidInput | NoMatch | Error | LowConfidence
// - All: All conditions (including MaxRetriesExceeded)
```

## Routing by Intent

Use `RouteByInput()` to route based on Lex intent names:

```csharp
.RouteByInput(router =>
{
    // Route by Lex intent name
    router.OnIntent("Sales", flow =>
    {
        flow.PlayPrompt("Great! Let me connect you to our sales team.")
            .ThenTransferToQueue("SalesQueue");
    });

    router.OnIntent("Support", flow =>
    {
        flow.PlayPrompt("I'll get you to technical support right away.")
            .ThenTransferToQueue("SupportQueue");
    });

    router.OnIntent("CancelOrder", flow =>
    {
        // More complex routing
        flow.ThenInvokeLambda(lambda =>
        {
            lambda.FunctionArn = "arn:aws:lambda:...";
            lambda.InputParameters["orderId"] = "$.Attributes.OrderId";
        })
        .RouteByLambda(result =>
        {
            result.OnSuccess(s => s.PlayPrompt("Order cancelled successfully."));
            result.OnError(e => e.PlayPrompt("Unable to cancel order."));
        });
    });

    // Handle failures
    router.OnNoMatch(flow =>
    {
        flow.PlayPrompt("I'm not sure I understood that.")
            .ThenGetInput(/* retry with clearer prompt */);
    });

    router.OnTimeout(flow =>
    {
        flow.PlayPrompt("I didn't hear anything. Let me transfer you to an agent.")
            .ThenTransferToQueue("GeneralQueue");
    });

    router.OnError(flow =>
    {
        flow.PlayPrompt("We're having technical issues.")
            .ThenDisconnect();
    });
});
```

## Confidence Threshold Tuning

The confidence threshold determines how certain Lex must be before accepting a match.

```csharp
input.Primary.ConfidenceThreshold = 0.6;  // 60% confidence required

// Threshold guidelines:
// 0.4 (40%): Low threshold - accept most matches (more false positives)
// 0.6 (60%): Medium threshold - balanced (recommended for most use cases)
// 0.8 (80%): High threshold - only high-confidence matches (more fallbacks)
```

### Confidence Threshold Strategy

```csharp
// Start with medium confidence
input.Primary.ConfidenceThreshold = 0.6;
input.Primary.MaxRetries = 2;

// For critical transactions, use higher confidence
[GetCustomerInput(
    Text = "Say the account number you want to transfer funds to",
    LexBot = "AccountTransferBot",
    ConfidenceThreshold = 0.8)]  // Higher confidence for financial actions
public partial void GetTargetAccount();

// For simple menus, use lower confidence
[GetCustomerInput(
    Text = "Are you calling about an existing order or a new order?",
    LexBot = "OrderTypeBot",
    ConfidenceThreshold = 0.5)]  // Lower confidence for binary choice
public partial void GetOrderType();
```

## Multi-Language ASR

Support multiple languages by configuring the locale:

```csharp
// English (US)
input.Primary.Locale = "en_US";

// Spanish (US)
input.Primary.Locale = "es_US";

// French (Canada)
input.Primary.Locale = "fr_CA";

// Supported locales (Amazon Lex V2):
// - en_US, en_GB, en_AU, en_IN
// - es_ES, es_US, es_419
// - fr_FR, fr_CA
// - de_DE
// - it_IT
// - ja_JP
// - ko_KR
// - pt_BR
// - zh_CN
// And more...
```

### Dynamic Language Selection

```csharp
builder.ThenGetInput(input =>
{
    input.Primary.Mode = InputMode.DTMF;
    input.Primary.Prompt = "For English press 1. Para Español oprima 2.";
    input.Primary.MaxDigits = 1;
})
.RouteByInput(router =>
{
    router.OnDigit("1", flow =>
    {
        flow.ThenSetAttribute("Language", "en_US")
            .ThenGetInput(input =>
            {
                input.Primary.Mode = InputMode.ASR;
                input.Primary.Locale = "en_US";
                input.Primary.LexBot = "CustomerServiceBot_EN";
                input.Primary.Prompt = "How can I help you today?";
            });
    });

    router.OnDigit("2", flow =>
    {
        flow.ThenSetAttribute("Language", "es_US")
            .ThenGetInput(input =>
            {
                input.Primary.Mode = InputMode.ASR;
                input.Primary.Locale = "es_US";
                input.Primary.LexBot = "CustomerServiceBot_ES";
                input.Primary.Prompt = "¿Cómo puedo ayudarte hoy?";
            });
    });
});
```

## Complete Example: Smart IVR with ASR

A production-ready example combining all ASR features:

```csharp
using Switchboard;
using Switchboard.Configuration;
using Switchboard.Enums;

public class SmartIVRFlowBuilder : FlowBuilderBase
{
    protected override void Build(FlowBuilder builder)
    {
        builder
            // Welcome message
            .PlayPrompt("Welcome to Acme Corporation.")

            // Language selection
            .ThenGetInput(input =>
            {
                input.Primary.Mode = InputMode.DTMF;
                input.Primary.Prompt = "For English, press 1. Para Español, oprima 2.";
                input.Primary.MaxDigits = 1;
                input.Primary.TimeoutSeconds = 5;
            })
            .RouteByInput(router =>
            {
                router.OnDigit("1", flow => flow.ThenContinue("EnglishIVR"));
                router.OnDigit("2", flow => flow.ThenContinue("SpanishIVR"));
                router.OnTimeout(flow => flow.ThenContinue("EnglishIVR"));  // Default to English
            })

            // English ASR Menu
            .ThenJoinPoint("EnglishIVR")
            .ThenSetAttribute("Language", "en_US")
            .ThenGetInput(input =>
            {
                // Primary: ASR
                input.Primary.Mode = InputMode.ASR;
                input.Primary.LexBot = "AcmeIVR_EN";
                input.Primary.LexBotAlias = "Production";
                input.Primary.LexBotVersion = "V2";
                input.Primary.Locale = "en_US";
                input.Primary.Prompt = "I can help you with sales, support, or billing. What can I do for you?";
                input.Primary.ConfidenceThreshold = 0.6;
                input.Primary.MaxRetries = 2;

                // Fallback: DTMF
                input.Fallback.Mode = InputMode.DTMF;
                input.Fallback.PromptText = "Or press 1 for sales, 2 for support, 3 for billing.";
                input.Fallback.MaxDigits = 1;
                input.Fallback.TimeoutSeconds = 5;

                // Enable sequential fallback
                input.EnableFallback = true;
                input.FallbackTriggers = FallbackTrigger.AnyError;
            })
            .RouteByInput(router =>
            {
                router.OnIntent("Sales", flow =>
                {
                    flow.PlayPrompt("Let me connect you to our sales team.")
                        .ThenTransferToQueue("SalesQueue");
                })
                .OnDigit("1", flow =>  // DTMF fallback for Sales
                {
                    flow.PlayPrompt("Transferring you to sales.")
                        .ThenTransferToQueue("SalesQueue");
                });

                router.OnIntent("Support", flow =>
                {
                    flow.PlayPrompt("I'll get you to technical support.")
                        .ThenTransferToQueue("SupportQueue");
                })
                .OnDigit("2", flow =>
                {
                    flow.PlayPrompt("Connecting to support.")
                        .ThenTransferToQueue("SupportQueue");
                });

                router.OnIntent("Billing", flow =>
                {
                    flow.PlayPrompt("Routing you to our billing department.")
                        .ThenTransferToQueue("BillingQueue");
                })
                .OnDigit("3", flow =>
                {
                    flow.PlayPrompt("Transferring to billing.")
                        .ThenTransferToQueue("BillingQueue");
                });

                router.OnNoMatch(flow =>
                {
                    flow.PlayPrompt("I'm sorry, I didn't understand. Let me transfer you to an agent.")
                        .ThenTransferToQueue("GeneralQueue");
                });

                router.OnError(flow =>
                {
                    flow.PlayPrompt("We're experiencing technical difficulties.")
                        .ThenTransferToQueue("GeneralQueue");
                });
            })

            // Spanish ASR Menu (similar structure)
            .ThenJoinPoint("SpanishIVR")
            .ThenSetAttribute("Language", "es_US")
            .ThenGetInput(input =>
            {
                input.Primary.Mode = InputMode.ASR;
                input.Primary.LexBot = "AcmeIVR_ES";
                input.Primary.Locale = "es_US";
                input.Primary.Prompt = "Puedo ayudarte con ventas, soporte técnico o facturación. ¿En qué puedo ayudarte?";
                // ... similar configuration
            });
            // ... Spanish routing
    }
}
```

## Best Practices

### 1. Always Provide DTMF Fallback

Use Sequential mode for better caller experience:

```csharp
input.Primary.Mode = InputMode.ASR;
input.Fallback.Mode = InputMode.DTMF;
input.EnableFallback = true;
```

### 2. Set Appropriate Confidence Thresholds

- **Simple menus**: 0.5-0.6 confidence
- **General purpose**: 0.6-0.7 confidence
- **Critical transactions**: 0.7-0.8 confidence

### 3. Provide Clear Prompts

```csharp
// Good: Specific, actionable
"I can help you with sales, support, or billing. What do you need?"

// Bad: Vague, open-ended
"How can I help you?"
```

### 4. Handle All Error Cases

```csharp
router.OnNoMatch(flow => /* ... */)
      .OnTimeout(flow => /* ... */)
      .OnError(flow => /* ... */);
```

### 5. Test with Real Users

- Test with different accents and speaking styles
- Monitor confidence scores in CloudWatch
- Adjust thresholds based on real data

## Troubleshooting

### Low Recognition Accuracy

**Problem:** Lex isn't recognizing caller intent correctly

**Solutions:**

1. **Add more training utterances** to your Lex bot
2. **Lower confidence threshold** (start at 0.5, increase gradually)
3. **Provide clearer prompts** with examples
4. **Test with diverse voices** and accents

### Frequent Fallback to DTMF

**Problem:** System always falls back to DTMF

**Solutions:**

1. **Check Lex bot permissions** - Ensure Connect has invoke permissions
2. **Verify bot alias** - Must match deployment alias exactly
3. **Check locale setting** - Must match bot language
4. **Review CloudWatch logs** - Check for Lex errors

### Intent Not Matched

**Problem:** Lex returns NoMatch even with valid input

**Solutions:**

1. **Add more sample utterances** covering variations
2. **Use slot elicitation** for complex intents
3. **Enable conversation logs** in Lex for debugging
4. **Lower confidence threshold** temporarily to see what's being recognized

### Timeout Issues

**Problem:** Callers not responding in time

**Solutions:**

1. **Increase timeout** to 8-10 seconds for ASR
2. **Add retry prompt** with clearer instructions
3. **Increase MaxRetries** to 3 for important decisions

## See Also

- [Flow Basics](./basics.md) - General flow building concepts
- [Routing](./routing.md) - Advanced routing patterns
- [Dynamic Attributes](./dynamic-attributes.md) - Runtime configuration
- [Multi-Language Support](./multi-language.md) - Internationalization
- [Amazon Lex Documentation](https://docs.aws.amazon.com/lex/) - Official Lex docs
