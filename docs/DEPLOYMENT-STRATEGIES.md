# Flow Deployment Strategies

The Switchboard framework supports two deployment strategies for Amazon Connect contact flows: **CloudFormation** (default) and **CustomResource** (SDK-based).

## Overview

| Strategy | Deployment Method | Change Tracking | Use Cases |
|----------|-------------------|-----------------|-----------|
| **CloudFormation** | AWS CloudFormation native resource | Automatic | ✅ **Recommended** for most use cases |
| **CustomResource** | AWS SDK via Lambda Custom Resource | Content hash-based | Use when you need SAVED status or bypass validation |

## CloudFormation Strategy (Default)

### Description
Deploys flows using AWS CloudFormation's native `AWS::Connect::ContactFlow` resource.

### Advantages
- ✅ **Automatic change tracking** - CloudFormation detects all property changes
- ✅ **Built-in validation** - AWS validates flow structure during deployment
- ✅ **Standard CloudFormation benefits** - Rollback, drift detection, stack updates
- ✅ **No custom resources** - Simpler infrastructure, fewer moving parts
- ✅ **Better debugging** - CloudFormation error messages show validation issues

### Limitations
- ❌ **Only supports ACTIVE/ARCHIVED status** - Cannot deploy flows with SAVED status
- ❌ **Strict validation** - Flow must pass AWS validation (may reject some valid flows)

### Usage

```csharp
// Default - no explicit configuration needed
var flow = new FlowBuilder()
    .SetName("My Contact Flow")
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();

// Explicit (optional)
var flow = new FlowBuilder()
    .SetName("My Contact Flow")
    .SetDeploymentStrategy(FlowDeploymentStrategy.CloudFormation)
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();
```

## CustomResource Strategy (SDK-based)

### Description
Deploys flows using AWS SDK via a Lambda-backed Custom Resource. The framework automatically provisions a Lambda function that calls `CreateContactFlow` or `UpdateContactFlowContent` APIs.

### Advantages
- ✅ **Supports SAVED status** - Deploy flows without publishing them
- ✅ **Bypasses CloudFormation validation** - Useful for complex flows that may fail validation
- ✅ **Content hash tracking** - Detects changes to flow content and triggers updates
- ✅ **More control** - Direct SDK access allows for advanced scenarios

### Limitations
- ❌ **Additional infrastructure** - Requires Lambda function and custom resource provider
- ❌ **Manual change tracking** - Uses content hash (updates when flow JSON changes)
- ❌ **Less visibility** - CloudFormation only sees the custom resource, not flow details

### Usage

```csharp
var flow = new FlowBuilder()
    .SetName("My Contact Flow")
    .SetDeploymentStrategy(FlowDeploymentStrategy.CustomResource)
    .SetStatus("SAVED") // CustomResource allows SAVED status
    .PlayPrompt("Welcome")
    .Disconnect()
    .Build();
```

## How Change Tracking Works

### CloudFormation Strategy
CloudFormation automatically tracks changes to all properties:
- Flow name changes → triggers `UpdateContactFlow`
- Flow content changes → triggers `UpdateContactFlowContent`
- Description/tags changes → triggers `UpdateContactFlow`
- Status changes → triggers state transition

### CustomResource Strategy
Custom Resource tracks changes using a **content hash**:
- When flow content (JSON) changes, the hash changes
- CloudFormation sees the hash property changed → triggers Lambda execution
- Lambda function calls AWS SDK to update the flow

**Important**: The content hash is calculated from the flow JSON, so:
- ✅ Flow content changes → Detected and deployed
- ✅ Name/description changes → Detected (included in CloudFormation properties)
- ❌ Manual changes in AWS Console → NOT detected (no hash recalculation)

## Choosing a Strategy

### Use CloudFormation (Default) When:
- ✅ You want standard CloudFormation behavior
- ✅ Your flows pass AWS validation
- ✅ You don't need SAVED status
- ✅ You want the simplest infrastructure
- ✅ You value automatic change tracking

**Recommendation**: Start with CloudFormation and only switch to CustomResource if you encounter limitations.

### Use CustomResource When:
- ✅ You need to deploy flows with SAVED status
- ✅ Your flows fail CloudFormation validation but work in Connect
- ✅ You need to bypass AWS validation temporarily
- ✅ You're testing experimental flow configurations

## Examples

### Example 1: Standard Flow (CloudFormation)
```csharp
var flow = new FlowBuilder()
    .SetName("Customer Support")
    .SetType(FlowType.ContactFlow)
    // CloudFormation is default - no SetDeploymentStrategy needed
    .PlayPrompt("Welcome to customer support")
    .GetCustomerInput("Press 1 for sales, 2 for support", input =>
    {
        input.TimeoutSeconds = 5;
    })
    .OnDigit("1", sales => sales.TransferToQueue("Sales"))
    .OnDigit("2", support => support.TransferToQueue("Support"))
    .OnDefault(def => def.Disconnect())
    .Build();
```

### Example 2: Flow with SAVED Status (CustomResource)
```csharp
var flow = new FlowBuilder()
    .SetName("Development Flow")
    .SetType(FlowType.ContactFlow)
    .SetDeploymentStrategy(FlowDeploymentStrategy.CustomResource) // Explicit SDK deployment
    .SetStatus("SAVED") // Requires CustomResource strategy
    .PlayPrompt("This is a development flow")
    .GetCustomerInput("Enter account number", input =>
    {
        input.TimeoutSeconds = 10;
    })
    .OnDefault(def => def.Disconnect())
    .Build();
```

### Example 3: Switching Strategies

You can change deployment strategies by updating your code and redeploying:

```csharp
// Before: Using CustomResource
var flow = new FlowBuilder()
    .SetName("My Flow")
    .SetDeploymentStrategy(FlowDeploymentStrategy.CustomResource)
    .SetStatus("SAVED")
    .PlayPrompt("Test")
    .Build();

// After: Switch to CloudFormation (removes custom resource, deploys via CFN)
var flow = new FlowBuilder()
    .SetName("My Flow")
    .SetDeploymentStrategy(FlowDeploymentStrategy.CloudFormation)
    // .SetStatus("SAVED") // Remove this - CloudFormation doesn't support SAVED
    .PlayPrompt("Test")
    .Build();
```

**Note**: Switching strategies will cause the flow to be recreated (resource replacement). Plan accordingly.

## Infrastructure Differences

### CloudFormation Strategy
```yaml
Resources:
  Flow0ContactFlow:
    Type: AWS::Connect::ContactFlow
    Properties:
      InstanceArn: arn:aws:connect:...
      Name: "My Flow"
      Type: CONTACT_FLOW
      Content: "{...flow JSON...}"
      State: ACTIVE
```

### CustomResource Strategy
```yaml
Resources:
  # Lambda function for custom resource handler
  FlowCustomResourceHandler:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: dotnet8
      Handler: FlowCustomResourceHandler::Handler
      Code: {...}

  # Custom Resource provider
  FlowCustomResourceProvider:
    Type: AWS::CloudFormation::CustomResourceProvider
    Properties:
      ServiceToken: !GetAtt FlowCustomResourceHandler.Arn

  # Flow deployed via custom resource
  Flow0FlowResource:
    Type: Custom::ConnectFlow
    Properties:
      ServiceToken: !GetAtt FlowCustomResourceProvider.ServiceToken
      InstanceId: 12345-abcd-...
      Name: "My Flow"
      Type: CONTACT_FLOW
      Content: "{...flow JSON...}"
      ContentHash: "a1b2c3d4..." # Triggers updates
```

## Best Practices

1. **Default to CloudFormation** - Only use CustomResource when necessary
2. **Test flows first** - Validate flows work before deploying with SAVED status
3. **Document why** - Add comments explaining why CustomResource is needed
4. **Monitor Lambda costs** - CustomResource creates Lambda functions (minimal cost, but track it)
5. **Use SAVED for development** - Deploy as SAVED during development, switch to CloudFormation for production

## Troubleshooting

### "InvalidContactFlowException" with CloudFormation
**Problem**: CloudFormation rejects your flow during deployment.

**Solutions**:
1. Check flow JSON syntax and validation
2. Ensure all required parameters are present
3. Switch to CustomResource strategy temporarily to bypass validation
4. Fix underlying flow issues and return to CloudFormation

### Changes not detected with CustomResource
**Problem**: You updated the flow but it's not redeploying.

**Cause**: Content hash is only recalculated when flow JSON changes.

**Solution**:
- Ensure the flow content (JSON) actually changed
- Check that you're calling `.Build()` to regenerate the flow
- Verify the CDK synth shows a different ContentHash property

### Resource replacement when switching strategies
**Problem**: Switching strategies causes the flow to be deleted and recreated.

**Expected behavior**: Different deployment strategies create different CloudFormation resource types, so replacement is necessary.

**Mitigation**:
- Plan strategy changes during maintenance windows
- Export flow configuration before switching
- Test in non-production environment first

## Migration Guide

### From Status-based to Explicit Strategy

**Old code (automatic inference)**:
```csharp
var flow = new FlowBuilder()
    .SetStatus("SAVED") // Automatically used CustomResource
    .Build();
```

**New code (explicit strategy)**:
```csharp
var flow = new FlowBuilder()
    .SetDeploymentStrategy(FlowDeploymentStrategy.CustomResource) // Explicit
    .SetStatus("SAVED")
    .Build();
```

### Benefits of Explicit Strategy
- ✅ **Clear intent** - Developers know exactly how flow is deployed
- ✅ **No surprises** - Status doesn't silently change deployment method
- ✅ **Better control** - Can use CustomResource without SAVED status
- ✅ **Future-proof** - More deployment strategies can be added

## Summary

| Requirement | Recommended Strategy |
|-------------|----------------------|
| Standard production flows | CloudFormation |
| Flows with SAVED status | CustomResource |
| Development/testing flows | CustomResource |
| Flows that fail validation | CustomResource (temporary) |
| Simple infrastructure | CloudFormation |
| Maximum AWS integration | CloudFormation |
| Bypass validation | CustomResource |

**Default**: CloudFormation (best for 90% of use cases)
