# Integrate Blocks

Integrate blocks connect your contact flows with external systems and other flows.

## Blocks in this Category

- [InvokeLambda](./invoke-lambda.md) - Call AWS Lambda functions
- [InvokeFlow](./invoke-flow.md) - Transfer to another contact flow

## Overview

Integrate blocks enable powerful capabilities:

- **Data retrieval** - Look up customer information, account details
- **Business logic** - Complex validation, calculations, routing decisions
- **External APIs** - CRM integration, order management, payment processing
- **Flow composition** - Modular flow design with reusable components

## Common Patterns

### Customer Lookup

```csharp
Flow.Create("Customer Lookup")
    .InvokeLambda("CustomerLookup", lambda =>
    {
        lambda.InputParameters["PhoneNumber"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["CustomerName"] = Attributes.External("CustomerName");
            attrs["AccountId"] = Attributes.External("AccountId");
            attrs["CustomerTier"] = Attributes.External("Tier");
        })
        .PlayPrompt($"Welcome back, {Attributes.External("CustomerName")}!"))
    .OnError(error => error
        .PlayPrompt("Thank you for calling."))
    .TransferToQueue("Support");
```

### Modular Flow Design

```csharp
// Main flow
Flow.Create("Main Flow")
    .PlayPrompt("Welcome.")
    .GetCustomerInput("Press 1 for authentication.")
        .OnDigit("1", auth => auth.TransferToFlow("AuthenticationFlow"))
    .Disconnect();

// Reusable authentication flow
Flow.Create("AuthenticationFlow")
    .SetType(FlowType.ContactFlow)
    .StoreCustomerInput("Enter your PIN.")
    .OnSuccess(s => s.InvokeLambda("ValidatePIN"))
    .TransferToFlow("AuthenticatedMenu");
```

## Error Handling

Always handle Lambda errors gracefully:

```csharp
.InvokeLambda("RiskyOperation")
    .OnSuccess(success => success
        // Process successful response
        .CheckContactAttribute(check =>
        {
            check.Attribute(Attributes.External("Status"))
                .Equals("OK", ok => ok.PlayPrompt("Success!"))
                .Otherwise(fail => fail.PlayPrompt("Operation failed."));
        }))
    .OnError(error => error
        // Handle Lambda timeout, errors, or unavailability
        .PlayPrompt("Service temporarily unavailable.")
        .TransferToQueue("Fallback"))
```

## See Also

- [Attributes Reference](../attributes.md) - Accessing Lambda response data
- [SetContactAttributes](../set/set-contact-attributes.md) - Storing Lambda data
