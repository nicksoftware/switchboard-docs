# Fluent Builders

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Fluent builders provide a programmatic, type-safe approach to building contact flows. Unlike attribute-based flows, fluent builders give you full control over flow construction through a chainable API.

## Why Use Fluent Builders?

### Advantages

- **✅ Full programmatic control** - Build flows dynamically based on runtime conditions
- **✅ Ideal for complex logic** - When flow structure depends on configuration or external data
- **✅ Explicit and testable** - Mock and test individual builder steps without generated dependencies
- **✅ No source generators** - Direct code, no generated files to inspect
- **✅ IDE support** - Full IntelliSense and type safety

### When to Use

```csharp
// ✅ Use fluent builders when:
// - Flow structure is dynamic
// - Building flows from database/config
// - Complex conditional logic
// - Programmatic flow generation
// - Migrating from other systems

// ✅ Use attributes when:
// - Flow structure is static
// - Simple, declarative flows
// - Minimal boilerplate desired
```

## Basic Usage

### Simple Flow

```csharp
using NickSoftware.Switchboard;

public class FlowDefinitions
{
    public static IContactFlow CreateWelcomeFlow()
    {
        return new FlowBuilder()
            .SetName("WelcomeFlow")
            .SetDescription("Simple welcome flow")
            .PlayPrompt("Welcome to our contact center")
            .TransferToQueue("GeneralSupport")
            .Build();
    }
}
```

### IVR Menu Flow

```csharp
public static IContactFlow CreateIvrFlow()
{
    return new FlowBuilder()
        .SetName("MainIVR")
        .PlayPrompt("Welcome to Acme Corp")
        .GetCustomerInput(input =>
        {
            input.Prompt = "For sales, press 1. For support, press 2.";
            input.MaxDigits = 1;
            input.Timeout = 5;
        })
        .OnDigit("1", sales =>
        {
            sales.PlayPrompt("Connecting you to sales")
                .TransferToQueue("Sales");
        })
        .OnDigit("2", support =>
        {
            support.PlayPrompt("Connecting you to support")
                .TransferToQueue("Support");
        })
        .OnTimeout(timeout =>
        {
            timeout.PlayPrompt("We didn't receive your input")
                .ThenLoop(maxIterations: 3);
        })
        .Build();
}
```

## FlowBuilder API

### Core Methods

#### SetName / SetDescription

```csharp
var flow = new FlowBuilder()
    .SetName("CustomerService")
    .SetDescription("Main customer service flow")
    .SetType(FlowType.ContactFlow)
    .SetTags(new Dictionary<string, string>
    {
        ["Environment"] = "Production",
        ["Team"] = "Support"
    })
    .Build();
```

#### PlayPrompt

```csharp
// Simple message
flow.PlayPrompt("Hello, customer");

// With options
flow.PlayPrompt(msg =>
{
    msg.Text = "Welcome";
    msg.Voice = "Joanna";
    msg.Language = "en-US";
});

// Dynamic from config
flow.PlayPrompt(msg =>
{
    msg.ConfigKey = "welcomeMessage";
    msg.DefaultValue = "Welcome";  // Fallback
});
```

#### TransferToQueue

```csharp
// Simple transfer
flow.PlayPrompt("Connecting you to support")
    .TransferToQueue("Support");

// With options
flow.TransferToQueue(transfer =>
{
    transfer.QueueName = "VIPSupport";
    transfer.Timeout = 300;
    transfer.Priority = QueuePriority.High;
});

// Dynamic queue
flow.TransferToQueue(transfer =>
{
    transfer.ConfigKey = "primaryQueue";
    transfer.DefaultValue = "GeneralSupport";
});
```

#### GetCustomerInput

```csharp
flow.GetCustomerInput(input =>
{
    input.Prompt = "Enter your account number";
    input.MaxDigits = 8;
    input.Timeout = 10;
    input.InputType = InputType.DTMF;
})
.OnDigits(digits =>
{
    // Process digits
    digits.SetAttribute("AccountNumber", "$");
})
.OnTimeout(timeout =>
{
    timeout.PlayPrompt("We didn't receive your input");
});
```

#### InvokeLambda

```csharp
flow.InvokeLambda(lambda =>
{
    lambda.FunctionName = "CustomerLookup";
    lambda.Timeout = 8;
    lambda.Payload = new
    {
        accountNumber = "$.Attributes.AccountNumber"
    };
})
.OnSuccess(success =>
{
    success.SetAttribute("CustomerName", "$.External.name");
    success.PlayPrompt("Hello, $.Attributes.CustomerName");
})
.OnError(error =>
{
    error.PlayPrompt("Unable to retrieve your information");
    error.TransferToQueue("Support");
});
```

#### Branch / CheckAttribute

```csharp
flow.Branch(branch =>
{
    check.AttributeName = "VIPCustomer";
    check.CompareType = CompareType.Equals;
    check.Value = "true";
})
.OnTrue(vipPath =>
{
    vipPath.PlayPrompt("Welcome, valued customer");
    vipPath.TransferToQueue("VIPSupport");
})
.OnFalse(standardPath =>
{
    standardPath.PlayPrompt("Welcome");
    standardPath.TransferToQueue("GeneralSupport");
});
```

### Branching

#### Conditional Branching

```csharp
flow.GetCustomerInput(input =>
{
    input.Prompt = "Main menu";
    input.MaxDigits = 1;
})
.OnDigit("1", branch1 =>
{
    branch1.PlayPrompt("Sales selected");
    branch1.TransferToQueue("Sales");
})
.OnDigit("2", branch2 =>
{
    branch2.PlayPrompt("Support selected");
    branch2.TransferToQueue("Support");
})
.OnDigit("3", branch3 =>
{
    branch3.PlayPrompt("Billing selected");
    branch3.TransferToQueue("Billing");
})
.OnDefault(defaultBranch =>
{
    defaultBranch.PlayPrompt("Invalid selection");
    defaultBranch.ThenLoop();
});
```

#### Multi-Level Menus

```csharp
var mainMenu = new FlowBuilder()
    .SetName("MultiLevelMenu")
    .PlayPrompt("Main menu")
    .GetCustomerInput(input => { input.Prompt = "Press 1 for sales, 2 for support"; })
    .OnDigit("1", salesMenu =>
    {
        // Sub-menu for sales
        salesMenu.PlayPrompt("Sales department")
            .GetCustomerInput(input => { input.Prompt = "Press 1 for new orders, 2 for existing orders"; })
            .OnDigit("1", newOrders =>
            {
                newOrders.TransferToQueue("NewOrders");
            })
            .OnDigit("2", existingOrders =>
            {
                existingOrders.TransferToQueue("ExistingOrders");
            });
    })
    .OnDigit("2", supportMenu =>
    {
        // Sub-menu for support
        supportMenu.PlayPrompt("Support department")
            .GetCustomerInput(input => { input.Prompt = "Press 1 for technical, 2 for billing"; })
            .OnDigit("1", tech =>
            {
                tech.TransferToQueue("TechnicalSupport");
            })
            .OnDigit("2", billing =>
            {
                billing.TransferToQueue("BillingSupport");
            });
    })
    .Build();
```

### Loops and Retries

```csharp
// Simple loop
flow.GetCustomerInput(input => { input.Prompt = "Enter PIN"; })
    .OnInvalidInput(invalid =>
    {
        invalid.PlayPrompt("Invalid PIN");
        invalid.ThenLoop(maxIterations: 3);
    });

// Retry with backoff
flow.InvokeLambda(lambda => { lambda.FunctionName = "ExternalAPI"; })
    .OnError(error =>
    {
        error.ThenRetry(retry =>
        {
            retry.MaxAttempts = 3;
            retry.BackoffRate = 2.0;  // Exponential backoff
            retry.InitialDelay = TimeSpan.FromSeconds(1);
        });
    })
    .OnMaxRetries(maxRetries =>
    {
        maxRetries.PlayPrompt("Service unavailable");
        maxRetries.ThenDisconnect();
    });
```

### Error Handling

```csharp
public static IContactFlow CreateRobustFlow()
{
    return new FlowBuilder()
        .SetName("RobustFlow")
        .TryCatch(tryBlock =>
        {
            tryBlock.InvokeLambda(lambda =>
            {
                lambda.FunctionName = "RiskyOperation";
            })
            .OnSuccess(success =>
            {
                success.PlayPrompt("Operation successful");
            });
        },
        catchBlock =>
        {
            catchBlock.PlayPrompt("An error occurred");
            catchBlock.TransferToQueue("Support");
        })
        .Build();
}
```

## Advanced Patterns

### Dynamic Flow Generation

```csharp
public class DynamicFlowGenerator
{
    public IContactFlow GenerateFlowFromConfig(FlowConfiguration config)
    {
        var builder = new FlowBuilder()
            .SetName(config.Name)
            .SetDescription(config.Description);

        // Add welcome message
        if (!string.IsNullOrEmpty(config.WelcomeMessage))
        {
            builder.PlayPrompt(config.WelcomeMessage);
        }

        // Add menu options dynamically
        if (config.MenuOptions?.Any() == true)
        {
            builder.GetCustomerInput(input =>
            {
                input.Prompt = BuildMenuPrompt(config.MenuOptions);
                input.MaxDigits = 1;
            });

            foreach (var option in config.MenuOptions)
            {
                builder.OnDigit(option.Digit, branch =>
                {
                    branch.PlayPrompt(option.Message);
                    branch.TransferToQueue(option.QueueName);
                });
            }
        }

        return builder.Build();
    }

    private string BuildMenuPrompt(List<MenuOption> options)
    {
        return string.Join(". ", options.Select(o => $"For {o.Name}, press {o.Digit}"));
    }
}
```

### Flow Composition

```csharp
public class FlowComposer
{
    public IContactFlow ComposeAuthenticatedFlow()
    {
        var authFlow = CreateAuthenticationFlow();
        var mainFlow = CreateMainFlow();

        return new FlowBuilder()
            .SetName("ComposedFlow")
            .AddSubFlow(authFlow)  // Execute auth first
            .CheckAttribute(check =>
            {
                check.AttributeName = "Authenticated";
                check.Value = "true";
            })
            .OnTrue(authenticated =>
            {
                authenticated.AddSubFlow(mainFlow);  // Then main flow
            })
            .OnFalse(notAuthenticated =>
            {
                notAuthenticated.PlayPrompt("Authentication required");
                notAuthenticated.ThenDisconnect();
            })
            .Build();
    }

    private IContactFlow CreateAuthenticationFlow()
    {
        return new FlowBuilder()
            .SetName("Authentication")
            .GetCustomerInput(input => { input.Prompt = "Enter PIN"; })
            .InvokeLambda(lambda => { lambda.FunctionName = "ValidatePin"; })
            .OnSuccess(success =>
            {
                success.SetAttribute("Authenticated", "true");
            })
            .Build();
    }

    private IContactFlow CreateMainFlow()
    {
        return new FlowBuilder()
            .SetName("MainFlow")
            .PlayPrompt("Welcome to main flow")
            .TransferToQueue("Support")
            .Build();
    }
}
```

### Middleware Pattern

```csharp
public class FlowWithMiddleware
{
    public IContactFlow CreateFlowWithLogging()
    {
        return new FlowBuilder()
            .SetName("LoggedFlow")
            .UseMiddleware<LoggingMiddleware>()
            .UseMiddleware<MetricsMiddleware>()
            .PlayPrompt("Welcome")
            .TransferToQueue("Support")
            .Build();
    }
}

public class LoggingMiddleware : IFlowMiddleware
{
    public void Apply(IFlowBuilder builder)
    {
        builder.OnActionExecuted((context, action) =>
        {
            // Log each action execution
            Console.WriteLine($"Executed: {action.Type} at {DateTime.UtcNow}");
        });
    }
}
```

### Builder Factory Pattern

```csharp
public interface IFlowFactory
{
    IContactFlow CreateFlow(string flowType);
}

public class FlowFactory : IFlowFactory
{
    public IContactFlow CreateFlow(string flowType)
    {
        return flowType switch
        {
            "sales" => CreateSalesFlow(),
            "support" => CreateSupportFlow(),
            "billing" => CreateBillingFlow(),
            _ => throw new ArgumentException($"Unknown flow type: {flowType}")
        };
    }

    private IContactFlow CreateSalesFlow()
    {
        return new FlowBuilder()
            .SetName("SalesFlow")
            .PlayPrompt("Sales department")
            .TransferToQueue("Sales")
            .Build();
    }

    private IContactFlow CreateSupportFlow()
    {
        return new FlowBuilder()
            .SetName("SupportFlow")
            .PlayPrompt("Support department")
            .TransferToQueue("Support")
            .Build();
    }

    private IContactFlow CreateBillingFlow()
    {
        return new FlowBuilder()
            .SetName("BillingFlow")
            .PlayPrompt("Billing department")
            .TransferToQueue("Billing")
            .Build();
    }
}
```

## Testing Fluent Flows

### Unit Testing

```csharp
using Xunit;
using FluentAssertions;

public class FlowBuilderTests
{
    [Fact]
    public void FlowBuilder_ShouldCreateValidFlow()
    {
        // Arrange & Act
        var flow = new FlowBuilder()
            .SetName("TestFlow")
            .PlayPrompt("Hello")
            .TransferToQueue("Support")
            .Build();

        // Assert
        flow.Name.Should().Be("TestFlow");
        flow.Actions.Should().HaveCount(2);
        flow.Actions[0].Should().BeOfType<MessageAction>();
        flow.Actions[1].Should().BeOfType<TransferToQueueAction>();
    }

    [Fact]
    public void FlowBuilder_ShouldHandleBranching()
    {
        // Arrange & Act
        var flow = new FlowBuilder()
            .SetName("BranchingFlow")
            .GetCustomerInput(input => { input.MaxDigits = 1; })
            .OnDigit("1", b => b.TransferToQueue("Sales"))
            .OnDigit("2", b => b.TransferToQueue("Support"))
            .Build();

        // Assert
        var inputAction = flow.Actions.OfType<GetUserInputAction>().First();
        inputAction.Branches.Should().HaveCount(2);
    }

    [Fact]
    public void FlowBuilder_ShouldValidateRequiredFields()
    {
        // Arrange
        var builder = new FlowBuilder();

        // Act
        Action act = () => builder.Build();

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Flow name is required");
    }
}
```

### Integration Testing

```csharp
public class FlowIntegrationTests
{
    [Fact]
    public void FlowBuilder_ShouldGenerateValidCloudFormation()
    {
        // Arrange
        var app = new App();
        var stack = new Stack(app, "TestStack");

        var flow = new FlowBuilder()
            .SetName("TestFlow")
            .PlayPrompt("Hello")
            .Build();

        // Act
        var cfnFlow = flow.ToCfnContactFlow(stack, "TestFlow");

        // Assert
        var template = Template.FromStack(stack);
        template.HasResourceProperties("AWS::Connect::ContactFlow", new Dictionary<string, object>
        {
            ["Name"] = "TestFlow"
        });
    }
}
```

## Best Practices

### 1. Use Descriptive Variable Names

```csharp
// ✅ Good
var salesFlow = new FlowBuilder()
    .SetName("SalesInbound")
    .PlayPrompt("Welcome to sales")
    .TransferToQueue("Sales")
    .Build();

// ❌ Bad
var f1 = new FlowBuilder()
    .SetName("Flow1")
    .PlayPrompt("Hello")
    .Build();
```

### 2. Extract Complex Logic

```csharp
// ✅ Good: Extracted methods
public class FlowDefinitions
{
    public IContactFlow CreateMainFlow()
    {
        return new FlowBuilder()
            .SetName("MainFlow")
            .AddSubFlow(CreateAuthentication())
            .AddSubFlow(CreateRouting())
            .Build();
    }

    private IFlowBuilder CreateAuthentication() { /* ... */ }
    private IFlowBuilder CreateRouting() { /* ... */ }
}

// ❌ Bad: Everything inline
public IContactFlow CreateMonolith()
{
    return new FlowBuilder()
        // 200 lines of chained methods...
        .Build();
}
```

### 3. Validate Early

```csharp
public class ValidatingFlowBuilder
{
    public IContactFlow CreateFlow(FlowConfig config)
    {
        // Validate before building
        if (string.IsNullOrEmpty(config.Name))
            throw new ArgumentException("Name required");

        if (config.Queues?.Any() != true)
            throw new ArgumentException("At least one queue required");

        return new FlowBuilder()
            .SetName(config.Name)
            .PlayPrompt(config.WelcomeMessage)
            .TransferToQueue(config.Queues.First())
            .Build();
    }
}
```

### 4. Use Fluent Assertions in Tests

```csharp
flow.Actions.Should()
    .HaveCount(3)
    .And.ContainItemsAssignableTo<MessageAction>()
    .And.Contain(a => a.Type == ActionType.TransferToQueue);
```

### 5. Leverage Type Safety

```csharp
// ✅ Good: Clear string references
flow.TransferToQueue("SalesQueue");

// ⚠️ Be careful: Typos won't be caught until runtime
flow.TransferToQueue("Sales");  // Make sure queue name is correct
```

## Comparison: Fluent vs Attributes

**Both approaches are equally valid.** Choose based on your preferences and use case.

### Fluent Builders

```csharp
public static IContactFlow CreateFlow()
{
    return new FlowBuilder()
        .SetName("CustomerService")
        .PlayPrompt("Welcome")
        .GetCustomerInput(input => { input.Prompt = "Press 1"; })
        .OnDigit("1", b => b.TransferToQueue("Support"))
        .Build();
}
```

**Strengths:**
- ✅ Full programmatic control
- ✅ Dynamic flow generation
- ✅ Explicit code (no generated files)
- ✅ Testing without generated dependencies

**Trade-offs:**
- ⚠️ More verbose
- ⚠️ More boilerplate to write
- ⚠️ Less concise for simple flows

### Attribute-Based

```csharp
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow
{
    [Message("Welcome")]
    public partial void Welcome();

    [GetUserInput("Press 1")]
    [Branch(OnDigit = "1", Target = nameof(Transfer))]
    public partial void GetInput();

    [TransferToQueue("Support")]
    public partial void Transfer();
}
```

**Strengths:**
- ✅ Concise, declarative
- ✅ Less boilerplate
- ✅ Source generator creates implementation
- ✅ Compile-time validation via analyzers

**Trade-offs:**
- ⚠️ Less flexible for dynamic scenarios
- ⚠️ Static structure
- ⚠️ Generated code can be opaque (though usually you don't need to see it)

**Remember:** You're not locked into one approach. You can use fluent builders for some flows and attributes for others, or even mix both in the same flow (hybrid pattern).

## Next Steps

- **[Attribute-Based Flows](/guide/flows/attribute-based)** - Declarative alternative
- **[Flow Validation](/guide/flows/validation)** - Ensure correctness
- **[Architecture](/guide/architecture)** - Framework architecture
- **[Enterprise (Fluent)](/examples/enterprise-fluent)** - Complex fluent example

## Related Resources

- [Flow Basics](/guide/flows/basics) - Flow fundamentals
- [Reference: Flow Actions](/reference/flow-actions) - Complete action reference
- [Patterns](/guide/patterns) - Builder pattern details
