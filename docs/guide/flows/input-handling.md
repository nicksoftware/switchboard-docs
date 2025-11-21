# Customer Input Handling

The Switchboard framework provides powerful, flexible APIs for collecting customer input through both speech recognition (ASR) and DTMF (keypad) input.

## Overview

The framework supports three main approaches to customer input:

1. **Simple DTMF Input** - Basic keypad input collection
2. **Unified Input Routing** - Route based on both speech intents and DTMF digits
3. **Sequential Input Mode** - Attempt speech recognition first, with automatic fallback to DTMF

## Simple DTMF Input

For basic keypad input collection, use the `GetCustomerInput` method:

```csharp
var flow = new FlowBuilder()
    .SetName("BasicInput")
    .GetCustomerInput("Press 1 for sales, 2 for support", input =>
    {
        input.MaxDigits = 1;
        input.TimeoutSeconds = 5;
    })
    .OnDigit("1", sales =>
    {
        sales.PlayPrompt("Connecting to sales...")
             .TransferToQueue("Sales");
    })
    .OnDigit("2", support =>
    {
        support.PlayPrompt("Connecting to support...")
               .TransferToQueue("Support");
    })
    .OnTimeout(timeout =>
    {
        timeout.PlayPrompt("We didn't receive your input")
               .Disconnect();
    })
    .Build();
```

## Unified Input Routing

The `RouteByInput` API allows you to handle both speech intents and DTMF digits with a single routing configuration:

### Basic Routing

```csharp
.RouteByInput(router => router
    .WhenIntent("sales_intent", sales => sales
        .PlayPrompt("Routing to sales team")
        .TransferToQueue("Sales"))
    .WhenDigits(["1", "2" ], sales => sales
        .PlayPrompt("Routing to sales via DTMF")
        .TransferToQueue("Sales"))
    .Otherwise(other => other
        .PlayPrompt("I didn't understand that")
        .Disconnect())
)
```

### Unified Routes (Same Destination)

For cases where you want speech and DTMF to route to the same destination:

```csharp
.RouteByInput(router => router
    // Unified route - both intent and digits go to same flow
    .When("sales_intent", ["1","2"], sales => sales
        .PlayPrompt("Connecting to sales")
        .TransferToQueue("Sales"))

    .When("support_intent", ["3", "4" ], support => support
        .PlayPrompt("Connecting to support")
        .TransferToQueue("Support"))

    // Fallback for unrecognized input
    .Otherwise(other => other
        .PlayPrompt("I didn't catch that, let me transfer you to an agent")
        .TransferToQueue("GeneralSupport"))
)
```

### Complex Multi-Route Example

```csharp
.RouteByInput(router => router
    // VIP customers
    .When("vip_intent", ["9"], vip => vip
        .PlayPrompt("Welcome VIP customer! Connecting to our premium support team")
        .TransferToQueue("VIPSupport"))

    // Sales department
    .WhenIntent("sales_intent", sales => sales
        .SetContactAttributes(attrs => attrs["Department"] = "Sales")
        .TransferToQueue("Sales"))

    .WhenDigits(["1", "2" ], sales => sales
        .SetContactAttributes(attrs => attrs["Department"] = "Sales")
        .PlayPrompt("You pressed for sales")
        .TransferToQueue("Sales"))

    // Technical support
    .When("tech_support_intent", new[] { "3" }, tech => tech
        .PlayPrompt("Connecting to technical support")
        .TransferToQueue("TechSupport"))

    // Billing
    .WhenDigits(["4", "5"], billing => billing
        .TransferToQueue("Billing"))

    // Default/unrecognized
    .Otherwise(other => other
        .PlayPrompt("I'm not sure what you need. Let me connect you with someone who can help")
        .TransferToQueue("GeneralSupport"))
)
```

## Sequential Input Mode (ASR → DTMF Fallback)

Sequential mode attempts speech recognition first, then automatically falls back to DTMF input based on configurable triggers.

### Basic Sequential Configuration

```csharp
.GetCustomerInput(input =>
{
    // Primary mode: Try speech first
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "CustomerServiceBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.Prompt = "How can I help you today? Say sales, support, or billing.";
    input.Primary.ConfidenceThreshold = 0.7; // Only accept matches >= 70% confidence
    input.Primary.MaxRetries = 2;

    // Fallback mode: Use DTMF if speech fails
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "I didn't catch that. Please use your keypad. Press 1 for sales, 2 for support, 3 for billing.";
    input.Fallback.MaxDigits = 1;

    // Control when to fallback
    input.FallbackTriggers = FallbackTrigger.NoMatch | FallbackTrigger.LowConfidence | FallbackTrigger.Timeout;
    input.EnableFallback = true;
})
```

### Fallback Triggers

The `FallbackTrigger` enum controls when the system should fallback from speech to DTMF:

```csharp
// Individual triggers
FallbackTrigger.Timeout           // Customer didn't say anything
FallbackTrigger.NoMatch           // Speech not recognized
FallbackTrigger.LowConfidence     // Confidence below threshold
FallbackTrigger.InvalidInput      // Input doesn't match expected format
FallbackTrigger.Error             // System error during recognition
FallbackTrigger.MaxRetriesExceeded // Customer exceeded retry attempts

// Combined triggers (use bitwise OR)
input.FallbackTriggers = FallbackTrigger.Timeout | FallbackTrigger.NoMatch;

// Predefined combinations
FallbackTrigger.AnyError          // All error conditions (excludes MaxRetriesExceeded)
FallbackTrigger.All               // Everything (including MaxRetriesExceeded)
```

### Advanced Sequential Example

```csharp
.GetCustomerInput(input =>
{
    // ===== PRIMARY: Speech Recognition =====
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "MultiLanguageBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.LexBotVersion = "V2";
    input.Primary.Locale = "en_US";

    // Initial prompt
    input.Primary.Prompt = "Welcome! How may I assist you today?";

    // Retry prompt (if customer not understood)
    input.Primary.RetryPrompt = "I'm sorry, I didn't quite catch that. Could you please repeat?";

    // Confidence and retry settings
    input.Primary.ConfidenceThreshold = 0.75; // 75% confidence required
    input.Primary.MaxRetries = 3;             // Try up to 3 times
    input.Primary.TimeoutSeconds = 5;         // 5 seconds to respond

    // Security: Encrypt sensitive input (PCI compliance)
    input.Primary.EncryptInput = false; // Set true for payment card data

    // ===== FALLBACK: DTMF =====
    input.Fallback.Mode = InputMode.DTMF;

    // Fallback prompt explains keypad options
    input.Fallback.PromptText = @"
        I'm having trouble understanding. Let's try the keypad instead.
        Press 1 for sales
        Press 2 for technical support
        Press 3 for billing
        Press 4 for general inquiries
    ";

    // Fallback retry prompt
    input.Fallback.RetryPrompt = "That wasn't a valid selection. Please press 1, 2, 3, or 4.";

    // DTMF settings
    input.Fallback.MaxDigits = 1;
    input.Fallback.MinDigits = 1;
    input.Fallback.TerminatingDigit = "#";  // Optional: press # to submit
    input.Fallback.TimeoutSeconds = 10;     // 10 seconds to enter digit
    input.Fallback.InterDigitTimeoutSeconds = 3; // 3 seconds between digits
    input.Fallback.MaxRetries = 2;

    // ===== FALLBACK TRIGGERS =====
    // Fallback on timeout, no match, or low confidence
    input.FallbackTriggers = FallbackTrigger.Timeout |
                            FallbackTrigger.NoMatch |
                            FallbackTrigger.LowConfidence;

    // Enable automatic fallback
    input.EnableFallback = true;
})
.OnDigit("1", sales => { /* Sales flow */ })
.OnDigit("2", support => { /* Support flow */ })
.OnDigit("3", billing => { /* Billing flow */ })
.OnDigit("4", general => { /* General flow */ })
.OnTimeout(timeout => timeout.Disconnect())
```

## Multi-Language Sequential Input

```csharp
.GetCustomerInput(input =>
{
    // Spanish language bot
    input.Primary.LexBot = "CustomerServiceBot_Spanish";
    input.Primary.Locale = "es_US";
    input.Primary.Prompt = "¿Cómo puedo ayudarte hoy?";
    input.Primary.RetryPrompt = "Lo siento, no entendí. ¿Podrías repetir?";

    // Spanish DTMF fallback
    input.Fallback.PromptText = @"
        Usemos el teclado.
        Presiona 1 para ventas
        Presiona 2 para soporte técnico
        Presiona 3 para facturación
    ";
})
```

## Best Practices

### When to Use Each Approach

**Simple DTMF Input:**

- Simple menu systems (1-5 options)
- Sensitive data collection (SSN, account numbers)
- Environments with poor audio quality
- When speech recognition is not required

**Unified Input Routing:**

- Modern IVR systems with speech and DTMF options
- User preference flexibility
- Accessibility requirements
- Multi-channel support

**Sequential Mode:**

- Best user experience (try speech first)
- Fallback safety net for speech failures
- Compliance requirements (must support DTMF for accessibility)
- High-quality speech recognition with DTMF backup

### Security Considerations

```csharp
// For PCI compliance: Encrypt sensitive input
input.Primary.EncryptInput = true;  // Speech
input.Fallback.EncryptInput = true; // DTMF

// Use appropriate timeout for sensitive data
input.Primary.TimeoutSeconds = 30; // Give users time to find their card
input.Fallback.TimeoutSeconds = 30;
```

### Confidence Thresholds

```csharp
// High confidence for critical operations
input.Primary.ConfidenceThreshold = 0.85; // 85% for payments, transfers

// Medium confidence for routing
input.Primary.ConfidenceThreshold = 0.70; // 70% for menu navigation

// Lower confidence for informational queries
input.Primary.ConfidenceThreshold = 0.60; // 60% for FAQ, hours
```

### Error Handling

```csharp
.RouteByInput(router => router
    .When("cancel_intent", new[] { "*" }, cancel => cancel
        .PlayPrompt("Cancelling. Goodbye!")
        .Disconnect())

    .When("agent_intent", new[] { "0" }, agent => agent
        .PlayPrompt("Connecting to an agent")
        .TransferToQueue("GeneralSupport"))

    // Always provide an "Otherwise" for unrecognized input
    .Otherwise(other => other
        .PlayPrompt("I'm sorry, I didn't understand that")
        .TransferToQueue("GeneralSupport"))
)
```

## Testing Input Flows

```csharp
[Test]
public void SequentialInput_WithFallback_ShouldGenerateCorrectFlow()
{
    // Arrange
    var builder = new FlowBuilder();

    // Act
    var flow = builder
        .SetName("TestSequentialInput")
        .GetCustomerInput(input =>
        {
            input.Primary.Mode = InputMode.Speech;
            input.Primary.LexBot = "TestBot";
            input.Fallback.Mode = InputMode.DTMF;
            input.FallbackTriggers = FallbackTrigger.AnyError;
        })
        .OnDigit("1", sales => sales.TransferToQueue("Sales"))
        .Build();

    // Assert
    flow.Should().NotBeNull();
    var inputConfig = /* extract from flow */;
    inputConfig.IsSequential.Should().BeTrue();
}
```

## Related Documentation

- [Flow Basics](/guide/flows/basics) - Fundamental flow building concepts
- [Fluent Builders](/guide/flows/fluent-builders) - Complete builder API reference
- [PlayPrompt Enhancements](/guide/flows/prompts) - Advanced prompt configuration
- [API Reference: Configuration](/reference/configuration) - InputConfiguration API details
