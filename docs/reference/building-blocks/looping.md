# Looping & Retry Logic

::: danger EXPERIMENTAL FEATURE
The looping API is currently **experimental** and undergoing active development. The API may change significantly in future releases. Use with caution in production environments.
:::

## Overview

Looping allows you to retry actions when customers don't provide input or make mistakes. Common use cases:
- Retry when customer doesn't press a digit
- Re-prompt when invalid input is entered
- Limit the number of attempts before transferring or disconnecting

## Basic Usage

### Simple Retry

```csharp
var flow = new FlowBuilder()
    .SetName("RetryExample")
    .GetCustomerInput("Enter your PIN", input =>
    {
        input.MaxDigits = 4;
        input.TimeoutSeconds = 5;
        input.MaxAttempts = 3;  // Retry up to 3 times
    })
    .OnTimeout(timeout => {
        timeout.PlayPrompt("No input received").Disconnect();
    })
    .Build();
```

When `MaxAttempts` is set, the framework automatically:
1. Tracks the number of attempts
2. Re-prompts the customer
3. Executes your timeout handler after max attempts

### With Retry Messages

```csharp
.GetCustomerInput("Enter account number", input =>
{
    input.MaxDigits = 10;
    input.MaxAttempts = 3;
})
.WithRetry(retry => {
    retry.OnTimeout(t => t.PlayPrompt("Please try again"));
})
.OnTimeout(finalTimeout => {
    finalTimeout.PlayPrompt("Too many attempts").Disconnect();
})
```

This plays "Please try again" on each retry, then "Too many attempts" when max attempts is reached.

## Experimental Limitations

::: warning KNOWN ISSUES
The current looping implementation has some limitations:

- **Branching complexity**: Complex branching scenarios may not work as expected
- **Nested loops**: Multiple nested retry loops are not fully tested
- **Edge cases**: Some edge cases around max attempts may behave unexpectedly

We're actively working on improving this feature. Feedback welcome!
:::

## When to Use Looping

✅ **Good use cases:**
- Simple PIN/account number entry with retry
- Basic IVR menu with re-prompt on timeout
- Single-level retry logic

❌ **Avoid for now:**
- Complex multi-level retries
- Nested retry logic
- Mission-critical flows (until API stabilizes)

## Alternative Approach

For production use, consider explicitly handling retries:

```csharp
// More verbose but predictable
.GetCustomerInput("Enter PIN")
    .OnTimeout(timeout => {
        timeout.PlayPrompt("Let's try again")
            .GetCustomerInput("Enter PIN again")
            .OnTimeout(finalTimeout => {
                finalTimeout.Disconnect();
            })
    })
```

This approach is more verbose but gives you full control until the looping API matures.

## Feedback

Found an issue with looping? Please report it:
- [GitHub Issues](https://github.com/nicksoftware/switchboard/issues)
- Include your flow code and expected vs actual behavior
- Help us make looping better!
