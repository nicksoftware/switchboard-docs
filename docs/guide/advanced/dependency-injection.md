# Dependency Injection

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard integrates seamlessly with `Microsoft.Extensions.DependencyInjection`, the standard dependency injection container for .NET applications. This enables clean architecture, testability, and configuration management.

## Setup

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NickSoftware.Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyContactCenter";
    options.Region = "us-east-1";
});

var host = builder.Build();
var app = host.Services.GetRequiredService<ISwitchboardApp>();
app.Synth();
```

## Service Registration

### Basic Configuration

```csharp
builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "ContactCenter";
    options.Region = "us-east-1";
    options.Account = "123456789012";
});
```

### Adding Flow Definitions

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddFlowDefinitions(typeof(Program).Assembly);  // Scan assembly for flows
```

### Dynamic Configuration

```csharp
builder.Services.AddSwitchboard(options => { })
    .AddDynamicConfiguration(config =>
    {
        config.UseDynamoDB();
        config.EnableCaching(redis =>
        {
            redis.Endpoint = "redis.example.com:6379";
        });
    });
```

### Middleware

```csharp
builder.Services.AddSwitchboard(options => { })
    .UseMiddleware<LoggingMiddleware>()
    .UseMiddleware<ValidationMiddleware>();
```

## Using Services in Flows

### Constructor Injection

```csharp
[ContactFlow("ServiceFlow")]
public partial class ServiceFlow : FlowDefinitionBase
{
    private readonly ILogger<ServiceFlow> _logger;
    private readonly IConfigurationManager _config;

    public ServiceFlow(
        ILogger<ServiceFlow> logger,
        IConfigurationManager config)
    {
        _logger = logger;
        _config = config;
    }

    [Message("Welcome")]
    public partial void Welcome()
    {
        _logger.LogInformation("Welcome message played");
    }
}
```

### Service Locator Pattern

```csharp
public class FlowFactory
{
    private readonly IServiceProvider _services;

    public FlowFactory(IServiceProvider services)
    {
        _services = services;
    }

    public IContactFlow CreateFlow(string type)
    {
        return type switch
        {
            "sales" => _services.GetRequiredService<SalesFlow>(),
            "support" => _services.GetRequiredService<SupportFlow>(),
            _ => throw new ArgumentException($"Unknown flow: {type}")
        };
    }
}
```

## Testing with DI

```csharp
public class FlowTests
{
    [Fact]
    public void Flow_ShouldUseInjectedServices()
    {
        // Arrange
        var services = new ServiceCollection();
        var mockLogger = new Mock<ILogger<ServiceFlow>>();

        services.AddSingleton(mockLogger.Object);
        services.AddTransient<ServiceFlow>();

        var provider = services.BuildServiceProvider();

        // Act
        var flow = provider.GetRequiredService<ServiceFlow>();
        flow.Welcome();

        // Assert
        mockLogger.Verify(l => l.LogInformation("Welcome message played"), Times.Once);
    }
}
```

## Next Steps

- **[Middleware](/guide/advanced/middleware)** - Pipeline pattern
- **[Architecture](/guide/architecture)** - Framework architecture
- **[Configuration](/reference/configuration)** - Configuration options
