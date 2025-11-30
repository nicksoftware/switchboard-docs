# InvokeLambda

Call an AWS Lambda function from your contact flow. Lambda functions enable custom business logic, external integrations, and data retrieval.

## Signatures

```csharp
// With configuration action
ILambdaBuilder InvokeLambda(
    string functionName, 
    Action<InvokeLambdaAction>? configure = null)

// With explicit display name (for CDK tokens)
ILambdaBuilder InvokeLambda(
    string functionArn, 
    string? displayName, 
    Action<InvokeLambdaAction>? configure = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `functionName` | `string` | Yes | Lambda function name or ARN |
| `functionArn` | `string` | Yes | Lambda function ARN (can be CDK token) |
| `displayName` | `string?` | No | Display name for Connect UI |
| `configure` | `Action<InvokeLambdaAction>` | No | Configure Lambda invocation |

## InvokeLambdaAction Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `InputParameters` | `Dictionary<string, string>` | Empty | Parameters to send to Lambda |
| `TimeoutSeconds` | `int` | `8` | Lambda invocation timeout |

## Return Value

Returns `ILambdaBuilder` which provides:

| Method | Description |
|--------|-------------|
| `.OnSuccess(Action<IFlowBuilder>)` | Branch when Lambda returns successfully |
| `.OnError(Action<IFlowBuilder>)` | Branch when Lambda fails or times out |
| `.ThenContinue()` | Continue to next action after branches |

## Accessing Lambda Response

Lambda response data is available via `Attributes.External()`:

```csharp
// In Lambda response: { "CustomerName": "John", "StatusCode": "200" }
Attributes.External("CustomerName")  // Returns "John"
Attributes.External("StatusCode")    // Returns "200"
```

## Examples

### Basic Lambda Invocation

```csharp
Flow.Create("Lambda Example")
    .InvokeLambda("CustomerLookup")
        .OnSuccess(success => success
            .PlayPrompt("Customer found.")
            .SetContactAttributes(attrs =>
            {
                attrs["CustomerName"] = Attributes.External("CustomerName");
            }))
        .OnError(error => error
            .PlayPrompt("Unable to retrieve customer information."))
    .TransferToQueue("Support")
    .Disconnect();
```

### With Input Parameters

```csharp
Flow.Create("Account Lookup")
    .InvokeLambda("LookupAccount", lambda =>
    {
        lambda.InputParameters["Action"] = "LOOKUP";
        lambda.InputParameters["PhoneNumber"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
        lambda.TimeoutSeconds = 10;
    })
    .OnSuccess(success => success
        .CheckContactAttribute(check =>
        {
            check.Attribute(Attributes.External("StatusCode"))
                .Equals("200", found => found
                    .SetContactAttributes(attrs =>
                    {
                        attrs["AccountId"] = Attributes.External("AccountId");
                        attrs["CustomerName"] = Attributes.External("CustomerName");
                    })
                    .PlayPrompt($"Welcome, {Attributes.External("CustomerName")}!"))
                .Equals("404", notFound => notFound
                    .PlayPrompt("Account not found."))
                .Otherwise(error => error
                    .PlayPrompt("Unexpected error."));
        }))
    .OnError(error => error
        .PlayPrompt("Service unavailable. Please try again later."))
    .TransferToQueue("Support")
    .Disconnect();
```

### With CDK Token and Display Name

```csharp
// When using CDK, the ARN might be a token
var lambdaFunction = new Function(this, "CustomerLookup", new FunctionProps { ... });

Flow.Create("CDK Lambda Flow")
    .InvokeLambda(lambdaFunction.FunctionArn, "CustomerLookup", lambda =>
    {
        lambda.InputParameters["Source"] = "ContactFlow";
    })
    .OnSuccess(s => s.PlayPrompt("Success"))
    .OnError(e => e.PlayPrompt("Error"))
    .Disconnect();
```

### PIN Verification Flow

```csharp
Flow.Create("PIN Verification")
    .StoreCustomerInput("Enter your PIN.", input =>
    {
        input.MaxDigits = 4;
        input.EncryptInput = true;
    })
    .OnSuccess(pinEntered => pinEntered
        .SetContactAttributes(attrs =>
        {
            attrs["EnteredPIN"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda("VerifyPIN", lambda =>
        {
            lambda.InputParameters["AccountId"] = Attributes.Contact("AccountId");
            lambda.InputParameters["PIN"] = Attributes.Contact("EnteredPIN");
            lambda.TimeoutSeconds = 8;
        })
        .OnSuccess(verified => verified
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("Authenticated"))
                    .Equals(true, auth => auth
                        .PlayPrompt("PIN verified. Welcome!")
                        .TransferToQueue("Authenticated"))
                    .Otherwise(invalid => invalid
                        .PlayPrompt("Invalid PIN."));
            }))
        .OnError(lambdaError => lambdaError
            .PlayPrompt("Verification service unavailable.")))
    .OnError(inputError => inputError
        .PlayPrompt("Invalid entry."))
    .Disconnect();
```

### Chained Lambda Calls

```csharp
Flow.Create("Multi-Step Verification")
    // Step 1: Look up account
    .InvokeLambda("AccountLookup", lambda =>
    {
        lambda.InputParameters["Phone"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
    })
    .OnSuccess(accountFound => accountFound
        .SetContactAttributes(attrs =>
        {
            attrs["AccountId"] = Attributes.External("AccountId");
        })
        
        // Step 2: Get account balance
        .InvokeLambda("GetBalance", lambda =>
        {
            lambda.InputParameters["AccountId"] = Attributes.Contact("AccountId");
        })
        .OnSuccess(balanceRetrieved => balanceRetrieved
            .SetContactAttributes(attrs =>
            {
                attrs["Balance"] = Attributes.External("Balance");
            })
            .PlayPrompt($"Your balance is {Attributes.External("Balance")} dollars."))
        .OnError(balanceError => balanceError
            .PlayPrompt("Could not retrieve balance.")))
    .OnError(accountError => accountError
        .PlayPrompt("Account not found."))
    .TransferToQueue("Support")
    .Disconnect();
```

### With Retry Pattern

```csharp
Flow.Create("Lambda with Retry")
    .Loop(3, loop => loop
        .WhileLooping(attempt => attempt
            .InvokeLambda("UnreliableService", lambda =>
            {
                lambda.TimeoutSeconds = 5;
            })
            .OnSuccess(success => success
                .PlayPrompt("Service responded successfully.")
                .TransferToQueue("Support")
                .Disconnect())
            .OnError(error => error
                .PlayPrompt("Service temporarily unavailable. Retrying..."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Service unavailable after multiple attempts.")
            .TransferToQueue("Fallback")
            .Disconnect()));
```

### Payment Processing

```csharp
Flow.Create("Payment Flow")
    // Collect payment info securely
    .StoreCustomerInput("Enter your card number.", input =>
    {
        input.MaxDigits = 16;
        input.EncryptInput = true;
    })
    .OnSuccess(cardEntered => cardEntered
        .InvokeLambda("ProcessPayment", lambda =>
        {
            lambda.InputParameters["Amount"] = Attributes.Contact("PaymentAmount");
            lambda.InputParameters["EncryptedCard"] = Attributes.System(SystemAttributes.StoredCustomerInput);
            lambda.TimeoutSeconds = 15;
        })
        .OnSuccess(paymentResult => paymentResult
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("PaymentStatus"))
                    .Equals("APPROVED", approved => approved
                        .SetContactAttributes(attrs =>
                        {
                            attrs["ConfirmationNumber"] = Attributes.External("ConfirmationNumber");
                        })
                        .PlayPrompt($"Payment approved. Confirmation: {Attributes.External("ConfirmationNumber")}"))
                    .Equals("DECLINED", declined => declined
                        .PlayPrompt("Payment declined. Please try another card."))
                    .Otherwise(error => error
                        .PlayPrompt("Payment processing error."));
            }))
        .OnError(lambdaError => lambdaError
            .PlayPrompt("Payment service unavailable. Transferring to agent.")
            .TransferToQueue("Payments")))
    .OnError(inputError => inputError
        .PlayPrompt("Invalid card entry."))
    .Disconnect();
```

## Lambda Function Response Format

Your Lambda function should return data in this format:

```python
def handler(event, context):
    return {
        "StatusCode": "200",
        "CustomerName": "John Smith",
        "AccountId": "12345",
        "Balance": "150.00",
        "Authenticated": True  # Boolean values work too
    }
```

All returned values are accessible via `Attributes.External("key")`.

## Lambda Input Event

Your Lambda receives contact flow context:

```json
{
  "Details": {
    "ContactData": {
      "Attributes": { ... },
      "Channel": "VOICE",
      "ContactId": "abc-123",
      "CustomerEndpoint": { "Address": "+12025551234", "Type": "TELEPHONE_NUMBER" }
    },
    "Parameters": {
      "Action": "LOOKUP",
      "PhoneNumber": "+12025551234"
    }
  }
}
```

## AWS Connect Block Type

This block generates the `InvokeLambdaFunction` action type in the exported flow JSON.

## Timeout Behavior

- Default timeout: 8 seconds
- Maximum timeout: 8 seconds (Amazon Connect limit)
- Timeouts route to `OnError` branch

## Best Practices

1. **Always handle OnError** - Lambda can fail or timeout
2. **Use status codes** - Return structured responses with status
3. **Keep Lambda fast** - Under 8 seconds to avoid timeouts
4. **Encrypt sensitive data** - Use KMS for secure attributes
5. **Log for debugging** - Include correlation IDs
6. **Validate responses** - Check StatusCode before using data

## See Also

- [Attributes Reference](../attributes.md) - Accessing response data
- [SetContactAttributes](../set/set-contact-attributes.md) - Storing Lambda data
- [CheckContactAttribute](../check/check-contact-attribute.md) - Branching on response
- [StoreCustomerInput](../interact/store-customer-input.md) - Encrypted input for Lambda
