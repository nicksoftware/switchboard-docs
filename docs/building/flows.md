# Building Contact Flows

::: tip Looking for API Reference?
For detailed documentation of each flow block (PlayPrompt, GetCustomerInput, InvokeLambda, etc.), see the **[Flow Building Blocks Reference](/reference/building-blocks/)**.
:::

## What is a Contact Flow?

A **contact flow** is like a roadmap for customer phone calls. It tells Amazon Connect what to do when someone calls your contact center - should they hear a greeting? Get routed to a queue? Talk to an agent? Press buttons to navigate a menu?

Think of it as a flowchart that handles incoming calls automatically. Just like a choose-your-own-adventure book, a contact flow guides callers through different paths based on their choices and your business logic.

### Real-World Examples

- **Simple Greeting Flow**: "Thank you for calling. Transferring you to an agent..." → Sends caller to a queue
- **IVR Menu Flow**: "Press 1 for Sales, 2 for Support..." → Routes based on input
- **Business Hours Flow**: Checks if you're open → Routes to agents or plays after-hours message
- **Callback Flow**: Offers to call the customer back instead of waiting on hold

### When You Need Contact Flows

You'll create contact flows whenever you want to:

- Greet callers with a custom message
- Build phone menus (IVR systems)
- Route calls to different departments
- Check business hours before connecting to agents
- Collect information from callers (account numbers, choices, etc.)
- Integrate with external systems (customer databases, CRMs)

### Types of Contact Flows

Amazon Connect supports different types of flows for specific purposes:

| Flow Type                 | Purpose                                    | Example Use                           |
| ------------------------- | ------------------------------------------ | ------------------------------------- |
| **Contact Flow**          | Main inbound call flow                     | Primary phone menu, greeting, routing |
| **Customer Queue Flow**   | Plays while caller waits                   | "Your call is important to us..."     |
| **Customer Hold Flow**    | Plays when agent puts caller on hold       | Hold music                            |
| **Customer Whisper Flow** | Plays to caller before connecting to agent | "Connecting you now..."               |
| **Agent Whisper Flow**    | Plays to agent before connecting to caller | "Incoming call from Sales queue"      |
| **Agent Hold Flow**       | Plays to agent while waiting               | Agent hold music                      |
| **Outbound Whisper Flow** | For outbound calls                         | "This is a call from Acme Corp"       |
| **Agent Transfer Flow**   | Agent-to-agent transfers                   | Transfer between agents               |
| **Queue Transfer Flow**   | Queue-to-queue transfers                   | Move caller between queues            |

---

## Two Ways to Build Flows

Switchboard gives you **two approaches** to build contact flows in C#. Both create the same Amazon Connect flows - just pick the style you prefer!

### Approach 1: Fluent API (Recommended for Beginners)

The **Fluent API** approach uses method chaining to build flows step-by-step. It's great for:

- Learning contact flow concepts
- Building simple flows quickly
- Seeing the flow structure clearly in code
- Debugging flow logic

**Example:**

```csharp
var flow = Flow.Create("SimpleSalesFlow")
    .PlayPrompt("Welcome to sales!")
    .TransferToQueue("Sales")
    .Disconnect()
    .Build();
```

**Pros:**

- Easy to read and understand
- IntelliSense guides you through available actions
- No special syntax to learn
- Great for debugging

**Cons:**

- More verbose for complex flows
- No compile-time validation of flow structure

---

### Approach 2: Attributes (Advanced, Declarative)

The **Attribute-Based** approach uses C# attributes to define flows declaratively. It's great for:

- Complex multi-step flows
- Teams familiar with declarative patterns
- Compile-time validation (via source generators)
- Clean separation of flow definition and logic

**Example:**

```csharp
[ContactFlow("SimpleSalesFlow")]
public partial class SalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to sales!")]
    public partial void Welcome();

    [Action(Order = 2)]
    [TransferToQueue("Sales")]
    public partial void TransferToSales();

    [Action(Order = 3)]
    [Disconnect]
    public partial void End();
}
```

**Pros:**

- Clean, declarative syntax
- Compile-time validation (catches errors early)
- Auto-generated boilerplate code
- Great for complex flows

**Cons:**

- Requires understanding of attributes and source generators
- Steeper learning curve
- Less intuitive for beginners

**For the rest of this guide, we'll focus on the Fluent API approach.** Once you're comfortable with flow concepts, check out the [Attribute-Based Flows](/guide/flows/attribute-based) guide.

---

## Your First Flow

Let's build your first contact flow step-by-step. We'll create a simple greeting flow that welcomes callers and transfers them to a queue.

### Step 1: Set Up Your CDK Stack

First, create your CDK stack with a Connect instance:

```csharp
using Amazon.CDK;
using Switchboard;

var app = new App();
var stack = new SwitchboardStack(app, "MyFirstFlow", "my-contact-center");
```

### Step 2: Create the Flow

Build a simple flow using `FlowBuilder`:

```csharp
var flow = Flow.Create("Flow")
    .SetName("WelcomeFlow")
    .PlayPrompt("Thank you for calling. Please hold while we connect you to an agent.")
    .TransferToQueue("GeneralSupport")
    .Build();
```

**What this does:**

1. Creates a flow named "WelcomeFlow"
2. Plays a greeting message to the caller
3. Transfers the caller to the "GeneralSupport" queue

### Step 3: Create the Queue

The flow references a queue, so we need to create it:

```csharp
var queue = new QueueBuilder()
    .SetName("GeneralSupport")
    .SetMaxContacts(50)
    .Build();
```

### Step 4: Add Resources to Stack

Add the queue and flow to your stack:

```csharp
stack.AddQueue(queue);
stack.AddFlow(flow); // Must add queue before flow!
```

**Important:** Add the queue _before_ the flow because the flow references the queue.

### Step 5: Deploy

Synthesize and deploy your stack:

```csharp
app.Synth();
```

Then deploy using CDK CLI:

```bash
cdk deploy
```

### Complete Working Example

Here's the full code in one place:

```csharp
using Amazon.CDK;
using Switchboard;

var app = new App();
var stack = new SwitchboardStack(app, "MyFirstFlow", "my-contact-center");

// Create queue
var queue = new QueueBuilder()
    .SetName("GeneralSupport")
    .SetMaxContacts(50)
    .Build();

// Create flow
var flow = Flow.Create("Flow")
    .SetName("WelcomeFlow")
    .PlayPrompt("Thank you for calling. Please hold while we connect you to an agent.")
    .TransferToQueue("GeneralSupport")
    .Build();

// Add to stack
stack.AddQueue(queue);
stack.AddFlow(flow);

// Deploy
app.Synth();
```

**Congratulations!** You've built your first contact flow! When someone calls your contact center, they'll hear your greeting and be transferred to the GeneralSupport queue.

---

## Flow Actions Guide

Now let's explore the different actions you can add to your flows. Each action does something specific in the customer's call journey.

### PlayPrompt - Playing Messages

Speaks text to the caller using Amazon Polly text-to-speech.

**When to use:**

- Greeting callers
- Providing information
- Explaining menu options
- Confirming actions

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("GreetingFlow")
    .PlayPrompt("Welcome to Acme Corporation!")
    .Build();
```

**With Custom Identifier:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("GreetingFlow")
    .PlayPrompt("Welcome to Acme Corporation!", "welcome-message")
    .Build();
```

**Tips:**

- Keep messages short and clear
- Speak naturally (Amazon Polly sounds best with natural language)
- Avoid spelling out words unless necessary

---

### GetCustomerInput - Getting Caller Input

Collects DTMF input (button presses) from the caller.

**When to use:**

- Building IVR menus ("Press 1 for Sales...")
- Collecting account numbers
- Getting confirmation (Press 1 to confirm)
- Navigating options

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("MenuFlow")
    .GetCustomerInput("Press 1 for sales, 2 for support, or 3 for billing")
    .Build();
```

**Advanced Configuration:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("AccountNumberFlow")
    .GetCustomerInput("Please enter your 10-digit account number", input =>
    {
        input.MaxDigits = 10;           // Collect up to 10 digits
        input.TimeoutSeconds = 15;      // Wait 15 seconds for input
        input.EncryptInput = true;      // Encrypt sensitive data
    })
    .Build();
```

**Configuration Options:**

- `MaxDigits` - Maximum number of digits to collect (default: 1)
- `TimeoutSeconds` - How long to wait for input (default: 5)
- `EncryptInput` - Whether to encrypt the input for security (default: false)

**Tips:**

- Use short timeout (5-10 seconds) for single-digit input
- Use longer timeout (15-30 seconds) for account numbers
- Always encrypt sensitive data like account numbers or PINs

---

### TransferToQueue - Sending to Queue

Transfers the caller to a queue where they'll wait for an available agent.

**When to use:**

- Connecting callers to agents
- Routing to specific departments
- After IVR menu selection

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("TransferFlow")
    .PlayPrompt("Transferring you to our sales team")
    .TransferToQueue("Sales")
    .Build();
```

**With Custom Identifier:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("TransferFlow")
    .PlayPrompt("Transferring you to our sales team")
    .TransferToQueue("Sales", "transfer-to-sales")
    .Build();
```

**What happens:**

1. The flow automatically adds a "SetQueue" action before the transfer
2. The caller enters the specified queue
3. Queue music/announcements play while waiting
4. First available agent receives the call

**Important:** The queue must exist in your stack:

```csharp
var salesQueue = new QueueBuilder()
    .SetName("Sales")
    .Build();

stack.AddQueue(salesQueue);
stack.AddFlow(flow); // Now the flow can reference "Sales" queue
```

---

### Branch - Conditional Logic

Routes the call to different actions based on conditions or customer input.

**When to use:**

- IVR menu routing ("If they pressed 1, go here...")
- VIP customer routing
- Conditional business logic
- Different paths based on data

**Simple IVR Menu:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("MainMenu")
    .GetCustomerInput("Press 1 for sales, 2 for support, or 3 for billing")
    .Branch(branch =>
    {
        branch.Case("1", "sales-action");
        branch.Case("2", "support-action");
        branch.Case("3", "billing-action");
        branch.Otherwise("invalid-input");
    })
    .Build();
```

**Advanced Conditional Routing:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("VIPRouter")
    .InvokeLambda("CustomerLookup")
    .Branch(branch =>
    {
        branch.When(
            "$.External.CustomerType == \"VIP\"",
            "vip-queue",
            ComparisonOperator.Equals
        );
        branch.When(
            "$.External.AccountBalance > 10000",
            "premium-queue",
            ComparisonOperator.GreaterThan
        );
        branch.Otherwise("standard-queue");
    })
    .Build();
```

**Comparison Operators:**

- `Equals` - Exact match (==)
- `NotEquals` - Not equal (!=)
- `GreaterThan` - Numeric comparison (>)
- `LessThan` - Numeric comparison (<)
- `GreaterThanOrEqual` - Numeric comparison (>=)
- `LessThanOrEqual` - Numeric comparison (<=)
- `Contains` - String contains substring
- `StartsWith` - String starts with
- `EndsWith` - String ends with

---

### InvokeLambda - External Integrations

Calls an AWS Lambda function to fetch data or perform logic outside the contact flow.

**When to use:**

- Looking up customer information
- Checking account balances
- Validating input
- Integrating with CRMs or databases
- Custom business logic

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("CustomerLookup")
    .InvokeLambda("GetCustomerInfo")
    .Build();
```

**With Timeout Configuration:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("CustomerLookup")
    .InvokeLambda("GetCustomerInfo", lambda =>
    {
        lambda.TimeoutSeconds = 8; // Wait up to 8 seconds for response
    })
    .Build();
```

**What happens:**

1. Flow pauses and calls your Lambda function
2. Lambda receives contact attributes and custom parameters
3. Lambda returns data (customer info, account status, etc.)
4. Flow stores returned data in contact attributes
5. Flow continues with the Lambda response data

**Tips:**

- Keep Lambda functions fast (under 3 seconds if possible)
- Set appropriate timeouts (3-8 seconds)
- Return data in contact attributes for use later in the flow
- Handle Lambda failures gracefully (use Branch to check for errors)

---

### SetContactAttributes - Storing Data

Sets custom attributes on the contact that persist throughout the call lifecycle.

**When to use:**

- Storing customer information for later use
- Passing data between flow actions
- Tracking call metadata
- Personalizing agent experience

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("SetCustomerInfo")
    .SetContactAttributes(attrs =>
    {
        attrs["CustomerType"] = "VIP";
        attrs["Priority"] = "High";
        attrs["Source"] = "MobileApp";
    })
    .Build();
```

**After Lambda Lookup:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("EnrichCustomerData")
    .InvokeLambda("CustomerLookup")
    .SetContactAttributes(attrs =>
    {
        attrs["AccountBalance"] = "$.External.balance";
        attrs["CustomerTier"] = "$.External.tier";
        attrs["LastPurchaseDate"] = "$.External.lastPurchase";
    })
    .Build();
```

**What happens:**

- Attributes are stored on the contact record
- Available to all subsequent actions in the flow
- Visible to agents in the Contact Control Panel (CCP)
- Can be used in routing decisions
- Included in contact trace records (CTRs)

**Tips:**

- Use clear, descriptive attribute names
- Set attributes early in the flow for routing decisions
- Limit to essential data (attributes have size limits)

---

### CheckHoursOfOperation - Business Hours

Checks if the current time falls within your configured business hours.

**When to use:**

- Routing calls differently during/after business hours
- Playing after-hours messages
- Directing to voicemail when closed
- Different queues for off-hours support

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("BusinessHoursCheck")
    .CheckHoursOfOperation("MainOfficeHours")
    .Build();
```

**With Conditional Routing:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("HoursRouter")
    .CheckHoursOfOperation("BusinessHours")
    .Branch(branch =>
    {
        branch.When(
            "$.HoursOfOperation.IsOpen == true",
            "transfer-to-agents"
        );
        branch.Otherwise("after-hours-message");
    })
    .Build();
```

**Complete Example:**

```csharp
// Create business hours
var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};
hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }
});

stack.AddHoursOfOperation(hours);

// Use in flow
var flow = Flow.Create("Flow")
    .SetName("HoursCheck")
    .CheckHoursOfOperation("BusinessHours")
    .PlayPrompt("We are currently open")
    .TransferToQueue("Support")
    .Build();
```

**What happens:**

- Flow checks current time against the hours schedule
- Sets `$.HoursOfOperation.IsOpen` attribute (true/false)
- You can branch based on this attribute

**Important:** The hours of operation must be added to the stack before the flow references it.

---

### Disconnect - Ending Calls

Ends the contact (hangs up the call).

**When to use:**

- After playing a final message
- At the end of every flow path
- After completing actions that don't transfer to an agent

**Basic Example:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("AfterHoursFlow")
    .PlayPrompt("We are currently closed. Please call back during business hours.")
    .Disconnect()
    .Build();
```

**With Custom Identifier:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("AfterHoursFlow")
    .PlayPrompt("We are currently closed. Please call back during business hours.")
    .Disconnect("end-call")
    .Build();
```

**Important:** Every flow path must end with either:

- `Disconnect()` - Hangs up the call
- `TransferToQueue()` - Sends to a queue
- `TransferToFlow()` - Transfers to another flow

**Common Mistake:**

```csharp
// WRONG - Flow has no ending
var flow = Flow.Create("Flow")
    .SetName("IncompleteFlow")
    .PlayPrompt("Hello")
    .Build(); // Missing Disconnect() or Transfer!
```

**Correct:**

```csharp
// CORRECT - Flow ends properly
var flow = Flow.Create("Flow")
    .SetName("CompleteFlow")
    .PlayPrompt("Hello")
    .Disconnect()
    .Build();
```

---

## Advanced Flow Patterns

Now that you know the basic actions, let's build some real-world contact flows.

### Multi-Level IVR

A phone menu with multiple levels of options:

```csharp
var mainMenu = Flow.Create("Flow")
    .SetName("MainMenu")
    .PlayPrompt("Welcome to Acme Corporation")
    .GetCustomerInput("Press 1 for sales, 2 for support, or 3 for billing")
    .Branch(branch =>
    {
        branch.Case("1", "sales-submenu");
        branch.Case("2", "support-submenu");
        branch.Case("3", "billing-queue");
        branch.Otherwise("invalid-retry");
    })
    .Build();

var salesSubmenu = Flow.Create("Flow")
    .SetName("SalesSubmenu")
    .GetCustomerInput("Press 1 for new customers, 2 for existing customers")
    .Branch(branch =>
    {
        branch.Case("1", "new-customer-queue");
        branch.Case("2", "existing-customer-queue");
        branch.Otherwise("sales-general-queue");
    })
    .Build();
```

**Tips for Multi-Level IVRs:**

- Keep menus shallow (2-3 levels maximum)
- Limit options to 3-5 per menu
- Always provide an "other" or "operator" option
- Allow callers to go back to previous menu

---

### Callback Flows

Offer callers the option to receive a callback instead of waiting:

```csharp
var callbackFlow = Flow.Create("Flow")
    .SetName("CallbackOffer")
    .GetCustomerInput("Press 1 to hold for the next agent, or press 2 to receive a callback")
    .Branch(branch =>
    {
        branch.Case("1", "hold-in-queue");
        branch.Case("2", "schedule-callback");
        branch.Otherwise("hold-in-queue");
    })
    .Build();
```

---

### Conditional Routing Based on Customer Data

Route VIP customers differently:

```csharp
var vipRouter = Flow.Create("Flow")
    .SetName("VIPRouter")
    .PlayPrompt("Please hold while we look up your account")
    .InvokeLambda("CustomerLookup", lambda =>
    {
        lambda.TimeoutSeconds = 5;
    })
    .Branch(branch =>
    {
        // VIP customers go to priority queue
        branch.When(
            "$.External.CustomerTier == \"VIP\"",
            "vip-queue-action",
            ComparisonOperator.Equals
        );

        // High account balance customers
        branch.When(
            "$.External.AccountBalance",
            "premium-queue-action",
            ComparisonOperator.GreaterThan
        );

        // Everyone else
        branch.Otherwise("standard-queue-action");
    })
    .TransferToQueue("VIPSupport")
    .Build();
```

---

### Integration with Lambda for Personalization

Greet customers by name using Lambda lookup:

```csharp
var personalizedGreeting = Flow.Create("Flow")
    .SetName("PersonalizedGreeting")
    .InvokeLambda("GetCustomerName", lambda =>
    {
        lambda.TimeoutSeconds = 3;
    })
    .PlayPrompt("Hello $.External.CustomerName, thank you for calling")
    .TransferToQueue("Support")
    .Build();
```

**Lambda function response:**

```json
{
  "CustomerName": "John Smith",
  "AccountStatus": "Active",
  "LastContact": "2024-01-15"
}
```

---

## Common Mistakes & Troubleshooting

### Mistake 1: Missing Disconnect Action

**Problem:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("IncompleteFlow")
    .PlayPrompt("Thank you")
    .Build(); // No ending!
```

**Error:** Flow validation fails or caller hears silence.

**Solution:** Always end flows with `Disconnect()` or `TransferToQueue()`:

```csharp
var flow = Flow.Create("Flow")
    .SetName("CompleteFlow")
    .PlayPrompt("Thank you")
    .Disconnect()
    .Build();
```

---

### Mistake 2: Invalid Action Transitions

**Problem:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("BadFlow")
    .TransferToQueue("Sales")
    .PlayPrompt("This will never play") // Dead code after transfer!
    .Build();
```

**Error:** Actions after transfer are unreachable.

**Solution:** Don't add actions after `TransferToQueue()` or `Disconnect()` - they end the flow.

---

### Mistake 3: Referencing Non-Existent Queues

**Problem:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("BadFlow")
    .TransferToQueue("NonExistentQueue") // Queue doesn't exist!
    .Build();

stack.AddFlow(flow); // Fails during deployment
```

**Error:** CloudFormation deployment fails - queue not found.

**Solution:** Create the queue before referencing it:

```csharp
var queue = new QueueBuilder()
    .SetName("NonExistentQueue")
    .Build();

stack.AddQueue(queue); // Add queue first
stack.AddFlow(flow);   // Then add flow
```

---

### Mistake 4: Circular Flow References

**Problem:**

```csharp
// Flow A transfers to Flow B
var flowA = Flow.Create("Flow")
    .SetName("FlowA")
    .TransferToFlow("FlowB")
    .Build();

// Flow B transfers back to Flow A
var flowB = Flow.Create("Flow")
    .SetName("FlowB")
    .TransferToFlow("FlowA") // Circular reference!
    .Build();
```

**Error:** CloudFormation detects circular dependency.

**Solution:** Redesign flows to avoid circular transfers. Use a main menu flow as the hub.

---

### Mistake 5: Branch Without Default Case

**Problem:**

```csharp
var flow = Flow.Create("Flow")
    .SetName("IncompleteMenu")
    .GetCustomerInput("Press 1 or 2")
    .Branch(branch =>
    {
        branch.Case("1", "action-1");
        branch.Case("2", "action-2");
        // Missing Otherwise()!
    })
    .Build();
```

**Error:** If caller presses anything other than 1 or 2, flow has no path.

**Solution:** Always include `Otherwise()` for unexpected input:

```csharp
var flow = Flow.Create("Flow")
    .SetName("CompleteMenu")
    .GetCustomerInput("Press 1 or 2")
    .Branch(branch =>
    {
        branch.Case("1", "action-1");
        branch.Case("2", "action-2");
        branch.Otherwise("invalid-input"); // Handle unexpected input
    })
    .Build();
```

---

## Next Steps

Now that you understand contact flows, explore these related topics:

- **[Building Queues](/building/queues)** - Where callers wait for agents
- **[Building Routing Profiles](/building/routing-profiles)** - How agents handle calls
- **[Business Hours](/building/hours-of-operation)** - Configure open/closed schedules
- **[Complete Example](/building/complete-example)** - Put it all together

---

## Quick Reference

### Basic Flow Template

```csharp
var flow = Flow.Create("Flow")
    .SetName("FlowName")
    .SetDescription("Optional description")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome message")
    .GetCustomerInput("Menu prompt")
    .Branch(branch =>
    {
        branch.Case("1", "option-1");
        branch.Otherwise("default");
    })
    .TransferToQueue("QueueName")
    .Build();

stack.AddFlow(flow);
```

### Essential Actions Checklist

- `SetName(name)` - Required, unique flow name
- `PlayPrompt(text)` - Speak to caller
- `GetCustomerInput(prompt)` - Collect DTMF input
- `TransferToQueue(queueName)` - Send to queue
- `Branch(configure)` - Conditional routing
- `InvokeLambda(functionName)` - Call Lambda
- `SetContactAttributes(attrs)` - Store data
- `CheckHoursOfOperation(hoursName)` - Check business hours
- `Disconnect()` - End call

### Flow Deployment Checklist

- [ ] Create all referenced queues first
- [ ] Create hours of operation if needed
- [ ] Add queues to stack before flows
- [ ] Every flow path ends with Disconnect or Transfer
- [ ] Test flow logic before deploying
- [ ] Use descriptive names for debugging
- [ ] Add tags for organization

---

## Getting Help

If you run into issues:

1. Check the [Flow Blocks Reference](/reference/flow-actions) for detailed action documentation
2. Review [Complete Example](/building/complete-example) for a working contact center
3. Explore the [Examples](/examples/minimal-setup) for common patterns
4. File an issue on [GitHub](https://github.com/nicksoftware/AmazonConnectBuilderFramework)
