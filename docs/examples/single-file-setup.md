# Single-File Quick Setup

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

Build a complete contact center in one file using Switchboard's fluent CDK API.

## What You'll Build

A fully functional contact center with:
- ✅ 2 queues (Sales, Support)
- ✅ IVR menu flow
- ✅ Callback flow
- ✅ Lambda authentication
- ✅ Dynamic configuration

**Deploy time:** ~15 minutes
**Lines of code:** ~50 lines

---

## Prerequisites

- .NET 10 SDK
- AWS Account
- AWS CLI configured
- Node.js 20+ (for CDK)

---

## Complete Example

Create a single `Program.cs` file:

```csharp
using Amazon.CDK;
using Switchboard;
using Switchboard.CDK;

var app = new App();

// Single CDK stack encompasses everything
var contactCenter = new SwitchboardStack(app, "MyContactCenter", new SwitchboardStackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = System.Environment.GetEnvironmentVariable("CDK_DEFAULT_ACCOUNT"),
        Region = "us-east-1"
    },
    InstanceName = "QuickStartCenter",
    Environment = "production"
});

// Define queues with fluent API
contactCenter
    .AddQueue("Sales", q => {
        q.Name = "Sales Team";
        q.Description = "Main sales queue";
        q.MaxContacts = 50;
        q.HoursOfOperation = "24/7";
    })
    .AddQueue("Support", q => {
        q.Name = "Customer Support";
        q.MaxContacts = 100;
        q.ServiceLevel = new ServiceLevel {
            Threshold = 20, // seconds
            Target = 0.80    // 80% answered within threshold
        };
    });

// Define main inbound flow
contactCenter
    .AddFlow("MainInbound", flow => {
        flow
            .PlayPrompt("Welcome to our company!")
            .GetInput(input => {
                input.Prompt = "Press 1 for Sales, 2 for Support";
                input.MaxDigits = 1;
                input.Timeout = 5;
            })
            .Branch()
                .When("1", b => b.TransferToQueue("Sales"))
                .When("2", b => b.TransferToQueue("Support"))
                .Default(b => b.PlayPrompt("Invalid choice").Disconnect());
    });

// Add callback flow
contactCenter
    .AddFlow("QueueCallback", flow => {
        flow
            .PlayPrompt("You will receive a callback")
            .SetCallback(cb => {
                cb.QueueArn = "{{Queue.Sales}}";
                cb.TimeoutMinutes = 30;
            })
            .Disconnect();
    });

// Enable dynamic configuration (optional)
contactCenter
    .AddDynamicConfiguration(config => {
        config.EnableRuntimeUpdates = true;
        config.DynamoDBTableName = "switchboard-config";
        config.CacheTTL = TimeSpan.FromMinutes(5);
    });

// Add Lambda for authentication (optional)
contactCenter
    .AddLambda("CustomerAuth", lambda => {
        lambda.Runtime = "dotnet8";
        lambda.Handler = "CustomerAuth::Handler";
        lambda.CodePath = "./lambdas/auth";
        lambda.Environment = new Dictionary<string, string>
        {
            ["TABLE_NAME"] = "customers"
        };
    });

// Synthesize CloudFormation
app.Synth();
```

---

## Deploy

```bash
# Bootstrap AWS account (first time only)
cdk bootstrap

# Synthesize CloudFormation template
cdk synth

# Deploy to AWS
cdk deploy

# ✅ One command creates:
# - Amazon Connect instance
# - 2 queues (Sales, Support)
# - 2 flows (MainInbound, QueueCallback)
# - DynamoDB table for config
# - Lambda function for auth
# - All IAM roles and policies
# - CloudWatch logs
```

---

## What Gets Created

### Amazon Connect Resources
- **Instance:** `QuickStartCenter`
- **Queues:**
  - Sales Team (max 50 contacts)
  - Customer Support (max 100 contacts, 80% SLA)
- **Contact Flows:**
  - MainInbound (IVR menu)
  - QueueCallback

### Supporting Infrastructure
- **DynamoDB Table:** `switchboard-config` (for runtime updates)
- **Lambda Function:** `CustomerAuth` (for authentication)
- **IAM Roles:**
  - Connect service role
  - Lambda execution role
- **CloudWatch Log Groups:** For all flows and Lambda

---

## Real-World Example: VIP Routing

Complete customer service center with VIP routing in ~70 lines:

```csharp
using Amazon.CDK;
using Switchboard;

var app = new App();
var center = new SwitchboardStack(app, "CustomerService");

// Define queues with priority levels
center
    .AddQueue("VIP", q => {
        q.MaxContacts = 10;
        q.ServiceLevel = new ServiceLevel { Threshold = 10, Target = 0.95 }; // 95% in 10s
    })
    .AddQueue("General", q => {
        q.MaxContacts = 100;
        q.ServiceLevel = new ServiceLevel { Threshold = 20, Target = 0.80 }; // 80% in 20s
    })
    .AddQueue("Escalation", q => {
        q.MaxContacts = 5;
    });

// Add VIP check Lambda
center
    .AddLambda("CheckVIPStatus", lambda => {
        lambda.Runtime = "dotnet8";
        lambda.Handler = "VIPCheck::Handler";
        lambda.CodePath = "./lambdas/vip-check";
        lambda.Timeout = TimeSpan.FromSeconds(3);
    });

// Main inbound flow with VIP routing
center
    .AddFlow("MainLine", flow => {
        flow
            .PlayPrompt("Welcome! Please hold while we verify your account.")

            // Invoke Lambda to check VIP status
            .InvokeLambda("CheckVIPStatus", lambda => {
                lambda.InputAttribute("CustomerPhone", "{{CustomerEndpoint.Address}}");
                lambda.OutputAttribute("IsVIP");
                lambda.OutputAttribute("AccountTier");
            })

            // Route based on VIP status
            .Branch()
                .WhenAttributeEquals("IsVIP", "true", vip => {
                    vip.PlayPrompt("Welcome, valued customer! Connecting you to our priority team.")
                       .TransferToQueue("VIP");
                })
                .Default(standard => {
                    standard.PlayPrompt("Thank you for calling.")
                            .CheckHours("9am-5pm EST",
                                open: h => h.TransferToQueue("General"),
                                closed: h => {
                                    h.PlayPrompt("We're currently closed.")
                                     .GetInput(callback => {
                                         callback.Prompt = "Press 1 for a callback tomorrow";
                                         callback.MaxDigits = 1;
                                     })
                                     .Branch()
                                        .When("1", cb => cb.UseFlow("CallbackFlow"))
                                        .Default(d => d.UseFlow("VoicemailFlow"));
                                });
                });
    });

// Callback flow
center
    .AddFlow("CallbackFlow", flow => {
        flow
            .PlayPrompt("We'll call you back tomorrow during business hours.")
            .SetCallback(cb => {
                cb.QueueArn = "{{Queue.General}}";
                cb.TimeoutMinutes = 1440; // 24 hours
            })
            .Disconnect();
    });

// Voicemail flow
center
    .AddFlow("VoicemailFlow", flow => {
        flow
            .PlayPrompt("Please leave a message after the beep.")
            .StartRecording(rec => {
                rec.S3Bucket = "customer-voicemails";
                rec.S3KeyPrefix = "{{ContactId}}";
                rec.MaxDuration = 120;
            })
            .PlayPrompt("Thank you. Goodbye.")
            .Disconnect();
    });

// Enable dynamic config for easy updates
center
    .AddDynamicConfiguration(config => {
        config.EnableRuntimeUpdates = true;
        config.AllowedUpdates = new[] { "Prompts", "HoursOfOperation", "QueueTimeouts" };
    });

app.Synth();
```

---

## Lambda Example

Create `lambdas/vip-check/Handler.cs`:

```csharp
using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class Handler
{
    public async Task<VIPCheckResponse> FunctionHandler(VIPCheckRequest request, ILambdaContext context)
    {
        // In production, query your customer database
        var phoneNumber = request.CustomerPhone;

        context.Logger.LogInformation($"Checking VIP status for {phoneNumber}");

        // Mock VIP check - replace with real logic
        var isVIP = phoneNumber.StartsWith("+1-800-VIP");

        return new VIPCheckResponse
        {
            IsVIP = isVIP.ToString().ToLower(),
            AccountTier = isVIP ? "Platinum" : "Standard"
        };
    }
}

public record VIPCheckRequest(string CustomerPhone);
public record VIPCheckResponse
{
    public string IsVIP { get; init; }
    public string AccountTier { get; init; }
}
```

---

## Runtime Updates

Update prompts without redeployment:

```bash
# Update welcome message
aws dynamodb put-item \
  --table-name switchboard-config \
  --item '{
    "FlowId": {"S": "MainLine"},
    "Parameter": {"S": "WelcomePrompt"},
    "Value": {"S": "Welcome! We are experiencing high call volume."}
  }'

# Next call uses new message immediately
```

---

## Clean Up

```bash
# Destroy all resources
cdk destroy

# Confirm deletion
# WARNING: This deletes the Connect instance, queues, flows, etc.
```

---

## Next Steps

This single-file approach is great for:
- ✅ Prototypes and demos
- ✅ Learning Switchboard
- ✅ Simple contact centers (1-5 flows)

**When to move to more advanced patterns:**
- 📈 **10+ flows** → Use [attribute-based](/guide/patterns#attribute-based-flow-definition) or [modular](/guide/patterns#modular-flow-composition) patterns
- 🧪 **Need testing** → Use [hybrid pattern](/guide/patterns#hybrid-pattern-attributes-fluent) with dependency injection
- 👥 **Team collaboration** → Split into multiple files, see [enterprise examples](/examples/enterprise-attributes)
- 🏢 **Production deployment** → Add [multi-environment config](/guide/patterns#multi-environment-configuration)

## Related Examples

- [Minimal Setup](/examples/minimal-setup) - 8 minimal examples with attributes
- [Enterprise Setup (Attributes)](/examples/enterprise-attributes) - Production-ready structure
- [Enterprise Setup (Fluent)](/examples/enterprise-fluent) - Production with fluent builders
- [Framework Patterns](/guide/patterns) - All usage patterns explained
