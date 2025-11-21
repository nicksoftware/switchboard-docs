# Fluent API Design

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

The Fluent API is one of two equally powerful approaches for building Amazon Connect contact centers with Switchboard. It provides a **programmatic, method-chaining interface** that gives you fine-grained control over your infrastructure.

## What is a Fluent API?

A fluent API uses method chaining to create readable, self-documenting code. Each method returns an object that allows you to call the next method, forming a natural "sentence-like" flow.

```csharp
// Fluent API reads like natural language
var flow = new FlowBuilder()
    .SetName("CustomerSupport")
    .SetDescription("Main customer support flow")
    .PlayPrompt("Welcome to customer support")
    .RouteByInput(router => router
        .When("support_intent", new[] { "1" }, sales => sales
            .TransferToQueue("Sales"))
        .When("billing_intent", new[] { "2" }, billing => billing
            .TransferToQueue("Billing"))
        .Otherwise(other => other.TransferToQueue("Support"))
    )
    .Build();
```

## Why Use the Fluent API?

### 1. **Familiar Pattern**

If you've used jQuery, LINQ, builder patterns, or fluent APIs in any language, this will feel immediately familiar:

```typescript
// JavaScript/TypeScript (jQuery-style)
$('#element')
  .addClass('active')
  .fadeIn(300)
  .on('click', handler);

// C# Switchboard (same pattern!)
new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales")
    .Build();
```

**Python developers:** Think of it like Pandas method chaining
**Java developers:** Like the Stream API or Builder pattern
**Go developers:** Like function chaining patterns

### 2. **Full IDE Support**

IntelliSense/autocomplete guides you through every step:

```csharp
flow.PlayPrompt("Welcome")
    // IDE shows all available next actions
    // - GetCustomerInput()
    // - TransferToQueue()
    // - InvokeLambda()
    // - CheckHoursOfOperation()
    // - Branch()
    // etc.
```

**Benefits:**
- Discover available actions as you type
- See method signatures and documentation
- Catch typos immediately
- Reduce context switching to docs

### 3. **Explicit Control**

You control **every detail** of your flow programmatically:

```csharp
var flow = new FlowBuilder()
    .SetName("VipSupport")
    .SetContactAttributes(attrs => {
        attrs.Add("tier", "vip");
        attrs.Add("priority", "high");
        attrs.Add("routingStrategy", "skill-based");
    })
    .PlayPrompt("Welcome VIP customer")
    .TransferToQueue("VIPSupport")
    .Build();
```

### 4. **Dynamic Flow Construction**

Build flows conditionally based on runtime logic, including Sequential Input Mode:

```csharp
public Flow BuildCustomerFlow(CustomerTier tier, bool enableCallback)
{
    var builder = new FlowBuilder()
        .SetName($"{tier}CustomerFlow")
        .PlayPrompt(prompt => {
            prompt.Text = $"Welcome, {tier} customer";
            prompt.Voice = "Joanna";
            prompt.UseNeuralVoice = true;  // High-quality neural voice
        });

    // Conditional logic during construction
    if (tier == CustomerTier.VIP)
    {
        builder.SetContactAttributes(attrs => {
            attrs.Add("priority", "high");
            attrs.Add("sla", "2-minutes");
        });
    }

    // Add callback offer with Sequential Input Mode (ASR → DTMF fallback)
    if (enableCallback)
    {
        builder.GetCustomerInput(input => {
            // Primary: Try speech recognition first
            input.Primary.Mode = InputMode.Speech;
            input.Primary.LexBot = "CallbackBot";
            input.Primary.Prompt = "Say hold or callback";

            // Fallback: DTMF if speech fails
            input.Fallback.Mode = InputMode.DTMF;
            input.Fallback.PromptText = "Press 1 to hold, 2 for callback";
            input.Fallback.MaxDigits = 1;

            input.FallbackTriggers = FallbackTrigger.NoMatch | FallbackTrigger.LowConfidence;
        });
    }
    else
    {
        builder.TransferToQueue(tier.ToString());
    }

    return builder.Build();
}
```

### 5. **Testability**

Fluent APIs are easy to test because they're just C# objects:

```csharp
[Test]
public void VipFlow_Should_Set_Priority_Attribute()
{
    // Arrange & Act
    var flow = new FlowBuilder()
        .SetName("VipSupport")
        .SetContactAttributes(attrs => attrs.Add("priority", "high"))
        .TransferToQueue("VIPQueue")
        .Build();

    // Assert
    flow.Name.Should().Be("VipSupport");
    flow.Actions.Should().Contain(a => a is SetContactAttributesAction);
}

[Test]
public void Flow_Should_Transfer_To_Correct_Queue()
{
    var flow = new FlowBuilder()
        .PlayPrompt("Welcome")
        .TransferToQueue("Sales")
        .Build();

    flow.Actions.Should().Contain(a => a is TransferToQueueAction);
}
```

### 6. **Composition and Reusability**

Create reusable flow fragments:

```csharp
// Reusable authentication fragment
public static class FlowExtensions
{
    public static IFlowBuilder AddAuthentication(this IFlowBuilder builder)
    {
        return builder
            .PlayPrompt("Please authenticate")
            .GetCustomerInput("Enter your 4-digit PIN", input => {
                input.MaxDigits = 4;
                input.TimeoutSeconds = 10;
                input.EncryptInput = true;
            })
            .InvokeLambda("ValidatePinLambda", lambda => {
                lambda.TimeoutSeconds = 5;
            });
    }
}

// Use authentication in multiple flows
var salesFlow = new FlowBuilder()
    .SetName("SalesWithAuth")
    .AddAuthentication()  // Reuse!
    .TransferToQueue("Sales")
    .Build();

var supportFlow = new FlowBuilder()
    .SetName("SupportWithAuth")
    .AddAuthentication()  // Reuse!
    .TransferToQueue("Support")
    .Build();
```

### 7. **Complex Logic Made Clear**

Handle intricate branching and conditions explicitly, including unified input routing:

```csharp
var flow = new FlowBuilder()
    .SetName("SmartRouting")
    .PlayPrompt(prompt => {
        prompt.PromptType = PromptType.SSML;
        prompt.SSML = @"<speak>
            Welcome to customer support.
            <break time='500ms'/>
            How can I help you today?
        </speak>";
        prompt.Voice = "Matthew";
        prompt.UseNeuralVoice = true;
    })
    .InvokeLambda("GetCustomerData")

    // Route by customer tier (lambda response)
    .Branch(branch => {
        branch.When("$.customer.tier == \"vip\"", "vip-routing");
        branch.When("$.customer.tier == \"premium\"", "premium-routing");
        branch.Otherwise("general-routing");
    })

    // VIP path - Unified routing (both ASR intent and DTMF digits)
    .RouteByInput(router => router
        .When("sales_intent", new[] { "1" }, sales => sales
            .PlayPrompt("Transferring to VIP sales")
            .TransferToQueue("VIPSales"))
        .When("support_intent", new[] { "2" }, support => support
            .TransferToQueue("VIPSupport"))
        .Otherwise(other => other.TransferToQueue("VIPSupport"))
    , "vip-routing")

    // Premium path
    .TransferToQueue("PremiumSupport", "premium-routing")

    // General path
    .TransferToQueue("GeneralSupport", "general-routing")
    .Build();
```

## When to Use the Fluent API

The Fluent API is **ideal** when:

### ✅ Use Fluent API For:

- **Complex conditional logic** - Multi-branch flows with intricate conditions
- **Dynamic flow construction** - Flows built based on configuration or runtime data
- **Programmatic generation** - Creating flows from external data sources
- **Fine-grained control** - You need to specify every detail explicitly
- **Composition patterns** - Building flows from reusable fragments
- **Integration with existing code** - Flows embedded in larger C# applications
- **Learning Amazon Connect** - Seeing exactly what each action does helps understanding
- **Testing-heavy projects** - Easier to mock, test, and verify programmatically

### Example Use Cases:

```csharp
// 1. Dynamic multi-tenant flows
public Flow BuildTenantFlow(Tenant tenant)
{
    var builder = new FlowBuilder()
        .SetName($"{tenant.Name}Flow")
        .PlayPrompt(tenant.Greeting);

    foreach (var queue in tenant.Queues)
    {
        builder.PlayPrompt($"For {queue.Name}, press {queue.Digit}")
               .TransferToQueue(queue.Name);
    }

    return builder.Build();
}

// 2. A/B testing flows
public Flow BuildFlowWithExperiment(bool variant)
{
    var builder = new FlowBuilder()
        .SetName("ExperimentFlow");

    if (variant)
        builder.PlayPrompt("Welcome! (Variant A)");
    else
        builder.PlayPrompt("Hello! (Variant B)");

    return builder.TransferToQueue("Support").Build();
}

// 3. Complex integration workflows
public Flow BuildCrmIntegrationFlow()
{
    return new FlowBuilder()
        .PlayPrompt("Looking up your account")
        .InvokeLambda("FetchCrmData")
        .Branch(branch => {
            branch.When("$.crm.found == true", "found-account");
            branch.Otherwise("not-found");
        })
        // Customer found path
        .SetContactAttributes(attrs => {
            attrs.Add("customerId", "$.crm.id");
        }, "found-account")
        .TransferToQueue("ExistingCustomerSupport")
        // Customer not found path
        .PlayPrompt("I couldn't find your account", "not-found")
        .TransferToQueue("NewCustomerSupport")
        .Build();
}
```

## Core Concepts

### Method Chaining

Each method returns a builder instance, allowing continuous chaining:

```csharp
var builder = new FlowBuilder();
builder.SetName("MyFlow");           // Returns IFlowBuilder
builder.PlayPrompt("Welcome");       // Returns IFlowBuilder
builder.TransferToQueue("Sales");    // Returns IFlowBuilder
var flow = builder.Build();          // Returns IFlow
```

Condensed into fluent chain:

```csharp
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales")
    .Build();
```

### Type-Safe Configuration

Action configuration lambdas provide type-safe options:

```csharp
.GetCustomerInput("Press 1 for sales", input => {
    input.MaxDigits = 1;              // Set maximum digits
    input.TimeoutSeconds = 5;         // Set timeout
    input.EncryptInput = false;       // Encryption setting
})
```

**IntelliSense shows:**
- Available properties on `input`
- Property types
- Property documentation

### Action Identifiers

Actions can have identifiers for branching:

```csharp
.PlayPrompt("Welcome")          // Auto-generated identifier
.PlayPrompt("VIP welcome", "vip-welcome")  // Custom identifier
.TransferToQueue("Sales", "sales-transfer") // Custom identifier
```

Identifiers are used in branching to create flow paths:

```csharp
.Branch(branch => {
    branch.When("$.tier == \"vip\"", "vip-welcome");  // Jump to action with this ID
    branch.Otherwise("general-welcome");
})
```

### Branching Pattern

Branches route to action identifiers, not nested flows:

```csharp
.GetCustomerInput("Press 1 or 2", input => {
    input.MaxDigits = 1;
})
.Branch(branch => {
    branch.Case("1", "sales-path");    // If user presses 1
    branch.Case("2", "support-path");  // If user presses 2
    branch.Otherwise("default-path");  // Any other input
})
// Define sales path
.PlayPrompt("Transferring to sales", "sales-path")
.TransferToQueue("Sales")
// Define support path
.PlayPrompt("Transferring to support", "support-path")
.TransferToQueue("Support")
// Define default path
.Disconnect("default-path")
```

## Complete Example: Multi-Language Support Flow

```csharp
using Switchboard;
using Switchboard.Builders;
using Switchboard.Enums;
using Switchboard.Actions;

public class MultiLanguageFlow
{
    public static IFlow Build()
    {
        return new FlowBuilder()
            .SetName("MultiLanguageSupport")
            .SetDescription("Routes customers based on language preference with neural voices")

            // Multi-language greeting with SSML
            .PlayPrompt(prompt => {
                prompt.PromptType = PromptType.SSML;
                prompt.SSML = @"<speak>
                    <lang xml:lang='en-US'>Welcome.</lang>
                    <break time='500ms'/>
                    <lang xml:lang='es-US'>Bienvenido.</lang>
                    <break time='500ms'/>
                    <lang xml:lang='fr-CA'>Bienvenue.</lang>
                </speak>";
                prompt.Voice = "Matthew";
                prompt.UseNeuralVoice = true;
            })

            // Sequential Input Mode - Speech then DTMF
            .GetCustomerInput(input => {
                // Primary: Try speech first
                input.Primary.Mode = InputMode.Speech;
                input.Primary.LexBot = "LanguageSelectionBot";
                input.Primary.Prompt = "Please say English, Spanish, or French";
                input.Primary.ConfidenceThreshold = 0.7;

                // Fallback: DTMF if speech fails
                input.Fallback.Mode = InputMode.DTMF;
                input.Fallback.PromptText = "For English press 1, para español 2, pour français 3";
                input.Fallback.MaxDigits = 1;
                input.Fallback.TimeoutSeconds = 10;

                input.FallbackTriggers = FallbackTrigger.NoMatch |
                                        FallbackTrigger.LowConfidence |
                                        FallbackTrigger.Timeout;
            })

            // Unified routing - handles both intents and digits
            .RouteByInput(router => router
                .When("english_intent", new[] { "1" }, english => english
                    .SetContactAttributes(attrs => attrs.Add("language", "en"))
                    .PlayPrompt(prompt => {
                        prompt.Text = "Transferring to English support";
                        prompt.Voice = "Joanna";
                        prompt.UseNeuralVoice = true;
                        prompt.LanguageCode = "en-US";
                    })
                    .TransferToQueue("EnglishSupport"))

                .When("spanish_intent", new[] { "2" }, spanish => spanish
                    .SetContactAttributes(attrs => attrs.Add("language", "es"))
                    .PlayPrompt(prompt => {
                        prompt.Text = "Transfiriendo al soporte en español";
                        prompt.Voice = "Lupe";  // Spanish (US) neural voice
                        prompt.UseNeuralVoice = true;
                        prompt.LanguageCode = "es-US";
                    })
                    .TransferToQueue("SpanishSupport"))

                .When("french_intent", new[] { "3" }, french => french
                    .SetContactAttributes(attrs => attrs.Add("language", "fr"))
                    .PlayPrompt(prompt => {
                        prompt.Text = "Transfert vers le support français";
                        prompt.Voice = "Celine";  // Canadian French voice
                        prompt.UseNeuralVoice = true;
                        prompt.LanguageCode = "fr-CA";
                    })
                    .TransferToQueue("FrenchSupport"))

                .Otherwise(other => other
                    .PlayPrompt("Defaulting to English support")
                    .TransferToQueue("EnglishSupport"))
            )

            .Build();
    }
}
```

## Fluent API vs Attributes

Both approaches are **equally powerful** and produce the same infrastructure. Choose based on your preference and use case.

### Strengths of Fluent API

| Aspect | Fluent API | Why It Matters |
|--------|------------|----------------|
| **Visibility** | Every action is explicit in code | Easy to trace exactly what happens |
| **IDE Support** | Full IntelliSense at every step | Discover methods as you type |
| **Debugging** | Step through builder code | See exactly where issues occur |
| **Composition** | Easy to create reusable fragments | DRY principle, shared logic |
| **Dynamic** | Build flows based on runtime config | Multi-tenant, A/B testing, experiments |
| **Testing** | Standard unit testing patterns | Mock, assert, verify like any C# code |
| **Familiarity** | Builder pattern is widely known | No new concepts to learn |

### Trade-offs of Fluent API

| Aspect | Consideration |
|--------|---------------|
| **Verbosity** | More code than attributes (explicit vs concise) |
| **Boilerplate** | Need to create builder instances, call methods |
| **Visual Noise** | Method calls and configuration lambdas |

### When to Choose Which?

**Neither is "better" - choose based on your specific needs and preferences.**

**Choose Fluent API if you:**
- Prefer seeing every detail explicitly
- Need to build flows dynamically (based on config, tenant, etc.)
- Want maximum IDE assistance (IntelliSense-driven development)
- Are building complex flows with intricate branching
- Come from a background using builder patterns (Java, TypeScript, etc.)
- Need to compose flows from reusable pieces
- Want standard C# testing patterns

**Choose Attributes if you:**
- Prefer concise, declarative code
- Have mostly static, straightforward flows
- Like minimal boilerplate
- Trust source generators to handle implementation
- Want flow structure visible at a glance
- Are defining many simple flows (attributes are faster to write)

**Or use both!** You can mix approaches in the same project:

```csharp
// Simple flow with attributes
[ContactFlow("SimpleWelcome")]
public partial class WelcomeFlow
{
    [Message("Welcome")]
    public partial void Greet();

    [TransferToQueue("Support")]
    public partial void Transfer();
}

// Complex flow with fluent API
public class ComplexRoutingFlow
{
    public static IFlow Build(Tenant tenant)
    {
        var builder = new FlowBuilder()
            .SetName($"{tenant.Name}Routing");

        // Dynamic logic here...

        return builder.Build();
    }
}
```

## Best Practices

### 1. Extract Complex Configuration

**Don't:**
```csharp
.GetCustomerInput(input => {
    // 50 lines of configuration inline
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "CustomerServiceBot";
    // ... many more lines ...
})
```

**Do:**
```csharp
.GetCustomerInput(ConfigureSequentialInput)

private static void ConfigureSequentialInput(InputConfiguration input)
{
    // Primary: Speech recognition
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "CustomerServiceBot";
    input.Primary.Prompt = "How can I help you?";
    input.Primary.ConfidenceThreshold = 0.7;

    // Fallback: DTMF
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Press 1 for sales, 2 for support";
    input.Fallback.MaxDigits = 1;

    input.FallbackTriggers = FallbackTrigger.NoMatch | FallbackTrigger.LowConfidence;
}
```

### 1a. Extract Prompt Configurations

**Do:**
```csharp
.PlayPrompt(ConfigureWelcomePrompt)

private static void ConfigureWelcomePrompt(PlayPromptConfiguration prompt)
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome to our service.
        <break time='1s'/>
        How may I <emphasis level='strong'>assist</emphasis> you today?
    </speak>";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true;
    prompt.LanguageCode = "en-US";
}
```

### 2. Use Constants for Identifiers

**Don't:**
```csharp
.TransferToQueue("SupportQueue")
// Later in code...
.TransferToQueue("SuportQueue")  // Typo!
```

**Do:**
```csharp
public static class QueueNames
{
    public const string Support = "SupportQueue";
    public const string Sales = "SalesQueue";
}

.TransferToQueue(QueueNames.Support)  // Type-safe!
```

### 3. Create Reusable Fragments

```csharp
public static class FlowFragments
{
    public static IFlowBuilder AddStandardGreeting(this IFlowBuilder builder, string language = "en-US")
    {
        return builder
            .PlayPrompt(prompt => {
                prompt.Text = "Thank you for calling";
                prompt.Voice = language == "es-US" ? "Lupe" : "Joanna";
                prompt.UseNeuralVoice = true;
                prompt.LanguageCode = language;
            })
            .PlayPrompt(prompt => {
                prompt.Text = language == "es-US"
                    ? "Su llamada puede ser grabada para garantía de calidad"
                    : "Your call may be recorded for quality assurance";
                prompt.Voice = language == "es-US" ? "Lupe" : "Joanna";
                prompt.UseNeuralVoice = true;
                prompt.LanguageCode = language;
            });
    }

    public static IFlowBuilder AddSequentialMainMenu(this IFlowBuilder builder)
    {
        return builder.GetCustomerInput(input => {
            // Primary: ASR
            input.Primary.Mode = InputMode.Speech;
            input.Primary.LexBot = "MainMenuBot";
            input.Primary.Prompt = "Say sales or support";

            // Fallback: DTMF
            input.Fallback.Mode = InputMode.DTMF;
            input.Fallback.PromptText = "Press 1 for sales, 2 for support";

            input.FallbackTriggers = FallbackTrigger.AnyError;
        });
    }
}

// Use across flows
var flow = new FlowBuilder()
    .AddStandardGreeting("es-US")  // Spanish greeting
    .AddSequentialMainMenu()       // Reusable sequential input
    .RouteByInput(router => router
        .When("sales_intent", new[] { "1" }, s => s.TransferToQueue("Sales"))
        .Otherwise(o => o.TransferToQueue("Support"))
    )
    .Build();
```

### 4. Keep Builders Focused

```csharp
// Good: One flow per builder
var supportFlow = new FlowBuilder()
    .SetName("Support")
    .PlayPrompt("Welcome to support")
    .TransferToQueue("Support")
    .Build();

var salesFlow = new FlowBuilder()
    .SetName("Sales")
    .PlayPrompt("Welcome to sales")
    .TransferToQueue("Sales")
    .Build();

// Avoid: Reusing same builder for multiple flows
var builder = new FlowBuilder();
var flow1 = builder.SetName("Flow1").Build();  // Don't reuse!
var flow2 = builder.SetName("Flow2").Build();  // State is polluted
```

## Integration with CDK

The Fluent API integrates seamlessly with AWS CDK, showcasing all new features:

```csharp
using Amazon.CDK;
using Switchboard;
using Switchboard.Enums;
using Switchboard.Actions;

public class MyContactCenterStack : Stack
{
    public MyContactCenterStack(Construct scope, string id) : base(scope, id)
    {
        // Build advanced flow with Fluent API
        var supportFlow = new FlowBuilder()
            .SetName("CustomerSupport")
            .SetDescription("Advanced support flow with ASR/DTMF and neural voices")

            // SSML greeting with neural voice
            .PlayPrompt(prompt => {
                prompt.PromptType = PromptType.SSML;
                prompt.SSML = @"<speak>
                    Welcome to <emphasis level='strong'>customer support</emphasis>.
                    <break time='500ms'/>
                    We're here to help.
                </speak>";
                prompt.Voice = "Matthew";
                prompt.UseNeuralVoice = true;
                prompt.LanguageCode = "en-US";
            })

            // Sequential Input Mode - ASR with DTMF fallback
            .GetCustomerInput(input => {
                // Primary: Speech recognition
                input.Primary.Mode = InputMode.Speech;
                input.Primary.LexBot = "SupportBot";
                input.Primary.Prompt = "Say technical support or billing";
                input.Primary.ConfidenceThreshold = 0.7;

                // Fallback: DTMF
                input.Fallback.Mode = InputMode.DTMF;
                input.Fallback.PromptText = "Press 1 for technical support, 2 for billing";
                input.Fallback.MaxDigits = 1;
                input.Fallback.TimeoutSeconds = 10;

                input.FallbackTriggers = FallbackTrigger.NoMatch |
                                        FallbackTrigger.LowConfidence |
                                        FallbackTrigger.Timeout;
            })

            // Unified routing - handles both intents and digits
            .RouteByInput(router => router
                .When("technical_intent", new[] { "1" }, technical => technical
                    .PlayPrompt("Routing to technical support")
                    .TransferToQueue("TechnicalSupport"))

                .When("billing_intent", new[] { "2" }, billing => billing
                    .PlayPrompt("Routing to billing")
                    .TransferToQueue("BillingSupport"))

                .Otherwise(other => other
                    .PlayPrompt("I didn't understand. Disconnecting.")
                    .Disconnect())
            )

            .Build();

        // Add to CDK stack
        new ContactFlowConstruct(this, "SupportFlow", new ContactFlowProps {
            Flow = supportFlow,
            InstanceArn = "arn:aws:connect:..."
        });
    }
}
```

## Advanced Features (Phase 2.1)

The framework includes powerful advanced features for modern contact centers:

### InputRouter - Unified Routing

Route calls based on both ASR intents AND DTMF digits to the same destination:

```csharp
.RouteByInput(router => router
    // Same destination for both intent and digit
    .When("sales_intent", new[] { "1", "2" }, sales => sales
        .TransferToQueue("Sales"))

    // Intent-only routing
    .WhenIntent("support_intent", support => support
        .TransferToQueue("Support"))

    // Digit-only routing
    .WhenDigits(new[] { "9" }, operator => operator
        .TransferToQueue("Operator"))

    // Fallback
    .Otherwise(other => other.Disconnect())
)
```

**[Learn more: Customer Input Handling](/guide/flows/input-handling)**

### Sequential Input Mode (ASR → DTMF Fallback)

Automatically fall back from speech recognition to DTMF based on configurable triggers:

```csharp
.GetCustomerInput(input => {
    // Try speech first
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "CustomerBot";
    input.Primary.Prompt = "How can I help you?";

    // Fall back to DTMF on errors
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Press 1 for sales, 2 for support";

    // Configure when to trigger fallback
    input.FallbackTriggers = FallbackTrigger.NoMatch |
                            FallbackTrigger.LowConfidence |
                            FallbackTrigger.Timeout;
})
```

**[Learn more: Sequential Input Mode](/guide/flows/input-handling#sequential-input-mode)**

### Advanced Prompts

Enhanced PlayPrompt with SSML, neural voices, multi-language support, and audio files:

```csharp
// SSML with neural voice
.PlayPrompt(prompt => {
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome <break time='1s'/> to our service.
        <emphasis level='strong'>How can I help you?</emphasis>
    </speak>";
    prompt.Voice = "Matthew";
    prompt.UseNeuralVoice = true;
    prompt.SpeakingRate = 1.1;  // 10% faster
})

// Multi-language with neural voice
.PlayPrompt(prompt => {
    prompt.Text = "Bienvenido a nuestro servicio";
    prompt.Voice = "Lupe";  // Spanish (US) neural voice
    prompt.UseNeuralVoice = true;
    prompt.LanguageCode = "es-US";
})

// Audio file from S3
.PlayPrompt(prompt => {
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "my-prompts-bucket";
    prompt.S3Key = "greetings/welcome.wav";
})
```

**[Learn more: Advanced Prompts](/guide/flows/prompts)**

### API References

Complete documentation for all configuration classes:

- **[Input Configuration API](/reference/input-configuration)** - InputConfiguration, PrimaryInputConfiguration, FallbackInputConfiguration, FallbackTrigger enum
- **[Prompt Configuration API](/reference/prompt-configuration)** - PlayPromptConfiguration, PromptType enum, voice list, SSML tags

## Next Steps

- **[Attribute-Based Design](/guide/attributes)** - Learn the alternative declarative approach
- **[Flow Basics](/guide/flows/basics)** - Understand flow fundamentals
- **[Fluent Builders in Detail](/guide/flows/fluent-builders)** - Deep dive into fluent builder API
- **[Customer Input Handling](/guide/flows/input-handling)** - Complete guide to input handling
- **[Advanced Prompts](/guide/flows/prompts)** - Complete guide to prompts and SSML
- **[Framework Patterns](/guide/patterns)** - See both approaches compared side-by-side
- **[Examples](/examples/minimal-setup)** - Working examples using Fluent API

## Summary

The Fluent API is a **powerful, flexible, and familiar** way to build Amazon Connect contact centers with Switchboard.

**Key Benefits:**
- ✅ Full IDE support (IntelliSense, refactoring)
- ✅ Explicit control over every detail
- ✅ Dynamic flow construction
- ✅ Easy composition and reusability
- ✅ Standard C# testing patterns
- ✅ Familiar builder pattern

**Use it when:**
- You need complex conditional logic
- You're building flows dynamically
- You want maximum control and visibility
- You prefer programmatic over declarative

**Remember:** Both Fluent API and Attributes are equally valid approaches. Choose what fits your style and requirements - there's no "wrong" choice! 🚀
