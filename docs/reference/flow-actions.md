# Flow Actions Reference

::: warning ALPHA RELEASE - API Documentation in Progress
Switchboard is currently in **preview** (v0.1.0-preview.17). Comprehensive flow action documentation is being developed and will be available in upcoming releases.
:::

This reference documents the available flow actions you can use when building contact flows.

## Quick Reference

For working examples, see:
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
var flow = new FlowBuilder()
    .SetName("Greeting")
    .PlayPrompt("Thank you for calling. Please wait while we connect you.")
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
var flow = new FlowBuilder()
    .SetName("GetInput")
    .GetCustomerInput("Enter your account number", input =>
    {
        input.MaxDigits = 10;
        input.TimeoutSeconds = 10;
        input.EncryptInput = true;
    })
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
var flow = new FlowBuilder()
    .SetName("TransferFlow")
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
var flow = new FlowBuilder()
    .SetName("Goodbye")
    .PlayPrompt("Thank you for calling. Goodbye.")
    .Disconnect()
    .Build();
```

---

### Branch()

Adds conditional branching logic. Branches route to **action identifiers**, not nested flows.

```csharp
.Branch(branch =>
{
    branch.Case("1", "sales-action");
    branch.Case("2", "support-action");
    branch.Otherwise("default-action");
})
```

**Parameters:**
- `configure` (`Action<BranchBuilder>`) - Branch configuration callback
- `identifier` (string, optional) - Custom action ID

**BranchBuilder Methods:**
- `Case(value, targetActionId, operator)` - Compare input against a value
- `When(expression, targetActionId, operator)` - Evaluate complex expression
- `Otherwise(defaultActionId)` - Set fallback action ID

**Example: Simple Menu Routing**
```csharp
var flow = new FlowBuilder()
    .SetName("Menu")
    .GetCustomerInput("Press 1 for sales, 2 for support", input => {
        input.MaxDigits = 1;
        input.TimeoutSeconds = 10;
    })
    .Branch(branch =>
    {
        branch.Case("1", "sales-transfer");
        branch.Case("2", "support-transfer");
        branch.Otherwise("invalid-input");
    })
    // Define sales path
    .PlayPrompt("Transferring to sales", "sales-transfer")
    .TransferToQueue("Sales")
    // Define support path
    .PlayPrompt("Transferring to support", "support-transfer")
    .TransferToQueue("Support")
    // Define invalid path
    .PlayPrompt("Invalid selection", "invalid-input")
    .Disconnect()
    .Build();
```

**Example: Complex Condition**
```csharp
var flow = new FlowBuilder()
    .SetName("VIPRouting")
    .InvokeLambda("GetCustomerTier")
    .Branch(branch =>
    {
        branch.When("$.customer.tier == \"vip\"", "vip-path");
        branch.When("$.customer.tier == \"premium\"", "premium-path");
        branch.Otherwise("standard-path");
    })
    // VIP path
    .SetContactAttributes(attrs => { attrs.Add("tier", "vip"); }, "vip-path")
    .PlayPrompt("Welcome, VIP customer")
    .TransferToQueue("VIPSupport")
    // Premium path
    .PlayPrompt("Welcome, premium customer", "premium-path")
    .TransferToQueue("PremiumSupport")
    // Standard path
    .PlayPrompt("Welcome", "standard-path")
    .TransferToQueue("StandardSupport")
    .Build();
```

**Note**: Branches point to action identifiers using the `identifier` parameter. Actions are defined linearly in the flow, and branches create routing logic between them.

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
var flow = new FlowBuilder()
    .SetName("HoursCheck")
    .PlayPrompt("Thank you for calling")
    .CheckHoursOfOperation("BusinessHours")
    // Future: .OnOpen() and .OnClosed() methods
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
var flow = new FlowBuilder()
    .SetName("LookupFlow")
    .InvokeLambda("CustomerLookup", lambda =>
    {
        lambda.TimeoutSeconds = 8;
    })
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
var flow = new FlowBuilder()
    .SetName("SetAttributes")
    .SetContactAttributes(attrs =>
    {
        attrs["Source"] = "WebChat";
        attrs["Campaign"] = "Summer2024";
        attrs["Region"] = "US-East";
    })
    .Build();
```

---

## Flow Configuration

### SetName()

Sets the flow name (required).

```csharp
.SetName("MyContactFlow")
```

**Example:**
```csharp
var flow = new FlowBuilder()
    .SetName("CustomerSupportFlow")
    .PlayPrompt("Welcome")
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
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .SetDescription("Primary IVR menu for all incoming calls")
    .PlayPrompt("Welcome")
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
var flow = new FlowBuilder()
    .SetName("HoldMusic")
    .SetType(FlowType.CustomerHoldFlow)
    .PlayPrompt("Please continue to hold")
    .Build();
```

---

### AddTag()

Adds a tag to the flow resource.

```csharp
.AddTag("Department", "Sales")
```

**Example:**
```csharp
var flow = new FlowBuilder()
    .SetName("SalesFlow")
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
var flow = new FlowBuilder()
    .SetName("SimpleTransfer")
    .PlayPrompt("Thank you for calling. Transferring you now.")
    .TransferToQueue("CustomerService")
    .Build();
```

### Pattern: IVR Menu

```csharp
var flow = new FlowBuilder()
    .SetName("IVRMenu")
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
var flow = new FlowBuilder()
    .SetName("HoursAwareFlow")
    .PlayPrompt("Thank you for calling")
    .CheckHoursOfOperation("BusinessHours")
    // Future: Route based on open/closed status
    .Build();
```

### Pattern: Lambda Integration

```csharp
var flow = new FlowBuilder()
    .SetName("CustomerLookup")
    .PlayPrompt("Please wait while we retrieve your information")
    .InvokeLambda("GetCustomerData", lambda =>
    {
        lambda.TimeoutSeconds = 5;
    })
    .SetContactAttributes(attrs =>
    {
        attrs["CustomerFound"] = "true";
    })
    .TransferToQueue("VIPSupport")
    .Build();
```

### Pattern: Multi-Step Flow

```csharp
var flow = new FlowBuilder()
    .SetName("MultiStepFlow")
    .PlayPrompt("Welcome to our contact center")
    .CheckHoursOfOperation("BusinessHours")
    .GetCustomerInput("Press 1 to continue")
    .InvokeLambda("ProcessInput")
    .SetContactAttributes(attrs =>
    {
        attrs["ProcessedAt"] = DateTime.UtcNow.ToString();
    })
    .TransferToQueue("ProcessedQueue")
    .Build();
```

---

## Comparison Operators

Used with `Branch()` `When()` method for complex conditions:

| Operator | Description | Example |
|----------|-------------|---------|
| `Equals` | Equals (==) | Customer type equals "VIP" |
| `NotEquals` | Not equals (!=) | Status not equals "Active" |
| `GreaterThan` | Greater than (>) | Balance > 1000 |
| `LessThan` | Less than (&lt;) | Age &lt; 21 |
| `GreaterThanOrEqual` | Greater than or equal (>=) | Score >= 80 |
| `LessThanOrEqual` | Less than or equal (&lt;=) | Wait time &lt;= 300 |
| `Contains` | Contains substring | Email contains "@gmail.com" |
| `StartsWith` | Starts with | Phone starts with "+1" |
| `EndsWith` | Ends with | Username ends with ".admin" |

**Example:**
```csharp
.Branch(branch =>
{
    branch.When("$.CustomerBalance", "high-value", ComparisonOperator.GreaterThan);
    branch.When("$.Email", "gmail-user", ComparisonOperator.Contains);
    branch.Otherwise("default");
})
```

---

## Building Best Practices

### 1. Use Method Chaining

```csharp
// Good - Fluent and readable
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Support")
    .Build();

// Avoid - Verbose
var builder = new FlowBuilder();
builder.SetName("MyFlow");
builder.PlayPrompt("Welcome");
builder.TransferToQueue("Support");
var flow = builder.Build();
```

### 2. Validate Early

```csharp
var flow = new FlowBuilder()
    .SetName("ValidatedFlow")
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
var hugeFlow = new FlowBuilder()
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
- [Minimal Examples](/examples/minimal-setup.md) - Quick patterns
