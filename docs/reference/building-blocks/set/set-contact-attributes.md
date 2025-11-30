# SetContactAttributes

Set or update contact attributes that can be used throughout the flow.

## Signature

```csharp
// Set on current contact
IFlowBuilder SetContactAttributes(
    Action<Dictionary<string, string>> configure, 
    ContactTarget target = ContactTarget.Current, 
    string? identifier = null)

// Set on related contact
IFlowBuilder SetContactAttributesOnRelated(
    Action<Dictionary<string, string>> configure, 
    string? identifier = null)

// Set flow attributes (temporary, flow-scoped)
IFlowBuilder SetFlowAttributes(
    Action<Dictionary<string, string>> configure, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `configure` | `Action<Dictionary<string, string>>` | Yes | Configure attributes to set |
| `target` | `ContactTarget` | No | Target contact (Current or Related) |
| `identifier` | `string?` | No | Optional identifier for the action |

## ContactTarget Values

| Value | Description |
|-------|-------------|
| `Current` | The current contact (default) |
| `Related` | A related contact (e.g., in callback scenarios) |

## Examples

### Basic Attribute Setting

```csharp
Flow.Create("Set Attributes")
    .SetContactAttributes(attrs =>
    {
        attrs["Department"] = "Sales";
        attrs["Priority"] = "High";
        attrs["CallReason"] = "New Inquiry";
    })
    .TransferToQueue("Sales")
    .Disconnect();
```

### From Lambda Response

```csharp
Flow.Create("Customer Data")
    .InvokeLambda("GetCustomerInfo")
        .OnSuccess(success => success
            .SetContactAttributes(attrs =>
            {
                attrs["CustomerName"] = Attributes.External("CustomerName");
                attrs["AccountId"] = Attributes.External("AccountId");
                attrs["CustomerTier"] = Attributes.External("Tier");
                attrs["AccountBalance"] = Attributes.External("Balance");
            }))
        .OnError(error => error
            .SetContactAttributes(attrs =>
            {
                attrs["CustomerStatus"] = "Unknown";
            }))
    .TransferToQueue("Support")
    .Disconnect();
```

### From System Attributes

```csharp
Flow.Create("Capture Caller Info")
    .SetContactAttributes(attrs =>
    {
        attrs["CallerNumber"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
        attrs["CallTime"] = Attributes.System(SystemAttributes.InitiationTimestamp);
        attrs["ContactId"] = Attributes.System(SystemAttributes.ContactId);
    })
    .TransferToQueue("Support")
    .Disconnect();
```

### From Customer Input

```csharp
Flow.Create("Account Entry")
    .StoreCustomerInput("Enter your account number.", input =>
    {
        input.MaxDigits = 10;
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["EnteredAccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda("LookupAccount"))
    .OnError(error => error.Disconnect());
```

### Menu Selection Tracking

```csharp
Flow.Create("Menu Tracking")
    .GetCustomerInput("Press 1 for Sales, 2 for Support, 3 for Billing.")
        .OnDigit("1", sales => sales
            .SetContactAttributes(attrs =>
            {
                attrs["Department"] = "Sales";
                attrs["MenuPath"] = "MainMenu->Sales";
            })
            .TransferToQueue("Sales")
            .Disconnect())
        .OnDigit("2", support => support
            .SetContactAttributes(attrs =>
            {
                attrs["Department"] = "Support";
                attrs["MenuPath"] = "MainMenu->Support";
            })
            .TransferToQueue("Support")
            .Disconnect())
        .OnDigit("3", billing => billing
            .SetContactAttributes(attrs =>
            {
                attrs["Department"] = "Billing";
                attrs["MenuPath"] = "MainMenu->Billing";
            })
            .TransferToQueue("Billing")
            .Disconnect())
        .OnDefault(def => def.Disconnect())
        .OnTimeout(t => t.Disconnect());
```

### Building Up Attributes Through Flow

```csharp
Flow.Create("Progressive Attributes")
    // Start with basic info
    .SetContactAttributes(attrs =>
    {
        attrs["FlowName"] = "CustomerSupport";
        attrs["EntryTime"] = Attributes.System(SystemAttributes.InitiationTimestamp);
    })
    
    // Add customer lookup results
    .InvokeLambda("CustomerLookup")
        .OnSuccess(s => s.SetContactAttributes(attrs =>
        {
            attrs["CustomerName"] = Attributes.External("Name");
            attrs["AccountId"] = Attributes.External("AccountId");
            attrs["IsAuthenticated"] = "true";
        }))
        .OnError(e => e.SetContactAttributes(attrs =>
        {
            attrs["IsAuthenticated"] = "false";
        }))
    
    // Add selection
    .GetCustomerInput("Press 1 for Orders, 2 for Returns.")
        .OnDigit("1", orders => orders
            .SetContactAttributes(attrs =>
            {
                attrs["Topic"] = "Orders";
            }))
        .OnDigit("2", returns => returns
            .SetContactAttributes(attrs =>
            {
                attrs["Topic"] = "Returns";
            }))
        .OnDefault(d => d)
    
    // All attributes available to agent
    .TransferToQueue("Support")
    .Disconnect();
```

### Flow Attributes (Temporary)

```csharp
Flow.Create("Temporary Variables")
    // Flow attributes are only visible in current flow
    .SetFlowAttributes(attrs =>
    {
        attrs["RetryCount"] = "0";
        attrs["TempCalculation"] = "pending";
    })
    
    // Use in Lambda
    .InvokeLambda("ProcessData", lambda =>
    {
        lambda.InputParameters["Retry"] = Attributes.Flow("RetryCount");
    })
    .OnSuccess(s => s.TransferToQueue("Support"))
    .OnError(e => e.Disconnect());
```

### Related Contact Attributes

```csharp
Flow.Create("Callback Setup")
    // Set attributes on the callback contact
    .SetContactAttributesOnRelated(attrs =>
    {
        attrs["CallbackReason"] = "CustomerRequested";
        attrs["OriginalContactId"] = Attributes.System(SystemAttributes.ContactId);
    })
    .PlayPrompt("We will call you back shortly.")
    .Disconnect();
```

### Dynamic Values

```csharp
Flow.Create("Dynamic Attributes")
    .SetContactAttributes(attrs =>
    {
        // Static value
        attrs["Source"] = "ContactFlow";
        
        // From system
        attrs["Phone"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
        
        // From Lambda response
        attrs["CustomerId"] = Attributes.External("CustomerId");
        
        // From previous attribute
        attrs["PreviousTier"] = Attributes.Contact("CustomerTier");
        
        // Computed in flow
        attrs["FullPath"] = $"{Attributes.Contact("FlowName")}->{Attributes.Contact("Department")}";
    })
    .TransferToQueue("Support");
```

## Attribute Access Patterns

```csharp
// Setting
.SetContactAttributes(attrs => attrs["Key"] = "Value")

// Reading in prompts
.PlayPrompt($"Hello, {Attributes.Contact("CustomerName")}")

// Reading in Lambda parameters
.InvokeLambda("MyLambda", l => l.InputParameters["Account"] = Attributes.Contact("AccountId"))

// Reading in conditions
.CheckContactAttribute(c => c.Attribute(Attributes.Contact("Tier")).Equals("VIP", ...))
```

## AWS Connect Block Type

This block generates the `UpdateContactAttributes` action type in the exported flow JSON.

## Attribute Limits

| Limit | Value |
|-------|-------|
| Maximum attributes per contact | 512 |
| Maximum attribute name length | 256 characters |
| Maximum attribute value length | 32 KB |
| Maximum total attributes size | 64 KB |

## Best Practices

1. **Use meaningful names** - `CustomerTier` not `ct`
2. **Set early** - Attributes set early are available throughout
3. **Store Lambda results** - Make data available for routing decisions
4. **Track flow path** - Store menu selections for analytics
5. **Use flow attributes for temp values** - Don't clutter contact attributes

## See Also

- [Attributes Reference](../attributes.md) - All attribute types
- [InvokeLambda](../integrate/invoke-lambda.md) - Getting data to store
- [CheckContactAttribute](../check/check-contact-attribute.md) - Using stored attributes
