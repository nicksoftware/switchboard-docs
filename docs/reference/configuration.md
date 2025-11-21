# Configuration Reference

This reference documents configuration options for Switchboard resources.

## Stack Configuration

### StackProps

Standard AWS CDK stack properties.

```csharp
new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = "123456789012",
        Region = "us-east-1"
    },
    Description = "My contact center infrastructure",
    Tags = new Dictionary<string, string>
    {
        ["Environment"] = "Production",
        ["Project"] = "ContactCenter"
    }
}
```

**Properties:**
- `Env` - AWS environment (account + region)
- `Description` - Stack description
- `Tags` - Resource tags
- `StackName` - Override stack name
- `TerminationProtection` - Enable deletion protection

---

## Queue Configuration

### QueueBuilder Options

```csharp
var queue = new QueueBuilder()
    .SetName("CustomerService")           // Required
    .SetDescription("Main support queue") // Optional
    .SetMaxContacts(100)                  // Optional (default: no limit)
    .SetOutboundCallerId("Acme", "+1...") // Optional
    .AddTag("Department", "Support")      // Optional
    .Build();
```

**Configuration:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Name` | string | Yes | - | Queue name |
| `Description` | string | No | null | Queue description |
| `MaxContacts` | int | No | null | Max contacts in queue |
| `OutboundCallerIdName` | string | No | null | Outbound caller name |
| `OutboundCallerIdNumber` | string | No | null | Outbound caller number |
| `Tags` | Dictionary | No | empty | Resource tags |

---

## Routing Profile Configuration

### RoutingProfileBuilder Options

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("AgentProfile")                          // Required
    .SetDescription("General agent profile")          // Optional
    .SetDefaultOutboundQueue("OutboundQueue")        // Optional
    .AddMediaConcurrency(ChannelType.Voice, 1)       // Required (at least one)
    .AddQueue("QueueName", ChannelType.Voice, 1)     // Required (at least one)
    .Build();
```

**Configuration:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Name` | string | Yes | - | Profile name |
| `Description` | string | No | null | Profile description |
| `DefaultOutboundQueueId` | string | No | null | Default outbound queue |
| `MediaConcurrencies` | List | Yes | - | Channel concurrency configs |
| `QueueConfigs` | List | Yes | - | Queue associations |
| `Tags` | Dictionary | No | empty | Resource tags |

---

### Media Concurrency Configuration

```csharp
.AddMediaConcurrency(ChannelType.Voice, 1)
.AddMediaConcurrency(ChannelType.Chat, 3)
.AddMediaConcurrency(ChannelType.Task, 5)
```

**Parameters:**
- `channel` - ChannelType (Voice, Chat, Task)
- `concurrency` - Number of simultaneous contacts (must be > 0)

**Channel Types:**
- `ChannelType.Voice` - Phone calls
- `ChannelType.Chat` - Text chat
- `ChannelType.Task` - Async tasks

---

### Queue Configuration

```csharp
.AddQueue("QueueName", ChannelType.Voice, priority: 1, delay: 0)
```

**Parameters:**
- `queueId` - Queue name or ARN
- `channel` - Channel type for this queue
- `priority` - Priority (1 = highest, higher numbers = lower priority)
- `delay` - Delay in seconds before routing (default: 0)

---

## Hours of Operation Configuration

### Hours Configuration

```csharp
var hours = new HoursOfOperation
{
    Name = "BusinessHours",                   // Required
    Description = "M-F 9-5",                 // Optional
    TimeZone = "America/New_York"            // Required
};

hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,                  // Required
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },  // Required
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }    // Required
});
```

**Hours Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Name` | string | Yes | - | Hours schedule name |
| `Description` | string | No | null | Schedule description |
| `TimeZone` | string | Yes | - | IANA timezone identifier |
| `Config` | List | Yes | - | Day configurations |
| `Tags` | Dictionary | No | empty | Resource tags |

---

### Day Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Day` | DayOfWeek | Yes | Day of week |
| `StartTime` | TimeRange | Yes | Opening time |
| `EndTime` | TimeRange | Yes | Closing time |

**TimeRange:**
- `Hours` - Hour (0-23)
- `Minutes` - Minute (0-59)

---

### Common Timezones

| Region | IANA Identifier |
|--------|----------------|
| US Eastern | `America/New_York` |
| US Central | `America/Chicago` |
| US Mountain | `America/Denver` |
| US Pacific | `America/Los_Angeles` |
| UTC | `UTC` |
| London | `Europe/London` |
| Tokyo | `Asia/Tokyo` |
| Sydney | `Australia/Sydney` |

---

## Flow Configuration

### FlowBuilder Options

```csharp
var flow = new FlowBuilder()
    .SetName("MainFlow")                        // Required
    .SetDescription("Main menu flow")           // Optional
    .SetType(FlowType.ContactFlow)             // Optional (default: ContactFlow)
    .AddTag("Department", "Sales")             // Optional
    .PlayPrompt("Welcome")                     // Add actions...
    .Build();
```

**Flow Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Name` | string | Yes | - | Flow name |
| `Description` | string | No | null | Flow description |
| `Type` | FlowType | No | ContactFlow | Flow type |
| `Content` | string | Yes | - | Flow JSON (generated) |
| `Tags` | Dictionary | No | empty | Resource tags |

---

### Flow Types

| FlowType | AWS Value | Purpose |
|----------|-----------|---------|
| `ContactFlow` | CONTACT_FLOW | Standard inbound flow |
| `CustomerQueueFlow` | CUSTOMER_QUEUE | Queue wait music |
| `CustomerHoldFlow` | CUSTOMER_HOLD | Hold music |
| `CustomerWhisperFlow` | CUSTOMER_WHISPER | Pre-connect customer message |
| `AgentWhisperFlow` | AGENT_WHISPER | Pre-connect agent message |
| `AgentHoldFlow` | AGENT_HOLD | Agent hold music |
| `OutboundWhisperFlow` | OUTBOUND_WHISPER | Outbound call whisper |
| `AgentTransferFlow` | AGENT_TRANSFER | Agent transfer flow |
| `QueueTransferFlow` | QUEUE_TRANSFER | Queue transfer flow |

---

## Action Configuration

### GetCustomerInput Configuration

```csharp
.GetCustomerInput("Enter your account number", input =>
{
    input.MaxDigits = 10;          // Max digits (default: 1)
    input.TimeoutSeconds = 10;     // Timeout (default: 5)
    input.EncryptInput = true;     // Encrypt (default: false)
})
```

---

### InvokeLambda Configuration

```csharp
.InvokeLambda("FunctionName", lambda =>
{
    lambda.TimeoutSeconds = 8;     // Lambda timeout (default: 3)
})
```

---

### Branch Configuration

```csharp
.Branch(branch =>
{
    branch.Case("1", "action-id");                            // Simple case
    branch.When("expr", "action-id", ComparisonOperator.Equals); // Complex condition
    branch.Otherwise("default-action");                        // Fallback
})
```

---

## Tags

Tags are key-value pairs for organizing and tracking resources.

### Adding Tags

```csharp
// Queue tags
var queue = new QueueBuilder()
    .SetName("Support")
    .AddTag("Department", "CustomerService")
    .AddTag("CostCenter", "CC-1234")
    .AddTag("Environment", "Production")
    .Build();

// Flow tags
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .AddTag("FlowType", "Menu")
    .AddTag("Version", "2.0")
    .Build();

// Stack tags
new StackProps
{
    Tags = new Dictionary<string, string>
    {
        ["Project"] = "ContactCenter",
        ["Owner"] = "TeamA"
    }
}
```

### Best Practices

1. **Use Consistent Keys**: Department, Environment, CostCenter
2. **Tag All Resources**: Apply tags to stacks and resources
3. **Use for Cost Tracking**: Tag by cost center or project
4. **Use for Organization**: Tag by team, owner, or purpose

---

## Environment Variables

Use environment variables for configuration:

```csharp
new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT"),
        Region = Environment.GetEnvironmentVariable("CDK_DEFAULT_REGION") ?? "us-east-1"
    }
}
```

**Common Environment Variables:**
- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - AWS region
- `AWS_PROFILE` - AWS credentials profile

---

## Best Practices

### 1. Use Descriptive Names

```csharp
// Good
.SetName("CustomerSupportBusinessHours")

// Avoid
.SetName("Hours1")
```

### 2. Add Descriptions

```csharp
// Good
.SetDescription("Main customer support queue for general inquiries")

// Avoid leaving descriptions empty
```

### 3. Set Appropriate Limits

```csharp
// Consider your team size
.SetMaxContacts(100) // For 20 agents

// Not
.SetMaxContacts(10000) // Unrealistic for small team
```

### 4. Use Meaningful Tags

```csharp
// Good - Organized tags
.AddTag("Department", "Sales")
.AddTag("Tier", "VIP")
.AddTag("CostCenter", "CC-SALES-001")

// Avoid - Unclear tags
.AddTag("Tag1", "Value1")
```

### 5. Validate Configuration

```csharp
// Validate before adding to stack
queue.Validate();
hours.Validate();
profile.Validate();
flow.Validate();
```

---

## Related

- [SwitchboardStack Reference](/reference/stack.md) - Stack methods
- [Flow Actions Reference](/reference/flow-actions.md) - Flow action details
- [Building Queues](/building/queues.md) - Queue creation guide
- [Building Routing Profiles](/building/routing-profiles.md) - Profile guide
- [Building Hours](/building/hours-of-operation.md) - Hours guide
