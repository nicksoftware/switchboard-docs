# Framework Usage Patterns

Common patterns and best practices for building contact centers with Switchboard.

## Overview

This guide shows practical patterns for organizing and building your contact center infrastructure with Switchboard. These are real-world patterns you'll use every day, not academic design patterns.

---

## Attribute-Based Flow Definition

Define contact flows declaratively using C# attributes. The framework generates implementation code automatically via source generators.

### When to Use

- You prefer declarative, minimal-code approaches
- Flows have a relatively static structure
- You want compile-time validation via Roslyn analyzers
- You prefer letting the framework handle boilerplate

### Pattern

```csharp
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to customer service")]
    public partial void Welcome();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Prompt("Press 1 for sales, 2 for support")]
    [MaxDigits(1)]
    public partial Task<string> GetMenuChoice();

    [Action(Order = 3)]
    [Branch(AttributeName = "MenuChoice")]
    [Case("1", Target = "TransferToSales")]
    [Case("2", Target = "TransferToSupport")]
    public partial void RouteCall();

    [Action(Order = 4, Id = "TransferToSales")]
    [TransferToQueue("Sales")]
    public partial void TransferToSales();

    [Action(Order = 5, Id = "TransferToSupport")]
    [TransferToQueue("Support")]
    public partial void TransferToSupport();
}
```

### Benefits

- ✅ Minimal code required
- ✅ Source generator creates everything
- ✅ Compile-time validation via analyzers
- ✅ Easy to read and maintain

### Trade-offs

- ⚠️ Less flexible for dynamic scenarios
- ⚠️ Relies on source generator magic (less explicit)
- ⚠️ Static structure defined at compile-time

---

## Fluent Builder Pattern

Build contact flows programmatically using a chainable, type-safe API. Gives you full control over flow construction.

### When to Use

- You prefer imperative, programmatic approaches
- Flow structure needs to be dynamic based on runtime conditions
- You want explicit control without "magic" code generation
- You need to build flows from external configuration/databases
- Advanced scenarios requiring conditional logic

### Pattern

```csharp
public class DynamicSalesFlow
{
    private readonly IFlowBuilder _builder;
    private readonly IConfiguration _config;

    public DynamicSalesFlow(IFlowBuilder builder, IConfiguration config)
    {
        _builder = builder;
        _config = config;
    }

    public ContactFlow Build()
    {
        var flow = _builder
            .SetName("DynamicSales")
            .PlayPrompt("Welcome!");

        // Add VIP routing if enabled in config
        if (_config.GetValue<bool>("Features:VipRouting"))
        {
            flow
                .Branch("CustomerTier")
                .WhenEquals("VIP", vip => vip.TransferToQueue("VIP-Sales"))
                .Otherwise(standard => standard.TransferToQueue("Standard-Sales"));
        }
        else
        {
            flow.TransferToQueue("Sales");
        }

        return flow.Build();
    }
}
```

### Benefits

- ✅ Full programmatic control
- ✅ Can use dependency injection naturally
- ✅ Dynamic behavior based on runtime conditions
- ✅ Type-safe with IntelliSense
- ✅ Explicit code (no generated files to inspect)

### Trade-offs

- ⚠️ More verbose than attributes
- ⚠️ More boilerplate code to write
- ⚠️ Some Validations happens at runtime, not compile-time (if you use lambdas to fetch configurations in the flows etc)

---

## Hybrid Pattern (Attributes + Fluent)

**The best of both worlds.** Combine both approaches in the same flow to leverage the strengths of each.

### When to Use

- Production applications with mixed complexity
- Flows with a standard structure but some dynamic parts
- You want attributes for simple/static parts, fluent API for complex/dynamic logic
- Ideal when different team members have different preferences

### Pattern

```csharp
[ContactFlow("EnterpriseSupport")]
public partial class EnterpriseSupportFlow : FlowDefinitionBase
{
    private readonly IAuthService _authService;
    private readonly IFlowBuilder _builder;

    public EnterpriseSupportFlow(IAuthService authService, IFlowBuilder builder)
    {
        _authService = authService;
        _builder = builder;
    }

    // Simple steps use attributes
    [Action(Order = 1)]
    [Message("Welcome to enterprise support")]
    public partial void Welcome();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Prompt("Please enter your account number")]
    [MaxDigits(10)]
    [EncryptInput(true)]
    public partial Task<string> GetAccountNumber();

    // Complex authentication uses fluent builder
    [Action(Order = 3)]
    public ContactFlowAction Authenticate()
    {
        return _builder
            .InvokeLambda(_authService.ValidateAccount)
            .OnSuccess(success => success
                .SetAttribute("IsAuthenticated", "true")
                .SetAttribute("AccountType", "{{Lambda.AccountType}}"))
            .OnError(error => error
                .PlayPrompt("Authentication failed. Transferring to agent.")
                .TransferToQueue("VerificationQueue"))
            .Build();
    }

    [Action(Order = 4)]
    [TransferToQueue("EnterpriseSupport")]
    public partial void TransferToSupport();
}
```

### Benefits

- Clear and readable for simple parts
- Powerful for complex parts
- Full dependency injection support
- Best of both worlds

---

## Modular Flow Composition

Break large flows into reusable modules.

### When to Use

- Authentication logic used across multiple flows
- Business hours checks needed everywhere
- Customer verification shared between flows
- Any logic you'll reuse

### Pattern

```csharp
// Reusable authentication module
[FlowModule("Authentication")]
public partial class AuthenticationModule : FlowModuleBase
{
    [Step(Order = 1)]
    [GetCustomerInput]
    [Prompt("Enter your customer ID")]
    [MaxDigits(8)]
    public partial Task<string> GetCustomerId();

    [Step(Order = 2)]
    [InvokeLambda("ValidateCustomer")]
    [InputParameter("customerId", AttributeRef = "CustomerId")]
    [OutputAttribute("IsValid")]
    public partial Task<ValidationResult> Validate();

    [Step(Order = 3)]
    [Branch(AttributeName = "IsValid")]
    [Case("true", ExitModule = true)]
    [Case("false", Target = "Retry")]
    public partial void CheckValidation();

    [Step(Order = 4, Id = "Retry")]
    [Disconnect(Reason = "Authentication failed")]
    public partial void FailedAuth();
}

// Use the module in multiple flows
[ContactFlow("SecureSales")]
public partial class SecureSalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to secure sales")]
    public partial void Welcome();

    [Action(Order = 2)]
    [UseModule(typeof(AuthenticationModule))]
    public partial void Authenticate();

    [Action(Order = 3)]
    [TransferToQueue("Sales")]
    public partial void Transfer();
}
```

### Benefits

- DRY principle
- Consistent authentication/validation across flows
- Test modules independently
- Update in one place, affects all flows

---

## Multi-Environment Configuration

Manage different configs for dev, staging, and production.

### When to Use

- Always in production applications
- Different phone numbers per environment
- Different Lambda ARNs per environment
- Environment-specific queue settings

### Pattern

```csharp
// appsettings.Development.json
{
  "Switchboard": {
    "Environment": "Development",
    "Connect": {
      "InstanceName": "dev-call-center",
      "PhoneNumber": "+1-555-TEST-001"
    },
    "Features": {
      "VipRouting": false,
      "AdvancedAnalytics": false
    }
  }
}

// appsettings.Production.json
{
  "Switchboard": {
    "Environment": "Production",
    "Connect": {
      "InstanceName": "prod-call-center",
      "PhoneNumber": "+1-800-COMPANY"
    },
    "Features": {
      "VipRouting": true,
      "AdvancedAnalytics": true
    }
  }
}

// Program.cs
builder.Services.AddSwitchboard(options =>
{
    options.Environment = builder.Configuration["Switchboard:Environment"];
    options.InstanceName = builder.Configuration["Switchboard:Connect:InstanceName"];
})
.AddFlowDefinitions(typeof(Program).Assembly)
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.TableName = $"switchboard-config-{options.Environment}";
});
```

### Benefits

- Same code, different configs
- Easy CI/CD deployment
- Isolate dev/staging/prod
- Feature flags per environment

---

## Dynamic Runtime Configuration

Update flow behavior without redeployment.

### When to Use

- Frequently changing business hours
- Queue timeouts that need adjustment
- Promotional messages that change
- A/B testing different flows

### Pattern

```csharp
// Define flow with runtime config
[ContactFlow("ConfigurableSupport")]
public partial class ConfigurableSupportFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message(DynamicText = "WelcomeMessage")] // Loaded from DynamoDB
    public partial void Welcome();

    [Action(Order = 2)]
    [SetWorkingQueue]
    [QueueArn(Dynamic = "SupportQueueArn")] // Runtime lookup
    [TimeoutSeconds(Dynamic = "QueueTimeout")] // Configurable timeout
    public partial void SetQueue();

    [Action(Order = 3)]
    [TransferToQueue(Dynamic = "SupportQueueArn")]
    public partial void Transfer();
}

// Update config at runtime via API/CLI
await configManager.UpdateAsync("ConfigurableSupport", new
{
    WelcomeMessage = "Welcome! We're experiencing high call volume.",
    QueueTimeout = 300, // Changed from 180 to 300
    SupportQueueArn = "arn:aws:connect:us-east-1:xxx:queue/support"
});

// Next call uses new values immediately - no redeployment
```

### Benefits

- Zero-downtime updates
- Business users can change messages
- Adjust to real-time conditions
- A/B test different configurations

---

## Existing Instance Migration

Import and manage existing Amazon Connect resources.

### When to Use

- Migrating from console-managed to code-managed
- Taking over an existing contact center
- Hybrid approach (manage some resources, import others)

### Pattern

```csharp
builder.Services.AddSwitchboard(options =>
{
    // Import existing instance
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Manage flows with code, leave queues as-is
    options.ManageFlows = true;
    options.ManageQueues = false;
    options.ManageRoutingProfiles = false;
})
.ImportExistingQueues(import =>
{
    // Reference existing queues by ARN
    import.AddQueue("Sales", "arn:aws:connect:...:queue/sales");
    import.AddQueue("Support", "arn:aws:connect:...:queue/support");
});

// Now you can reference existing queues in new flows
[ContactFlow("NewManagedFlow")]
public partial class NewFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("This is a new code-managed flow")]
    public partial void Welcome();

    [Action(Order = 2)]
    [TransferToQueue("Sales")] // References imported queue
    public partial void Transfer();
}
```

### Benefits

- Gradual migration
- Don't break existing setup
- Incremental adoption
- Risk mitigation

---

## Testing Patterns

Write testable contact center code.

### Unit Testing Flows

```csharp
[Test]
public async Task SalesFlow_Should_Route_To_Correct_Queue()
{
    // Arrange
    var mockBuilder = new Mock<IFlowBuilder>();
    var flow = new SalesFlow(mockBuilder.Object);

    // Act
    var result = await flow.RouteCustomer(new CustomerContext
    {
        AccountType = "Premium"
    });

    // Assert
    result.QueueName.Should().Be("PremiumSales");
    result.Priority.Should().Be(1);
}
```

### Integration Testing with CDK

```csharp
[Test]
public void Deploy_Should_Create_All_Resources()
{
    // Arrange
    var app = new App();
    var stack = new ConnectStack(app, "TestStack");

    // Act
    var template = Template.FromStack(stack);

    // Assert
    template.ResourceCountIs("AWS::Connect::ContactFlow", 3);
    template.HasResourceProperties("AWS::Connect::Queue", new Dictionary<string, object>
    {
        ["Name"] = "Sales"
    });
}
```

---

## Summary

| Pattern               | Best For           | Code Style         | Learning Curve | Flexibility      |
| --------------------- | ------------------ | ------------------ | -------------- | ---------------- |
| **Attribute-Based**   | Declarative flows  | Minimal, generated | Easy           | Static structure |
| **Fluent Builder**    | Programmatic flows | Explicit, verbose  | Moderate       | Full control     |
| **Hybrid**            | Real-world apps    | Mixed              | Moderate       | Best of both     |
| **Modular**           | Shared logic       | Reusable           | Easy           | High             |
| **Multi-Environment** | Dev/Staging/Prod   | Config-driven      | Easy           | Medium           |
| **Dynamic Config**    | Runtime changes    | DynamoDB-backed    | Moderate       | Very High        |
| **Import Existing**   | Migration          | Incremental        | Moderate       | High             |

### Pattern Selection Guide

**Neither approach is "better" - choose based on your specific needs and preferences.**

**Choose Attribute-Based when:**

- 📝 You prefer declarative code over imperative
- ✨ You want minimal code and high readability
- 🤖 You're comfortable with source generator "magic"
- 🎯 Flow structure is mostly static
- ✅ You want compile-time validation via analyzers

**Choose Fluent Builder when:**

- 🔀 You prefer explicit, programmatic control
- ⚙️ Flow structure changes based on runtime conditions
- 🧩 You're building flows from external config/databases
- 💻 You want to see all code (no generated files)
- 🧪 You prefer testing without generated dependencies

**Choose Hybrid when:**

- 🏢 Building real-world production applications
- 📊 You have both simple and complex flows
- 💉 You want dependency injection throughout
- ✅ You want the strengths of both approaches
- 👥 Different team members prefer different styles

**Real-world usage patterns:**

- Most production apps use **all three** patterns depending on the scenario
- Simple flows: Often attribute-based for clarity
- Complex flows: Often fluent or hybrid for flexibility
- Shared logic: Modular pattern regardless of approach
- Configuration: Always use Multi-Environment + Dynamic Config

**Remember:** You can switch between approaches at any time. Start with what feels natural, refactor later if needed. Both compile to the same underlying infrastructure.
