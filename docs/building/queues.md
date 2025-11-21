# Building Queues

## What is a Queue?

A **queue** is where callers wait before being connected to an available agent. Think of it like a virtual waiting room - callers enter the queue, wait their turn, and get connected to the next available agent.

### Real-World Examples

- **Sales Queue**: Callers waiting to talk to sales representatives
- **Support Queue**: Customers waiting for technical support
- **VIP Queue**: Priority queue for your most important customers
- **Billing Queue**: Dedicated queue for billing inquiries

### How Queues Work in Contact Centers

1. **Caller enters queue** → Via contact flow transfer
2. **Queue music/announcements play** → Keeps caller informed while waiting
3. **Agent becomes available** → System finds next caller in queue
4. **Call connects** → Agent and caller are connected

### When You Need Queues

Create queues whenever you want to:

- Organize calls by department (Sales, Support, Billing)
- Route calls to specialized agents (Technical, VIP, Spanish-speaking)
- Manage call volumes and wait times
- Track queue metrics (average wait time, calls answered, etc.)
- Set capacity limits to prevent overwhelming agents

---

## Creating Your First Queue

Let's build a simple queue step-by-step.

### Step 1: Use QueueBuilder

The easiest way to create a queue is with `QueueBuilder`:

```csharp
var queue = new QueueBuilder()
    .SetName("CustomerSupport")
    .Build();
```

**That's it!** This creates a basic queue with default settings.

### Step 2: Add to Stack

Add the queue to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

var queue = new QueueBuilder()
    .SetName("CustomerSupport")
    .Build();

stack.AddQueue(queue);

app.Synth();
```

### Step 3: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first queue. Now callers can be transferred to the "CustomerSupport" queue from contact flows.

---

## Queue Configuration

Let's explore the different settings you can configure for queues.

### Setting Queue Name (Required)

Every queue must have a unique name:

```csharp
var queue = new QueueBuilder()
    .SetName("Sales")
    .Build();
```

**Naming Tips:**
- Use descriptive names (Sales, Support, Billing)
- Be consistent (avoid "sales", "Sales_Queue", "SALES")
- No special characters (use letters, numbers, and hyphens)
- Keep it short but meaningful

### Setting Description (Optional)

Add a description to document the queue's purpose:

```csharp
var queue = new QueueBuilder()
    .SetName("VIPSupport")
    .SetDescription("Priority queue for VIP customers with premium support contracts")
    .Build();
```

**When to use:**
- Documenting queue purpose for your team
- Explaining special routing rules
- Noting capacity limits or business hours

### Setting Capacity - Max Contacts (Optional)

Limit how many callers can wait in the queue at once:

```csharp
var queue = new QueueBuilder()
    .SetName("Support")
    .SetMaxContacts(100)
    .Build();
```

**What happens when the queue is full?**
- New callers hear a "queue full" message
- Contact flow can route to overflow queue
- Or play a callback offer message

**When to set capacity:**
- Prevent extremely long wait times
- Match queue size to staffing levels
- Force overflow routing when overloaded
- Improve customer experience with callbacks

**Default:** No limit (queue can grow indefinitely)

**Example with overflow:**

```csharp
// Main queue with capacity limit
var mainQueue = new QueueBuilder()
    .SetName("Support")
    .SetMaxContacts(50)
    .Build();

// Overflow queue
var overflowQueue = new QueueBuilder()
    .SetName("SupportOverflow")
    .SetMaxContacts(25)
    .Build();

// Flow checks queue status
var flow = new FlowBuilder()
    .SetName("SupportRouting")
    .CheckQueueStatus("Support")
    .Branch(branch =>
    {
        branch.When("$.Queue.IsFull == false", "transfer-main");
        branch.Otherwise("transfer-overflow");
    })
    .Build();
```

### Setting Outbound Caller ID (Optional)

Configure the phone number and name shown when agents call from this queue:

```csharp
var queue = new QueueBuilder()
    .SetName("Sales")
    .SetOutboundCallerId("Acme Sales Team", "+18005551234")
    .Build();
```

**When to use:**
- Different departments use different numbers
- Branding (show company name to customers)
- Tracking (know which queue called back)
- Compliance (display correct business phone number)

**Parameters:**
- **Name**: What displays to the called party (e.g., "Acme Sales")
- **Number**: The phone number displayed (must be claimed in Amazon Connect)

**Important:** The phone number must be:
- Claimed in your Amazon Connect instance
- Enabled for outbound calls

### Adding Tags (Optional)

Tags help organize and track queues for cost allocation and reporting:

```csharp
var queue = new QueueBuilder()
    .SetName("Support")
    .AddTag("Department", "CustomerService")
    .AddTag("CostCenter", "CC-1234")
    .AddTag("Environment", "Production")
    .Build();
```

**Common tag uses:**
- **Department**: Track which team owns the queue
- **Environment**: Separate dev/staging/production queues
- **CostCenter**: Allocate AWS costs to business units
- **Region**: Track queues by geographic region

---

## Associating with Hours of Operation

Queues can be linked to business hours schedules. This determines when the queue is "open" for receiving calls.

### Why Hours Matter

When you associate hours with a queue:
- Contact flows can check if the queue is open
- Route callers differently during/after hours
- Display accurate status to agents

### How to Link Hours to Queues

**Option 1: When adding to stack (Recommended)**

```csharp
// Create hours of operation
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

// Create queue
var queue = new QueueBuilder()
    .SetName("Support")
    .Build();

// Associate queue with hours when adding to stack
stack.AddQueue(queue, "BusinessHours");
```

**Option 2: Using SetHoursOfOperation (Advanced)**

```csharp
var queue = new QueueBuilder()
    .SetName("Support")
    .SetHoursOfOperation("arn:aws:connect:us-east-1:123456789012:instance/abc/hours/xyz")
    .Build();
```

**Recommendation:** Use Option 1 - it's cleaner and handles ARN resolution automatically.

---

## Complete Queue Examples

### Basic Support Queue

Simple queue for general customer support:

```csharp
var supportQueue = new QueueBuilder()
    .SetName("CustomerSupport")
    .SetDescription("General customer support queue")
    .SetMaxContacts(100)
    .Build();

stack.AddQueue(supportQueue, "BusinessHours");
```

### VIP Queue

Priority queue for VIP customers:

```csharp
var vipQueue = new QueueBuilder()
    .SetName("VIPSupport")
    .SetDescription("Priority queue for VIP customers")
    .SetMaxContacts(50)
    .SetOutboundCallerId("VIP Support Team", "+18005559999")
    .AddTag("Priority", "High")
    .AddTag("SLA", "5-minutes")
    .Build();

stack.AddQueue(vipQueue, "24x7Hours");
```

### After-Hours Queue

Queue with different hours and callback option:

```csharp
var afterHoursQueue = new QueueBuilder()
    .SetName("AfterHoursSupport")
    .SetDescription("Limited support queue for after-hours calls")
    .SetMaxContacts(10)
    .AddTag("Shift", "AfterHours")
    .Build();

// Different hours schedule
var afterHours = new HoursOfOperation
{
    Name = "AfterHours",
    TimeZone = "America/New_York"
};
afterHours.AddDayConfig(new HoursOfOperationConfig
{
    Day = DayOfWeek.Monday,
    StartTime = new TimeRange { Hours = 17, Minutes = 0 },
    EndTime = new TimeRange { Hours = 21, Minutes = 0 }
});

stack.AddHoursOfOperation(afterHours);
stack.AddQueue(afterHoursQueue, "AfterHours");
```

### Department-Specific Queues

Multiple queues for different departments:

```csharp
var salesQueue = new QueueBuilder()
    .SetName("Sales")
    .SetDescription("Sales inquiries and new customers")
    .SetMaxContacts(75)
    .SetOutboundCallerId("Acme Sales", "+18005551000")
    .AddTag("Department", "Sales")
    .Build();

var supportQueue = new QueueBuilder()
    .SetName("TechnicalSupport")
    .SetDescription("Technical support for existing customers")
    .SetMaxContacts(150)
    .SetOutboundCallerId("Acme Support", "+18005552000")
    .AddTag("Department", "Support")
    .Build();

var billingQueue = new QueueBuilder()
    .SetName("Billing")
    .SetDescription("Billing and account inquiries")
    .SetMaxContacts(50)
    .SetOutboundCallerId("Acme Billing", "+18005553000")
    .AddTag("Department", "Billing")
    .Build();

// Add all to stack
stack.AddQueue(salesQueue, "BusinessHours");
stack.AddQueue(supportQueue, "ExtendedHours");
stack.AddQueue(billingQueue, "BusinessHours");
```

---

## Using Queues in Contact Flows

Once you've created queues, reference them in contact flows:

### Simple Transfer

```csharp
var flow = new FlowBuilder()
    .SetName("TransferToSupport")
    .PlayPrompt("Transferring you to customer support")
    .TransferToQueue("CustomerSupport")
    .Build();
```

### IVR Menu with Multiple Queues

```csharp
var flow = new FlowBuilder()
    .SetName("DepartmentMenu")
    .GetCustomerInput("Press 1 for sales, 2 for support, or 3 for billing")
    .Branch(branch =>
    {
        branch.Case("1", "sales-transfer");
        branch.Case("2", "support-transfer");
        branch.Case("3", "billing-transfer");
        branch.Otherwise("default-queue");
    })
    .PlayPrompt("Transferring to sales", "sales-transfer")
    .TransferToQueue("Sales")
    .Build();

// Add queues before flow
stack.AddQueue(salesQueue);
stack.AddQueue(supportQueue);
stack.AddQueue(billingQueue);
stack.AddFlow(flow); // Now flow can reference queues
```

### Queue Priority Routing

Route VIP customers to priority queue:

```csharp
var flow = new FlowBuilder()
    .SetName("VIPRouter")
    .InvokeLambda("CustomerLookup")
    .Branch(branch =>
    {
        branch.When("$.External.CustomerType == \"VIP\"", "vip-queue");
        branch.Otherwise("standard-queue");
    })
    .PlayPrompt("Transferring to our VIP support team", "vip-queue")
    .TransferToQueue("VIPSupport")
    .PlayPrompt("Transferring to customer support", "standard-queue")
    .TransferToQueue("CustomerSupport")
    .Build();
```

---

## Queue Best Practices

### 1. Set Realistic Capacity Limits

Match queue capacity to your staffing:

```csharp
// If you have 10 agents, don't allow 500 callers in queue
var queue = new QueueBuilder()
    .SetName("Support")
    .SetMaxContacts(50) // 5x your agent count
    .Build();
```

**Rule of thumb:** 3-5x your average agent count

### 2. Use Descriptive Names

Queue names show up in reports and agent dashboards:

```csharp
// Good - Clear and descriptive
.SetName("TechnicalSupportTier2")
.SetName("SpanishBillingSupport")

// Bad - Vague or cryptic
.SetName("Queue1")
.SetName("Q_TS_2")
```

### 3. Tag Consistently

Apply consistent tags across all queues:

```csharp
var standardTags = new Dictionary<string, string>
{
    ["Environment"] = "Production",
    ["ManagedBy"] = "CDK"
};

var queue = new QueueBuilder()
    .SetName("Sales")
    .AddTag("Department", "Sales")
    .AddTag("Environment", standardTags["Environment"])
    .AddTag("ManagedBy", standardTags["ManagedBy"])
    .Build();
```

### 4. Always Associate Hours

Link queues to hours of operation schedules:

```csharp
// Create hours first
var hours = CreateBusinessHours();
stack.AddHoursOfOperation(hours);

// Then associate with queue
stack.AddQueue(queue, "BusinessHours");
```

This enables flows to check queue availability.

### 5. Plan for Overflow

Create overflow queues for high-volume scenarios:

```csharp
var mainQueue = new QueueBuilder()
    .SetName("Support")
    .SetMaxContacts(100)
    .Build();

var overflowQueue = new QueueBuilder()
    .SetName("SupportOverflow")
    .SetMaxContacts(50)
    .Build();

stack.AddQueue(mainQueue);
stack.AddQueue(overflowQueue);
```

### 6. Use Outbound Caller ID Strategically

Set meaningful caller IDs for callback scenarios:

```csharp
var queue = new QueueBuilder()
    .SetName("Sales")
    .SetOutboundCallerId(
        "Acme Sales - Return Call",  // Shows to customer
        "+18005551234"                 // Must be claimed in Connect
    )
    .Build();
```

---

## Common Queue Configurations

### 24/7 Support Queue

```csharp
var hours24x7 = new HoursOfOperation
{
    Name = "24x7",
    TimeZone = "UTC"
};

for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
{
    hours24x7.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 0, Minutes = 0 },
        EndTime = new TimeRange { Hours = 23, Minutes = 59 }
    });
}

stack.AddHoursOfOperation(hours24x7);

var supportQueue = new QueueBuilder()
    .SetName("24x7Support")
    .SetMaxContacts(200)
    .Build();

stack.AddQueue(supportQueue, "24x7");
```

### Business Hours Only Queue

```csharp
var businessHours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

// Monday-Friday 9am-5pm
for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    businessHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}

stack.AddHoursOfOperation(businessHours);

var salesQueue = new QueueBuilder()
    .SetName("Sales")
    .SetMaxContacts(50)
    .Build();

stack.AddQueue(salesQueue, "BusinessHours");
```

### Multi-Language Queues

```csharp
var englishQueue = new QueueBuilder()
    .SetName("EnglishSupport")
    .SetDescription("English-speaking support agents")
    .AddTag("Language", "English")
    .Build();

var spanishQueue = new QueueBuilder()
    .SetName("SpanishSupport")
    .SetDescription("Spanish-speaking support agents")
    .AddTag("Language", "Spanish")
    .Build();

var frenchQueue = new QueueBuilder()
    .SetName("FrenchSupport")
    .SetDescription("French-speaking support agents")
    .AddTag("Language", "French")
    .Build();

stack.AddQueue(englishQueue, "BusinessHours");
stack.AddQueue(spanishQueue, "BusinessHours");
stack.AddQueue(frenchQueue, "BusinessHours");
```

---

## Troubleshooting Queues

### Issue: Queue Not Found in Flow

**Problem:**
```csharp
var flow = new FlowBuilder()
    .SetName("TransferFlow")
    .TransferToQueue("NonExistentQueue")
    .Build();

stack.AddFlow(flow); // Deployment fails!
```

**Solution:** Create and add the queue before the flow:

```csharp
var queue = new QueueBuilder()
    .SetName("NonExistentQueue")
    .Build();

stack.AddQueue(queue);  // Add queue first
stack.AddFlow(flow);    // Then add flow
```

### Issue: Invalid Max Contacts

**Problem:**
```csharp
var queue = new QueueBuilder()
    .SetName("BadQueue")
    .SetMaxContacts(0) // Invalid!
    .Build();
```

**Error:** `ArgumentException: MaxContacts must be greater than 0`

**Solution:** Set a positive number:

```csharp
var queue = new QueueBuilder()
    .SetName("GoodQueue")
    .SetMaxContacts(50) // Valid
    .Build();
```

### Issue: Hours of Operation Not Found

**Problem:**
```csharp
stack.AddQueue(queue, "NonExistentHours"); // Hours not created!
```

**Error:** `InvalidOperationException: Hours of operation 'NonExistentHours' not found`

**Solution:** Create hours before referencing:

```csharp
var hours = new HoursOfOperation
{
    Name = "NonExistentHours",
    TimeZone = "UTC"
};
hours.AddDayConfig(/* ... */);

stack.AddHoursOfOperation(hours);  // Add hours first
stack.AddQueue(queue, "NonExistentHours"); // Then reference
```

---

## Next Steps

Now that you understand queues, explore these related topics:

- **[Building Routing Profiles](/building/routing-profiles)** - Assign queues to agents
- **[Business Hours](/building/hours-of-operation)** - Configure queue schedules
- **[Building Flows](/building/flows)** - Route calls to queues
- **[Complete Example](/building/complete-example)** - Build a full contact center

---

## Quick Reference

### Basic Queue Template

```csharp
var queue = new QueueBuilder()
    .SetName("QueueName")
    .SetDescription("Optional description")
    .SetMaxContacts(100)
    .SetOutboundCallerId("Display Name", "+18005551234")
    .AddTag("Department", "Sales")
    .Build();

stack.AddQueue(queue, "BusinessHours");
```

### Queue Configuration Checklist

- [ ] Unique, descriptive name
- [ ] Appropriate max contacts limit
- [ ] Associated with hours of operation
- [ ] Outbound caller ID configured (if needed)
- [ ] Tags applied for organization
- [ ] Referenced in contact flows
- [ ] Added to routing profiles

### Common Queue Patterns

```csharp
// Simple queue
var simple = new QueueBuilder()
    .SetName("Support")
    .Build();

// Full-featured queue
var advanced = new QueueBuilder()
    .SetName("VIPSupport")
    .SetDescription("Priority VIP queue")
    .SetMaxContacts(50)
    .SetOutboundCallerId("VIP Team", "+18005559999")
    .AddTag("Priority", "High")
    .Build();

// Multiple department queues
var sales = new QueueBuilder().SetName("Sales").Build();
var support = new QueueBuilder().SetName("Support").Build();
var billing = new QueueBuilder().SetName("Billing").Build();

// Add to stack
stack.AddQueue(sales, "BusinessHours");
stack.AddQueue(support, "ExtendedHours");
stack.AddQueue(billing, "BusinessHours");
```

---

## Getting Help

If you run into issues:

1. Check the [Stack API Reference](/reference/stack) for queue methods
2. Review [Complete Example](/building/complete-example) for working queue setup
3. Explore the [Examples](/examples/minimal-setup) for common patterns
4. File an issue on [GitHub](https://github.com/nicksoftware/AmazonConnectBuilderFramework)
