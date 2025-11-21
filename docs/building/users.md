# Building Users (Agents)

::: warning COMING SOON - Alpha Limitation
User (agent) creation is **not yet fully implemented** in Switchboard v0.1.0-preview.17. This guide describes the planned API and shows how to work with users in the current preview release.

**Current Status:**
- ✅ User model class exists
- ❌ UserConstruct not yet implemented
- ❌ SwitchboardStack.AddUser() not yet available

**Workaround:** Create users manually via AWS Console or CLI for now.
:::

## What is a User (Agent)?

A **user** in Amazon Connect is an agent who handles customer contacts. Users log into the Amazon Connect Contact Control Panel (CCP) to receive and make calls, handle chats, and complete tasks.

Think of users as your customer service representatives, support agents, sales staff, or managers who interact with customers through Amazon Connect.

### Real-World Examples

- **Customer Service Agent**: Answers incoming support calls
- **Sales Representative**: Handles sales inquiries and makes outbound calls
- **Technical Support Specialist**: Provides technical assistance via phone and chat
- **Team Manager**: Monitors queues, handles escalations, manages team
- **Quality Analyst**: Reviews call recordings and provides feedback

### How Users Work in Contact Centers

1. **User created** → Account created with username and profile
2. **Routing profile assigned** → Defines which queues and channels user can handle
3. **Security profiles assigned** → Determines permissions and access levels
4. **User logs in** → Access CCP to handle contacts
5. **Contacts routed** → Based on routing profile and queue assignments

### When You Need Users

Create users whenever you want to:

- Add agents to your contact center
- Assign agents to specific queues
- Control agent permissions and capabilities
- Organize agents into teams/hierarchies
- Track agent performance and metrics

---

## Creating Your First User (Planned API)

::: warning ALPHA - NOT YET IMPLEMENTED
The following API is planned but not yet available in alpha. For now, create users via AWS Console.
:::

### Step 1: Create User (Future API)

```csharp
// FUTURE API - Not yet implemented
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    Email = "john.doe@example.com",
    FirstName = "John",
    LastName = "Doe",
    PhoneNumber = "+18005551234"
};
```

### Step 2: Assign Security Profiles (Future API)

```csharp
// FUTURE API - Not yet implemented
user.AddSecurityProfileId("arn:aws:connect:us-east-1:123456789012:instance/abc/security-profile/agent");
```

### Step 3: Assign Routing Profile (Future API)

```csharp
// FUTURE API - Not yet implemented
user.RoutingProfileId = routingProfileArn;
```

### Step 4: Add to Stack (Future API)

```csharp
// FUTURE API - Not yet implemented
stack.AddUser(user);
```

---

## User Configuration (Planned)

### Setting Username (Required)

Unique identifier for login:

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe" // Used for CCP login
};
```

### Setting Display Name (Required)

Full name shown in CCP and reports:

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe",
    Name = "John Doe" // Display name
};
```

### Setting First and Last Name (Optional)

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    FirstName = "John",
    LastName = "Doe"
};
```

### Setting Email (Optional)

Agent's email address:

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    Email = "john.doe@example.com"
};
```

### Setting Phone Number (Optional)

Agent's contact number:

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    PhoneNumber = "+18005551234"
};
```

---

## Security Profiles (Alpha Limitation)

::: warning ALPHA - Use Existing Profiles
In the alpha release, you must use **existing** security profile ARNs from your Amazon Connect instance. You cannot create custom security profiles via Switchboard yet.
:::

### Built-in Security Profiles

Amazon Connect instances come with default security profiles:

| Profile | Purpose | Permissions |
|---------|---------|-------------|
| **Admin** | Full administrative access | Everything |
| **Agent** | Basic agent permissions | Handle contacts, view own data |
| **CallCenterManager** | Manager permissions | View reports, monitor agents |
| **QualityAnalyst** | Quality monitoring | Listen to recordings, view reports |

### Getting Security Profile ARNs

**Option 1: AWS Console**
1. Navigate to Amazon Connect → Users → Security Profiles
2. Click on a profile
3. Copy the ARN

**Option 2: AWS CLI**
```bash
aws connect list-security-profiles \
  --instance-id abc123 \
  --region us-east-1
```

**Option 3: CDK Lookup**
```csharp
// Use AWS SDK to fetch existing profiles
var client = new AmazonConnectClient();
var response = await client.ListSecurityProfilesAsync(new ListSecurityProfilesRequest
{
    InstanceId = "abc123"
});

foreach (var profile in response.SecurityProfileSummaryList)
{
    Console.WriteLine($"{profile.Name}: {profile.Arn}");
}
```

### Using Existing Security Profiles (Future API)

```csharp
// FUTURE API - Get ARN from existing instance
const string AgentProfileArn = "arn:aws:connect:us-east-1:123456789012:instance/abc/security-profile/agent-123";

var user = new User
{
    Username = "agent1",
    Name = "Agent One"
};

user.AddSecurityProfileId(AgentProfileArn);
```

---

## Routing Profiles

Users must be assigned a routing profile that defines their capabilities.

### Assigning Routing Profile (Future API)

```csharp
// FUTURE API
// First, create routing profile
var agentProfile = new RoutingProfileBuilder()
    .SetName("GeneralAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddQueue("Support", ChannelType.Voice, 1)
    .Build();

stack.AddRoutingProfile(agentProfile);

// Then assign to user
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    RoutingProfileId = agentProfile.Arn // Future: Get ARN from stack
};
```

**See:** [Building Routing Profiles](./routing-profiles.md) for details.

---

## Hierarchy Groups (Advanced)

::: warning ALPHA - NOT YET SUPPORTED
Hierarchy groups are not yet supported in alpha. This feature is planned for future releases.
:::

Hierarchy groups organize users into teams or organizational structures.

### What are Hierarchy Groups?

- Organize agents by department, team, location, skill
- Enable reporting and metrics by group
- Manage agents at scale
- Set permissions by group

### Future API (Planned)

```csharp
// FUTURE API - Not yet implemented
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    HierarchyGroupId = "group-arn" // Sales Team, West Coast, etc.
};
```

---

## Workaround: Creating Users in Alpha

Since user creation via Switchboard is not yet available, use these workarounds:

### Option 1: AWS Console (Recommended for Learning)

1. **Navigate to Amazon Connect Console**
   - Go to AWS Console → Amazon Connect
   - Select your instance

2. **Create User**
   - Click "Users" in left menu
   - Click "Add new user"
   - Fill in user details
   - Assign routing profile
   - Assign security profiles
   - Save

3. **Get User Credentials**
   - Download CSV with username/password
   - Provide to agent for CCP login

### Option 2: AWS CLI

```bash
# Create user
aws connect create-user \
  --instance-id abc123 \
  --username john.doe \
  --password MyP@ssw0rd! \
  --identity-info FirstName=John,LastName=Doe,Email=john@example.com \
  --phone-config PhoneType=SOFT_PHONE \
  --security-profile-ids "arn:aws:connect:us-east-1:123456789012:instance/abc/security-profile/agent" \
  --routing-profile-id "arn:aws:connect:us-east-1:123456789012:instance/abc/routing-profile/xyz" \
  --region us-east-1
```

### Option 3: AWS SDK in C#

```csharp
using Amazon.Connect;
using Amazon.Connect.Model;

var client = new AmazonConnectClient();

var request = new CreateUserRequest
{
    InstanceId = "abc123",
    Username = "john.doe",
    Password = "MyP@ssw0rd!",
    IdentityInfo = new UserIdentityInfo
    {
        FirstName = "John",
        LastName = "Doe",
        Email = "john.doe@example.com"
    },
    PhoneConfig = new UserPhoneConfig
    {
        PhoneType = "SOFT_PHONE"
    },
    SecurityProfileIds = new List<string>
    {
        "arn:aws:connect:us-east-1:123456789012:instance/abc/security-profile/agent"
    },
    RoutingProfileId = "arn:aws:connect:us-east-1:123456789012:instance/abc/routing-profile/xyz"
};

var response = await client.CreateUserAsync(request);
Console.WriteLine($"User created: {response.UserArn}");
```

---

## Planned User API (Future)

### Complete Example (Coming Soon)

```csharp
// FUTURE API - Full user creation workflow
var app = new App();
var stack = new SwitchboardStack(app, "MyContactCenter", "my-center");

// Create routing profile
var agentProfile = new RoutingProfileBuilder()
    .SetName("CustomerServiceAgent")
    .AddMediaConcurrency(ChannelType.Voice, 1)
    .AddMediaConcurrency(ChannelType.Chat, 3)
    .AddQueue("CustomerService", ChannelType.Voice, 1)
    .AddQueue("ChatSupport", ChannelType.Chat, 1)
    .Build();

stack.AddRoutingProfile(agentProfile);

// Get existing security profile ARN
const string AgentSecurityProfile = "arn:aws:connect:us-east-1:123456789012:instance/abc/security-profile/agent";

// Create user
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    FirstName = "John",
    LastName = "Doe",
    Email = "john.doe@example.com",
    PhoneNumber = "+18005551234",
    RoutingProfileId = agentProfile.Arn,
    Tags = new Dictionary<string, string>
    {
        ["Department"] = "CustomerService",
        ["Location"] = "Boston",
        ["Team"] = "TeamA"
    }
};

user.AddSecurityProfileId(AgentSecurityProfile);

// Add to stack (FUTURE)
stack.AddUser(user);

app.Synth();
```

---

## Best Practices (For Future Implementation)

### 1. Use Consistent Username Format

Choose a username format and stick to it:

```csharp
// Good - Consistent format
"john.doe"
"jane.smith"
"mike.wilson"

// Avoid - Inconsistent
"johndoe"
"j.smith"
"Mike_Wilson"
```

### 2. Set Meaningful Display Names

Use full names for clarity:

```csharp
// Good
Name = "John Doe"

// Avoid
Name = "JD"
Name = "Agent1"
```

### 3. Include Contact Information

Always set email and phone when available:

```csharp
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    Email = "john.doe@example.com",  // For notifications
    PhoneNumber = "+18005551234"     // For contact
};
```

### 4. Use Tags for Organization

Tag users by department, location, team:

```csharp
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    Tags = new Dictionary<string, string>
    {
        ["Department"] = "Sales",
        ["Location"] = "NewYork",
        ["Team"] = "InsideSales",
        ["Manager"] = "sarah.johnson"
    }
};
```

### 5. Assign Appropriate Routing Profiles

Match routing profiles to agent skills and responsibilities:

```csharp
// New agent - simple profile
var juniorAgent = new User
{
    Username = "new.agent",
    Name = "New Agent",
    RoutingProfileId = "basic-voice-only-profile"
};

// Experienced agent - complex profile
var seniorAgent = new User
{
    Username = "senior.agent",
    Name = "Senior Agent",
    RoutingProfileId = "omnichannel-advanced-profile"
};
```

---

## Phone Configuration

### Soft Phone vs. Desk Phone

Users can use different phone types:

| Phone Type | What It Is | When to Use |
|------------|------------|-------------|
| **Soft Phone** | Browser-based phone in CCP | Remote workers, no desk phone |
| **Desk Phone** | Physical desk phone | Office-based agents |

### Future API for Phone Configuration

```csharp
// FUTURE API
var user = new User
{
    Username = "john.doe",
    Name = "John Doe",
    PhoneConfig = new UserPhoneConfig
    {
        PhoneType = PhoneType.SoftPhone, // Or PhoneType.DeskPhone
        DeskPhoneNumber = "+18005551234" // Only if DeskPhone type
    }
};
```

---

## User Management Patterns

### Pattern 1: Bulk User Creation

Create multiple users programmatically:

```csharp
// FUTURE API
var usernames = new[] { "agent1", "agent2", "agent3", "agent4", "agent5" };
var agentProfileArn = "routing-profile-arn";
var securityProfileArn = "security-profile-arn";

foreach (var username in usernames)
{
    var user = new User
    {
        Username = username,
        Name = $"Agent {username}",
        Email = $"{username}@example.com",
        RoutingProfileId = agentProfileArn
    };

    user.AddSecurityProfileId(securityProfileArn);
    stack.AddUser(user);
}
```

### Pattern 2: Team-Based Users

Create users organized by team:

```csharp
// FUTURE API
var salesUsers = new[]
{
    new { Username = "sales1", Name = "Alice Sales" },
    new { Username = "sales2", Name = "Bob Sales" }
};

foreach (var info in salesUsers)
{
    var user = new User
    {
        Username = info.Username,
        Name = info.Name,
        RoutingProfileId = salesRoutingProfile,
        Tags = new Dictionary<string, string>
        {
            ["Department"] = "Sales",
            ["Team"] = "InsideSales"
        }
    };

    user.AddSecurityProfileId(agentSecurityProfile);
    stack.AddUser(user);
}
```

---

## Next Steps

### For Alpha Release (Current)

1. **Create Infrastructure** - Deploy queues, flows, routing profiles with Switchboard
2. **Create Users Manually** - Use AWS Console or CLI to create users
3. **Assign Routing Profiles** - Link users to routing profiles created by Switchboard
4. **Test Setup** - Have agents log into CCP and test

### When User API is Available (Future)

1. **[Building Routing Profiles →](./routing-profiles.md)** - Create profiles first
2. **Get Security Profile ARNs** - From existing instance
3. **Create Users via Switchboard** - Use CDK to create users
4. **[Complete Example →](./complete-example.md)** - See full setup

---

## Related Resources

- [Routing Profiles Guide](./routing-profiles.md) - Required for user creation
- [Hours of Operation Guide](./hours-of-operation.md) - Affects queue availability
- [Queue Building Guide](./queues.md) - Understanding queue assignment
- [AWS Connect User Documentation](https://docs.aws.amazon.com/connect/latest/adminguide/user-management.html) - Official AWS docs

---

## Roadmap

The user creation API is planned for an upcoming release. Expected features:

- ✅ User model class (available now)
- 🔄 UserConstruct for CDK deployment
- 🔄 SwitchboardStack.AddUser() method
- 🔄 UserBuilder for fluent configuration
- 🔄 Hierarchy group support
- 🔄 Phone configuration support
- 🔄 Password management

**Want to help?** Check out our [GitHub repository](https://github.com/nicksoftware/AmazonConnectBuilderFramework) to contribute or track progress.
