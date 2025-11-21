# Architecture Overview

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

This guide explains the architectural design of the Switchboard framework, including its layered structure, key components, and how they work together to provide a code-first Amazon Connect experience.

## High-Level Architecture

Switchboard is designed as a **unified framework** with clear separation of concerns across

## Layer Responsibilities

### Consumer Layer (Public API)

This is what you interact with when using Switchboard. It provides two primary approaches:
(Coming soon)
**1. Attribute-Based (Declarative)**
```csharp
[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow : FlowDefinitionBase
{
    [Message("Welcome to our contact center")]
    public partial void Welcome();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

**2. Fluent API (Programmatic)**
```csharp
var flow = new FlowBuilder()
    .SetName("WelcomeFlow")
    .PlayPrompt("Welcome to our contact center")
    .TransferToQueue("GeneralSupport")
    .Build();
```

Both approaches generate the same underlying infrastructure but cater to different preferences and use cases.

### Framework Core (Internal)

The framework core contains all the logic to transform your high-level definitions into deployable AWS infrastructure:

#### Source Generators
- **FlowDefinitionGenerator**: Generates flow implementations from attributes
- **DynamoDbSchemaGenerator**: Creates DynamoDB table definitions
- **LambdaHandlerGenerator**: Scaffolds Lambda function handlers

#### Roslyn Analyzers
- **FlowDefinitionAnalyzer**: Validates flow structure at compile-time
- **QueueReferenceAnalyzer**: Ensures referenced queues exist
- **ActionOrderAnalyzer**: Verifies action ordering is valid

#### Infrastructure Components
- **CDK Constructs**: High-level L2/L3 constructs for Connect resources
- **DynamoDB Repositories**: Store and retrieve runtime configuration
- **Lambda Functions**: Config fetchers, custom integrations

#### Configuration Management
- **Dynamic Config Manager**: Runtime parameter updates
- **Version Control**: Config versioning and rollback
- **Cache Integration**: Redis/ElastiCache for performance

### AWS Layer

The lowest layer interacts directly with AWS services:

- **Amazon Connect**: Contact flows, queues, routing profiles
- **AWS Lambda**: Custom business logic, config fetchers
- **DynamoDB**: Runtime configuration storage
- **S3**: Flow templates, prompts storage
- **CloudWatch**: Logging and monitoring

#### Lambda Runtime Flexibility

**Important:** While Switchboard uses C# for infrastructure provisioning, your Lambda functions can be written in **any AWS-supported runtime**:

```csharp
// Framework defines the flow in C#
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow
{
    // Python Lambda for machine learning
    [InvokeLambda("arn:aws:lambda:us-east-1:123456789:function:sentiment-analysis")]
    public partial void AnalyzeSentiment();  // Python 3.12 runtime

    // Node.js Lambda for API integrations
    [InvokeLambda("arn:aws:lambda:us-east-1:123456789:function:crm-integration")]
    public partial void FetchCustomerData();  // Node.js 20.x runtime

    // Go Lambda for high-performance data processing
    [InvokeLambda("arn:aws:lambda:us-east-1:123456789:function:data-processor")]
    public partial void ProcessMetrics();  // Go 1.x runtime

    // Java Lambda for enterprise integrations
    [InvokeLambda("arn:aws:lambda:us-east-1:123456789:function:erp-connector")]
    public partial void UpdateERP();  // Java 21 runtime
}
```

**Supported Lambda Runtimes:**
- ✅ **JavaScript/TypeScript** (Node.js 18.x, 20.x)
- ✅ **Python** (3.9, 3.10, 3.11, 3.12)
- ✅ **Go** (1.x, custom runtime)
- ✅ **Java** (11, 17, 21)
- ✅ **Rust** (via custom runtime)
- ✅ **.NET** (6, 7, 8, 10)
- ✅ **Ruby** (3.2, 3.3)
- ✅ **Custom Runtimes** (via Lambda Runtime API)

The framework simply invokes Lambda functions by ARN - it doesn't care what language they're written in. This means:

- **Use existing Lambda functions** without rewriting them
- **Choose the best language** for each Lambda's specific task
- **Mix runtimes freely** within the same contact center
- **Leverage team expertise** - Python devs write Python, JS devs write JavaScript

Example: Multi-Runtime Contact Center
```csharp
[ContactFlow("MultiRuntimeFlow")]
public partial class MultiRuntimeFlow
{
    // Python for ML/data science
    [InvokeLambda("sentiment-classifier-python")]
    public partial void ClassifySentiment();

    // Node.js for REST API calls (many npm packages)
    [InvokeLambda("salesforce-lookup-nodejs")]
    public partial void LookupInSalesforce();

    // Go for CPU-intensive operations (fast cold starts)
    [InvokeLambda("encryption-service-go")]
    public partial void EncryptData();

    // .NET for enterprise systems (same language as framework)
    [InvokeLambda("config-fetcher-dotnet")]
    public partial void FetchDynamicConfig();
}
```

**Key Point:** C# is only required for defining your **infrastructure** (flows, queues, routing). Your **business logic** (Lambdas) can use whatever language makes sense for your use case.

## Component Architecture

### 1. Source Generator Pipeline

```
Your Code (Attributes)
        ↓
Roslyn Syntax Tree
        ↓
Source Generator Analysis
        ↓
Code Generation (Templates)
        ↓
Compiled Implementation
        ↓
CDK Constructs
```

**Example:**

```csharp
// Input: Your attributed class
[ContactFlow("SalesFlow")]
public partial class SalesFlow
{
    [Message("Welcome to sales")]
    public partial void WelcomeMessage();
}

// Generated: Full implementation (automatic)
public partial class SalesFlow : FlowDefinitionBase
{
    public partial void WelcomeMessage()
    {
        AddAction(new MessageParticipantAction
        {
            Text = "Welcome to sales",
            Identifier = GenerateId("WelcomeMessage")
        });
    }

    public override CfnContactFlow BuildCdkConstruct(Construct scope)
    {
        // CDK construct generation logic
        return new CfnContactFlow(scope, "SalesFlow", new CfnContactFlowProps
        {
            // ...generated properties
        });
    }
}
```

### 2. Dependency Injection Architecture

Switchboard integrates with `Microsoft.Extensions.DependencyInjection`:

```csharp
// Program.cs
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyContactCenter";
    options.Region = "us-east-1";
})
.AddFlowDefinitions(typeof(Program).Assembly)
.AddQueueDefinitions(typeof(Program).Assembly)
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.EnableCaching(redis =>
    {
        redis.Endpoint = "redis.example.com";
    });
})
.UseMiddleware<LoggingMiddleware>()
.UseMiddleware<ValidationMiddleware>();

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

**Service Registration Flow:**

```
AddSwitchboard()
    ↓
Register Core Services
    • IFlowBuilder
    • IQueueBuilder
    • IConfigurationManager
    ↓
AddFlowDefinitions()
    ↓
Scan Assembly for Attributed Classes
    ↓
Register Flow Instances
    ↓
Build Service Provider
    ↓
Resolve ISwitchboardApp
    ↓
Generate CDK App
```

### 3. Configuration Management Architecture

```
┌─────────────────────────────────────────┐
│    Your Code (Update Config)            │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│    Configuration Manager                 │
│    • Version control                     │
│    • Validation                          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│    DynamoDB Repository                   │
│    • Store config                        │
│    • Query by flow/queue ID              │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│    Amazon Connect (Runtime)              │
│    • Fetch config via Lambda             │
│    • Execute flow with parameters        │
└──────────────────────────────────────────┘
```

**Runtime Configuration Flow:**

1. Incoming call → Amazon Connect flow
2. Flow invokes `ConfigFetcher` Lambda
3. Lambda checks ElastiCache for cached config
4. If cache miss, query DynamoDB
5. Return config JSON to Connect
6. Connect executes flow with dynamic parameters

### 4. Middleware Pipeline

Inspired by ASP.NET Core middleware pattern:

```csharp
public interface IFlowMiddleware
{
    Task InvokeAsync(FlowContext context, Func<Task> next);
}

public class LoggingMiddleware : IFlowMiddleware
{
    private readonly ILogger<LoggingMiddleware> _logger;

    public LoggingMiddleware(ILogger<LoggingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        _logger.LogInformation("Flow {FlowName} starting", context.FlowName);

        await next(); // Call next middleware

        _logger.LogInformation("Flow {FlowName} completed", context.FlowName);
    }
}
```

**Middleware Execution Pipeline:**

```
Request
    ↓
LoggingMiddleware (start)
    ↓
ValidationMiddleware (start)
    ↓
CachingMiddleware (start)
    ↓
Core Flow Execution
    ↓
CachingMiddleware (end)
    ↓
ValidationMiddleware (end)
    ↓
LoggingMiddleware (end)
    ↓
Response
```

## Design Patterns

Switchboard leverages several proven design patterns:

### Builder Pattern

Used for constructing complex flows and queues:

```csharp
var flow = new FlowBuilder()
    .SetName("ComplexFlow")
    .PlayPrompt("Welcome")
    .GetCustomerInput(input => {
        input.Timeout = 5;
        input.MaxDigits = 1;
    })
    .ThenCheckCondition(condition => {
        condition.When("1", () => TransferTo("Sales"));
        condition.When("2", () => TransferTo("Support"));
        condition.Otherwise(() => Disconnect());
    })
    .Build();
```

### Factory Pattern

Creating instances of flows, queues, and resources:

```csharp
public interface IFlowFactory
{
    IContactFlow CreateFlow(FlowDefinition definition);
    IQueue CreateQueue(QueueDefinition definition);
}
```

### Strategy Pattern

Interchangeable routing algorithms:

```csharp
public interface IRoutingStrategy
{
    Task<string> DetermineQueue(CallContext context);
}

public class SkillBasedRoutingStrategy : IRoutingStrategy
{
    public Task<string> DetermineQueue(CallContext context)
    {
        // Route based on required skills
    }
}

public class VipRoutingStrategy : IRoutingStrategy
{
    public Task<string> DetermineQueue(CallContext context)
    {
        // Route VIP customers to priority queue
    }
}
```

### Repository Pattern

Abstract data access for configuration:

```csharp
public interface IConfigurationRepository
{
    Task<FlowConfig> GetFlowConfigAsync(string flowId);
    Task SaveFlowConfigAsync(FlowConfig config);
    Task<IEnumerable<FlowConfig>> GetAllFlowsAsync();
}

public class DynamoDbConfigurationRepository : IConfigurationRepository
{
    // DynamoDB-specific implementation
}
```

### Composite Pattern

Building complex flow structures from simple components:

```csharp
public abstract class FlowComponent
{
    public abstract string ToJson();
}

public class MessageAction : FlowComponent
{
    public override string ToJson() => /* message JSON */;
}

public class CompositeFlow : FlowComponent
{
    private readonly List<FlowComponent> _components = new();

    public void Add(FlowComponent component) => _components.Add(component);

    public override string ToJson()
    {
        // Combine all component JSONs
        return string.Join(",", _components.Select(c => c.ToJson()));
    }
}
```

### Decorator Pattern

Adding cross-cutting concerns to flows:

```csharp
public interface IFlow
{
    Task ExecuteAsync();
}

public class LoggingFlowDecorator : IFlow
{
    private readonly IFlow _innerFlow;
    private readonly ILogger _logger;

    public LoggingFlowDecorator(IFlow innerFlow, ILogger logger)
    {
        _innerFlow = innerFlow;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Flow starting");
        await _innerFlow.ExecuteAsync();
        _logger.LogInformation("Flow completed");
    }
}
```

## CDK Integration

Switchboard generates standard AWS CDK constructs:

```csharp
public class SwitchboardStack : Stack
{
    public SwitchboardStack(Construct scope, string id, IStackProps props = null)
        : base(scope, id, props)
    {
        // DynamoDB table for configuration
        var configTable = new Table(this, "ConfigTable", new TableProps
        {
            PartitionKey = new Attribute { Name = "PK", Type = AttributeType.STRING },
            SortKey = new Attribute { Name = "SK", Type = AttributeType.STRING },
            BillingMode = BillingMode.PAY_PER_REQUEST
        });

        // Lambda function for config fetching
        var configFetcher = new Function(this, "ConfigFetcher", new FunctionProps
        {
            Runtime = Runtime.DOTNET_10,
            Handler = "Switchboard.Lambda::Switchboard.Lambda.ConfigFetcher::HandleAsync",
            Code = Code.FromAsset("./lambda"),
            Environment = new Dictionary<string, string>
            {
                ["CONFIG_TABLE_NAME"] = configTable.TableName
            }
        });

        // Grant Lambda read access to DynamoDB
        configTable.GrantReadData(configFetcher);

        // Amazon Connect instance
        var instance = new CfnInstance(this, "ConnectInstance", new CfnInstanceProps
        {
            IdentityManagementType = "CONNECT_MANAGED",
            InstanceAlias = "my-contact-center",
            Attributes = new CfnInstance.AttributesProperty
            {
                InboundCalls = true,
                OutboundCalls = true
            }
        });

        // Contact flow
        var flow = new CfnContactFlow(this, "WelcomeFlow", new CfnContactFlowProps
        {
            InstanceArn = instance.AttrArn,
            Name = "WelcomeFlow",
            Type = "CONTACT_FLOW",
            Content = GenerateFlowContent()
        });
    }
}
```

## Deployment Architecture

```
Development
    ↓
Write C# with Attributes/Builders
    ↓
Compile (Source Generators + Analyzers)
    ↓
CDK Synth (Generate CloudFormation)
    ↓
CDK Deploy
    ↓
┌─────────────────────────────────────┐
│           AWS Account                │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Amazon Connect Instance    │   │
│  │   • Contact Flows            │   │
│  │   • Queues                   │   │
│  │   • Routing Profiles         │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Lambda Functions           │   │
│  │   • ConfigFetcher            │   │
│  │   • Custom Integrations      │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   DynamoDB Tables            │   │
│  │   • ConnectFlowConfigs       │   │
│  │   • ConnectQueueConfigs      │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   S3 Buckets                 │   │
│  │   • Flow Templates           │   │
│  │   • Audio Prompts            │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   ElastiCache (Optional)     │   │
│  │   • Configuration Cache      │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

## Performance Considerations

### Lambda Cold Starts
- Target: <500ms cold start time
- Use Native AOT compilation for critical paths
- Implement Lambda SnapStart where available
- Provision concurrency for high-traffic flows

### Configuration Caching
- ElastiCache (Redis) for hot config
- TTL-based cache invalidation
- Cache-aside pattern implementation
- Fallback to DynamoDB on cache miss

### DynamoDB Optimization
- Use on-demand billing for variable traffic
- Implement efficient access patterns (PK/SK design)
- Batch operations where possible
- Use DynamoDB Streams for cache invalidation

## Security Architecture

```
┌─────────────────────────────────────────┐
│   IAM Roles & Policies                   │
│   • Least Privilege Principle            │
│   • Service-specific roles               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Encryption                             │
│   • At-rest: DynamoDB encryption         │
│   • In-transit: TLS 1.2+                 │
│   • KMS key management                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Network Security                       │
│   • VPC endpoints for AWS services       │
│   • Security groups                      │
│   • NACLs                                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Compliance                             │
│   • CloudTrail logging                   │
│   • Config rules                         │
│   • AWS Security Hub                     │
└──────────────────────────────────────────┘
```

## Extensibility Points

Switchboard is designed to be extended:

### Custom Attributes
```csharp
[AttributeUsage(AttributeTargets.Class)]
public class CustomRoutingAttribute : Attribute
{
    public Type RoutingStrategyType { get; set; }
}
```

### Custom Middleware
```csharp
public class CustomMiddleware : IFlowMiddleware
{
    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        // Custom logic before
        await next();
        // Custom logic after
    }
}
```

### Custom Source Generators
```csharp
[Generator]
public class CustomFlowGenerator : ISourceGenerator
{
    public void Initialize(GeneratorInitializationContext context) { }

    public void Execute(GeneratorExecutionContext context)
    {
        // Generate custom code
    }
}
```

### Custom Analyzers
```csharp
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class CustomFlowAnalyzer : DiagnosticAnalyzer
{
    public override void Initialize(AnalysisContext context)
    {
        // Custom validation rules
    }
}
```

## Next Steps

Now that you understand the architecture:

1. **[Dynamic Configuration](/guide/dynamic-configuration)** - Learn about runtime config management
2. **[Attribute-Based Design](/guide/attributes)** - Explore declarative configuration
3. **[Flow Basics](/guide/flows/basics)** - Start building contact flows
4. **[Source Generators](/guide/advanced/source-generators)** - Understand code generation

## Related Resources

- [Framework Patterns](/guide/patterns) - Design patterns used in Switchboard
- [Dependency Injection](/guide/advanced/dependency-injection) - DI integration details
- [Middleware Pipeline](/guide/advanced/middleware) - Middleware pattern implementation
