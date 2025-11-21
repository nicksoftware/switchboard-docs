# Complete Contact Center Example

This guide shows how to build a complete contact center using Switchboard, combining all the concepts you've learned.

## What We'll Build

A fully functional customer support contact center with:

- ✅ **Business Hours**: Monday-Friday 9 AM - 5 PM Eastern
- ✅ **24/7 Emergency Support**: Always-available emergency line
- ✅ **Three Departments**: Sales, Support, Billing
- ✅ **Multiple Queues**: VIP and standard queues for each department
- ✅ **Smart Routing**: Priority routing for VIP customers
- ✅ **After-Hours Handling**: Different flow when closed
- ✅ **Routing Profiles**: Different profiles for agents
- ✅ **Contact Flows**: Main menu and department flows

---

## Project Structure

```
MyContactCenter/
├── Program.cs              # Main CDK application
├── cdk.json               # CDK configuration
└── MyContactCenter.csproj # Project file
```

---

## Step 1: Project Setup

### Create Project

```bash
# Create directory
mkdir MyContactCenter
cd MyContactCenter

# Create CDK project
dotnet new console -n MyContactCenter
cd MyContactCenter

# Install Switchboard (when published to NuGet)
dotnet add package NickSoftware.Switchboard --version 0.1.0-preview.17

# Install AWS CDK
dotnet add package Amazon.CDK.Lib --version 2.170.0
```

### Create cdk.json

```json
{
  "app": "dotnet run --project MyContactCenter.csproj",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true
  }
}
```

---

## Step 2: Complete Implementation

Here's the complete `Program.cs` with everything configured:

```csharp
using Amazon.CDK;
using Switchboard.Core;
using Switchboard.Builders;
using Switchboard.Models;
using System;

namespace MyContactCenter
{
    class Program
    {
        static void Main(string[] args)
        {
            var app = new App();

            // Create the contact center stack
            var stack = new SwitchboardStack(
                app,
                "MyContactCenter",
                "acme-support-center",
                new StackProps
                {
                    Env = new Amazon.CDK.Environment
                    {
                        Account = Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT"),
                        Region = Environment.GetEnvironmentVariable("CDK_DEFAULT_REGION") ?? "us-east-1"
                    },
                    Description = "Acme Corp Customer Support Contact Center"
                }
            );

            // ===================================================================
            // STEP 1: CREATE HOURS OF OPERATION
            // ===================================================================

            // Business hours: Monday-Friday 9 AM - 5 PM ET
            var businessHours = new HoursOfOperation
            {
                Name = "BusinessHours",
                Description = "Standard business hours Mon-Fri 9-5 ET",
                TimeZone = "America/New_York"
            };

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

            // 24/7 hours for emergency support
            var emergency24x7 = new HoursOfOperation
            {
                Name = "Emergency24x7",
                Description = "24/7 emergency support availability",
                TimeZone = "UTC"
            };

            for (var day = DayOfWeek.Sunday; day <= DayOfWeek.Saturday; day++)
            {
                emergency24x7.AddDayConfig(new HoursOfOperationConfig
                {
                    Day = day,
                    StartTime = new TimeRange { Hours = 0, Minutes = 0 },
                    EndTime = new TimeRange { Hours = 23, Minutes = 59 }
                });
            }

            stack.AddHoursOfOperation(emergency24x7);

            // ===================================================================
            // STEP 2: CREATE QUEUES
            // ===================================================================

            // Sales Queues
            var salesVIPQueue = new QueueBuilder()
                .SetName("SalesVIP")
                .SetDescription("VIP sales inquiries")
                .SetMaxContacts(25)
                .SetOutboundCallerId("Acme Sales VIP", "+18005551000")
                .AddTag("Department", "Sales")
                .AddTag("Tier", "VIP")
                .Build();

            stack.AddQueue(salesVIPQueue, "BusinessHours");

            var salesStandardQueue = new QueueBuilder()
                .SetName("SalesStandard")
                .SetDescription("Standard sales inquiries")
                .SetMaxContacts(100)
                .SetOutboundCallerId("Acme Sales", "+18005551001")
                .AddTag("Department", "Sales")
                .AddTag("Tier", "Standard")
                .Build();

            stack.AddQueue(salesStandardQueue, "BusinessHours");

            // Support Queues
            var supportVIPQueue = new QueueBuilder()
                .SetName("SupportVIP")
                .SetDescription("VIP customer support")
                .SetMaxContacts(25)
                .SetOutboundCallerId("Acme Support VIP", "+18005551002")
                .AddTag("Department", "Support")
                .AddTag("Tier", "VIP")
                .Build();

            stack.AddQueue(supportVIPQueue, "BusinessHours");

            var supportStandardQueue = new QueueBuilder()
                .SetName("SupportStandard")
                .SetDescription("Standard customer support")
                .SetMaxContacts(150)
                .SetOutboundCallerId("Acme Support", "+18005551003")
                .AddTag("Department", "Support")
                .AddTag("Tier", "Standard")
                .Build();

            stack.AddQueue(supportStandardQueue, "BusinessHours");

            // Billing Queue
            var billingQueue = new QueueBuilder()
                .SetName("Billing")
                .SetDescription("Billing and payment inquiries")
                .SetMaxContacts(75)
                .SetOutboundCallerId("Acme Billing", "+18005551004")
                .AddTag("Department", "Billing")
                .AddTag("Tier", "Standard")
                .Build();

            stack.AddQueue(billingQueue, "BusinessHours");

            // Emergency Support Queue (24/7)
            var emergencyQueue = new QueueBuilder()
                .SetName("EmergencySupport")
                .SetDescription("24/7 emergency support line")
                .SetMaxContacts(50)
                .SetOutboundCallerId("Acme Emergency", "+18005551005")
                .AddTag("Department", "Emergency")
                .AddTag("Tier", "Critical")
                .Build();

            stack.AddQueue(emergencyQueue, "Emergency24x7");

            // ===================================================================
            // STEP 3: CREATE ROUTING PROFILES
            // ===================================================================

            // VIP Sales Agent Profile
            var vipSalesProfile = new RoutingProfileBuilder()
                .SetName("VIPSalesAgent")
                .SetDescription("Handles VIP sales inquiries")
                .SetDefaultOutboundQueue("SalesVIP")
                .AddMediaConcurrency(ChannelType.Voice, 1)
                .AddQueue("SalesVIP", ChannelType.Voice, priority: 1, delay: 0)
                .Build();

            stack.AddRoutingProfile(vipSalesProfile);

            // General Sales Agent Profile
            var salesAgentProfile = new RoutingProfileBuilder()
                .SetName("SalesAgent")
                .SetDescription("Handles sales inquiries (VIP priority)")
                .SetDefaultOutboundQueue("SalesStandard")
                .AddMediaConcurrency(ChannelType.Voice, 1)
                .AddQueue("SalesVIP", ChannelType.Voice, priority: 1, delay: 0)
                .AddQueue("SalesStandard", ChannelType.Voice, priority: 2, delay: 0)
                .Build();

            stack.AddRoutingProfile(salesAgentProfile);

            // Support Agent Profile (Omnichannel)
            var supportAgentProfile = new RoutingProfileBuilder()
                .SetName("SupportAgent")
                .SetDescription("Omnichannel support agent")
                .AddMediaConcurrency(ChannelType.Voice, 1)
                .AddMediaConcurrency(ChannelType.Chat, 3)
                .AddMediaConcurrency(ChannelType.Task, 5)
                .AddQueue("SupportVIP", ChannelType.Voice, priority: 1, delay: 0)
                .AddQueue("SupportStandard", ChannelType.Voice, priority: 2, delay: 0)
                .Build();

            stack.AddRoutingProfile(supportAgentProfile);

            // Billing Specialist Profile
            var billingProfile = new RoutingProfileBuilder()
                .SetName("BillingSpecialist")
                .SetDescription("Dedicated billing support")
                .AddMediaConcurrency(ChannelType.Voice, 1)
                .AddQueue("Billing", ChannelType.Voice, priority: 1, delay: 0)
                .Build();

            stack.AddRoutingProfile(billingProfile);

            // Emergency Support Profile (24/7)
            var emergencyProfile = new RoutingProfileBuilder()
                .SetName("EmergencyAgent")
                .SetDescription("24/7 emergency support agent")
                .AddMediaConcurrency(ChannelType.Voice, 1)
                .AddQueue("EmergencySupport", ChannelType.Voice, priority: 1, delay: 0)
                .Build();

            stack.AddRoutingProfile(emergencyProfile);

            // ===================================================================
            // STEP 4: CREATE CONTACT FLOWS
            // ===================================================================

            // Main Menu Flow
            var mainMenuFlow = new FlowBuilder()
                .SetName("MainMenuFlow")
                .SetDescription("Main IVR menu with department routing")
                .AddTag("FlowType", "MainMenu")
                .PlayPrompt("Thank you for calling Acme Corporation.")
                .CheckHoursOfOperation("BusinessHours")
                .GetCustomerInput(
                    "For sales, press 1. For customer support, press 2. For billing, press 3. For emergency support, press 9.",
                    input =>
                    {
                        input.MaxDigits = 1;
                        input.TimeoutSeconds = 10;
                    })
                .Branch(branch =>
                {
                    branch.Case("1", "sales-transfer");
                    branch.Case("2", "support-transfer");
                    branch.Case("3", "billing-transfer");
                    branch.Case("9", "emergency-transfer");
                    branch.Otherwise("invalid-input");
                })
                .Build();

            stack.AddFlow(mainMenuFlow);

            // Sales Flow (with VIP check)
            var salesFlow = new FlowBuilder()
                .SetName("SalesFlow")
                .SetDescription("Sales department flow with VIP routing")
                .AddTag("FlowType", "Department")
                .AddTag("Department", "Sales")
                .PlayPrompt("Welcome to Acme Sales.")
                // Future: Add Lambda to check if customer is VIP
                // .InvokeLambda("CustomerLookup")
                .TransferToQueue("SalesStandard")
                .Build();

            stack.AddFlow(salesFlow);

            // Support Flow
            var supportFlow = new FlowBuilder()
                .SetName("SupportFlow")
                .SetDescription("Customer support department flow")
                .AddTag("FlowType", "Department")
                .AddTag("Department", "Support")
                .PlayPrompt("Welcome to Acme Customer Support. Transferring you to the next available agent.")
                .TransferToQueue("SupportStandard")
                .Build();

            stack.AddFlow(supportFlow);

            // Billing Flow
            var billingFlow = new FlowBuilder()
                .SetName("BillingFlow")
                .SetDescription("Billing department flow")
                .AddTag("FlowType", "Department")
                .AddTag("Department", "Billing")
                .PlayPrompt("Welcome to Acme Billing. Please have your account number ready.")
                .TransferToQueue("Billing")
                .Build();

            stack.AddFlow(billingFlow);

            // Emergency Flow (24/7)
            var emergencyFlow = new FlowBuilder()
                .SetName("EmergencyFlow")
                .SetDescription("24/7 emergency support flow")
                .AddTag("FlowType", "Emergency")
                .PlayPrompt("You have reached emergency support. Connecting you immediately.")
                .TransferToQueue("EmergencySupport")
                .Build();

            stack.AddFlow(emergencyFlow);

            // After Hours Flow
            var afterHoursFlow = new FlowBuilder()
                .SetName("AfterHoursFlow")
                .SetDescription("Plays after hours message")
                .AddTag("FlowType", "AfterHours")
                .PlayPrompt("Thank you for calling Acme Corporation. Our business hours are Monday through Friday, 9 AM to 5 PM Eastern Time. For emergency support, press 9. Otherwise, please call back during business hours. Goodbye.")
                .Disconnect()
                .Build();

            stack.AddFlow(afterHoursFlow);

            // ===================================================================
            // DEPLOY
            // ===================================================================

            app.Synth();
        }
    }
}
```

---

## Step 3: Deploy

### Bootstrap CDK (First Time Only)

```bash
cdk bootstrap
```

### Deploy the Stack

```bash
# Synthesize CloudFormation template
cdk synth

# Deploy to AWS
cdk deploy
```

**Deployment Process:**
1. CDK creates CloudFormation template
2. CloudFormation creates Amazon Connect resources:
   - Connect instance
   - Hours of operation schedules
   - Queues
   - Routing profiles
   - Contact flows
3. Resources are linked automatically

**Deployment Time:** ~10-15 minutes for first deployment

---

## Step 4: Verify Deployment

### Check AWS Console

1. **Go to Amazon Connect Console**
2. **Select your instance** (`acme-support-center`)
3. **Verify Resources:**
   - **Hours of Operation**: BusinessHours, Emergency24x7
   - **Queues**: 6 queues (SalesVIP, SalesStandard, SupportVIP, SupportStandard, Billing, EmergencySupport)
   - **Routing Profiles**: 5 profiles
   - **Contact Flows**: 5 flows

### Test Contact Flows

1. **Navigate to Flows** in Connect Console
2. **Open MainMenuFlow**
3. **Click "Test"** to simulate a call
4. **Verify flow logic** works as expected

---

## Step 5: Create Users (Manual in Alpha)

Since user creation isn't implemented yet, create agents manually:

### Via AWS Console

1. **Navigate to Users** in Connect Console
2. **Click "Add new users"**
3. **Create agents:**

**Sales Agent:**
- Username: `sales.agent1`
- First Name: `Sales`
- Last Name: `Agent 1`
- Email: `sales1@example.com`
- Routing Profile: `SalesAgent`
- Security Profile: `Agent`

**Support Agent:**
- Username: `support.agent1`
- First Name: `Support`
- Last Name: `Agent 1`
- Email: `support1@example.com`
- Routing Profile: `SupportAgent`
- Security Profile: `Agent`

**Billing Agent:**
- Username: `billing.agent1`
- First Name: `Billing`
- Last Name: `Agent 1`
- Email: `billing1@example.com`
- Routing Profile: `BillingSpecialist`
- Security Profile: `Agent`

---

## Step 6: Test End-to-End

### Test Call Flow

1. **Claim a Phone Number** in Amazon Connect Console
2. **Associate with MainMenuFlow**
3. **Call the number**
4. **Navigate the IVR:**
   - Press 1 → Sales queue
   - Press 2 → Support queue
   - Press 3 → Billing queue
   - Press 9 → Emergency queue

### Test Agent Experience

1. **Have agents log into CCP:**
   - URL: `https://[instance-alias].my.connect.aws/ccp-v2/`
   - Credentials: From user creation

2. **Set agent to "Available"**

3. **Make test call** and verify:
   - Call routes to correct queue
   - Agent receives call
   - Agent can answer and handle contact

---

## What We Built

### Infrastructure Summary

| Resource Type | Count | Names |
|---------------|-------|-------|
| **Instance** | 1 | acme-support-center |
| **Hours of Operation** | 2 | BusinessHours, Emergency24x7 |
| **Queues** | 6 | SalesVIP, SalesStandard, SupportVIP, SupportStandard, Billing, EmergencySupport |
| **Routing Profiles** | 5 | VIPSalesAgent, SalesAgent, SupportAgent, BillingSpecialist, EmergencyAgent |
| **Contact Flows** | 5 | MainMenuFlow, SalesFlow, SupportFlow, BillingFlow, EmergencyFlow, AfterHoursFlow |

### Features Implemented

✅ **Multi-Department Routing** - Sales, Support, Billing, Emergency
✅ **VIP Prioritization** - Separate VIP queues with priority routing
✅ **Business Hours Awareness** - Different handling during/after hours
✅ **24/7 Emergency Support** - Always-available emergency line
✅ **Omnichannel Support** - Support agents handle voice, chat, tasks
✅ **Scalable Architecture** - Separate queues and profiles for growth
✅ **Tagged Resources** - Organized by department and tier

---

## Next Steps

### Enhancements to Consider

1. **Add Lambda Functions**
   - Customer lookup for VIP detection
   - CRM integration
   - Intelligent routing based on customer data

2. **Add Queue Flows**
   - Custom hold music per queue
   - Estimated wait time announcements
   - Callback offers

3. **Add Metrics and Dashboards**
   - Real-time queue metrics
   - Agent performance tracking
   - Historical reporting

4. **Implement Advanced Routing**
   - Skill-based routing
   - Time-of-day routing
   - Dynamic queue priority

5. **Add User Creation via CDK** (When available)
   - Automate agent provisioning
   - Bulk user imports
   - Team-based organization

---

## Clean Up

### Destroy the Stack

When you're done testing:

```bash
cdk destroy
```

**Warning:** This will delete all resources including:
- Contact flows
- Queues
- Routing profiles
- Hours of operation
- The Connect instance itself

**Before destroying:**
- Export any important data
- Download call recordings
- Save configuration for reference

---

## Common Issues and Solutions

### Issue: "Resource already exists"

**Cause:** Resource name conflicts with existing resources

**Solution:** Change resource names or delete conflicting resources

### Issue: "Queue not found in flow"

**Cause:** Queue referenced before being added to stack

**Solution:** Ensure queues are added before flows that reference them

### Issue: "Insufficient permissions"

**Cause:** IAM permissions missing for CDK deployment

**Solution:** Ensure your AWS credentials have Amazon Connect permissions

### Issue: "Flow validation failed"

**Cause:** Invalid flow JSON or missing required blocks

**Solution:** Review flow builder code, ensure all actions are valid

---

## Related Resources

- **[Building Flows](./flows.md)** - Contact flow details
- **[Building Queues](./queues.md)** - Queue configuration
- **[Building Routing Profiles](./routing-profiles.md)** - Routing profile setup
- **[Building Hours](./hours-of-operation.md)** - Hours configuration
- **[SwitchboardStack Reference](/reference/stack.md)** - Full API reference

---

## Source Code

The complete example source code is available in the Switchboard repository:

[View on GitHub →](https://github.com/nicksoftware/AmazonConnectBuilderFramework/tree/main/examples)
