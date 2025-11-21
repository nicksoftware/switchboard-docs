# Assembly Scanning

The `Switchboard.Extensions.DependencyInjection` package provides powerful assembly scanning capabilities to automatically discover and register your flow builders and providers.

## Overview

Assembly scanning uses reflection to find classes in your project that follow naming conventions:

- Classes ending with `FlowBuilder` are registered as flow builders
- Classes ending with `Provider` are registered as providers (for queues, hours, etc.)

## How It Works

### Automatic Discovery

When you call `AddAssemblyScanning()` or `AddSwitchboardWithScanning()`, the framework:

1. **Scans** the specified assembly for types
2. **Filters** types by naming patterns (`*FlowBuilder`, `*Provider`)
3. **Registers** matching types as singletons in DI
4. **Makes available** for dependency injection and auto-configuration

### Naming Conventions

#### Flow Builders

Any public class ending with `FlowBuilder`:

```csharp
public class SalesInboundFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("Sales Inbound")
            .PlayPrompt("Welcome to sales")
            .ThenTransferToQueue("Sales")
            .Build();
    }
}

public class SupportFlowBuilder  // ✅ Discovered
{
    public IFlow Build() { /* ... */ }
}

public class CustomOrderFlowBuilder  // ✅ Discovered
{
    public IFlow Build() { /* ... */ }
}
```

#### Providers

Any public class ending with `Provider`:

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

public class HoursOfOperationProvider  // ✅ Discovered
{
    public HoursOfOperation GetBusinessHours()
    {
        return new HoursOfOperation
        {
            Name = "BusinessHours",
            TimeZone = "America/New_York"
            // Configure hours...
        };
    }
}

public class RoutingProfileProvider  // ✅ Discovered
{
    public List<RoutingProfile> GetProfiles() { /* ... */ }
}
```

---

## Usage Patterns

### Pattern 1: Automatic Scanning (Recommended)

Use `AddSwitchboardWithScanning()` to automatically scan the entry assembly:

```csharp
var builder = Host.CreateApplicationBuilder(args);

// Automatically scans Assembly.GetEntryAssembly()
builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
});
```

**What gets scanned:** The assembly containing your `Program.cs`

---

### Pattern 2: Manual Assembly Specification

Scan a specific assembly:

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.AddAssemblyScanning(typeof(Program).Assembly);
```

---

### Pattern 3: Multiple Assemblies

Scan multiple assemblies (useful for large projects):

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly)           // Main assembly
    .AddAssemblyScanning(typeof(SharedFlows).Assembly)       // Shared flows assembly
    .AddAssemblyScanning(typeof(ExternalProviders).Assembly); // External providers
```

---

### Pattern 4: Mixed Registration

Combine automatic scanning with manual registration:

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly)  // Auto-discover most
    .AddFlowBuilders(typeof(SpecialFlowBuilder))    // Manually add specific flow
    .AddProviders(typeof(ExternalQueueProvider));   // Manually add external provider
```

---

## Discovery Rules

### What Gets Discovered

✅ **Discovered:**

- Public classes
- Ending with `FlowBuilder` or `Provider`
- In the scanned assembly
- Have a parameterless constructor OR resolvable constructor parameters

❌ **Not Discovered:**

- Abstract classes
- Internal/private classes
- Interfaces
- Classes without proper naming suffix
- Generic type definitions

### Registration Behavior

All discovered types are registered as **Singletons**:

```csharp
// Equivalent to:
services.AddSingleton<SalesInboundFlowBuilder>();
services.AddSingleton<QueueConfigurationProvider>();
```

---

## Advanced Scenarios

### Dependency Injection in Builders

Flow builders and providers can have constructor dependencies:

```csharp
public class SalesInboundFlowBuilder
{
    private readonly ILogger<SalesInboundFlowBuilder> _logger;
    private readonly IConfiguration _configuration;

    public SalesInboundFlowBuilder(
        ILogger<SalesInboundFlowBuilder> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public IFlow Build()
    {
        _logger.LogInformation("Building sales flow");
        var queueName = _configuration["Queues:Sales"];

        return new FlowBuilder()
            .SetName("Sales Inbound")
            .ThenTransferToQueue(queueName)
            .Build();
    }
}
```

**Requirements:**

- All constructor parameters must be registered in DI
- Framework will resolve dependencies automatically

---

### Organizing Large Projects

#### Option 1: Feature Folders

```
MyContactCenter/
├── Features/
│   ├── Sales/
│   │   ├── SalesInboundFlowBuilder.cs
│   │   ├── SalesOutboundFlowBuilder.cs
│   │   └── SalesQueueProvider.cs
│   ├── Support/
│   │   ├── SupportFlowBuilder.cs
│   │   └── SupportQueueProvider.cs
│   └── Shared/
│       ├── HoursOfOperationProvider.cs
│       └── RoutingProfileProvider.cs
└── Program.cs
```

All discovered automatically with:

```csharp
builder.AddSwitchboardWithScanning(options => { });
```

#### Option 2: Separate Assemblies

```
Solution/
├── MyContactCenter.Flows/        # Assembly 1
│   ├── SalesFlowBuilder.cs
│   └── SupportFlowBuilder.cs
├── MyContactCenter.Configuration/ # Assembly 2
│   ├── QueueProvider.cs
│   └── HoursProvider.cs
└── MyContactCenter.Main/          # Assembly 3 (entry)
    └── Program.cs
```

Scan all assemblies:

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(Program).Assembly)
    .AddAssemblyScanning(typeof(SalesFlowBuilder).Assembly)
    .AddAssemblyScanning(typeof(QueueProvider).Assembly);
```

---

## Debugging Assembly Scanning

### Enable Logging

```csharp
var builder = Host.CreateApplicationBuilder(args);

// Enable detailed logging
builder.Logging.SetMinimumLevel(LogLevel.Trace);

builder.AddSwitchboardWithScanning(options =>
{
    options.InstanceName = "MyCallCenter";
});

var host = builder.Build();

// Verify what was registered
var flowBuilders = host.Services.GetServices<object>()
    .Where(s => s.GetType().Name.EndsWith("FlowBuilder"));

foreach (var fb in flowBuilders)
{
    Console.WriteLine($"Discovered: {fb.GetType().Name}");
}
```

### Verify Registration

Check what got registered:

```csharp
var host = builder.Build();

// Try resolving a specific builder
var salesFlow = host.Services.GetService<SalesInboundFlowBuilder>();
if (salesFlow != null)
{
    Console.WriteLine("✓ SalesInboundFlowBuilder registered");
}
else
{
    Console.WriteLine("✗ SalesInboundFlowBuilder NOT found");
}
```

---

## Common Issues

### Issue 1: Class Not Discovered

**Problem:** Your class isn't being found

**Checklist:**

- ✅ Class name ends with `FlowBuilder` or `Provider`
- ✅ Class is `public` (not `internal` or `private`)
- ✅ Class is in the scanned assembly
- ✅ Class is not abstract
- ✅ Constructor dependencies are registered in DI

**Example Fix:**

```csharp
// ❌ Won't be discovered (internal)
internal class SalesFlowBuilder { }

// ✅ Will be discovered
public class SalesFlowBuilder { }
```

---

### Issue 2: Constructor Resolution Fails

**Problem:** `Unable to resolve service for type 'X' while attempting to activate 'YFlowBuilder'`

**Solution:** Register missing dependency:

```csharp
builder.Services.AddSingleton<ICustomService, CustomService>();

builder.AddSwitchboardWithScanning(options => { });
```

---

### Issue 3: Wrong Assembly Scanned

**Problem:** Classes in different project not found

**Solution:** Explicitly scan that assembly:

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddAssemblyScanning(typeof(ClassInThatAssembly).Assembly);
```

---

## Performance Considerations

### Scanning Cost

Assembly scanning uses reflection and has a **one-time startup cost**:

- **Small projects** (< 50 types): ~1-2ms
- **Large projects** (> 500 types): ~10-20ms

This happens once at application startup.

### Optimization Tips

1. **Limit scanned assemblies** - Only scan assemblies that contain flows/providers
2. **Use manual registration** for performance-critical scenarios
3. **Avoid scanning large third-party assemblies**

```csharp
// ❌ Don't scan everything
.AddAssemblyScanning(AppDomain.CurrentDomain.GetAssemblies())

// ✅ Scan only your assemblies
.AddAssemblyScanning(typeof(Program).Assembly)
```

---

## Convention Customization

### Custom Naming Patterns (Future)

Currently, the framework supports:

- `*FlowBuilder`
- `*Provider`

**Planned:** Support for custom patterns via configuration:

```csharp
builder.Services.AddSwitchboard(options =>
{
    options.ScanPatterns = new[] { "*FlowBuilder", "*Provider", "*Handler" };
});
```

---

## Best Practices

### 1. Consistent Naming

Follow conventions strictly:

```csharp
// ✅ Good naming
public class SalesInboundFlowBuilder { }
public class QueueConfigurationProvider { }

// ❌ Bad naming (won't be discovered)
public class SalesFlow { }
public class QueueConfig { }
```

### 2. Organize by Feature

Group related builders and providers:

```
Features/
├── Sales/
│   ├── SalesFlowBuilder.cs
│   └── SalesQueueProvider.cs
└── Support/
    ├── SupportFlowBuilder.cs
    └── SupportQueueProvider.cs
```

### 3. Use Dependency Injection

Inject dependencies instead of hardcoding:

```csharp
public class SalesFlowBuilder
{
    private readonly IConfiguration _config;

    public SalesFlowBuilder(IConfiguration config)
    {
        _config = config;
    }

    public IFlow Build()
    {
        var queueName = _config["Queues:Sales"];
        // Use config...
    }
}
```

### 4. Keep Builders Simple

Builders should focus on flow definition:

```csharp
// ✅ Good - simple builder
public class SalesFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("Sales")
            .PlayPrompt("Welcome")
            .Build();
    }
}

// ❌ Bad - too much logic
public class SalesFlowBuilder
{
    public IFlow Build()
    {
        // Don't do heavy computation here
        var data = FetchFromDatabase();
        var processed = ComplexProcessing(data);
        // ...
    }
}
```

---

## Next Steps

- [Dependency Injection Reference](./dependency-injection)
- [Stack Extensions](./stack-extensions)
- [Enterprise Example](../../examples/enterprise-fluent)
