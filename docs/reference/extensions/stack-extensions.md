# Stack Extensions

Stack extensions provide convenient methods for adding resources to your `SwitchboardStack` from the DI container, enabling a more fluid development experience.

## Overview

Stack extensions allow you to:

- Add all flows automatically from DI
- Add specific flows by type
- Add queues from provider classes
- Add hours of operation from provider classes
- Keep your Program.cs clean and declarative

## Extension Methods

### `AddFlowsFromDI()`

Automatically discovers and adds all flows from flow builders registered in DI.

**Signature:**

```csharp
public static SwitchboardStack AddFlowsFromDI(
    this SwitchboardStack stack,
    IServiceProvider serviceProvider)
```

**What it does:**

1. Finds all registered services with names ending in `FlowBuilder`
2. Resolves each builder from DI
3. Invokes the `Build()` method
4. Adds the resulting flow to the stack

**Example:**

```csharp
var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Add all flows automatically
stack.AddFlowsFromDI(host.Services);
```

**Use case:** When you want to add all flows without explicitly listing them.

---

### `AddFlow<TFlowBuilder>()`

Adds a specific flow by resolving its builder from DI.

**Signature:**

```csharp
public static SwitchboardStack AddFlow<TFlowBuilder>(
    this SwitchboardStack stack,
    IServiceProvider serviceProvider)
    where TFlowBuilder : class
```

**What it does:**

1. Resolves `TFlowBuilder` from DI
2. Invokes the `Build()` method via reflection
3. Adds the flow to the stack

**Example:**

```csharp
stack.AddFlow<SalesInboundFlowBuilder>(host.Services)
     .AddFlow<SupportFlowBuilder>(host.Services);
```

**Use case:** When you want explicit control over which flows are added.

---

### `AddQueuesFromProvider<TQueueProvider>()`

Adds queues from a provider class registered in DI.

**Signature:**

```csharp
public static SwitchboardStack AddQueuesFromProvider<TQueueProvider>(
    this SwitchboardStack stack,
    IServiceProvider serviceProvider,
    string hoursOfOperationName)
    where TQueueProvider : class
```

**What it does:**

1. Resolves `TQueueProvider` from DI
2. Invokes the `GetAllQueues()` method
3. Adds each queue to the stack with the specified hours of operation

**Example:**

```csharp
// Assuming QueueConfigurationProvider has GetAllQueues() method
stack.AddQueuesFromProvider<QueueConfigurationProvider>(
    host.Services,
    "BusinessHours"
);
```

**Provider Requirements:**

```csharp
public class QueueConfigurationProvider
{
    // Must have this method signature
    public List<IQueue> GetAllQueues()
    {
        return new List<IQueue>
        {
            new QueueBuilder().SetName("Sales").Build(),
            new QueueBuilder().SetName("Support").Build()
        };
    }
}
```

**Use case:** When you want to centralize queue configuration in a provider class.

---

### `AddHoursFromProvider<THoursProvider>()`

Adds hours of operation from a provider class registered in DI.

**Signature:**

```csharp
public static HoursOfOperation AddHoursFromProvider<THoursProvider>(
    this SwitchboardStack stack,
    IServiceProvider serviceProvider,
    string methodName = "GetBusinessHours")
    where THoursProvider : class
```

**What it does:**

1. Resolves `THoursProvider` from DI
2. Invokes the specified method (default: `GetBusinessHours()`)
3. Adds the hours to the stack
4. Returns the hours object for chaining

**Example:**

```csharp
var businessHours = stack.AddHoursFromProvider<HoursOfOperationProvider>(
    host.Services
);

// Or specify a different method
var extendedHours = stack.AddHoursFromProvider<HoursOfOperationProvider>(
    host.Services,
    "GetExtendedHours"
);
```

**Provider Requirements:**

```csharp
public class HoursOfOperationProvider
{
    // Must return HoursOfOperation
    public HoursOfOperation GetBusinessHours()
    {
        return new HoursOfOperation
        {
            Name = "BusinessHours",
            TimeZone = "America/New_York",
            Config = new HoursOfOperationConfig
            {
                Monday = new TimeRange { Start = "09:00", End = "17:00" },
                // ...
            }
        };
    }

    // Optional: Additional hours configurations
    public HoursOfOperation GetExtendedHours()
    {
        return new HoursOfOperation { /* ... */ };
    }
}
```

**Use case:** When you want to centralize hours configuration in a provider class.

---

## Usage Patterns

### Pattern 1: Fully Manual Control

Complete control over what gets added and when:

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

// Step 1: Add hours
var businessHours = stack.AddHoursFromProvider<HoursOfOperationProvider>(host.Services);

// Step 2: Add queues (using the hours from step 1)
stack.AddQueuesFromProvider<QueueConfigurationProvider>(host.Services, businessHours.Name);

// Step 3: Add specific flows
stack.AddFlow<SalesInboundFlowBuilder>(host.Services)
     .AddFlow<SupportFlowBuilder>(host.Services);

// Step 4: Synth
app.Synth();
```

**Pros:**

- ✅ Maximum control
- ✅ Clear ordering
- ✅ Easy to debug

**Cons:**

- ❌ More verbose
- ❌ Need to add each flow explicitly

---

### Pattern 2: Semi-Automatic

Automatically add all flows, but manually control hours/queues:

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly);

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Manual: Add hours and queues
var hours = stack.AddHoursFromProvider<HoursOfOperationProvider>(host.Services);
stack.AddQueuesFromProvider<QueueConfigurationProvider>(host.Services, hours.Name);

// Automatic: Add all flows
stack.AddFlowsFromDI(host.Services);

app.Synth();
```

**Pros:**

- ✅ Automatic flow discovery
- ✅ Control over infrastructure setup

**Cons:**

- ❌ Still manual hours/queue setup

---

### Pattern 3: Fully Automatic (Recommended)

Use `CreateAndConfigureStack()` for complete automation:

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
});

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();

// Everything added automatically
var stack = app.CreateAndConfigureStack(
    host.Services,
    "MyCallCenter",
    "my-alias"
);

app.Synth();
```

**Pros:**

- ✅ Minimal code
- ✅ Convention-based
- ✅ Easy to maintain

**Cons:**

- ❌ Less explicit control
- ❌ Relies on naming conventions

---

## Combining Manual and Automatic

Mix automatic discovery with manual additions:

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.AddSwitchboardWithScanning(options => { });

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();

// Automatic setup
var stack = app.CreateAndConfigureStack(host.Services, "MyCallCenter", "my-alias");

// Manual additions (on top of automatic)
var vipQueue = new QueueBuilder()
    .SetName("VIP")
    .SetMaxContacts(10)
    .Build();

stack.AddQueue(vipQueue, "BusinessHours");

// Add special flow not discovered by scanning
var specialFlow = new FlowBuilder()
    .SetName("Special VIP Flow")
    .PlayPrompt("VIP Welcome")
    .ThenTransferToQueue("VIP")
    .Build();

stack.AddFlow(specialFlow);

app.Synth();
```

---

## Advanced Scenarios

### Conditional Flow Addition

Add flows based on environment or configuration:

```csharp
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Add hours and queues
var hours = stack.AddHoursFromProvider<HoursOfOperationProvider>(host.Services);
stack.AddQueuesFromProvider<QueueConfigurationProvider>(host.Services, hours.Name);

// Add flows conditionally
if (builder.Environment.IsProduction())
{
    stack.AddFlow<ProductionSalesFlowBuilder>(host.Services);
}
else
{
    stack.AddFlow<DevelopmentSalesFlowBuilder>(host.Services);
}

// Always add support flow
stack.AddFlow<SupportFlowBuilder>(host.Services);
```

---

### Multiple Providers

Use multiple provider classes for organization:

```csharp
// Add hours from main provider
var businessHours = stack.AddHoursFromProvider<BusinessHoursProvider>(host.Services);
var extendedHours = stack.AddHoursFromProvider<ExtendedHoursProvider>(host.Services);

// Add queues from different providers
stack.AddQueuesFromProvider<SalesQueueProvider>(host.Services, businessHours.Name);
stack.AddQueuesFromProvider<SupportQueueProvider>(host.Services, extendedHours.Name);

// Add all flows
stack.AddFlowsFromDI(host.Services);
```

**Provider Organization:**

```csharp
// SalesQueueProvider.cs
public class SalesQueueProvider
{
    public List<IQueue> GetAllQueues()
    {
        return new List<IQueue>
        {
            new QueueBuilder().SetName("Sales").Build(),
            new QueueBuilder().SetName("VIP Sales").Build()
        };
    }
}

// SupportQueueProvider.cs
public class SupportQueueProvider
{
    public List<IQueue> GetAllQueues()
    {
        return new List<IQueue>
        {
            new QueueBuilder().SetName("Technical Support").Build(),
            new QueueBuilder().SetName("Billing Support").Build()
        };
    }
}
```

---

### Dependency Injection in Providers

Providers can have constructor dependencies:

```csharp
public class QueueConfigurationProvider
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<QueueConfigurationProvider> _logger;

    public QueueConfigurationProvider(
        IConfiguration configuration,
        ILogger<QueueConfigurationProvider> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public List<IQueue> GetAllQueues()
    {
        _logger.LogInformation("Building queue configuration");

        var queues = new List<IQueue>();

        // Load queue names from config
        var queueNames = _configuration.GetSection("Queues").Get<string[]>();

        foreach (var name in queueNames)
        {
            queues.Add(new QueueBuilder().SetName(name).Build());
        }

        return queues;
    }
}
```

**appsettings.json:**

```json
{
  "Queues": ["Sales", "Support", "Billing", "Technical"]
}
```

---

## Error Handling

### Missing Provider Method

If the provider doesn't have the expected method:

```csharp
// ❌ This will throw
stack.AddQueuesFromProvider<MyProvider>(host.Services, "Hours");

// Exception: Method 'GetAllQueues' not found on type 'MyProvider'
```

**Solution:** Ensure provider has the correct method:

```csharp
public class MyProvider
{
    // Must be named exactly this
    public List<IQueue> GetAllQueues() { /* ... */ }
}
```

---

### Provider Not Registered

If the provider isn't registered in DI:

```csharp
// ❌ This will throw
stack.AddQueuesFromProvider<UnregisteredProvider>(host.Services, "Hours");

// Exception: Unable to resolve service for type 'UnregisteredProvider'
```

**Solution:** Register provider or use assembly scanning:

```csharp
// Option 1: Manual registration
builder.Services.AddSingleton<UnregisteredProvider>();

// Option 2: Assembly scanning (auto-discovers *Provider)
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly);
```

---

## Best Practices

### 1. Use Provider Pattern for Configuration

Centralize configuration in provider classes:

```csharp
// ✅ Good - centralized
public class QueueConfigurationProvider
{
    public List<IQueue> GetAllQueues()
    {
        return new List<IQueue>
        {
            new QueueBuilder().SetName("Sales").SetMaxContacts(50).Build(),
            new QueueBuilder().SetName("Support").SetMaxContacts(100).Build()
        };
    }
}

stack.AddQueuesFromProvider<QueueConfigurationProvider>(host.Services, "Hours");

// ❌ Bad - scattered
var queue1 = new QueueBuilder().SetName("Sales").Build();
var queue2 = new QueueBuilder().SetName("Support").Build();
stack.AddQueue(queue1, "Hours");
stack.AddQueue(queue2, "Hours");
```

### 2. Return Hours from Provider Methods

Enables chaining:

```csharp
// ✅ Good - chainable
var hours = stack.AddHoursFromProvider<HoursProvider>(host.Services);
stack.AddQueuesFromProvider<QueueProvider>(host.Services, hours.Name);

// ❌ Bad - need to know hours name
stack.AddHoursFromProvider<HoursProvider>(host.Services);
stack.AddQueuesFromProvider<QueueProvider>(host.Services, "BusinessHours"); // Hardcoded
```

### 3. Use Method Chaining

Keep setup code fluent:

```csharp
// ✅ Good - fluent
stack.AddHoursFromProvider<HoursProvider>(host.Services)
     .AddFlow<SalesFlowBuilder>(host.Services)
     .AddFlow<SupportFlowBuilder>(host.Services);

// ❌ Bad - verbose
var hours = stack.AddHoursFromProvider<HoursProvider>(host.Services);
stack.AddFlow<SalesFlowBuilder>(host.Services);
stack.AddFlow<SupportFlowBuilder>(host.Services);
```

### 4. Prefer Automatic Discovery

Use `CreateAndConfigureStack()` unless you need control:

```csharp
// ✅ Best - automatic (for most cases)
var stack = app.CreateAndConfigureStack(host.Services, "Stack", "alias");

// ✅ Good - when you need control
var stack = app.CreateStack("Stack", "alias");
stack.AddHoursFromProvider<HoursProvider>(host.Services);
// ... manual additions

// ❌ Bad - unnecessarily manual
var hours = host.Services.GetRequiredService<HoursProvider>().GetBusinessHours();
stack.AddHoursOfOperation(hours);
var queues = host.Services.GetRequiredService<QueueProvider>().GetAllQueues();
foreach (var q in queues) stack.AddQueue(q, hours.Name);
```

---

## Comparison: Manual vs Stack Extensions

### Without Stack Extensions

```csharp
var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Manually resolve and invoke
var hoursProvider = host.Services.GetRequiredService<HoursOfOperationProvider>();
var businessHours = hoursProvider.GetBusinessHours();
stack.AddHoursOfOperation(businessHours);

var queueProvider = host.Services.GetRequiredService<QueueConfigurationProvider>();
foreach (var queue in queueProvider.GetAllQueues())
{
    stack.AddQueue(queue, businessHours.Name);
}

var salesFlow = host.Services.GetRequiredService<SalesInboundFlowBuilder>().Build();
stack.AddFlow(salesFlow);

var supportFlow = host.Services.GetRequiredService<SupportFlowBuilder>().Build();
stack.AddFlow(supportFlow);

app.Synth();
```

**Line count:** ~17 lines

---

### With Stack Extensions

```csharp
var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
var stack = app.CreateStack("MyCallCenter", "my-alias");

// Simplified
var hours = stack.AddHoursFromProvider<HoursOfOperationProvider>(host.Services);
stack.AddQueuesFromProvider<QueueConfigurationProvider>(host.Services, hours.Name);
stack.AddFlow<SalesInboundFlowBuilder>(host.Services)
     .AddFlow<SupportFlowBuilder>(host.Services);

app.Synth();
```

**Line count:** ~9 lines

---

### With Full Automation

```csharp
var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();

var stack = app.CreateAndConfigureStack(host.Services, "MyCallCenter", "my-alias");

app.Synth();
```

**Line count:** ~5 lines

---

## Next Steps

- [Dependency Injection Reference](./dependency-injection)
- [Assembly Scanning Details](./assembly-scanning)
- [Enterprise Example](../../examples/enterprise-fluent)
