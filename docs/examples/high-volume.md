# High-Volume Contact Center

::: warning ALPHA RELEASE
This example uses Switchboard **v0.1.0-preview.17**. The API may change before the stable 1.0 release.
:::

Build a scalable contact center handling **10,000+ concurrent calls** with optimized performance, auto-scaling, and cost efficiency.

## Overview

This example demonstrates how to build a **high-throughput contact center** that scales to handle:
- ✅ **10,000+ concurrent calls**
- ✅ **1 million calls per month**
- ✅ **500+ agents**
- ✅ **Sub-second Lambda response times**
- ✅ **99.99% uptime SLA**
- ✅ **Cost-optimized at scale**

**Scale:** Enterprise
**Concurrent calls:** 10,000+
**Agents:** 500+
**Architecture:** Auto-scaling, distributed

---

## Architecture

```
                    ┌─────────────────────────┐
                    │   Amazon Connect        │
                    │  (10K concurrent calls) │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼────────┐  ┌────▼──────┐  ┌──────▼───────┐
    │  Lambda           │  │ DynamoDB  │  │ ElastiCache  │
    │  (Provisioned     │  │ (Auto-    │  │ (Redis)      │
    │   Concurrency)    │  │  Scaling) │  │ (Caching)    │
    └──────────┬────────┘  └────┬──────┘  └──────┬───────┘
               │                │                 │
    ┌──────────▼────────────────▼─────────────────▼───────┐
    │              Application Load Balancer               │
    │          (Distributes across availability zones)     │
    └──────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼────────┐  ┌────▼──────┐  ┌──────▼───────┐
    │  Kinesis Data    │  │  S3       │  │ QuickSight   │
    │  Streams         │  │  (Call    │  │ (Real-time   │
    │  (Real-time      │  │  Records) │  │  Analytics)  │
    │   Analytics)     │  │           │  │              │
    └──────────────────┘  └───────────┘  └──────────────┘
```

---

## Project Structure

```
HighVolumeCallCenter/
├── src/
│   ├── Stacks/
│   │   ├── ScalableConnectStack.cs
│   │   ├── ProvisionedLambdaStack.cs
│   │   ├── DynamoDBAutoScalingStack.cs
│   │   ├── ElastiCacheStack.cs
│   │   ├── KinesisAnalyticsStack.cs
│   │   └── MonitoringStack.cs
│   │
│   ├── Lambdas/
│   │   ├── CustomerLookup/              # Optimized for scale
│   │   │   ├── Function.cs
│   │   │   ├── CachingService.cs        # Redis integration
│   │   │   └── BulkOperations.cs
│   │   ├── CallRouting/
│   │   │   ├── Function.cs
│   │   │   └── LoadBalancer.cs          # Distribute across queues
│   │   └── RealTimeMetrics/
│   │       └── Function.cs               # Stream to Kinesis
│   │
│   ├── Services/
│   │   ├── CacheService.cs              # ElastiCache wrapper
│   │   ├── BulkDynamoDBService.cs       # Batch operations
│   │   └── ConnectionPoolManager.cs
│   │
│   └── Configuration/
│       └── ScalingPolicies.cs
│
└── monitoring/
    ├── dashboards/
    │   ├── real-time-dashboard.json
    │   └── capacity-dashboard.json
    └── alarms/
        └── scaling-alarms.json
```

---

## Code Examples

### 1. Provisioned Concurrency for Lambda

**`src/Stacks/ProvisionedLambdaStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;

namespace HighVolumeCallCenter.Stacks;

public class ProvisionedLambdaStack : Stack
{
    public ProvisionedLambdaStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
    {
        // Customer lookup Lambda with provisioned concurrency
        var customerLookupFunction = new Function(this, "CustomerLookup", new FunctionProps
        {
            Runtime = Runtime.DOTNET_8,
            Handler = "CustomerLookup::Handler",
            Code = Code.FromAsset("./artifacts/CustomerLookup"),
            MemorySize = 1024, // Optimized for performance
            Timeout = Duration.Seconds(3),

            // Environment variables
            Environment = new Dictionary<string, string>
            {
                ["CUSTOMERS_TABLE"] = "customers-prod",
                ["REDIS_ENDPOINT"] = "redis.example.com:6379",
                ["ENABLE_CACHING"] = "true",
                ["CACHE_TTL"] = "300"
            },

            // Reserved concurrent executions (prevent throttling)
            ReservedConcurrentExecutions = 500
        });

        // Alias for versioning
        var alias = new Alias(this, "CustomerLookupAlias", new AliasProps
        {
            AliasName = "production",
            Version = customerLookupFunction.CurrentVersion
        });

        // Provisioned concurrency (eliminates cold starts)
        alias.AddAutoScaling(new AutoScalingOptions
        {
            MinCapacity = 100,  // Always warm
            MaxCapacity = 500   // Can scale to 500
        }).ScaleOnUtilization(new UtilizationScalingOptions
        {
            UtilizationTarget = 0.70  // Scale when 70% utilized
        });

        // Routing Lambda with even higher concurrency
        var routingFunction = new Function(this, "CallRouting", new FunctionProps
        {
            Runtime = Runtime.DOTNET_8,
            Handler = "CallRouting::Handler",
            Code = Code.FromAsset("./artifacts/CallRouting"),
            MemorySize = 512,
            Timeout = Duration.Seconds(2),
            ReservedConcurrentExecutions = 1000 // Higher concurrency for critical path
        });

        // Grant Connect permission to invoke
        customerLookupFunction.GrantInvoke(new ServicePrincipal("connect.amazonaws.com"));
        routingFunction.GrantInvoke(new ServicePrincipal("connect.amazonaws.com"));
    }
}
```

---

### 2. DynamoDB Auto-Scaling

**`src/Stacks/DynamoDBAutoScalingStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;

namespace HighVolumeCallCenter.Stacks;

public class DynamoDBAutoScalingStack : Stack
{
    public DynamoDBAutoScalingStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
    {
        // High-volume customers table with auto-scaling
        var customersTable = new Table(this, "CustomersTable", new TableProps
        {
            TableName = "customers-prod",
            PartitionKey = new Attribute
            {
                Name = "CustomerId",
                Type = AttributeType.STRING
            },
            SortKey = new Attribute
            {
                Name = "SK",
                Type = AttributeType.STRING
            },

            // Provisioned capacity with auto-scaling (more cost-effective at scale)
            BillingMode = BillingMode.PROVISIONED,
            ReadCapacity = 1000,   // Base capacity
            WriteCapacity = 500,   // Base capacity

            // Point-in-time recovery
            PointInTimeRecovery = true,

            // Stream for real-time processing
            Stream = StreamViewType.NEW_AND_OLD_IMAGES
        });

        // Auto-scaling for reads (scale 1K - 10K)
        var readScaling = customersTable.AutoScaleReadCapacity(new EnableScalingProps
        {
            MinCapacity = 1000,
            MaxCapacity = 10000
        });

        readScaling.ScaleOnUtilization(new UtilizationScalingProps
        {
            TargetUtilizationPercent = 70  // Scale when 70% utilized
        });

        // Auto-scaling for writes (scale 500 - 5K)
        var writeScaling = customersTable.AutoScaleWriteCapacity(new EnableScalingProps
        {
            MinCapacity = 500,
            MaxCapacity = 5000
        });

        writeScaling.ScaleOnUtilization(new UtilizationScalingProps
        {
            TargetUtilizationPercent = 70
        });

        // Global Secondary Index with auto-scaling
        customersTable.AddGlobalSecondaryIndex(new GlobalSecondaryIndexProps
        {
            IndexName = "PhoneNumberIndex",
            PartitionKey = new Attribute
            {
                Name = "PhoneNumber",
                Type = AttributeType.STRING
            },
            ReadCapacity = 500,
            WriteCapacity = 100
        });

        // Scale GSI separately
        var gsiReadScaling = customersTable.AutoScaleGlobalSecondaryIndexReadCapacity("PhoneNumberIndex", new EnableScalingProps
        {
            MinCapacity = 500,
            MaxCapacity = 5000
        });

        gsiReadScaling.ScaleOnUtilization(new UtilizationScalingProps
        {
            TargetUtilizationPercent = 70
        });
    }
}
```

---

### 3. ElastiCache for Redis (Caching Layer)

**`src/Stacks/ElastiCacheStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.ElastiCache;
using Amazon.CDK.AWS.EC2;

namespace HighVolumeCallCenter.Stacks;

public class ElastiCacheStack : Stack
{
    public ElastiCacheStack(Construct scope, string id, IStackProps props, IVpc vpc) : base(scope, id, props)
    {
        // Security group for Redis
        var redisSecurityGroup = new SecurityGroup(this, "RedisSecurityGroup", new SecurityGroupProps
        {
            Vpc = vpc,
            Description = "Allow Lambda to access Redis",
            AllowAllOutbound = true
        });

        redisSecurityGroup.AddIngressRule(
            Peer.Ipv4(vpc.VpcCidrBlock),
            Port.Tcp(6379),
            "Allow Redis access from VPC"
        );

        // Subnet group for Redis
        var subnetGroup = new CfnSubnetGroup(this, "RedisSubnetGroup", new CfnSubnetGroupProps
        {
            Description = "Subnet group for Redis cluster",
            SubnetIds = vpc.PrivateSubnets.Select(s => s.SubnetId).ToArray(),
            CacheSubnetGroupName = "connect-redis-subnet-group"
        });

        // Redis replication group (cluster mode disabled for simplicity)
        var redisCluster = new CfnReplicationGroup(this, "RedisCluster", new CfnReplicationGroupProps
        {
            ReplicationGroupId = "connect-cache",
            ReplicationGroupDescription = "Customer data cache for Connect",

            // Engine configuration
            Engine = "redis",
            EngineVersion = "7.0",
            CacheNodeType = "cache.r6g.xlarge", // 26 GB memory, optimized for read-heavy

            // Multi-AZ for high availability
            MultiAzEnabled = true,
            AutomaticFailoverEnabled = true,
            NumCacheClusters = 3, // 1 primary + 2 replicas

            // Security
            AtRestEncryptionEnabled = true,
            TransitEncryptionEnabled = true,
            SecurityGroupIds = new[] { redisSecurityGroup.SecurityGroupId },
            CacheSubnetGroupName = subnetGroup.CacheSubnetGroupName,

            // Maintenance
            PreferredMaintenanceWindow = "sun:05:00-sun:06:00",
            SnapshotRetentionLimit = 5,
            SnapshotWindow = "03:00-04:00"
        });

        redisCluster.AddDependency(subnetGroup);

        // Output endpoint
        new CfnOutput(this, "RedisEndpoint", new CfnOutputProps
        {
            Value = redisCluster.AttrPrimaryEndPointAddress,
            ExportName = "Redis-Primary-Endpoint"
        });
    }
}
```

---

### 4. Optimized Lambda with Caching

**`src/Lambdas/CustomerLookup/Function.cs`**

```csharp
using Amazon.Lambda.Core;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using StackExchange.Redis;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace HighVolumeCallCenter.Lambdas.CustomerLookup;

public class Function
{
    private static readonly Lazy<IAmazonDynamoDB> LazyDynamoDB = new(() => new AmazonDynamoDBClient());
    private static readonly Lazy<ConnectionMultiplexer> LazyRedis = new(() =>
        ConnectionMultiplexer.Connect(Environment.GetEnvironmentVariable("REDIS_ENDPOINT") ?? "localhost:6379"));

    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IDatabase _cache;
    private readonly string _tableName;
    private readonly bool _cachingEnabled;
    private readonly int _cacheTTL;

    public Function()
    {
        _dynamoDb = LazyDynamoDB.Value;
        _cache = LazyRedis.Value.GetDatabase();
        _tableName = Environment.GetEnvironmentVariable("CUSTOMERS_TABLE") ?? "customers-prod";
        _cachingEnabled = bool.Parse(Environment.GetEnvironmentVariable("ENABLE_CACHING") ?? "true");
        _cacheTTL = int.Parse(Environment.GetEnvironmentVariable("CACHE_TTL") ?? "300");
    }

    public async Task<CustomerLookupResponse> FunctionHandler(CustomerLookupRequest request, ILambdaContext context)
    {
        var customerId = request.CustomerId;
        context.Logger.LogInformation($"Looking up customer: {customerId}");

        // Try cache first (ElastiCache Redis)
        if (_cachingEnabled)
        {
            var cachedData = await _cache.StringGetAsync($"customer:{customerId}");
            if (cachedData.HasValue)
            {
                context.Logger.LogInformation("Cache hit!");
                return JsonSerializer.Deserialize<CustomerLookupResponse>(cachedData);
            }
        }

        // Cache miss - query DynamoDB
        context.Logger.LogInformation("Cache miss - querying DynamoDB");

        try
        {
            var table = Table.LoadTable(_dynamoDb, _tableName);
            var document = await table.GetItemAsync(customerId);

            if (document == null)
            {
                return new CustomerLookupResponse
                {
                    IsVIP = "false",
                    AccountTier = "Unknown"
                };
            }

            var response = new CustomerLookupResponse
            {
                IsVIP = (document["AccountTier"]?.AsString() == "Platinum").ToString().ToLower(),
                AccountTier = document["AccountTier"]?.AsString() ?? "Standard",
                CustomerName = document["Name"]?.AsString() ?? "Valued Customer",
                LifetimeValue = document["LifetimeValue"]?.AsDecimal() ?? 0
            };

            // Store in cache for future requests
            if (_cachingEnabled)
            {
                await _cache.StringSetAsync(
                    $"customer:{customerId}",
                    JsonSerializer.Serialize(response),
                    TimeSpan.FromSeconds(_cacheTTL)
                );
            }

            return response;
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"Error: {ex.Message}");

            // Graceful degradation
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

### 5. Bulk DynamoDB Operations

**`src/Services/BulkDynamoDBService.cs`**

```csharp
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace HighVolumeCallCenter.Services;

public class BulkDynamoDBService
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly string _tableName;

    public BulkDynamoDBService(IAmazonDynamoDB dynamoDb, string tableName)
    {
        _dynamoDb = dynamoDb;
        _tableName = tableName;
    }

    // Batch get items (up to 100 at once)
    public async Task<List<CustomerData>> BatchGetCustomersAsync(IEnumerable<string> customerIds)
    {
        var results = new List<CustomerData>();
        var batches = customerIds.Chunk(100); // DynamoDB limit: 100 items per batch

        foreach (var batch in batches)
        {
            var request = new BatchGetItemRequest
            {
                RequestItems = new Dictionary<string, KeysAndAttributes>
                {
                    [_tableName] = new KeysAndAttributes
                    {
                        Keys = batch.Select(id => new Dictionary<string, AttributeValue>
                        {
                            ["CustomerId"] = new AttributeValue { S = id }
                        }).ToList()
                    }
                }
            };

            var response = await _dynamoDb.BatchGetItemAsync(request);

            foreach (var item in response.Responses[_tableName])
            {
                results.Add(new CustomerData
                {
                    CustomerId = item["CustomerId"].S,
                    AccountTier = item.ContainsKey("AccountTier") ? item["AccountTier"].S : "Standard",
                    LifetimeValue = item.ContainsKey("LifetimeValue") ? decimal.Parse(item["LifetimeValue"].N) : 0
                });
            }
        }

        return results;
    }

    // Batch write items (up to 25 at once)
    public async Task BatchWriteCustomersAsync(IEnumerable<CustomerData> customers)
    {
        var batches = customers.Chunk(25); // DynamoDB limit: 25 items per batch

        foreach (var batch in batches)
        {
            var request = new BatchWriteItemRequest
            {
                RequestItems = new Dictionary<string, List<WriteRequest>>
                {
                    [_tableName] = batch.Select(customer => new WriteRequest
                    {
                        PutRequest = new PutRequest
                        {
                            Item = new Dictionary<string, AttributeValue>
                            {
                                ["CustomerId"] = new AttributeValue { S = customer.CustomerId },
                                ["AccountTier"] = new AttributeValue { S = customer.AccountTier },
                                ["LifetimeValue"] = new AttributeValue { N = customer.LifetimeValue.ToString() }
                            }
                        }
                    }).ToList()
                }
            };

            await _dynamoDb.BatchWriteItemAsync(request);
        }
    }
}

public record CustomerData
{
    public string CustomerId { get; init; }
    public string AccountTier { get; init; }
    public decimal LifetimeValue { get; init; }
}
```

---

### 6. Real-Time Analytics with Kinesis

**`src/Stacks/KinesisAnalyticsStack.cs`**

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.Kinesis;
using Amazon.CDK.AWS.KinesisFirehose;
using Amazon.CDK.AWS.S3;

namespace HighVolumeCallCenter.Stacks;

public class KinesisAnalyticsStack : Stack
{
    public KinesisAnalyticsStack(Construct scope, string id, IStackProps props) : base(scope, id, props)
    {
        // Kinesis Data Stream for real-time call metrics
        var dataStream = new Stream(this, "CallMetricsStream", new StreamProps
        {
            StreamName = "connect-call-metrics",
            ShardCount = 10, // 10 MB/sec write, 20 MB/sec read per shard
            RetentionPeriod = Duration.Hours(24)
        });

        // S3 bucket for archival
        var metricsBucket = new Bucket(this, "MetricsBucket", new BucketProps
        {
            BucketName = "connect-metrics-archive",
            LifecycleRules = new[]
            {
                new LifecycleRule
                {
                    Id = "ArchiveOldMetrics",
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

        // Firehose delivery stream (stream to S3)
        var deliveryStream = new CfnDeliveryStream(this, "MetricsDeliveryStream", new CfnDeliveryStreamProps
        {
            DeliveryStreamName = "connect-metrics-delivery",
            DeliveryStreamType = "KinesisStreamAsSource",
            KinesisStreamSourceConfiguration = new CfnDeliveryStream.KinesisStreamSourceConfigurationProperty
            {
                KinesisStreamArn = dataStream.StreamArn,
                RoleArn = "arn:aws:iam::123456789012:role/firehose-role"
            },
            S3DestinationConfiguration = new CfnDeliveryStream.S3DestinationConfigurationProperty
            {
                BucketArn = metricsBucket.BucketArn,
                Prefix = "metrics/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
                ErrorOutputPrefix = "errors/",
                BufferingHints = new CfnDeliveryStream.BufferingHintsProperty
                {
                    IntervalInSeconds = 60,
                    SizeInMBs = 5
                },
                CompressionFormat = "GZIP"
            }
        });

        // Lambda to process stream data
        var streamProcessor = new Function(this, "StreamProcessor", new FunctionProps
        {
            Runtime = Runtime.DOTNET_8,
            Handler = "StreamProcessor::Handler",
            Code = Code.FromAsset("./artifacts/StreamProcessor"),
            Timeout = Duration.Seconds(60),
            ReservedConcurrentExecutions = 100
        });

        // Grant permissions
        dataStream.GrantRead(streamProcessor);
        metricsBucket.GrantWrite(streamProcessor);
    }
}
```

---

## Performance Optimization

### Lambda Cold Start Optimization

```csharp
// Use static initialization for reusable clients
private static readonly Lazy<IAmazonDynamoDB> LazyDynamoDB = new(() => new AmazonDynamoDBClient());
private static readonly Lazy<ConnectionMultiplexer> LazyRedis = new(() =>
    ConnectionMultiplexer.Connect(Environment.GetEnvironmentVariable("REDIS_ENDPOINT")));

// Enable SnapStart for .NET (preview)
[assembly: LambdaSnapStart(SnapStartApplyOn.PublishedVersions)]

// Use ARM64 for better price/performance
Runtime = Runtime.DOTNET_8_ARM64
```

### DynamoDB Query Optimization

```csharp
// Use BatchGetItem instead of multiple GetItem calls
var customers = await BatchGetCustomersAsync(customerIds);

// Use Query with pagination instead of Scan
var queryRequest = new QueryRequest
{
    TableName = "customers-prod",
    KeyConditionExpression = "CustomerId = :id",
    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
    {
        [":id"] = new AttributeValue { S = customerId }
    },
    Limit = 100
};
```

---

## Monitoring at Scale

### CloudWatch Dashboard

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Connect", "ConcurrentCalls", { "stat": "Maximum" }],
          [".", "CallsPerInterval", { "stat": "Sum" }],
          ["AWS/Lambda", "ConcurrentExecutions", { "stat": "Maximum" }],
          [".", "Duration", { "stat": "Average" }],
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { "stat": "Sum" }],
          [".", "ConsumedWriteCapacityUnits", { "stat": "Sum" }]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "High-Volume Metrics"
      }
    }
  ]
}
```

---

## Cost at Scale

### Monthly Cost Breakdown (1M calls/month)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **Amazon Connect** | 1M calls @ $0.018/min (avg 5 min) | $90,000 |
| **Lambda** | 5M invocations, 3 sec avg | $150 |
| **DynamoDB** | 10K provisioned RCU/WCU | $3,650 |
| **ElastiCache** | 3x r6g.xlarge | $730 |
| **Kinesis** | 10 shards | $150 |
| **S3** | 100 TB storage | $2,300 |
| **Data Transfer** | 50 TB outbound | $4,500 |
| **Total** | | **~$101,480/month** |

### Cost Optimization Tips

1. **Reserved Capacity** - 30% savings on ElastiCache
2. **Savings Plans** - 20% savings on Lambda
3. **S3 Intelligent-Tiering** - Automatic cost optimization
4. **DynamoDB Reserved Capacity** - 50% savings on provisioned capacity
5. **Compress call recordings** - 70% reduction in S3 costs

---

## Load Testing

```bash
# Simulate 10,000 concurrent calls
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123:stateMachine:LoadTest \
  --input '{
    "concurrentCalls": 10000,
    "duration": 3600,
    "rampUpTime": 300
  }'

# Monitor performance
watch -n 1 'aws cloudwatch get-metric-statistics \
  --namespace AWS/Connect \
  --metric-name ConcurrentCalls \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum'
```

---

## Best Practices

### ✅ DO

- **Use provisioned concurrency** for Lambda (eliminate cold starts)
- **Enable caching** with ElastiCache (10x faster lookups)
- **Batch DynamoDB operations** (reduce costs, increase throughput)
- **Monitor auto-scaling metrics** (ensure capacity ahead of demand)
- **Implement circuit breakers** (graceful degradation)
- **Use ARM64 for Lambda** (20% better price/performance)

### ❌ DON'T

- **Use on-demand DynamoDB at scale** (provisioned is cheaper)
- **Ignore cold starts** (affects customer experience)
- **Query DynamoDB without indexes** (slow and expensive)
- **Skip load testing** (find bottlenecks before production)
- **Over-provision** (auto-scaling handles peaks)

---

## Related Examples

- [Enterprise (Attribute-Based)](/examples/enterprise-attributes) - Standard enterprise setup
- [Enterprise (Fluent)](/examples/enterprise-fluent) - Fluent builder approach
- [Multi-Region](/examples/multi-region) - Geographic redundancy
