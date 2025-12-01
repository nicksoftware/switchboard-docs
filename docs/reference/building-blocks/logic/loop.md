# Loop

Repeat a section of the flow a specified number of times.

## Signatures

```csharp
// Static loop count
ILoopBuilder Loop(
    int loopCount,
    Action<ILoopBuilder> configure,
    string? identifier = null)

// Dynamic loop count from attribute
ILoopBuilder Loop(
    AttributeReference loopCountAttribute,
    Action<ILoopBuilder> configure,
    string? identifier = null)
```

## Parameters

| Parameter            | Type                   | Required | Description                               |
| -------------------- | ---------------------- | -------- | ----------------------------------------- |
| `loopCount`          | `int`                  | Yes      | Number of iterations                      |
| `loopCountAttribute` | `AttributeReference`   | Yes      | Attribute containing loop count           |
| `configure`          | `Action<ILoopBuilder>` | Yes      | Configure loop behavior                   |
| `identifier`         | `string?`              | No       | Optional identifier (use with ContinueAt) |

## ILoopBuilder Methods

| Method                                | Description                                      |
| ------------------------------------- | ------------------------------------------------ |
| `.WhileLooping(Action<IFlowBuilder>)` | Configure inline actions for each iteration      |
| `.WhileLooping(string targetLabel)`   | Jump to a labeled action on each iteration       |
| `.WhenDone(Action<IFlowBuilder>)`     | Configure inline actions after loop completes    |
| `.WhenDone(string targetLabel)`       | Jump to a labeled action after loop completes    |
| `.LoopIdentifier`                     | Identifier for ContinueAt to restart loop        |

## Examples

### Basic Retry Pattern

```csharp
Flow.Create("PIN Entry with Retry")
    .Loop(3, loop => loop
        .WhileLooping(attempt => attempt
            .GetCustomerInput("Enter your PIN.", input => input.MaxDigits = 4)
                .OnDigits(d => d
                    .InvokeLambda("ValidatePIN")
                        .OnSuccess(valid => valid
                            .PlayPrompt("PIN accepted.")
                            .TransferToQueue("Authenticated")
                            .Disconnect())
                        .OnError(invalid => invalid
                            .PlayPrompt("Invalid PIN. Please try again.")))
                .OnTimeout(t => t.PlayPrompt("No input received."))
            .ThenContinue())  // Continue to next iteration
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Goodbye.")
            .Disconnect()));
```

### Main Menu with Retry

```csharp
Flow.Create("Main Menu")
    .PlayPrompt("Welcome to Nick Software.", "MainMenu")

    .Loop(3, mainMenuLoop => mainMenuLoop
        .WhileLooping(menuAttempt => menuAttempt
            .GetCustomerInput("Press 1 for Sales, 2 for Support.")
                .OnDigit("1", sales => sales
                    .TransferToQueue("Sales")
                    .Disconnect())
                .OnDigit("2", support => support
                    .TransferToQueue("Support")
                    .Disconnect())
                .OnDefault(def => def
                    .PlayPrompt("Invalid selection."))
                .OnTimeout(t => t
                    .PlayPrompt("We didn't receive your selection."))
            .ThenContinue())
        .WhenDone(maxMenuAttempts => maxMenuAttempts
            .PlayPrompt("Goodbye.")
            .Disconnect()))

    .Disconnect();
```

### Account Lookup with Retry

```csharp
Flow.Create("Account Entry")
    .Loop(3, accountLoop => accountLoop
        .WhileLooping(attempt => attempt
            .StoreCustomerInput("Enter your account number.", input =>
            {
                input.MaxDigits = 10;
                input.CustomTerminatingKeypress = "#";
            })
            .OnSuccess(entered => entered
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
            .OnError(inputError => inputError
                .PlayPrompt("Invalid entry."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts. Transferring to support.")
            .TransferToQueue("Support")
            .Disconnect()));
```

### Nested Loops (Authentication Flow)

```csharp
Flow.Create("Full Authentication")
    // Outer loop: Account entry
    .Loop(3, accountLoop => accountLoop
        .WhileLooping(accountAttempt => accountAttempt
            .StoreCustomerInput("Enter your account number.")
                .OnSuccess(accountEntered => accountEntered
                    .InvokeLambda("LookupAccount")
                        .OnSuccess(accountFound => accountFound
                            // Inner loop: PIN entry
                            .Loop(3, pinLoop => pinLoop
                                .WhileLooping(pinAttempt => pinAttempt
                                    .StoreCustomerInput("Enter your PIN.", p => p.MaxDigits = 4)
                                        .OnSuccess(pinEntered => pinEntered
                                            .InvokeLambda("ValidatePIN")
                                                .OnSuccess(valid => valid
                                                    .PlayPrompt("Authenticated!")
                                                    .TransferToQueue("Authenticated")
                                                    .Disconnect())
                                                .OnError(invalid => invalid
                                                    .PlayPrompt("Invalid PIN.")))
                                        .OnError(e => e.PlayPrompt("Invalid entry."))
                                    .ThenContinue())
                                .WhenDone(pinMax => pinMax
                                    .PlayPrompt("Maximum PIN attempts."))))
                        .OnError(notFound => notFound
                            .PlayPrompt("Account not found.")))
                .OnError(e => e.PlayPrompt("Invalid entry."))
            .ThenContinue())
        .WhenDone(accountMax => accountMax
            .PlayPrompt("Maximum account attempts. Goodbye.")
            .Disconnect()));
```

### Dynamic Loop Count

```csharp
Flow.Create("Dynamic Retry")
    // Get retry count from Lambda
    .InvokeLambda("GetConfiguration")
        .OnSuccess(config => config
            .SetContactAttributes(attrs =>
            {
                attrs["MaxRetries"] = Attributes.External("MaxRetries");
            }))
        .OnError(e => e
            .SetContactAttributes(attrs =>
            {
                attrs["MaxRetries"] = "3";  // Default
            }))

    // Use dynamic loop count
    .Loop(Attributes.Contact("MaxRetries"), loop => loop
        .WhileLooping(attempt => attempt
            .GetCustomerInput("Enter your selection.")
                .OnDigits(d => d.TransferToQueue("Support").Disconnect())
                .OnDefault(d => d.PlayPrompt("Invalid selection."))
            .ThenContinue())
        .WhenDone(done => done.Disconnect()));
```

### Label-Based Targeting (Flat Flow Structure)

Use label-based targeting when you prefer a flat flow structure or need to reference actions defined elsewhere:

```csharp
Flow.Create("Menu with Retry")
    .PlayPrompt("Welcome to support.")

    // Loop that targets labeled actions
    .Loop(3, loop => loop
        .WhileLooping("main-menu")      // Target: labeled GetCustomerInput
        .WhenDone("max-attempts"))      // Target: labeled goodbye prompt

    // Main menu input (target of WhileLooping)
    .GetCustomerInput("Press 1 for Sales, 2 for Support.", "main-menu")
        .OnDigit("1", sales => sales
            .TransferToQueue("Sales")
            .Disconnect())
        .OnDigit("2", support => support
            .TransferToQueue("Support")
            .Disconnect())
        .OnDefault(invalid => invalid
            .PlayPrompt("Invalid selection. Please try again."))
        .OnTimeout(timeout => timeout
            .PlayPrompt("No input received."))

    // Max attempts handler (target of WhenDone)
    .JoinPoint("max-attempts")
    .PlayPrompt("Maximum attempts reached. Goodbye.")
    .Disconnect();
```

This is equivalent to the inline version but allows more flexibility in flow organization.

### Early Exit with ContinueAt

```csharp
Flow.Create("Loop with Early Exit")
    .Loop(5, "RetryLoop", loop => loop
        .WhileLooping(attempt => attempt
            .InvokeLambda("UnreliableService")
                .OnSuccess(success => success
                    .PlayPrompt("Service responded!")
                    .ContinueAt("AfterLoop"))  // Exit loop early
                .OnError(error => error
                    .PlayPrompt("Retrying..."))
            .ThenContinue())
        .WhenDone(done => done
            .PlayPrompt("Service unavailable after all retries.")))

    .JoinPoint("AfterLoop")
    .TransferToQueue("Support")
    .Disconnect();
```

### Lambda Verification with Retry

```csharp
private static void BuildAccountLookup(IFlowBuilder flow, string lambdaArn)
{
    flow.SetContactAttributes(attrs =>
        {
            attrs["EnteredAccountNumber"] = Attributes.System(SystemAttributes.StoredCustomerInput);
        })
        .InvokeLambda(lambdaArn, lambda =>
        {
            lambda.InputParameters["Action"] = "LOOKUP";
            lambda.InputParameters["AccountNumber"] = Attributes.Contact("EnteredAccountNumber");
        })
        .OnSuccess(success => success
            .CheckContactAttribute(check =>
            {
                check.Attribute(Attributes.External("StatusCode"))
                    .Equals("200", found => found
                        .SetContactAttributes(attrs =>
                        {
                            attrs["CustomerName"] = Attributes.External("CustomerName");
                        })
                        .PlayPrompt($"Welcome, {Attributes.External("CustomerName")}!")
                        .TransferToQueue("AccountServices")
                        .Disconnect())
                    .Otherwise(notFound => notFound
                        .PlayPrompt("Account not found."));
            }))
        .OnError(lambdaError => lambdaError
            .PlayPrompt("Service error. Please try again."))
        .ThenContinue();
}

// Usage
Flow.Create("Account Verification")
    .Loop(3, loop => loop
        .WhileLooping(attempt =>
            BuildAccountLookup(attempt, "arn:aws:lambda:..."))
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached.")
            .TransferToQueue("Support")))
    .Disconnect();
```

## How Loop Works

1. **WhileLooping** - Executes on each iteration
2. **ThenContinue** - Signals to continue to next iteration
3. **WhenDone** - Executes after all iterations complete (or no ThenContinue)
4. **Exit early** - Use Disconnect, TransferToQueue, or ContinueAt to leave loop

## AWS Connect Block Type

This block generates the `Loop` action type in the exported flow JSON with `ContinueLooping` and `DoneLooping` transitions.

## Best Practices

1. **Use ThenContinue** - Required to continue iterations
2. **Provide exit paths** - Success should exit the loop
3. **Limit iterations** - 3-5 attempts is typical
4. **Clear messaging** - Tell customers when retrying
5. **Handle WhenDone** - Always have a final fallback

## See Also

- [GetCustomerInput](../interact/get-customer-input.md) - Input with retry
- [StoreCustomerInput](../interact/store-customer-input.md) - Secure input with retry
- [InvokeLambda](../integrate/invoke-lambda.md) - Lambda with retry
- [ContinueAt/JoinPoint](../flow-actions.md#flow-control) - Flow navigation
