# Framework Usage Patterns

Common patterns and best practices for building contact centers with Switchboard.

## Overview

This guide shows practical patterns for organizing and building your contact center infrastructure with Switchboard. These are real-world patterns you'll use every day.

---

## Fluent Builder Pattern

Build contact flows programmatically using a chainable, type-safe API. This is the primary pattern for building flows in Switchboard.

### When to Use

- Building any contact flow
- Creating IVR menus with branching
- Integrating with Lambda functions
- All production use cases

### Pattern

```csharp
using Switchboard.Infrastructure;

var app = new SwitchboardApp();
var callCenter = app.CreateCallCenter("MyCallCenter", "my-call-center");

// Create a flow with fluent builder
Flow
    .Create("CustomerService")
    .SetType(FlowType.ContactFlow)
    .SetDescription("Main customer service flow")
    .PlayPrompt("Welcome to customer service")
    .GetCustomerInput("Press 1 for sales, 2 for support.", input =>
    {
        input.TimeoutSeconds = 5;
    })
    .OnDigit("1", sales => sales
        .PlayPrompt("Transferring to sales...")
        .TransferToQueue("Sales")
        .Disconnect())
    .OnDigit("2", support => support
        .PlayPrompt("Transferring to support...")
        .TransferToQueue("Support")
        .Disconnect())
    .OnDefault(defaultPath => defaultPath
        .PlayPrompt("Invalid selection.")
        .Disconnect())
    .OnTimeout(timeout => timeout
        .PlayPrompt("No input received.")
        .Disconnect())
    .Disconnect()
    .Build(callCenter);

app.Synth();
```

### Benefits

- Full programmatic control
- Type-safe with IntelliSense
- Explicit code with clear flow of execution
- Easy to read and understand
- Works with Lambda functions and branching

---

## Chained Configuration Pattern

Add all resources to a call center in a single fluent chain for clean, readable configuration.

### When to Use

- Setting up a new call center
- Adding multiple related resources
- When you want concise, readable code

### Pattern

```csharp
var app = new SwitchboardApp();
var callCenter = app.CreateCallCenter("ChainedExample", "chained-example");

callCenter
    .AddHoursOfOperation("Business Hours", h => h
        .WithTimeZone("America/New_York")
        .WithStandardBusinessHours())
    .AddQueue("Sales", "Business Hours", q => q
        .SetDescription("Sales inquiries")
        .SetMaxContacts(50))
    .AddQueue("Support", "Business Hours", q => q
        .SetDescription("Customer support")
        .SetMaxContacts(100))
    .AddFlow("MainMenu", f => f
        .SetType(FlowType.ContactFlow)
        .PlayPrompt("Welcome!")
        .GetCustomerInput("Press 1 for sales, 2 for support.")
        .OnDigit("1", sales => sales.TransferToQueue("Sales").Disconnect())
        .OnDigit("2", support => support.TransferToQueue("Support").Disconnect())
        .Disconnect());

app.Synth();
```

### Benefits

- Clean, readable code
- All resources defined in one place
- Method chaining reduces boilerplate
- Easy to see the complete configuration

---

## Existing Instance Pattern

Work with existing Amazon Connect instances without creating new ones.

### When to Use

- Migrating from console-managed to code-managed
- Adding resources to an existing contact center
- Hybrid approach (manage some resources, import others)

### Pattern

```csharp
var app = new SwitchboardApp();

// Use an existing Connect instance by ARN
var callCenter = app.UseExistingCallCenter(
    "MyStack",
    "arn:aws:connect:us-east-1:123456789012:instance/abc-123",
    "my-existing-call-center"
);

// Add new resources to your existing instance
var hours = HoursOfOperation
    .Create("Extended Hours")
    .WithTimeZone("America/New_York")
    .AddDay(DayOfWeek.Monday, "07:00", "21:00")
    .AddDay(DayOfWeek.Tuesday, "07:00", "21:00")
    .AddDay(DayOfWeek.Wednesday, "07:00", "21:00")
    .AddDay(DayOfWeek.Thursday, "07:00", "21:00")
    .AddDay(DayOfWeek.Friday, "07:00", "21:00")
    .Build(callCenter);

Queue
    .Create("NewSalesQueue")
    .SetDescription("New sales queue for expansion")
    .SetMaxContacts(100)
    .Build(callCenter, hours.HoursOfOperation.Name);

Flow
    .Create("NewFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our new service!")
    .TransferToQueue("NewSalesQueue")
    .Disconnect()
    .Build(callCenter);

app.Synth();
```

### Benefits

- Gradual migration
- Don't break existing setup
- Incremental adoption
- Risk mitigation

---

## Lambda Integration Pattern

Integrate Lambda functions for dynamic behavior like customer lookups and authentication.

### When to Use

- Customer authentication
- Database lookups
- External API calls
- Any dynamic logic in your flows

### Pattern

```csharp
var app = new SwitchboardApp();
var callCenter = app.CreateCallCenter("AuthExample", "auth-example");

// Create DynamoDB table for customer data
var accountsTable = DynamoDbTable
    .Create("customer-accounts")
    .WithPartitionKey("AccountNumber")
    .WithOnDemandBilling()
    .ExportTableName()
    .Build(callCenter);

// Create Lambda for account validation
var validateLambda = ConnectLambda
    .Create("validate-account")
    .WithCode("./Lambda/ValidateAccount/bin/Release/net8.0/publish")
    .WithDotNetHandler("ValidateAccount", "ValidateAccount.Function")
    .WithTableRead(accountsTable.Table, "ACCOUNTS_TABLE_NAME")
    .AssociateWithConnect(callCenter.InstanceId)
    .ExportArn()
    .Build(callCenter);

// Use Lambda in a flow
Flow
    .Create("AuthFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Please enter your account number.")
    .StoreCustomerInput("Enter account number", input =>
    {
        input.MaxDigits = 10;
        input.CustomTerminatingKeypress = "#";
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["AccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda(validateLambda.FunctionArn, validateLambda.FunctionName, lambda =>
        {
            lambda.InputParameters["AccountNumber"] = Attributes.Contact("AccountNumber");
        })
        .OnSuccess(valid => valid
            .PlayPrompt($"Welcome back, {Attributes.External("CustomerName")}!")
            .TransferToQueue("Support")
            .Disconnect())
        .OnError(invalid => invalid
            .PlayPrompt("Account not found.")
            .Disconnect())
        .ThenContinue())
    .OnError(error => error
        .PlayPrompt("Invalid input.")
        .Disconnect())
    .Disconnect()
    .Build(callCenter);

app.Synth();
```

### Benefits

- Dynamic customer data
- Secure PIN verification
- External system integration
- Personalized caller experience

---

## Multi-Queue Routing Pattern

Create multiple queues with different priorities and routing profiles.

### When to Use

- Different service levels (VIP, standard)
- Multiple departments
- Skills-based routing
- Overflow handling

### Pattern

```csharp
var app = new SwitchboardApp();
var callCenter = app.CreateCallCenter("MultiQueue", "multi-queue");

// Create hours of operation
var hours = HoursOfOperation
    .Create("Business Hours")
    .WithTimeZone("America/New_York")
    .WithStandardBusinessHours()
    .Build(callCenter);

// Create multiple queues
var salesQueue = Queue
    .Create("Sales")
    .SetDescription("Sales inquiries")
    .SetMaxContacts(50)
    .AddTag("Department", "Sales")
    .Build(callCenter, hours.HoursOfOperation.Name);

var supportQueue = Queue
    .Create("Support")
    .SetDescription("Technical support")
    .SetMaxContacts(100)
    .AddTag("Department", "Support")
    .Build(callCenter, hours.HoursOfOperation.Name);

var vipQueue = Queue
    .Create("VIP")
    .SetDescription("VIP customers")
    .SetMaxContacts(25)
    .AddTag("Priority", "High")
    .Build(callCenter, hours.HoursOfOperation.Name);

// Create routing profiles
RoutingProfile
    .Create("Sales-Agent")
    .SetDescription("Sales agents only")
    .SetDefaultOutboundQueue(salesQueue.QueueArn)
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue(salesQueue.QueueArn, ChannelType.Voice, priority: 1)
    .Build(callCenter);

RoutingProfile
    .Create("Support-Agent")
    .SetDescription("Support agents only")
    .SetDefaultOutboundQueue(supportQueue.QueueArn)
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue(supportQueue.QueueArn, ChannelType.Voice, priority: 1)
    .Build(callCenter);

RoutingProfile
    .Create("Multi-Skilled")
    .SetDescription("Handles all queues")
    .SetDefaultOutboundQueue(salesQueue.QueueArn)
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue(vipQueue.QueueArn, ChannelType.Voice, priority: 1)
    .AddQueue(salesQueue.QueueArn, ChannelType.Voice, priority: 2)
    .AddQueue(supportQueue.QueueArn, ChannelType.Voice, priority: 3)
    .Build(callCenter);

app.Synth();
```

### Benefits

- Flexible agent assignment
- Priority-based routing
- Skills-based distribution
- Efficient resource utilization

---

## Branching and Conditional Logic Pattern

Use branching to create complex flows with multiple paths.

### When to Use

- IVR menus
- Conditional routing based on customer input
- Authentication flows with success/failure paths
- Multi-level menus

### Pattern

```csharp
Flow
    .Create("ComplexMenu")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt("Welcome to our service center.")

    // First level menu
    .GetCustomerInput("Press 1 for billing, 2 for technical support, 3 for sales.")

    // Billing path
    .OnDigit("1", billing => billing
        .PlayPrompt("You selected billing.")
        .GetCustomerInput("Press 1 to check your balance, 2 to make a payment.")
        .OnDigit("1", balance => balance
            .PlayPrompt("Checking your balance...")
            .InvokeLambda(balanceLambda.FunctionArn, "check-balance")
            .OnSuccess(s => s
                .PlayPrompt($"Your balance is {Attributes.External("Balance")} dollars.")
                .Disconnect())
            .OnError(e => e
                .PlayPrompt("Could not retrieve balance.")
                .TransferToQueue("Billing")
                .Disconnect())
            .ThenContinue())
        .OnDigit("2", payment => payment
            .PlayPrompt("Transferring to payments...")
            .TransferToQueue("Payments")
            .Disconnect())
        .OnDefault(d => d.Disconnect())
        .OnTimeout(t => t.Disconnect()))

    // Technical support path
    .OnDigit("2", techSupport => techSupport
        .PlayPrompt("Transferring to technical support.")
        .TransferToQueue("TechSupport")
        .Disconnect())

    // Sales path
    .OnDigit("3", sales => sales
        .PlayPrompt("Transferring to sales.")
        .TransferToQueue("Sales")
        .Disconnect())

    // Default and timeout
    .OnDefault(defaultPath => defaultPath
        .PlayPrompt("Invalid selection. Goodbye.")
        .Disconnect())
    .OnTimeout(timeout => timeout
        .PlayPrompt("No input received. Goodbye.")
        .Disconnect())
    .OnError(error => error
        .PlayPrompt("An error occurred. Goodbye.")
        .Disconnect())

    .Disconnect()
    .Build(callCenter);
```

### Benefits

- Complex IVR flows
- Clear path visualization in code
- Nested menus supported
- Error handling at each level

---

## Contact Attributes Pattern

Store and retrieve contact attributes throughout the flow.

### When to Use

- Storing customer data for agent screen pop
- Passing data between flow steps
- Personalizing messages
- Tracking customer journey

### Pattern

```csharp
Flow
    .Create("AttributesExample")
    .SetType(FlowType.ContactFlow)

    // Set initial attributes
    .SetContactAttributes(attrs =>
    {
        attrs["Source"] = "MainLine";
        attrs["Priority"] = "Normal";
    })

    // Get input and store it
    .StoreCustomerInput("Enter your account number", input =>
    {
        input.MaxDigits = 10;
    })
    .OnSuccess(success => success
        // Store the input in an attribute
        .SetContactAttributes(attrs =>
        {
            attrs["AccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        // Call Lambda and use external attributes
        .InvokeLambda(lookupLambda.FunctionArn, "lookup", lambda =>
        {
            lambda.InputParameters["Account"] = Attributes.Contact("AccountNumber");
        })
        .OnSuccess(found => found
            // Store Lambda response
            .SetContactAttributes(attrs =>
            {
                attrs["CustomerName"] = Attributes.External("CustomerName");
                attrs["AccountType"] = Attributes.External("AccountType");
                attrs["Balance"] = Attributes.External("Balance");
            })
            // Use attributes in prompts
            .PlayPrompt($"Welcome {Attributes.Contact("CustomerName")}!")
            .TransferToQueue("Support")
            .Disconnect())
        .OnError(notFound => notFound.Disconnect())
        .ThenContinue())
    .OnError(error => error.Disconnect())
    .Disconnect()
    .Build(callCenter);
```

### Attribute Types

- **Contact Attributes**: `Attributes.Contact("AttributeName")` - User-defined attributes
- **System Attributes**: `Attributes.System(SystemAttributes.StoredCustomerInput)` - System values
- **External Attributes**: `Attributes.External("AttributeName")` - Lambda response values

---

## Testing Patterns

Write testable contact center code.

### Unit Testing CDK Constructs

```csharp
[Test]
public void Deploy_Should_Create_All_Resources()
{
    // Arrange
    var app = new SwitchboardApp();
    var callCenter = app.CreateCallCenter("TestStack", "test-stack");

    // Add resources
    HoursOfOperation
        .Create("Business Hours")
        .WithTimeZone("America/New_York")
        .WithStandardBusinessHours()
        .Build(callCenter);

    Queue
        .Create("Sales")
        .Build(callCenter, "Business Hours");

    // Act
    var template = Template.FromStack(callCenter);

    // Assert
    template.ResourceCountIs("AWS::Connect::Queue", 1);
    template.HasResourceProperties("AWS::Connect::Queue", new Dictionary<string, object>
    {
        ["Name"] = "Sales"
    });
}
```

### Benefits

- Test infrastructure before deployment
- Verify resource counts and properties
- CI/CD integration
- Catch configuration errors early

---

## Summary

| Pattern | Best For | Code Style | Complexity |
|---------|----------|------------|------------|
| **Fluent Builder** | All flows | Explicit, chainable | Low-Medium |
| **Chained Config** | Quick setup | Concise, readable | Low |
| **Existing Instance** | Migration | Incremental | Low |
| **Lambda Integration** | Dynamic logic | Service integration | Medium |
| **Multi-Queue** | Complex routing | Resource organization | Medium |
| **Branching** | IVR menus | Nested callbacks | Medium-High |
| **Attributes** | Data passing | Context management | Low |
| **Testing** | Quality assurance | Unit tests | Medium |

### Pattern Selection Guide

**For simple flows**: Use Fluent Builder with Chained Config

**For complex IVR**: Use Fluent Builder with Branching Pattern

**For customer data**: Combine Lambda Integration with Attributes Pattern

**For existing setups**: Use Existing Instance Pattern

**For quality**: Always include Testing Patterns

---

## Future Patterns

The following patterns are planned for future releases:

- **Attribute-Based Configuration** - Define flows declaratively with C# attributes
- **Source Generator Pattern** - Auto-generate flow implementations from attributes
- **Dynamic Runtime Configuration** - Update flow behavior via DynamoDB without redeployment
- **Modular Flow Composition** - Break large flows into reusable modules
