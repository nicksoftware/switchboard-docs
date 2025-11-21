# Sequential Input Mode - Foundation Building Blocks

## Overview

Sequential Input Mode in Amazon Connect requires **TWO separate GetParticipantInput blocks**:
1. **ASR Block** (Automatic Speech Recognition using Amazon Lex)
2. **DTMF Block** (Touch-tone keypad fallback)

This framework provides **foundation building blocks** that give developers full control to manually construct this pattern.

## Foundation API

### AsrInput() - ASR Block Builder

Creates an ASR (Automatic Speech Recognition) input block using Amazon Lex.

```csharp
IInputBuilder AsrInput(
    string promptText,
    string lexBotName,
    Action<LexBotConfiguration>? configure = null
)
```

**Parameters:**
- `promptText`: The prompt to speak to the customer
- `lexBotName`: Amazon Lex bot name
- `configure`: Optional configuration for Lex settings

**Default Configuration:**
```csharp
{
    BotAlias = "$LATEST",
    BotVersion = "V2",
    Locale = "en_US",
    ConfidenceThreshold = 0.4
}
```

**Returns:** `IInputBuilder` for configuring intent branches and error handling

### DtmfInput() - DTMF Block Builder

Creates a DTMF (touch-tone keypad) input block.

```csharp
IInputBuilder DtmfInput(
    string promptText,
    Action<GetCustomerInputAction>? configure = null
)
```

**Parameters:**
- `promptText`: The prompt to speak to the customer
- `configure`: Optional configuration for DTMF settings

**Default Configuration:**
```csharp
{
    InputType = CustomerInputType.DTMF,
    MaxDigits = 1,
    TimeoutSeconds = 5,
    TerminatingDigit = "#"
}
```

**Returns:** `IInputBuilder` for configuring digit branches and error handling

## Manual Two-Block Pattern

### Basic Example

```csharp
var flow = new FlowBuilder()
    .SetName("SequentialFlow")

    // BLOCK 1: ASR Input
    .AsrInput("Say Sales or Support", "CustomerSupportBot", config =>
    {
        config.ConfidenceThreshold = 0.6;
    })
        .OnIntent("SalesIntent", sales => sales
            .TransferToQueue("Sales-Queue")
            .Disconnect())

        .OnIntent("SupportIntent", support => support
            .TransferToQueue("Support-Queue")
            .Disconnect())

        // ASR errors route to DTMF fallback
        .OnTimeout(timeout => timeout
            .DtmfInput("Press 1 for Sales, 2 for Support")
                .OnDigit("1", d => d.TransferToQueue("Sales-Queue"))
                .OnDigit("2", d => d.TransferToQueue("Support-Queue"))
                .OnTimeout(t => t.Disconnect())
                .OnError(e => e.Disconnect()))

        .OnError(error => error
            .DtmfInput("Press 1 for Sales, 2 for Support")
                .OnDigit("1", d => d.TransferToQueue("Sales-Queue"))
                .OnDigit("2", d => d.TransferToQueue("Support-Queue"))
                .OnTimeout(t => t.Disconnect())
                .OnError(e => e.Disconnect()))

    .Build();
```

## Advanced Pattern: Using Helper Methods

To avoid code duplication, extract the DTMF block into a reusable helper method:

```csharp
IFlowBuilder BuildDtmfFallback(IFlowBuilder builder)
{
    return builder
        .DtmfInput("I didn't catch that. Press 1 for Sales, 2 for Support")
            .OnDigit("1", d => d.TransferToQueue("Sales-Queue").Disconnect())
            .OnDigit("2", d => d.TransferToQueue("Support-Queue").Disconnect())
            .OnTimeout(timeout => timeout.Disconnect())
            .OnError(error => error.Disconnect());
}

var flow = new FlowBuilder()
    .AsrInput("Say Sales or Support", "CustomerSupportBot")
        .OnIntent("SalesIntent", sales => sales.TransferToQueue("Sales-Queue"))
        .OnIntent("SupportIntent", support => support.TransferToQueue("Support-Queue"))

        // Reuse helper for all ASR errors
        .OnTimeout(timeout => BuildDtmfFallback(timeout))
        .OnError(error => BuildDtmfFallback(error))
        .OnDefault(def => BuildDtmfFallback(def))

    .Build();
```

## Generated JSON Structure

### ASR Block (Block 1)

```json
{
  "Identifier": "asr-input-2",
  "Type": "GetParticipantInput",
  "Parameters": {
    "Text": "Say Sales or Support",
    "LexBot": "CustomerSupportBot",
    "LexAlias": "$LATEST",
    "LexVersion": "V2",
    "LexLocale": "en_US",
    "Timeout": "5",
    "ConfidenceThreshold": "0.6"
  },
  "Transitions": {
    "Conditions": [
      {
        "NextAction": "...",
        "Condition": {
          "Operator": "Equals",
          "Operands": ["SalesIntent"]
        }
      }
    ],
    "Errors": [
      {
        "NextAction": "dtmf-input-11",
        "ErrorType": "InputTimeLimitExceeded"
      },
      {
        "NextAction": "dtmf-input-21",
        "ErrorType": "NoMatchingError"
      }
    ]
  }
}
```

### DTMF Block (Block 2)

```json
{
  "Identifier": "dtmf-input-11",
  "Type": "GetParticipantInput",
  "Parameters": {
    "Text": "I didn't catch that. Press 1 for Sales, 2 for Support.",
    "StoreInput": "False",
    "InputTimeLimitSeconds": "5",
    "MaxDigits": "1",
    "TerminatingDigit": "#"
  },
  "Transitions": {
    "Conditions": [
      {
        "NextAction": "...",
        "Condition": {
          "Operator": "Equals",
          "Operands": ["$.StoredCustomerInput", "1"]
        }
      }
    ],
    "Errors": [
      {
        "NextAction": "disconnect",
        "ErrorType": "InputTimeLimitExceeded"
      }
    ]
  }
}
```

## Key Features

✅ **Full Developer Control**: Explicitly create and wire ASR and DTMF blocks
✅ **Type-Safe Configuration**: Strongly-typed Lex and DTMF settings
✅ **Flat Parameter Structure**: No nested `InputConfiguration` object
✅ **Clear Intent Routing**: Intent branches in ASR block only
✅ **Clear Digit Routing**: Digit branches in DTMF block only
✅ **Manual Error Routing**: Developer controls how ASR errors route to DTMF
✅ **No Magic**: Transparent two-block creation visible in code

## Branch Types

### ASR Block Branches
- `.OnIntent(intentName, configure)` - Route based on Lex intent
- `.OnTimeout(configure)` - ASR timeout (route to DTMF)
- `.OnError(configure)` - ASR error (route to DTMF)
- `.OnDefault(configure)` - No matching intent (route to DTMF)

### DTMF Block Branches
- `.OnDigit(digit, configure)` - Route based on keypress
- `.OnTimeout(configure)` - DTMF timeout (terminal error)
- `.OnError(configure)` - DTMF error (terminal error)
- `.OnDefault(configure)` - Invalid digit (terminal error)

## Design Philosophy

This foundation approach prioritizes:

1. **Transparency**: Developers see exactly what blocks are created
2. **Control**: Full control over routing and configuration
3. **Flexibility**: Can customize any aspect of ASR or DTMF blocks
4. **Simplicity**: Direct API without hidden transformations
5. **Predictability**: Code structure matches JSON structure

## Comparison: Foundation vs. Automatic Orchestration

| Aspect | Foundation (Manual) | Automatic Orchestration |
|--------|-------------------|------------------------|
| **Control** | Full control | Opinionated defaults |
| **Transparency** | Explicit two-block creation | Hidden splitting logic |
| **Flexibility** | Can customize everything | Limited to framework patterns |
| **Code Clarity** | Clear what blocks are created | Must understand framework magic |
| **Advanced Scenarios** | Easily supported | May require workarounds |
| **Learning Curve** | Steeper (must understand pattern) | Easier (framework handles it) |

## When to Use Foundation API

Use the foundation building blocks when:

- You need **full control** over ASR and DTMF configuration
- You want to implement **custom fallback logic**
- You're building **advanced Sequential patterns** (multi-level, conditional)
- You prefer **explicit code** over framework magic
- You need to **debug or troubleshoot** the two-block pattern
- You want **maximum flexibility** for error routing

## Examples

See complete working examples in:
- [SequentialFoundationExample.cs](../examples/Playground/SequentialFoundationExample.cs)

## Next Steps

For automatic orchestration (simpler API with less control), see:
- [Sequential Input Mode Documentation](./SEQUENTIAL-INPUT-MODE.md) *(to be created)*
