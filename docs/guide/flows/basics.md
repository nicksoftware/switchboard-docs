# Flow Basics

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Contact flows are the heart of Amazon Connect - they define how calls are handled, routed, and processed. This guide covers the fundamentals of building contact flows with Switchboard.

## What is a Contact Flow?

A contact flow is a sequence of actions that Amazon Connect executes when handling a customer interaction. Think of it as a flowchart that defines:

- **What customers hear** (messages, prompts)
- **What input is collected** (DTMF, voice)
- **Where calls are routed** (queues, agents)
- **What logic is executed** (Lambda functions, conditions)
- **How calls end** (disconnect, transfer, voicemail)

### Flow Types

Amazon Connect supports several flow types:

| Type                  | Purpose                              | Entry Point                |
| --------------------- | ------------------------------------ | -------------------------- |
| **Contact Flow**      | Main inbound/outbound flows          | Phone number, transfer     |
| **Customer Queue**    | While customer waits in queue        | Set by routing             |
| **Customer Hold**     | While customer is on hold            | Agent places on hold       |
| **Customer Whisper**  | Played to customer before connecting | Before agent connection    |
| **Agent Whisper**     | Played to agent before connecting    | Before customer connection |
| **Transfer to Agent** | When transferring to specific agent  | Quick connect              |
| **Transfer to Queue** | When transferring to queue           | Queue transfer             |

**Most Common:** `Contact Flow` (90% of use cases)

## Your First Flow

Switchboard offers two equally valid approaches for building flows. Choose the one that fits your style and requirements.

### Using Attributes

The declarative approach with minimal code:

```csharp
using NickSoftware.Switchboard;

[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow : FlowDefinitionBase
{
    [Message("Welcome to our contact center")]
    public partial void Welcome();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

### Using Fluent Builders

The programmatic approach with full control:

```csharp
using NickSoftware.Switchboard;

public class FlowDefinitions
{
    public static IContactFlow CreateWelcomeFlow()
    {
        return new FlowBuilder()
            .SetName("WelcomeFlow")
            .PlayPrompt("Welcome to our contact center")
            .TransferToQueue("GeneralSupport")
            .Build();
    }
}
```

### CDK Integration

```csharp
using Amazon.CDK;
using NickSoftware.Switchboard;

var app = new App();

var builder = Host.CreateApplicationBuilder();

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyContactCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();
var switchboard = host.Services.GetRequiredService<ISwitchboardApp>();

app.Synth();
```

## Flow Structure

Every flow has three core components:

### 1. Entry Point

Where the flow begins execution:

```csharp
[ContactFlow("MainInbound")]
public partial class MainInboundFlow
{
    // This is the entry point (first method)
    [Message("Thank you for calling")]
    public partial void EntryPoint();

    // Subsequent actions...
}
```

### 2. Actions

Individual steps in the flow:

```csharp
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow
{
    // Action 1: Play message
    [Message("Welcome")]
    public partial void WelcomeMessage();

    // Action 2: Get input
    [GetUserInput("Press 1 for sales, 2 for support", MaxDigits = 1)]
    public partial void GetMenuChoice();

    // Action 3: Transfer
    [TransferToQueue("Sales")]
    public partial void TransferToSales();
}
```

### 3. Transitions

How actions connect:

```csharp
[ContactFlow("MenuFlow")]
public partial class MenuFlow
{
    [Message("Main menu")]
    public partial void MainMenu();
    // Automatically transitions to next action

    [GetUserInput("Press 1 or 2", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Sales))]
    [Branch(OnDigit = "2", Target = nameof(Support))]
    public partial void GetChoice();
    // Transitions based on user input

    [TransferToQueue("Sales")]
    public partial void Sales();

    [TransferToQueue("Support")]
    public partial void Support();
}
```

## Common Flow Patterns

### Simple Welcome and Transfer

The most basic flow:

```csharp
[ContactFlow("SimpleFlow")]
public partial class SimpleFlow
{
    [Message("Thank you for calling. Connecting you to an agent.")]
    public partial void Welcome();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

### IVR Menu

Collect input and route accordingly:

```csharp
[ContactFlow("IvrMenu")]
public partial class IvrMenuFlow
{
    [Message("Welcome to Acme Corp")]
    public partial void Welcome();

    [GetUserInput(
        "For sales, press 1. For support, press 2. For billing, press 3.",
        MaxDigits = 1,
        Timeout = 5
    )]
    [Branch(OnDigit = "1", Target = nameof(Sales))]
    [Branch(OnDigit = "2", Target = nameof(Support))]
    [Branch(OnDigit = "3", Target = nameof(Billing))]
    [Branch(OnTimeout = true, Target = nameof(Timeout))]
    public partial void GetMenuSelection();

    [TransferToQueue("Sales")]
    public partial void Sales();

    [TransferToQueue("Support")]
    public partial void Support();

    [TransferToQueue("Billing")]
    public partial void Billing();

    [Message("We didn't receive your selection")]
    [Loop(Target = nameof(GetMenuSelection), MaxIterations = 3)]
    public partial void Timeout();
}
```

### Smart IVR with Speech Recognition

Use Amazon Lex for natural language input with DTMF fallback:

**Attribute-Based:**

```csharp
using Switchboard.Attributes;
using Switchboard.Actions;

[ContactFlow("SmartIVR")]
public partial class SmartIVRFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to Acme Corporation")]
    public partial void Welcome();

    [Action(Order = 2)]
    [GetCustomerInput(
        InputType = CustomerInputType.Sequential,  // Try ASR, fallback to DTMF
        Text = "I can help you with sales, support, or billing. What do you need?",
        LexBot = "AcmeIVR",
        LexBotAlias = "Production",
        ConfidenceThreshold = 0.6,
        FallbackText = "Or press 1 for sales, 2 for support, 3 for billing")]
    [MaxDigits(1)]
    public partial void GetDepartment();

    [Action(Order = 3)]
    [Branch(Input = "$.CustomerInput")]
    public partial void RouteByDepartment()
    {
        [Case("Sales")]  // Lex intent or DTMF digit "1"
        void Sales()
        {
            [Message("Connecting to sales...")]
            void NotifySales();

            [TransferToQueue("SalesQueue")]
            void TransferSales();
        }

        [Case("Support")]  // Lex intent or DTMF digit "2"
        void Support()
        {
            [Message("Transferring to support...")]
            void NotifySupport();

            [TransferToQueue("SupportQueue")]
            void TransferSupport();
        }

        [Case("Billing")]  // Lex intent or DTMF digit "3"
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
            [Message("I didn't understand. Let me connect you to an agent.")]
            void NotifyNoMatch();

            [TransferToQueue("GeneralQueue")]
            void TransferGeneral();
        }
    }
}
```

**Fluent API:**

```csharp
using Switchboard;
using Switchboard.Configuration;
using Switchboard.Enums;

var flow = new FlowBuilder()
    .SetName("SmartIVR")

    .PlayPrompt("Welcome to Acme Corporation")

    .ThenGetInput(input =>
    {
        // Primary: ASR with Amazon Lex
        input.Primary.Mode = InputMode.ASR;
        input.Primary.LexBot = "AcmeIVR";
        input.Primary.LexBotAlias = "Production";
        input.Primary.Locale = "en_US";
        input.Primary.Prompt = "I can help you with sales, support, or billing. What do you need?";
        input.Primary.ConfidenceThreshold = 0.6;

        // Fallback: DTMF
        input.Fallback.Mode = InputMode.DTMF;
        input.Fallback.PromptText = "Or press 1 for sales, 2 for support, 3 for billing";
        input.Fallback.MaxDigits = 1;

        // Enable Sequential Mode (ASR → DTMF)
        input.EnableFallback = true;
        input.FallbackTriggers = FallbackTrigger.AnyError;
    })
    .RouteByInput(router =>
    {
        router.OnIntent("Sales", flow =>  // Lex intent
        {
            flow.PlayPrompt("Connecting to sales...")
                .ThenTransferToQueue("SalesQueue");
        })
        .OnDigit("1", flow =>  // DTMF fallback
        {
            flow.PlayPrompt("Connecting to sales...")
                .ThenTransferToQueue("SalesQueue");
        });

        router.OnIntent("Support", flow =>
        {
            flow.PlayPrompt("Transferring to support...")
                .ThenTransferToQueue("SupportQueue");
        })
        .OnDigit("2", flow =>
        {
            flow.PlayPrompt("Transferring to support...")
                .ThenTransferToQueue("SupportQueue");
        });

        router.OnIntent("Billing", flow =>
        {
            flow.PlayPrompt("Routing to billing...")
                .ThenTransferToQueue("BillingQueue");
        })
        .OnDigit("3", flow =>
        {
            flow.PlayPrompt("Routing to billing...")
                .ThenTransferToQueue("BillingQueue");
        });

        router.OnNoMatch(flow =>
        {
            flow.PlayPrompt("I didn't understand. Let me connect you to an agent.")
                .ThenTransferToQueue("GeneralQueue");
        });
    })

    .Build();
```

::: tip Learn More
See [Speech Recognition (ASR)](./speech-recognition.md) for comprehensive ASR documentation including:

- Amazon Lex bot setup
- Confidence threshold tuning
- Multi-language support
- Advanced routing by intent
  :::

### Business Hours Check

Route differently based on time:

**Attribute-Based:**

```csharp
[ContactFlow("BusinessHoursFlow")]
public partial class BusinessHoursFlow
{
    [PlayPrompt("Welcome to our support center")]
    public partial void Welcome();

    [CheckHoursOfOperation("BusinessHours")]
    public partial void CheckIfOpen();

    // Branch methods would be generated for "InHours" and "OutOfHours"
    // (Source generator support coming soon)
}
```

**Fluent API:**

```csharp
var flow = new FlowBuilder()
    .SetName("BusinessHoursFlow")

    .PlayPrompt("Welcome to our support center")

    .CheckHoursOfOperation("BusinessHours")
    .WhenInHours(inHours => inHours
        .PlayPrompt("Our agents are available now. Please hold.")
        .TransferToQueue("Support")
        .Disconnect())
    .WhenOutOfHours(afterHours => afterHours
        .PlayPrompt("We're currently closed. Our business hours are Monday-Friday, 9am-5pm.")
        .PlayPrompt("s3://my-bucket/voicemail-instructions.wav")
        .Disconnect())

    .Build();
```

### Customer Authentication

Verify customer before routing:

```csharp
[ContactFlow("AuthenticatedFlow")]
public partial class AuthenticatedFlow
{
    [Message("Welcome. For your security, we need to verify your identity.")]
    public partial void Welcome();

    [GetUserInput("Please enter your 4-digit PIN", MaxDigits = 4, Timeout = 10)]
    public partial void GetPin();

    [InvokeLambda("CustomerAuthFunction", Timeout = 5)]
    [OnSuccess(Target = nameof(Authenticated))]
    [OnError(Target = nameof(AuthFailed))]
    public partial void ValidatePin();

    [Message("Thank you. You are verified.")]
    [SetAttribute("Authenticated", "true")]
    [TransferToQueue("VIPSupport")]
    public partial void Authenticated();

    [Message("Invalid PIN. Please try again.")]
    [Loop(Target = nameof(GetPin), MaxIterations = 3)]
    public partial void AuthFailed();
}
```

### Callback Flow

Offer callback instead of waiting:

```csharp
[ContactFlow("CallbackFlow")]
public partial class CallbackFlow
{
    [Message("Welcome")]
    public partial void Welcome();

    [GetQueueMetrics("Support", Metric = "CallsInQueue")]
    [CheckAttribute("CallsInQueue", CompareType.GreaterThan, "10")]
    [OnTrue(Target = nameof(OfferCallback))]
    [OnFalse(Target = nameof(TransferDirectly))]
    public partial void CheckQueueDepth();

    [Message("The current wait time is over 10 minutes")]
    [GetUserInput("Press 1 to hold, or 2 to receive a callback", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(TransferDirectly))]
    [Branch(OnDigit = "2", Target = nameof(CreateCallback))]
    public partial void OfferCallback();

    [TransferToQueue("Support")]
    public partial void TransferDirectly();

    [Message("We'll call you back within the hour")]
    [SetCallback(Queue = "Support", DelayMinutes = 5)]
    [Disconnect]
    public partial void CreateCallback();
}
```

## Flow Actions Reference

### Message Actions

Play text-to-speech:

```csharp
// Basic message
[Message("Hello")]
public partial void BasicMessage();

// With voice and language
[Message("Bonjour", Voice = "Celine", Language = "fr-FR")]
public partial void FrenchMessage();

// Dynamic from config
[Message(ConfigKey = "welcomeMessage")]
public partial void DynamicMessage();
```

### Input Collection

Collect DTMF or voice input:

```csharp
// DTMF input
[GetUserInput("Enter your account number", MaxDigits = 8, Timeout = 10)]
public partial void GetAccountNumber();

// Voice input
[GetUserInput("Please state your request", InputType = InputType.Voice, Timeout = 5)]
public partial void GetVoiceInput();

// With validation
[GetUserInput("Enter 4-digit PIN", MaxDigits = 4)]
[ValidateInput(Pattern = @"^\d{4}$", OnInvalid = nameof(InvalidPin))]
public partial void GetValidatedPin();

[Message("Invalid PIN format")]
public partial void InvalidPin();
```

### Queue Operations

Transfer to queues:

```csharp
// Basic transfer
[TransferToQueue("Support")]
public partial void Transfer();

// With timeout and priority
[TransferToQueue("VIPSupport", Timeout = 300, Priority = QueuePriority.High)]
public partial void TransferVip();

// Set working queue (for queue flow type)
[SetWorkingQueue("Support")]
public partial void SetQueue();
```

### Lambda Integration

Invoke AWS Lambda:

```csharp
// By ARN
[InvokeLambda(
    FunctionArn = "arn:aws:lambda:us-east-1:123456789:function:MyFunction",
    Timeout = 8
)]
public partial void CallLambda();

// By name (resolved automatically)
[InvokeLambda(FunctionName = "CustomerLookup")]
public partial void LookupCustomer();

// With error handling
[InvokeLambda("ExternalAPI", Timeout = 5)]
[OnSuccess(Target = nameof(ApiSuccess))]
[OnError(Target = nameof(ApiError))]
public partial void CallApi();

[Message("API call successful")]
public partial void ApiSuccess();

[Message("API call failed")]
public partial void ApiError();
```

### Attribute Operations

Set and check contact attributes:

```csharp
// Set attribute
[SetAttribute("Language", "en-US")]
public partial void SetLanguage();

// Set from Lambda response
[SetAttribute("CustomerName", Source = AttributeSource.LambdaResponse, Key = "name")]
public partial void SetNameFromLambda();

// Check attribute
[CheckAttribute("VIPCustomer", CompareType.Equals, "true")]
[OnTrue(Target = nameof(VipPath))]
[OnFalse(Target = nameof(StandardPath))]
public partial void CheckVipStatus();

[TransferToQueue("VIPSupport")]
public partial void VipPath();

[TransferToQueue("GeneralSupport")]
public partial void StandardPath();
```

### Prompts

Play audio files:

```csharp
// S3 audio file
[PlayPrompt("s3://my-bucket/prompts/welcome.wav")]
public partial void PlayWelcome();

// Dynamic prompt
[PlayPrompt(ConfigKey = "holidayGreeting")]
public partial void PlayHolidayGreeting();

// With interruption handling
[PlayPrompt("s3://my-bucket/long-message.wav", AllowInterrupt = true)]
[OnInterrupt(Target = nameof(Interrupted))]
public partial void PlayLongMessage();

[Message("How can I help you?")]
public partial void Interrupted();
```

### Flow Control

Control flow execution:

```csharp
// Disconnect
[Disconnect]
public partial void EndCall();

// Loop
[Loop(Target = nameof(GetInput), MaxIterations = 3)]
public partial void RetryInput();

// Wait
[Wait(Seconds = 2)]
public partial void PauseBriefly();

// Transfer to another flow
[TransferToFlow("EscalationFlow")]
public partial void Escalate();

// Transfer to phone number
[TransferToPhoneNumber("+18005551234")]
public partial void TransferExternal();
```

## Flow Variables and Attributes

### System Attributes

Amazon Connect provides built-in attributes:

```csharp
[CheckAttribute("System.CustomerNumber", CompareType.StartsWith, "+1")]
[OnTrue(Target = nameof(UsCustomer))]
public partial void CheckCountry();

// Other system attributes:
// - System.CustomerNumber
// - System.DialedNumber
// - System.CustomerEndpointAddress
// - System.LanguageCode
// - System.QueueName
// - System.QueueArn
```

### Custom Attributes

Set your own attributes:

```csharp
[SetAttribute("Reason", "BillingInquiry")]
public partial void SetReason();

[SetAttribute("Priority", "High")]
public partial void SetPriority();

[InvokeLambda("CustomerLookup")]
// Lambda sets attributes automatically
public partial void LookupCustomer();

// Use attributes in conditions
[CheckAttribute("AccountStatus", CompareType.Equals, "Active")]
public partial void CheckStatus();
```

## Testing Flows

### Unit Testing

```csharp
using Xunit;
using NickSoftware.Switchboard;

public class WelcomeFlowTests
{
    [Fact]
    public void WelcomeFlow_ShouldHaveCorrectStructure()
    {
        // Arrange
        var flow = new WelcomeFlow();

        // Act
        var actions = flow.GetActions();

        // Assert
        Assert.Equal(2, actions.Count);
        Assert.IsType<MessageAction>(actions[0]);
        Assert.IsType<TransferToQueueAction>(actions[1]);
    }

    [Fact]
    public void WelcomeFlow_ShouldTransferToCorrectQueue()
    {
        // Arrange
        var flow = new WelcomeFlow();

        // Act
        var transferAction = flow.GetActions()
            .OfType<TransferToQueueAction>()
            .First();

        // Assert
        Assert.Equal("GeneralSupport", transferAction.QueueName);
    }
}
```

### Integration Testing

```csharp
using Amazon.CDK.Assertions;

public class FlowStackTests
{
    [Fact]
    public void Stack_ShouldCreateContactFlow()
    {
        // Arrange
        var app = new App();
        var stack = new SwitchboardStack(app, "TestStack");

        // Act
        var template = Template.FromStack(stack);

        // Assert
        template.HasResourceProperties("AWS::Connect::ContactFlow", new Dictionary<string, object>
        {
            ["Name"] = "WelcomeFlow",
            ["Type"] = "CONTACT_FLOW"
        });
    }
}
```

## Best Practices

### 1. Keep Flows Focused

```csharp
// ✅ Good: Single purpose
[ContactFlow("Authentication")]
public partial class AuthenticationFlow
{
    // Only authentication logic
}

[ContactFlow("Routing")]
public partial class RoutingFlow
{
    // Only routing logic
}

// ❌ Bad: Too many responsibilities
[ContactFlow("MegaFlow")]
public partial class MegaFlow
{
    // Auth + routing + IVR + reporting + ...
}
```

### 2. Use Meaningful Names

```csharp
// ✅ Good
[ContactFlow("VipCustomerSupport")]
public partial class VipCustomerSupportFlow
{
    [Message("Welcome valued customer")]
    public partial void WelcomeVipCustomer();
}

// ❌ Bad
[ContactFlow("Flow1")]
public partial class Flow1
{
    [Message("Welcome")]
    public partial void Action1();
}
```

### 3. Handle Errors Gracefully

```csharp
[ContactFlow("RobustFlow")]
public partial class RobustFlow
{
    [InvokeLambda("ExternalAPI")]
    [OnSuccess(Target = nameof(Success))]
    [OnError(Target = nameof(HandleError))]
    public partial void CallApi();

    [Message("Request successful")]
    public partial void Success();

    [Message("We're experiencing technical difficulties")]
    [TransferToQueue("Support")]  // Don't just disconnect
    public partial void HandleError();
}
```

### 4. Provide Clear Messages

```csharp
// ✅ Good: Clear, helpful
[Message("For sales, press 1. For support, press 2. For billing, press 3. To hear this again, press 9.")]
public partial void MainMenu();

// ❌ Bad: Unclear
[Message("Press a number")]
public partial void Menu();
```

### 5. Set Reasonable Timeouts

```csharp
// ✅ Good: Appropriate timeouts
[GetUserInput("Enter account number", MaxDigits = 8, Timeout = 10)]
public partial void GetAccount();

// ❌ Bad: Too short
[GetUserInput("Enter account number", Timeout = 2)]  // Not enough time
public partial void GetAccountTooFast();
```

## Next Steps

- **[Fluent Builders](/guide/flows/fluent-builders)** - Programmatic flow building
- **[Attribute-Based Flows](/guide/flows/attribute-based)** - Declarative approach
- **[Flow Validation](/guide/flows/validation)** - Ensure flow correctness
- **[Flow Patterns](/examples/flows/authentication)** - Common flow patterns

## Related Examples

- [Basic Call Center](/examples/basic-call-center) - Simple flow example
- [IVR Menu](/examples/flows/ivr-menu) - Menu system pattern
- [Authentication](/examples/flows/authentication) - Customer verification
