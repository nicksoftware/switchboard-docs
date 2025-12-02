# Building Security Profiles

## What is a Security Profile?

A **security profile** defines what actions users can perform within Amazon Connect. It controls permissions for accessing features, managing resources, viewing reports, and handling customer interactions.

Think of it as a role-based access control (RBAC) system - each user is assigned a security profile that determines what they can see and do in the contact center.

### Real-World Examples

- **Agent Profile**: Can use CCP, handle calls, transfer contacts
- **Supervisor Profile**: Agent permissions + real-time monitoring, listen-in
- **QA Analyst Profile**: Access recordings, evaluations, Contact Lens analytics
- **Admin Profile**: Full system access to manage all resources

### How Security Profiles Work

1. **User is created** → Assigned a security profile
2. **User logs in** → Amazon Connect checks their security profile
3. **Profile defines permissions** → What features are accessible
4. **Access enforced** → User can only see/do what profile allows

### When You Need Security Profiles

Create security profiles whenever you want to:

- Control who can access sensitive data (recordings, transcripts)
- Limit management capabilities to specific roles
- Implement least-privilege access principles
- Separate responsibilities between teams
- Comply with regulatory requirements

---

## Creating Your First Security Profile

Let's build a simple agent profile step-by-step.

### Step 1: Use SecurityProfileBuilder

The easiest way to create a security profile:

```csharp
var profile = SecurityProfile
    .Create("BasicAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();
```

**That's it!** This creates a profile with standard agent permissions.

### Step 2: Add to Stack

Add the profile to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

var profile = SecurityProfile
    .Create("BasicAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();

stack.AddSecurityProfile(profile);

app.Synth();
```

### Step 3: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first security profile. Now you can assign this profile to users.

---

## Security Profile Configuration

Let's explore the different settings you can configure.

### Setting Profile Name (Required)

Every security profile must have a unique name:

```csharp
var profile = SecurityProfile
    .Create("SalesAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();
```

**Naming Tips:**
- Use descriptive names (SalesAgent, Supervisor, QAAnalyst)
- Be consistent with your naming convention
- Indicate the role or team

### Setting Description (Optional)

Add a description to document the profile's purpose:

```csharp
var profile = SecurityProfile
    .Create("TechnicalSupport")
    .SetDescription("Profile for technical support agents with elevated troubleshooting access")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();
```

**Description Best Practices:**
- Explain who uses this profile
- Document any special permissions
- Note compliance or security considerations

### Adding Tags (Optional)

Tags help organize profiles for tracking and cost allocation:

```csharp
var profile = SecurityProfile
    .Create("SalesAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .AddTag("Department", "Sales")
    .AddTag("Environment", "Production")
    .AddTag("ManagedBy", "CDK")
    .Build();
```

---

## Using Presets

Presets provide pre-configured permission sets for common roles. This is the easiest way to create security profiles.

### Available Presets

| Preset | Description | Use Case |
|--------|-------------|----------|
| `Agent` | Basic CCP access, call handling | Standard contact center agents |
| `OutboundAgent` | Agent + outbound calling | Sales/callback agents |
| `Supervisor` | Agent + monitoring, real-time metrics | Team leads, supervisors |
| `QualityAnalyst` | Analytics, recordings, evaluations | QA team members |
| `CallCenterManager` | User management, routing configuration | Operations managers |
| `Admin` | Full system access | System administrators |

### Using a Preset

```csharp
// Simple agent
var agent = SecurityProfile
    .Create("BasicAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();

// Supervisor with monitoring
var supervisor = SecurityProfile
    .Create("TeamSupervisor")
    .UsePreset(SecurityProfilePresets.Supervisor)
    .Build();

// Full admin access
var admin = SecurityProfile
    .Create("SystemAdmin")
    .UsePreset(SecurityProfilePresets.Admin)
    .Build();
```

### Adding Permissions to a Preset

Start with a preset and add extra permissions:

```csharp
var profile = SecurityProfile
    .Create("SeniorAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    // Add outbound calling to standard agent
    .AddPermission(Permissions.ContactControlPanel.OutboundCallAccess)
    // Add ability to search contacts
    .AddPermission(Permissions.AnalyticsAndOptimization.ContactSearch)
    .Build();
```

### Combining Presets

Merge multiple presets for complex roles:

```csharp
// Create a combined preset
var combinedPreset = SecurityProfilePresets.Combine(
    "SupervisorWithQA",
    SecurityProfilePresets.Supervisor,
    SecurityProfilePresets.QualityAnalyst);

var profile = SecurityProfile
    .Create("SeniorSupervisor")
    .SetDescription("Senior supervisor with QA responsibilities")
    .UsePreset(combinedPreset)
    .Build();
```

### Creating Custom Presets

Build a custom preset with specific permissions:

```csharp
var customPreset = SecurityProfilePresets.Custom(
    "SpecializedAgent",
    Permissions.ContactControlPanel.BasicAgentAccess,
    Permissions.ContactActions.TransferContact,
    Permissions.ContactActions.EndContact,
    Permissions.AnalyticsAndOptimization.ContactSearch
);

var profile = SecurityProfile
    .Create("CustomRole")
    .UsePreset(customPreset)
    .Build();
```

---

## Permission Groups

Permission groups are pre-built collections of related permissions. They're useful when you need fine-grained control without starting from scratch.

### Available Permission Groups

| Group | Permissions Included | Use Case |
|-------|---------------------|----------|
| `BasicAgent` | CCP access, transfer, end contact | Standard agent operations |
| `OutboundAgent` | BasicAgent + outbound calls | Outbound calling agents |
| `SupervisorMonitoring` | Real-time metrics, listen-in, barge-in | Real-time oversight |
| `QualityAnalysis` | Contact search, recordings, evaluations | QA reviews |
| `UserManagement` | View/edit/create users | User administration |
| `RoutingConfiguration` | Queues, routing profiles, hours | Routing management |
| `FlowManagement` | View/edit/create flows | Flow development |
| `Reporting` | Metrics, reports, dashboards | Reporting access |
| `WorkforceScheduling` | Scheduling, time off, forecasting | WFM access |
| `CaseManagement` | View/edit/create cases | Case handling |
| `CampaignManagement` | Outbound campaigns | Campaign access |
| `RedactedRecordingsAccess` | Redacted recordings/transcripts | Standard QA |
| `UnredactedRecordingsAccess` | Full recordings (sensitive!) | Compliance/legal |
| `AmazonQFeatures` | Amazon Q AI features | AI-assisted agents |
| `AmazonQAdmin` | Full Amazon Q management | AI administration |

### Using Permission Groups

```csharp
// Combine multiple permission groups
var profile = SecurityProfile
    .Create("QASupervisor")
    .SetDescription("QA supervisor with monitoring and analysis capabilities")
    .AddPermissionGroup(PermissionGroups.BasicAgent)
    .AddPermissionGroup(PermissionGroups.SupervisorMonitoring)
    .AddPermissionGroup(PermissionGroups.QualityAnalysis)
    .Build();
```

### Mixing Groups and Individual Permissions

```csharp
var profile = SecurityProfile
    .Create("SeniorAgent")
    .AddPermissionGroup(PermissionGroups.BasicAgent)
    .AddPermissionGroup(PermissionGroups.RedactedRecordingsAccess)
    // Add individual permissions
    .AddPermission(Permissions.AnalyticsAndOptimization.ContactSearch)
    .AddPermission(Permissions.CustomerProfiles.ViewProfiles)
    .Build();
```

---

## Individual Permissions

For maximum control, add individual permissions directly.

### Permission Categories

Permissions are organized by category:

| Category | Examples |
|----------|----------|
| `ContactControlPanel` | BasicAgentAccess, OutboundCallAccess, VideoCallAccess |
| `ContactActions` | TransferContact, EndContact |
| `Routing` | ViewQueues, EditQueues, ViewRoutingProfiles |
| `ChannelsAndFlows` | ViewFlows, EditFlows, PublishFlows |
| `UsersAndPermissions` | ViewUsers, EditUsers, ViewSecurityProfiles |
| `AnalyticsAndOptimization` | AccessMetrics, RealTimeMetrics, ContactSearch |
| `RecordingsAndTranscripts` | RedactedRecordingsAccess, UnredactedRecordingsAccess |
| `CustomerProfiles` | ViewProfiles, EditProfiles |
| `Cases` | ViewCases, CreateCases, EditCases |
| `Scheduling` | ViewScheduleManager, EditTimeOffRequests |
| `AmazonQ` | ViewAiAgents, EditAiPrompts |

### Adding Individual Permissions

```csharp
var profile = SecurityProfile
    .Create("CustomAgent")
    // CCP permissions
    .AddPermission(Permissions.ContactControlPanel.BasicAgentAccess)
    .AddPermission(Permissions.ContactControlPanel.OutboundCallAccess)
    // Contact handling
    .AddPermission(Permissions.ContactActions.TransferContact)
    .AddPermission(Permissions.ContactActions.EndContact)
    // Analytics
    .AddPermission(Permissions.AnalyticsAndOptimization.ContactSearch)
    .AddPermission(Permissions.AnalyticsAndOptimization.AccessMetrics)
    .Build();
```

### Adding All Permissions from a Category

```csharp
// Add all routing permissions
var profile = SecurityProfile
    .Create("RoutingAdmin")
    .AddPermissions(Permissions.Routing.All)
    .AddPermissions(Permissions.ChannelsAndFlows.All)
    .Build();
```

---

## Advanced Features

### Hierarchy-Restricted Access

Restrict users to only manage resources within their hierarchy group:

```csharp
var profile = SecurityProfile
    .Create("TeamLead")
    .SetDescription("Team lead with hierarchy-restricted user management")
    .AddPermissionGroup(PermissionGroups.BasicAgent)
    .AddPermissionGroup(PermissionGroups.SupervisorMonitoring)
    .AddPermission(Permissions.UsersAndPermissions.ViewUsers)
    .AddPermission(Permissions.UsersAndPermissions.EditUsers)
    // Can only manage users in their hierarchy group
    .AddHierarchyRestrictedResource("User")
    .Build();
```

**When to use:**
- Multi-team environments
- Team leads who should only see their team
- Decentralized management

### Tag-Based Access Control

Restrict access to resources based on tags:

```csharp
var profile = SecurityProfile
    .Create("SalesDepartmentManager")
    .SetDescription("Sales department manager with tag-based access")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    // Can only access resources tagged Department=Sales
    .AddAllowedAccessControlTag("Department", "Sales")
    // Apply restrictions to these resource types
    .AddTagRestrictedResource("Queue")
    .AddTagRestrictedResource("RoutingProfile")
    .AddTag("Department", "Sales")
    .Build();
```

**When to use:**
- Multi-department contact centers
- Shared infrastructure with access boundaries
- Regulatory separation requirements

**Important:** Resources must be properly tagged for this to work:
```csharp
// Tag the queue with Department=Sales
var salesQueue = Queue
    .Create("SalesQueue")
    .AddTag("Department", "Sales")
    .Build();
```

### Allowed Access Control Hierarchy Group

Assign a specific hierarchy group for access control:

```csharp
var profile = SecurityProfile
    .Create("RegionalManager")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    // Set specific hierarchy group ID
    .SetAllowedAccessControlHierarchyGroup("hierarchy-group-id-here")
    .AddHierarchyRestrictedResource("User")
    .Build();
```

---

## Complete Examples

### Example 1: Basic Agent Profile

Simple agent for handling calls:

```csharp
var profile = SecurityProfile
    .Create("BasicAgent")
    .SetDescription("Standard agent with CCP access")
    .UsePreset(SecurityProfilePresets.Agent)
    .AddTag("Role", "Agent")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 2: Outbound Sales Agent

Agent who makes outbound calls:

```csharp
var profile = SecurityProfile
    .Create("OutboundSalesAgent")
    .SetDescription("Sales agent with outbound calling capabilities")
    .UsePreset(SecurityProfilePresets.OutboundAgent)
    .AddPermission(Permissions.CustomerProfiles.ViewProfiles)
    .AddTag("Role", "Agent")
    .AddTag("Department", "Sales")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 3: Supervisor with Monitoring

Team supervisor with real-time monitoring:

```csharp
var profile = SecurityProfile
    .Create("TeamSupervisor")
    .SetDescription("Supervisor with real-time monitoring and agent management")
    .UsePreset(SecurityProfilePresets.Supervisor)
    .AddTag("Role", "Supervisor")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 4: Quality Analyst

QA team member reviewing interactions:

```csharp
var profile = SecurityProfile
    .Create("QualityAnalyst")
    .SetDescription("QA analyst for reviewing and scoring interactions")
    .UsePreset(SecurityProfilePresets.QualityAnalyst)
    .AddTag("Role", "QualityAnalyst")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 5: Compliance Officer with Unredacted Access

Compliance officer who needs full recording access:

```csharp
var profile = SecurityProfile
    .Create("ComplianceOfficer")
    .SetDescription("Compliance officer with unredacted recording access")
    .AddPermissionGroup(PermissionGroups.QualityAnalysis)
    .AddPermissionGroup(PermissionGroups.UnredactedRecordingsAccess)
    .AddPermissionGroup(PermissionGroups.Reporting)
    .AddPermission(Permissions.AnalyticsAndOptimization.ContactLensConversations)
    .AddPermission(Permissions.HistoricalChanges.ViewHistoricalChanges)
    .AddTag("Role", "ComplianceOfficer")
    .AddTag("AccessLevel", "Elevated")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 6: Department Manager with Restricted Access

Manager who can only manage their department:

```csharp
var profile = SecurityProfile
    .Create("SupportDepartmentManager")
    .SetDescription("Support department manager with tag-based restrictions")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    .AddAllowedAccessControlTag("Department", "Support")
    .AddTagRestrictedResource("Queue")
    .AddTagRestrictedResource("RoutingProfile")
    .AddTag("Role", "Manager")
    .AddTag("Department", "Support")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 7: Workforce Manager

WFM specialist for scheduling:

```csharp
var profile = SecurityProfile
    .Create("WorkforceManager")
    .SetDescription("Workforce manager for scheduling and capacity planning")
    .AddPermissionGroup(PermissionGroups.WorkforceScheduling)
    .AddPermissionGroup(PermissionGroups.Reporting)
    .AddPermission(Permissions.UsersAndPermissions.ViewUsers)
    .AddPermission(Permissions.UsersAndPermissions.ViewAgentHierarchy)
    .AddPermission(Permissions.Routing.ViewQueues)
    .AddTag("Role", "WorkforceManager")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 8: Omnichannel Agent

Agent handling multiple channels:

```csharp
var profile = SecurityProfile
    .Create("OmnichannelAgent")
    .SetDescription("Agent handling voice, chat, email, and tasks")
    .AddPermissionGroup(PermissionGroups.BasicAgent)
    .AddPermission(Permissions.ContactControlPanel.VideoCallAccess)
    .AddPermission(Permissions.ContactControlPanel.InitiateOutboundEmail)
    .AddPermissionGroup(PermissionGroups.CaseManagement)
    .AddPermission(Permissions.CustomerProfiles.ViewProfiles)
    .AddTag("Role", "OmnichannelAgent")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 9: AI Administrator

Administrator for Amazon Q features:

```csharp
var profile = SecurityProfile
    .Create("AIAdmin")
    .SetDescription("Administrator for Amazon Q and AI features")
    .AddPermissionGroup(PermissionGroups.AmazonQAdmin)
    .AddPermissionGroup(PermissionGroups.FlowManagement)
    .AddPermission(Permissions.AnalyticsAndOptimization.AccessMetrics)
    .AddTag("Role", "AIAdmin")
    .Build();

stack.AddSecurityProfile(profile);
```

### Example 10: Full Administrator

System administrator with all permissions:

```csharp
var profile = SecurityProfile
    .Create("SystemAdmin")
    .SetDescription("Full administrative access to all features")
    .UsePreset(SecurityProfilePresets.Admin)
    .AddTag("Role", "Admin")
    .Build();

stack.AddSecurityProfile(profile);
```

---

## Using Provider Interface

For assembly-scanned projects, implement `ISecurityProfileProvider`:

```csharp
public class SecurityProfileResourceProvider : ISecurityProfileProvider
{
    public int Order => 350; // After routing profiles

    public void ConfigureSecurityProfiles(ISwitchboardStack stack, SwitchboardOptions options)
    {
        SecurityProfile
            .Create("Agent")
            .UsePreset(SecurityProfilePresets.Agent)
            .Build(stack);

        SecurityProfile
            .Create("Supervisor")
            .UsePreset(SecurityProfilePresets.Supervisor)
            .Build(stack);

        SecurityProfile
            .Create("Admin")
            .UsePreset(SecurityProfilePresets.Admin)
            .Build(stack);
    }
}
```

---

## Best Practices

### 1. Follow Least Privilege

Grant only the permissions users need:

```csharp
// Good - Specific permissions for role
var profile = SecurityProfile
    .Create("BasicAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .Build();

// Avoid - Giving admin to everyone
var profile = SecurityProfile
    .Create("BasicAgent")
    .UsePreset(SecurityProfilePresets.Admin) // Too much access!
    .Build();
```

### 2. Use Presets as Starting Points

Start with presets and customize:

```csharp
// Good - Start with preset, add what's needed
var profile = SecurityProfile
    .Create("EnhancedAgent")
    .UsePreset(SecurityProfilePresets.Agent)
    .AddPermission(Permissions.CustomerProfiles.ViewProfiles)
    .Build();

// Avoid - Building from scratch when preset exists
var profile = SecurityProfile
    .Create("EnhancedAgent")
    .AddPermission(Permissions.ContactControlPanel.BasicAgentAccess)
    .AddPermission(Permissions.ContactActions.TransferContact)
    // ... 20 more permissions
    .Build();
```

### 3. Document Special Access

Use descriptions and tags to document why profiles have certain permissions:

```csharp
var profile = SecurityProfile
    .Create("ComplianceOfficer")
    .SetDescription("COMPLIANCE USE ONLY: Unredacted recordings for regulatory investigations")
    .AddPermissionGroup(PermissionGroups.UnredactedRecordingsAccess)
    .AddTag("AccessLevel", "Elevated")
    .AddTag("ApprovedBy", "Legal")
    .Build();
```

### 4. Use Tag-Based Access for Multi-Tenant

For shared infrastructure, use tag restrictions:

```csharp
// Each department gets their own manager profile
var salesManager = SecurityProfile
    .Create("SalesManager")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    .AddAllowedAccessControlTag("Department", "Sales")
    .AddTagRestrictedResource("Queue")
    .Build();

var supportManager = SecurityProfile
    .Create("SupportManager")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    .AddAllowedAccessControlTag("Department", "Support")
    .AddTagRestrictedResource("Queue")
    .Build();
```

### 5. Regularly Audit Profiles

Review security profiles periodically:

- Are permissions still appropriate?
- Are there unused profiles?
- Do any profiles have excessive access?

---

## Troubleshooting

### Issue: User Can't Access Feature

**Problem:** User can't see a feature in the UI.

**Solution:** Check their security profile permissions:

```csharp
// Make sure the permission is included
var profile = SecurityProfile
    .Create("Agent")
    .UsePreset(SecurityProfilePresets.Agent)
    .AddPermission(Permissions.AnalyticsAndOptimization.ContactSearch) // Add missing permission
    .Build();
```

### Issue: Too Many Permissions Error

**Problem:** Profile exceeds 500 permission limit.

**Solution:** Reduce permissions or split into multiple profiles:

```csharp
// Maximum 500 permissions per profile
// If using Admin preset + additional permissions, may exceed limit
// Solution: Remove unnecessary permissions or use more targeted groups
```

### Issue: Tag Restriction Not Working

**Problem:** Manager can see resources outside their department.

**Solution:** Ensure resources are properly tagged:

```csharp
// 1. Tag the queue
var queue = Queue
    .Create("SalesQueue")
    .AddTag("Department", "Sales")
    .Build();

// 2. Configure profile with matching tag
var profile = SecurityProfile
    .Create("SalesManager")
    .AddAllowedAccessControlTag("Department", "Sales")
    .AddTagRestrictedResource("Queue")
    .Build();
```

---

## Security Considerations

### Sensitive Permissions

Be careful with these high-impact permissions:

| Permission | Risk | Guidance |
|------------|------|----------|
| UnredactedRecordingsAccess | PII exposure | Compliance only |
| DeleteUsers | Data loss | Admin only |
| EditSecurityProfiles | Privilege escalation | Admin only |
| ViewHistoricalChanges | Audit trail access | Compliance/admin |

### Compliance Requirements

Common compliance considerations:

- **PCI DSS**: Restrict recording access, use redaction
- **HIPAA**: Limit PHI access, audit all access
- **GDPR**: Implement data minimization, access controls

### Regular Reviews

Implement periodic security profile audits:

1. List all security profiles
2. Review permissions for each profile
3. Verify users are assigned appropriate profiles
4. Remove unused profiles
5. Document any exceptions

---

## Quick Reference

### Basic Profile Template

```csharp
var profile = SecurityProfile
    .Create("ProfileName")
    .SetDescription("Description of the profile")
    .UsePreset(SecurityProfilePresets.Agent)  // Start with preset
    .AddPermission(Permissions.Category.Permission)  // Add extras
    .AddTag("Department", "Sales")
    .Build();

stack.AddSecurityProfile(profile);
```

### Common Permission Patterns

```csharp
// Agent with outbound
.UsePreset(SecurityProfilePresets.Agent)
.AddPermission(Permissions.ContactControlPanel.OutboundCallAccess)

// Supervisor with QA
.UsePreset(SecurityProfilePresets.Supervisor)
.AddPermissionGroup(PermissionGroups.QualityAnalysis)

// Manager with restrictions
.UsePreset(SecurityProfilePresets.CallCenterManager)
.AddAllowedAccessControlTag("Department", "Sales")
.AddTagRestrictedResource("Queue")
```

---

## Next Steps

Now that you understand security profiles:

1. **[Building Users](./users.md)** - Assign security profiles to users
2. **[Building Queues](./queues.md)** - Tag queues for access control
3. **[Complete Example](./complete-example.md)** - See everything working together

---

## Related Resources

- [ISwitchboardStack Reference](/reference/stack) - `AddSecurityProfile()` method details
- [SimpleCallCenter Example](https://github.com/nicksoftware/AmazonConnectBuilderFramework/tree/main/examples/SimpleCallCenter) - Working security profile examples
