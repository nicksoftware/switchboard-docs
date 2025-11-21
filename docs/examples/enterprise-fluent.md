# Enterprise Call Center (Fluent Builders)

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

A production-ready enterprise contact center using **modular fluent builders** with dependency injection, dynamic configuration, and programmatic flow control.

## Overview

This example shows a **complete enterprise-grade contact center** built with **fluent builders and dependency injection**:
- Multiple inbound/outbound flows with complex logic
- Queue management with SLAs
- Routing profiles for different agent types
- Lambda integrations for business logic
- Dynamic configuration with DynamoDB
- Multi-environment support (Dev/Staging/Prod)
- CI/CD pipeline ready
- Full dependency injection
- Unit testable flows

**Project complexity:** Enterprise
**Deployment time:** 30-45 minutes
**Team size:** 5-20 developers
**Approach:** Fluent builders + DI

---

## Project Structure

```
EnterpriseCallCenter/
├── src/
│   ├── Flows/
│   │   ├── Inbound/
│   │   │   ├── SalesInboundFlowBuilder.cs
│   │   │   ├── SupportInboundFlowBuilder.cs
│   │   │   └── AfterHoursFlowBuilder.cs
│   │   ├── Outbound/
│   │   │   ├── CustomerFollowUpFlowBuilder.cs
│   │   │   └── SurveyFlowBuilder.cs
│   │   ├── Shared/
│   │   │   ├── AuthenticationFlowBuilder.cs      # Reusable module
│   │   │   ├── VoicemailFlowBuilder.cs
│   │   │   └── CallbackFlowBuilder.cs
│   │   └── FlowRegistry.cs                      # Register all flows
│   │
│   ├── Services/
│   │   ├── ICustomerService.cs
│   │   ├── CustomerService.cs
│   │   ├── IRoutingService.cs
│   │   ├── RoutingService.cs
│   │   └── IConfigurationService.cs
│   │
│   ├── Queues/
│   │   ├── QueueDefinitions.cs                  # All queues
│   │   └── QueueConfigurationProvider.cs
│   │
│   ├── RoutingProfiles/
│   │   └── RoutingProfileDefinitions.cs
│   │
│   ├── Hours/
│   │   └── HoursOfOperationProvider.cs
│   │
│   ├── Lambdas/
│   │   ├── CustomerLookup/
│   │   ├── CallDisposition/
│   │   └── Shared/
│   │
│   ├── Stacks/
│   │   ├── ConnectInstanceStack.cs
│   │   ├── FlowsStack.cs
│   │   ├── QueuesStack.cs
│   │   ├── LambdasStack.cs
│   │   └── MonitoringStack.cs
│   │
│   ├── Configuration/
│   │   └── AppSettings.cs
│   │
│   └── Program.cs
│
├── config/
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── appsettings.Staging.json
│   └── appsettings.Production.json
│
└── tests/
    ├── Unit/
    │   ├── Flows/                               # Test flow builders
    │   ├── Services/                             # Test services
    │   └── Lambdas/
    └── Integration/
```

---

## Code Examples

### 1. Main Entry Point with DI

**`src/Program.cs`**

```csharp
using Amazon.CDK;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Switchboard;
using EnterpriseCallCenter.Flows;
using EnterpriseCallCenter.Services;

var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

var builder = Host.CreateApplicationBuilder(args);

// Load configuration
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("config/appsettings.json", optional: false)
    .AddJsonFile($"config/appsettings.{environment}.json", optional: true)
    .AddEnvironmentVariables();

// Register application services
builder.Services.AddSingleton<ICustomerService, CustomerService>();
builder.Services.AddSingleton<IRoutingService, RoutingService>();
builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();

// Register flow builders
builder.Services.AddSingleton<AuthenticationFlowBuilder>();
builder.Services.AddSingleton<SalesInboundFlowBuilder>();
builder.Services.AddSingleton<SupportInboundFlowBuilder>();
builder.Services.AddSingleton<AfterHoursFlowBuilder>();
builder.Services.AddSingleton<VoicemailFlowBuilder>();

// Register Switchboard
builder.Services.AddSwitchboard(options =>
{
    var config = builder.Configuration.GetSection("Connect");
    options.Environment = environment;
    options.InstanceName = config["InstanceName"];
    options.Region = config["Region"];
})
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.TableName = $"connect-config-{environment.ToLower()}";
    config.CacheTTL = TimeSpan.FromMinutes(5);
});

var host = builder.Build();

// Build flows using DI
var flowRegistry = new FlowRegistry(host.Services);
var flows = flowRegistry.BuildAllFlows();

// Create CDK app
var app = new App();
var stackProps = new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = builder.Configuration["Connect:AwsAccount"],
        Region = builder.Configuration["Connect:Region"]
    }
};

new FlowsStack(app, $"Connect-Flows-{environment}", stackProps, flows);

app.Synth();
```

---

### 2. Shared Authentication Flow Builder

**`src/Flows/Shared/AuthenticationFlowBuilder.cs`**

```csharp
using Switchboard;
using EnterpriseCallCenter.Services;

namespace EnterpriseCallCenter.Flows.Shared;

public class AuthenticationFlowBuilder
{
    private readonly IFlowBuilder _builder;
    private readonly ICustomerService _customerService;
    private readonly IConfiguration _config;

    public AuthenticationFlowBuilder(
        IFlowBuilder builder,
        ICustomerService customerService,
        IConfiguration config)
    {
        _builder = builder;
        _customerService = customerService;
        _config = config;
    }

    public IFlowBuilder Build()
    {
        var maxAttempts = _config.GetValue<int>("Authentication:MaxAttempts", 3);

        return _builder
            .SetName("Authentication")
            .SetDescription("Reusable customer authentication module")

            // Get customer ID
            .GetInput(input =>
            {
                input.Prompt = "Please enter your 8-digit customer ID";
                input.MaxDigits = 8;
                input.Timeout = 5;
                input.EncryptInput = true;
                input.StoreAs = "CustomerId";
            })

            // Invoke Lambda to validate
            .InvokeLambda("ValidateCustomer", lambda =>
            {
                lambda.InputAttribute("customerId", "{{CustomerId}}");
                lambda.OutputAttribute("IsAuthenticated");
                lambda.OutputAttribute("CustomerName");
                lambda.Timeout = TimeSpan.FromSeconds(3);

                // Success path
                lambda.OnSuccess(success =>
                {
                    success.SetAttribute("AuthenticationAttempts", "0");
                });

                // Error path with retry logic
                lambda.OnError(error =>
                {
                    error
                        .IncrementAttribute("AuthenticationAttempts")
                        .CheckAttribute("AuthenticationAttempts")
                        .WhenLessThan(maxAttempts, retry =>
                        {
                            retry.PlayPrompt("That ID was not recognized. Please try again.")
                                 .Goto("GetCustomerId");
                        })
                        .Otherwise(fail =>
                        {
                            fail.PlayPrompt("Authentication failed. Transferring to an agent.")
                                .SetAttribute("IsAuthenticated", "false")
                                .ExitModule();
                        });
                });
            });
    }

    // Alternative: Build with custom parameters
    public IFlowBuilder Build(AuthenticationOptions options)
    {
        return _builder
            .SetName(options.ModuleName ?? "Authentication")
            .GetInput(input =>
            {
                input.Prompt = options.PromptText ?? "Please enter your ID";
                input.MaxDigits = options.MaxDigits ?? 8;
                input.EncryptInput = options.EncryptInput ?? true;
            })
            .InvokeLambda(options.LambdaName ?? "ValidateCustomer", lambda =>
            {
                lambda.InputAttribute("customerId", "{{CustomerId}}");
                lambda.Timeout = options.LambdaTimeout ?? TimeSpan.FromSeconds(3);
            });
    }
}

public record AuthenticationOptions
{
    public string ModuleName { get; init; }
    public string PromptText { get; init; }
    public int? MaxDigits { get; init; }
    public bool? EncryptInput { get; init; }
    public string LambdaName { get; init; }
    public TimeSpan? LambdaTimeout { get; init; }
}
```

---

### 3. Sales Inbound Flow with Dynamic Routing

**`src/Flows/Inbound/SalesInboundFlowBuilder.cs`**

```csharp
using Switchboard;
using EnterpriseCallCenter.Flows.Shared;
using EnterpriseCallCenter.Services;

namespace EnterpriseCallCenter.Flows.Inbound;

public class SalesInboundFlowBuilder
{
    private readonly IFlowBuilder _builder;
    private readonly AuthenticationFlowBuilder _authBuilder;
    private readonly IRoutingService _routingService;
    private readonly IConfiguration _config;

    public SalesInboundFlowBuilder(
        IFlowBuilder builder,
        AuthenticationFlowBuilder authBuilder,
        IRoutingService routingService,
        IConfiguration config)
    {
        _builder = builder;
        _authBuilder = authBuilder;
        _routingService = routingService;
        _config = config;
    }

    public ContactFlow Build()
    {
        var enableVIPRouting = _config.GetValue<bool>("Features:EnableVIPRouting", true);

        var flow = _builder
            .SetName("SalesInbound")
            .SetType(FlowType.ContactFlow)

            // Welcome message
            .PlayPrompt("Welcome to Enterprise Sales. Please hold while we verify your account.")

            // Use shared authentication module
            .UseModule(_authBuilder.Build())

            // Check authentication result
            .Branch()
                .WhenAttributeEquals("IsAuthenticated", "true", authenticated =>
                {
                    // Customer authenticated - check VIP status if enabled
                    if (enableVIPRouting)
                    {
                        authenticated
                            .InvokeLambda("CustomerLookup", lambda =>
                            {
                                lambda.InputAttribute("customerId", "{{CustomerId}}");
                                lambda.OutputAttribute("IsVIP");
                                lambda.OutputAttribute("AccountTier");
                                lambda.OutputAttribute("LifetimeValue");
                            })
                            .Branch()
                                .WhenAttributeEquals("IsVIP", "true", vip =>
                                {
                                    vip.PlayPrompt("Thank you for being a valued customer!")
                                       .SetPriority(1)
                                       .TransferToQueue("VIP-Sales");
                                })
                                .Default(standard =>
                                {
                                    standard.CheckHours("Sales-Hours",
                                        open: h => h.TransferToQueue("Sales"),
                                        closed: h => h.UseFlow("AfterHoursFlow"));
                                });
                    }
                    else
                    {
                        // VIP routing disabled - go straight to sales
                        authenticated.TransferToQueue("Sales");
                    }
                })
                .Default(unauthenticated =>
                {
                    // Failed authentication - transfer to verification queue
                    unauthenticated
                        .PlayPrompt("We couldn't verify your account.")
                        .TransferToQueue("Sales-Verification");
                });

        return flow.Build();
    }

    // Alternative: Build with runtime configuration
    public ContactFlow BuildDynamic(SalesFlowConfiguration config)
    {
        var flow = _builder.SetName("SalesInbound");

        // Welcome message from config
        if (!string.IsNullOrEmpty(config.WelcomeMessage))
        {
            flow.PlayPrompt(config.WelcomeMessage);
        }

        // Authentication if required
        if (config.RequireAuthentication)
        {
            flow.UseModule(_authBuilder.Build(config.AuthOptions));
        }

        // Dynamic routing based on config
        foreach (var route in config.Routes)
        {
            flow.CheckAttribute(route.AttributeName)
                .WhenEquals(route.Value, branch =>
                {
                    branch.TransferToQueue(route.QueueName, new QueueOptions
                    {
                        Priority = route.Priority,
                        Timeout = route.Timeout
                    });
                });
        }

        return flow.Build();
    }
}
```

---

### 4. Routing Service (Business Logic)

**`src/Services/RoutingService.cs`**

```csharp
using Switchboard;

namespace EnterpriseCallCenter.Services;

public interface IRoutingService
{
    string DetermineQueue(CustomerContext customer);
    int CalculatePriority(CustomerContext customer);
    bool ShouldEnableCallback(string queueName);
}

public class RoutingService : IRoutingService
{
    private readonly IConfiguration _config;
    private readonly ICustomerService _customerService;

    public RoutingService(IConfiguration config, ICustomerService customerService)
    {
        _config = config;
        _customerService = customerService;
    }

    public string DetermineQueue(CustomerContext customer)
    {
        // VIP customers go to priority queue
        if (customer.IsVIP)
        {
            return "VIP-Sales";
        }

        // Check for existing support cases
        if (customer.HasOpenSupportCase)
        {
            return "Support-Existing";
        }

        // Route by region
        return customer.Region switch
        {
            "US-East" => "Sales-US-East",
            "US-West" => "Sales-US-West",
            "EU" => "Sales-EU",
            _ => "Sales-Default"
        };
    }

    public int CalculatePriority(CustomerContext customer)
    {
        if (customer.IsVIP) return 1;
        if (customer.LifetimeValue > 10000) return 2;
        if (customer.HasOpenSupportCase) return 3;
        return 5; // Default priority
    }

    public bool ShouldEnableCallback(string queueName)
    {
        var enabledQueues = _config.GetSection("Callbacks:EnabledQueues")
            .Get<string[]>() ?? Array.Empty<string>();

        return enabledQueues.Contains(queueName);
    }
}

public record CustomerContext
{
    public string CustomerId { get; init; }
    public bool IsVIP { get; init; }
    public string AccountTier { get; init; }
    public decimal LifetimeValue { get; init; }
    public string Region { get; init; }
    public bool HasOpenSupportCase { get; init; }
}
```

---

### 5. Flow Registry (Composition)

**`src/Flows/FlowRegistry.cs`**

```csharp
using Microsoft.Extensions.DependencyInjection;
using Switchboard;
using EnterpriseCallCenter.Flows.Inbound;
using EnterpriseCallCenter.Flows.Shared;

namespace EnterpriseCallCenter.Flows;

public class FlowRegistry
{
    private readonly IServiceProvider _services;

    public FlowRegistry(IServiceProvider services)
    {
        _services = services;
    }

    public IEnumerable<ContactFlow> BuildAllFlows()
    {
        yield return BuildSalesInboundFlow();
        yield return BuildSupportInboundFlow();
        yield return BuildAfterHoursFlow();
        yield return BuildVoicemailFlow();
    }

    private ContactFlow BuildSalesInboundFlow()
    {
        var builder = _services.GetRequiredService<SalesInboundFlowBuilder>();
        return builder.Build();
    }

    private ContactFlow BuildSupportInboundFlow()
    {
        var builder = _services.GetRequiredService<SupportInboundFlowBuilder>();
        return builder.Build();
    }

    private ContactFlow BuildAfterHoursFlow()
    {
        var builder = _services.GetRequiredService<AfterHoursFlowBuilder>();
        return builder.Build();
    }

    private ContactFlow BuildVoicemailFlow()
    {
        var builder = _services.GetRequiredService<VoicemailFlowBuilder>();
        return builder.Build();
    }
}
```

---

### 6. Unit Testing Flows

**`tests/Unit/Flows/SalesInboundFlowBuilderTests.cs`**

```csharp
using Xunit;
using Moq;
using FluentAssertions;
using Switchboard;
using EnterpriseCallCenter.Flows.Inbound;
using EnterpriseCallCenter.Services;

namespace EnterpriseCallCenter.Tests.Unit.Flows;

public class SalesInboundFlowBuilderTests
{
    private readonly Mock<IFlowBuilder> _mockBuilder;
    private readonly Mock<AuthenticationFlowBuilder> _mockAuthBuilder;
    private readonly Mock<IRoutingService> _mockRoutingService;
    private readonly Mock<IConfiguration> _mockConfig;

    public SalesInboundFlowBuilderTests()
    {
        _mockBuilder = new Mock<IFlowBuilder>();
        _mockAuthBuilder = new Mock<AuthenticationFlowBuilder>();
        _mockRoutingService = new Mock<IRoutingService>();
        _mockConfig = new Mock<IConfiguration>();
    }

    [Fact]
    public void Build_WhenVIPRoutingEnabled_ShouldIncludeVIPCheck()
    {
        // Arrange
        _mockConfig.Setup(c => c.GetValue<bool>("Features:EnableVIPRouting", true))
            .Returns(true);

        var builder = new SalesInboundFlowBuilder(
            _mockBuilder.Object,
            _mockAuthBuilder.Object,
            _mockRoutingService.Object,
            _mockConfig.Object);

        // Act
        var flow = builder.Build();

        // Assert
        flow.Should().NotBeNull();
        _mockBuilder.Verify(b => b.InvokeLambda("CustomerLookup", It.IsAny<Action<LambdaBuilder>>()), Times.Once);
    }

    [Fact]
    public void Build_WhenVIPRoutingDisabled_ShouldSkipVIPCheck()
    {
        // Arrange
        _mockConfig.Setup(c => c.GetValue<bool>("Features:EnableVIPRouting", true))
            .Returns(false);

        var builder = new SalesInboundFlowBuilder(
            _mockBuilder.Object,
            _mockAuthBuilder.Object,
            _mockRoutingService.Object,
            _mockConfig.Object);

        // Act
        var flow = builder.Build();

        // Assert
        _mockBuilder.Verify(b => b.InvokeLambda("CustomerLookup", It.IsAny<Action<LambdaBuilder>>()), Times.Never);
        _mockBuilder.Verify(b => b.TransferToQueue("Sales"), Times.Once);
    }

    [Fact]
    public void BuildDynamic_WithCustomConfig_ShouldUseConfiguredRoutes()
    {
        // Arrange
        var config = new SalesFlowConfiguration
        {
            WelcomeMessage = "Custom welcome",
            RequireAuthentication = true,
            Routes = new[]
            {
                new RouteConfig { AttributeName = "Region", Value = "US", QueueName = "Sales-US", Priority = 1 },
                new RouteConfig { AttributeName = "Region", Value = "EU", QueueName = "Sales-EU", Priority = 2 }
            }
        };

        var builder = new SalesInboundFlowBuilder(
            _mockBuilder.Object,
            _mockAuthBuilder.Object,
            _mockRoutingService.Object,
            _mockConfig.Object);

        // Act
        var flow = builder.BuildDynamic(config);

        // Assert
        flow.Should().NotBeNull();
        _mockBuilder.Verify(b => b.PlayPrompt("Custom welcome"), Times.Once);
    }
}
```

---

## Environment Configuration

**`config/appsettings.Production.json`**

```json
{
  "Connect": {
    "InstanceName": "enterprise-call-center-prod",
    "Region": "us-east-1",
    "AwsAccount": "123456789012"
  },

  "Features": {
    "EnableVIPRouting": true,
    "EnableCallbackQueues": true,
    "EnableAdvancedAnalytics": true
  },

  "Authentication": {
    "MaxAttempts": 3,
    "LambdaName": "ValidateCustomer",
    "EncryptInput": true
  },

  "Callbacks": {
    "EnabledQueues": ["Sales", "Support", "VIP-Sales"]
  },

  "Routing": {
    "DefaultQueue": "Sales-Default",
    "VIPThreshold": 10000
  },

  "DynamicConfiguration": {
    "Enabled": true,
    "TableName": "connect-config-production",
    "CacheTTL": 300
  }
}
```

---

## Deployment

```bash
# Set environment
export ASPNETCORE_ENVIRONMENT=Production

# Build Lambda functions
dotnet publish src/Lambdas/CustomerLookup -c Release

# Deploy all flows
cdk deploy --all
```

---

## Benefits of Fluent Approach

### ✅ Advantages

1. **Full Programmatic Control**
   - Complex conditional logic
   - Runtime configuration
   - Dynamic flow construction

2. **Testability**
   - Easy to unit test flow builders
   - Mock dependencies (services, config)
   - Test different configurations

3. **Dependency Injection**
   - Services injected into flow builders
   - Clean separation of concerns
   - Easy to swap implementations

4. **Reusability**
   - Shared modules as builder classes
   - Compose flows from smaller builders
   - Configuration-driven behavior

5. **Flexibility**
   - Multiple build methods (Build, BuildDynamic)
   - Parameterized flow construction
   - Easy A/B testing

### ⚠️ Trade-offs

- More code than attribute-based
- Requires understanding of DI
- No compile-time validation of flow structure
- More complex for simple flows

---

## When to Use This Approach

**Choose fluent builders when:**
- ✅ Complex dynamic routing logic
- ✅ Runtime configuration drives flow behavior
- ✅ Need programmatic control over flows
- ✅ Team familiar with DI patterns
- ✅ Flows need unit testing
- ✅ Business logic changes frequently

**Consider attributes when:**
- ⚠️ Flows are simple and linear
- ⚠️ Prefer declarative, minimal code
- ⚠️ Source generators sufficient

---

## Related Examples

- [Enterprise (Attributes)](/examples/enterprise-attributes) - Same example with attributes
- [Single-File Setup](/examples/single-file-setup) - Quickstart with fluent API
- [Framework Patterns](/guide/patterns#fluent-builder-pattern) - Fluent builder pattern details
