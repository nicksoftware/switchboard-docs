# Dynamic Attribute Resolution

Dynamic attribute resolution allows you to build flows that adapt their behavior at runtime based on data from Lambda functions, external systems, or contact attributes. This enables personalized customer experiences, intelligent routing, and multi-tenant architectures.

## Overview

Instead of hardcoding prompts, queue names, or flow destinations, you can use **JSONPath expressions** to resolve these values dynamically from contact attributes. This is particularly powerful when combined with Lambda integrations that set attributes based on business logic.

## Key Benefits

- **Personalization**: Greet customers by name, reference their account details
- **Intelligent Routing**: Route to queues based on customer tier, issue type, or business rules
- **Multi-Tenant Systems**: Support multiple brands/clients from a single Connect instance
- **A/B Testing**: Dynamically select flow variations for experimentation
- **External Control**: Let external systems (CRM, databases) control flow behavior

## Dynamic Methods

### PlayPromptDynamic()

Play a prompt with text resolved from a contact attribute at runtime.

**Fluent API:**
```csharp
.PlayPromptDynamic("$.Attributes.WelcomeMessage")
```

**Attribute-Based:**
```csharp
[PlayPromptDynamic("$.External.CustomerGreeting", Voice = "Matthew", UseNeuralVoice = true)]
public partial void WelcomeCustomer();
```

**Use Cases:**
- Personalized greetings ("Welcome back, John!")
- Localized messages based on customer language preference
- Dynamic announcements from external systems
- A/B testing different prompt variations

**Example:**
```csharp
var flow = new FlowBuilder()
    .SetName("PersonalizedGreeting")

    // Lambda sets $.External.CustomerGreeting attribute
    .InvokeLambda("CustomerLookup", lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:CustomerLookup";
        lambda.InputParameters["PhoneNumber"] = "$.CustomerEndpoint.Address";
    })
    .OnSuccess(success => success
        // Play personalized greeting from Lambda
        .PlayPromptDynamic("$.External.CustomerGreeting")
        .TransferToQueue("Support")
        .Disconnect())
    .Build();
```

**Lambda Response Example:**
```json
{
  "statusCode": 200,
  "body": {
    "attributes": {
      "CustomerGreeting": "Welcome back, Sarah! Thank you for being a Gold member since 2020."
    }
  }
}
```

### TransferToQueueDynamic()

Transfer the contact to a queue determined by a contact attribute.

**Fluent API:**
```csharp
.TransferToQueueDynamic("$.External.TargetQueue")
```

**Attribute-Based:**
```csharp
[TransferToQueueDynamic("$.External.OptimalQueue")]
public partial void TransferToSelectedQueue();
```

**Use Cases:**
- Route VIP customers to priority queues
- Skills-based routing based on issue classification
- Time-zone aware routing
- Load balancing across regional queues

**Example:**
```csharp
var flow = new FlowBuilder()
    .SetName("IntelligentRouting")

    // Lambda determines best queue based on customer data
    .InvokeLambda("RoutingEngine", lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:RoutingEngine";
        lambda.InputParameters["CustomerId"] = "$.Attributes.CustomerId";
        lambda.InputParameters["IssueType"] = "$.Attributes.IssueCategory";
    })
    .OnSuccess(success => success
        .PlayPrompt("Connecting you to the best available team...")
        // Route to queue determined by Lambda
        .TransferToQueueDynamic("$.External.OptimalQueue")
        .Disconnect())
    .Build();
```

**Lambda Response Example:**
```json
{
  "statusCode": 200,
  "body": {
    "attributes": {
      "OptimalQueue": "arn:aws:connect:us-east-1:123456789012:instance/abc123/queue/vip-technical-support",
      "EstimatedWaitTime": "2 minutes",
      "QueueName": "VIP Technical Support"
    }
  }
}
```

### TransferToFlowDynamic()

Transfer the contact to a flow determined by a contact attribute.

**Fluent API:**
```csharp
.TransferToFlowDynamic("$.External.NextFlow")
```

**Attribute-Based:**
```csharp
[TransferToFlowDynamic("$.External.TenantMainFlow")]
public partial void TransferToTenantFlow();
```

**Use Cases:**
- Multi-tenant routing (different flows per tenant)
- Dynamic sub-flow selection based on customer journey stage
- Feature flags for flow variations
- Regional or language-specific flows

**Example:**
```csharp
var flow = new FlowBuilder()
    .SetName("MultiTenantRouter")

    // Identify tenant and get their custom flow
    .InvokeLambda("TenantLookup", lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:TenantLookup";
        lambda.InputParameters["CallerNumber"] = "$.CustomerEndpoint.Address";
    })
    .OnSuccess(success => success
        // Play tenant-branded greeting
        .PlayPromptDynamic("$.External.TenantGreeting")

        // Transfer to tenant-specific flow
        .TransferToFlowDynamic("$.External.TenantFlow"))
    .Build();
```

**Lambda Response Example:**
```json
{
  "statusCode": 200,
  "body": {
    "attributes": {
      "TenantId": "acme-corp",
      "TenantGreeting": "Thank you for calling Acme Corporation. Your call is important to us.",
      "TenantFlow": "arn:aws:connect:us-east-1:123456789012:instance/abc123/contact-flow/acme-main-ivr"
    }
  }
}
```

## JSONPath Expressions

All dynamic methods accept JSONPath expressions to reference contact attributes.

### Common Attribute Locations

| Path | Description | Set By |
|------|-------------|--------|
| `$.Attributes.*` | User-defined attributes | SetContactAttributes, Lambda, API |
| `$.External.*` | Lambda function outputs | Lambda invocations |
| `$.Customer.*` | Customer profile data | Amazon Connect Customer Profiles |
| `$.Queue.*` | Current queue information | Amazon Connect (automatic) |
| `$.SystemEndpoint.*` | System contact info | Amazon Connect (automatic) |
| `$.CustomerEndpoint.*` | Customer contact info | Amazon Connect (automatic) |

### Examples

```csharp
// Simple attribute reference
.PlayPromptDynamic("$.Attributes.Message")

// Lambda output
.TransferToQueueDynamic("$.External.TargetQueue")

// Nested attribute
.PlayPromptDynamic("$.Customer.Profile.PreferredGreeting")

// Complex path
.TransferToFlowDynamic("$.Attributes.Routing.NextFlowArn")
```

## Complete Example: Intelligent Customer Routing

This example demonstrates a complete flow using all three dynamic methods:

```csharp
public class IntelligentRoutingFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("IntelligentCustomerRouting")
            .SetDescription("Routes customers based on profile, history, and preferences")
            .SetType(FlowType.ContactFlow)

            // Step 1: Welcome message
            .PlayPrompt(prompt =>
            {
                prompt.Text = "Welcome to our support center. " +
                             "Let me look up your account information.";
                prompt.Voice = "Matthew";
                prompt.UseNeuralVoice = true;
            })

            // Step 2: Look up customer data and determine routing
            .InvokeLambda("CustomerIntelligence", lambda =>
            {
                lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:CustomerIntelligence";
                lambda.TimeoutSeconds = 8;

                // Send context to Lambda
                lambda.InputParameters["PhoneNumber"] = "$.CustomerEndpoint.Address";
                lambda.InputParameters["ContactId"] = "$.ContactId";
                lambda.InputParameters["Channel"] = "$.Channel";
            })

            // Step 3: Success - personalized experience
            .OnSuccess(success => success
                // Personalized greeting based on customer data
                .PlayPromptDynamic("$.External.PersonalizedGreeting")

                // Optional: Transfer to specialized flow for VIP customers
                // Lambda can return a VIP flow ARN or null
                .Branch(branch =>
                {
                    branch
                        .WhenAttributeEquals("$.External.RequiresVIPFlow", "true")
                        .Then(vip => vip
                            .TransferToFlowDynamic("$.External.VIPFlowArn"))
                        .Otherwise(standard => standard
                            .TransferToQueueDynamic("$.External.OptimalQueue")
                            .Disconnect());
                }))

            // Step 4: Error handling
            .OnError(error => error
                .PlayPrompt("We're experiencing technical difficulties. " +
                           "Let me connect you to our support team.")
                .TransferToQueue("GeneralSupport")
                .Disconnect())

            // Step 5: Timeout handling
            .OnTimeout(timeout => timeout
                .PlayPrompt("The lookup is taking longer than expected. " +
                           "Connecting you to an available representative.")
                .TransferToQueue("GeneralSupport")
                .Disconnect())

            .Build();
    }
}
```

**Lambda Function Response:**

```json
{
  "statusCode": 200,
  "body": {
    "attributes": {
      "PersonalizedGreeting": "Welcome back, Sarah! You've been a valued Gold member since January 2020. We're here to help.",
      "OptimalQueue": "arn:aws:connect:us-east-1:123456789012:instance/abc123/queue/gold-member-support",
      "RequiresVIPFlow": "false",
      "CustomerTier": "Gold",
      "AccountStatus": "Active",
      "PreferredLanguage": "en-US",
      "LastContactDate": "2025-10-15",
      "EstimatedWaitTime": "3 minutes"
    }
  }
}
```

## Multi-Tenant Architecture Pattern

Dynamic attributes are essential for multi-tenant systems where multiple brands share a Connect instance:

```csharp
public class MultiTenantRouterFlowBuilder
{
    public IFlow Build()
    {
        return new FlowBuilder()
            .SetName("MultiTenantRouter")

            // Identify tenant from phone number or queue
            .InvokeLambda("TenantIdentification", lambda =>
            {
                lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:TenantIdentification";
                lambda.InputParameters["CallerNumber"] = "$.CustomerEndpoint.Address";
                lambda.InputParameters["QueueArn"] = "$.Queue.Arn";
            })

            .OnSuccess(success => success
                // Store tenant context
                .SetContactAttributes(attrs =>
                {
                    attrs["TenantId"] = "$.External.TenantId";
                    attrs["TenantName"] = "$.External.TenantName";
                })

                // Play tenant-branded greeting
                .PlayPromptDynamic("$.External.TenantGreeting")

                // Transfer to tenant-specific IVR flow
                .TransferToFlowDynamic("$.External.TenantMainFlow"))

            .OnError(error => error
                // Fallback to default flow
                .PlayPrompt("Welcome. Please hold for the next available representative.")
                .TransferToQueue("DefaultQueue")
                .Disconnect())

            .Build();
    }
}
```

## Best Practices

### 1. Always Provide Fallbacks

```csharp
.InvokeLambda("CustomerLookup")
    .OnSuccess(success => success
        .PlayPromptDynamic("$.External.Greeting")
        .TransferToQueueDynamic("$.External.Queue")
        .Disconnect())
    .OnError(error => error
        // Fallback to static values
        .PlayPrompt("Welcome to our support center.")
        .TransferToQueue("GeneralSupport")
        .Disconnect())
```

### 2. Validate Attribute Paths

Ensure Lambda functions always set the expected attributes:

```typescript
// Lambda function
export const handler = async (event) => {
    const attributes = {
        // Always set required attributes with sensible defaults
        CustomerGreeting: customerData?.greeting || "Welcome to our support center.",
        OptimalQueue: determineQueue(customerData) || DEFAULT_QUEUE_ARN,
        // Add metadata for debugging
        LookupSuccessful: "true",
        LookupTimestamp: new Date().toISOString()
    };

    return {
        statusCode: 200,
        body: { attributes }
    };
};
```

### 3. Use Descriptive Attribute Names

```csharp
// Good - clear and specific
.PlayPromptDynamic("$.External.VIPCustomerPersonalizedGreeting")
.TransferToQueueDynamic("$.External.SkillBasedRoutingQueueArn")

// Avoid - ambiguous
.PlayPromptDynamic("$.External.Text")
.TransferToQueueDynamic("$.External.Queue")
```

### 4. Document Expected Lambda Responses

Always document what attributes your Lambda functions should return:

```csharp
/// <summary>
/// Expected Lambda response attributes:
/// - $.External.CustomerGreeting (string): Personalized greeting text
/// - $.External.TargetQueue (string): Queue ARN for routing
/// - $.External.CustomerTier (string): Customer tier (Bronze/Silver/Gold/VIP)
/// - $.External.EstimatedWait (string): Estimated wait time message
/// </summary>
.InvokeLambda("CustomerRoutingEngine")
```

### 5. Test with Missing Attributes

Ensure flows handle missing or malformed attributes gracefully:

```csharp
// Use conditional branching for optional dynamic flows
.Branch(branch =>
{
    branch
        .WhenAttributeExists("$.External.VIPFlowArn")
        .Then(hasVip => hasVip.TransferToFlowDynamic("$.External.VIPFlowArn"))
        .Otherwise(standard => standard.TransferToQueue("StandardSupport"));
})
```

## Error Handling

Dynamic attributes should always be wrapped in error handling:

```csharp
.InvokeLambda("AttributeProvider")
    .OnSuccess(success =>
    {
        // Verify critical attributes exist before using them
        success.Branch(branch =>
        {
            branch
                .WhenAttributeExists("$.External.RequiredAttribute")
                .Then(valid => valid
                    .PlayPromptDynamic("$.External.Message")
                    .TransferToQueueDynamic("$.External.Queue")
                    .Disconnect())
                .Otherwise(invalid => invalid
                    .PlayPrompt("We encountered an error. Connecting to support.")
                    .TransferToQueue("FallbackQueue")
                    .Disconnect());
        });
    })
    .OnError(error => error
        .PlayPrompt("System error. Connecting to support.")
        .TransferToQueue("FallbackQueue")
        .Disconnect())
```

## Testing Dynamic Flows

### Local Testing

Test Lambda functions locally to verify they return correct attributes:

```csharp
[Test]
public void LambdaFunction_ReturnsExpectedAttributes()
{
    var lambdaResponse = InvokeTestLambda(new
    {
        PhoneNumber = "+12025551234",
        CustomerId = "CUST-12345"
    });

    lambdaResponse.Attributes.Should().ContainKey("CustomerGreeting");
    lambdaResponse.Attributes.Should().ContainKey("OptimalQueue");
    lambdaResponse.Attributes["OptimalQueue"].Should().StartWith("arn:aws:connect:");
}
```

### Integration Testing

Use Amazon Connect's flow testing tools to verify attribute resolution:

1. Set test attributes manually in the Connect console
2. Execute the flow with test values
3. Verify prompts and routing work correctly
4. Check CloudWatch Logs for attribute values

## Performance Considerations

- **Lambda Cold Starts**: First invocation may be slower (500ms-2s)
- **Caching**: Consider caching frequently accessed data in Lambda
- **Timeouts**: Set realistic Lambda timeouts (5-10 seconds typical)
- **Fallbacks**: Always provide quick fallback paths for Lambda failures

## Related Documentation

- [Lambda Integration](/guide/flows/lambda-integration)
- [Fluent API Reference](/api/fluent-builders)
- [Error Handling](/guide/flows/error-handling)
- [Multi-Tenant Example](/examples/multi-tenant)
- [Dynamic Configuration](/guide/dynamic-configuration)

## Next Steps

- Explore the [Multi-Tenant Example](/examples/flows/multi-tenant)
- Learn about [Lambda Integration Patterns](/guide/flows/lambda-integration)
- Review [Complete Flow Examples](/examples/flows/)
