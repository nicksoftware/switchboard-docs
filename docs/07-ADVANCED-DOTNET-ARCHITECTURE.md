# 🚀 Advanced .NET Architecture Plan

## Vision: Developer-First, Production-Ready Switchboard

This document outlines the advanced .NET features and patterns that will make this framework incredibly developer-friendly, type-safe, and extensible.

---

## Table of Contents

1. [Source Generators](#1-source-generators)
2. [Attribute-Based Declarative Configuration](#2-attribute-based-declarative-configuration)
3. [Dependency Injection Integration](#3-dependency-injection-integration)
4. [Configuration System Integration](#4-configuration-system-integration)
5. [Advanced Fluent Builders](#5-advanced-fluent-builders)
6. [Reflection-Based Discovery](#6-reflection-based-discovery)
7. [Roslyn Analyzers](#7-roslyn-analyzers)
8. [Generic Constraints & Type Safety](#8-generic-constraints--type-safety)
9. [Expression Trees](#9-expression-trees)
10. [Middleware Pipeline](#10-middleware-pipeline)
11. [Complete Architecture Example](#11-complete-architecture-example)

---

## 1. Source Generators

### Purpose
Generate boilerplate code at compile time for better performance and developer experience.

### Implementation Strategy

#### A. Flow Definition Generator

**User writes simple code:**
```csharp
[ContactFlow("SalesInbound")]
public partial class SalesFlow
{
    [Message("Welcome to our sales team")]
    public partial MessageAction Welcome();

    [GetInput("Press 1 for new customer, 2 for existing")]
    public partial GetInputAction GetCustomerType();

    [Lambda("CustomerLookup")]
    public partial LambdaAction LookupCustomer();
}
```

**Source Generator produces:**
```csharp
// Auto-generated code
public partial class SalesFlow : IContactFlowDefinition
{
    public partial MessageAction Welcome() => new MessageAction
    {
        Identifier = "welcome-msg",
        Text = "Welcome to our sales team",
        Parameters = new MessageParameters { /* ... */ }
    };

    public string GenerateFlowJson()
    {
        var actions = new List<FlowAction>
        {
            Welcome(),
            GetCustomerType(),
            LookupCustomer()
        };

        return FlowJsonGenerator.Generate(actions);
    }
}
```

#### B. DynamoDB Table Schema Generator

**User defines model:**
```csharp
[DynamoDbTable("ConnectFlowConfigurations")]
public class FlowConfiguration
{
    [PartitionKey]
    public string FlowId { get; set; }

    [SortKey]
    public int Version { get; set; }

    [GlobalSecondaryIndex("ActiveFlowsIndex")]
    public bool Active { get; set; }
}
```

**Generator creates:**
```csharp
// Auto-generated Repository, CDK Construct, and Query Builders
public partial class FlowConfigurationRepository : IFlowConfigurationRepository
{
    public async Task<FlowConfiguration> GetByIdAsync(string flowId, int version)
    {
        // Generated implementation
    }

    public IQueryable<FlowConfiguration> QueryActiveFlows()
    {
        // Generated implementation
    }
}

public class FlowConfigurationTable : Construct
{
    public FlowConfigurationTable(Construct scope, string id) : base(scope, id)
    {
        var table = new Table(this, "FlowConfigTable", new TableProps
        {
            PartitionKey = new Attribute { Name = "FlowId", Type = AttributeType.STRING },
            SortKey = new Attribute { Name = "Version", Type = AttributeType.NUMBER },
            // GSI auto-generated from attribute
        });
    }
}
```

#### C. Lambda Handler Generator

```csharp
[LambdaFunction("ConfigFetcher")]
public partial class ConfigFetcherHandler
{
    [LambdaInvoke]
    public async Task<ConfigResponse> FetchConfig(ConfigRequest request)
    {
        // Business logic only
        var config = await _repository.GetActiveAsync(request.FlowId);
        return new ConfigResponse { Config = config };
    }
}

// Generator creates:
// - FunctionHandler method with proper signature
// - Serialization/deserialization
// - Logging boilerplate
// - Error handling
// - CDK Function construct
```

### Project Structure for Source Generators

```
src/
├── Switchboard/
├── Switchboard.Lambda/
└── Switchboard.SourceGenerators/
    ├── FlowDefinitionGenerator.cs
    ├── DynamoDbSchemaGenerator.cs
    ├── LambdaHandlerGenerator.cs
    └── AttributeDiscoveryGenerator.cs
```

---

## 2. Attribute-Based Declarative Configuration

### Flow Definition Attributes

```csharp
namespace Switchboard.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class ContactFlowAttribute : Attribute
{
    public string Name { get; }
    public ContactFlowType Type { get; set; } = ContactFlowType.ContactFlow;
    public string Description { get; set; }

    public ContactFlowAttribute(string name)
    {
        Name = name;
    }
}

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Property)]
public class ActionAttribute : Attribute
{
    public int Order { get; set; }
    public string Identifier { get; set; }
}

[AttributeUsage(AttributeTargets.Method)]
public class MessageAttribute : ActionAttribute
{
    public string Text { get; }
    public MessageAttribute(string text) => Text = text;
}

[AttributeUsage(AttributeTargets.Method)]
public class TransferToQueueAttribute : ActionAttribute
{
    public string QueueName { get; }
    public TransferToQueueAttribute(string queueName) => QueueName = queueName;
}
```

### Usage Example

```csharp
[ContactFlow("CustomerSupport", Description = "Main customer support flow")]
[Queue("Support", MaxContacts = 50, ServiceLevel = 0.80)]
public class CustomerSupportFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Thank you for calling customer support")]
    public void WelcomeMessage() { }

    [Action(Order = 2)]
    [CheckHoursOfOperation("BusinessHours")]
    public void CheckHours() { }

    [Action(Order = 3, Identifier = "get-customer-input")]
    [GetInput("Press 1 for sales, 2 for support, 3 for billing")]
    public void GetDepartment() { }

    [Action(Order = 4)]
    [Branch(nameof(GetDepartment))]
    public void RouteByInput()
    {
        OnDigit("1", () => TransferTo<SalesQueue>());
        OnDigit("2", () => TransferTo<SupportQueue>());
        OnDigit("3", () => TransferTo<BillingQueue>());
    }
}
```

### Queue Definition Attributes

```csharp
[Queue("VIPSupport")]
[MaxContacts(25)]
[ServiceLevel(threshold: 20, target: 0.95)]
[RoutingStrategy(typeof(SkillBasedRouting))]
[RequiredSkills("premium-support", "technical")]
public class VipSupportQueue : QueueDefinitionBase
{
    [AgentWhisper]
    public string WhisperMessage => "VIP customer calling";

    [OutboundCallerId]
    public string CallerId => "+18005551234";
}
```

---

## 3. Dependency Injection Integration

### Full DI Support Like ASP.NET Core

```csharp
// In user's CDK Program.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

// Add Amazon Connect framework with DI
builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly) // Auto-discover flows
.AddQueueDefinitions(typeof(Program).Assembly)
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.UseRedisCache(builder.Configuration.GetConnectionString("Redis"));
})
.AddRouting<SkillBasedRoutingStrategy>()
.AddValidation()
.AddTelemetry();

// CDK App from DI container
var host = builder.Build();
var cdkApp = host.Services.GetRequiredService<ISwitchboardApp>();

cdkApp.Synth();
```

### Service Registration Extension

```csharp
public static class AmazonConnectServiceCollectionExtensions
{
    public static IAmazonConnectBuilder AddSwitchboard(
        this IServiceCollection services,
        Action<ConnectFrameworkOptions> configure)
    {
        services.Configure(configure);

        // Register core services
        services.AddSingleton<ISwitchboardApp, AmazonConnectApp>();
        services.AddSingleton<IFlowBuilder, FlowBuilder>();
        services.AddSingleton<IFlowValidator, FlowValidator>();

        // Register factories
        services.AddSingleton<IActionFactory, ActionFactory>();
        services.AddSingleton<IQueueFactory, QueueFactory>();

        return new AmazonConnectBuilder(services);
    }
}

public interface IAmazonConnectBuilder
{
    IServiceCollection Services { get; }

    IAmazonConnectBuilder AddFlowDefinitions(Assembly assembly);
    IAmazonConnectBuilder AddDynamicConfiguration(Action<DynamicConfigOptions> configure);
    IAmazonConnectBuilder AddRouting<TStrategy>() where TStrategy : IRoutingStrategy;
}
```

### IOptions Pattern Integration

```csharp
public class FlowConfigurationService
{
    private readonly IOptions<ConnectFrameworkOptions> _frameworkOptions;
    private readonly IOptions<DynamicConfigOptions> _configOptions;
    private readonly ILogger<FlowConfigurationService> _logger;

    public FlowConfigurationService(
        IOptions<ConnectFrameworkOptions> frameworkOptions,
        IOptions<DynamicConfigOptions> configOptions,
        ILogger<FlowConfigurationService> logger)
    {
        _frameworkOptions = frameworkOptions;
        _configOptions = configOptions;
        _logger = logger;
    }
}
```

---

## 4. Configuration System Integration

### appsettings.json Integration

```json
{
  "AmazonConnect": {
    "InstanceName": "ProductionCallCenter",
    "Region": "us-east-1",
    "Queues": [
      {
        "Name": "Sales",
        "MaxContacts": 50,
        "ServiceLevel": {
          "Threshold": 20,
          "Target": 0.80
        }
      },
      {
        "Name": "Support",
        "MaxContacts": 100
      }
    ],
    "DynamicConfiguration": {
      "Enabled": true,
      "Provider": "DynamoDB",
      "CacheTTL": "00:05:00",
      "TableNames": {
        "Flows": "ConnectFlowConfigurations",
        "Queues": "ConnectQueueConfigurations"
      }
    },
    "Lambda": {
      "ConfigFetcher": {
        "MemorySize": 512,
        "Timeout": 30,
        "Environment": {
          "LOG_LEVEL": "INFO"
        }
      }
    }
  }
}
```

### Configuration Binding

```csharp
public class ConnectFrameworkOptions
{
    public const string SectionName = "AmazonConnect";

    public string InstanceName { get; set; }
    public string Region { get; set; }
    public List<QueueConfig> Queues { get; set; } = new();
    public DynamicConfigOptions DynamicConfiguration { get; set; }
    public Dictionary<string, LambdaOptions> Lambda { get; set; } = new();
}

// Bind from configuration
builder.Services.Configure<ConnectFrameworkOptions>(
    builder.Configuration.GetSection(ConnectFrameworkOptions.SectionName));
```

---

## 5. Advanced Fluent Builders

### Strongly-Typed Fluent Interface with State Machine

::: warning PROPOSED PATTERN - NOT YET IMPLEMENTED
This is an **advanced pattern proposal** for future consideration. The current implementation uses a simpler fluent API without generic state constraints.
:::

```csharp
// PROPOSED: Type-safe state transitions (not yet implemented)
public interface IFlowBuilder<TState> where TState : IFlowState
{
    IFlowBuilder<TMessageAdded> PlayPrompt(string text);
}

public interface IFlowBuilder<TMessageAdded> : IFlowBuilder
{
    IFlowBuilder<TInputAdded> GetCustomerInput(Action<InputBuilder> configure);
    IFlowBuilder<TTransferAdded> TransferTo<TQueue>() where TQueue : IQueue;
}

// PROPOSED usage - compile-time enforced order (future enhancement)
var flow = new FlowBuilder()
    .SetName("Sales")
    .PlayPrompt("Welcome")          // Returns IFlowBuilder<TMessageAdded>
    .GetCustomerInput(input => {        // Only available after message
        input.SetText("Press 1");
        input.OnDigit("1", ...);
    })
    .TransferTo<SalesQueue>()   // Only available after input
    .Build();

// ACTUAL current implementation (what exists today):
var flow = new FlowBuilder()
    .SetName("Sales")
    .PlayPrompt("Welcome")
    .GetCustomerInput("Press 1 for sales", input => {
        input.MaxDigits = 1;
    })
    .TransferToQueue("SalesQueue")
    .Build();
```

### Generic Method Chaining

::: warning PROPOSED PATTERN - NOT YET IMPLEMENTED
This shows a proposed implementation pattern for the state-machine-based API above.
:::

```csharp
// PROPOSED: Generic method chaining with state constraints (future enhancement)
public class FlowBuilder :
    IFlowBuilder,
    IFlowBuilder<MessageAdded>,
    IFlowBuilder<InputAdded>
{
    public IFlowBuilder<MessageAdded> PlayPrompt(string text)
    {
        _actions.Add(new MessageAction { Text = text });
        return this;
    }

    IFlowBuilder<InputAdded> IFlowBuilder<MessageAdded>.GetCustomerInput(
        Action<InputBuilder> configure)
    {
        var builder = new InputBuilder();
        configure(builder);
        _actions.Add(builder.Build());
        return this;
    }
}

// ACTUAL current implementation:
public class FlowBuilder : IFlowBuilder
{
    public IFlowBuilder PlayPrompt(string text, string? identifier = null)
    {
        _actions.Add(new PlayPromptAction { Text = text, Identifier = identifier });
        return this;
    }

    public IFlowBuilder GetCustomerInput(string promptText, Action<GetCustomerInputAction>? configure = null)
    {
        var action = new GetCustomerInputAction { PromptText = promptText };
        configure?.Invoke(action);
        _actions.Add(action);
        return this;
    }
}
```

### Fluent Configuration with Extension Methods

```csharp
public static class FlowBuilderExtensions
{
    public static IFlowBuilder AddWelcomeMessage(
        this IFlowBuilder builder,
        string message = "Welcome to our call center")
    {
        return builder.PlayPrompt(message);
    }

    public static IFlowBuilder AddBusinessHoursCheck(
        this IFlowBuilder builder,
        Action onHours,
        Action afterHours)
    {
        return builder
            .CheckHoursOfOperation("BusinessHours")
            .OnMatch(() => onHours())
            .OnNoMatch(() => afterHours());
    }

    public static IFlowBuilder AddVoicemail(
        this IFlowBuilder builder,
        string message = "Please leave a message")
    {
        return builder
            .PlayPrompt(message)
            .RecordVoicemail()
            .PlayPrompt("Thank you, goodbye")
            .Disconnect();
    }
}

// Usage
flow.AddWelcomeMessage()
    .AddBusinessHoursCheck(
        onHours: () => flow.TransferTo<SalesQueue>(),
        afterHours: () => flow.AddVoicemail()
    );
```

---

## 6. Reflection-Based Discovery

### Auto-Discovery of Flow Definitions

```csharp
public class FlowDefinitionScanner
{
    public IEnumerable<Type> ScanForFlowDefinitions(Assembly assembly)
    {
        return assembly.GetTypes()
            .Where(t => t.GetCustomAttribute<ContactFlowAttribute>() != null)
            .Where(t => !t.IsAbstract && !t.IsInterface);
    }

    public ContactFlowDefinition CreateFlowFromType(Type flowType)
    {
        var flowAttribute = flowType.GetCustomAttribute<ContactFlowAttribute>();
        var instance = Activator.CreateInstance(flowType);

        var actions = flowType.GetMethods()
            .Where(m => m.GetCustomAttribute<ActionAttribute>() != null)
            .OrderBy(m => m.GetCustomAttribute<ActionAttribute>().Order)
            .Select(m => CreateActionFromMethod(m, instance))
            .ToList();

        return new ContactFlowDefinition
        {
            Name = flowAttribute.Name,
            Type = flowAttribute.Type,
            Actions = actions
        };
    }
}
```

### Convention-Based Queue Handler Registration

```csharp
public class QueueHandlerRegistry
{
    public void RegisterHandlers(Assembly assembly)
    {
        var handlerTypes = assembly.GetTypes()
            .Where(t => t.Name.EndsWith("QueueHandler"))
            .Where(t => typeof(IQueueHandler).IsAssignableFrom(t));

        foreach (var handlerType in handlerTypes)
        {
            var queueAttribute = handlerType.GetCustomAttribute<QueueAttribute>();
            var queueName = queueAttribute?.Name ??
                           handlerType.Name.Replace("QueueHandler", "");

            _handlers[queueName] = handlerType;
        }
    }
}

// Convention: SalesQueueHandler handles "Sales" queue
[Queue("Sales")]
public class SalesQueueHandler : IQueueHandler
{
    public Task HandleContactAsync(ContactContext context)
    {
        // Handle sales queue logic
    }
}
```

### Property-Based Configuration Injection

```csharp
public abstract class FlowDefinitionBase
{
    // Auto-injected from DI container
    [Inject]
    protected ILogger Logger { get; set; }

    [Inject]
    protected IFlowBuilder FlowBuilder { get; set; }

    [Inject]
    protected IQueueFactory QueueFactory { get; set; }
}

public class PropertyInjector
{
    public void InjectProperties(object instance, IServiceProvider services)
    {
        var properties = instance.GetType()
            .GetProperties()
            .Where(p => p.GetCustomAttribute<InjectAttribute>() != null);

        foreach (var property in properties)
        {
            var service = services.GetRequiredService(property.PropertyType);
            property.SetValue(instance, service);
        }
    }
}
```

---

## 7. Roslyn Analyzers

### Compile-Time Validation

Create analyzer projects that catch issues during compilation:

```
src/
└── Switchboard.Analyzers/
    ├── FlowDefinitionAnalyzer.cs
    ├── QueueReferenceAnalyzer.cs
    ├── ActionOrderAnalyzer.cs
    └── CodeFixProviders/
```

#### Analyzer Examples

**A. Missing Queue Reference Analyzer**

```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class QueueReferenceAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "ACF001";
    private const string Title = "Queue not defined";
    private const string MessageFormat = "Queue '{0}' is referenced but not defined";

    public override void Initialize(AnalysisContext context)
    {
        context.RegisterSyntaxNodeAction(AnalyzeNode,
            SyntaxKind.InvocationExpression);
    }

    private void AnalyzeNode(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        // Check if it's TransferTo<TQueue>()
        if (IsTransferToQueue(invocation))
        {
            var queueType = GetQueueType(invocation);

            if (!IsQueueDefined(queueType, context.Compilation))
            {
                var diagnostic = Diagnostic.Create(
                    Rule,
                    invocation.GetLocation(),
                    queueType.Name);
                context.ReportDiagnostic(diagnostic);
            }
        }
    }
}
```

**B. Action Order Analyzer**

```csharp
// Ensures actions are ordered correctly
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class ActionOrderAnalyzer : DiagnosticAnalyzer
{
    // Warns if action orders are not sequential
    // Errors if duplicate orders exist
}
```

**C. Code Fix Provider**

```csharp
[ExportCodeFixProvider(LanguageNames.CSharp)]
public class QueueDefinitionCodeFixProvider : CodeFixProvider
{
    public override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var diagnostic = context.Diagnostics.First();
        var queueName = GetQueueNameFromDiagnostic(diagnostic);

        context.RegisterCodeFix(
            CodeAction.Create(
                title: $"Create {queueName} queue definition",
                createChangedSolution: c => CreateQueueDefinition(context.Document, queueName, c)),
            diagnostic);
    }
}
```

---

## 8. Generic Constraints & Type Safety

### Strongly-Typed Queue References

```csharp
public interface IQueue<TConfig> where TConfig : QueueConfiguration
{
    string Name { get; }
    TConfig Configuration { get; }
}

public class SalesQueue : IQueue<SalesQueueConfig>
{
    public string Name => "Sales";
    public SalesQueueConfig Configuration { get; }
}

// Type-safe transfer
public IFlowBuilder TransferTo<TQueue>()
    where TQueue : IQueue, new()
{
    var queue = new TQueue();
    _actions.Add(new TransferAction
    {
        QueueArn = queue.GetArn()
    });
    return this;
}

// Usage - compile-time checked
flow.TransferTo<SalesQueue>();  // ✓ Valid
flow.TransferTo<string>();      // ✗ Compile error
```

### Generic Action Handlers

```csharp
public interface IActionHandler<TAction, TResult>
    where TAction : FlowAction
{
    Task<TResult> HandleAsync(TAction action, ContactContext context);
}

public class MessageActionHandler : IActionHandler<MessageAction, MessageResult>
{
    public async Task<MessageResult> HandleAsync(
        MessageAction action,
        ContactContext context)
    {
        // Handle message action
        return new MessageResult { Success = true };
    }
}

// Auto-registration via reflection
services.AddActionHandlers(typeof(Program).Assembly);
```

### Constraint-Based Builders

```csharp
public interface IContactFlowBuilder<TFlow>
    where TFlow : IContactFlow, new()
{
    IContactFlowBuilder<TFlow> AddAction<TAction>(TAction action)
        where TAction : FlowAction;

    TFlow Build();
}

// Ensures only valid flows can be built
public class TypedFlowBuilder<TFlow> : IContactFlowBuilder<TFlow>
    where TFlow : IContactFlow, new()
{
    public TFlow Build()
    {
        var flow = new TFlow();
        flow.Actions = _actions;
        return flow;
    }
}
```

---

## 9. Expression Trees

### Type-Safe Property Selection

```csharp
public class FlowConfigurationBuilder<TConfig> where TConfig : class
{
    public FlowConfigurationBuilder<TConfig> Configure<TValue>(
        Expression<Func<TConfig, TValue>> selector,
        TValue value)
    {
        var propertyName = GetPropertyName(selector);
        _configuration[propertyName] = value;
        return this;
    }

    private string GetPropertyName<TValue>(Expression<Func<TConfig, TValue>> expr)
    {
        if (expr.Body is MemberExpression member)
            return member.Member.Name;
        throw new ArgumentException("Expression must be a property selector");
    }
}

// Usage
var config = new FlowConfigurationBuilder<SalesFlowConfig>()
    .Configure(c => c.MaxQueueTime, 300)
    .Configure(c => c.EnableCallback, true)
    .Build();
```

### Dynamic Query Building

```csharp
public class FlowQueryBuilder
{
    public IQueryable<FlowConfiguration> BuildQuery(
        Expression<Func<FlowConfiguration, bool>> predicate)
    {
        return _context.Flows.Where(predicate);
    }
}

// Usage
var activeFlows = queryBuilder.BuildQuery(f => f.Active && f.Version > 1);
```

### Validation Rules with Expressions

```csharp
public class FlowValidator<TFlow> where TFlow : IContactFlow
{
    private readonly List<Expression<Func<TFlow, bool>>> _rules = new();

    public FlowValidator<TFlow> AddRule(
        Expression<Func<TFlow, bool>> rule,
        string errorMessage)
    {
        _rules.Add(rule);
        return this;
    }

    public ValidationResult Validate(TFlow flow)
    {
        foreach (var rule in _rules)
        {
            var compiledRule = rule.Compile();
            if (!compiledRule(flow))
            {
                var description = rule.ToString(); // Get readable error
                return ValidationResult.Failed(description);
            }
        }
        return ValidationResult.Success();
    }
}

// Usage
var validator = new FlowValidator<SalesFlow>()
    .AddRule(f => f.Actions.Count > 0, "Flow must have at least one action")
    .AddRule(f => f.Actions.Count <= 250, "Flow cannot exceed 250 actions")
    .AddRule(f => f.Name != null, "Flow must have a name");
```

---

## 10. Middleware Pipeline

### ASP.NET Core-Style Middleware for Flows

```csharp
public interface IFlowMiddleware
{
    Task InvokeAsync(FlowContext context, FlowDelegate next);
}

public delegate Task FlowDelegate(FlowContext context);

// Middleware examples
public class LoggingMiddleware : IFlowMiddleware
{
    private readonly ILogger<LoggingMiddleware> _logger;

    public async Task InvokeAsync(FlowContext context, FlowDelegate next)
    {
        _logger.LogInformation("Executing flow {FlowName}", context.FlowName);

        var sw = Stopwatch.StartNew();
        await next(context);
        sw.Stop();

        _logger.LogInformation("Flow completed in {Duration}ms", sw.ElapsedMilliseconds);
    }
}

public class ValidationMiddleware : IFlowMiddleware
{
    private readonly IFlowValidator _validator;

    public async Task InvokeAsync(FlowContext context, FlowDelegate next)
    {
        var result = await _validator.ValidateAsync(context.Flow);

        if (!result.IsValid)
        {
            context.Errors.AddRange(result.Errors);
            return; // Short-circuit pipeline
        }

        await next(context);
    }
}

public class CachingMiddleware : IFlowMiddleware
{
    private readonly IMemoryCache _cache;

    public async Task InvokeAsync(FlowContext context, FlowDelegate next)
    {
        var cacheKey = $"flow_{context.FlowId}";

        if (_cache.TryGetValue(cacheKey, out FlowResult cached))
        {
            context.Result = cached;
            return;
        }

        await next(context);

        _cache.Set(cacheKey, context.Result, TimeSpan.FromMinutes(5));
    }
}
```

### Middleware Pipeline Builder

```csharp
public class FlowPipelineBuilder
{
    private readonly List<Func<FlowDelegate, FlowDelegate>> _components = new();

    public FlowPipelineBuilder Use(Func<FlowDelegate, FlowDelegate> middleware)
    {
        _components.Add(middleware);
        return this;
    }

    public FlowPipelineBuilder UseMiddleware<TMiddleware>()
        where TMiddleware : IFlowMiddleware, new()
    {
        return Use(next =>
        {
            var middleware = new TMiddleware();
            return context => middleware.InvokeAsync(context, next);
        });
    }

    public FlowDelegate Build()
    {
        FlowDelegate pipeline = context => Task.CompletedTask;

        foreach (var component in _components.Reverse<Func<FlowDelegate, FlowDelegate>>())
        {
            pipeline = component(pipeline);
        }

        return pipeline;
    }
}

// Usage
var pipeline = new FlowPipelineBuilder()
    .UseMiddleware<LoggingMiddleware>()
    .UseMiddleware<ValidationMiddleware>()
    .UseMiddleware<CachingMiddleware>()
    .Use(async (context, next) =>
    {
        // Inline middleware
        context.Timestamp = DateTime.UtcNow;
        await next(context);
    })
    .Build();
```

### Middleware Registration with DI

```csharp
builder.Services.AddSwitchboard(options => { })
    .UseMiddleware<LoggingMiddleware>()
    .UseMiddleware<ValidationMiddleware>()
    .UseMiddleware<CachingMiddleware>()
    .UseMiddleware<TelemetryMiddleware>();
```

---

## 11. Complete Architecture Example

### Putting It All Together

```csharp
// 1. Define Queue with Attributes
[Queue("PremiumSupport")]
[MaxContacts(25)]
[ServiceLevel(threshold: 15, target: 0.95)]
public class PremiumSupportQueue : QueueDefinitionBase
{
    [OutboundCallerId("+18005551234")]
    public string CallerId { get; set; }
}

// 2. Define Flow with Attributes
[ContactFlow("PremiumSupportFlow")]
public partial class PremiumSupportFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to Premium Support")]
    public partial void Welcome();

    [Action(Order = 2)]
    [Lambda("CustomerLookup")]
    public partial Task<CustomerData> LookupCustomer();

    [Action(Order = 3)]
    [Condition]
    public partial void RouteByCustomerTier()
    {
        When(customer => customer.Tier == "Platinum",
            () => TransferTo<PlatinumQueue>());
        When(customer => customer.Tier == "Gold",
            () => TransferTo<GoldQueue>());
        Otherwise(() => TransferTo<PremiumSupportQueue>());
    }
}

// 3. Configure in Program.cs with DI
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = builder.Configuration["Connect:InstanceName"];
})
// Auto-discover all flows and queues
.AddFlowDefinitions(typeof(Program).Assembly)
.AddQueueDefinitions(typeof(Program).Assembly)

// Add dynamic configuration
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.UseRedisCache(builder.Configuration.GetConnectionString("Redis"));
})

// Add routing strategies
.AddRouting<SkillBasedRoutingStrategy>()
.AddRouting<VipRoutingStrategy>()

// Add middleware pipeline
.UseMiddleware<LoggingMiddleware>()
.UseMiddleware<ValidationMiddleware>()
.UseMiddleware<TelemetryMiddleware>()

// Add analyzers and validation
.AddRoslynAnalyzers()
.AddFluentValidation();

var host = builder.Build();

// Get CDK app from DI and synthesize
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

### Generated Output

The framework automatically:

1. **Scans assemblies** for `[ContactFlow]` and `[Queue]` attributes
2. **Generates CDK constructs** from definitions
3. **Creates DynamoDB tables** from data models
4. **Registers Lambda handlers** from interfaces
5. **Builds middleware pipeline** for all flows
6. **Validates at compile-time** with Roslyn analyzers
7. **Provides IntelliSense** for all builders
8. **Enables hot-reload** for rapid development

---

## Framework Project Structure

```
src/
├── Switchboard/
│   ├── Core/
│   │   ├── ISwitchboardApp.cs
│   │   ├── AmazonConnectApp.cs
│   │   └── FlowPipelineBuilder.cs
│   ├── Attributes/
│   │   ├── ContactFlowAttribute.cs
│   │   ├── QueueAttribute.cs
│   │   ├── ActionAttribute.cs
│   │   └── ...
│   ├── Builders/
│   │   ├── IFlowBuilder.cs
│   │   ├── FlowBuilder.cs
│   │   ├── QueueBuilder.cs
│   │   └── FlowBuilderExtensions.cs
│   ├── DependencyInjection/
│   │   ├── ServiceCollectionExtensions.cs
│   │   ├── AmazonConnectBuilder.cs
│   │   └── OptionsConfiguration.cs
│   ├── Middleware/
│   │   ├── IFlowMiddleware.cs
│   │   ├── LoggingMiddleware.cs
│   │   ├── ValidationMiddleware.cs
│   │   └── CachingMiddleware.cs
│   ├── Discovery/
│   │   ├── FlowDefinitionScanner.cs
│   │   ├── QueueDefinitionScanner.cs
│   │   └── AttributeProcessor.cs
│   └── Validation/
│       ├── IFlowValidator.cs
│       └── FluentValidationIntegration.cs
│
├── Switchboard.SourceGenerators/
│   ├── FlowDefinitionGenerator.cs
│   ├── DynamoDbSchemaGenerator.cs
│   ├── LambdaHandlerGenerator.cs
│   └── Templates/
│       ├── FlowTemplate.sbntxt
│       ├── RepositoryTemplate.sbntxt
│       └── LambdaTemplate.sbntxt
│
├── Switchboard.Analyzers/
│   ├── FlowDefinitionAnalyzer.cs
│   ├── QueueReferenceAnalyzer.cs
│   ├── ActionOrderAnalyzer.cs
│   └── CodeFixProviders/
│       ├── QueueDefinitionCodeFixProvider.cs
│       └── ActionOrderCodeFixProvider.cs
│
└── Switchboard.Lambda/
    ├── ConfigFetcher/
    ├── Shared/
    └── Runtime/
```

---

## Benefits of This Architecture

### For Framework Users

✅ **Minimal Boilerplate**: Attributes replace hundreds of lines of code
✅ **Compile-Time Safety**: Roslyn analyzers catch errors before runtime
✅ **IntelliSense Everywhere**: Full IDE support with auto-completion
✅ **Familiar Patterns**: Uses ASP.NET Core patterns (DI, middleware, configuration)
✅ **Gradual Complexity**: Start simple, add complexity as needed
✅ **Testable by Default**: Full DI support makes testing easy

### For Framework Developers

✅ **Extensible**: Easy to add new attributes, middleware, generators
✅ **Maintainable**: Clear separation of concerns
✅ **Performance**: Source generators = zero runtime reflection cost
✅ **Type-Safe**: Generic constraints prevent invalid usage
✅ **Observable**: Built-in logging, telemetry, diagnostics

---

## Next Steps

### Phase 1: Core Foundation (Week 1-2)
- [ ] Implement DI infrastructure
- [ ] Create base attribute types
- [ ] Build reflection-based scanner
- [ ] Set up testing framework

### Phase 2: Source Generators (Week 3-4)
- [ ] Flow definition generator
- [ ] DynamoDB schema generator
- [ ] Lambda handler generator
- [ ] Template engine

### Phase 3: Analyzers (Week 5-6)
- [ ] Queue reference analyzer
- [ ] Action order analyzer
- [ ] Code fix providers
- [ ] Integration with IDE

### Phase 4: Advanced Features (Week 7-8)
- [ ] Middleware pipeline
- [ ] Expression tree builders
- [ ] Configuration system integration
- [ ] Complete documentation

---

**This architecture makes the framework feel like a first-class .NET citizen, leveraging the full power of the platform while maintaining simplicity for users.**
