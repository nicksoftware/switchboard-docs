# Building User Hierarchies

## What is a User Hierarchy?

A **user hierarchy** organizes agents into groups and teams within Amazon Connect. It creates a tree structure that can be used for reporting, access control, and team management.

Think of it as an organizational chart - you can group agents by region, department, office, or team, with up to 5 levels of nesting.

### Real-World Examples

- **Geographic**: North America → USA → New York → NYC Office → Sales Team
- **Departmental**: Sales → Enterprise → Key Accounts
- **Skill-based**: Technical → Level 2 → Network Specialists

### How User Hierarchies Work

1. **Define hierarchy structure** → Create groups at different levels
2. **Nest groups** → Child groups reference parent groups
3. **Assign users** → Each agent belongs to one hierarchy group
4. **Use for access control** → Security profiles can restrict access based on hierarchy
5. **Use for reporting** → Filter metrics and reports by hierarchy

### When You Need User Hierarchies

Create user hierarchies whenever you want to:

- Organize agents into logical teams
- Generate reports by team, region, or department
- Restrict supervisor access to their own teams
- Implement multi-tenant or multi-region contact centers
- Track performance at different organizational levels

---

## Creating Your First Hierarchy Group

Let's build a simple hierarchy step-by-step.

### Step 1: Use UserHierarchyGroupBuilder

The easiest way to create a hierarchy group:

```csharp
var salesTeam = UserHierarchyGroup
    .Create("Sales Team")
    .SetDescription("Sales department agents")
    .Build();
```

**That's it!** This creates a single hierarchy group.

### Step 2: Add to Stack

Add the hierarchy group to your CDK stack:

```csharp
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

var salesTeam = UserHierarchyGroup
    .Create("Sales Team")
    .SetDescription("Sales department agents")
    .Build();

stack.AddUserHierarchyGroup(salesTeam);

app.Synth();
```

### Step 3: Deploy

Deploy your stack:

```bash
cdk deploy
```

**Congratulations!** You've created your first hierarchy group. Now you can assign agents to this group.

---

## Building Nested Hierarchies

The real power of hierarchies comes from nesting groups.

### Creating a Multi-Level Structure

```csharp
// Level 1: Region
var northAmerica = UserHierarchyGroup
    .Create("North America")
    .SetDescription("North American operations")
    .SetLevel(HierarchyLevel.LevelOne)
    .Build(stack);

// Level 2: Country (under North America)
var usa = UserHierarchyGroup
    .Create("USA")
    .SetDescription("United States")
    .SetParentGroup(northAmerica)  // Reference the parent
    .SetLevel(HierarchyLevel.LevelTwo)
    .Build(stack);

// Level 3: Office (under USA)
var nycOffice = UserHierarchyGroup
    .Create("NYC Office")
    .SetDescription("New York City headquarters")
    .SetParentGroup(usa)
    .SetLevel(HierarchyLevel.LevelThree)
    .Build(stack);

// Level 4: Team (under NYC Office)
var nycSalesTeam = UserHierarchyGroup
    .Create("NYC Sales Team")
    .SetDescription("Sales team in NYC office")
    .SetParentGroup(nycOffice)
    .SetLevel(HierarchyLevel.LevelFour)
    .Build(stack);
```

### The Five Hierarchy Levels

Amazon Connect supports up to 5 levels of hierarchy:

| Level | Common Usage | Example |
|-------|--------------|---------|
| Level 1 | Region/Division | North America, EMEA, APAC |
| Level 2 | Country/Department | USA, UK, Sales, Support |
| Level 3 | State/Office | California, NYC Office |
| Level 4 | City/Team | San Francisco, Sales Team |
| Level 5 | Sub-team | Enterprise Sales |

**Note:** The `SetLevel()` method is optional and used for documentation purposes. AWS determines the actual level based on the parent-child relationships.

---

## Hierarchy Group Configuration

Let's explore the different settings you can configure.

### Setting Group Name (Required)

Every hierarchy group must have a unique name (max 100 characters):

```csharp
var group = UserHierarchyGroup
    .Create("Sales Team")
    .Build(stack);
```

**Naming Tips:**
- Use descriptive names (NYC Sales Team, Support Level 2)
- Be consistent with your naming convention
- Include location or department context

### Adding Description

Add a description to document the group's purpose:

```csharp
var group = UserHierarchyGroup
    .Create("Enterprise Support")
    .SetDescription("Support team for enterprise customers with SLA requirements")
    .Build(stack);
```

### Setting Parent Group

Create nested hierarchies by referencing a parent group:

```csharp
// Using the construct reference (type-safe)
var childGroup = UserHierarchyGroup
    .Create("Child Team")
    .SetParentGroup(parentGroup)  // UserHierarchyGroupConstruct
    .Build(stack);

// Using ARN string (for existing groups)
var childGroup = UserHierarchyGroup
    .Create("Child Team")
    .SetParentGroup("arn:aws:connect:us-east-1:123456789012:instance/abc/agent-group/xyz")
    .Build(stack);
```

### Adding Tags

Add tags for organization and filtering:

```csharp
var group = UserHierarchyGroup
    .Create("Sales Team")
    .AddTag("Department", "Sales")
    .AddTag("Region", "NA")
    .AddTag("CostCenter", "12345")
    .Build(stack);
```

**Tag Limits:**
- Maximum 50 tags per hierarchy group
- Keys: max 128 characters, cannot start with `aws:`
- Values: max 256 characters

---

## Common Hierarchy Patterns

### Geographic Hierarchy

Organize by physical location:

```csharp
// Level 1: Regions
var northAmerica = UserHierarchyGroup.Create("North America")
    .SetLevel(HierarchyLevel.LevelOne).Build(stack);
var europe = UserHierarchyGroup.Create("Europe")
    .SetLevel(HierarchyLevel.LevelOne).Build(stack);

// Level 2: Countries
var usa = UserHierarchyGroup.Create("USA")
    .SetParentGroup(northAmerica)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);
var uk = UserHierarchyGroup.Create("UK")
    .SetParentGroup(europe)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);

// Level 3: Offices
var nycOffice = UserHierarchyGroup.Create("NYC Office")
    .SetParentGroup(usa)
    .SetLevel(HierarchyLevel.LevelThree).Build(stack);
```

### Departmental Hierarchy

Organize by business function:

```csharp
// Level 1: Departments
var sales = UserHierarchyGroup.Create("Sales")
    .SetLevel(HierarchyLevel.LevelOne).Build(stack);
var support = UserHierarchyGroup.Create("Support")
    .SetLevel(HierarchyLevel.LevelOne).Build(stack);

// Level 2: Teams within departments
var enterpriseSales = UserHierarchyGroup.Create("Enterprise Sales")
    .SetParentGroup(sales)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);
var smbSales = UserHierarchyGroup.Create("SMB Sales")
    .SetParentGroup(sales)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);

var tier1Support = UserHierarchyGroup.Create("Tier 1 Support")
    .SetParentGroup(support)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);
var tier2Support = UserHierarchyGroup.Create("Tier 2 Support")
    .SetParentGroup(support)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);
```

### Hybrid Hierarchy

Combine geography and department:

```csharp
// Level 1: Region
var northAmerica = UserHierarchyGroup.Create("North America")
    .SetLevel(HierarchyLevel.LevelOne).Build(stack);

// Level 2: Department within region
var naSales = UserHierarchyGroup.Create("NA Sales")
    .SetParentGroup(northAmerica)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);
var naSupport = UserHierarchyGroup.Create("NA Support")
    .SetParentGroup(northAmerica)
    .SetLevel(HierarchyLevel.LevelTwo).Build(stack);

// Level 3: Team within department
var naEnterpriseSales = UserHierarchyGroup.Create("NA Enterprise Sales")
    .SetParentGroup(naSales)
    .SetLevel(HierarchyLevel.LevelThree).Build(stack);
```

---

## Using Hierarchies with Security Profiles

Hierarchies become powerful when combined with security profiles for access control.

### Restricting Supervisor Access

Create a supervisor profile that can only manage agents in their hierarchy:

```csharp
// Create hierarchy
var salesTeam = UserHierarchyGroup
    .Create("Sales Team")
    .Build(stack);

// Create security profile with hierarchy restriction
var salesSupervisor = SecurityProfile
    .Create("Sales Supervisor")
    .UsePreset(SecurityProfilePresets.Supervisor)
    .SetAllowedAccessControlHierarchyGroup(salesTeam.HierarchyGroupId)
    .AddHierarchyRestrictedResource("User")
    .Build(stack);
```

This supervisor can only see and manage users assigned to the "Sales Team" hierarchy group.

### Regional Manager Example

```csharp
// Regional hierarchy
var usEast = UserHierarchyGroup
    .Create("US East")
    .SetLevel(HierarchyLevel.LevelTwo)
    .Build(stack);

// Manager can only access resources in their region
var regionalManager = SecurityProfile
    .Create("US East Manager")
    .UsePreset(SecurityProfilePresets.CallCenterManager)
    .SetAllowedAccessControlHierarchyGroup(usEast.HierarchyGroupId)
    .AddHierarchyRestrictedResource("User")
    .AddHierarchyRestrictedResource("Contact")
    .Build(stack);
```

---

## Using the Provider Pattern

For larger projects, use the provider pattern to organize hierarchy creation:

```csharp
public class HierarchyResourceProvider : IUserHierarchyGroupProvider
{
    private readonly IResourceRegistry _registry;

    public HierarchyResourceProvider(IResourceRegistry registry)
    {
        _registry = registry;
    }

    public int Order => 175; // After Hours of Operation, before Queues

    public void ConfigureUserHierarchyGroups(ISwitchboardStack stack, SwitchboardOptions options)
    {
        // Create region hierarchy
        var northAmerica = UserHierarchyGroup.Create("North America")
            .SetLevel(HierarchyLevel.LevelOne)
            .Build(stack);

        // Create teams
        var salesTeam = UserHierarchyGroup.Create("Sales Team")
            .SetParentGroup(northAmerica)
            .SetLevel(HierarchyLevel.LevelTwo)
            .Build(stack);

        // Register for use by other providers
        _registry.Register("SalesTeamHierarchy", salesTeam);
    }
}
```

---

## API Reference

### UserHierarchyGroup Properties

| Property | Type | Description |
|----------|------|-------------|
| `Name` | `string` | Group name (required, max 100 chars) |
| `Description` | `string?` | Optional description |
| `ParentGroupId` | `string?` | ARN of parent group (null for top-level) |
| `Level` | `HierarchyLevel?` | Optional level indicator (1-5) |
| `Tags` | `Dictionary<string, string>` | Resource tags (max 50) |

### IUserHierarchyGroupBuilder Methods

| Method | Description |
|--------|-------------|
| `SetName(string)` | Set the group name |
| `SetDescription(string)` | Set the description |
| `SetParentGroup(string)` | Set parent by ARN |
| `SetParentGroup(UserHierarchyGroupConstruct)` | Set parent by construct reference |
| `SetLevel(HierarchyLevel)` | Set the hierarchy level |
| `AddTag(string, string)` | Add a single tag |
| `AddTags(IEnumerable<KeyValuePair>)` | Add multiple tags |
| `Build()` | Build the model |
| `Build(ISwitchboardStack)` | Build and add to stack |

### HierarchyLevel Enum

```csharp
public enum HierarchyLevel
{
    LevelOne = 1,
    LevelTwo = 2,
    LevelThree = 3,
    LevelFour = 4,
    LevelFive = 5
}
```

---

## Best Practices

### Plan Your Structure First

Before creating hierarchies:
1. Map out your organizational structure
2. Decide on the hierarchy levels and naming convention
3. Consider how you'll use hierarchies for reporting and access control

### Keep It Simple

- Start with 2-3 levels; add more only if needed
- Use consistent naming across levels
- Don't create groups just because you can

### Use Tags for Flexibility

Tags provide an additional way to categorize and filter:

```csharp
var group = UserHierarchyGroup.Create("NYC Sales")
    .AddTag("Region", "NA")
    .AddTag("Country", "US")
    .AddTag("City", "NYC")
    .AddTag("Department", "Sales")
    .Build(stack);
```

### Document with Descriptions

Always add descriptions to explain the group's purpose:

```csharp
var group = UserHierarchyGroup.Create("L2 Support")
    .SetDescription("Tier 2 support team handling escalated technical issues requiring senior expertise")
    .Build(stack);
```

---

## Troubleshooting

### Common Issues

**Group name already exists:**
Each hierarchy group name must be unique within your Connect instance.

```csharp
// This will throw an error if "Sales Team" already exists
stack.AddUserHierarchyGroup(salesTeam);
```

**Parent group not found:**
Ensure parent groups are created before child groups:

```csharp
// Wrong order - parent doesn't exist yet
var child = UserHierarchyGroup.Create("Child").SetParentGroup(parent).Build(stack);
var parent = UserHierarchyGroup.Create("Parent").Build(stack);

// Correct order
var parent = UserHierarchyGroup.Create("Parent").Build(stack);
var child = UserHierarchyGroup.Create("Child").SetParentGroup(parent).Build(stack);
```

**Too many levels:**
Amazon Connect supports maximum 5 levels. Attempting to create a 6th level will fail.

---

## Next Steps

Now that you understand user hierarchies:

1. **[Create Security Profiles](/building/security-profiles)** - Use hierarchies for access control
2. **[Create Users](/building/users)** - Assign agents to hierarchy groups
3. **[Complete Example](/building/complete-example)** - See hierarchies in a full contact center setup
