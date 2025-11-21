# Dynamic Configuration

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

One of Switchboard's most powerful features is **dynamic configuration** - the ability to update contact flow behavior at runtime without redeploying your infrastructure. This enables zero-downtime updates and rapid response to changing business requirements.

## The Problem

Traditional Amazon Connect deployments have a significant limitation:

```csharp
// ❌ Traditional: Hardcoded values in flow
var flow = new CfnContactFlow(this, "SalesFlow", new CfnContactFlowProps
{
    Content = @"{
        'Actions': [{
            'Type': 'MessageParticipant',
            'Parameters': {
                'Text': 'Our hours are 9am-5pm'  // ⚠️ Hardcoded!
            }
        }]
    }"
});

// To change hours message, you must:
// 1. Update code
// 2. Recompile
// 3. Run cdk deploy
// 4. Wait 10-15 minutes for deployment
// 5. Risk downtime during update
```

## The Solution

Switchboard stores configuration parameters in **DynamoDB**, allowing runtime updates:

```csharp
// ✅ Switchboard: Dynamic configuration
[ContactFlow("SalesFlow")]
public partial class SalesFlow
{
    [Message(ConfigKey = "businessHoursMessage")]
    public partial void AnnounceHours();
}

// Update in real-time (no deployment needed)
await configManager.UpdateAsync("SalesFlow", new
{
    businessHoursMessage = "Our hours are now 8am-6pm"  // ✅ Instant update
});
// Next call immediately uses new message
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│  Admin/API (Update Config)               │
└─────────────┬───────────────────────────┘
              │
              ↓ Write
┌─────────────────────────────────────────┐
│  DynamoDB (Configuration Storage)        │
│  • Flow parameters                       │
│  • Queue settings                        │
│  • Routing rules                         │
│  • Versioning & history                  │
└─────────────┬───────────────────────────┘
              │
              ↓ Read (via Lambda)
┌─────────────────────────────────────────┐
│  ElastiCache/Redis (Optional Cache)      │
│  • Hot configuration                     │
│  • TTL-based invalidation                │
└─────────────┬───────────────────────────┘
              │
              ↓ Fetch
┌─────────────────────────────────────────┐
│  Amazon Connect (Runtime)                │
│  • Execute flow with dynamic params      │
└──────────────────────────────────────────┘
```

### Request Flow

1. **Incoming Call** → Amazon Connect receives call
2. **Lambda Invocation** → Connect flow invokes ConfigFetcher Lambda
3. **Cache Check** → Lambda checks ElastiCache for cached config
4. **Database Query** → On cache miss, query DynamoDB
5. **Return Config** → Lambda returns configuration JSON to Connect
6. **Execute Flow** → Connect executes flow using dynamic parameters

## Configuration Tables

Switchboard creates several DynamoDB tables to store configuration:

### 1. ConnectFlowConfigurations

Stores flow-level configuration:

| PK (Partition Key) | SK (Sort Key) | Attributes |
|--------------------|---------------|------------|
| `FLOW#SalesFlow` | `VERSION#latest` | `parameters`, `updated`, `updatedBy` |
| `FLOW#SalesFlow` | `VERSION#v1.0` | `parameters`, `updated`, `updatedBy` |
| `FLOW#SalesFlow` | `VERSION#v0.9` | `parameters`, `updated`, `updatedBy` |

**Example Document:**

```json
{
  "PK": "FLOW#SalesFlow",
  "SK": "VERSION#latest",
  "parameters": {
    "businessHoursMessage": "Our hours are 8am-6pm",
    "maxQueueTime": 300,
    "callbackEnabled": true,
    "priority": "high"
  },
  "updated": "2025-10-26T10:30:00Z",
  "updatedBy": "admin@example.com"
}
```

### 2. ConnectQueueConfigurations

Stores queue settings:

| PK | SK | Attributes |
|----|-----|------------|
| `QUEUE#Sales` | `CONFIG` | `maxContacts`, `timeout`, `serviceLevel` |

**Example Document:**

```json
{
  "PK": "QUEUE#Sales",
  "SK": "CONFIG",
  "maxContacts": 50,
  "timeout": 600,
  "serviceLevel": {
    "threshold": 20,
    "target": 0.95
  }
}
```

### 3. ConnectRoutingConfigurations

Stores routing rules:

| PK | SK | Attributes |
|----|-----|------------|
| `ROUTING#VIPCustomers` | `CONDITION#1` | `expression`, `queue`, `priority` |

## Basic Usage

### Enable Dynamic Configuration

```csharp
using NickSoftware.Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.InstanceName = "MyContactCenter";
})
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.EnableCaching(redis =>
    {
        redis.Endpoint = "redis.example.com:6379";
        redis.CacheTtl = TimeSpan.FromMinutes(5);
    });
});
```

### Define Configurable Parameters

**Using Attributes:**

```csharp
[ContactFlow("CustomerService")]
public partial class CustomerServiceFlow
{
    // Simple message with dynamic text
    [Message(ConfigKey = "welcomeMessage")]
    public partial void Welcome();

    // Queue transfer with dynamic queue name
    [TransferToQueue(ConfigKey = "primaryQueue")]
    public partial void Transfer();

    // Lambda invocation with dynamic ARN
    [InvokeLambda(ConfigKey = "customerLookupLambda")]
    public partial void LookupCustomer();

    // Business hours check with dynamic schedule
    [CheckHours(ConfigKey = "operatingHours")]
    public partial void CheckBusinessHours();
}
```

**Using Fluent Builders:**

```csharp
var flow = new FlowBuilder()
    .SetName("CustomerService")
    .PlayPrompt(config =>
    {
        config.TextSource = ConfigSource.DynamoDB;
        config.ConfigKey = "welcomeMessage";
        config.DefaultValue = "Welcome"; // Fallback if config unavailable
    })
    .TransferToQueue(config =>
    {
        config.QueueSource = ConfigSource.DynamoDB;
        config.ConfigKey = "primaryQueue";
        config.DefaultValue = "GeneralSupport";
    })
    .Build();
```

### Update Configuration at Runtime

```csharp
using NickSoftware.Switchboard.Configuration;

public class ConfigurationService
{
    private readonly IConfigurationManager _configManager;

    public ConfigurationService(IConfigurationManager configManager)
    {
        _configManager = configManager;
    }

    public async Task UpdateWelcomeMessageAsync(string newMessage)
    {
        await _configManager.UpdateFlowParameterAsync(
            flowId: "CustomerService",
            parameterKey: "welcomeMessage",
            parameterValue: newMessage
        );

        // Optional: Tag the update
        await _configManager.TagUpdateAsync(
            flowId: "CustomerService",
            tags: new Dictionary<string, string>
            {
                ["updatedBy"] = "admin@example.com",
                ["reason"] = "Holiday hours update",
                ["environment"] = "production"
            }
        );
    }

    public async Task UpdateMultipleParametersAsync()
    {
        // Batch update (atomic operation)
        await _configManager.UpdateFlowConfigAsync("CustomerService", new FlowConfig
        {
            Parameters = new Dictionary<string, object>
            {
                ["welcomeMessage"] = "Happy Holidays! Our hours are...",
                ["primaryQueue"] = "HolidaySupport",
                ["maxQueueTime"] = 900,  // 15 minutes during holidays
                ["callbackEnabled"] = true
            }
        });
    }
}
```

## Advanced Features

### Configuration Versioning

Every configuration update creates a new version:

```csharp
// Create new version
await configManager.CreateVersionAsync("SalesFlow", new FlowConfig
{
    Parameters = new Dictionary<string, object>
    {
        ["welcomeMessage"] = "Updated message"
    }
});

// List all versions
var versions = await configManager.GetVersionHistoryAsync("SalesFlow");

// Rollback to previous version
await configManager.RollbackToVersionAsync(
    flowId: "SalesFlow",
    version: "v1.0"
);

// Get specific version
var config = await configManager.GetVersionAsync("SalesFlow", "v0.9");
```

### Environment-Specific Configuration

Manage different configurations per environment:

```csharp
builder.Services.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB(options =>
    {
        options.TableNamePrefix = Environment.GetEnvironmentVariable("ENV"); // dev, staging, prod
    });
});

// Tables created:
// - dev-ConnectFlowConfigurations
// - staging-ConnectFlowConfigurations
// - prod-ConnectFlowConfigurations
```

**Usage:**

```csharp
// Development
await configManager.UpdateAsync("SalesFlow", new
{
    apiEndpoint = "https://api-dev.example.com",
    debugMode = true
});

// Production
await configManager.UpdateAsync("SalesFlow", new
{
    apiEndpoint = "https://api.example.com",
    debugMode = false
});
```

### Configuration Validation

Validate configuration before applying:

```csharp
public class FlowConfigValidator : IConfigValidator
{
    public ValidationResult Validate(FlowConfig config)
    {
        var errors = new List<string>();

        if (config.Parameters.TryGetValue("maxQueueTime", out var queueTime))
        {
            if ((int)queueTime < 30 || (int)queueTime > 3600)
            {
                errors.Add("maxQueueTime must be between 30 and 3600 seconds");
            }
        }

        if (config.Parameters.TryGetValue("welcomeMessage", out var message))
        {
            if (string.IsNullOrWhiteSpace(message?.ToString()))
            {
                errors.Add("welcomeMessage cannot be empty");
            }

            if (message?.ToString().Length > 1000)
            {
                errors.Add("welcomeMessage cannot exceed 1000 characters");
            }
        }

        return new ValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors
        };
    }
}

// Register validator
builder.Services.AddSingleton<IConfigValidator, FlowConfigValidator>();

// Validation happens automatically on update
await configManager.UpdateAsync("SalesFlow", config); // Throws if invalid
```

### Cache Invalidation

Control when cache is invalidated:

```csharp
// Immediate invalidation (default)
await configManager.UpdateAsync("SalesFlow", config, new UpdateOptions
{
    InvalidateCache = true  // Cache cleared immediately
});

// Delayed invalidation
await configManager.UpdateAsync("SalesFlow", config, new UpdateOptions
{
    InvalidateCache = true,
    InvalidationDelay = TimeSpan.FromMinutes(5)  // Allow current calls to finish
});

// No invalidation (manual control)
await configManager.UpdateAsync("SalesFlow", config, new UpdateOptions
{
    InvalidateCache = false
});

// Manual cache clear
await configManager.ClearCacheAsync("SalesFlow");
```

### Configuration Monitoring

Track configuration changes:

```csharp
public class ConfigurationAuditor : IConfigurationObserver
{
    private readonly ILogger<ConfigurationAuditor> _logger;

    public ConfigurationAuditor(ILogger<ConfigurationAuditor> logger)
    {
        _logger = logger;
    }

    public async Task OnConfigurationChangedAsync(ConfigurationChangeEvent evt)
    {
        _logger.LogInformation(
            "Configuration changed: Flow={FlowId}, Parameter={Key}, OldValue={Old}, NewValue={New}, User={User}",
            evt.FlowId,
            evt.ParameterKey,
            evt.OldValue,
            evt.NewValue,
            evt.UpdatedBy
        );

        // Send alert for critical changes
        if (evt.ParameterKey == "emergencyMode")
        {
            await SendAlertAsync($"Emergency mode changed to {evt.NewValue}");
        }
    }
}

// Register observer
builder.Services.AddSingleton<IConfigurationObserver, ConfigurationAuditor>();
```

## Real-World Examples

### Example 1: Business Hours Message

Update business hours message for holidays without redeployment:

```csharp
[ContactFlow("MainInbound")]
public partial class MainInboundFlow
{
    [Message(ConfigKey = "businessHoursMessage")]
    public partial void AnnounceHours();
}

// Before holiday
await configManager.UpdateAsync("MainInbound", new
{
    businessHoursMessage = "Our hours are Monday-Friday, 9am-5pm"
});

// During holiday
await configManager.UpdateAsync("MainInbound", new
{
    businessHoursMessage = "We're closed for Thanksgiving. We'll be back on Monday."
});

// After holiday
await configManager.UpdateAsync("MainInbound", new
{
    businessHoursMessage = "Our hours are Monday-Friday, 9am-5pm"
});
```

### Example 2: Queue Routing During Peak Times

Dynamically adjust queue routing during high call volume:

```csharp
[ContactFlow("CustomerSupport")]
public partial class CustomerSupportFlow
{
    [TransferToQueue(ConfigKey = "primaryQueue")]
    public partial void TransferToPrimary();

    [SetWorkingQueue(ConfigKey = "overflowQueue")]
    public partial void SetOverflow();
}

// Normal operations
await configManager.UpdateAsync("CustomerSupport", new
{
    primaryQueue = "GeneralSupport",
    overflowQueue = "Tier2Support"
});

// Peak times (route to overflow faster)
await configManager.UpdateAsync("CustomerSupport", new
{
    primaryQueue = "GeneralSupport",
    overflowQueue = "OverflowSupport",  // Dedicated overflow queue
    maxQueueTime = 60  // Reduced from 120
});
```

### Example 3: Feature Flags

Enable/disable features dynamically:

```csharp
[ContactFlow("SalesInbound")]
public partial class SalesInboundFlow
{
    [CheckAttribute(ConfigKey = "callbackEnabled")]
    public partial void CheckCallbackFeature();

    [CheckAttribute(ConfigKey = "voicemailEnabled")]
    public partial void CheckVoicemailFeature();
}

// Enable callback feature
await configManager.UpdateAsync("SalesInbound", new
{
    callbackEnabled = true,
    voicemailEnabled = false
});

// A/B testing: Enable for 50% of callers
await configManager.UpdateAsync("SalesInbound", new
{
    callbackEnabled = true,
    callbackPercentage = 0.5  // 50% of callers
});
```

### Example 4: Emergency Mode

Instantly activate emergency mode across all flows:

```csharp
public async Task ActivateEmergencyModeAsync()
{
    var flows = new[] { "SalesInbound", "SupportInbound", "GeneralInbound" };

    foreach (var flowId in flows)
    {
        await configManager.UpdateAsync(flowId, new
        {
            emergencyMode = true,
            emergencyMessage = "We're experiencing technical difficulties. Please call back later.",
            disableQueue = true  // Disconnect after message
        });
    }
}

public async Task DeactivateEmergencyModeAsync()
{
    var flows = new[] { "SalesInbound", "SupportInbound", "GeneralInbound" };

    foreach (var flowId in flows)
    {
        await configManager.UpdateAsync(flowId, new
        {
            emergencyMode = false
        });
    }
}
```

## Performance Optimization

### Caching Strategy

```csharp
builder.Services.AddDynamicConfiguration(config =>
{
    config.EnableCaching(redis =>
    {
        redis.Endpoint = "redis.example.com:6379";

        // Hot config: Very low TTL, high hit rate
        redis.HotConfigTtl = TimeSpan.FromMinutes(1);

        // Warm config: Medium TTL, medium hit rate
        redis.WarmConfigTtl = TimeSpan.FromMinutes(15);

        // Cold config: High TTL, low hit rate
        redis.ColdConfigTtl = TimeSpan.FromHours(1);

        // Prefetch popular configs
        redis.PrefetchFlows = new[] { "MainInbound", "SalesInbound" };
    });
});
```

### Lambda Configuration Fetcher

Optimized Lambda function for fetching config:

```csharp
public class ConfigFetcher
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IMemoryCache _cache;  // In-Lambda caching

    public async Task<ConfigResponse> HandleAsync(ConfigRequest request)
    {
        // 1. Check in-Lambda memory cache (fastest)
        if (_cache.TryGetValue(request.FlowId, out ConfigResponse cached))
        {
            return cached;
        }

        // 2. Check ElastiCache (fast)
        var redisValue = await _redis.GetAsync(request.FlowId);
        if (redisValue != null)
        {
            _cache.Set(request.FlowId, redisValue, TimeSpan.FromSeconds(30));
            return redisValue;
        }

        // 3. Query DynamoDB (slower, but authoritative)
        var config = await FetchFromDynamoDbAsync(request.FlowId);

        // 4. Populate caches
        await _redis.SetAsync(request.FlowId, config, TimeSpan.FromMinutes(5));
        _cache.Set(request.FlowId, config, TimeSpan.FromSeconds(30));

        return config;
    }
}
```

## Best Practices

### 1. Use Defaults for Critical Parameters

Always provide fallback values:

```csharp
[Message(ConfigKey = "welcomeMessage", DefaultValue = "Welcome to our contact center")]
public partial void Welcome();
```

### 2. Version All Changes

Track who changed what and when:

```csharp
await configManager.UpdateAsync("SalesFlow", config, new UpdateOptions
{
    UpdatedBy = "admin@example.com",
    ChangeReason = "Holiday hours update",
    Tags = new Dictionary<string, string>
    {
        ["ticket"] = "JIRA-1234",
        ["approvedBy"] = "manager@example.com"
    }
});
```

### 3. Test Changes in Lower Environments

```csharp
// Update dev environment first
await devConfigManager.UpdateAsync("SalesFlow", config);

// Verify and test

// Promote to staging
await stagingConfigManager.UpdateAsync("SalesFlow", config);

// Final verification

// Deploy to production
await prodConfigManager.UpdateAsync("SalesFlow", config);
```

### 4. Monitor Configuration Changes

```csharp
// Set up CloudWatch alarms for config table writes
var alarm = new Alarm(this, "ConfigChangeAlarm", new AlarmProps
{
    Metric = configTable.MetricConsumedWriteCapacityUnits(),
    Threshold = 10,
    EvaluationPeriods = 1,
    AlarmDescription = "Alert on frequent config changes"
});
```

### 5. Implement Gradual Rollout

```csharp
// Update config gradually
await configManager.UpdateWithRolloutAsync("SalesFlow", config, new RolloutOptions
{
    Strategy = RolloutStrategy.Percentage,
    Percentage = 10,  // Start with 10%
    IncrementInterval = TimeSpan.FromMinutes(15),
    FinalPercentage = 100
});
```

## Troubleshooting

### Configuration Not Applied

**Check Lambda logs:**
```bash
aws logs tail /aws/lambda/ConfigFetcher --follow
```

**Verify DynamoDB record:**
```bash
aws dynamodb get-item \
  --table-name ConnectFlowConfigurations \
  --key '{"PK": {"S": "FLOW#SalesFlow"}, "SK": {"S": "VERSION#latest"}}'
```

**Clear cache manually:**
```csharp
await configManager.ClearCacheAsync("SalesFlow");
```

### Lambda Timeout

Increase timeout and memory:

```csharp
var configFetcher = new Function(this, "ConfigFetcher", new FunctionProps
{
    Timeout = Duration.Seconds(10),  // Increase from default 3s
    MemorySize = 512  // Increase from default 128MB
});
```

## Next Steps

- **[Attribute-Based Design](/guide/attributes)** - Learn about declarative configuration
- **[Flow Basics](/guide/flows/basics)** - Build your first flow with dynamic config
- **[Environments](/guide/deployment/environments)** - Manage multi-environment configs
- **[Monitoring](/guide/deployment/monitoring)** - Monitor configuration changes

## Related Examples

- [Basic Call Center](/examples/basic-call-center) - Simple dynamic config example
- [Enterprise (Fluent)](/examples/enterprise-fluent) - Advanced dynamic config
- [Multi-Region](/examples/multi-region) - Config across regions
