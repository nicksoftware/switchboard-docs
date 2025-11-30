# StoreCustomerInput

Securely capture customer input such as credit card numbers, PINs, or other sensitive data. Input can be encrypted and is stored in the `$.StoredCustomerInput` system attribute.

> **Note**: This is a voice-only block. Chat, task, and email contacts will route to the Error branch.

## Signature

```csharp
IStoreInputBuilder StoreCustomerInput(
    string promptText, 
    Action<StoreCustomerInputAction>? configure = null, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `promptText` | `string` | Yes | The prompt text to play |
| `configure` | `Action<StoreCustomerInputAction>` | No | Configure input settings |
| `identifier` | `string?` | No | Optional identifier for the action |

## StoreCustomerInputAction Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `MaxDigits` | `int` | `20` | Maximum digits to collect (1-20) |
| `EncryptInput` | `bool` | `false` | Encrypt the collected input |
| `InitialTimeoutSeconds` | `int` | `5` | Time to wait for first digit |
| `BetweenEntryTimeoutSeconds` | `int` | `3` | Time between digits before submission |
| `CustomTerminatingKeypress` | `string?` | `null` | Digit that ends input (e.g., "#") |

## Return Value

Returns `IStoreInputBuilder` which provides:

| Method | Description |
|--------|-------------|
| `.OnSuccess(Action<IFlowBuilder>)` | Handle successful input collection |
| `.OnError(Action<IFlowBuilder>)` | Handle errors or invalid input |
| `.ThenContinue()` | Continue to next action after branches |

## Accessing Stored Input

After successful collection, the input is available via:

```csharp
Attributes.System(SystemAttributes.StoredCustomerInput)
```

Or in JSONPath format:
```
$.StoredCustomerInput
```

## Examples

### Basic PIN Entry

```csharp
Flow.Create("PIN Entry")
    .StoreCustomerInput("Please enter your 4-digit PIN followed by the pound key.", input =>
    {
        input.MaxDigits = 4;
        input.CustomTerminatingKeypress = "#";
        input.InitialTimeoutSeconds = 10;
    })
    .OnSuccess(success => success
        .SetContactAttributes(attrs =>
        {
            attrs["EnteredPIN"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda("ValidatePIN")
            .OnSuccess(valid => valid
                .PlayPrompt("PIN accepted.")
                .TransferToQueue("Authenticated"))
            .OnError(invalid => invalid
                .PlayPrompt("Invalid PIN.")))
    .OnError(error => error
        .PlayPrompt("Invalid entry. Please try again."));
```

### Encrypted Credit Card Entry

```csharp
Flow.Create("Payment Flow")
    .PlayPrompt("Please have your credit card ready.")
    .StoreCustomerInput("Enter your 16-digit credit card number.", input =>
    {
        input.MaxDigits = 16;
        input.EncryptInput = true;  // Encrypt for PCI compliance
        input.InitialTimeoutSeconds = 15;
        input.BetweenEntryTimeoutSeconds = 5;
    })
    .OnSuccess(success => success
        .PlayPrompt("Credit card received.")
        .InvokeLambda("ProcessPayment"))
    .OnError(error => error
        .PlayPrompt("We couldn't capture your card number. Please speak to an agent.")
        .TransferToQueue("Payments"));
```

### Account Number with Retry Loop

```csharp
Flow.Create("Account Lookup")
    .Loop(3, loop => loop
        .WhileLooping(attempt => attempt
            .StoreCustomerInput("Please enter your account number followed by the hash key.", input =>
            {
                input.MaxDigits = 10;
                input.CustomTerminatingKeypress = "#";
                input.InitialTimeoutSeconds = 10;
            })
            .OnSuccess(success => success
                .SetContactAttributes(attrs =>
                {
                    attrs["AccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
                })
                .InvokeLambda("LookupAccount")
                    .OnSuccess(found => found
                        .PlayPrompt("Account found.")
                        .TransferToQueue("AccountServices")
                        .Disconnect())
                    .OnError(notFound => notFound
                        .PlayPrompt("Account not found. Please try again.")))
            .OnError(error => error
                .PlayPrompt("Invalid entry. Please try again."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Transferring to an agent.")
            .TransferToQueue("General")
            .Disconnect()));
```

### Combined with CheckContactAttribute

```csharp
Flow.Create("Authenticated Flow")
    .StoreCustomerInput("Enter your PIN.", input =>
    {
        input.MaxDigits = 4;
        input.CustomTerminatingKeypress = "#";
    })
    .OnSuccess(pinEntered => pinEntered
        .SetContactAttributes(attrs =>
        {
            attrs["EnteredPIN"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda("VerifyPIN")
            .OnSuccess(verified => verified
                .CheckContactAttribute(check =>
                {
                    check.Attribute(Attributes.External("Authenticated"))
                        .Equals(true, authenticated => authenticated
                            .PlayPrompt("Welcome back!")
                            .TransferToQueue("Authenticated"))
                        .Otherwise(failed => failed
                            .PlayPrompt("Invalid PIN."));
                }))
            .OnError(lambdaError => lambdaError
                .PlayPrompt("Verification service unavailable.")))
    .OnError(inputError => inputError
        .PlayPrompt("Invalid entry."));
```

### Dynamic Prompt with Account Info

```csharp
Flow.Create("PIN Verification")
    // First, get account info
    .InvokeLambda("GetAccountInfo")
        .OnSuccess(accountInfo => accountInfo
            .SetContactAttributes(attrs =>
            {
                attrs["AccountLast4"] = Attributes.External("AccountLast4");
            }))
        .OnError(e => e.Disconnect())
    
    // Now ask for PIN with personalized message
    .StoreCustomerInput(
        $"Please enter the PIN for account ending in {Attributes.Contact("AccountLast4")}.", 
        input =>
        {
            input.MaxDigits = 4;
            input.CustomTerminatingKeypress = "#";
        })
    .OnSuccess(success => success
        .InvokeLambda("ValidatePIN"))
    .OnError(error => error
        .PlayPrompt("Invalid entry."));
```

## Encryption

When `EncryptInput = true`:

1. Input is encrypted using AWS Key Management Service (KMS)
2. The encrypted value is stored in `$.StoredCustomerInput`
3. Only Lambda functions with proper KMS permissions can decrypt
4. Required for PCI DSS compliance when handling payment card data

```csharp
.StoreCustomerInput("Enter your card number.", input =>
{
    input.EncryptInput = true;  // Enables encryption
})
```

## AWS Connect Block Type

This block generates the `StoreUserInput` action type in the exported flow JSON.

## Best Practices

1. **Use encryption for sensitive data** - Always encrypt PINs, card numbers, SSNs
2. **Set appropriate timeouts** - Give customers time to find and enter information
3. **Use terminating keypress** - "#" allows customers to confirm shorter entries
4. **Implement retry logic** - Use Loop for multiple entry attempts
5. **Validate input in Lambda** - Check length and format server-side
6. **Clear prompts** - Tell customers exactly how many digits and what key to press

## Differences from GetCustomerInput

| Feature | StoreCustomerInput | GetCustomerInput |
|---------|-------------------|------------------|
| Encryption | ✅ Supported | ❌ Not supported |
| Voice-only | ✅ Yes | ❌ Multi-channel |
| Use case | Sensitive data | Menu selection |
| Storage | `$.StoredCustomerInput` | Branch routing |
| Branching | Success/Error only | Multiple digit branches |

## See Also

- [GetCustomerInput](./get-customer-input.md) - For non-sensitive input
- [InvokeLambda](../integrate/invoke-lambda.md) - For validating input
- [Loop](../logic/loop.md) - For retry patterns
- [Attributes Reference](../attributes.md) - For accessing stored input
