# Flow Actions Reference

::: warning ALPHA RELEASE - API Documentation in Progress
Switchboard is currently in **preview** (v0.1.0-preview.17). Comprehensive flow action documentation is being developed and will be available in upcoming releases.
:::

This reference documents the available flow actions you can use when building contact flows.

::: tip Looking for detailed block documentation?
See the **[Flow Building Blocks Reference](/reference/building-blocks/)** for comprehensive API documentation for each flow block, including all parameters, configuration options, and examples.
:::

## Quick Reference

For working examples, see:

- **[Flow Building Blocks](/reference/building-blocks/)** - Detailed API for each block
- **[Building Flows Guide](/building/flows.md)** - Tutorial with examples
- **[Minimal Setup Examples](/examples/minimal-setup.md)** - 8 common patterns
- **[Complete Example](/building/complete-example.md)** - Full contact center

---

## Core Actions

### PlayPrompt()

Plays a text-to-speech message to the caller.

```csharp
.PlayPrompt("Welcome to our contact center")
```

**Parameters:**

- `text` (string) - The message to speak
- `identifier` (string, optional) - Custom action ID

**Example:**

```csharp
var flow = Flow.Create("Greeting")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Thank you for calling. Please wait while we connect you.")
    .Disconnect()
    .Build();
```

---

### GetCustomerInput()

Collects DTMF input from the customer.

```csharp
.GetCustomerInput("Press 1 for sales, 2 for support")
```

**Parameters:**

- `promptText` (string) - The prompt to play
- `configure` (Action, optional) - Configuration callback

**Configuration Options:**

- `MaxDigits` (int) - Maximum digits to collect (default: 1)
- `TimeoutSeconds` (int) - Timeout in seconds (default: 5)
- `EncryptInput` (bool) - Whether to encrypt input (default: false)

**Example:**

```csharp
var flow = Flow.Create("GetInput")
    .SetType(FlowType.ContactFlow)
    .GetCustomerInput("Enter your account number", input =>
    {
        input.MaxDigits = 10;
        input.TimeoutSeconds = 10;
        input.EncryptInput = true;
    })
    .OnDigit("1", d => d.TransferToQueue("Support"))
    .OnTimeout(t => t.Disconnect())
    .OnError(e => e.Disconnect())
    .OnDefault(d => d.Disconnect())
    .Build();
```

---

### TransferToQueue()

Transfers the contact to a queue.

```csharp
.TransferToQueue("CustomerSupport")
```

**Parameters:**

- `queueName` (string) - Name of the queue
- `identifier` (string, optional) - Custom action ID

**Example:**

```csharp
var flow = Flow.Create("TransferFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Transferring you now")
    .TransferToQueue("Sales")
    .Build();
```

**Note:** The queue must be added to the stack before the flow references it.

---

### Disconnect()

Ends the contact (hangs up).

```csharp
.Disconnect()
```

**Parameters:**

- `identifier` (string, optional) - Custom action ID

**Example:**

```csharp
var flow = Flow.Create("Goodbye")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Thank you for calling. Goodbye.")
    .Disconnect()
    .Build();
```

---

### CheckContactAttribute()

Conditionally routes based on contact attribute values.

```csharp
.CheckContactAttribute(check =>
{
    check.Attribute(Attributes.External("StatusCode"))
        .Equals("200", success => success.TransferToQueue("Support"))
        .Otherwise(failure => failure.Disconnect());
})
```

**Parameters:**

- `configure` (`Action<CheckContactAttributeBuilder>`) - Configuration callback

**CheckContactAttributeBuilder Methods:**

- `Attribute(attributeRef)` - Specify which attribute to check
- `Equals(value, handler)` - Branch when attribute equals value
- `Otherwise(handler)` - Default branch when no conditions match

**Example: Simple Menu Routing**

```csharp
var flow = Flow
    .Create("Menu")
    .SetType(FlowType.ContactFlow)
    .GetCustomerInput("Press 1 for sales, 2 for support", input => {
        input.MaxDigits = 1;
        input.TimeoutSeconds = 10;
    })
    .OnDigit("1", sales => sales
        .PlayPrompt("Transferring to sales")
        .TransferToQueue("Sales"))
    .OnDigit("2", support => support
        .PlayPrompt("Transferring to support")
        .TransferToQueue("Support"))
    .OnTimeout(t => t
        .PlayPrompt("No input received")
        .Disconnect())
    .OnError(e => e.Disconnect())
    .OnDefault(d => d
        .PlayPrompt("Invalid selection")
        .Disconnect())
    .Build();
```

**Example: Attribute-Based Routing**

```csharp
var flow = Flow.Create("CustomerRouting")
    .InvokeLambda(lambdaArn, "GetCustomerTier")
    .OnSuccess(success => success
        .CheckContactAttribute(check =>
        {
            check.Attribute(Attributes.External("CustomerTier"))
                .Equals("VIP", vip => vip
                    .PlayPrompt("Welcome, VIP customer")
                    .TransferToQueue("VIPSupport"))
                .Equals("Premium", premium => premium
                    .PlayPrompt("Welcome, premium customer")
                    .TransferToQueue("PremiumSupport"))
                .Otherwise(standard => standard
                    .PlayPrompt("Welcome")
                    .TransferToQueue("StandardSupport"));
        }))
    .OnError(error => error.Disconnect())
    .Build();
```

**Note**: Use `Attributes.External()` for Lambda response values, `Attributes.Contact()` for contact attributes, and `Attributes.System()` for system values.

---

### CheckHoursOfOperation()

Checks if current time falls within business hours.

```csharp
.CheckHoursOfOperation("BusinessHours")
```

**Parameters:**

- `hoursOfOperationName` (string) - Name of hours schedule
- `identifier` (string, optional) - Custom action ID

**Example:**

```csharp
var flow = Flow
    .Create("HoursCheck")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Thank you for calling")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(inHours => inHours
            .PlayPrompt("We are open!")
            .TransferToQueue("Support"))
        .OnOutOfHours(outOfHours => outOfHours
            .PlayPrompt("We are closed. Please call back during business hours.")
            .Disconnect())
        .OnError(error => error.Disconnect())
    .Build();
```

**Note:** The hours of operation must be added to the stack before the flow references it.

---

### InvokeLambda()

Invokes an AWS Lambda function.

```csharp
.InvokeLambda("CustomerLookup")
```

**Parameters:**

- `functionName` (string) - Lambda function name
- `configure` (Action, optional) - Configuration callback

**Configuration Options:**

- `TimeoutSeconds` (int) - Lambda timeout (default: 3)

**Example:**

```csharp
var flow = Flow
    .Create("LookupFlow")
    .SetType(FlowType.ContactFlow)
    .InvokeLambda("arn:aws:lambda:us-east-1:123456789012:function:CustomerLookup", "CustomerLookup")
    .OnSuccess(success => success
        .PlayPrompt("Customer found!")
        .TransferToQueue("VIPSupport"))
    .OnError(error => error
        .PlayPrompt("Could not retrieve customer data.")
        .Disconnect())
    .Build();
```

---

### SetContactAttributes()

Sets custom contact attributes.

```csharp
.SetContactAttributes(attrs =>
{
    attrs["CustomerType"] = "VIP";
    attrs["Priority"] = "High";
})
```

**Parameters:**

- `configure` (Action) - Attributes configuration callback
- `identifier` (string, optional) - Custom action ID

**Example:**

```csharp
var flow =  Flow
    .Create("SetAttributes")
    .SetType(FlowType.ContactFlow)
    .SetContactAttributes(attrs =>
    {
        attrs["Source"] = "WebChat";
        attrs["Campaign"] = "Summer2024";
        attrs["Region"] = "US-East";
    })
    .TransferToQueue("Support")
    .Build();
```

---

### StoreCustomerInput()

Securely collects customer input (like account numbers or PINs) and stores it in system attributes.

```csharp
.StoreCustomerInput("Please enter your account number")
```

**Parameters:**

- `promptText` (string) - The prompt to play
- `configure` (Action, optional) - Configuration callback

**Configuration Options:**

- `MaxDigits` (int) - Maximum digits to collect
- `InitialTimeoutSeconds` (int) - Time to wait for first digit
- `BetweenEntryTimeoutSeconds` (int) - Time between digits
- `CustomTerminatingKeypress` (string) - Key to terminate input (e.g., "#")

**Example:**

```csharp
var flow = Flow.Create("AccountEntry")
    .StoreCustomerInput("Please enter your account number followed by the hash key.", input =>
    {
        input.MaxDigits = 10;
        input.InitialTimeoutSeconds = 10;
        input.BetweenEntryTimeoutSeconds = 3;
        input.CustomTerminatingKeypress = "#";
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["EnteredAccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda(lambdaArn, "ValidateAccount"))
    .OnError(error => error
        .PlayPrompt("Invalid entry. Please try again."))
    .ThenContinue()
    .Build();
```

---

### CheckStaffingForQueue()

Checks agent availability for a specific queue.

```csharp
.CheckStaffingForQueue(queueArn, StaffingMetricType.Available)
```

**Parameters:**

- `queueArn` (string) - ARN of the queue to check
- `metricType` (StaffingMetricType) - Type of staffing check

**StaffingMetricType Options:**

- `Available` - Agents available to take calls
- `Staffed` - Agents logged in (may be busy)

**Example:**

```csharp
var flow = Flow.Create("StaffingCheck")
    .PlayPrompt("Let me check agent availability.")
    .CheckStaffingForQueue(supportQueueArn, StaffingMetricType.Available)
    .OnTrue(agentsAvailable => agentsAvailable
        .PlayPrompt("An agent is available!")
        .TransferToQueue("Support")
        .Disconnect())
    .OnFalse(noAgents => noAgents
        .PlayPrompt("All agents are currently busy.")
        .GetCustomerInput("Press 1 to wait, or 2 for a callback.")
        .OnDigit("1", wait => wait
            .TransferToQueue("Support")
            .Disconnect())
        .OnDigit("2", callback => callback
            .PlayPrompt("We will call you back.")
            .Disconnect())
        .OnDefault(d => d.Disconnect())
        .OnTimeout(t => t.Disconnect())
        .OnError(e => e.Disconnect()))
    .OnError(error => error
        .PlayPrompt("Technical difficulties.")
        .Disconnect())
    .Build();
```

---

### Loop()

Creates a retry loop with a maximum number of attempts.

```csharp
.Loop(3, loop => loop
    .WhileLooping(attempt => /* actions for each attempt */)
    .WhenDone(maxAttempts => /* actions when max reached */))
```

**Parameters:**

- `maxAttempts` (int) - Maximum number of loop iterations
- `configure` (Action) - Loop configuration callback

**Loop Methods:**

- `WhileLooping(handler)` - Actions to execute each iteration
- `WhenDone(handler)` - Actions when max attempts reached

**Example:**

```csharp
var flow = Flow.Create("RetryFlow")
    .PlayPrompt("Welcome")
    .Loop(3, mainLoop => mainLoop
        .WhileLooping(attempt => attempt
            .GetCustomerInput("Enter your PIN", input =>
            {
                input.MaxDigits = 4;
                input.TimeoutSeconds = 10;
            })
            .OnDigit("1234", correct => correct
                .PlayPrompt("PIN accepted!")
                .TransferToQueue("Support")
                .Disconnect())
            .OnTimeout(t => t.PlayPrompt("No input received."))
            .OnError(e => e.PlayPrompt("An error occurred."))
            .OnDefault(d => d.PlayPrompt("Incorrect PIN."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Goodbye.")
            .Disconnect()))
    .Disconnect()
    .Build();
```

**Note:** Use `.ThenContinue()` at the end of each loop iteration to continue to the next attempt.

---

## Flow Configuration

### SetName()

Sets the flow name (required).

```csharp
.SetName("MyContactFlow")
```

**Example:**

```csharp
var flow = Flow
    .Create("CustomerSupportFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();
```

---

### SetDescription()

Sets the flow description (optional).

```csharp
.SetDescription("Main customer support routing flow")
```

**Example:**

```csharp
var flow = Flow
    .Create("MainFlow")
    .SetDescription("Primary IVR menu for all incoming calls")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();
```

---

### SetType()

Sets the flow type.

```csharp
.SetType(FlowType.ContactFlow)
```

**Available Types:**

- `ContactFlow` - Standard contact flow (default)
- `CustomerQueueFlow` - Plays while in queue
- `CustomerHoldFlow` - Plays while on hold
- `CustomerWhisperFlow` - Plays before connecting customer
- `AgentWhisperFlow` - Plays before connecting agent
- `AgentHoldFlow` - Agent hold flow
- `OutboundWhisperFlow` - Outbound call whisper
- `AgentTransferFlow` - Agent transfer flow
- `QueueTransferFlow` - Queue transfer flow

**Example:**

```csharp
var flow = Flow.Create("HoldMusic")
    .SetType(FlowType.CustomerHoldFlow)
    .PlayPrompt("Please continue to hold")
    .Build(); // Hold flows don't require Disconnect
```

---

### AddTag()

Adds a tag to the flow resource.

```csharp
.AddTag("Department", "Sales")
```

**Example:**

```csharp
var flow = Flow
    .Create("SalesFlow")
    .AddTag("Department", "Sales")
    .AddTag("Environment", "Production")
    .AddTag("CostCenter", "CC-1234")
    .PlayPrompt("Welcome to sales")
    .Build();
```

---

## Action Patterns

### Pattern: Simple Greeting and Transfer

```csharp
var flow = Flow
    .Create("SimpleTransfer")
    .PlayPrompt("Thank you for calling. Transferring you now.")
    .TransferToQueue("CustomerService")
    .Build();
```

### Pattern: IVR Menu

```csharp
var flow = Flow
    .Create("IVRMenu")
    .PlayPrompt("Welcome to Acme Corp")
    .GetCustomerInput("Press 1 for sales, 2 for support, 3 for billing")
    .Branch(branch =>
    {
        branch.Case("1", "sales-action");
        branch.Case("2", "support-action");
        branch.Case("3", "billing-action");
        branch.Otherwise("invalid-action");
    })
    .Build();
```

### Pattern: Business Hours Check

```csharp
var flow = Flow.Create("HoursAwareFlow")
    .PlayPrompt("Thank you for calling")
    .CheckHoursOfOperation(hoursOfOperationArn)
    .OnInHours(inHours => inHours
        .PlayPrompt("We are currently open")
        .TransferToQueue("Support")
        .Disconnect())
    .OnOutOfHours(afterHours => afterHours
        .PlayPrompt("We are currently closed. Please call back during business hours.")
        .Disconnect())
    .OnError(error => error.Disconnect())
    .Build();
```

### Pattern: Lambda Integration

```csharp
var flow = Flow.Create("CustomerLookup")
    .PlayPrompt("Please wait while we retrieve your information")
    .InvokeLambda(lambdaArn, "GetCustomerData", lambda =>
    {
        lambda.TimeoutSeconds = 8;
        lambda.InputParameters["Action"] = "LOOKUP";
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["CustomerName"] = Attributes.External("CustomerName");
        })
        .TransferToQueue("VIPSupport")
        .Disconnect())
    .OnError(error => error
        .PlayPrompt("Unable to retrieve your information")
        .Disconnect())
    .Build();
```

### Pattern: Multi-Step Flow with Loop

```csharp
var flow = Flow.Create("MultiStepFlow")
    .PlayPrompt("Welcome to our contact center")
    .Loop(3, mainLoop => mainLoop
        .WhileLooping(attempt => attempt
            .GetCustomerInput("Press 1 for sales, 2 for support")
            .OnDigit("1", sales => sales
                .TransferToQueue("Sales")
                .Disconnect())
            .OnDigit("2", support => support
                .TransferToQueue("Support")
                .Disconnect())
            .OnTimeout(t => t.PlayPrompt("No input received"))
            .OnError(e => e.PlayPrompt("An error occurred"))
            .OnDefault(d => d.PlayPrompt("Invalid selection"))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Goodbye.")
            .Disconnect()))
    .Disconnect()
    .Build();
```

---

## Building Best Practices

### 1. Use Method Chaining

```csharp
// Good - Fluent and readable
var flow = Flow.Create("MyFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Support")
    .Build();

// Avoid - Verbose
var builder = Flow.Create("MyFlow");
builder.PlayPrompt("Welcome");
builder.TransferToQueue("Support");
var flow = builder.Build();
```

### 2. Validate Early

```csharp
var flow = Flow.Create("ValidatedFlow")
    .PlayPrompt("Welcome")
    .Build(); // Throws if invalid

flow.Validate(); // Additional validation
```

### 3. Use Descriptive Names

```csharp
// Good
.PlayPrompt("Welcome to customer support", "greeting-message")

// Avoid
.PlayPrompt("Hi", "msg1")
```

### 4. Keep Flows Focused

```csharp
// Good - Separate focused flows
var mainMenu = CreateMainMenuFlow();
var salesFlow = CreateSalesFlow();
var supportFlow = CreateSupportFlow();

// Avoid - One massive flow
var hugeFlow = Flow.Create("HugeFlow")
    // 100+ lines of actions...
    .Build();
```

---

## Future Enhancements

Planned for upcoming releases:

- **More Flow Actions**: Additional Amazon Connect flow block types
- **Enhanced Lambda Integration**: Input/output parameter mapping
- **Flow Modules**: Reusable flow components
- **Flow Testing**: Unit test support for flows
- **Visual Flow Editor**: GUI for flow building

---

## Related

- [Building Flows Guide](/building/flows.md) - Complete tutorial
- [Complete Example](/building/complete-example.md) - Full contact center
- [SwitchboardStack Reference](/reference/stack.md) - Stack methods
- [Minimal Examples](https://nicksoftware.github.io/switchboard-docs/examples/minimal-setup.html) - Quick patterns
