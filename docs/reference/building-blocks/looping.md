# Loop API Design - Fluent & Developer-Friendly

## Problem Statement

AWS Loop actions require explicit identifier references:
```json
{
  "Type": "Loop",
  "Transitions": {
    "Conditions": [
      {"NextAction": "get-input-id", "Condition": {"Operands": ["ContinueLooping"]}},
      {"NextAction": "fallback-id", "Condition": {"Operands": ["DoneLooping"]}}
    ]
  }
}
```

**Developer Experience**: Framework automatically generates Loop actions when `MaxAttempts` is specified.

#### Usage

```csharp
var flow = new FlowBuilder()
    .SetName("Automatic Retry Flow")

    .GetCustomerInput("Enter your PIN", input =>
    {
        input.MaxDigits = 4;
        input.TimeoutSeconds = 5;
        input.MaxAttempts = 3;  // ✅ Automatically generates Loop action
    })
        .OnDigit("1", valid => valid.TransferToQueue("Authenticated").Disconnect())
        .OnTimeout(timeout =>
        {
            // ✅ Framework automatically handles retry (attempts 1-2)
            // ✅ This handler only executes after 3rd failed attempt
            timeout.PlayPrompt("Too many failed attempts. Goodbye.")
                   .Disconnect();
        })
        .OnInvalidInput(invalid =>
        {
            invalid.PlayPrompt("Account locked. Contact support.")
                   .Disconnect();
        })
        .Build();
```

#### How It Works

1. **Framework detects** `MaxAttempts > 1` on GetCustomerInputAction
2. **Automatically generates** Loop action with identifier references
3. **Rewrites transitions** to connect timeout/invalid → Loop → GetCustomerInput
4. **Final attempt** goes directly to timeout/invalid handlers

#### Generated Flow Structure

```
GetCustomerInput (id: "get-input-1")
  OnTimeout → Loop (id: "loop-retry-1")
    ContinueLooping → "get-input-1" (attempts 1-2)
    DoneLooping → timeout handler (attempt 3)
  OnInvalidInput → Loop (id: "loop-retry-2")
    ContinueLooping → "get-input-1"
    DoneLooping → invalid handler
```

#### Advantages

✅ **Zero boilerplate** - Developer doesn't think about Loop actions
✅ **Automatic identifier management** - Framework handles wiring
✅ **Intuitive API** - `MaxAttempts` naturally implies retry
✅ **No breaking changes** - Existing code still works (MaxAttempts defaults to 1)



---

### ⭐ Approach 2: Explicit Loop Builder (More Control)

**Developer Experience**: Explicit retry configuration with fluent builder.

#### Usage

```csharp
var flow = new FlowBuilder()
    .SetName("Explicit Retry Flow")

    .GetCustomerInput("Enter your PIN", input =>
    {
        input.MaxDigits = 4;
        input.TimeoutSeconds = 5;
    })
        .WithRetry(retry =>
        {
            retry.MaxAttempts(3)
                 .OnTimeout(timeout =>
                 {
                     timeout.PlayPrompt("Invalid PIN. Try again.");
                 })
                 .OnMaxAttemptsReached(maxed =>
                 {
                     maxed.PlayPrompt("Too many attempts. Goodbye.")
                          .Disconnect();
                 });
        })
        .OnDigit("1", valid => valid.TransferToQueue("Auth").Disconnect())
        .Build();
```

#### How It Works

1. **`.WithRetry()`** returns a `RetryBuilder`
2. **RetryBuilder** captures retry configuration
3. **Framework generates** Loop actions with proper wiring
4. **`.OnMaxAttemptsReached()`** executes after final attempt

#### Generated Flow Structure

```
GetCustomerInput (id: "get-input-1")
  OnTimeout → PlayPrompt "Try again" → Loop
    ContinueLooping → "get-input-1" (attempts 1-2)
    DoneLooping → PlayPrompt "Too many attempts" → Disconnect
```

#### Advantages

✅ **Explicit control** - Developer sees retry logic clearly
✅ **Per-error retry messages** - Different prompts for each attempt
✅ **Fluent API** - Natural chaining
✅ **Optional** - Don't use if you don't need retry


---

## Example: General-Support-Inbound with Automatic Loop

### Before (Manual Loop - Current Issue)

```csharp
.GetCustomerInput("Press 1 for sales...", input => { })
    .OnTimeout(timeout =>
    {
        // ❌ Can't reference GetCustomerInput identifier
        timeout.Loop(3, "get-input-1", "fallback");  // Hardcoded ID
    })
```

### After (Automatic Loop - Proposed)

```csharp
.GetCustomerInput("Press 1 for sales...", input =>
{
    input.MaxAttempts = 3;  // ✅ Framework handles Loop automatically
})
    .OnTimeout(timeout =>
    {
        // ✅ This only executes after 3rd attempt
        timeout.PlayPrompt("No input. Goodbye.").Disconnect();
    })
```

### Generated JSON (Automatic)

```json
{
  "Actions": [
    {
      "Identifier": "get-input-1",
      "Type": "GetParticipantInput",
      "Transitions": {
        "Errors": [
          {
            "NextAction": "loop-retry-1",
            "ErrorType": "InputTimeLimitExceeded"
          }
        ]
      }
    },
    {
      "Identifier": "loop-retry-1",
      "Type": "Loop",
      "Parameters": {"LoopCount": "3"},
      "Transitions": {
        "NextAction": "play-prompt-timeout",
        "Conditions": [
          {"NextAction": "get-input-1", "Condition": {"Operands": ["ContinueLooping"]}},
          {"NextAction": "play-prompt-timeout", "Condition": {"Operands": ["DoneLooping"]}}
        ]
      }
    },
    {
      "Identifier": "play-prompt-timeout",
      "Type": "MessageParticipant",
      "Parameters": {"Text": "No input. Goodbye."}
    }
  ]
}
```

---

## Developer Experience Comparison

| Approach | Simplicity | Control | Verbosity | Flexibility |
|----------|-----------|---------|-----------|-------------|
| **Automatic (Recommended)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (minimal) | ⭐⭐⭐ |
| **Explicit Retry Builder** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ (moderate) | ⭐⭐⭐⭐⭐ |

---

## Conclusion


**Key Benefits**:
- ✅ Zero breaking changes
- ✅ Intuitive API (`MaxAttempts` naturally implies retry)
- ✅ Framework handles complexity
- ✅ Production-ready IVR patterns


