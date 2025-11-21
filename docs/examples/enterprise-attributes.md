# Enterprise Call Center (Attribute-Based)

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

A production-ready enterprise contact center using **attribute-based flow definitions** with complete project structure, multi-environment support, and best practices.

## Overview

This example shows a **complete enterprise-grade contact center** built with **declarative attributes**:
- Multiple inbound/outbound flows
- Queue management with SLAs
- Routing profiles for different agent types
- Lambda integrations for business logic
- Dynamic configuration with DynamoDB
- Multi-environment deployment (Dev/Staging/Prod)
- CI/CD pipeline ready
- Monitoring and observability

**Project complexity:** Enterprise
**Deployment time:** 30-45 minutes
**Team size:** 5-20 developers

---

## Project Structure

```
EnterpriseCallCenter/
├── src/
│   ├── Flows/
│   │   ├── Inbound/
│   │   │   ├── SalesInboundFlow.cs
│   │   │   ├── SupportInboundFlow.cs
│   │   │   └── AfterHoursFlow.cs
│   │   ├── Outbound/
│   │   │   ├── CustomerFollowUpFlow.cs
│   │   │   └── SurveyFlow.cs
│   │   ├── Transfer/
│   │   │   ├── AgentTransferFlow.cs
│   │   │   └── QueueTransferFlow.cs
│   │   └── Shared/
│   │       ├── AuthenticationModule.cs
│   │       ├── VoicemailModule.cs
│   │       └── CallbackModule.cs
│   │
│   ├── Queues/
│   │   ├── SalesQueues.cs
│   │   ├── SupportQueues.cs
│   │   └── EscalationQueues.cs
│   │
│   ├── RoutingProfiles/
│   │   ├── SalesAgentProfile.cs
│   │   ├── SupportAgentProfile.cs
│   │   └── SupervisorProfile.cs
│   │
│   ├── Hours/
│   │   ├── BusinessHours.cs
│   │   ├── HolidayHours.cs
│   │   └── ExtendedSupportHours.cs
│   │
│   ├── Lambdas/
│   │   ├── CustomerLookup/
│   │   │   ├── Function.cs
│   │   │   └── CustomerLookup.csproj
│   │   ├── CallDisposition/
│   │   │   ├── Function.cs
│   │   │   └── CallDisposition.csproj
│   │   └── Shared/
│   │       └── ConnectExtensions.cs
│   │
│   ├── Stacks/
│   │   ├── ConnectInstanceStack.cs
│   │   ├── FlowsStack.cs
│   │   ├── QueuesStack.cs
│   │   ├── LambdasStack.cs
│   │   └── MonitoringStack.cs
│   │
│   ├── Configuration/
│   │   ├── ConnectConfiguration.cs
│   │   └── EnvironmentConfiguration.cs
│   │
│   └── Program.cs
│
├── config/
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── appsettings.Staging.json
│   └── appsettings.Production.json
│
├── tests/
│   ├── Unit/
│   │   ├── Flows/
│   │   └── Lambdas/
│   └── Integration/
│       └── CDK/
│
├── .github/
│   └── workflows/
│       ├── deploy-dev.yml
│       ├── deploy-staging.yml
│       └── deploy-prod.yml
│
├── cdk.json
└── README.md
```

---

## Code Examples

### 1. Main Entry Point

**`src/Program.cs`**

```csharp
using Amazon.CDK;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Switchboard;

var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

var builder = Host.CreateApplicationBuilder(args);

// Load environment-specific configuration
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("config/appsettings.json", optional: false)
    .AddJsonFile($"config/appsettings.{environment}.json", optional: true)
    .AddEnvironmentVariables();

var connectConfig = builder.Configuration.GetSection("Connect").Get<ConnectConfiguration>();

// Register Switchboard with environment-specific config
builder.Services.AddSwitchboard(options =>
{
    options.Environment = environment;
    options.InstanceName = connectConfig.InstanceName;
    options.Region = connectConfig.Region;
})
.AddFlowDefinitions(typeof(Program).Assembly)
.AddQueueDefinitions(typeof(Program).Assembly)
.AddRoutingProfiles(typeof(Program).Assembly)
.AddDynamicConfiguration(config =>
{
    config.UseDynamoDB();
    config.TableName = $"connect-config-{environment.ToLower()}";
    config.CacheTTL = TimeSpan.FromMinutes(5);
});

var host = builder.Build();

// Create CDK app
var app = new App();

var stackProps = new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = connectConfig.AwsAccount,
        Region = connectConfig.Region
    },
    Tags = new Dictionary<string, string>
    {
        ["Environment"] = environment,
        ["ManagedBy"] = "Switchboard",
        ["Project"] = "EnterpriseCallCenter"
    }
};

// Create stacks
new ConnectInstanceStack(app, $"Connect-Instance-{environment}", stackProps, connectConfig);
new QueuesStack(app, $"Connect-Queues-{environment}", stackProps, connectConfig);
new FlowsStack(app, $"Connect-Flows-{environment}", stackProps, connectConfig);
new LambdasStack(app, $"Connect-Lambdas-{environment}", stackProps, connectConfig);
new MonitoringStack(app, $"Connect-Monitoring-{environment}", stackProps, connectConfig);

app.Synth();
```

---

### 2. Inbound Flow with Authentication

**`src/Flows/Inbound/SalesInboundFlow.cs`**

```csharp
using Switchboard;
using Switchboard.Attributes;

namespace EnterpriseCallCenter.Flows.Inbound;

[ContactFlow("SalesInbound")]
[Description("Main sales inbound flow with customer authentication")]
public partial class SalesInboundFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to Enterprise Sales. Please hold while we verify your account.")]
    public partial void Welcome();

    // Use shared authentication module
    [Action(Order = 2)]
    [UseModule(typeof(Shared.AuthenticationModule))]
    public partial Task<AuthenticationResult> Authenticate();

    // Branch based on authentication result
    [Action(Order = 3)]
    [Branch(AttributeName = "IsAuthenticated")]
    [Case("true", Target = "CheckVIPStatus")]
    [Case("false", Target = "UnauthenticatedFlow")]
    public partial void CheckAuthStatus();

    // Check if customer is VIP
    [Action(Order = 4, Id = "CheckVIPStatus")]
    [InvokeLambda("CustomerLookup")]
    [InputParameter("customerId", AttributeRef = "CustomerId")]
    [OutputAttribute("IsVIP")]
    [OutputAttribute("AccountTier")]
    public partial Task<CustomerInfo> LookupCustomer();

    // Route VIP to priority queue
    [Action(Order = 5)]
    [Branch(AttributeName = "IsVIP")]
    [Case("true", Target = "VIPQueue")]
    [Case("false", Target = "StandardQueue")]
    public partial void RouteByTier();

    [Action(Order = 6, Id = "VIPQueue")]
    [Message("Thank you for being a valued customer. Connecting you to our priority team.")]
    [TransferToQueue("VIP-Sales", Priority = 1)]
    public partial void TransferToVIPQueue();

    [Action(Order = 7, Id = "StandardQueue")]
    [CheckHoursOfOperation("Sales-Hours")]
    [WhenOpen(Target = "StandardSalesQueue")]
    [WhenClosed(Target = "AfterHoursFlow")]
    public partial void CheckBusinessHours();

    [Action(Order = 8, Id = "StandardSalesQueue")]
    [Message("Thank you for calling. Connecting you to our sales team.")]
    [TransferToQueue("Sales")]
    public partial void TransferToStandardQueue();

    [Action(Order = 9, Id = "UnauthenticatedFlow")]
    [Message("We couldn't verify your account.")]
    [TransferToQueue("Sales-Verification")]
    public partial void TransferToVerification();

    [Action(Order = 10, Id = "AfterHoursFlow")]
    [UseFlow("AfterHoursFlow")]
    public partial void HandleAfterHours();
}
```

---

### 3. Shared Authentication Module

**`src/Flows/Shared/AuthenticationModule.cs`**

```csharp
using Switchboard;
using Switchboard.Attributes;

namespace EnterpriseCallCenter.Flows.Shared;

[FlowModule("Authentication")]
[Description("Reusable customer authentication module")]
public partial class AuthenticationModule : FlowModuleBase
{
    [Step(Order = 1)]
    [GetCustomerInput]
    [Prompt("Please enter your 8-digit customer ID")]
    [MaxDigits(8)]
    [EncryptInput(true)]
    [StoreAttribute("CustomerId")]
    public partial Task<string> GetCustomerId();

    [Step(Order = 2)]
    [InvokeLambda("ValidateCustomer")]
    [InputParameter("customerId", AttributeRef = "CustomerId")]
    [OutputAttribute("IsAuthenticated")]
    [OutputAttribute("CustomerName")]
    public partial Task<ValidationResult> ValidateCustomer();

    [Step(Order = 3)]
    [Branch(AttributeName = "IsAuthenticated")]
    [Case("true", ExitModule = true)]
    [Case("false", Target = "RetryOrFail")]
    public partial void CheckValidation();

    [Step(Order = 4, Id = "RetryOrFail")]
    [CheckAttribute("AuthAttempts")]
    [WhenLessThan(3, Target = "Retry")]
    [Otherwise(Target = "Failed")]
    public partial void CheckRetryCount();

    [Step(Order = 5, Id = "Retry")]
    [Message("That ID was not recognized. Please try again.")]
    [IncrementAttribute("AuthAttempts")]
    [Goto("GetCustomerId")]
    public partial void RetryAuthentication();

    [Step(Order = 6, Id = "Failed")]
    [Message("Authentication failed. Transferring to an agent.")]
    [SetAttribute("IsAuthenticated", "false")]
    [ExitModule]
    public partial void AuthenticationFailed();
}
```

---

### 4. Queue Definitions

**`src/Queues/SalesQueues.cs`**

```csharp
using Switchboard;
using Switchboard.Attributes;

namespace EnterpriseCallCenter.Queues;

[Queue("Sales")]
public class SalesQueue : QueueDefinitionBase
{
    [MaxContacts(100)]
    [ServiceLevel(Threshold = 20, Target = 0.80)] // 80% in 20 seconds
    [HoursOfOperation("Sales-Hours")]
    [OutboundCallerIdName("Enterprise Sales")]
    public override QueueConfiguration Configure()
    {
        return new QueueConfiguration
        {
            Description = "Main sales queue",
            Tags = new Dictionary<string, string>
            {
                ["Department"] = "Sales",
                ["Priority"] = "Standard"
            }
        };
    }
}

[Queue("VIP-Sales")]
public class VIPSalesQueue : QueueDefinitionBase
{
    [MaxContacts(25)]
    [ServiceLevel(Threshold = 10, Target = 0.95)] // 95% in 10 seconds
    [HoursOfOperation("24/7")]
    [Priority(1)] // Highest priority
    public override QueueConfiguration Configure()
    {
        return new QueueConfiguration
        {
            Description = "VIP sales priority queue",
            Tags = new Dictionary<string, string>
            {
                ["Department"] = "Sales",
                ["Priority"] = "VIP"
            }
        };
    }
}
```

---

### 5. Lambda Function

**`src/Lambdas/CustomerLookup/Function.cs`**

```csharp
using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace EnterpriseCallCenter.Lambdas.CustomerLookup;

public class Function
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly string _tableName;

    public Function()
    {
        _dynamoDb = new AmazonDynamoDBClient();
        _tableName = Environment.GetEnvironmentVariable("CUSTOMERS_TABLE")
            ?? throw new InvalidOperationException("CUSTOMERS_TABLE not set");
    }

    public async Task<CustomerLookupResponse> FunctionHandler(
        CustomerLookupRequest request,
        ILambdaContext context)
    {
        context.Logger.LogInformation($"Looking up customer: {request.CustomerId}");

        try
        {
            var table = Table.LoadTable(_dynamoDb, _tableName);
            var document = await table.GetItemAsync(request.CustomerId);

            if (document == null)
            {
                return new CustomerLookupResponse
                {
                    IsVIP = "false",
                    AccountTier = "Unknown",
                    CustomerName = "Unknown"
                };
            }

            var tier = document["AccountTier"]?.AsString() ?? "Standard";
            var isVIP = tier == "Platinum" || tier == "Gold";

            return new CustomerLookupResponse
            {
                IsVIP = isVIP.ToString().ToLower(),
                AccountTier = tier,
                CustomerName = document["Name"]?.AsString() ?? "Valued Customer",
                LifetimeValue = document["LifetimeValue"]?.AsDecimal() ?? 0
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error looking up customer: {ex.Message}");

            // Graceful fallback
            return new CustomerLookupResponse
            {
                IsVIP = "false",
                AccountTier = "Standard",
                CustomerName = "Valued Customer"
            };
        }
    }
}

public record CustomerLookupRequest(string CustomerId);

public record CustomerLookupResponse
{
    public string IsVIP { get; init; }
    public string AccountTier { get; init; }
    public string CustomerName { get; init; }
    public decimal LifetimeValue { get; init; }
}
```

---

### 6. Environment Configuration

**`config/appsettings.Production.json`**

```json
{
  "Connect": {
    "InstanceName": "enterprise-call-center-prod",
    "Region": "us-east-1",
    "AwsAccount": "123456789012",
    "Environment": "Production"
  },

  "Features": {
    "EnableVIPRouting": true,
    "EnableCallRecording": true,
    "EnableAdvancedAnalytics": true,
    "EnableRealTimeReporting": true
  },

  "Queues": {
    "Sales": {
      "MaxContacts": 100,
      "ServiceLevelThreshold": 20,
      "ServiceLevelTarget": 0.80
    },
    "VIP-Sales": {
      "MaxContacts": 25,
      "ServiceLevelThreshold": 10,
      "ServiceLevelTarget": 0.95
    }
  },

  "Lambdas": {
    "CustomerLookup": {
      "Timeout": 5,
      "Memory": 512,
      "Environment": {
        "CUSTOMERS_TABLE": "customers-prod",
        "LOG_LEVEL": "INFO"
      }
    }
  },

  "DynamicConfiguration": {
    "Enabled": true,
    "TableName": "connect-config-production",
    "CacheTTL": 300
  },

  "Monitoring": {
    "EnableDetailedLogging": true,
    "AlarmEmail": "ops-team@company.com",
    "SlackWebhook": "https://hooks.slack.com/services/xxx"
  }
}
```

---

### 7. CI/CD Pipeline

**`.github/workflows/deploy-prod.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  DOTNET_VERSION: '10.0.x'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Restore dependencies
        run: dotnet restore

      - name: Run unit tests
        run: dotnet test tests/Unit --configuration Release

      - name: Run integration tests
        run: dotnet test tests/Integration --configuration Release

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install AWS CDK
        run: npm install -g aws-cdk

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Build Lambdas
        run: |
          dotnet publish src/Lambdas/CustomerLookup -c Release -o artifacts/CustomerLookup
          dotnet publish src/Lambdas/CallDisposition -c Release -o artifacts/CallDisposition

      - name: CDK Diff
        run: cdk diff
        env:
          ASPNETCORE_ENVIRONMENT: Production

      - name: CDK Deploy
        run: cdk deploy --all --require-approval never
        env:
          ASPNETCORE_ENVIRONMENT: Production

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Deployment

### Initial Deployment

```bash
# 1. Set environment
export ASPNETCORE_ENVIRONMENT=Production

# 2. Bootstrap AWS account (first time only)
cdk bootstrap aws://123456789012/us-east-1

# 3. Build Lambda functions
dotnet publish src/Lambdas/CustomerLookup -c Release -o artifacts/CustomerLookup

# 4. Deploy all stacks
cdk deploy --all

# 5. Verify deployment
aws connect list-contact-flows --instance-id <instance-id>
```

### Update Deployment

```bash
# Deploy specific stack
cdk deploy Connect-Flows-Production

# Deploy with change set review
cdk deploy --all --require-approval broadening
```

---

## Monitoring

### CloudWatch Dashboards

The MonitoringStack creates dashboards for:
- **Contact Flow Metrics**: Success rate, duration, errors
- **Queue Metrics**: Wait time, abandoned calls, SLA compliance
- **Lambda Metrics**: Invocations, errors, duration
- **DynamoDB Metrics**: Read/write capacity, throttles

### Alarms

Automatic alarms for:
- Contact flow error rate > 5%
- Queue wait time > 60 seconds
- Lambda errors > 1%
- DynamoDB throttling

---

## Best Practices Implemented

### Security
- ✅ All Lambda environment variables encrypted
- ✅ Least-privilege IAM roles
- ✅ Encrypted contact attributes
- ✅ VPC endpoints for Lambda
- ✅ Secrets in AWS Secrets Manager

### Scalability
- ✅ DynamoDB on-demand capacity
- ✅ Lambda concurrent execution limits
- ✅ Queue overflow handling
- ✅ Auto-scaling for peak hours

### Reliability
- ✅ Multi-region backup
- ✅ Disaster recovery plan
- ✅ Graceful degradation
- ✅ Circuit breakers in Lambdas

### Observability
- ✅ Structured logging
- ✅ Distributed tracing
- ✅ Custom CloudWatch metrics
- ✅ Real-time alerting

---

## Cost Optimization

### Estimated Monthly Costs (Production)

| Service | Usage | Cost |
|---------|-------|------|
| Amazon Connect | 10,000 calls/month | $100 |
| Lambda (Customer Lookup) | 300,000 invocations | $0.60 |
| DynamoDB | On-demand, 100K reads | $12.50 |
| CloudWatch Logs | 10 GB | $5.00 |
| **Total** | | **~$118/month** |

### Cost-Saving Tips
- Use DynamoDB on-demand for variable workloads
- Enable Lambda SnapStart for faster cold starts
- Archive old call recordings to S3 Glacier
- Use Reserved Capacity for predictable workloads

---

## Next Steps

1. **Add more flows** - Expand to outbound, callbacks, surveys
2. **Integrate with CRM** - Connect to Salesforce, ServiceNow
3. **Add agent workspace** - Build custom agent UI
4. **Enable real-time analytics** - Kinesis + QuickSight dashboards
5. **Implement quality management** - Call recording analysis with AI

## When to Use This Approach

**Choose attribute-based when:**
- ✅ Flows are straightforward and linear
- ✅ Team prefers declarative, readable code
- ✅ Source generators handle most complexity
- ✅ Minimal custom business logic needed

**Consider fluent builder when:**
- ⚠️ Complex dynamic routing logic
- ⚠️ Runtime configuration drives behavior
- ⚠️ Need programmatic flow construction

## Related Examples

- [Enterprise (Fluent)](/examples/enterprise-fluent) - Same example with fluent builders
- [Single-File Setup](/examples/single-file-setup) - Quickstart example
- [Existing Instance Migration](/examples/existing-instance) - Brownfield scenarios
