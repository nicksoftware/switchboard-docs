# Roslyn Analyzers

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard includes Roslyn analyzers that provide compile-time validation of your contact flows. These analyzers catch errors as you write code, before you even build or deploy.

## What Are Roslyn Analyzers?

Roslyn analyzers are code analysis tools that run inside the C# compiler. They examine your code and provide:

- **Real-time error detection** - See issues while typing
- **Code fixes** - Automatic corrections
- **Warnings** - Potential issues
- **Best practice suggestions** - Improve code quality

## Built-In Analyzer Rules

### SWB001: Queue Reference Not Found

Ensures queue references are valid.

```csharp
// ❌ Error
[TransferToQueue("NonExistent")]
public partial void Transfer();
// Error SWB001: Queue 'NonExistent' is not defined

// ✅ Fix: Define queue first
[Queue("Support")]
[ContactFlow("MyFlow")]
public partial class MyFlow
{
    [TransferToQueue("Support")]  // ✅ OK
    public partial void Transfer();
}
```

###SWB002: Missing Required Parameter

```csharp
// ❌ Error
[GetUserInput(MaxDigits = 4)]  // Missing 'Prompt'
public partial void GetInput();
// Error SWB002: GetUserInput requires 'Prompt' parameter

// ✅ Fix
[GetUserInput("Enter PIN", MaxDigits = 4)]
public partial void GetInput();
```

### SWB003: Multiple Action Attributes

```csharp
// ❌ Error
[Message("Hello")]
[TransferToQueue("Sales")]
public partial void Action();
// Error SWB003: Multiple action attributes not allowed

// ✅ Fix: Separate into two methods
[Message("Hello")]
public partial void SayHello();

[TransferToQueue("Sales")]
public partial void Transfer();
```

**See:** [Reference: Analyzers](/reference/analyzers) for all analyzer rules.

## Code Fixes

Analyzers provide automatic fixes:

```csharp
// Typo detected
[TransferToQueue("Suport")]
public partial void Transfer();

// 💡 Suggested fix (Ctrl+. or Alt+Enter)
// "Did you mean 'Support'?"

// Apply fix → automatically corrected
[TransferToQueue("Support")]
public partial void Transfer();
```

## Configuring Analyzers

### Suppress Specific Warnings

```csharp
#pragma warning disable SWB005
[Loop(Target = nameof(Retry), MaxIterations = 10)]
public partial void Retry();
#pragma warning restore SWB005
```

### Configure in .editorconfig

```ini
# .editorconfig
[*.cs]

# Treat SWB001 as error
dotnet_diagnostic.SWB001.severity = error

# Treat SWB005 as warning
dotnet_diagnostic.SWB005.severity = warning

# Disable SWB007
dotnet_diagnostic.SWB007.severity = none
```

## Next Steps

- **[Reference: Analyzers](/reference/analyzers)** - Complete rule reference
- **[Source Generators](/guide/advanced/source-generators)** - Code generation
- **[Flow Validation](/guide/flows/validation)** - All validation layers
