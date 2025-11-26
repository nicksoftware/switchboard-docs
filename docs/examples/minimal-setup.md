# Minimal Setup Examples

::: warning ALPHA RELEASE
These examples use Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

Simple, focused examples to get started quickly. Each example shows the absolute minimum code needed.

## Example 1: Single Queue with Welcome Message

**What it does**: Creates a Connect instance, one queue, and a simple flow that welcomes callers and transfers to queue.

### Complete Code

```csharp
// Program.cs
using Amazon.CDK;
using Microsoft.Extensions.Hosting;
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "SimpleCallCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

```csharp
// SimpleFlow.cs
using Switchboard;
using Switchboard.Attributes;

[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome! Connecting you to our team.")]
    public partial void Welcome();

    [Action(Order = 2)]
    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

### Deploy

```bash
dotnet new console -n SimpleCallCenter -f net10.0
cd SimpleCallCenter
dotnet add package NickSoftware.Switchboard --prerelease

# Add the files above

# Create cdk.json
echo '{"app":"dotnet run"}' > cdk.json

cdk deploy
```

**Result**: A working call center with one queue and welcome flow.

---

## Example 2: IVR Menu (Press 1 or 2)

**What it does**: Simple menu - press 1 for Sales, press 2 for Support.

```csharp
[ContactFlow("MainMenu")]
public partial class MainMenuFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to our call center")]
    public partial void Welcome();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Text("For sales, press 1. For support, press 2.")]
    [MaxDigits(1)]
    [Timeout(5)]
    public partial Task<string> GetChoice();

    [Action(Order = 3)]
    [Branch(nameof(GetChoice))]
    public partial void RouteCall()
    {
        OnDigit("1", () => TransferToQueue("Sales"));
        OnDigit("2", () => TransferToQueue("Support"));
        OnTimeout(() => PlayMessage("No input received") + TransferToQueue("Support"));
    }
}
```

**Result**: Callers can select between two queues.

---

## Example 3: Business Hours Check

**What it does**: Route to queue during business hours, play closed message after hours.

```csharp
[ContactFlow("BusinessHoursFlow")]
public partial class BusinessHoursFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Thank you for calling")]
    public partial void Welcome();

    [Action(Order = 2)]
    [CheckHoursOfOperation("BusinessHours")]
    public partial void CheckHours()
    {
        OnOpen(() => TransferToQueue("Support"));
        OnClosed(() => PlayClosedMessage());
    }

    [Action(Order = 3)]
    [Sequence]
    public partial void PlayClosedMessage()
    {
        PlayMessage("We are currently closed. Please call back during business hours.");
        Disconnect();
    }
}
```

**Result**: Smart routing based on time of day.

---

## Example 4: Customer Authentication

**What it does**: Ask for account number, validate via Lambda, transfer to appropriate queue.

```csharp
[ContactFlow("AuthFlow")]
public partial class AuthFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Please enter your account number")]
    public partial void Prompt();

    [Action(Order = 2)]
    [GetCustomerInput]
    [AttributeName("AccountNumber")]
    [MaxDigits(10)]
    [EncryptInput(true)]
    public partial Task<string> GetAccountNumber();

    [Action(Order = 3)]
    [InvokeLambda("ValidateAccount")]
    [InputParameter("accountNumber", AttributeRef = "AccountNumber")]
    public partial Task<ValidationResult> Validate();

    [Action(Order = 4)]
    [Branch(nameof(Validate))]
    public partial void HandleResult()
    {
        OnSuccess(() => WelcomeCustomer());
        OnError(() => TransferToAgent());
    }

    [Action(Order = 5)]
    [Message("Welcome back! Connecting you now.")]
    public partial void WelcomeCustomer();
}
```

**Lambda Function** (minimal):

```csharp
// ValidateAccountFunction/Function.cs
public class Function
{
    public async Task<ValidationResult> FunctionHandler(
        ConnectLambdaRequest request,
        ILambdaContext context)
    {
        var accountNumber = request.Parameters["accountNumber"].ToString();

        // Simple validation - in real app, check database
        var isValid = accountNumber.Length == 10 && accountNumber.All(char.IsDigit);

        return new ValidationResult
        {
            IsValid = isValid,
            CustomerName = isValid ? "John Doe" : null
        };
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string CustomerName { get; set; }
}
```

**Result**: Secure customer authentication with Lambda.

---

## Example 5: Callback Flow

**What it does**: Offer callback instead of waiting in queue.

```csharp
[ContactFlow("CallbackFlow")]
public partial class CallbackFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("All agents are busy")]
    public partial void BusyMessage();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Text("Press 1 for a callback, or press 2 to continue waiting")]
    [MaxDigits(1)]
    public partial Task<string> GetChoice();

    [Action(Order = 3)]
    [Branch(nameof(GetChoice))]
    public partial void HandleChoice()
    {
        OnDigit("1", () => SetupCallback());
        OnDigit("2", () => TransferToQueue("Support"));
    }

    [Action(Order = 4)]
    [Sequence]
    public partial void SetupCallback()
    {
        InvokeLambda("CreateCallback", input: new
        {
            phoneNumber = SystemAttribute("CustomerEndpoint.Address"),
            queueName = "Support"
        });

        PlayMessage("Your callback has been scheduled. Thank you!");
        Disconnect();
    }
}
```

**Result**: Better customer experience with callbacks.

---

## Example 6: Multi-Language Support

**What it does**: Let customers choose their language.

```csharp
[ContactFlow("LanguageSelection")]
public partial class LanguageSelectionFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput]
    [Text("For English, press 1. Para español, oprima 2.")]
    [MaxDigits(1)]
    public partial Task<string> GetLanguage();

    [Action(Order = 2)]
    [Branch(nameof(GetLanguage))]
    public partial void RouteByLanguage()
    {
        OnDigit("1", () => SetEnglish());
        OnDigit("2", () => SetSpanish());
    }

    [Action(Order = 3)]
    [Sequence]
    public partial void SetEnglish()
    {
        SetContactAttribute("Language", "English");
        TransferToQueue("EnglishSupport");
    }

    [Action(Order = 4)]
    [Sequence]
    public partial void SetSpanish()
    {
        SetContactAttribute("Language", "Spanish");
        TransferToQueue("SpanishSupport");
    }
}
```

**Result**: Multi-language call routing.

---

## Example 7: Voicemail Flow

**What it does**: Record voicemail after hours.

```csharp
[ContactFlow("VoicemailFlow")]
public partial class VoicemailFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Please leave a message after the tone")]
    public partial void Instructions();

    [Action(Order = 2)]
    [SetWorkingQueue("VoicemailQueue")]
    public partial void SetQueue();

    [Action(Order = 3)]
    [StartMediaStreaming]  // Or appropriate voicemail action
    public partial void RecordMessage();

    [Action(Order = 4)]
    [Message("Thank you. We will contact you soon. Goodbye.")]
    public partial void ThankYou();

    [Action(Order = 5)]
    [Disconnect]
    public partial void End();
}
```

**Result**: Automated voicemail system.

---

## Example 8: Complete Minimal Project Structure

Here's the recommended file structure for a minimal project:

```
MyCallCenter/
├── Program.cs                  # CDK entry point
├── Flows/
│   └── WelcomeFlow.cs         # Your contact flows
├── Lambdas/                   # Optional Lambda functions
│   └── ValidateAccount/
│       ├── Function.cs
│       └── Function.csproj
├── cdk.json                   # CDK configuration
├── appsettings.json           # App configuration
└── MyCallCenter.csproj
```

**Program.cs**:

```csharp
using Amazon.CDK;
using Microsoft.Extensions.Hosting;
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = builder.Configuration["Connect:InstanceName"];
    options.Region = builder.Configuration["Connect:Region"];
})
.AddFlowDefinitions(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

**appsettings.json**:

```json
{
  "Connect": {
    "InstanceName": "MyCallCenter",
    "Region": "us-east-1"
  }
}
```

**cdk.json**:

```json
{
  "app": "dotnet run",
  "context": {
    "@aws-cdk/core:checkSecretUsage": true
  }
}
```

---

## Comparison: Minimal vs Production

| Feature             | Minimal Setup      | Production Setup                 |
| ------------------- | ------------------ | -------------------------------- |
| **Files**           | 3-5 files          | 20+ files                        |
| **Configuration**   | Hardcoded          | appsettings.json + env vars      |
| **Flows**           | 1-2 flows          | 10+ flows with modules           |
| **Queues**          | 1-2 queues         | Multiple with routing profiles   |
| **Lambda**          | Optional           | Multiple for business logic      |
| **Monitoring**      | Default CloudWatch | Custom dashboards + alarms       |
| **Security**        | Basic              | VPC, encryption, least privilege |
| **CI/CD**           | Manual deployment  | GitHub Actions pipeline          |
| **Deployment Time** | 5 minutes          | 1-2 hours setup                  |

## When to Use Each

### Use Minimal Setup When:

- ✅ Learning the framework
- ✅ Prototyping
- ✅ Simple use cases (1-2 queues)
- ✅ Internal testing
- ✅ Development environment

### Use Production Setup When:

- ✅ Customer-facing deployment
- ✅ Multiple environments (dev/staging/prod)
- ✅ Complex routing logic
- ✅ Compliance requirements
- ✅ High availability needed

## Next Steps

- **Going to Production?** → See [Enterprise (Attributes)](/examples/enterprise-attributes) or [Enterprise (Fluent)](/examples/enterprise-fluent)
- **Need More Flows?** → Check [Single File Setup](/examples/single-file-setup) for more patterns
- **Advanced Features?** → Read [Framework Patterns](/guide/patterns)
