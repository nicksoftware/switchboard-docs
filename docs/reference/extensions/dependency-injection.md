# Dependency Injection Extensions

The `Switchboard.Extensions.DependencyInjection` package provides powerful IoC/DI integration for the Switchboard framework, enabling clean, testable, and maintainable code.

## Installation

```bash
dotnet add package Switchboard.Extensions.DependencyInjection
```

## Quick Start

### Ultra-Simple Setup (Recommended)

```csharp
using Microsoft.Extensions.Hosting;
using Switchboard.Extensions.DependencyInjection;

var builder = Host.CreateApplicationBuilder(args);

// One-liner: Switchboard + assembly scanning
builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
});

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();

// Auto-discover and configure everything
var stack = app.CreateAndConfigureStack(
    host.Services,
    "MyCallCenter",
    "my-instance-alias"
);

app.Synth();
```

## Extension Methods

### `AddSwitchboardWithScanning()`

Configures Switchboard and automatically scans your assembly for flow builders and providers.

**Signature:**
```csharp
public static IHostApplicationBuilder AddSwitchboardWithScanning(
    this IHostApplicationBuilder builder,
    Action<SwitchboardOptions>? configure = null)
```

**What it does:**
1. Registers Switchboard framework services in DI
2. Applies configuration options
3. Scans the entry assembly for classes ending in `*FlowBuilder` and `*Provider`
4. Registers all discovered classes as singletons

**Example:**
```csharp
builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "EnterpriseCallCenter";
    options.Region = "us-east-1";
    options.Environment = "Production";
});
```

---

### `AddSwitchboard()`

Registers Switchboard services without automatic scanning (for manual control).

**Signature:**
```csharp
public static ISwitchboardBuilder AddSwitchboard(
    this IServiceCollection services,
    Action<SwitchboardOptions> configure)
```

**Example:**
```csharp
builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddAssemblyScanning(typeof(Program).Assembly);
```

---

### `AddAssemblyScanning()`

Scans a specific assembly for flow builders and providers.

**Signature:**
```csharp
public static ISwitchboardBuilder AddAssemblyScanning(
    this ISwitchboardBuilder builder,
    Assembly assembly)
```

**What it discovers:**
- All classes ending with `FlowBuilder` (e.g., `SalesInboundFlowBuilder`)
- All classes ending with `Provider` (e.g., `QueueConfigurationProvider`, `HoursOfOperationProvider`)

**Example:**
```csharp
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly);
```

---

### `AddFlowBuilders()`

Manually registers specific flow builder types (alternative to assembly scanning).

**Signature:**
```csharp
public static ISwitchboardBuilder AddFlowBuilders(
    this ISwitchboardBuilder builder,
    params Type[] flowBuilderTypes)
```

**Example:**
```csharp
builder.Services.AddSwitchboard(options => { })
    .AddFlowBuilders(
        typeof(SalesInboundFlowBuilder),
        typeof(SupportInboundFlowBuilder)
    );
```

---

### `AddProviders()`

Manually registers specific provider types (alternative to assembly scanning).

**Signature:**
```csharp
public static ISwitchboardBuilder AddProviders(
    this ISwitchboardBuilder builder,
    params Type[] providerTypes)
```

**Example:**
```csharp
builder.Services.AddSwitchboard(options => { })
    .AddProviders(
        typeof(QueueConfigurationProvider),
        typeof(HoursOfOperationProvider)
    );
```

---

### `CreateAndConfigureStack()`

Creates a stack and automatically discovers and adds all resources from DI.

**Signature:**
```csharp
public static SwitchboardStack CreateAndConfigureStack(
    this ISwitchboardApp app,
    IServiceProvider serviceProvider,
    string stackName,
    string instanceAlias)
```

**What it does:**
1. Creates the CDK stack
2. Resolves all `*Provider` classes from DI
3. Invokes `GetBusinessHours()` or `GetExtendedHours()` methods → adds hours to stack
4. Invokes `GetAllQueues()` methods → adds queues to stack
5. Resolves all `*FlowBuilder` classes from DI
6. Invokes `Build()` on each → adds flows to stack

**Example:**
```csharp
var stack = app.CreateAndConfigureStack(
    host.Services,
    "EnterpriseCallCenter",
    "enterprise-demo"
);
```

---

## SwitchboardOptions

Configuration options for the framework.

```csharp
public class SwitchboardOptions
{
    /// <summary>
    /// Amazon Connect instance name/alias.
    /// </summary>
    public string? InstanceName { get; set; }

    /// <summary>
    /// AWS region for deployment (default: "us-east-1").
    /// </summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>
    /// AWS account ID.
    /// </summary>
    public string? AwsAccount { get; set; }

    /// <summary>
    /// Environment name (Development, Staging, Production).
    /// </summary>
    public string Environment { get; set; } = "Development";

    /// <summary>
    /// Enable automatic assembly scanning (default: true).
    /// </summary>
    public bool EnableAssemblyScanning { get; set; } = true;
}
```

---

## Usage Patterns

### Pattern 1: Ultra-Simple (Recommended)

Best for most projects. One-liner setup with auto-discovery.

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
});

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateAndConfigureStack(host.Services, "MyCallCenter", "my-alias");

app.Synth();
```

**Pros:**
- ✅ Minimal code (< 15 lines)
- ✅ Convention-based discovery
- ✅ Clean and maintainable

---

### Pattern 2: Manual Control

When you need explicit control over what gets registered.

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddFlowBuilders(
    typeof(SalesFlowBuilder),
    typeof(SupportFlowBuilder)
)
.AddProviders(
    typeof(QueueConfigurationProvider)
);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();

// Still auto-configures stack
var stack = app.CreateAndConfigureStack(host.Services, "MyCallCenter", "my-alias");

app.Synth();
```

**Pros:**
- ✅ Explicit registration (easy to understand what's included)
- ✅ Still uses auto-configuration for stack
- ✅ Good for smaller projects

---

### Pattern 3: Full Manual

Maximum control - manually resolve and add everything.

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddAssemblyScanning(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Manually resolve and add hours
var hoursProvider = host.Services.GetRequiredService<HoursOfOperationProvider>();
var businessHours = hoursProvider.GetBusinessHours();
stack.AddHoursOfOperation(businessHours);

// Manually resolve and add queues
var queueProvider = host.Services.GetRequiredService<QueueConfigurationProvider>();
foreach (var queue in queueProvider.GetAllQueues())
{
    stack.AddQueue(queue, businessHours.Name);
}

// Manually resolve and build flows
var salesFlow = host.Services.GetRequiredService<SalesFlowBuilder>().Build();
stack.AddFlow(salesFlow);

app.Synth();
```

**Pros:**
- ✅ Maximum control over ordering
- ✅ Can conditionally add resources
- ✅ Good for complex scenarios

---

## Conventions

The framework follows these conventions:

### Flow Builders
Classes ending with `FlowBuilder` are automatically discovered and registered.

```csharp
public class SalesInboundFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("SalesInbound")
            // ...
            .Build();
    }
}
```

### Providers
Classes ending with `Provider` are automatically discovered and registered.

```csharp
public class QueueConfigurationProvider
{
    public List<IQueue> GetAllQueues()
    {
        return new List<IQueue>
        {
            new QueueBuilder().SetName("Sales").Build(),
            new QueueBuilder().SetName("Support").Build()
        };
    }
}

public class HoursOfOperationProvider
{
    public HoursOfOperation GetBusinessHours()
    {
        var hours = new HoursOfOperation
        {
            Name = "BusinessHours",
            TimeZone = "America/New_York"
        };
        // Configure hours...
        return hours;
    }
}
```

---

## Benefits

1. **Testability**: All components can be mocked/injected for unit testing
2. **Maintainability**: Clear separation of concerns
3. **Convention-based**: Minimal configuration needed
4. **Type-safe**: Compile-time checking
5. **Flexible**: Three levels of control (ultra-simple, manual, full manual)

---

## Next Steps

- [Assembly Scanning Details](./assembly-scanning)
- [Stack Extensions](./stack-extensions)
- [Enterprise Example](../../examples/enterprise-fluent)
