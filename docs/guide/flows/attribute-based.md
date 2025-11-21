# Attribute-Based Flows

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Attribute-based flows provide a declarative, concise syntax where you define flow structure using C# attributes and source generators create the implementation automatically. This approach is ideal when you prefer minimal boilerplate and want the framework to handle most of the implementation details.

## Quick Start

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

That's it! Source generators automatically create:
- Flow implementation
- CDK constructs
- Validation logic
- CloudFormation templates

## Why Attributes?

### Conciseness

**Attribute-based:**
```csharp
[ContactFlow("SalesFlow")]
public partial class SalesFlow
{
    [Message("Welcome to sales")]
    public partial void Welcome();

    [TransferToQueue("Sales")]
    public partial void Transfer();
}
```

**Fluent builder equivalent:**
```csharp
public static IContactFlow CreateSalesFlow()
{
    return new FlowBuilder()
        .SetName("SalesFlow")
        .AddAction(new MessageParticipantAction { Text = "Welcome to sales" })
        .AddAction(new TransferToQueueAction { QueueName = "Sales" })
        .Build();
}
```

### Type Safety

Attributes are validated at **compile-time** by Roslyn analyzers:

```csharp
// ✅ Valid - queue exists
[TransferToQueue("Sales")]
public partial void Transfer();

// ❌ Compile error - queue doesn't exist
[TransferToQueue("NonExistent")]
public partial void Transfer();
// Error: SWB001 - Queue 'NonExistent' not defined
```

### IntelliSense Support

Full IDE support with autocomplete:

```csharp
[Message  // IntelliSense shows parameters:
    // Text (string)
    // Voice (string, optional)
    // Language (string, optional)
    // ConfigKey (string, optional)
```

## Core Concepts

### Partial Classes

Attribute-based flows **must** use `partial` keyword:

```csharp
// ✅ Correct
[ContactFlow("MyFlow")]
public partial class MyFlow : FlowDefinitionBase
{
    // ...
}

// ❌ Wrong - source generator can't add implementation
[ContactFlow("MyFlow")]
public class MyFlow : FlowDefinitionBase
{
    // ...
}
```

### Partial Methods

Actions are defined as `partial` methods:

```csharp
[ContactFlow("ExampleFlow")]
public partial class ExampleFlow
{
    [Message("Hello")]
    public partial void SayHello();  // Declaration only

    // Implementation generated automatically by source generator
}
```

### Base Class

Inherit from `FlowDefinitionBase`:

```csharp
[ContactFlow("CustomFlow")]
public partial class CustomFlow : FlowDefinitionBase
{
    // Inherit CDK synthesis methods
    // Inherit validation logic
    // Inherit common flow operations
}
```

## Simple Flows

### Welcome and Transfer

```csharp
[ContactFlow("SimpleWelcome")]
public partial class SimpleWelcomeFlow : FlowDefinitionBase
{
    [Message("Thank you for calling. Connecting you now.")]
    public partial void WelcomeMessage();

    [TransferToQueue("Support")]
    public partial void TransferToSupport();
}
```

### Multi-Message Flow

```csharp
[ContactFlow("InformationalFlow")]
public partial class InformationalFlow : FlowDefinitionBase
{
    [Message("Welcome to Acme Corporation")]
    public partial void Welcome();

    [Message("Your call is important to us")]
    public partial void Importance();

    [Message("Connecting you to an agent")]
    public partial void Connecting();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

## IVR Menus

### Single-Level Menu

```csharp
[ContactFlow("MainMenu")]
public partial class MainMenuFlow : FlowDefinitionBase
{
    [Message("Welcome")]
    public partial void Welcome();

    [GetUserInput("For sales, press 1. For support, press 2.", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Sales))]
    [Branch(OnDigit = "2", Target = nameof(Support))]
    [Branch(OnTimeout = true, Target = nameof(Timeout))]
    public partial void GetMenuChoice();

    [Message("Connecting you to sales")]
    [TransferToQueue("Sales")]
    public partial void Sales();

    [Message("Connecting you to support")]
    [TransferToQueue("Support")]
    public partial void Support();

    [Message("We didn't receive your selection")]
    [Loop(Target = nameof(GetMenuChoice), MaxIterations = 3)]
    public partial void Timeout();
}
```

### Multi-Level Menu

```csharp
[ContactFlow("MultiLevelMenu")]
public partial class MultiLevelMenuFlow : FlowDefinitionBase
{
    [Message("Main menu")]
    public partial void MainMenu();

    [GetUserInput("Press 1 for sales, 2 for support", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(SalesMenu))]
    [Branch(OnDigit = "2", Target = nameof(SupportMenu))]
    public partial void GetMainSelection();

    // Sales sub-menu
    [Message("Sales department")]
    public partial void SalesMenu();

    [GetUserInput("Press 1 for new orders, 2 for existing orders", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(NewOrders))]
    [Branch(OnDigit = "2", Target = nameof(ExistingOrders))]
    public partial void GetSalesSelection();

    [TransferToQueue("NewOrders")]
    public partial void NewOrders();

    [TransferToQueue("ExistingOrders")]
    public partial void ExistingOrders();

    // Support sub-menu
    [Message("Support department")]
    public partial void SupportMenu();

    [GetUserInput("Press 1 for technical, 2 for billing", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Technical))]
    [Branch(OnDigit = "2", Target = nameof(Billing))]
    public partial void GetSupportSelection();

    [TransferToQueue("TechnicalSupport")]
    public partial void Technical();

    [TransferToQueue("BillingSupport")]
    public partial void Billing();
}
```

## Conditional Logic

### Business Hours Check

```csharp
[ContactFlow("BusinessHoursFlow")]
[HoursOfOperation("StandardHours", TimeZone = "America/New_York")]
public partial class BusinessHoursFlow : FlowDefinitionBase
{
    [Message("Welcome")]
    public partial void Welcome();

    [CheckHours("StandardHours")]
    [OnTrue(Target = nameof(WithinHours))]
    [OnFalse(Target = nameof(AfterHours))]
    public partial void CheckIfOpen();

    [Message("Our agents are available now")]
    [TransferToQueue("Support")]
    public partial void WithinHours();

    [Message("We're closed. Hours: Monday-Friday, 9am-5pm EST")]
    [PlayPrompt("s3://my-bucket/voicemail-instructions.wav")]
    [Disconnect]
    public partial void AfterHours();
}
```

### Customer Type Routing

```csharp
[ContactFlow("VipRouting")]
public partial class VipRoutingFlow : FlowDefinitionBase
{
    [InvokeLambda("CustomerLookup")]
    public partial void LookupCustomer();

    [CheckAttribute("CustomerType", CompareType.Equals, "VIP")]
    [OnTrue(Target = nameof(VipPath))]
    [OnFalse(Target = nameof(StandardPath))]
    public partial void CheckCustomerType();

    [Message("Welcome, valued customer")]
    [SetAttribute("Priority", "High")]
    [TransferToQueue("VIPSupport", Priority = QueuePriority.High)]
    public partial void VipPath();

    [Message("Welcome")]
    [TransferToQueue("GeneralSupport")]
    public partial void StandardPath();
}
```

## Lambda Integration

### Customer Authentication

```csharp
[ContactFlow("AuthenticationFlow")]
public partial class AuthenticationFlow : FlowDefinitionBase
{
    [Message("For security, please enter your 4-digit PIN")]
    public partial void RequestPin();

    [GetUserInput("Enter PIN", MaxDigits = 4, Timeout = 10)]
    public partial void GetPin();

    [InvokeLambda("ValidatePinFunction", Timeout = 5)]
    [OnSuccess(Target = nameof(Authenticated))]
    [OnError(Target = nameof(InvalidPin))]
    public partial void ValidatePin();

    [Message("PIN verified successfully")]
    [SetAttribute("Authenticated", "true")]
    [TransferToQueue("SecureSupport")]
    public partial void Authenticated();

    [Message("Invalid PIN")]
    [Loop(Target = nameof(GetPin), MaxIterations = 3)]
    public partial void InvalidPin();

    [Message("Too many failed attempts")]
    [Disconnect]
    public partial void MaxAttemptsExceeded();
}
```

### Data Enrichment

```csharp
[ContactFlow("EnrichedFlow")]
public partial class EnrichedFlow : FlowDefinitionBase
{
    [Message("Looking up your account")]
    public partial void LookupMessage();

    [InvokeLambda("CustomerDataEnrichment")]
    [OnSuccess(Target = nameof(DataRetrieved))]
    [OnError(Target = nameof(DataFailed))]
    public partial void EnrichData();

    [SetAttribute("CustomerName", Source = AttributeSource.LambdaResponse, Key = "name")]
    [SetAttribute("AccountStatus", Source = AttributeSource.LambdaResponse, Key = "status")]
    [Message("Hello, $.Attributes.CustomerName")]
    [TransferToQueue("Support")]
    public partial void DataRetrieved();

    [Message("Unable to retrieve account information")]
    [TransferToQueue("Support")]
    public partial void DataFailed();
}
```

## Dynamic Configuration

### Runtime Parameters

```csharp
[ContactFlow("DynamicFlow")]
public partial class DynamicFlow : FlowDefinitionBase
{
    // Message text from DynamoDB
    [Message(ConfigKey = "welcomeMessage", DefaultValue = "Welcome")]
    public partial void DynamicWelcome();

    // Queue name from DynamoDB
    [TransferToQueue(ConfigKey = "primaryQueue", DefaultValue = "GeneralSupport")]
    public partial void DynamicTransfer();

    // Lambda ARN from DynamoDB
    [InvokeLambda(ConfigKey = "customerLookupLambda")]
    public partial void DynamicLambda();
}
```

### Feature Flags

```csharp
[ContactFlow("FeatureFlagFlow")]
public partial class FeatureFlagFlow : FlowDefinitionBase
{
    [CheckAttribute(ConfigKey = "callbackEnabled", CompareType.Equals, "true")]
    [OnTrue(Target = nameof(CallbackAvailable))]
    [OnFalse(Target = nameof(StandardFlow))]
    public partial void CheckCallbackFeature();

    [Message("Callback feature is available")]
    [GetUserInput("Press 1 to request callback", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(RequestCallback))]
    public partial void CallbackAvailable();

    [SetCallback(Queue = "Support", DelayMinutes = 5)]
    [Message("We'll call you back shortly")]
    [Disconnect]
    public partial void RequestCallback();

    [TransferToQueue("Support")]
    public partial void StandardFlow();
}
```

## Advanced Patterns

### Error Handling

```csharp
[ContactFlow("RobustFlow")]
public partial class RobustFlow : FlowDefinitionBase
{
    [InvokeLambda("ExternalAPI", Timeout = 5)]
    [OnSuccess(Target = nameof(ApiSuccess))]
    [OnError(Target = nameof(ApiError))]
    [OnTimeout(Target = nameof(ApiTimeout))]
    public partial void CallExternalApi();

    [Message("API call successful")]
    [TransferToQueue("Support")]
    public partial void ApiSuccess();

    [Message("API temporarily unavailable")]
    [Retry(MaxAttempts = 3, BackoffRate = 2.0)]
    [TransferToQueue("Support")]
    public partial void ApiError();

    [Message("API timeout")]
    [TransferToQueue("Support")]
    public partial void ApiTimeout();
}
```

### Composite Flows

```csharp
[ContactFlow("CompositeFlow")]
public partial class CompositeFlow : FlowDefinitionBase
{
    // Execute authentication sub-flow
    [ExecuteSubFlow(nameof(AuthenticationFlow))]
    public partial void Authenticate();

    // Check if authenticated
    [CheckAttribute("Authenticated", CompareType.Equals, "true")]
    [OnTrue(Target = nameof(MainFlow))]
    [OnFalse(Target = nameof(AuthFailed))]
    public partial void CheckAuth();

    // Execute main flow
    [ExecuteSubFlow(nameof(MainBusinessFlow))]
    public partial void MainFlow();

    [Message("Authentication required")]
    [Disconnect]
    public partial void AuthFailed();
}

[ContactFlow("AuthenticationFlow")]
public partial class AuthenticationFlow : FlowDefinitionBase
{
    // ... authentication logic
}

[ContactFlow("MainBusinessFlow")]
public partial class MainBusinessFlow : FlowDefinitionBase
{
    // ... main business logic
}
```

## Organizing Flows

### Single File

```csharp
// Program.cs
using NickSoftware.Switchboard;

[ContactFlow("SalesInbound")]
public partial class SalesInboundFlow : FlowDefinitionBase
{
    [Message("Sales department")]
    public partial void Welcome();

    [TransferToQueue("Sales")]
    public partial void Transfer();
}

[ContactFlow("SupportInbound")]
public partial class SupportInboundFlow : FlowDefinitionBase
{
    [Message("Support department")]
    public partial void Welcome();

    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

### Multiple Files

```
/Flows
  /Sales
    SalesInboundFlow.cs
    SalesCallbackFlow.cs
  /Support
    SupportInboundFlow.cs
    TechnicalSupportFlow.cs
  /Common
    AuthenticationFlow.cs
    BusinessHoursFlow.cs
```

```csharp
// Flows/Sales/SalesInboundFlow.cs
namespace MyContactCenter.Flows.Sales;

[ContactFlow("SalesInbound")]
public partial class SalesInboundFlow : FlowDefinitionBase
{
    // ...
}
```

## Testing

### Unit Testing

```csharp
using Xunit;
using FluentAssertions;

public class SalesInboundFlowTests
{
    [Fact]
    public void SalesInbound_ShouldHaveCorrectStructure()
    {
        // Arrange
        var flow = new SalesInboundFlow();

        // Act
        var actions = flow.GetActions();

        // Assert
        actions.Should().HaveCount(2);
        actions[0].Should().BeOfType<MessageAction>();
        actions[1].Should().BeOfType<TransferToQueueAction>();
    }

    [Fact]
    public void SalesInbound_WelcomeMessage_ShouldHaveCorrectText()
    {
        // Arrange
        var flow = new SalesInboundFlow();

        // Act
        var message = flow.GetActions()
            .OfType<MessageAction>()
            .First();

        // Assert
        message.Text.Should().Be("Sales department");
    }

    [Fact]
    public void SalesInbound_ShouldTransferToCorrectQueue()
    {
        // Arrange
        var flow = new SalesInboundFlow();

        // Act
        var transfer = flow.GetActions()
            .OfType<TransferToQueueAction>()
            .First();

        // Assert
        transfer.QueueName.Should().Be("Sales");
    }
}
```

### Integration Testing

```csharp
public class FlowCdkTests
{
    [Fact]
    public void SalesInboundFlow_ShouldGenerateValidCdk()
    {
        // Arrange
        var app = new App();
        var stack = new SwitchboardStack(app, "TestStack");
        var flow = new SalesInboundFlow();

        // Act
        flow.BuildCdkConstruct(stack);
        var template = Template.FromStack(stack);

        // Assert
        template.HasResourceProperties("AWS::Connect::ContactFlow", new
        {
            Name = "SalesInbound",
            Type = "CONTACT_FLOW"
        });
    }
}
```

## Best Practices

### 1. One Responsibility Per Flow

```csharp
// ✅ Good: Focused flows
[ContactFlow("Authentication")]
public partial class AuthenticationFlow { /* ... */ }

[ContactFlow("Routing")]
public partial class RoutingFlow { /* ... */ }

// ❌ Bad: Too many responsibilities
[ContactFlow("EverythingFlow")]
public partial class EverythingFlow
{
    // Auth + routing + IVR + callbacks + ...
}
```

### 2. Descriptive Method Names

```csharp
// ✅ Good
[Message("Welcome")]
public partial void WelcomeCustomer();

[GetUserInput("Enter PIN")]
public partial void GetCustomerPin();

// ❌ Bad
[Message("Welcome")]
public partial void Action1();
```

### 3. Use Constants

```csharp
public static class QueueNames
{
    public const string Sales = "Sales";
    public const string Support = "Support";
    public const string Billing = "Billing";
}

[ContactFlow("MainFlow")]
public partial class MainFlow
{
    [TransferToQueue(QueueNames.Sales)]
    public partial void TransferToSales();
}
```

### 4. Document Complex Flows

```csharp
/// <summary>
/// VIP customer flow with authentication and priority routing.
/// </summary>
/// <remarks>
/// Flow sequence:
/// 1. Authenticate customer via PIN
/// 2. Verify VIP status via Lambda
/// 3. Route to VIP queue if verified
/// 4. Fallback to standard queue if not VIP
/// </remarks>
[ContactFlow("VIPCustomerFlow")]
public partial class VipCustomerFlow : FlowDefinitionBase
{
    // ...
}
```

### 5. Handle All Branches

```csharp
// ✅ Good: All branches handled
[GetUserInput("Press 1 or 2", MaxDigits = 1)]
[Branch(OnDigit = "1", Target = nameof(Option1))]
[Branch(OnDigit = "2", Target = nameof(Option2))]
[Branch(OnTimeout = true, Target = nameof(Timeout))]
[Branch(OnDefault = true, Target = nameof(Invalid))]
public partial void GetInput();

// ❌ Bad: Missing timeout/default handling
[GetUserInput("Press 1 or 2", MaxDigits = 1)]
[Branch(OnDigit = "1", Target = nameof(Option1))]
[Branch(OnDigit = "2", Target = nameof(Option2))]
public partial void GetInputIncomplete();
```

## Source Generator Output

When you write this:

```csharp
[ContactFlow("SimpleFlow")]
public partial class SimpleFlow : FlowDefinitionBase
{
    [Message("Hello")]
    public partial void SayHello();

    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

The source generator creates (simplified):

```csharp
public partial class SimpleFlow
{
    public partial void SayHello()
    {
        AddAction(new MessageAction
        {
            Text = "Hello",
            Identifier = GenerateIdentifier("SayHello")
        });
    }

    public partial void Transfer()
    {
        AddAction(new TransferToQueueAction
        {
            QueueName = "Support",
            Identifier = GenerateIdentifier("Transfer")
        });
    }

    public override CfnContactFlow BuildCdkConstruct(Construct scope)
    {
        return new CfnContactFlow(scope, "SimpleFlow", new CfnContactFlowProps
        {
            Name = "SimpleFlow",
            Type = "CONTACT_FLOW",
            Content = GenerateFlowJson()
        });
    }
}
```

## Next Steps

- **[Flow Validation](/guide/flows/validation)** - Ensure flow correctness
- **[Source Generators](/guide/advanced/source-generators)** - How code generation works
- **[Roslyn Analyzers](/guide/advanced/analyzers)** - Compile-time validation
- **[Enterprise (Attributes)](/examples/enterprise-attributes)** - Production example

## Related Resources

- [Flow Basics](/guide/flows/basics) - Flow fundamentals
- [Attributes Reference](/reference/attributes) - Complete attribute list
- [Fluent Builders](/guide/flows/fluent-builders) - Programmatic alternative
