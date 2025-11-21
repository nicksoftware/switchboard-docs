# Multi-Region Deployment

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

Deploy a highly available contact center across multiple AWS regions with automatic failover and disaster recovery.

## Overview

This example shows how to deploy Amazon Connect across **multiple regions** for:
- ✅ High availability and disaster recovery
- ✅ Geographic redundancy
- ✅ Reduced latency for global customers
- ✅ Compliance with data residency requirements
- ✅ Automatic failover between regions

**Deployment strategy:** Active-Active or Active-Passive
**Regions:** Primary + Secondary (expandable to N regions)
**RTO (Recovery Time Objective):** < 5 minutes
**RPO (Recovery Point Objective):** < 1 minute

---

## Architecture

### Active-Active Multi-Region

```
                    ┌──────────────────┐
                    │   Route 53 DNS   │
                    │  Health Checks   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼────────┐    │    ┌────────▼──────────┐
    │   US-EAST-1      │    │    │    US-WEST-2      │
    │  (Primary)       │    │    │   (Secondary)     │
    │                  │    │    │                   │
    │  Connect Instance│    │    │  Connect Instance │
    │  Flows, Queues   │    │    │  Flows, Queues    │
    │  Lambda Functions│    │    │  Lambda Functions │
    │  DynamoDB (Global│◄───┼───►│  DynamoDB (Global │
    │   Table)         │    │    │   Table)          │
    └──────────────────┘    │    └───────────────────┘
                            │
                   ┌────────▼─────────┐
                   │   S3 (Replicated)│
                   │  Call Recordings │
                   └──────────────────┘
```

---

## Project Structure

```
MultiRegionCallCenter/
├── src/
│   ├── Stacks/
│   │   ├── MultiRegionStack.cs          # Orchestrates multi-region
│   │   ├── RegionalConnectStack.cs      # Per-region Connect resources
│   │   ├── GlobalDynamoDbStack.cs       # Global DynamoDB table
│   │   ├── S3ReplicationStack.cs        # Cross-region replication
│   │   └── Route53HealthCheckStack.cs   # DNS failover
│   │
│   ├── Flows/
│   │   └── (Same as enterprise example)
│   │
│   ├── Configuration/
│   │   ├── RegionConfiguration.cs
│   │   └── FailoverConfiguration.cs
│   │
│   └── Program.cs
│
├── config/
│   ├── regions.json                     # Region definitions
│   └── failover-rules.json
│
└── scripts/
    ├── deploy-all-regions.sh
    ├── failover-test.sh
    └── verify-replication.sh
```

---

## Code Examples

### 1. Multi-Region Orchestration

**`src/Program.cs`**

```csharp
using Amazon.CDK;
using Switchboard;

var app = new App();

// Define regions
var regions = new[]
{
    new RegionConfig
    {
        Name = "US-East-1",
        Region = "us-east-1",
        IsPrimary = true,
        Priority = 1
    },
    new RegionConfig
    {
        Name = "US-West-2",
        Region = "us-west-2",
        IsPrimary = false,
        Priority = 2
    },
    new RegionConfig
    {
        Name = "EU-West-1",
        Region = "eu-west-1",
        IsPrimary = false,
        Priority = 3
    }
};

// Create global resources (cross-region)
var globalStack = new GlobalResourcesStack(app, "Connect-Global", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = "123456789012",
        Region = "us-east-1" // Global resources in primary region
    }
});

// Create regional stacks
foreach (var regionConfig in regions)
{
    var regionalStack = new RegionalConnectStack(app, $"Connect-{regionConfig.Name}", new StackProps
    {
        Env = new Amazon.CDK.Environment
        {
            Account = "123456789012",
            Region = regionConfig.Region
        }
    }, regionConfig, globalStack);

    // Add cross-stack references
    regionalStack.AddDependency(globalStack);
}

// Create Route 53 health checks and failover
var route53Stack = new Route53FailoverStack(app, "Connect-Route53", new StackProps
{
    Env = new Amazon.CDK.Environment
    {
        Account = "123456789012",
        Region = "us-east-1" // Route 53 is global but stack needs region
    },
    CrossRegionReferences = true
}, regions);

app.Synth();
```

---

### 2. Regional Connect Stack

**`src/Stacks/RegionalConnectStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.Connect;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Switchboard;

namespace MultiRegionCallCenter.Stacks;

public class RegionalConnectStack : Stack
{
    public CfnInstance ConnectInstance { get; private set; }
    public string InstanceId { get; private set; }

    public RegionalConnectStack(
        Construct scope,
        string id,
        IStackProps props,
        RegionConfig regionConfig,
        GlobalResourcesStack globalStack) : base(scope, id, props)
    {
        // Create Connect instance in this region
        ConnectInstance = new CfnInstance(this, "Instance", new CfnInstanceProps
        {
            InstanceAlias = $"enterprise-{regionConfig.Name.ToLower()}",
            IdentityManagementType = "CONNECT_MANAGED",
            Attributes = new CfnInstance.AttributesProperty
            {
                InboundCalls = true,
                OutboundCalls = true,
                ContactflowLogs = true,
                ContactLens = true
            },
            Tags = new[]
            {
                new CfnTag { Key = "Region", Value = regionConfig.Name },
                new CfnTag { Key = "IsPrimary", Value = regionConfig.IsPrimary.ToString() },
                new CfnTag { Key = "Priority", Value = regionConfig.Priority.ToString() }
            }
        });

        InstanceId = ConnectInstance.AttrArn;

        // Create queues (identical across regions)
        CreateQueues(regionConfig);

        // Create flows (identical across regions)
        CreateFlows(regionConfig);

        // Create regional Lambda functions
        CreateLambdaFunctions(regionConfig, globalStack);

        // Configure DynamoDB endpoint (uses global table)
        ConfigureDynamoDBAccess(globalStack.ConfigTable);

        // Set up S3 replication for call recordings
        ConfigureS3Replication(regionConfig);

        // Create CloudWatch alarms
        CreateRegionalAlarms(regionConfig);

        // Export outputs
        new CfnOutput(this, "InstanceId", new CfnOutputProps
        {
            Value = ConnectInstance.AttrId,
            ExportName = $"Connect-Instance-{regionConfig.Name}"
        });

        new CfnOutput(this, "InstanceArn", new CfnOutputProps
        {
            Value = ConnectInstance.AttrArn,
            ExportName = $"Connect-Arn-{regionConfig.Name}"
        });
    }

    private void CreateQueues(RegionConfig regionConfig)
    {
        // Sales queue
        var salesQueue = new CfnQueue(this, "SalesQueue", new CfnQueueProps
        {
            InstanceArn = ConnectInstance.AttrArn,
            Name = "Sales",
            Description = $"Sales queue in {regionConfig.Region}",
            MaxContacts = 100,
            HoursOfOperationArn = CreateHoursOfOperation("24x7")
        });

        // VIP queue
        var vipQueue = new CfnQueue(this, "VIPQueue", new CfnQueueProps
        {
            InstanceArn = ConnectInstance.AttrArn,
            Name = "VIP-Sales",
            Description = $"VIP queue in {regionConfig.Region}",
            MaxContacts = 25
        });

        // Support queue
        var supportQueue = new CfnQueue(this, "SupportQueue", new CfnQueueProps
        {
            InstanceArn = ConnectInstance.AttrArn,
            Name = "Support",
            MaxContacts = 100
        });
    }

    private void CreateFlows(RegionConfig regionConfig)
    {
        // Flows are created identically in each region
        // Use Switchboard framework to define flows
        var flowBuilder = new FlowBuilder();

        var salesFlow = flowBuilder
            .SetName("SalesInbound")
            .PlayPrompt($"Welcome to our {regionConfig.Name} sales center")
            .InvokeLambda("CustomerLookup", lambda =>
            {
                lambda.InputAttribute("region", regionConfig.Region);
            })
            .TransferToQueue("Sales")
            .Build();

        // Create Contact Flow in Connect
        var cfnFlow = new CfnContactFlow(this, "SalesInboundFlow", new CfnContactFlowProps
        {
            InstanceArn = ConnectInstance.AttrArn,
            Name = "SalesInbound",
            Type = "CONTACT_FLOW",
            Content = salesFlow.ToJson()
        });
    }

    private void CreateLambdaFunctions(RegionConfig regionConfig, GlobalResourcesStack globalStack)
    {
        // Customer Lookup Lambda (region-specific)
        var customerLookupLambda = new Function(this, "CustomerLookupLambda", new FunctionProps
        {
            Runtime = Runtime.DOTNET_8,
            Handler = "CustomerLookup::Handler",
            Code = Code.FromAsset("./artifacts/CustomerLookup"),
            Environment = new Dictionary<string, string>
            {
                ["CUSTOMERS_TABLE"] = globalStack.ConfigTable.TableName, // Global table
                ["REGION"] = regionConfig.Region,
                ["IS_PRIMARY"] = regionConfig.IsPrimary.ToString()
            },
            Timeout = Duration.Seconds(5)
        });

        // Grant Lambda access to global DynamoDB table
        globalStack.ConfigTable.GrantReadWriteData(customerLookupLambda);

        // Allow Connect to invoke Lambda
        customerLookupLambda.GrantInvoke(new ServicePrincipal("connect.amazonaws.com"));
    }

    private void ConfigureDynamoDBAccess(ITable globalTable)
    {
        // All regions read/write to same global table
        // Automatic replication handled by DynamoDB Global Tables
    }

    private void ConfigureS3Replication(RegionConfig regionConfig)
    {
        // S3 bucket for call recordings (replicated across regions)
        var recordingsBucket = new Bucket(this, "Recordings", new BucketProps
        {
            BucketName = $"connect-recordings-{regionConfig.Region}",
            Versioned = true,
            LifecycleRules = new[]
            {
                new LifecycleRule
                {
                    Id = "DeleteOldRecordings",
                    Expiration = Duration.Days(90),
                    Transitions = new[]
                    {
                        new Transition
                        {
                            StorageClass = StorageClass.GLACIER,
                            TransitionAfter = Duration.Days(30)
                        }
                    }
                }
            }
        });

        // Enable replication to other regions (configured separately)
        if (regionConfig.IsPrimary)
        {
            // Primary region - source for replication
            Tags.Of(recordingsBucket).Add("ReplicationSource", "true");
        }
    }

    private void CreateRegionalAlarms(RegionConfig regionConfig)
    {
        // CloudWatch alarm for instance health
        new Alarm(this, "InstanceHealthAlarm", new AlarmProps
        {
            Metric = new Metric(new MetricProps
            {
                Namespace = "AWS/Connect",
                MetricName = "CallsBreachingConcurrencyQuota",
                Statistic = "Sum",
                Period = Duration.Minutes(5)
            }),
            Threshold = 1,
            EvaluationPeriods = 2,
            AlarmDescription = $"Connect instance health in {regionConfig.Region}"
        });
    }

    private string CreateHoursOfOperation(string name)
    {
        var hours = new CfnHoursOfOperation(this, $"Hours-{name}", new CfnHoursOfOperationProps
        {
            InstanceArn = ConnectInstance.AttrArn,
            Name = name,
            TimeZone = "UTC",
            Config = new[]
            {
                new CfnHoursOfOperation.HoursOfOperationConfigProperty
                {
                    Day = "MONDAY",
                    StartTime = new CfnHoursOfOperation.HoursOfOperationTimeSliceProperty
                    {
                        Hours = 0,
                        Minutes = 0
                    },
                    EndTime = new CfnHoursOfOperation.HoursOfOperationTimeSliceProperty
                    {
                        Hours = 23,
                        Minutes = 59
                    }
                }
                // Repeat for all days
            }
        });

        return hours.AttrHoursOfOperationArn;
    }
}

public record RegionConfig
{
    public string Name { get; init; }
    public string Region { get; init; }
    public bool IsPrimary { get; init; }
    public int Priority { get; init; }
}
```

---

### 3. Global DynamoDB Table

**`src/Stacks/GlobalDynamoDbStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;

namespace MultiRegionCallCenter.Stacks;

public class GlobalResourcesStack : Stack
{
    public ITable ConfigTable { get; private set; }

    public GlobalResourcesStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
    {
        // Global DynamoDB table (replicated across all regions)
        ConfigTable = new Table(this, "ConfigTable", new TableProps
        {
            TableName = "connect-config-global",
            PartitionKey = new Attribute
            {
                Name = "PK",
                Type = AttributeType.STRING
            },
            SortKey = new Attribute
            {
                Name = "SK",
                Type = AttributeType.STRING
            },
            BillingMode = BillingMode.PAY_PER_REQUEST,
            Replication = new[]
            {
                "us-east-1",
                "us-west-2",
                "eu-west-1"
            },
            Stream = StreamViewType.NEW_AND_OLD_IMAGES,
            PointInTimeRecovery = true
        });

        // Customer data table (global)
        var customersTable = new Table(this, "CustomersTable", new TableProps
        {
            TableName = "customers-global",
            PartitionKey = new Attribute
            {
                Name = "CustomerId",
                Type = AttributeType.STRING
            },
            BillingMode = BillingMode.PAY_PER_REQUEST,
            Replication = new[]
            {
                "us-east-1",
                "us-west-2",
                "eu-west-1"
            },
            PointInTimeRecovery = true
        });

        // Export table names
        new CfnOutput(this, "ConfigTableName", new CfnOutputProps
        {
            Value = ConfigTable.TableName,
            ExportName = "Connect-ConfigTable-Global"
        });

        new CfnOutput(this, "CustomersTableName", new CfnOutputProps
        {
            Value = customersTable.TableName,
            ExportName = "Connect-CustomersTable-Global"
        });
    }
}
```

---

### 4. Route 53 Health Checks and Failover

**`src/Stacks/Route53FailoverStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.CloudWatch;

namespace MultiRegionCallCenter.Stacks;

public class Route53FailoverStack : Stack
{
    public Route53FailoverStack(
        Construct scope,
        string id,
        IStackProps props,
        RegionConfig[] regions) : base(scope, id, props)
    {
        // Create hosted zone (or import existing)
        var zone = HostedZone.FromLookup(this, "Zone", new HostedZoneProviderProps
        {
            DomainName = "example.com"
        });

        // Health checks for each region
        var primaryHealthCheck = new CfnHealthCheck(this, "PrimaryHealthCheck", new CfnHealthCheckProps
        {
            HealthCheckConfig = new CfnHealthCheck.HealthCheckConfigProperty
            {
                Type = "HTTPS",
                ResourcePath = "/health",
                FullyQualifiedDomainName = "connect-us-east-1.example.com",
                Port = 443,
                RequestInterval = 30,
                FailureThreshold = 3
            },
            HealthCheckTags = new[]
            {
                new CfnHealthCheck.HealthCheckTagProperty
                {
                    Key = "Name",
                    Value = "Primary-Region-Health"
                }
            }
        });

        var secondaryHealthCheck = new CfnHealthCheck(this, "SecondaryHealthCheck", new CfnHealthCheckProps
        {
            HealthCheckConfig = new CfnHealthCheck.HealthCheckConfigProperty
            {
                Type = "HTTPS",
                ResourcePath = "/health",
                FullyQualifiedDomainName = "connect-us-west-2.example.com",
                Port = 443,
                RequestInterval = 30,
                FailureThreshold = 3
            }
        });

        // DNS failover records
        new ARecord(this, "PrimaryRecord", new ARecordProps
        {
            Zone = zone,
            RecordName = "connect",
            Target = RecordTarget.FromIpAddresses("1.2.3.4"), // Primary region IP
            Ttl = Duration.Seconds(60),
            SetIdentifier = "Primary",
            Failover = FailoverTarget.PRIMARY,
            EvaluateTargetHealth = true
        });

        new ARecord(this, "SecondaryRecord", new ARecordProps
        {
            Zone = zone,
            RecordName = "connect",
            Target = RecordTarget.FromIpAddresses("5.6.7.8"), // Secondary region IP
            Ttl = Duration.Seconds(60),
            SetIdentifier = "Secondary",
            Failover = FailoverTarget.SECONDARY,
            EvaluateTargetHealth = true
        });

        // CloudWatch alarms for health check failures
        new Alarm(this, "PrimaryHealthAlarm", new AlarmProps
        {
            Metric = new Metric(new MetricProps
            {
                Namespace = "AWS/Route53",
                MetricName = "HealthCheckStatus",
                DimensionsMap = new Dictionary<string, string>
                {
                    ["HealthCheckId"] = primaryHealthCheck.AttrHealthCheckId
                },
                Statistic = "Minimum",
                Period = Duration.Minutes(1)
            }),
            Threshold = 1,
            ComparisonOperator = ComparisonOperator.LESS_THAN_THRESHOLD,
            EvaluationPeriods = 2,
            AlarmDescription = "Primary region health check failed",
            ActionsEnabled = true
        });
    }
}
```

---

### 5. Deployment Script

**`scripts/deploy-all-regions.sh`**

```bash
#!/bin/bash

set -e

echo "🌍 Deploying Multi-Region Contact Center..."

# Deploy global resources first
echo "📦 Deploying global resources..."
cdk deploy Connect-Global --require-approval never

# Deploy regional stacks in parallel
echo "🌎 Deploying regional stacks..."
cdk deploy Connect-US-East-1 Connect-US-West-2 Connect-EU-West-1 \
  --concurrency 3 \
  --require-approval never

# Deploy Route 53 failover
echo "🌐 Setting up DNS failover..."
cdk deploy Connect-Route53 --require-approval never

# Verify deployment
echo "✅ Verifying deployment..."
./scripts/verify-replication.sh

echo "🎉 Multi-region deployment complete!"
```

---

### 6. Failover Testing

**`scripts/failover-test.sh`**

```bash
#!/bin/bash

echo "🧪 Testing failover between regions..."

# Get current active region
ACTIVE_REGION=$(dig +short connect.example.com | head -1)
echo "Current active region: $ACTIVE_REGION"

# Simulate primary region failure
echo "⚠️  Simulating primary region failure..."
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-config.json

# Wait for DNS propagation
echo "⏳ Waiting for DNS propagation (60 seconds)..."
sleep 60

# Verify failover
NEW_ACTIVE_REGION=$(dig +short connect.example.com | head -1)
echo "New active region: $NEW_ACTIVE_REGION"

if [ "$ACTIVE_REGION" != "$NEW_ACTIVE_REGION" ]; then
  echo "✅ Failover successful!"
else
  echo "❌ Failover failed!"
  exit 1
fi

# Test Connect instance in new region
echo "📞 Testing Connect instance..."
aws connect describe-instance \
  --instance-id $(aws connect list-instances \
    --region us-west-2 \
    --query 'InstanceSummaryList[0].Id' \
    --output text \
    --region us-west-2)

echo "🎉 Failover test complete!"
```

---

## Data Synchronization

### DynamoDB Global Tables

All configuration data syncs automatically:

```csharp
// Write in US-East-1
await configTable.PutItemAsync(new PutItemRequest
{
    TableName = "connect-config-global",
    Item = new Dictionary<string, AttributeValue>
    {
        ["PK"] = new AttributeValue { S = "CONFIG#SalesFlow" },
        ["SK"] = new AttributeValue { S = "v1" },
        ["WelcomeMessage"] = new AttributeValue { S = "Updated message" },
        ["Timestamp"] = new AttributeValue { N = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString() }
    }
});

// Available in US-West-2 within ~1 second (automatic replication)
```

---

## Monitoring Multi-Region

### CloudWatch Dashboard

```csharp
var dashboard = new Dashboard(this, "MultiRegionDashboard", new DashboardProps
{
    DashboardName = "Connect-MultiRegion"
});

dashboard.AddWidgets(
    // Primary region metrics
    new GraphWidget(new GraphWidgetProps
    {
        Title = "US-East-1 Contact Flow Metrics",
        Left = new[]
        {
            new Metric(new MetricProps
            {
                Namespace = "AWS/Connect",
                MetricName = "ContactFlowDuration",
                DimensionsMap = new Dictionary<string, string>
                {
                    ["InstanceId"] = primaryInstanceId,
                    ["ContactFlowName"] = "SalesInbound"
                }
            })
        }
    }),

    // Secondary region metrics
    new GraphWidget(new GraphWidgetProps
    {
        Title = "US-West-2 Contact Flow Metrics",
        Left = new[]
        {
            new Metric(new MetricProps
            {
                Namespace = "AWS/Connect",
                MetricName = "ContactFlowDuration",
                DimensionsMap = new Dictionary<string, string>
                {
                    ["InstanceId"] = secondaryInstanceId,
                    ["ContactFlowName"] = "SalesInbound"
                }
            })
        }
    }),

    // Replication lag
    new GraphWidget(new GraphWidgetProps
    {
        Title = "DynamoDB Replication Lag",
        Left = new[]
        {
            new Metric(new MetricProps
            {
                Namespace = "AWS/DynamoDB",
                MetricName = "ReplicationLatency",
                DimensionsMap = new Dictionary<string, string>
                {
                    ["TableName"] = "connect-config-global",
                    ["ReceivingRegion"] = "us-west-2"
                }
            })
        }
    })
);
```

---

## Cost Optimization

### Multi-Region Cost Breakdown

| Service | Single Region | Multi-Region (3) | Increase |
|---------|---------------|------------------|----------|
| Amazon Connect | $100/month | $300/month | 3x |
| Lambda | $1/month | $3/month | 3x |
| DynamoDB Global Table | $12.50/month | $37.50/month | 3x |
| Route 53 Health Checks | - | $1/month | New |
| Data Transfer (cross-region) | - | $20/month | New |
| **Total** | **$113.50** | **$361.50** | **3.2x** |

### Cost Savings Tips

1. **Active-Passive instead of Active-Active** - Only pay for standby compute when needed
2. **Regional failover only** - Don't replicate to all regions unless required
3. **Lazy Lambda initialization** - Cold start acceptable for DR scenario
4. **DynamoDB on-demand** - No wasted capacity in standby regions

---

## Disaster Recovery Runbook

### Manual Failover Procedure

```bash
# 1. Verify primary region is down
aws connect describe-instance --instance-id <primary-id> --region us-east-1
# Expected: Timeout or error

# 2. Verify secondary region is healthy
aws connect describe-instance --instance-id <secondary-id> --region us-west-2
# Expected: Success

# 3. Update Route 53 to point to secondary
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-secondary.json

# 4. Verify DNS propagation
dig +short connect.example.com
# Expected: Secondary region IP

# 5. Monitor secondary region
aws cloudwatch get-metric-statistics \
  --namespace AWS/Connect \
  --metric-name ContactFlowDuration \
  --region us-west-2 \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## Best Practices

### ✅ DO

- **Test failover regularly** (monthly)
- **Monitor replication lag** (should be < 1 second)
- **Keep regions in sync** (deploy to all regions simultaneously)
- **Use global DynamoDB tables** for shared config
- **Implement health checks** on critical flows
- **Document region-specific phone numbers**

### ❌ DON'T

- **Assume instant failover** (DNS propagation takes 60s)
- **Deploy to one region only** (defeats purpose)
- **Ignore data residency requirements** (GDPR, etc.)
- **Over-engineer** (3 regions may be overkill)
- **Forget about costs** (3x multiplier)

---

## Related Examples

- [Enterprise (Attribute-Based)](/examples/enterprise-attributes) - Single region setup
- [Enterprise (Fluent)](/examples/enterprise-fluent) - Single region with DI
- [High-Volume Center](/examples/high-volume) - Scalability patterns
