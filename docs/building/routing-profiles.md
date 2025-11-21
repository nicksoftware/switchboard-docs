# Building Routing Profiles

## What is a Routing Profile?

A **routing profile** defines how agents handle customer contacts. It controls which communication channels (voice, chat, tasks) an agent can handle, how many at once, and which queues they service.

Think of it as an agent's job description for the contact center - it tells Amazon Connect what type of work each agent can do and which customers they can help.

### Real-World Examples

- **Voice-Only Agent**: Handles only phone calls, one at a time
- **Omnichannel Agent**: Handles 1 voice call + 3 chats + 5 tasks simultaneously
- **Specialized Agent**: Works specific queues (VIP customers, Spanish-speaking)
- **Manager Profile**: Can handle calls from multiple departments

### How Routing Profiles Work

1. **Agent logs in** → Amazon Connect checks their routing profile
2. **Profile defines capabilities** → Voice? Chat? Tasks? How many simultaneously?
3. **Profile defines queues** → Which queues can this agent service?
4. **Queue priority** → Which queues take priority when multiple have waiting contacts?
5. **Contact routing** → Amazon Connect routes contacts based on profile settings

### When You Need Routing Profiles

Create routing profiles whenever you want to:

- Define which channels agents can handle (voice, chat, task)
- Set concurrency limits (how many simultaneous contacts)
- Assign agents to specific queues
- Set queue priorities for agents
- Create specialized agent roles (VIP support, technical, billing)

---

## Creating Your First Routing Profile

Let's build a simple voice-only agent profile step-by-step.

### Step 1: Use RoutingProfileBuilder

The easiest way to create a routing profile:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("GeneralAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, priority: 1)
    .Build();
```

**What this does:**
- Creates a profile named "GeneralAgent"
- Agent can handle 1 voice call at a time
- Agent services the "Sales" queue

### Step 2: Add to Stack

Add the profile to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

// Create queue first
var salesQueue = new QueueBuilder()
    .SetName("Sales")
    .Build();
stack.AddQueue(salesQueue);

// Create routing profile
var profile = new RoutingProfileBuilder()
    .SetName("GeneralAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, priority: 1)
    .Build();

stack.AddRoutingProfile(profile);

app.Synth();
```

### Step 3: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first routing profile. Now you can assign agents to this profile when creating users.

---

## Routing Profile Configuration

Let's explore the different settings you can configure.

### Setting Profile Name (Required)

Every routing profile must have a unique name:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("SalesAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, 1)
    .Build();
```

**Naming Tips:**
- Use descriptive names (SalesAgent, SupportSpecialist, VIPAgent)
- Be consistent with your naming convention
- Indicate the role or specialization

### Setting Description (Optional)

Add a description to document the profile's purpose:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("OmnichannelAgent")
    .SetDescription("Agents handling voice, chat, and tasks across all departments")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, 1)
    .Build();
```

**Description Best Practices:**
- Explain who uses this profile
- Document any special permissions or capabilities
- Note which departments or teams use it

---

## Media Concurrency - Channel Configuration

Media concurrency defines which communication channels an agent can handle and how many at once.

### Understanding Channel Types

Amazon Connect supports three channel types:

| Channel Type | What It Is | Example |
|--------------|------------|---------|
| **Voice** | Phone calls | Customer calls support line |
| **Chat** | Text conversations | Live chat on website |
| **Task** | Async work items | Follow-up tasks, emails, cases |

### Voice-Only Agent (1 Call at a Time)

Most common configuration for traditional call centers:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("VoiceOnlyAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1) // 1 voice call only
    .AddQueue("Support", ChannelType.Voice, 1)
    .Build();
```

**When to use:**
- Traditional call center operations
- Complex calls requiring full agent attention
- New agents learning the system

### Chat Agent (Multiple Chats Simultaneously)

Agents can handle multiple chat conversations:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("ChatAgent")
    .AddMediaConcurrency(ChannelType.Chat, 3) // Up to 3 chats at once
    .AddQueue("ChatSupport", ChannelType.Chat, 1)
    .Build();
```

**When to use:**
- Website live chat support
- Text-based customer service
- Agents comfortable multitasking

**Concurrency Recommendations:**
- **Beginners**: 2-3 chats
- **Experienced**: 3-5 chats
- **Expert**: 5-8 chats (depends on complexity)

### Task Agent (Async Work Items)

Agents work on asynchronous tasks:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("TaskAgent")
    .AddMediaConcurrency(ChannelType.Task, 5) // Up to 5 tasks at once
    .AddQueue("FollowUpTasks", ChannelType.Task, 1)
    .Build();
```

**When to use:**
- Email responses
- Case management
- Follow-up work
- Administrative tasks

### Omnichannel Agent (All Channels)

Agents handle voice, chat, and tasks simultaneously:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("OmnichannelAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)  // 1 voice call
    .AddMediaConcurrency(ChannelType.Chat, 3)   // + 3 chats
    .AddMediaConcurrency(ChannelType.Task, 5)   // + 5 tasks
    .AddQueue("Support", ChannelType.Voice, 1)
    .AddQueue("ChatSupport", ChannelType.Chat, 1)
    .AddQueue("Tasks", ChannelType.Task, 1)
    .Build();
```

**When to use:**
- Modern contact centers
- Experienced agents
- Flexible staffing needs
- Maximum efficiency

**Important:** When an agent is on a voice call, they typically can't take new chats or tasks (Amazon Connect manages this automatically).

---

## Queue Configuration - Assigning Queues

Routing profiles define which queues an agent services and in what order.

### Adding a Single Queue

Simplest configuration:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("SalesAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Sales", ChannelType.Voice, priority: 1)
    .Build();
```

**Parameters:**
- **Queue name**: "Sales" (must match queue created in stack)
- **Channel**: ChannelType.Voice (which channel for this queue)
- **Priority**: 1 (highest priority)

### Adding Multiple Queues

Agents can service multiple queues:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("MultiQueueAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("VIPSupport", ChannelType.Voice, priority: 1)
    .AddQueue("GeneralSupport", ChannelType.Voice, priority: 2)
    .AddQueue("AfterHours", ChannelType.Voice, priority: 3)
    .Build();
```

**How it works:**
- Agent gets VIP calls first (priority 1)
- If no VIP calls, gets General Support calls (priority 2)
- If no general calls, gets After Hours calls (priority 3)

### Understanding Queue Priority

Priority determines which queue's contacts an agent receives first:

| Priority | Meaning | When Agent Gets These Calls |
|----------|---------|----------------------------|
| **1** | Highest | Always first if contacts waiting |
| **2** | Medium | Only if no priority 1 contacts |
| **3+** | Lower | Only if no higher priority contacts |

**Example Scenario:**

```csharp
.AddQueue("VIPQueue", ChannelType.Voice, priority: 1)       // Always first
.AddQueue("StandardQueue", ChannelType.Voice, priority: 2)  // Second
.AddQueue("OverflowQueue", ChannelType.Voice, priority: 3)  // Last
```

If there are 5 VIP calls and 100 standard calls waiting:
- Agent will **always** get VIP calls until VIP queue is empty
- Only then will agent get standard calls

### Queue Delay (Advanced)

Add delay before routing to a queue:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("EscalationAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("ImmediateQueue", ChannelType.Voice, priority: 1, delay: 0)
    .AddQueue("DelayedQueue", ChannelType.Voice, priority: 2, delay: 30) // Wait 30 seconds
    .Build();
```

**When to use delays:**
- Escalation queues (wait before escalating)
- Overflow handling (try other queues first)
- Load balancing across queues

**How delay works:**
- Contact waits in queue for `delay` seconds
- After delay, contact becomes eligible for agents with this profile
- Lower priority queues with shorter delays can serve contacts before higher priority queues with longer delays

---

## Default Outbound Queue

Set which queue is used for outbound calls:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("OutboundAgent")
    .SetDefaultOutboundQueue("OutboundSalesQueue") // For outbound calls
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("InboundSales", ChannelType.Voice, 1)
    .AddQueue("OutboundSalesQueue", ChannelType.Voice, 2)
    .Build();
```

**When to use:**
- Agents make outbound calls
- Mixed inbound/outbound operations
- Call-back campaigns

---

## Complete Examples

### Example 1: Basic Call Center Agent

Simple voice-only agent for one queue:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("BasicAgent")
    .SetDescription("Standard call center agent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("CustomerService", ChannelType.Voice, priority: 1)
    .Build();

stack.AddRoutingProfile(profile);
```

### Example 2: Tiered Support Agent

Agent handles VIP and standard queues with priority:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("TieredSupportAgent")
    .SetDescription("Handles both VIP and standard support")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("VIPSupport", ChannelType.Voice, priority: 1, delay: 0)
    .AddQueue("StandardSupport", ChannelType.Voice, priority: 2, delay: 0)
    .Build();

stack.AddRoutingProfile(profile);
```

### Example 3: Chat Specialist

Agent focused on chat support:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("ChatSpecialist")
    .SetDescription("Handles multiple chat conversations")
    .AddMediaConcurrency(ChannelType.Chat, 5) // 5 simultaneous chats
    .AddQueue("LiveChatSupport", ChannelType.Chat, priority: 1)
    .Build();

stack.AddRoutingProfile(profile);
```

### Example 4: Omnichannel Power User

Experienced agent handling all channel types:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("OmnichannelPowerUser")
    .SetDescription("Experienced agent handling voice, chat, and tasks")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddMediaConcurrency(ChannelType.Chat, 3)
    .AddMediaConcurrency(ChannelType.Task, 5)
    .AddQueue("VIPSupport", ChannelType.Voice, priority: 1)
    .AddQueue("GeneralSupport", ChannelType.Voice, priority: 2)
    .AddQueue("ChatQueue", ChannelType.Chat, priority: 1)
    .AddQueue("TaskQueue", ChannelType.Task, priority: 1)
    .Build();

stack.AddRoutingProfile(profile);
```

### Example 5: Outbound Sales Team

Mixed inbound/outbound with default outbound queue:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("OutboundSalesAgent")
    .SetDescription("Handles inbound inquiries and makes outbound sales calls")
    .SetDefaultOutboundQueue("OutboundSales")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("InboundSales", ChannelType.Voice, priority: 1)
    .AddQueue("OutboundSales", ChannelType.Voice, priority: 2)
    .Build();

stack.AddRoutingProfile(profile);
```

---

## Best Practices

### 1. Start Simple

Begin with basic profiles and add complexity as needed:

```csharp
// Good - Start simple
var profile = new RoutingProfileBuilder()
    .SetName("BasicAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Support", ChannelType.Voice, 1)
    .Build();

// Avoid - Too complex at first
var profile = new RoutingProfileBuilder()
    .SetName("SuperComplexAgent")
    .AddMediaConcurrency(ChannelType.Voice, 2)
    .AddMediaConcurrency(ChannelType.Chat, 8)
    .AddMediaConcurrency(ChannelType.Task, 10)
    .AddQueue("Q1", ChannelType.Voice, 1, 5)
    .AddQueue("Q2", ChannelType.Voice, 2, 10)
    // ... 10 more queues
    .Build();
```

### 2. Match Concurrency to Agent Skills

Set concurrency based on actual agent capabilities:

```csharp
// New agents - lower concurrency
var juniorProfile = new RoutingProfileBuilder()
    .SetName("JuniorAgent")
    .AddMediaConcurrency(ChannelType.Chat, 2) // Only 2 chats
    .AddQueue("ChatSupport", ChannelType.Chat, 1)
    .Build();

// Experienced agents - higher concurrency
var seniorProfile = new RoutingProfileBuilder()
    .SetName("SeniorAgent")
    .AddMediaConcurrency(ChannelType.Chat, 5) // Can handle 5 chats
    .AddQueue("ChatSupport", ChannelType.Chat, 1)
    .Build();
```

### 3. Use Priority Strategically

Higher priority for urgent or important contacts:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("SupportAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("EmergencyQueue", ChannelType.Voice, priority: 1)    // Urgent issues first
    .AddQueue("VIPQueue", ChannelType.Voice, priority: 2)          // Then VIP
    .AddQueue("StandardQueue", ChannelType.Voice, priority: 3)     // Then standard
    .Build();
```

### 4. Create Role-Based Profiles

Design profiles around agent roles:

```csharp
// Sales team profile
var salesProfile = new RoutingProfileBuilder()
    .SetName("SalesAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("InboundSales", ChannelType.Voice, 1)
    .AddQueue("OutboundSales", ChannelType.Voice, 2)
    .Build();

// Technical support profile
var techProfile = new RoutingProfileBuilder()
    .SetName("TechnicalAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddMediaConcurrency(ChannelType.Chat, 2)
    .AddQueue("TechnicalSupport", ChannelType.Voice, 1)
    .AddQueue("TechChat", ChannelType.Chat, 1)
    .Build();
```

### 5. Document Concurrency Decisions

Add comments explaining your concurrency choices:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("ExperiencedAgent")
    // Voice: 1 call at a time (company policy for quality)
    .AddMediaConcurrency(ChannelType.Voice, 1)
    // Chat: 4 simultaneous (tested and validated with team)
    .AddMediaConcurrency(ChannelType.Chat, 4)
    // Tasks: 10 (mostly quick follow-ups, low complexity)
    .AddMediaConcurrency(ChannelType.Task, 10)
    .AddQueue("Support", ChannelType.Voice, 1)
    .Build();
```

---

## Common Patterns

### Pattern 1: Single-Queue Specialist

Agent dedicated to one queue:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("BillingSpecialist")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("BillingQueue", ChannelType.Voice, priority: 1)
    .Build();
```

### Pattern 2: Overflow Handler

Agent helps multiple queues when needed:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("FloaterAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("SalesQueue", ChannelType.Voice, priority: 1)
    .AddQueue("SupportQueue", ChannelType.Voice, priority: 1)  // Same priority - helps both
    .AddQueue("BillingQueue", ChannelType.Voice, priority: 1)
    .Build();
```

### Pattern 3: Escalation Specialist

Agent only gets escalated/complex issues:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("EscalationSpecialist")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("EscalationsQueue", ChannelType.Voice, priority: 1)
    .AddQueue("ComplexIssuesQueue", ChannelType.Voice, priority: 2)
    .Build();
```

### Pattern 4: After-Hours Agent

Different priority during off-hours:

```csharp
var profile = new RoutingProfileBuilder()
    .SetName("AfterHoursAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("EmergencyQueue", ChannelType.Voice, priority: 1)
    .AddQueue("AfterHoursGeneral", ChannelType.Voice, priority: 2)
    .Build();
```

---

## Next Steps

Now that you understand routing profiles:

1. **[Building Users →](./users.md)** - Create agents and assign them routing profiles
2. **[Building Queues →](./queues.md)** - Review queue configuration
3. **[Complete Example →](./complete-example.md)** - See everything working together

---

## Related Resources

- [SwitchboardStack Reference](/reference/stack.md) - `AddRoutingProfile()` method details
- [Queue Building Guide](./queues.md) - Queue configuration
- [Hours of Operation Guide](./hours-of-operation.md) - Business hours setup
