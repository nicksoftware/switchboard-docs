# Building Quick Connects

## What is a Quick Connect?

A **quick connect** enables agents to quickly transfer calls to common destinations with a single click. Instead of manually dialing numbers or searching for queues, agents can select pre-configured transfer destinations from a list in their Contact Control Panel (CCP).

Quick connects support three types of transfer destinations:

| Type | Purpose | Requirements |
|------|---------|--------------|
| **Phone Number** | Transfer to external phone numbers | Phone number only (E.164 format) |
| **User** | Transfer directly to a specific agent | User ID + Transfer to Agent flow |
| **Queue** | Transfer to a queue for routing | Queue ARN + Transfer to Queue flow |

### Real-World Examples

- **Emergency Line**: One-click transfer to emergency services
- **Supervisor**: Direct transfer to shift supervisor for escalations
- **Sales Queue**: Transfer to sales team during product inquiries
- **Main Office**: Transfer to reception desk
- **External Support**: Transfer to third-party vendor support line

### How Quick Connects Work

1. **Admin creates quick connects** → Configures destinations
2. **Quick connects associated with queues** → Agents see them in CCP
3. **Agent clicks quick connect** → Transfer initiated
4. **Amazon Connect executes transfer** → Uses configured flow (if needed)

### When You Need Quick Connects

Create quick connects whenever you want to:

- Enable one-click transfers to common destinations
- Standardize transfer procedures across agents
- Reduce transfer errors from manual dialing
- Speed up escalation workflows
- Provide consistent external transfer options

---

## Creating Your First Quick Connect

Let's build a simple phone number quick connect step-by-step.

### Step 1: Use QuickConnectBuilder

The easiest way to create a quick connect:

```csharp
var emergency = QuickConnect
    .Create("Emergency Line")
    .ForPhoneNumber("+18005551234")
    .Build();
```

**That's it!** This creates a phone number quick connect.

### Step 2: Add to Stack

Add the quick connect to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

QuickConnect
    .Create("Emergency Line")
    .SetDescription("Emergency hotline for critical escalations")
    .ForPhoneNumber("+18005551234")
    .AddTag("Type", "Emergency")
    .Build(stack);

app.Synth();
```

### Step 3: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first quick connect. Agents can now transfer calls to this number with one click.

---

## Quick Connect Types

### Phone Number Quick Connects

For transferring calls to external phone numbers. No transfer flow required - Amazon Connect handles the transfer directly.

```csharp
// Emergency hotline
QuickConnect
    .Create("Emergency Line")
    .SetDescription("Emergency hotline for critical escalations")
    .ForPhoneNumber("+18005551234")
    .AddTag("Type", "Emergency")
    .AddTag("Priority", "Critical")
    .Build(stack);

// Main office reception
QuickConnect
    .Create("Main Office")
    .SetDescription("Main office reception line")
    .ForPhoneNumber("+18005555678")
    .AddTag("Type", "Internal")
    .AddTag("Department", "Reception")
    .Build(stack);

// External vendor support
QuickConnect
    .Create("External Tech Support")
    .SetDescription("External vendor technical support")
    .ForPhoneNumber("+18005559999")
    .AddTag("Type", "External")
    .AddTag("Department", "TechSupport")
    .Build(stack);
```

**Phone Number Format:**
- Use E.164 format: `+[country code][number]`
- Example US: `+18005551234`
- Example UK: `+442071234567`

### Queue Quick Connects

For transferring calls to queues within your contact center. Requires a **Transfer to Queue** flow.

```csharp
// Get the queue and transfer flow
var salesQueue = stack.GetQueue("Sales");
var transferFlow = stack.GetFlow("TransferToQueue");

// Transfer to Sales Queue
QuickConnect
    .Create("Transfer to Sales")
    .SetDescription("Transfer call to Sales queue")
    .ForQueue(salesQueue, transferFlow)
    .AddTag("Type", "Queue")
    .AddTag("Department", "Sales")
    .Build(stack);

// Transfer to Support Queue
var supportQueue = stack.GetQueue("Support");

QuickConnect
    .Create("Transfer to Support")
    .SetDescription("Transfer call to Technical Support queue")
    .ForQueue(supportQueue, transferFlow)
    .AddTag("Type", "Queue")
    .AddTag("Department", "Support")
    .Build(stack);
```

**Using ARNs directly:**

```csharp
// If you have the ARNs as strings
QuickConnect
    .Create("Transfer to Sales")
    .ForQueue(
        "arn:aws:connect:us-east-1:123456789012:instance/id/queue/queue-id",
        "arn:aws:connect:us-east-1:123456789012:instance/id/contact-flow/flow-id"
    )
    .Build(stack);
```

### User Quick Connects (Agent-to-Agent)

For transferring calls directly to specific agents. Requires a **Transfer to Agent** flow and the user's ID.

```csharp
// Get the Transfer to Agent flow
var transferToAgentFlow = stack.GetFlow("TransferToAgent");

// Transfer to Supervisor
QuickConnect
    .Create("Call Supervisor")
    .SetDescription("Transfer call to shift supervisor")
    .ForUser("supervisor-user-id", transferToAgentFlow)
    .AddTag("Type", "User")
    .AddTag("Role", "Supervisor")
    .Build(stack);
```

**Using ARNs directly:**

```csharp
QuickConnect
    .Create("Call Supervisor")
    .ForUser(
        "supervisor-user-id-or-arn",
        "arn:aws:connect:us-east-1:123456789012:instance/id/contact-flow/flow-id"
    )
    .Build(stack);
```

::: tip User IDs
User IDs are typically retrieved from Amazon Connect at runtime or during deployment. You can get user IDs via:
- Amazon Connect Console → Users
- AWS CLI: `aws connect list-users`
- Connect API: `ListUsers`
:::

---

## Quick Connect Configuration

### Setting Name and Description

```csharp
QuickConnect
    .Create("Emergency Line")                              // Name (required)
    .SetDescription("Emergency hotline for escalations")   // Description (optional)
    .ForPhoneNumber("+18005551234")
    .Build(stack);
```

**Naming Guidelines:**
- Maximum 127 characters
- Use descriptive, action-oriented names
- Include the destination type when helpful

**Description Guidelines:**
- Maximum 250 characters
- Explain when to use this quick connect
- Include any special instructions

### Adding Tags

Tags help organize and filter quick connects:

```csharp
QuickConnect
    .Create("Emergency Line")
    .ForPhoneNumber("+18005551234")
    .AddTag("Type", "Emergency")
    .AddTag("Priority", "Critical")
    .AddTag("Department", "Operations")
    .AddTag("Environment", "Production")
    .Build(stack);
```

**Common Tag Patterns:**
- `Type`: Emergency, Internal, External, Queue, User
- `Department`: Sales, Support, Billing, HR
- `Priority`: Critical, High, Normal, Low
- `Environment`: Production, Staging, Development

---

## Quick Connect Presets

Presets provide pre-configured defaults for common quick connect patterns. They set the name, description, and tags automatically, so you only need to provide the destination.

### Available Presets

| Preset | Default Name | Type | Description |
|--------|--------------|------|-------------|
| `EmergencyLine` | "Emergency Line" | Phone Number | Emergency hotline for critical escalations |
| `MainOffice` | "Main Office" | Phone Number | Main office/reception line |
| `ExternalVendor` | "External Vendor Support" | Phone Number | External vendor support |
| `SupervisorTransfer` | "Call Supervisor" | User | Transfer to shift supervisor |
| `QueueTransfer` | "Transfer to Queue" | Queue | Transfer to a queue |

### Using Presets

```csharp
// Emergency line - preset provides name, description, and tags
var emergency = QuickConnect.Create()
    .UsePreset(QuickConnectPresets.EmergencyLine)
    .ForPhoneNumber("+18005551234")
    .Build(stack);

// Main office using preset
QuickConnect.Create()
    .UsePreset(QuickConnectPresets.MainOffice)
    .ForPhoneNumber("+18005555678")
    .Build(stack);

// Supervisor transfer preset
QuickConnect.Create()
    .UsePreset(QuickConnectPresets.SupervisorTransfer)
    .ForUser("supervisor-user-id", transferToAgentFlow)
    .Build(stack);

// Queue transfer preset
QuickConnect.Create()
    .UsePreset(QuickConnectPresets.QueueTransfer)
    .ForQueue(salesQueue, transferToQueueFlow)
    .Build(stack);
```

### Overriding Preset Defaults

You can override any preset default by setting it explicitly:

```csharp
// Override the preset name
QuickConnect.Create("IT Helpdesk")  // Use custom name instead of "Main Office"
    .UsePreset(QuickConnectPresets.MainOffice)
    .ForPhoneNumber("+18005550000")
    .AddTag("Department", "IT")  // Add additional tag
    .Build(stack);
```

### Creating Custom Presets

Create a custom preset for your organization's specific patterns:

```csharp
// Create a custom preset
var vipHotlinePreset = QuickConnectPresets.Custom(
    "VIP Hotline",
    QuickConnectType.PhoneNumber,
    "Priority hotline for VIP customers",
    new Dictionary<string, string>
    {
        ["Priority"] = "Critical",
        ["Type"] = "VIP"
    });

// Use the custom preset
QuickConnect.Create()
    .UsePreset(vipHotlinePreset)
    .ForPhoneNumber("+18005550007")
    .Build(stack);
```

---

## Bulk Quick Connect Creation

When creating multiple quick connects, use extension methods for cleaner code and better performance.

### Adding Multiple Phone Number Quick Connects

Create multiple phone number quick connects from a dictionary:

```csharp
// Bulk phone number quick connects
stack.AddPhoneNumberQuickConnects(new Dictionary<string, string>
{
    ["Emergency Line"] = "+18005551234",
    ["Main Office"] = "+18005555678",
    ["Partner Support"] = "+18005550001",
    ["Billing Department"] = "+18005550002",
    ["HR Hotline"] = "+18005550003"
});
```

### Adding Quick Connects with Custom Configuration

Use tuples to configure each quick connect individually:

```csharp
stack.AddQuickConnects(
    ("Emergency", b => b.ForPhoneNumber("+18005551234").AddTag("Priority", "Critical")),
    ("Main Office", b => b.ForPhoneNumber("+18005555678").AddTag("Type", "Internal")),
    ("VIP Hotline", b => b.ForPhoneNumber("+18005550004").AddTag("Priority", "High"))
);
```

### Bulk Queue Quick Connects

Create quick connects for multiple queues at once:

```csharp
// Auto-generates names as "Transfer to {QueueName}"
stack.AddQueueQuickConnects(
    transferToQueueFlow,
    salesQueue,
    supportQueue,
    billingQueue
);
```

With custom names:

```csharp
stack.AddQueueQuickConnects(
    transferToQueueFlow,
    (salesQueue, "Sales Team"),
    (supportQueue, "Tech Support"),
    (billingQueue, "Billing Dept")
);
```

### Bulk User Quick Connects

Create quick connects for multiple users:

```csharp
stack.AddUserQuickConnects(
    transferToAgentFlow,
    new Dictionary<string, string>
    {
        ["Call Supervisor"] = "supervisor-user-id",
        ["Team Lead"] = "team-lead-user-id",
        ["Escalation Manager"] = "escalation-manager-id"
    });
```

### Adding Pre-built Quick Connect Objects

If you have pre-built `QuickConnect` objects:

```csharp
var quickConnects = new[]
{
    QuickConnect.Create("Emergency").ForPhoneNumber("+18005551234").Build(),
    QuickConnect.Create("Main Office").ForPhoneNumber("+18005555678").Build()
};

stack.AddQuickConnects(quickConnects);
```

---

## Queue Association (CDK Custom Resource)

Quick connects must be **associated with queues** to appear in the agent's Contact Control Panel (CCP). Switchboard provides a CDK custom resource to handle this automatically.

### Associating Quick Connects with Queues

Using construct references:

```csharp
// Create quick connects
var emergencyQc = QuickConnect.Create("Emergency")
    .ForPhoneNumber("+18005551234")
    .Build(stack);

var mainOfficeQc = QuickConnect.Create("Main Office")
    .ForPhoneNumber("+18005555678")
    .Build(stack);

// Associate with the Sales queue
// Agents working Sales queue will see these quick connects in their CCP
stack.AssociateQuickConnectsWithQueue(
    salesQueue,
    emergencyQc,
    mainOfficeQc
);
```

Using names:

```csharp
// Associate using resource names
stack.AssociateQuickConnectsWithQueue(
    "Support",              // Queue name
    "Emergency Line",       // Quick connect names
    "Main Office",
    "External Vendor Support"
);
```

### How It Works

The `AssociateQuickConnectsWithQueue` method creates an AWS Custom Resource that:

1. **On Create**: Calls `AssociateQueueQuickConnects` API
2. **On Update**: Re-associates quick connects if the list changes
3. **On Delete**: Calls `DisassociateQueueQuickConnects` to clean up

This ensures quick connects are properly associated during CDK deployment and removed on stack deletion.

### IAM Permissions

The custom resource automatically creates the required IAM permissions:

- `connect:AssociateQueueQuickConnects`
- `connect:DisassociateQueueQuickConnects`
- `connect:ListQueueQuickConnects`

### Complete Example

```csharp
public void ConfigureQuickConnects(ISwitchboardStack stack, SwitchboardOptions options)
{
    // Get queues
    var salesQueue = _registry.Get<QueueConstruct>("SalesQueue");
    var supportQueue = _registry.Get<QueueConstruct>("SupportQueue");

    // Create quick connects using presets
    var emergencyQc = QuickConnect.Create()
        .UsePreset(QuickConnectPresets.EmergencyLine)
        .ForPhoneNumber("+18005551234")
        .Build(stack);

    var mainOfficeQc = QuickConnect.Create()
        .UsePreset(QuickConnectPresets.MainOffice)
        .ForPhoneNumber("+18005555678")
        .Build(stack);

    // Bulk create phone number quick connects
    stack.AddPhoneNumberQuickConnects(new Dictionary<string, string>
    {
        ["Partner Support"] = "+18005550001",
        ["Billing"] = "+18005550002"
    });

    // Create queue quick connects (if transfer flow exists)
    var transferFlow = stack.GetFlow("TransferToQueue");
    if (transferFlow != null)
    {
        stack.AddQueueQuickConnects(transferFlow, salesQueue, supportQueue);
    }

    // Associate quick connects with queues
    // Sales agents see: Emergency, Main Office, Transfer to Support
    stack.AssociateQuickConnectsWithQueue(
        salesQueue,
        emergencyQc,
        mainOfficeQc);

    stack.AssociateQuickConnectsWithQueue(
        "Sales",
        "Transfer to Support");

    // Support agents see: Emergency, Main Office, Transfer to Sales
    stack.AssociateQuickConnectsWithQueue(
        "Support",
        "Emergency Line",
        "Main Office",
        "Transfer to Sales");
}
```

---

## Using the Provider Pattern

For larger contact centers, use the `IQuickConnectProvider` interface to organize quick connect creation:

```csharp
public class QuickConnectResourceProvider : IQuickConnectProvider
{
    private readonly IResourceRegistry _registry;

    public QuickConnectResourceProvider(IResourceRegistry registry)
    {
        _registry = registry;
    }

    // Quick connects execute at Order = 380 (after flows are built)
    public int Order => 380;

    public void ConfigureQuickConnects(ISwitchboardStack stack, SwitchboardOptions options)
    {
        // Get resources from registry
        var salesQueue = _registry.Get<QueueConstruct>("SalesQueue");
        var supportQueue = _registry.Get<QueueConstruct>("SupportQueue");

        // Phone number quick connects
        CreatePhoneNumberQuickConnects(stack);

        // Queue quick connects (if transfer flow exists)
        var transferFlow = stack.GetFlow("TransferToQueue");
        if (transferFlow != null)
        {
            CreateQueueQuickConnects(stack, salesQueue, supportQueue, transferFlow);
        }
    }

    private void CreatePhoneNumberQuickConnects(ISwitchboardStack stack)
    {
        QuickConnect
            .Create("Emergency Line")
            .SetDescription("Emergency hotline")
            .ForPhoneNumber("+18005551234")
            .AddTag("Type", "Emergency")
            .Build(stack);

        QuickConnect
            .Create("Main Office")
            .SetDescription("Main office reception")
            .ForPhoneNumber("+18005555678")
            .AddTag("Type", "Internal")
            .Build(stack);
    }

    private void CreateQueueQuickConnects(
        ISwitchboardStack stack,
        QueueConstruct salesQueue,
        QueueConstruct supportQueue,
        FlowConstruct transferFlow)
    {
        QuickConnect
            .Create("Transfer to Sales")
            .ForQueue(salesQueue, transferFlow)
            .AddTag("Type", "Queue")
            .Build(stack);

        QuickConnect
            .Create("Transfer to Support")
            .ForQueue(supportQueue, transferFlow)
            .AddTag("Type", "Queue")
            .Build(stack);
    }
}
```

### Execution Order

Quick connect providers execute at **Order = 380**, which is:
- After flows are built (so you can reference transfer flows)
- Before post-flow configuration (Order = 400)

This ensures all queues, flows, and other resources are available.

---

## Using the Fluent Stack API

You can also create quick connects directly on the stack with a fluent API:

```csharp
stack
    .AddQuickConnect("Emergency Line", qc => qc
        .SetDescription("Emergency external line")
        .ForPhoneNumber("+18005551234")
        .AddTag("Type", "Emergency"))

    .AddQuickConnect("Main Office", qc => qc
        .SetDescription("Main office reception")
        .ForPhoneNumber("+18005555678")
        .AddTag("Type", "Internal"))

    .AddQuickConnect("Transfer to Sales", qc => qc
        .SetDescription("Transfer to Sales queue")
        .ForQueue(salesQueue, transferFlow)
        .AddTag("Type", "Queue"));
```

---

## Complete Example

Here's a comprehensive example showing all quick connect types:

```csharp
public class CallCenterResources : IQuickConnectProvider
{
    private readonly IResourceRegistry _registry;

    public CallCenterResources(IResourceRegistry registry)
    {
        _registry = registry;
    }

    public int Order => 380;

    public void ConfigureQuickConnects(ISwitchboardStack stack, SwitchboardOptions options)
    {
        var salesQueue = _registry.Get<QueueConstruct>("SalesQueue");
        var supportQueue = _registry.Get<QueueConstruct>("SupportQueue");

        // ============================================
        // Phone Number Quick Connects
        // ============================================

        // Emergency - highest priority external transfer
        QuickConnect
            .Create("Emergency Line")
            .SetDescription("Emergency hotline for critical escalations")
            .ForPhoneNumber("+18005551234")
            .AddTag("Type", "Emergency")
            .AddTag("Priority", "Critical")
            .Build(stack);

        // Internal - main office
        QuickConnect
            .Create("Main Office")
            .SetDescription("Main office reception line")
            .ForPhoneNumber("+18005555678")
            .AddTag("Type", "Internal")
            .AddTag("Department", "Reception")
            .Build(stack);

        // External vendor support
        QuickConnect
            .Create("Vendor Support")
            .SetDescription("External vendor technical support")
            .ForPhoneNumber("+18005559999")
            .AddTag("Type", "External")
            .AddTag("Department", "TechSupport")
            .Build(stack);

        // ============================================
        // Queue Quick Connects
        // ============================================

        var transferToQueueFlow = stack.GetFlow("TransferToQueue");

        if (transferToQueueFlow != null)
        {
            QuickConnect
                .Create("Transfer to Sales")
                .SetDescription("Transfer call to Sales queue")
                .ForQueue(salesQueue, transferToQueueFlow)
                .AddTag("Type", "Queue")
                .AddTag("Department", "Sales")
                .Build(stack);

            QuickConnect
                .Create("Transfer to Support")
                .SetDescription("Transfer call to Technical Support queue")
                .ForQueue(supportQueue, transferToQueueFlow)
                .AddTag("Type", "Queue")
                .AddTag("Department", "Support")
                .Build(stack);
        }

        // ============================================
        // User Quick Connects (Agent-to-Agent)
        // ============================================

        var transferToAgentFlow = stack.GetFlow("TransferToAgent");

        if (transferToAgentFlow != null)
        {
            // Note: Replace with actual user IDs from your Connect instance
            QuickConnect
                .Create("Call Supervisor")
                .SetDescription("Transfer call to shift supervisor")
                .ForUser("supervisor-user-id", transferToAgentFlow)
                .AddTag("Type", "User")
                .AddTag("Role", "Supervisor")
                .Build(stack);
        }
    }
}
```

---

## IQuickConnectBuilder Methods

| Method | Description |
|--------|-------------|
| `SetName(string)` | Sets the quick connect name (required unless using preset) |
| `SetDescription(string)` | Sets the description (max 250 chars) |
| `UsePreset(IQuickConnectPreset)` | Applies a preset configuration (name, description, tags) |
| `ForPhoneNumber(string)` | Configures as phone number type |
| `ForUser(string, string)` | Configures as user type (userId, flowArn) |
| `ForUser(string, FlowConstruct)` | Configures as user type with flow construct |
| `ForQueue(string, string)` | Configures as queue type (queueArn, flowArn) |
| `ForQueue(QueueConstruct, FlowConstruct)` | Configures as queue type with constructs |
| `AddTag(string, string)` | Adds a resource tag |
| `Build()` | Builds the QuickConnect model |
| `Build(ISwitchboardStack)` | Builds and adds to stack |

## Extension Methods

| Method | Description |
|--------|-------------|
| `AddQuickConnects(IEnumerable<QuickConnect>)` | Adds multiple pre-built quick connects |
| `AddQuickConnects(params (string, Action<QuickConnectBuilder>)[])` | Adds multiple quick connects with configuration |
| `AddPhoneNumberQuickConnects(IDictionary<string, string>)` | Creates phone number quick connects from name→number dictionary |
| `AddQueueQuickConnects(FlowConstruct, params QueueConstruct[])` | Creates queue quick connects with auto-generated names |
| `AddQueueQuickConnects(FlowConstruct, params (QueueConstruct, string)[])` | Creates queue quick connects with custom names |
| `AddUserQuickConnects(FlowConstruct, IDictionary<string, string>)` | Creates user quick connects from name→userId dictionary |
| `AssociateQuickConnectsWithQueue(QueueConstruct, params QuickConnectConstruct[])` | Associates quick connects with queue (constructs) |
| `AssociateQuickConnectsWithQueue(string, params string[])` | Associates quick connects with queue (names) |

---

## AWS Limits

| Property | Limit |
|----------|-------|
| Name length | 127 characters |
| Description length | 250 characters |
| Quick connects per instance | 1000 |
| Phone number format | E.164 |

---

## Important Notes

### Queue Association

Quick connects must be **associated with queues** to appear in the agent's CCP. Switchboard provides built-in support for this via a CDK custom resource:

```csharp
// Recommended: Use the built-in AssociateQuickConnectsWithQueue method
stack.AssociateQuickConnectsWithQueue(salesQueue, emergencyQc, mainOfficeQc);

// Or use names
stack.AssociateQuickConnectsWithQueue("Support", "Emergency Line", "Main Office");
```

This automatically calls the `AssociateQueueQuickConnects` API during deployment and cleans up on stack deletion.

::: tip Alternative Methods
If you prefer manual control, you can also use:
- **AWS Console**: Users → Quick Connects → Edit Queue Associations
- **AWS CLI**: `aws connect associate-queue-quick-connects`
- **SDK**: Connect API's `AssociateQueueQuickConnects` method
:::

### Transfer Flows

- **Phone Number**: No flow required
- **Queue**: Requires a Transfer to Queue flow
- **User**: Requires a Transfer to Agent flow

AWS provides default transfer flows, but you can create custom flows for additional logic (e.g., playing a message before transfer, setting attributes).

### Retrieving Quick Connects

Get a quick connect from the stack by name:

```csharp
var emergencyQuickConnect = stack.GetQuickConnect("Emergency Line");
if (emergencyQuickConnect != null)
{
    Console.WriteLine($"ARN: {emergencyQuickConnect.QuickConnectArn}");
    Console.WriteLine($"Type: {emergencyQuickConnect.QuickConnectType}");
}
```

---

## Best Practices

1. **Use descriptive names**: Help agents understand the destination
2. **Add descriptions**: Explain when to use each quick connect
3. **Organize with tags**: Group by type, department, or priority
4. **Limit the list**: Too many quick connects can overwhelm agents
5. **Review regularly**: Remove outdated quick connects
6. **Test transfers**: Verify each quick connect works correctly
7. **Document procedures**: Train agents on when to use each option

---

## Related Topics

- [Building Queues](/building/queues) - Create queues for queue quick connects
- [Building Contact Flows](/building/flows) - Create transfer flows
- [Building Users](/building/users) - Manage users for user quick connects
