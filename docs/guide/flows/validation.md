# Flow Validation

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard provides comprehensive validation at multiple stages to ensure your contact flows are correct before deployment. This guide covers compile-time validation (Roslyn analyzers), build-time validation, and runtime validation.

## Validation Layers

```
┌─────────────────────────────────────────┐
│   Compile-Time (Roslyn Analyzers)       │
│   • Queue references exist               │
│   • Action ordering valid                │
│   • Required parameters present          │
│   • Type safety                          │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Build-Time (CDK Synthesis)             │
│   • Flow structure valid                 │
│   • No circular dependencies             │
│   • All transitions valid                │
└─────────────┬───────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Runtime (Dynamic Configuration)        │
│   • Config values within bounds          │
│   • External resources accessible        │
│   • Lambda functions exist               │
└──────────────────────────────────────────┘
```

## Compile-Time Validation

### Roslyn Analyzers

Switchboard includes analyzers that validate code while you write it:

#### SWB001: Queue Reference Validation

```csharp
// ✅ Valid - queue exists
[Queue("Sales")]
[ContactFlow("SalesFlow")]
public partial class SalesFlow
{
    [TransferToQueue("Sales")]  // ✅ OK
    public partial void Transfer();
}

// ❌ Error SWB001
[ContactFlow("InvalidFlow")]
public partial class InvalidFlow
{
    [TransferToQueue("NonExistent")]  // ❌ Queue not defined
    public partial void Transfer();
}
// Error: Queue 'NonExistent' is not defined in this flow
```

#### SWB002: Required Parameters

```csharp
// ✅ Valid - all required params
[GetUserInput("Enter PIN", MaxDigits = 4)]
public partial void GetPin();

// ❌ Error SWB002
[GetUserInput(MaxDigits = 4)]  // Missing required 'Prompt'
public partial void GetInput();
// Error: GetUserInput requires 'Prompt' parameter
```

#### SWB003: Action Attribute Conflicts

```csharp
// ❌ Error SWB003
[Message("Hello")]
[TransferToQueue("Sales")]  // Can't have two actions
public partial void Invalid();
// Error: Multiple action attributes not allowed on same method
```

#### SWB004: Branch Target Validation

```csharp
[ContactFlow("MenuFlow")]
public partial class MenuFlow
{
    // ✅ Valid - target exists
    [GetUserInput("Press 1", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Sales))]
    public partial void Menu();

    [TransferToQueue("Sales")]
    public partial void Sales();
}

[ContactFlow("InvalidMenuFlow")]
public partial class InvalidMenuFlow
{
    // ❌ Error SWB004
    [GetUserInput("Press 1", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(NonExistent))]
    public partial void Menu();
    // Error: Branch target 'NonExistent' does not exist
}
```

#### SWB005: Circular Flow Detection

```csharp
// ❌ Error SWB005
[ContactFlow("CircularFlow")]
public partial class CircularFlow
{
    [Message("Step 1")]
    [Loop(Target = nameof(Step2))]
    public partial void Step1();

    [Message("Step 2")]
    [Loop(Target = nameof(Step1))]  // Circular reference
    public partial void Step2();
}
// Warning: Potential infinite loop detected
```

### Code Fixes

Analyzers provide automatic fixes:

```csharp
// Before (analyzer detects issue)
[TransferToQueue("Suport")]  // Typo
public partial void Transfer();

// Analyzer suggests:
// 💡 Did you mean 'Support'?
//    (Ctrl+. to apply fix)

// After (auto-fixed)
[TransferToQueue("Support")]
public partial void Transfer();
```

## Build-Time Validation

### CDK Synthesis Validation

During `cdk synth`, Switchboard validates:

#### Flow Structure

```csharp
[ContactFlow("ValidFlow")]
public partial class ValidFlow
{
    [Message("Hello")]
    public partial void Hello();  // ✅ Has actions

    // ✅ Flow has at least one action
}

// ❌ Build error
[ContactFlow("EmptyFlow")]
public partial class EmptyFlow
{
    // ❌ No actions defined
}
// Error: Flow 'EmptyFlow' has no actions
```

#### Transition Validity

```csharp
// All branches must lead somewhere valid
[GetUserInput("Press 1", MaxDigits = 1)]
[Branch(OnDigit = "1", Target = nameof(ValidTarget))]
[Branch(OnDigit = "2", Target = nameof(AnotherValid))]
public partial void Menu();

[TransferToQueue("Sales")]
public partial void ValidTarget();

[TransferToQueue("Support")]
public partial void AnotherValid();
// ✅ All branches have valid targets
```

#### Resource Dependencies

```csharp
[ContactFlow("DependentFlow")]
[Queue("PrimaryQueue")]  // Must be defined before use
public partial class DependentFlow
{
    [TransferToQueue("PrimaryQueue")]  // ✅ Queue defined
    public partial void Transfer();
}
```

### Custom Validators

Implement custom validation logic:

```csharp
public class CustomFlowValidator : IFlowValidator
{
    public ValidationResult Validate(IContactFlow flow)
    {
        var errors = new List<string>();

        // Rule: All flows must have at least one queue transfer
        var hasTransfer = flow.Actions.Any(a => a is TransferToQueueAction);
        if (!hasTransfer)
        {
            errors.Add($"Flow '{flow.Name}' must have at least one queue transfer");
        }

        // Rule: Messages must be under 1000 characters
        var longMessages = flow.Actions
            .OfType<MessageAction>()
            .Where(m => m.Text.Length > 1000);

        foreach (var msg in longMessages)
        {
            errors.Add($"Message text exceeds 1000 characters");
        }

        return new ValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors
        };
    }
}

// Register validator
builder.Services.AddSingleton<IFlowValidator, CustomFlowValidator>();
```

## Runtime Validation

### Configuration Validation

Validate dynamic configuration values:

```csharp
public class ConfigValidator : IConfigValidator
{
    public ValidationResult Validate(FlowConfig config)
    {
        var errors = new List<string>();

        // Validate queue timeout
        if (config.Parameters.TryGetValue("maxQueueTime", out var timeout))
        {
            var timeoutValue = (int)timeout;
            if (timeoutValue < 30 || timeoutValue > 3600)
            {
                errors.Add("maxQueueTime must be between 30 and 3600 seconds");
            }
        }

        // Validate message length
        if (config.Parameters.TryGetValue("welcomeMessage", out var message))
        {
            var messageText = message?.ToString();
            if (string.IsNullOrWhiteSpace(messageText))
            {
                errors.Add("welcomeMessage cannot be empty");
            }
            if (messageText?.Length > 1000)
            {
                errors.Add("welcomeMessage exceeds 1000 character limit");
            }
        }

        return new ValidationResult { IsValid = errors.Count == 0, Errors = errors };
    }
}
```

### Lambda Validation

Validate Lambda function availability:

```csharp
[ContactFlow("LambdaFlow")]
public partial class LambdaFlow
{
    [InvokeLambda("CustomerLookup")]
    [ValidateLambdaExists]  // Validates Lambda exists before invocation
    public partial void CallLambda();
}
```

## Validation Attributes

### Built-In Validators

```csharp
// Validate string length
[Message(ConfigKey = "welcomeMessage")]
[ValidateLength(MinLength = 1, MaxLength = 1000)]
public partial void Welcome();

// Validate numeric range
[SetAttribute("Priority", ConfigKey = "priority")]
[ValidateRange(Min = 1, Max = 10)]
public partial void SetPriority();

// Validate pattern/regex
[GetUserInput("Enter account number", MaxDigits = 8)]
[ValidatePattern(@"^\d{8}$", ErrorMessage = "Must be 8 digits")]
public partial void GetAccount();

// Validate queue exists
[TransferToQueue(ConfigKey = "queue")]
[ValidateQueue]
public partial void Transfer();

// Validate Lambda exists
[InvokeLambda(ConfigKey = "lambda")]
[ValidateLambdaExists]
public partial void CallLambda();
```

### Custom Validation Attributes

```csharp
[AttributeUsage(AttributeTargets.Method)]
public class ValidateBusinessHoursAttribute : ValidationAttribute
{
    public override ValidationResult Validate(object value, ValidationContext context)
    {
        var hours = value as string;
        if (string.IsNullOrEmpty(hours))
        {
            return new ValidationResult("Business hours required");
        }

        // Custom validation logic
        if (!IsValidBusinessHours(hours))
        {
            return new ValidationResult("Invalid business hours format");
        }

        return ValidationResult.Success;
    }

    private bool IsValidBusinessHours(string hours)
    {
        // Validation logic
        return true;
    }
}

// Usage
[ContactFlow("BusinessFlow")]
public partial class BusinessFlow
{
    [SetAttribute("Hours", ConfigKey = "businessHours")]
    [ValidateBusinessHours]
    public partial void SetHours();
}
```

## Testing Validation

### Unit Test Validators

```csharp
public class FlowValidatorTests
{
    [Fact]
    public void Validator_ShouldRejectEmptyFlow()
    {
        // Arrange
        var validator = new FlowStructureValidator();
        var emptyFlow = new ContactFlow { Name = "Empty", Actions = new List<IAction>() };

        // Act
        var result = validator.Validate(emptyFlow);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("no actions"));
    }

    [Fact]
    public void Validator_ShouldAcceptValidFlow()
    {
        // Arrange
        var validator = new FlowStructureValidator();
        var validFlow = new ContactFlow
        {
            Name = "Valid",
            Actions = new List<IAction>
            {
                new MessageAction { Text = "Hello" },
                new TransferToQueueAction { QueueName = "Support" }
            }
        };

        // Act
        var result = validator.Validate(validFlow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
```

### Integration Test Validation

```csharp
public class FlowValidationIntegrationTests
{
    [Fact]
    public async Task Flow_ShouldFailValidation_WhenQueueDoesNotExist()
    {
        // Arrange
        var app = new App();
        var stack = new SwitchboardStack(app, "TestStack");

        // Act
        Action act = () =>
        {
            var flow = new InvalidFlow();  // References non-existent queue
            flow.BuildCdkConstruct(stack);
        };

        // Assert
        act.Should().Throw<ValidationException>()
            .WithMessage("*Queue*not defined*");
    }
}
```

## Best Practices

### 1. Validate Early

```csharp
// ✅ Good: Compile-time validation
[TransferToQueue("Sales")]  // Analyzer checks immediately
public partial void Transfer();

// ❌ Bad: No validation until deployment
var queueName = config["queue"];  // Could be typo, found only at runtime
```

### 2. Provide Clear Error Messages

```csharp
// ✅ Good: Descriptive error
[ValidateLength(MinLength = 1, MaxLength = 100,
    ErrorMessage = "Welcome message must be 1-100 characters")]
public partial void Welcome();

// ❌ Bad: Generic error
[ValidateLength(MinLength = 1, MaxLength = 100)]
public partial void Welcome();
// Error: "Validation failed"
```

### 3. Use Multiple Validators

```csharp
[Message(ConfigKey = "greeting")]
[ValidateLength(MinLength = 1, MaxLength = 500)]
[ValidatePattern(@"^[A-Za-z0-9\s,.!?]+$", ErrorMessage = "Invalid characters")]
[ValidateNotEmpty]
public partial void Greeting();
```

### 4. Test Validation Logic

```csharp
[Fact]
public void CustomValidator_ShouldRejectInvalidInput()
{
    var validator = new CustomValidator();
    var result = validator.Validate(invalidInput);
    result.IsValid.Should().BeFalse();
}
```

### 5. Handle Validation Errors Gracefully

```csharp
try
{
    await configManager.UpdateAsync("Flow", config);
}
catch (ValidationException ex)
{
    logger.LogError(ex, "Configuration validation failed");
    // Display user-friendly error message
    // Don't deploy invalid config
}
```

## Validation Reference

### Analyzer Rules

| Rule | Description | Severity |
|------|-------------|----------|
| SWB001 | Queue reference not found | Error |
| SWB002 | Missing required parameter | Error |
| SWB003 | Multiple action attributes | Error |
| SWB004 | Invalid branch target | Error |
| SWB005 | Circular flow dependency | Warning |
| SWB006 | Unreachable code | Warning |
| SWB007 | Missing error handling | Warning |

### Built-In Validators

| Validator | Purpose |
|-----------|---------|
| `ValidateLength` | String length validation |
| `ValidateRange` | Numeric range validation |
| `ValidatePattern` | Regex pattern matching |
| `ValidateQueue` | Queue existence check |
| `ValidateLambdaExists` | Lambda availability check |
| `ValidateNotEmpty` | Non-empty string validation |
| `ValidateEnum` | Enum value validation |

## Next Steps

- **[Roslyn Analyzers](/guide/advanced/analyzers)** - All analyzer rules
- **[Source Generators](/guide/advanced/source-generators)** - Code generation details
- **[Testing](/)** - Testing strategies
- **[Deployment](/guide/deployment/environments)** - Pre-deployment validation

## Related Resources

- [Flow Basics](/guide/flows/basics) - Flow fundamentals
- [Attribute-Based](/guide/flows/attribute-based) - Declarative flows
- [Reference: Analyzers](/reference/analyzers) - Complete analyzer reference
