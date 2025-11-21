# Input Configuration API Reference

Complete API reference for customer input configuration classes.

## InputConfiguration

Main configuration class for customer input with ASR and DTMF support.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Primary` | `PrimaryInputConfiguration` | `new()` | Primary input configuration (typically ASR/Speech) |
| `Fallback` | `FallbackInputConfiguration` | `new()` | Fallback input configuration (typically DTMF) |
| `InputMode` | `InputMode?` | `null` | Overall input mode when not using Primary/Fallback pattern |
| `FallbackTriggers` | `FallbackTrigger` | `FallbackTrigger.AnyError` | Conditions that trigger fallback from primary to secondary input |
| `EnableFallback` | `bool` | `true` | Whether to enable automatic fallback to DTMF when primary input fails |
| `MaxDigits` | `int?` | `null` | Maximum number of digits to collect (for DTMF) |
| `TimeoutSeconds` | `int?` | `null` | Timeout in seconds for customer input |
| `InterDigitTimeoutSeconds` | `int?` | `null` | Inter-digit timeout in seconds (time between DTMF key presses) |
| `IsSequential` | `bool` | *computed* | Determines if this configuration uses the Sequential input pattern (Primary → Fallback) |

### IsSequential Property

Returns `true` when:
- `EnableFallback` is `true`
- `Primary.Mode` is `InputMode.Speech`
- `Fallback.Mode` is `InputMode.DTMF`

```csharp
var config = new InputConfiguration
{
    EnableFallback = true
};
config.Primary.Mode = InputMode.Speech;
config.Fallback.Mode = InputMode.DTMF;

// Returns true
bool isSequential = config.IsSequential;
```

---

## PrimaryInputConfiguration

Configuration for primary input mode (typically ASR/Speech).

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Mode` | `InputMode` | `InputMode.Speech` | Input mode for primary input |
| `LexBot` | `string?` | `null` | Amazon Lex bot name for speech recognition |
| `LexBotAlias` | `string?` | `null` | Amazon Lex bot alias |
| `LexBotVersion` | `string` | `"V2"` | Amazon Lex bot version (e.g., "V2" for Lex V2) |
| `Locale` | `string` | `"en_US"` | Locale/language for Lex bot (e.g., "en_US", "es_US") |
| `Prompt` | `string?` | `null` | Prompt text for ASR input |
| `RetryPrompt` | `string?` | `null` | Retry prompt text when input is not recognized |
| `MaxRetries` | `int` | `2` | Maximum number of retry attempts for ASR |
| `TimeoutSeconds` | `int` | `5` | Timeout in seconds for speech input |
| `ConfidenceThreshold` | `double` | `0.7` | Confidence threshold for speech recognition (0.0 to 1.0). Intent matches below this threshold will be treated as NoMatch |
| `EncryptInput` | `bool` | `false` | Whether to encrypt customer input for PCI compliance |

### Example

```csharp
var config = new InputConfiguration();
config.Primary.Mode = InputMode.Speech;
config.Primary.LexBot = "CustomerServiceBot";
config.Primary.LexBotAlias = "Production";
config.Primary.LexBotVersion = "V2";
config.Primary.Locale = "en_US";
config.Primary.Prompt = "How can I help you today?";
config.Primary.RetryPrompt = "I'm sorry, I didn't catch that. Please try again.";
config.Primary.MaxRetries = 3;
config.Primary.TimeoutSeconds = 5;
config.Primary.ConfidenceThreshold = 0.75; // 75% confidence required
config.Primary.EncryptInput = false;
```

---

## FallbackInputConfiguration

Configuration for fallback input mode (typically DTMF).

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `Mode` | `InputMode` | `InputMode.DTMF` | Input mode for fallback input |
| `PromptText` | `string?` | `null` | Prompt text for DTMF fallback |
| `RetryPrompt` | `string?` | `null` | Retry prompt text when DTMF input is invalid |
| `MaxDigits` | `int` | `1` | Maximum number of digits to collect |
| `MinDigits` | `int?` | `null` | Minimum number of digits required |
| `TerminatingDigit` | `string?` | `null` | Terminating digit (e.g., "#") |
| `TimeoutSeconds` | `int` | `5` | Timeout in seconds for DTMF input |
| `InterDigitTimeoutSeconds` | `int` | `2` | Inter-digit timeout in seconds |
| `MaxRetries` | `int` | `2` | Maximum number of retry attempts for DTMF |
| `EncryptInput` | `bool` | `false` | Whether to encrypt customer input for PCI compliance |

### Example

```csharp
var config = new InputConfiguration();
config.Fallback.Mode = InputMode.DTMF;
config.Fallback.PromptText = "Please use your keypad. Press 1 for sales, 2 for support.";
config.Fallback.RetryPrompt = "Invalid selection. Please press 1 or 2.";
config.Fallback.MaxDigits = 1;
config.Fallback.MinDigits = 1;
config.Fallback.TerminatingDigit = "#";
config.Fallback.TimeoutSeconds = 10;
config.Fallback.InterDigitTimeoutSeconds = 3;
config.Fallback.MaxRetries = 2;
config.Fallback.EncryptInput = false;
```

---

## FallbackTrigger Enum

Defines conditions that trigger fallback from primary input to secondary input. Can be combined using bitwise flags.

### Values

| Value | Description |
|-------|-------------|
| `None` | No fallback - stay with primary input mode |
| `Timeout` | Fallback on timeout (no input received within timeout period) |
| `InvalidInput` | Fallback on invalid input (input doesn't match expected format) |
| `NoMatch` | Fallback on no match (intent not recognized or confidence too low) |
| `Error` | Fallback on error (system error during input collection) |
| `LowConfidence` | Fallback on low confidence (confidence score below threshold) |
| `MaxRetriesExceeded` | Fallback on maximum retries exceeded |
| `AnyError` | Fallback on any error condition (Timeout \| InvalidInput \| NoMatch \| Error \| LowConfidence) |
| `All` | Fallback on all conditions (includes MaxRetriesExceeded) |

### Examples

```csharp
// Single trigger
config.FallbackTriggers = FallbackTrigger.Timeout;

// Multiple triggers using bitwise OR
config.FallbackTriggers = FallbackTrigger.Timeout | FallbackTrigger.NoMatch;

// Predefined combination: Any error
config.FallbackTriggers = FallbackTrigger.AnyError;

// Check if specific trigger is set
if (config.FallbackTriggers.HasFlag(FallbackTrigger.Timeout))
{
    // Timeout trigger is enabled
}
```

### Predefined Combinations

**AnyError:**
```csharp
FallbackTrigger.AnyError =
    FallbackTrigger.Timeout |
    FallbackTrigger.InvalidInput |
    FallbackTrigger.NoMatch |
    FallbackTrigger.Error |
    FallbackTrigger.LowConfidence;
```

**All:**
```csharp
FallbackTrigger.All =
    FallbackTrigger.Timeout |
    FallbackTrigger.InvalidInput |
    FallbackTrigger.NoMatch |
    FallbackTrigger.Error |
    FallbackTrigger.LowConfidence |
    FallbackTrigger.MaxRetriesExceeded;
```

---

## InputMode Enum

Defines the input mode for customer interactions.

### Values

| Value | Description |
|-------|-------------|
| `Speech` | Speech recognition (ASR) using Amazon Lex |
| `DTMF` | Dual-tone multi-frequency (DTMF) keypad input |
| `Both` | Both speech and DTMF accepted simultaneously |
| `Sequential` | Sequential input mode where primary input (typically ASR) is attempted first, with automatic fallback to secondary input (typically DTMF) based on configured triggers |

### Example

```csharp
// Speech only
config.Primary.Mode = InputMode.Speech;

// DTMF only
config.Fallback.Mode = InputMode.DTMF;

// Both simultaneously (not recommended - use Sequential instead)
config.InputMode = InputMode.Both;

// Sequential (Primary → Fallback)
config.Primary.Mode = InputMode.Speech;
config.Fallback.Mode = InputMode.DTMF;
config.EnableFallback = true;
// config.IsSequential will return true
```

---

## Complete Example

```csharp
.GetCustomerInput(input =>
{
    // ===== PRIMARY: Speech Recognition =====
    input.Primary.Mode = InputMode.Speech;
    input.Primary.LexBot = "CustomerServiceBot";
    input.Primary.LexBotAlias = "Production";
    input.Primary.LexBotVersion = "V2";
    input.Primary.Locale = "en_US";
    input.Primary.Prompt = "How can I help you today?";
    input.Primary.RetryPrompt = "I'm sorry, I didn't understand. Please try again.";
    input.Primary.MaxRetries = 3;
    input.Primary.TimeoutSeconds = 5;
    input.Primary.ConfidenceThreshold = 0.75;
    input.Primary.EncryptInput = false;

    // ===== FALLBACK: DTMF =====
    input.Fallback.Mode = InputMode.DTMF;
    input.Fallback.PromptText = "Please use your keypad. Press 1 for sales, 2 for support.";
    input.Fallback.RetryPrompt = "Invalid selection. Please press 1 or 2.";
    input.Fallback.MaxDigits = 1;
    input.Fallback.MinDigits = 1;
    input.Fallback.TerminatingDigit = "#";
    input.Fallback.TimeoutSeconds = 10;
    input.Fallback.InterDigitTimeoutSeconds = 3;
    input.Fallback.MaxRetries = 2;
    input.Fallback.EncryptInput = false;

    // ===== FALLBACK TRIGGERS =====
    input.FallbackTriggers = FallbackTrigger.Timeout |
                            FallbackTrigger.NoMatch |
                            FallbackTrigger.LowConfidence;
    input.EnableFallback = true;

    // This will return true:
    // bool isSequential = input.IsSequential;
})
.OnDigit("1", sales => sales.TransferToQueue("Sales"))
.OnDigit("2", support => support.TransferToQueue("Support"))
.OnTimeout(timeout => timeout.Disconnect())
```

---

## See Also

- [Customer Input Handling Guide](/guide/flows/input-handling)
- [Flow Builders Reference](/guide/flows/fluent-builders)
- [InputRouter API](/reference/input-router)
