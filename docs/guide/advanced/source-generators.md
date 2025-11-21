# Source Generators

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Switchboard uses C# source generators to automatically create flow implementations from your attribute-decorated classes. This eliminates boilerplate code and ensures consistency across your contact center infrastructure.

## What Are Source Generators?

Source generators are compile-time code generators that analyze your code and produce additional C# source files. They run as part of the compiler pipeline, so generated code is available immediately with full IntelliSense support.

```
Your Code (Attributes)
        ↓
Roslyn Compiler
        ↓
Source Generator Analysis
        ↓
Generated Code (automatic)
        ↓
Final Compilation
```

## How Switchboard Uses Generators

### Input: Your Attributed Class

```csharp
[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow : FlowDefinitionBase
{
    [Message("Welcome to our contact center")]
    public partial void Welcome();

    [TransferToQueue("GeneralSupport")]
    public partial void Transfer();
}
```

### Output: Generated Implementation

The source generator automatically creates:

```csharp
// WelcomeFlow.g.cs (generated)
public partial class WelcomeFlow
{
    private readonly List<IAction> _actions = new();

    public partial void Welcome()
    {
        _actions.Add(new MessageAction
        {
            Identifier = "Welcome-001",
            Text = "Welcome to our contact center",
            Transitions = new Transitions { NextAction = "Transfer-001" }
        });
    }

    public partial void Transfer()
    {
        _actions.Add(new TransferToQueueAction
        {
            Identifier = "Transfer-001",
            QueueName = "GeneralSupport"
        });
    }

    public override CfnContactFlow BuildCdkConstruct(Construct scope)
    {
        // Execute methods to populate actions
        Welcome();
        Transfer();

        return new CfnContactFlow(scope, "WelcomeFlow", new CfnContactFlowProps
        {
            Name = "WelcomeFlow",
            Type = "CONTACT_FLOW",
            Content = SerializeActions(_actions),
            InstanceArn = GetInstanceArn(scope)
        });
    }
}
```

## Built-In Generators

Switchboard includes several source generators:

### 1. FlowDefinitionGenerator

Generates flow implementations from `[ContactFlow]` attributes.

**See:** [Reference: Source Generators](/reference/source-generators) for complete details.

### 2. DynamoDbSchemaGenerator

Generates DynamoDB table definitions from configuration models.

### 3. LambdaHandlerGenerator

Creates Lambda function handlers for dynamic configuration.

## Viewing Generated Code

### Visual Studio

1. Expand project in Solution Explorer
2. Navigate to **Dependencies → Analyzers → NickSoftware.Switchboard.SourceGenerators**
3. View generated `.g.cs` files

### Rider

1. Right-click project → **Navigate To → Generated Files**
2. Browse generated source files

### Command Line

Generated files are in:
```
obj/Debug/net10.0/generated/NickSoftware.Switchboard.SourceGenerators/
```

## Benefits

1. **✅ Less boilerplate** - Write declarations, get implementations
2. **✅ Compile-time generation** - No runtime overhead
3. **✅ Type safety** - Generated code is strongly typed
4. **✅ IntelliSense support** - Full IDE integration
5. **✅ Consistency** - Same patterns across all flows

## Next Steps

- **[Reference: Source Generators](/reference/source-generators)** - Complete generator documentation
- **[Roslyn Analyzers](/guide/advanced/analyzers)** - Compile-time validation
- **[Attribute-Based Flows](/guide/flows/attribute-based)** - Using attributes
- **[Architecture](/guide/architecture)** - How generators fit in

## Related Resources

- [Attributes](/guide/attributes) - Declarative configuration
- [Flow Basics](/guide/flows/basics) - Building flows
