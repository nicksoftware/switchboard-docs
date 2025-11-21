# Multi-Tenant Contact Flow

This example demonstrates how to build a multi-tenant contact center where multiple brands or clients share a single Amazon Connect instance, with each tenant receiving a fully customized experience.

## Overview

Multi-tenant architectures allow you to:
- Support multiple brands from one Connect instance
- Provide tenant-specific greetings, prompts, and routing
- Maintain separate queues and flows per tenant
- Centralize reporting while maintaining tenant isolation
- Reduce infrastructure costs and operational complexity

## Architecture

```
Incoming Call
    ↓
Main Router Flow (this example)
    ↓
Lambda: Identify Tenant
    ↓
┌──────────────────────────────┐
│ Dynamic Routing Based on:    │
│ - Phone Number               │
│ - Queue ARN                  │
│ - External Lookup (Database) │
└──────────────────────────────┘
    ↓
Tenant-Specific Flow
    ↓
Tenant-Specific Queue
```

## Complete Implementation

```csharp
using Switchboard.Builders;
using Switchboard.Models;
using Switchboard.Enums;

namespace Examples.Flows;

public class MultiTenantRouterFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("MultiTenantRouter")
            .SetDescription("Routes calls to tenant-specific flows and queues")
            .SetType(FlowType.ContactFlow)

            // Step 1: Invoke Lambda to identify tenant
            .InvokeLambda("TenantIdentification", lambda =>
            {
                lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:TenantIdentification";
                lambda.TimeoutSeconds = 5;

                // Pass context for tenant identification
                lambda.InputParameters["CallerNumber"] = "$.CustomerEndpoint.Address";
                lambda.InputParameters["QueueArn"] = "$.Queue.Arn";
                lambda.InputParameters["Channel"] = "$.Channel";
            })

            // Step 2: Success - route to tenant-specific resources
            .OnSuccess(success => success
                // Store tenant context in contact attributes
                .SetContactAttributes(attrs =>
                {
                    attrs["TenantId"] = "$.External.TenantId";
                    attrs["TenantName"] = "$.External.TenantName";
                    attrs["TenantRegion"] = "$.External.TenantRegion";
                })

                // Play tenant-branded greeting
                // Example: "Thank you for calling Acme Corporation..."
                .PlayPromptDynamic("$.External.TenantGreeting")

                // Transfer to tenant's main IVR flow
                .TransferToFlowDynamic("$.External.TenantMainFlow"))

            // Step 3: Error - route to default queue
            .OnError(error => error
                .PlayPrompt(prompt =>
                {
                    prompt.Text = "Welcome. We're having trouble routing your call. " +
                                 "Please hold for the next available representative.";
                    prompt.Voice = "Joanna";
                    prompt.UseNeuralVoice = true;
                })
                .TransferToQueue("DefaultSupportQueue")
                .Disconnect())

            // Step 4: Timeout - route to default queue
            .OnTimeout(timeout => timeout
                .PlayPrompt(prompt =>
                {
                    prompt.Text = "Please hold while we route your call.";
                    prompt.Voice = "Joanna";
                    prompt.UseNeuralVoice = true;
                })
                .TransferToQueue("DefaultSupportQueue")
                .Disconnect())

            .Build();
    }
}
```

## Lambda Function Implementation

The Lambda function identifies the tenant and returns their configuration:

```typescript
// TenantIdentification Lambda Function
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamodb = DynamoDBDocument.from(new DynamoDB({}));

interface TenantConfig {
    tenantId: string;
    tenantName: string;
    greeting: string;
    mainFlowArn: string;
    supportQueueArn: string;
    region: string;
    businessHoursId: string;
}

export const handler = async (event: any) => {
    const callerNumber = event.Details.ContactData.CustomerEndpoint.Address;
    const queueArn = event.Details.ContactData.Queue?.Arn;

    try {
        // Look up tenant by phone number or queue
        const tenant = await identifyTenant(callerNumber, queueArn);

        if (!tenant) {
            return {
                statusCode: 404,
                body: {
                    error: "Tenant not found",
                    defaultRouting: true
                }
            };
        }

        // Return tenant-specific configuration
        return {
            statusCode: 200,
            body: {
                attributes: {
                    TenantId: tenant.tenantId,
                    TenantName: tenant.tenantName,
                    TenantGreeting: tenant.greeting,
                    TenantMainFlow: tenant.mainFlowArn,
                    TenantQueue: tenant.supportQueueArn,
                    TenantRegion: tenant.region,
                    BusinessHoursId: tenant.businessHoursId
                }
            }
        };
    } catch (error) {
        console.error('Error identifying tenant:', error);
        return {
            statusCode: 500,
            body: {
                error: "Internal error",
                defaultRouting: true
            }
        };
    }
};

async function identifyTenant(
    phoneNumber: string,
    queueArn?: string
): Promise<TenantConfig | null> {
    // Strategy 1: Look up by phone number
    const phoneResult = await dynamodb.query({
        TableName: 'TenantPhoneNumbers',
        IndexName: 'PhoneNumberIndex',
        KeyConditionExpression: 'phoneNumber = :phone',
        ExpressionAttributeValues: {
            ':phone': phoneNumber
        }
    });

    if (phoneResult.Items && phoneResult.Items.length > 0) {
        const tenantId = phoneResult.Items[0].tenantId;
        return await getTenantConfig(tenantId);
    }

    // Strategy 2: Look up by queue ARN
    if (queueArn) {
        const queueResult = await dynamodb.query({
            TableName: 'TenantQueues',
            IndexName: 'QueueArnIndex',
            KeyConditionExpression: 'queueArn = :arn',
            ExpressionAttributeValues: {
                ':arn': queueArn
            }
        });

        if (queueResult.Items && queueResult.Items.length > 0) {
            const tenantId = queueResult.Items[0].tenantId;
            return await getTenantConfig(tenantId);
        }
    }

    return null;
}

async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const result = await dynamodb.get({
        TableName: 'TenantConfigurations',
        Key: { tenantId }
    });

    return result.Item as TenantConfig;
}
```

## DynamoDB Schema

### TenantConfigurations Table

```typescript
{
    tenantId: "acme-corp",           // Partition Key
    tenantName: "Acme Corporation",
    greeting: "Thank you for calling Acme Corporation. Your call is important to us.",
    mainFlowArn: "arn:aws:connect:us-east-1:123456789012:instance/abc123/contact-flow/acme-main-ivr",
    supportQueueArn: "arn:aws:connect:us-east-1:123456789012:instance/abc123/queue/acme-support",
    region: "us-east-1",
    businessHoursId: "hours-acme-123",
    enabled: true,
    createdAt: "2025-01-15T10:00:00Z"
}
```

### TenantPhoneNumbers Table

```typescript
{
    phoneNumber: "+18005551234",     // Partition Key
    tenantId: "acme-corp",           // Tenant reference
    purpose: "main-line",            // Line purpose
    createdAt: "2025-01-15T10:00:00Z"
}
```

### TenantQueues Table

```typescript
{
    queueArn: "arn:aws:connect:...", // Partition Key
    tenantId: "acme-corp",           // Tenant reference
    queueName: "Acme Support",
    skillsRequired: ["technical"],
    createdAt: "2025-01-15T10:00:00Z"
}
```

## Tenant-Specific Sub-Flow Example

Each tenant can have their own customized IVR flow:

```csharp
// Acme Corporation's Main IVR
public class AcmeMainIVRFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("AcmeMainIVR")
            .SetDescription("Acme Corporation main IVR menu")
            .SetType(FlowType.ContactFlow)

            .PlayPrompt(prompt =>
            {
                prompt.Text = "For sales, press 1. For technical support, press 2. " +
                             "For billing, press 3. For all other inquiries, press 0.";
                prompt.Voice = "Matthew";
                prompt.UseNeuralVoice = true;
            })

            .GetCustomerInput("Please make your selection")
                .OnDigits("1", sales => sales
                    .TransferToQueue("AcmeSales")
                    .Disconnect())
                .OnDigits("2", support => support
                    .TransferToQueue("AcmeTechnicalSupport")
                    .Disconnect())
                .OnDigits("3", billing => billing
                    .TransferToQueue("AcmeBilling")
                    .Disconnect())
                .OnDigits("0", other => other
                    .TransferToQueue("AcmeGeneralSupport")
                    .Disconnect())
                .OnTimeout(timeout => timeout
                    .PlayPrompt("I didn't receive your selection. Transferring to an agent.")
                    .TransferToQueue("AcmeGeneralSupport")
                    .Disconnect())

            .Build();
    }
}
```

## CDK Stack for Multi-Tenant Setup

```csharp
using Amazon.CDK;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.DynamoDB;
using Switchboard.Core;

public class MultiTenantStack : Stack
{
    public MultiTenantStack(Construct scope, string id) : base(scope, id)
    {
        // DynamoDB tables for tenant configuration
        var tenantConfigTable = new Table(this, "TenantConfigurations", new TableProps
        {
            PartitionKey = new Attribute { Name = "tenantId", Type = AttributeType.STRING },
            BillingMode = BillingMode.PAY_PER_REQUEST
        });

        var tenantPhonesTable = new Table(this, "TenantPhoneNumbers", new TableProps
        {
            PartitionKey = new Attribute { Name = "phoneNumber", Type = AttributeType.STRING },
            BillingMode = BillingMode.PAY_PER_REQUEST
        });

        tenantPhonesTable.AddGlobalSecondaryIndex(new GlobalSecondaryIndexProps
        {
            IndexName = "TenantIdIndex",
            PartitionKey = new Attribute { Name = "tenantId", Type = AttributeType.STRING }
        });

        // Lambda function for tenant identification
        var tenantLookup = new Function(this, "TenantIdentification", new FunctionProps
        {
            Runtime = Runtime.NODEJS_18_X,
            Handler = "index.handler",
            Code = Code.FromAsset("lambda/tenant-lookup"),
            Environment = new Dictionary<string, string>
            {
                ["TENANT_CONFIG_TABLE"] = tenantConfigTable.TableName,
                ["TENANT_PHONES_TABLE"] = tenantPhonesTable.TableName
            }
        });

        // Grant Lambda permissions
        tenantConfigTable.GrantReadData(tenantLookup);
        tenantPhonesTable.GrantReadData(tenantLookup);

        // Create main router flow
        var app = new SwitchboardApp(this, "MultiTenantRouter");
        app.AddFlowBuilder<MultiTenantRouterFlowBuilder>();

        // Add tenant-specific flows
        app.AddFlowBuilder<AcmeMainIVRFlowBuilder>();
        app.AddFlowBuilder<GlobalServicesMainIVRFlowBuilder>();

        // Outputs
        new CfnOutput(this, "TenantConfigTableName", new CfnOutputProps
        {
            Value = tenantConfigTable.TableName
        });

        new CfnOutput(this, "TenantLookupArn", new CfnOutputProps
        {
            Value = tenantLookup.FunctionArn
        });
    }
}
```

## Adding a New Tenant

To onboard a new tenant, add a record to DynamoDB:

```bash
aws dynamodb put-item \
    --table-name TenantConfigurations \
    --item '{
        "tenantId": {"S": "global-services"},
        "tenantName": {"S": "Global Services Inc"},
        "greeting": {"S": "Welcome to Global Services. Para español, presione nueve."},
        "mainFlowArn": {"S": "arn:aws:connect:us-east-1:123456789012:instance/abc123/contact-flow/global-main"},
        "supportQueueArn": {"S": "arn:aws:connect:us-east-1:123456789012:instance/abc123/queue/global-support"},
        "region": {"S": "us-west-2"},
        "enabled": {"BOOL": true}
    }'
```

## Benefits

1. **Cost Efficiency**: Single Connect instance for multiple tenants
2. **Centralized Management**: One deployment, multiple brands
3. **Tenant Isolation**: Each tenant has separate flows and queues
4. **Easy Onboarding**: Add new tenants via database configuration
5. **Unified Reporting**: Centralized metrics with tenant filtering

## Testing

Test the multi-tenant flow with different phone numbers:

```csharp
[Test]
public void MultiTenantFlow_RoutesToCorrectTenant()
{
    // Simulate call from Acme's phone number
    var acmeCall = SimulateCall("+18005551234");

    acmeCall.Attributes.Should().ContainKey("TenantId");
    acmeCall.Attributes["TenantId"].Should().Be("acme-corp");
    acmeCall.Greeting.Should().Contain("Acme Corporation");
    acmeCall.Flow.Should().Be("AcmeMainIVR");
}

[Test]
public void MultiTenantFlow_FallsBackOnUnknownNumber()
{
    // Simulate call from unknown number
    var unknownCall = SimulateCall("+15555555555");

    unknownCall.Queue.Should().Be("DefaultSupportQueue");
}
```

## Related Examples

- [Dynamic Attribute Resolution](/guide/flows/dynamic-attributes)
- [Lambda Integration](/guide/flows/lambda-integration)
- [Error Handling Patterns](/guide/flows/error-handling)

## Next Steps

- Implement tenant-specific business hours
- Add tenant-specific analytics dashboards
- Configure tenant-specific recording policies
- Set up tenant-specific routing strategies
