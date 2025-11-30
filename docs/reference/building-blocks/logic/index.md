# Logic Blocks

Logic blocks control flow execution patterns like loops and waits.

## Blocks in this Category

- [Loop](./loop.md) - Repeat a section of the flow
- [Wait](./wait.md) - Pause flow execution

## Overview

Logic blocks enable advanced flow control:

- **Retry patterns** - Allow multiple attempts for input
- **Delayed actions** - Wait before proceeding
- **Iteration** - Process items repeatedly

## Common Patterns

### Input Retry

```csharp
Flow.Create("Retry Pattern")
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
                .OnTimeout(t => t.PlayPrompt("No input received. Please try again."))
                .OnError(e => e.PlayPrompt("Error. Please try again."))
            .ThenContinue())
        .WhenDone(maxAttempts => maxAttempts
            .PlayPrompt("Maximum attempts reached. Goodbye.")
            .Disconnect()));
```

### Announcement with Pause

```csharp
Flow.Create("Announcement Flow")
    .PlayPrompt("Important announcement:")
    .Wait(2)  // 2 second pause
    .PlayPrompt("Our office hours have changed.")
    .Wait(1)
    .PlayPrompt("We are now open from 8 AM to 6 PM.")
    .TransferToQueue("General")
    .Disconnect();
```

## See Also

- [GetCustomerInput](../interact/get-customer-input.md) - Input collection for retry
- [JoinPoint/ContinueAt](#) - Flow convergence patterns
