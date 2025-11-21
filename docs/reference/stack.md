# SwitchboardStack Reference

The `SwitchboardStack` is the main CDK stack class for deploying Amazon Connect resources. It handles orchestration, dependency management, and resource reference resolution.

## Class Overview

```csharp
public class SwitchboardStack : Stack
{
    public SwitchboardStack(
        Construct scope,
        string id,
        string instanceAlias,
        IStackProps? props = null
    )
}
```

**Namespace:** `Switchboard.Core`

---

## Constructor

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | `Construct` | Yes | The CDK app or parent construct |
| `id` | `string` | Yes | Unique stack identifier |
| `instanceAlias` | `string` | Yes | Connect instance friendly name |
| `props` | `IStackProps?` | No | CDK stack properties (environment, tags, etc.) |

### Example

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");
```

### With Environment

```csharp
var stack = new SwitchboardStack(app, "ProdCenter", "prod-center", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = "123456789012",
        Region = "us-east-1"
    }
});
```

---

## Properties

### Instance

**Type:** `ConnectInstanceConstruct`

The Connect instance construct created by the stack.

```csharp
var instanceConstruct = stack.Instance;
```

### InstanceArn

**Type:** `string`

The ARN of the Connect instance.

```csharp
var arn = stack.InstanceArn;
// "arn:aws:connect:us-east-1:123456789012:instance/abc123"
```

### InstanceId

**Type:** `string`

The unique ID of the Connect instance.

```csharp
var id = stack.InstanceId;
// "abc123"
```

### InstanceAlias

**Type:** `string`

The friendly name of the Connect instance.

```csharp
var alias = stack.InstanceAlias;
// "my-center"
```

---

## Methods

### AddHoursOfOperation()

Adds hours of operation to the stack.

```csharp
public HoursOfOperationConstruct AddHoursOfOperation(HoursOfOperation hoursOfOperation)
```

**Parameters:**
- `hoursOfOperation` - The hours configuration

**Returns:** `HoursOfOperationConstruct`

**Throws:**
- `ArgumentNullException` if hoursOfOperation is null
- `InvalidOperationException` if validation fails
- `InvalidOperationException` if hours with same name already exists

**Example:**

```csharp
var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }
});

var hoursConstruct = stack.AddHoursOfOperation(hours);
```

---

### AddQueue()

Adds a queue to the stack, optionally associating it with hours of operation.

```csharp
public QueueConstruct AddQueue(Queue queue, string? hoursOfOperationName = null)
```

**Parameters:**
- `queue` - The queue configuration
- `hoursOfOperationName` (optional) - Name of existing hours to associate

**Returns:** `QueueConstruct`

**Throws:**
- `ArgumentNullException` if queue is null
- `InvalidOperationException` if validation fails
- `InvalidOperationException` if queue with same name already exists
- `InvalidOperationException` if hoursOfOperationName specified but not found

**Example:**

```csharp
// Without hours
var queue = new QueueBuilder()
    .SetName("Sales")
    .SetMaxContacts(100)
    .Build();

var queueConstruct = stack.AddQueue(queue);

// With hours
var queueWithHours = new QueueBuilder()
    .SetName("Support")
    .Build();

stack.AddQueue(queueWithHours, "BusinessHours");
```

---

### AddRoutingProfile()

Adds a routing profile to the stack.

```csharp
public RoutingProfileConstruct AddRoutingProfile(RoutingProfile routingProfile)
```

**Parameters:**
- `routingProfile` - The routing profile configuration

**Returns:** `RoutingProfileConstruct`

**Throws:**
- `ArgumentNullException` if routingProfile is null
- `InvalidOperationException` if validation fails
- `InvalidOperationException` if routing profile with same name already exists

**Example:**

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("GeneralAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, 1)
    .Build();

var profileConstruct = stack.AddRoutingProfile(profile);
```

---

### AddFlow()

Adds a contact flow to the stack with automatic reference resolution and dependency management.

```csharp
public FlowConstruct AddFlow(IFlow flow)
```

**Parameters:**
- `flow` - The flow configuration

**Returns:** `FlowConstruct`

**Throws:**
- `ArgumentNullException` if flow is null
- `InvalidOperationException` if validation fails
- `InvalidOperationException` if flow with same name already exists

**Example:**

```csharp
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .PlayPrompt("Welcome")
    .TransferToQueue("Sales") // Uses placeholder { {Queue:Sales} }
    .Build();

var flowConstruct = stack.AddFlow(flow); // Placeholder resolved to actual ARN
```

**Automatic Features:**
- Resolves `{ {Queue:QueueName} }` placeholders to actual queue ARNs
- Adds CloudFormation dependencies on referenced resources
- Validates flow content before deployment

---

### GetQueue()

Retrieves a queue construct by name.

```csharp
public QueueConstruct? GetQueue(string name)
```

**Parameters:**
- `name` - The queue name

**Returns:** `QueueConstruct?` - The queue construct if found; otherwise, null

**Example:**

```csharp
var salesQueue = stack.GetQueue("Sales");
if (salesQueue != null)
{
    var arn = salesQueue.QueueArn;
}
```

---

### GetHoursOfOperation()

Retrieves hours of operation construct by name.

```csharp
public HoursOfOperationConstruct? GetHoursOfOperation(string name)
```

**Parameters:**
- `name` - The hours name

**Returns:** `HoursOfOperationConstruct?` - The hours construct if found; otherwise, null

**Example:**

```csharp
var hours = stack.GetHoursOfOperation("BusinessHours");
if (hours != null)
{
    var arn = hours.HoursOfOperationArn;
}
```

---

## Resource Reference Resolution

The stack automatically resolves resource references in flow content.

### Queue References

```csharp
// In FlowBuilder
var flow = new FlowBuilder()
    .SetName("Transfer")
    .TransferToQueue("Sales") // Creates placeholder: { {Queue:Sales} }
    .Build();

// In stack
stack.AddQueue(salesQueue); // Registers queue with name "Sales"
stack.AddFlow(flow); // Replaces { {Queue:Sales} } with actual ARN
```

**Placeholder Format:** `{ {Queue:QueueName} }`

**Resolved To:** `arn:aws:connect:us-east-1:123456789012:instance/abc/queue/xyz`

### Future Reference Types

The framework is designed to support additional reference types:

- `{ {Lambda:FunctionName} }` - Lambda function ARNs
- `{ {HoursOfOperation:Name} }` - Hours of operation ARNs
- `{ {Flow:FlowName} }` - Other flow ARNs

---

## Dependency Management

The stack automatically manages CloudFormation dependencies:

```csharp
// Add resources in any order
stack.AddFlow(flow); // References "Sales" queue
stack.AddQueue(salesQueue); // Queue named "Sales"

// CloudFormation will deploy in correct order:
// 1. Instance
// 2. Queue
// 3. Flow (depends on queue)
```

**Automatic Dependency Detection:**
- Scans flow content for resource references
- Adds CloudFormation dependencies using `Node.AddDependency()`
- Ensures resources are created in correct order

---

## Validation

The stack validates resources before adding them:

```csharp
var queue = new Queue { Name = "" }; // Invalid - empty name

stack.AddQueue(queue); // Throws InvalidOperationException
```

**Validation Checks:**
- Resource names are not empty
- Required properties are set
- Configurations are valid
- No duplicate resource names

---

## Complete Example

```csharp
using Amazon.CDK;
using Switchboard.Core;
using Switchboard.Builders;

var app = new App();
var stack = new SwitchboardStack(app, "ProductionCenter", "acme-prod-center", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = "123456789012",
        Region = "us-east-1"
    }
});

// Add hours of operation
var hours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};
hours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,
    StartTime = new TimeRange { Hours = 9, Minutes = 0 },
    EndTime = new TimeRange { Hours = 17, Minutes = 0 }
});
stack.AddHoursOfOperation(hours);

// Add queues
var salesQueue = new QueueBuilder()
    .SetName("Sales")
    .SetMaxContacts(100)
    .Build();
stack.AddQueue(salesQueue, "BusinessHours");

var supportQueue = new QueueBuilder()
    .SetName("Support")
    .SetMaxContacts(150)
    .Build();
stack.AddQueue(supportQueue, "BusinessHours");

// Add routing profile
var profile = new RoutingProfileBuilder()
    .SetName("GeneralAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, 1)
    .AddQueue("Support", ChannelType.Voice, 2)
    .Build();
stack.AddRoutingProfile(profile);

// Add flow
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .PlayPrompt("Welcome to our contact center")
    .GetCustomerInput("Press 1 for sales, 2 for support")
    .Branch(branch =>
    {
        branch.Case("1", "sales-transfer");
        branch.Case("2", "support-transfer");
        branch.Otherwise("default");
    })
    .TransferToQueue("Sales")
    .Build();
stack.AddFlow(flow);

// Synthesize
app.Synth();
```

---

## Best Practices

### 1. Use Environment Configuration

Always specify account and region for production:

```csharp
// Good
var stack = app.CreateStack(
    "ProdStack",
    "prod",
    account: "123456789012",
    region: "us-east-1"
);

// Avoid (environment undefined)
var stack = app.CreateStack("ProdStack", "prod");
```

### 2. Configure Resources Before Synth

Add all resources before calling `Synth()`:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyStack", "center");

// Add all resources
stack.AddHoursOfOperation(hours);
stack.AddQueue(queue1);
stack.AddQueue(queue2);
stack.AddFlow(flow);

// Then synth
app.Synth();
```

### 3. Use Meaningful Names

Use descriptive names for resources:

```csharp
// Good
var stack = new SwitchboardStack(app, "ProductionContactCenter", "acme-prod");

// Avoid
var stack = new SwitchboardStack(app, "Stack1", "s1");
```

### 4. Leverage Automatic Dependency Management

Let the stack handle dependencies:

```csharp
// Good - Stack handles dependencies
stack.AddQueue(queue);
stack.AddFlow(flow); // Flow references queue, dependency added automatically

// Avoid - Manual dependency management
var queueConstruct = new QueueConstruct(this, "Queue", props);
var flowConstruct = new FlowConstruct(this, "Flow", flowProps);
flowConstruct.Node.AddDependency(queueConstruct); // Manual, error-prone
```

---

## Related

- [Building Queues](/building/queues.md) - Creating queues
- [Building Flows](/building/flows.md) - Creating contact flows
- [Building Routing Profiles](/building/routing-profiles.md) - Creating routing profiles
- [Building Hours](/building/hours-of-operation.md) - Creating hours of operation
- [Complete Example](/building/complete-example.md) - Full contact center example
