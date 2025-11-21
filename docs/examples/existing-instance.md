# Existing Instance Migration (Brownfield)

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

Import and manage an existing Amazon Connect instance with Switchboard.

## Overview

This example shows how to **migrate an existing Connect instance** from console-managed to code-managed infrastructure without disrupting live operations.

**Migration strategy:** Gradual adoption
**Risk level:** Low (import-only initially)
**Downtime:** Zero
**Rollback:** Easy (remove framework, keep existing resources)

---

## Migration Scenarios

### Scenario 1: Import Everything, Manage Nothing

**Use case:** Start tracking existing resources in code without making changes.

```csharp
using Switchboard;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    // Import existing instance
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Import only - don't manage anything yet
    options.ManageFlows = false;
    options.ManageQueues = false;
    options.ManageRoutingProfiles = false;
    options.ManageHoursOfOperation = false;
})
.ImportExistingResources(import =>
{
    // Import queues by ARN
    import.AddQueue("Sales", "arn:aws:connect:us-east-1:123:queue/sales-queue-id");
    import.AddQueue("Support", "arn:aws:connect:us-east-1:123:queue/support-queue-id");

    // Import flows
    import.AddFlow("MainInbound", "arn:aws:connect:us-east-1:123:flow/main-inbound-id");
    import.AddFlow("AfterHours", "arn:aws:connect:us-east-1:123:flow/after-hours-id");

    // Import routing profiles
    import.AddRoutingProfile("SalesAgents", "arn:aws:connect:us-east-1:123:routing-profile/sales-id");
});

var app = builder.Build();
```

**Benefits:**
- ✅ Zero risk - no changes to existing instance
- ✅ Can reference resources in new flows
- ✅ Establish baseline before managing resources
- ✅ Easy to remove framework if needed

---

### Scenario 2: Manage Flows Only

**Use case:** Start managing flows with code, leave queues/profiles in console.

```csharp
builder.Services.AddSwitchboard(options =>
{
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Manage flows, import everything else
    options.ManageFlows = true;          // ✅ Switchboard controls flows
    options.ManageQueues = false;        // ❌ Console controls queues
    options.ManageRoutingProfiles = false;
})
.ImportExistingQueues(import =>
{
    // Reference console-managed queues
    import.AddQueue("Sales", "arn:aws:connect:us-east-1:123:queue/sales-queue-id");
    import.AddQueue("Support", "arn:aws:connect:us-east-1:123:queue/support-queue-id");
})
.AddFlowDefinitions(typeof(Program).Assembly); // New flows managed by code

var app = builder.Build();
```

**New flow can reference imported queues:**

```csharp
[ContactFlow("NewSalesFlow")]
public partial class NewSalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to our new sales flow")]
    public partial void Welcome();

    [Action(Order = 2)]
    [TransferToQueue("Sales")] // References imported queue
    public partial void TransferToSales();
}
```

---

### Scenario 3: Full Hybrid Management

**Use case:** Manage some resources with code, keep critical flows in console.

```csharp
builder.Services.AddSwitchboard(options =>
{
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Selective management
    options.ManageFlows = true;
    options.ManageQueues = true;
    options.ManageRoutingProfiles = false; // Keep in console for now
})
.ImportExistingFlows(import =>
{
    // Critical flows stay in console
    import.AddFlow("MainCustomerService", "arn:aws:connect:...:flow/main-id");
    import.AddFlow("ExecutiveEscalation", "arn:aws:connect:...:flow/exec-id");
})
.ImportExistingQueues(import =>
{
    // These queues will remain managed by console
    import.AddQueue("ExecutiveQueue", "arn:aws:connect:...:queue/exec-id");
})
.AddFlowDefinitions(typeof(Program).Assembly)  // New flows
.AddQueueDefinitions(typeof(Program).Assembly); // New queues

var app = builder.Build();
```

---

## Complete Migration Example

### Step 1: Inventory Existing Resources

```bash
# List all flows
aws connect list-contact-flows \
  --instance-id aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee \
  --query 'ContactFlowSummaryList[*].[Name,Arn]' \
  --output table

# List all queues
aws connect list-queues \
  --instance-id aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee \
  --query 'QueueSummaryList[*].[Name,Arn]' \
  --output table

# List routing profiles
aws connect list-routing-profiles \
  --instance-id aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee \
  --query 'RoutingProfileSummaryList[*].[Name,Arn]' \
  --output table
```

### Step 2: Create Import Configuration

**`src/Migration/ImportConfiguration.cs`**

```csharp
using Switchboard;

namespace ExistingCallCenter.Migration;

public static class ImportConfiguration
{
    public static void ConfigureImports(ISwitchboardImportBuilder import)
    {
        // Import all existing queues
        import.AddQueue("Sales-US-East", "arn:aws:connect:us-east-1:123:queue/sales-us-east-id");
        import.AddQueue("Sales-US-West", "arn:aws:connect:us-east-1:123:queue/sales-us-west-id");
        import.AddQueue("Support-Tier1", "arn:aws:connect:us-east-1:123:queue/support-t1-id");
        import.AddQueue("Support-Tier2", "arn:aws:connect:us-east-1:123:queue/support-t2-id");
        import.AddQueue("Escalation", "arn:aws:connect:us-east-1:123:queue/escalation-id");

        // Import critical flows (don't manage yet)
        import.AddFlow("MainInbound", "arn:aws:connect:us-east-1:123:flow/main-inbound-id");
        import.AddFlow("CustomerService", "arn:aws:connect:us-east-1:123:flow/customer-service-id");
        import.AddFlow("TechnicalSupport", "arn:aws:connect:us-east-1:123:flow/tech-support-id");

        // Import routing profiles
        import.AddRoutingProfile("Sales-Profile", "arn:aws:connect:us-east-1:123:routing-profile/sales-id");
        import.AddRoutingProfile("Support-Profile", "arn:aws:connect:us-east-1:123:routing-profile/support-id");

        // Import hours of operation
        import.AddHoursOfOperation("Business-Hours", "arn:aws:connect:us-east-1:123:hours/business-id");
        import.AddHoursOfOperation("24x7", "arn:aws:connect:us-east-1:123:hours/24x7-id");
    }
}
```

### Step 3: Initial Program Setup

**`src/Program.cs`**

```csharp
using Amazon.CDK;
using Switchboard;
using ExistingCallCenter.Migration;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSwitchboard(options =>
{
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Phase 1: Import everything, manage nothing
    options.ManageFlows = false;
    options.ManageQueues = false;
    options.ManageRoutingProfiles = false;
})
.ImportExistingResources(ImportConfiguration.ConfigureImports);

var host = builder.Build();

// Generate CDK app
var app = new App();
var stack = new ConnectMigrationStack(app, "ExistingConnect-Import");
app.Synth();
```

### Step 4: Test Import (No Changes)

```bash
# Synthesize CDK
cdk synth

# Review generated CloudFormation (should show imports only)
cat cdk.out/ExistingConnect-Import.template.json

# Deploy import (no changes to Connect)
cdk deploy ExistingConnect-Import

# ✅ Verify: No resources created/modified
# ✅ Only CDK tracking of existing resources
```

---

## Phase 2: Add New Flows

Once imports are stable, add new flows that use imported resources.

**`src/Flows/NewSalesFlow.cs`**

```csharp
using Switchboard;
using Switchboard.Attributes;

[ContactFlow("NewSalesFlow")]
public partial class NewSalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to our new sales experience")]
    public partial void Welcome();

    [Action(Order = 2)]
    [CheckAttribute("Region")]
    [WhenEquals("US-East", Target = "EastQueue")]
    [WhenEquals("US-West", Target = "WestQueue")]
    [Otherwise(Target = "DefaultQueue")]
    public partial void RouteByRegion();

    [Action(Order = 3, Id = "EastQueue")]
    [TransferToQueue("Sales-US-East")] // References imported queue
    public partial void TransferToEast();

    [Action(Order = 4, Id = "WestQueue")]
    [TransferToQueue("Sales-US-West")] // References imported queue
    public partial void TransferToWest();

    [Action(Order = 5, Id = "DefaultQueue")]
    [TransferToQueue("Sales-US-East")]
    public partial void TransferToDefault();
}
```

**Update Program.cs:**

```csharp
builder.Services.AddSwitchboard(options =>
{
    options.ImportExistingInstance = true;
    options.ExistingInstanceId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    // Now manage new flows
    options.ManageFlows = true;  // ✅ Changed
    options.ManageQueues = false;
})
.ImportExistingQueues(ImportConfiguration.ConfigureImports)
.AddFlowDefinitions(typeof(Program).Assembly); // ✅ Added
```

**Deploy:**

```bash
cdk deploy

# ✅ Creates NewSalesFlow
# ✅ Existing flows untouched
# ✅ Queues still managed by console
```

---

## Phase 3: Gradually Take Over Management

### Week 1-2: New Flows Only

```csharp
options.ManageFlows = true;
options.ManageQueues = false;
options.ManageRoutingProfiles = false;
```

### Week 3-4: Add Queue Management

Recreate queues as code, gradually switch over:

```csharp
[Queue("Sales-US-East")]
public class SalesUSEastQueue : QueueDefinitionBase
{
    [MaxContacts(100)]
    [ServiceLevel(Threshold = 20, Target = 0.80)]
    public override QueueConfiguration Configure()
    {
        // Match existing queue settings exactly
        return new QueueConfiguration
        {
            Description = "Sales queue for US East region",
            HoursOfOperation = "Business-Hours"
        };
    }
}
```

**Migration strategy:**

```csharp
.ImportExistingQueues(import =>
{
    // Gradually remove queues from import as you recreate in code
    // import.AddQueue("Sales-US-East", "..."); // ❌ Remove when managing via code
    import.AddQueue("Sales-US-West", "...");    // ✅ Still imported
    import.AddQueue("Support-Tier1", "...");    // ✅ Still imported
})
.AddQueueDefinitions(typeof(Program).Assembly); // ✅ Code-managed queues
```

### Month 2-3: Full Management

Eventually manage everything:

```csharp
options.ManageFlows = true;
options.ManageQueues = true;
options.ManageRoutingProfiles = true;
options.ManageHoursOfOperation = true;
```

---

## Rollback Plan

If migration fails, easily rollback:

```bash
# 1. Remove Switchboard CDK stacks
cdk destroy --all

# 2. Resources remain in Connect (unaffected)
# 3. Continue using console for management
```

---

## Best Practices

### ✅ DO

- **Start with imports only** - zero risk
- **Test in dev environment first** - validate migration approach
- **Migrate incrementally** - one resource type at a time
- **Document existing config** - before making changes
- **Keep rollback plan** - always have a way back
- **Monitor during migration** - watch for unexpected changes

### ❌ DON'T

- **Manage everything at once** - too risky
- **Skip testing phase** - always validate in dev first
- **Delete console resources** - let framework manage lifecycle
- **Change critical flows** - keep them stable during migration
- **Rush the migration** - take time to validate each phase

---

## Migration Checklist

### Pre-Migration

- [ ] Inventory all existing resources
- [ ] Document current configurations
- [ ] Set up test/dev environment
- [ ] Train team on Switchboard
- [ ] Plan rollback strategy

### Phase 1: Import (Week 1)

- [ ] Configure imports for all resources
- [ ] Deploy CDK with ManageX = false
- [ ] Verify no changes to Connect
- [ ] Test referencing imported resources

### Phase 2: New Flows (Week 2-3)

- [ ] Create new flows in code
- [ ] Reference imported queues/resources
- [ ] Deploy and test new flows
- [ ] Monitor for issues

### Phase 3: Gradual Takeover (Month 2-3)

- [ ] Recreate queues as code (one at a time)
- [ ] Switch ManageQueues = true
- [ ] Migrate routing profiles
- [ ] Migrate hours of operation
- [ ] Remove all imports

### Post-Migration

- [ ] Full Switchboard management
- [ ] Archive console configurations
- [ ] Update documentation
- [ ] Train team on code-first workflow

---

## Troubleshooting

### Issue: CDK tries to replace existing resource

**Solution:**
```csharp
// Use import statements in CDK
import.AddQueue("Sales", "arn:...", new ImportOptions
{
    PreserveLogicalId = true, // Prevent replacement
    SkipUpdateCheck = true     // Don't validate against existing
});
```

### Issue: Drift detected between code and console

**Solution:**
```bash
# Detect drift
cdk diff

# Update code to match console
# OR update console to match code (carefully!)
```

### Issue: Cannot reference imported resource

**Solution:**
```csharp
// Ensure resource is imported before use
.ImportExistingQueues(import =>
{
    import.AddQueue("Sales", "arn:...");
})
.AddFlowDefinitions(...); // Can now reference "Sales" queue
```

---

## Monitoring During Migration

### CloudWatch Metrics to Watch

```csharp
// Add monitoring stack during migration
new MigrationMonitoringStack(app, "Migration-Monitoring", new MonitoringProps
{
    Alarms = new[]
    {
        new Alarm {
            Metric = "ContactFlowErrors",
            Threshold = 5,
            EvaluationPeriods = 2
        },
        new Alarm {
            Metric = "MissedCalls",
            Threshold = 10,
            EvaluationPeriods = 1
        }
    }
});
```

### Dashboard

- Contact flow success rate (should stay constant)
- Queue metrics (wait time, abandoned calls)
- Lambda invocations (for integrated flows)
- Resource drift detection

---

## Related Examples

- [Enterprise Call Center (Attributes)](/examples/enterprise-attributes) - Full greenfield setup
- [Enterprise Call Center (Fluent)](/examples/enterprise-fluent) - Fluent builder approach
- [Multi-Region Deployment](/examples/multi-region) - High availability patterns
- [Framework Patterns](/guide/patterns) - All usage patterns
