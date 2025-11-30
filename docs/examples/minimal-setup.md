# Minimal Setup Examples

Simple, focused examples to get started quickly. Each example shows the absolute minimum code needed using the fluent API.

## Example 1: Single Queue with Welcome Message

**What it does**: Creates a Connect instance, one queue, and a simple flow that welcomes callers and transfers to queue.

### Complete Code

```csharp
// Program.cs
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

// Create a new Connect instance
var stack = app.CreateCallCenter("SimpleCallCenter", "simple-call-center");

// Create business hours
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Create a queue
var queue = Queue.Create("Support")
    .SetDescription("Customer support queue")
    .SetMaxContacts(50)
    .Build();
stack.AddQueue(queue, "BusinessHours");

// Create a simple welcome flow
var flow = Flow.Create("WelcomeFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome! Connecting you to our team.")
    .TransferToQueue("Support")
    .Disconnect()
    .Build();
stack.AddFlow(flow);

app.Synth();
```

### CDK

create a cdk.json file

```json
{
  "app": "dotnet run --project <PROJECT_NAME>.csproj",
  "watch": {
    "include": ["**"],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "node_modules",
      "bin",
      "obj"
    ]
  },
  "context": {
    "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
    "@aws-cdk/core:stackRelativeExports": true,
    "@aws-cdk/aws-rds:lowercaseDbIdentifier": true,
    "@aws-cdk/aws-lambda:recognizeVersionProps": true,
    "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"]
  }
}
```

### Deploy

```bash
dotnet new console -n SimpleCallCenter -f net10.0
cd SimpleCallCenter
dotnet add package NickSoftware.Switchboard

# Add the Program.cs file above

# Create cdk.json
echo '{"app":"dotnet run"}' > cdk.json

cdk deploy
```

**Result**: A working call center with one queue and welcome flow.

---

## Example 2: IVR Menu (Press 1 or 2)

**What it does**: Simple menu - press 1 for Sales, press 2 for Support.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();
var stack = app.CreateCallCenter("IVRExample", "ivr-example");

// Create hours and queues
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

var salesQueue = Queue.Create("Sales").Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = Queue.Create("Support").Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Create IVR menu flow
var flow = Flow.Create("MainMenu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our call center")
    .GetCustomerInput("For sales, press 1. For support, press 2.", input =>
    {
        input.TimeoutSeconds = 5;
    })
    .OnDigit("1", sales => sales
        .PlayPrompt("Connecting you to sales...")
        .TransferToQueue("Sales"))
    .OnDigit("2", support => support
        .PlayPrompt("Connecting you to support...")
        .TransferToQueue("Support"))
    .OnTimeout(timeout => timeout
        .PlayPrompt("No input received. Transferring to support.")
        .TransferToQueue("Support"))
    .OnError(error => error.Disconnect())
    .OnDefault(def => def.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: Callers can select between two queues.

---

## Example 3: Using an Existing Connect Instance

**What it does**: Add resources to an existing Amazon Connect instance without creating a new one.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

// Use an existing Connect instance by ARN
var stack = app.UseExistingCallCenter(
    "MyStack",
    "arn:aws:connect:us-east-1:123456789012:instance/abc-123",
    "my-existing-call-center"
);

// Add new queue to existing instance
var queue = Queue.Create("NewSalesQueue")
    .SetDescription("New sales queue")
    .SetMaxContacts(100)
    .Build();
stack.AddQueue(queue, "BusinessHours");

// Add new flow to existing instance
var flow = Flow.Create("NewFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our new service!")
    .TransferToQueue("NewSalesQueue")
    .Disconnect()
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: New resources added to your existing Connect instance.

---

## Example 4: Customer Authentication with Lambda

**What it does**: Ask for account number, validate via Lambda, transfer to appropriate queue.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();
var stack = app.CreateCallCenter("AuthExample", "auth-example");

// Create hours and queue
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

var queue = Queue.Create("Support").Build();
stack.AddQueue(queue, "BusinessHours");

// Lambda ARN for account validation
// Note: Create Lambda using AWS CDK directly, then reference the ARN here
var validateLambdaArn = "arn:aws:lambda:us-east-1:123456789012:function:validate-account";

// Create authentication flow
var flow = Flow.Create("AuthFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Please enter your account number followed by the pound key.")
    .StoreCustomerInput("Enter your account number", input =>
    {
        input.MaxDigits = 10;
        input.EncryptEntry = true;
    })
    .OnSuccess(success => success
        .InvokeLambda(validateLambdaArn, "validate-account")
        .OnSuccess(valid => valid
            .PlayPrompt("Welcome back! Connecting you to support.")
            .TransferToQueue("Support"))
        .OnError(invalid => invalid
            .PlayPrompt("Account not found. Please try again.")
            .Disconnect()))
    .OnError(error => error
        .PlayPrompt("Invalid input. Goodbye.")
        .Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: Secure customer authentication with Lambda.

---

## Example 5: Complete Setup with Fluent API

**What it does**: Demonstrates the recommended pattern for adding all resources.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();
var stack = app.CreateCallCenter("FluentExample", "fluent-example");

// Add hours of operation
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Add queues using factory methods
var salesQueue = Queue.Create("Sales")
    .SetDescription("Sales inquiries")
    .SetMaxContacts(50)
    .Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = Queue.Create("Support")
    .SetDescription("Customer support")
    .SetMaxContacts(100)
    .Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add flow with menu
var flow = Flow.Create("MainMenu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome!")
    .GetCustomerInput("Press 1 for sales, 2 for support.")
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    .OnTimeout(t => t.Disconnect())
    .OnError(e => e.Disconnect())
    .OnDefault(d => d.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: Clean, readable configuration using the fluent API.

---

## Example 6: Multi-Language Support

**What it does**: Let customers choose their language and route accordingly.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();
var stack = app.CreateCallCenter("MultiLangExample", "multilang-example");

// Create hours
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Create language-specific queues
var englishQueue = Queue.Create("EnglishSupport").Build();
stack.AddQueue(englishQueue, "BusinessHours");

var spanishQueue = Queue.Create("SpanishSupport").Build();
stack.AddQueue(spanishQueue, "BusinessHours");

// Create language selection flow
var flow = Flow.Create("LanguageSelection")
    .SetType(FlowType.ContactFlow)
    .GetCustomerInput("For English, press 1. Para espanol, oprima 2.")
    .OnDigit("1", english => english
        .SetContactAttributes(attrs => attrs["Language"] = "English")
        .PlayPrompt("Connecting you to an English-speaking agent.")
        .TransferToQueue("EnglishSupport"))
    .OnDigit("2", spanish => spanish
        .SetContactAttributes(attrs => attrs["Language"] = "Spanish")
        .PlayPrompt("Conectandole con un agente que habla espanol.")
        .TransferToQueue("SpanishSupport"))
    .OnDefault(defaultPath => defaultPath
        .PlayPrompt("Invalid selection. Connecting to English support.")
        .TransferToQueue("EnglishSupport"))
    .OnTimeout(t => t.TransferToQueue("EnglishSupport"))
    .OnError(e => e.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: Multi-language call routing.

---

## Example 7: CheckHoursOfOperation Example

**What it does**: Routes calls differently based on business hours.

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();
var stack = app.CreateCallCenter("HoursExample", "hours-example");

// Create hours and queues
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

var salesQueue = Queue.Create("Sales").Build();
stack.AddQueue(salesQueue, "BusinessHours");

// Create flow that checks business hours
var flow = Flow.Create("HoursCheckFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Thank you for calling.")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(inHours => inHours
            .PlayPrompt("We are currently open.")
            .TransferToQueue("Sales"))
        .OnOutOfHours(outOfHours => outOfHours
            .PlayPrompt("We are currently closed. Please call back during business hours.")
            .Disconnect())
        .OnError(error => error.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
```

**Result**: Callers are routed based on business hours.

---

## Example 8: Complete Minimal Project Structure

Here's the recommended file structure for a minimal project:

```
MyCallCenter/
├── Program.cs                  # CDK entry point
├── cdk.json                    # CDK configuration
├── Lambda/                     # Optional Lambda functions
│   └── ValidateAccount/
│       ├── Function.cs
│       └── Function.csproj
└── MyCallCenter.csproj
```

**Program.cs**:

```csharp
using Switchboard.Core;
using Switchboard.Flows;
using Switchboard.Resources.HoursOfOperation;
using Switchboard.Resources.Queue;

var app = new SwitchboardApp();

var stack = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Add hours of operation
var hours = HoursOfOperation
    .Create("BusinessHours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build();
stack.AddHoursOfOperation(hours);

// Add queues
var salesQueue = Queue.Create("Sales").Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = Queue.Create("Support").Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add main flow
var flow = Flow.Create("MainFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to MyCallCenter!")
    .GetCustomerInput("Press 1 for sales, 2 for support.")
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    .OnTimeout(t => t.Disconnect())
    .OnError(e => e.Disconnect())
    .OnDefault(d => d.Disconnect())
    .Build();
stack.AddFlow(flow);

app.Synth();
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

| Feature             | Minimal Setup | Production Setup               |
| ------------------- | ------------- | ------------------------------ |
| **Files**           | 2-3 files     | 10+ files                      |
| **Configuration**   | Hardcoded     | Environment-based              |
| **Flows**           | 1-2 flows     | Multiple flows                 |
| **Queues**          | 1-2 queues    | Multiple with routing profiles |
| **Lambda**          | Optional      | Multiple for business logic    |
| **Deployment Time** | 5 minutes     | 30+ minutes setup              |

## When to Use Each

### Use Minimal Setup When:

- Learning the framework
- Prototyping
- Simple use cases (1-2 queues)
- Internal testing
- Development environment

### Use Production Setup When:

- Customer-facing deployment
- Multiple environments (dev/staging/prod)
- Complex routing logic
- High availability needed

## Next Steps

- **Need More Patterns?** → Check [Flow Patterns](/guide/flows/basics)
- **Advanced Features?** → Read [Framework Patterns](/guide/patterns)
- **Full Example?** → See the [SimpleCallCenter](/examples/simple-call-center) project
