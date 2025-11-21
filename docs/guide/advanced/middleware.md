# Middleware Pipeline

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

The Switchboard framework includes an ASP.NET Core-style middleware pipeline for handling cross-cutting concerns during flow construction. Middleware components can inspect, modify, validate, log, and enhance flows automatically.

## Overview

Middleware provides a clean way to add behavior to your flow building process without cluttering your business logic. Common use cases include:

- **Logging**: Track flow build operations and timing
- **Validation**: Ensure flows meet structural and business requirements
- **Metrics**: Collect performance and usage data
- **Security Auditing**: Track sensitive operations for compliance
- **Enrichment**: Automatically add metadata tags and attributes
- **Caching**: Cache frequently built flows
- **A/B Testing**: Assign variant tags for experimentation
- **Multi-tenancy**: Add tenant-specific configuration

## Quick Start

### 1. Register Middleware with Dependency Injection

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Switchboard.Extensions.DependencyInjection;

var builder = Host.CreateApplicationBuilder(args);

// Register Switchboard with middleware
builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyCallCenter";
    options.Region = "us-east-1";
})
.UseLogging()      // Built-in logging middleware
.UseValidation()   // Built-in validation middleware
.UseMetrics();     // Built-in metrics middleware

var host = builder.Build();
```

### 2. Build Flows - Middleware Runs Automatically

```csharp
var flow = new FlowBuilder()
    .SetName("WelcomeFlow")
    .SetType(FlowType.ContactFlow)
    .PlayPrompt(prompt => prompt.Text = "Welcome!")
    .Disconnect()
    .Build();  // ← Middleware pipeline executes here
```

That's it! The middleware pipeline automatically executes during `.Build()`.

## Built-in Middleware

### LoggingMiddleware

Logs flow build operations with timing information.

**What it logs**:
- Flow build started (INFO)
- Flow name and operation ID (INFO)
- Action count (DEBUG)
- Build completion with elapsed time (INFO)
- Errors during build (ERROR)

**Registration**:
```csharp
builder.Services.AddSwitchboard()
    .UseLogging();
```

**Example output**:
```
[INFO] Flow 'WelcomeFlow' build started (OperationId: abc123)
[DEBUG] Flow 'WelcomeFlow' has 5 actions
[INFO] Flow 'WelcomeFlow' build completed in 18ms
```

### ValidationMiddleware

Validates flow structure and action configuration at build time.

**Validations performed**:
- ✅ Flow contains at least one action
- ✅ Flow ends with a terminal action (Disconnect, TransferToQueue, TransferToFlow)
- ✅ PlayPromptAction has Text, Translations, or DynamicTextAttribute
- ✅ SetQueueAction has QueueArn or DynamicQueueAttribute
- ✅ InvokeLambdaAction has FunctionArn

**Registration**:
```csharp
builder.Services.AddSwitchboard()
    .UseValidation();
```

**Example error**:
```csharp
// This will throw FlowValidationException
var flow = new FlowBuilder()
    .SetName("InvalidFlow")
    .PlayPrompt(prompt => prompt.Text = "Hello")
    // Missing terminal action!
    .Build(); // ← Throws: "Flow must end with a terminal action"
```

### MetricsMiddleware

Collects performance metrics for flow build operations.

**Metrics collected**:
- **FlowName**: Name of the flow
- **ActionCount**: Number of actions in the flow
- **BuildTimeMs**: Time taken to build the flow
- **Success**: Whether the build succeeded
- **OperationId**: Unique identifier for the operation

**Registration**:
```csharp
builder.Services.AddSwitchboard()
    .UseMetrics();
```

## Creating Custom Middleware

### Step 1: Implement IFlowMiddleware

```csharp
using Microsoft.Extensions.Logging;
using Switchboard.Middleware;

public class FlowEnrichmentMiddleware : IFlowMiddleware
{
    private readonly ILogger<FlowEnrichmentMiddleware> _logger;

    public FlowEnrichmentMiddleware(ILogger<FlowEnrichmentMiddleware> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        _logger.LogInformation("Enriching flow '{FlowName}'", context.FlowName);

        // Add metadata tags
        context.Flow.Tags["Environment"] = "Production";
        context.Flow.Tags["Owner"] = "CustomerSupport";
        context.Flow.Tags["CreatedAt"] = DateTimeOffset.UtcNow.ToString("O");

        // Store data for downstream middleware
        context.SetData("EnrichmentApplied", true);

        // Call next middleware in the pipeline
        await next();
    }
}
```

### Step 2: Register the Middleware

```csharp
builder.Services.AddSwitchboard()
    .UseLogging()
    .UseValidation()
    .UseMiddleware<FlowEnrichmentMiddleware>()  // Your custom middleware
    .UseMetrics();
```

### Step 3: Use It - No Additional Code Needed

```csharp
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Hello")
    .Disconnect()
    .Build();  // ← Your middleware executes automatically

// Flow now has tags: Environment, Owner, CreatedAt
Console.WriteLine(flow.Tags["Environment"]); // "Production"
```

## FlowContext API

The `FlowContext` object is passed through the middleware pipeline:

```csharp
public class FlowContext
{
    public IFlow Flow { get; }
    public string FlowName { get; }
    public string OperationId { get; }
    public DateTimeOffset StartedAt { get; }
    public TimeSpan Elapsed { get; }

    // Data storage methods
    public void SetData(string key, object value);
    public T? GetData<T>(string key);
    public bool TryGetData<T>(string key, out T? value);
    public bool HasData(string key);

    // Contact attributes
    public void SetContactAttribute(string key, string value);
    public string? GetContactAttribute(string key);
}
```

## Middleware Pipeline Order

Middleware executes in the order registered:

```csharp
builder.Services.AddSwitchboard()
    .UseLogging()                              // 1
    .UseValidation()                           // 2
    .UseMiddleware<FlowEnrichmentMiddleware>() // 3
    .UseMiddleware<SecurityAuditMiddleware>()  // 4
    .UseMetrics();                             // 5
```

**Execution flow**:
```
LoggingMiddleware (before)       ← Logs "build started"
  ↓
ValidationMiddleware (before)    ← Validates structure
  ↓
FlowEnrichmentMiddleware (before) ← Adds tags
  ↓
SecurityAuditMiddleware (before)  ← Audits security
  ↓
MetricsMiddleware (before)        ← Starts metrics timer
  ↓
[Flow is fully constructed]
  ↓
MetricsMiddleware (after)         ← Records metrics
  ↓
SecurityAuditMiddleware (after)   ← Finalizes audit
  ↓
FlowEnrichmentMiddleware (after)
  ↓
ValidationMiddleware (after)
  ↓
LoggingMiddleware (after)         ← Logs "build completed"
```

## Advanced Patterns

### Short-Circuiting

Stop the pipeline by not calling `next()`:

```csharp
public class ConditionalMiddleware : IFlowMiddleware
{
    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        if (ShouldProcessFlow(context.Flow))
        {
            await next();  // Continue
        }
        else
        {
            _logger.LogWarning("Flow processing skipped");
            // Don't call next() - pipeline stops here
        }
    }
}
```

### Error Handling

```csharp
public class ErrorHandlingMiddleware : IFlowMiddleware
{
    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        try
        {
            await next();
        }
        catch (FlowValidationException ex)
        {
            _logger.LogError(ex, "Validation failed");
            context.SetData("ValidationError", ex.Message);
            throw; // Re-throw or handle
        }
    }
}
```

### Middleware with Configuration

```csharp
public class ConfigurableMiddleware : IFlowMiddleware
{
    private readonly MyMiddlewareOptions _options;

    public ConfigurableMiddleware(IOptions<MyMiddlewareOptions> options)
    {
        _options = options.Value;
    }

    public async Task InvokeAsync(FlowContext context, Func<Task> next)
    {
        if (_options.Enabled)
        {
            // Do work
        }
        await next();
    }
}

// Registration
builder.Services.Configure<MyMiddlewareOptions>(options =>
{
    options.Enabled = true;
    options.Threshold = 100;
});

builder.Services.AddSwitchboard()
    .UseMiddleware<ConfigurableMiddleware>();
```

## Backward Compatibility

Middleware is **completely optional** and **100% backward compatible**:

```csharp
// Old way - still works!
var app = new SwitchboardApp();
var flow = new FlowBuilder()
    .SetName("MyFlow")
    .PlayPrompt("Hello")
    .Disconnect()
    .Build();  // No middleware executes

// New way - opt-in middleware
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSwitchboard().UseValidation();
var host = builder.Build();

var flow2 = new FlowBuilder()
    .SetName("MyFlow2")
    .PlayPrompt("Hello")
    .Disconnect()
    .Build();  // ValidationMiddleware executes
```

## Examples

See complete working examples:
- **[SimpleMiddlewareExample](/examples/SimpleMiddlewareExample)**: Basic usage with built-in middleware
- **[CustomMiddlewareExample](/examples/CustomMiddlewareExample)**: Creating custom middleware

## Next Steps

- **[Dependency Injection](/guide/advanced/dependency-injection)** - DI integration
- **[Architecture](/guide/architecture)** - Framework patterns
