# Attribute-Based Design

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard uses **C# attributes** to enable declarative configuration of Amazon Connect resources. This approach allows you to define contact flows, queues, and routing rules using simple metadata annotations, while source generators create the underlying implementation automatically.

## Why Attributes?

### The Fluent API Approach

```csharp
//  Without attributes: Verbose, imperative code
var flow = new FlowBuilder()
    .SetName("SalesInbound")
    .SetDescription("Main sales inbound flow")
    .SetType(FlowType.ContactFlow)
    .AddAction(new MessageParticipantAction
    {
        Text = "Welcome to sales",
        Identifier = "msg-001"
    })
    .AddAction(new TransferToQueueAction
    {
        QueueId = "sales-queue",
        Identifier = "transfer-001"
    })
    .AddTransition("msg-001", "transfer-001")
    .Build();
```

### The Switchboard Approach

```csharp
// ✅ With attributes: Declarative, concise
[ContactFlow("SalesInbound", Description = "Main sales inbound flow")]
public partial class SalesInboundFlow
{
    [Message("Welcome to sales")]
    public partial void WelcomeMessage();

    [TransferToQueue("SalesQueue")]
    public partial void TransferToSales();
}
```

**Benefits:**

- ✅ Less boilerplate code
- ✅ Clear, readable intent
- ✅ Compile-time validation
- ✅ IDE support (IntelliSense, refactoring)
- ✅ Automatic code generation

## Core Attributes

### Flow Definition Attributes

#### `[ContactFlow]`

Defines a contact flow:

```csharp
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow : FlowDefinitionBase
{
    // Flow actions here
}
```

**Parameters:**

- `Name` (string, required): Flow name
- `Description` (string, optional): Flow description
- `Type` (FlowType, optional): Flow type (default: `ContactFlow`)
- `Tags` (Dictionary, optional): Resource tags

**Advanced Usage:**

```csharp
[ContactFlow(
    "VIPCustomerService",
    Description = "Priority flow for VIP customers",
    Type = FlowType.CustomerQueue,
    Tags = new Dictionary<string, string>
    {
        ["Environment"] = "Production",
        ["CostCenter"] = "Sales",
        ["Compliance"] = "PCI"
    }
)]
public partial class VipCustomerServiceFlow : FlowDefinitionBase
{
    // ...
}
```

#### `[Queue]`

Associates a queue with the flow:

```csharp
[ContactFlow("SalesFlow")]
[Queue("SalesQueue", MaxContacts = 50, Timeout = 600)]
public partial class SalesFlow
{
    // ...
}
```

**Parameters:**

- `Name` (string, required): Queue name
- `MaxContacts` (int, optional): Maximum concurrent contacts
- `Timeout` (int, optional): Queue timeout in seconds
- `Description` (string, optional): Queue description

#### `[HoursOfOperation]`

Defines business hours:

```csharp
[ContactFlow("SupportFlow")]
[HoursOfOperation("BusinessHours", TimeZone = "America/New_York")]
public partial class SupportFlow
{
    // ...
}
```

**Parameters:**

- `Name` (string, required): Hours name
- `TimeZone` (string, required): IANA timezone
- `Schedule` (string, optional): Cron-like schedule

### Action Attributes

#### `[Message]`

Play a text-to-speech message:

```csharp
[Message("Welcome to our contact center")]
public partial void WelcomeMessage();

// With configuration
[Message(
    "Welcome",
    Voice = "Joanna",
    Language = "en-US",
    ConfigKey = "welcomeMessage"  // Dynamic from DynamoDB
)]
public partial void WelcomeWithConfig();
```

**Parameters:**

- `Text` (string): Message text
- `Voice` (string, optional): Amazon Polly voice
- `Language` (string, optional): Language code
- `ConfigKey` (string, optional): DynamoDB config key for dynamic text

#### `[TransferToQueue]`

Transfer call to a queue:

```csharp
[TransferToQueue("SalesQueue")]
public partial void TransferToSales();

// With options
[TransferToQueue(
    "SupportQueue",
    Timeout = 300,
    Priority = QueuePriority.High
)]
public partial void TransferToSupport();
```

**Parameters:**

- `QueueName` (string): Queue to transfer to
- `Timeout` (int, optional): Queue timeout
- `Priority` (QueuePriority, optional): Call priority

#### `[GetUserInput]`

Collect DTMF or voice input:

```csharp
[GetUserInput(
    Prompt = "Press 1 for sales, 2 for support",
    MaxDigits = 1,
    Timeout = 5
)]
public partial void GetMainMenuChoice();
```

**Parameters:**

- `Prompt` (string): Input prompt
- `MaxDigits` (int, optional): Maximum digits to collect
- `Timeout` (int, optional): Input timeout in seconds
- `InputType` (InputType, optional): `DTMF` or `Voice`

#### `[InvokeLambda]`

Invoke AWS Lambda function:

```csharp
[InvokeLambda(
    FunctionArn = "arn:aws:lambda:us-east-1:123456789:function:CustomerLookup",
    Timeout = 8
)]
public partial void LookupCustomer();

// With dynamic ARN from config
[InvokeLambda(ConfigKey = "customerLookupLambda")]
public partial void LookupCustomerDynamic();
```

**Parameters:**

- `FunctionArn` (string): Lambda ARN (or use `FunctionName`)
- `FunctionName` (string): Lambda function name
- `Timeout` (int, optional): Invocation timeout
- `ConfigKey` (string, optional): Get ARN from DynamoDB

#### `[CheckHours]`

Check business hours:

```csharp
[CheckHours("BusinessHours")]
public partial void CheckIfOpen();
```

**Parameters:**

- `HoursName` (string): Hours of operation name
- `OnHours` (string, optional): Action if within hours
- `AfterHours` (string, optional): Action if outside hours

#### `[CheckAttribute]`

Check contact attribute:

```csharp
[CheckAttribute(
    Attribute = "CustomerType",
    CompareType = CompareType.Equals,
    Value = "VIP"
)]
public partial void CheckIfVip();
```

**Parameters:**

- `Attribute` (string): Attribute name to check
- `CompareType` (CompareType): Comparison operator
- `Value` (string): Value to compare against

#### `[SetAttribute]`

Set contact attribute:

```csharp
[SetAttribute("Language", "en-US")]
public partial void SetLanguageAttribute();

// Multiple attributes
[SetAttribute("CustomerType", "VIP")]
[SetAttribute("Priority", "High")]
public partial void SetVipAttributes();
```

**Parameters:**

- `Key` (string): Attribute key
- `Value` (string): Attribute value
- `Source` (AttributeSource, optional): Value source (Static, Lambda, etc.)

#### `[PlayPrompt]`

Play audio prompt:

```csharp
[PlayPrompt("s3://my-bucket/prompts/welcome.wav")]
public partial void PlayWelcomePrompt();
```

**Parameters:**

- `PromptUri` (string): S3 URI or prompt ARN
- `ConfigKey` (string, optional): Dynamic prompt from DynamoDB

#### `[Disconnect]`

Disconnect the call:

```csharp
[Disconnect]
public partial void EndCall();
```

#### `[Loop]`

Create a loop:

```csharp
[Loop(MaxIterations = 3)]
public partial void RetryLoop();
```

**Parameters:**

- `MaxIterations` (int): Maximum loop iterations

## Composition and Ordering

### Execution Order

Actions execute in the order they're declared:

```csharp
[ContactFlow("LinearFlow")]
public partial class LinearFlow
{
    [Message("Step 1")]
    public partial void Step1();  // Executes first

    [Message("Step 2")]
    public partial void Step2();  // Executes second

    [Message("Step 3")]
    public partial void Step3();  // Executes third
}
```

### Explicit Ordering

Use `[Order]` attribute for clarity:

```csharp
[ContactFlow("OrderedFlow")]
public partial class OrderedFlow
{
    [Order(3)]
    [Message("Third")]
    public partial void ThirdAction();

    [Order(1)]
    [Message("First")]
    public partial void FirstAction();

    [Order(2)]
    [Message("Second")]
    public partial void SecondAction();
}
```

### Branching Logic

Use method parameters for branching:

```csharp
[ContactFlow("BranchingFlow")]
public partial class BranchingFlow
{
    [Message("Main menu")]
    public partial void MainMenu();

    [GetUserInput("Press 1 or 2", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(SalesPath))]
    [Branch(OnDigit = "2", Target = nameof(SupportPath))]
    public partial void GetMenuChoice();

    [TransferToQueue("Sales")]
    public partial void SalesPath();

    [TransferToQueue("Support")]
    public partial void SupportPath();
}
```

## Advanced Attribute Patterns

### Conditional Execution

```csharp
[ContactFlow("ConditionalFlow")]
public partial class ConditionalFlow
{
    [CheckAttribute("CustomerType", CompareType.Equals, "VIP")]
    [OnTrue(Target = nameof(VipPath))]
    [OnFalse(Target = nameof(StandardPath))]
    public partial void CheckCustomerType();

    [Message("Welcome, valued customer")]
    [TransferToQueue("VIPSupport")]
    public partial void VipPath();

    [Message("Welcome")]
    [TransferToQueue("GeneralSupport")]
    public partial void StandardPath();
}
```

### Error Handling

```csharp
[ContactFlow("ErrorHandlingFlow")]
public partial class ErrorHandlingFlow
{
    [InvokeLambda("CustomerLookup")]
    [OnSuccess(Target = nameof(HandleSuccess))]
    [OnError(Target = nameof(HandleError))]
    public partial void LookupCustomer();

    [Message("Customer found")]
    public partial void HandleSuccess();

    [Message("Unable to lookup customer")]
    [TransferToQueue("Support")]
    public partial void HandleError();
}
```

### Retry Logic

```csharp
[ContactFlow("RetryFlow")]
public partial class RetryFlow
{
    [InvokeLambda("ExternalAPI", Timeout = 3)]
    [Retry(MaxAttempts = 3, BackoffRate = 2.0)]
    [OnSuccess(Target = nameof(Success))]
    [OnMaxRetries(Target = nameof(Failed))]
    public partial void CallExternalApi();

    [Message("API call successful")]
    public partial void Success();

    [Message("API call failed after retries")]
    public partial void Failed();
}
```

## Custom Attributes

Create your own domain-specific attributes:

### Define Custom Attribute

```csharp
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class AuthenticateCustomerAttribute : Attribute
{
    public string LambdaFunction { get; set; }
    public int MaxAttempts { get; set; } = 3;
    public string OnSuccessTarget { get; set; }
    public string OnFailureTarget { get; set; }

    public AuthenticateCustomerAttribute(string lambdaFunction)
    {
        LambdaFunction = lambdafunction;
    }
}
```

### Use Custom Attribute

```csharp
[ContactFlow("SecureFlow")]
public partial class SecureFlow
{
    [AuthenticateCustomer(
        "CustomerAuthFunction",
        MaxAttempts = 3,
        OnSuccessTarget = nameof(Authenticated),
        OnFailureTarget = nameof(AuthFailed)
    )]
    public partial void Authenticate();

    [Message("Authentication successful")]
    public partial void Authenticated();

    [Message("Authentication failed")]
    [Disconnect]
    public partial void AuthFailed();
}
```

### Implement Source Generator for Custom Attribute

```csharp
[Generator]
public class CustomAuthAttributeGenerator : ISourceGenerator
{
    public void Initialize(GeneratorInitializationContext context)
    {
        context.RegisterForSyntaxNotifications(() => new AuthAttributeSyntaxReceiver());
    }

    public void Execute(GeneratorExecutionContext context)
    {
        var receiver = (AuthAttributeSyntaxReceiver)context.SyntaxReceiver;

        foreach (var method in receiver.AuthMethods)
        {
            var attribute = GetAuthAttribute(method);

            // Generate authentication flow
            var code = $@"
public partial void {method.Identifier}()
{{
    var attempts = 0;
    while (attempts < {attribute.MaxAttempts})
    {{
        var result = InvokeLambda(""{attribute.LambdaFunction}"");
        if (result.Success)
        {{
            TransitionTo(nameof({attribute.OnSuccessTarget}));
            return;
        }}
        attempts++;
    }}
    TransitionTo(nameof({attribute.OnFailureTarget}));
}}";

            context.AddSource($"{method.Identifier}.g.cs", code);
        }
    }
}
```

## Validation

### Compile-Time Validation

Roslyn analyzers validate attribute usage:

```csharp
// ❌ Error: Queue doesn't exist
[TransferToQueue("NonExistentQueue")]
public partial void Transfer();
// Analyzer: SWB001 - Queue 'NonExistentQueue' is not defined

// ❌ Error: Missing required parameter
[GetUserInput]  // No prompt specified
public partial void GetInput();
// Analyzer: SWB002 - GetUserInput requires 'Prompt' parameter

// ❌ Error: Invalid attribute combination
[Message("Hello")]
[TransferToQueue("Sales")]  // Can't have two actions on one method
public partial void InvalidCombo();
// Analyzer: SWB003 - Multiple action attributes not allowed

// ✅ Correct usage
[TransferToQueue("Sales")]
public partial void Transfer();
```

### Runtime Validation

Configuration validates at runtime:

```csharp
[ContactFlow("ValidatedFlow")]
public partial class ValidatedFlow
{
    [Message(ConfigKey = "welcomeMessage")]
    [ValidateLength(MinLength = 1, MaxLength = 1000)]
    public partial void Welcome();

    [TransferToQueue(ConfigKey = "queue")]
    [ValidateQueue]  // Ensures queue exists
    public partial void Transfer();
}
```

## Best Practices

### 1. Use Descriptive Method Names

```csharp
// ✅ Good: Clear intent
[Message("Welcome")]
public partial void WelcomeCustomer();

[GetUserInput("Press 1 for sales")]
public partial void GetMainMenuSelection();

// ❌ Bad: Unclear
[Message("Welcome")]
public partial void Action1();
```

### 2. Combine Related Attributes

```csharp
// ✅ Good: Related attributes together
[ContactFlow("SalesFlow")]
[Queue("SalesQueue", MaxContacts = 50)]
[HoursOfOperation("BusinessHours")]
public partial class SalesFlow
{
    // ...
}
```

### 3. Use Constants for Reusable Values

```csharp
public static class FlowConstants
{
    public const string SalesQueue = "SalesQueue";
    public const string SupportQueue = "SupportQueue";
    public const int DefaultTimeout = 300;
}

[ContactFlow("MainFlow")]
public partial class MainFlow
{
    [TransferToQueue(FlowConstants.SalesQueue, Timeout = FlowConstants.DefaultTimeout)]
    public partial void TransferToSales();
}
```

### 4. Document Complex Flows

```csharp
/// <summary>
/// VIP customer flow with priority routing and authentication.
/// </summary>
/// <remarks>
/// This flow:
/// 1. Authenticates customer via PIN
/// 2. Checks VIP status
/// 3. Routes to priority queue if VIP
/// 4. Falls back to standard queue otherwise
/// </remarks>
[ContactFlow("VIPFlow")]
public partial class VipFlow
{
    // ...
}
```

### 5. Keep Flows Focused

```csharp
// ✅ Good: Single responsibility
[ContactFlow("Authentication")]
public partial class AuthenticationFlow
{
    [GetUserInput("Enter PIN", MaxDigits = 4)]
    public partial void GetPin();

    [InvokeLambda("ValidatePin")]
    public partial void ValidatePin();
}

[ContactFlow("Routing")]
public partial class RoutingFlow
{
    [CheckAttribute("CustomerType", CompareType.Equals, "VIP")]
    public partial void CheckVipStatus();

    [TransferToQueue("VIPQueue")]
    public partial void RouteVip();
}

// ❌ Bad: Too many responsibilities
[ContactFlow("MonolithFlow")]
public partial class MonolithFlow
{
    // 50+ actions doing everything
}
```

## Attribute Reference Summary

| Attribute           | Purpose            | Key Parameters                 |
| ------------------- | ------------------ | ------------------------------ |
| `[ContactFlow]`     | Define flow        | Name, Description, Type        |
| `[Queue]`           | Define queue       | Name, MaxContacts, Timeout     |
| `[Message]`         | Play TTS           | Text, Voice, ConfigKey         |
| `[TransferToQueue]` | Transfer to queue  | QueueName, Timeout             |
| `[GetUserInput]`    | Get DTMF/voice     | Prompt, MaxDigits, Timeout     |
| `[InvokeLambda]`    | Invoke Lambda      | FunctionArn, Timeout           |
| `[CheckHours]`      | Check hours        | HoursName, OnHours, AfterHours |
| `[CheckAttribute]`  | Check attribute    | Attribute, CompareType, Value  |
| `[SetAttribute]`    | Set attribute      | Key, Value                     |
| `[PlayPrompt]`      | Play audio         | PromptUri, ConfigKey           |
| `[Disconnect]`      | End call           | None                           |
| `[Order]`           | Explicit ordering  | Order number                   |
| `[Branch]`          | Conditional branch | Condition, Target              |

## Next Steps

- **[Flow Basics](/guide/flows/basics)** - Build flows using attributes
- **[Source Generators](/guide/advanced/source-generators)** - How attributes generate code
- **[Roslyn Analyzers](/guide/advanced/analyzers)** - Compile-time validation
- **[Reference: Attributes](/reference/attributes)** - Complete attribute reference

## Related Examples

- [Single-File Setup](/examples/single-file-setup) - Minimal attribute example
- [Enterprise (Attributes)](/examples/enterprise-attributes) - Production attribute usage
- [Authentication Flow](/examples/flows/authentication) - Complex attribute pattern
