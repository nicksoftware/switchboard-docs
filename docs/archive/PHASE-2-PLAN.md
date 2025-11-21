# Switchboard Framework - Phase 2 Implementation Plan

## 🎯 Phase 2 Goals

Transform the POC into a **production-ready, developer-friendly framework** with advanced features:

1. **Compile-Time Safety** - Catch errors before deployment
2. **Enhanced Developer Experience** - Rich IntelliSense, code generation, validation
3. **Advanced Flow Building** - Attributes, conditions, branching, loops
4. **Dynamic Configuration** - Environment-based settings, parameter injection
5. **Multi-Region Support** - Deploy across AWS regions easily
6. **Testing & Validation** - Unit tests, integration tests, flow validation

---

## 📋 Phase 2 Features Breakdown

### 1. Source Generators (High Priority)

**Goal**: Auto-generate boilerplate code at compile-time using Roslyn.

#### 1.1 Flow Action Generator
- **Input**: Attribute-decorated methods in user code
- **Output**: FlowBuilder extension methods

**Example**:
```csharp
// User writes this:
[FlowAction("CheckAccountBalance")]
public class CheckAccountBalanceAction
{
    [Parameter] public string AccountId { get; set; }
    [Parameter] public string CustomerId { get; set; }

    [Transition("Success")] public string OnSuccess { get; set; }
    [Transition("Error")] public string OnError { get; set; }
}

// Generator creates this:
public static class FlowBuilderExtensions
{
    public static IFlowBuilder CheckAccountBalance(
        this IFlowBuilder builder,
        string accountId,
        string customerId,
        string? identifier = null)
    {
        var action = new CheckAccountBalanceAction
        {
            Identifier = identifier ?? builder.GenerateIdentifier("check-account"),
            AccountId = accountId,
            CustomerId = customerId
        };

        return builder.AddAction(action);
    }
}
```

#### 1.2 CDK Construct Generator
- Auto-generate CDK constructs from flow definitions
- Generate TypeScript definitions for cross-language support

**Files to Create**:
- `src/Switchboard.SourceGenerators/FlowActionGenerator.cs`
- `src/Switchboard.SourceGenerators/ConstructGenerator.cs`
- `src/Switchboard.SourceGenerators/Attributes/FlowActionAttribute.cs`
- `src/Switchboard.SourceGenerators/Attributes/ParameterAttribute.cs`
- `src/Switchboard.SourceGenerators/Attributes/TransitionAttribute.cs`

#### 1.3 Configuration Generator
- Generate strongly-typed configuration classes from JSON/YAML
- Environment-specific settings (dev, staging, prod)

**Example**:
```csharp
// appsettings.json
{
  "Connect": {
    "Regions": ["us-east-1", "eu-west-1"],
    "InstanceAlias": "my-call-center",
    "Queues": {
      "Sales": { "MaxContacts": 50 },
      "Support": { "MaxContacts": 100 }
    }
  }
}

// Generator creates:
public class ConnectConfiguration
{
    public string[] Regions { get; set; }
    public string InstanceAlias { get; set; }
    public Dictionary<string, QueueConfig> Queues { get; set; }
}
```

---

### 2. Roslyn Analyzers (High Priority)

**Goal**: Provide real-time compile-time validation and warnings.

#### 2.1 Flow Validation Analyzer
- **Rule**: Flows must have at least one action
- **Rule**: Flows must end with Disconnect or TransferToQueue
- **Rule**: All transitions must point to valid action identifiers
- **Rule**: No circular references in flow logic

**Example Diagnostic**:
```csharp
var flow = new FlowBuilder()
    .SetName("MainFlow")
    .PlayPrompt("Hello")
    // Missing .Disconnect() or .TransferToQueue()
    .Build(); // ❌ SWB001: Flow must end with a terminal action

// Analyzer suggests: Add .Disconnect() or .TransferToQueue()
```

#### 2.2 Parameter Validation Analyzer
- **Rule**: Required parameters (QueueName, PromptText) must not be null/empty
- **Rule**: Parameter types must match Amazon Connect API expectations
- **Rule**: ARN formats must be valid

**Example**:
```csharp
builder.TransferToQueue(""); // ❌ SWB002: Queue name cannot be empty
builder.PlayPrompt(null); // ❌ SWB003: Prompt text is required
```

#### 2.3 CDK Best Practices Analyzer
- **Rule**: Instance names must be globally unique
- **Rule**: Queue names must follow naming conventions
- **Rule**: Hours of Operation must have at least one day configured

**Files to Create**:
- `src/Switchboard.Analyzers/FlowValidationAnalyzer.cs`
- `src/Switchboard.Analyzers/ParameterValidationAnalyzer.cs`
- `src/Switchboard.Analyzers/CdkBestPracticesAnalyzer.cs`
- `src/Switchboard.Analyzers/DiagnosticIds.cs` (SWB001-SWB999)

---

### 3. Advanced Flow Actions (Medium Priority)

#### 3.1 Conditional Branching
```csharp
var flow = new FlowBuilder()
    .SetName("CustomerServiceFlow")
    .GetCustomerInput("Press 1 for Sales, 2 for Support", input =>
    {
        input.MaxDigits = 1;
        input.TimeoutSeconds = 5;
    })
    .Branch(conditions =>
    {
        conditions
            .When("$.CustomerInput == \"1\"", then => then
                .PlayPrompt("Transferring to Sales")
                .TransferToQueue("Sales"))
            .When("$.CustomerInput == \"2\"", then => then
                .PlayPrompt("Transferring to Support")
                .TransferToQueue("Support"))
            .Otherwise(otherwise => otherwise
                .PlayPrompt("Invalid input. Please try again.")
                .Disconnect());
    })
    .Build();
```

#### 3.2 Loop/Retry Logic
```csharp
.Retry(maxAttempts: 3, action => action
    .InvokeLambda("CheckInventory", lambda =>
    {
        lambda.TimeoutSeconds = 5;
    }))
.OnSuccess(success => success
    .PlayPrompt("Item is in stock")
    .TransferToQueue("Sales"))
.OnFailure(failure => failure
    .PlayPrompt("Unable to check inventory")
    .Disconnect());
```

#### 3.3 Set Contact Attributes
```csharp
.SetContactAttributes(attributes =>
{
    attributes.Add("CustomerTier", "Gold");
    attributes.Add("OrderId", "$.Lambda.OrderId");
    attributes.Add("Timestamp", "$.CurrentTimestamp");
})
```

#### 3.4 Check Queue Status
```csharp
.CheckQueueStatus("Sales", status =>
{
    status.MetricType = QueueMetric.AgentsAvailable;
    status.Comparison = Comparison.GreaterThan;
    status.Value = 0;
})
.OnTrue(then => then.TransferToQueue("Sales"))
.OnFalse(otherwise => otherwise
    .PlayPrompt("All agents are busy")
    .Disconnect());
```

**Files to Create**:
- `src/Switchboard/Actions/BranchAction.cs`
- `src/Switchboard/Actions/SetContactAttributesAction.cs`
- `src/Switchboard/Actions/CheckQueueStatusAction.cs`
- `src/Switchboard/Actions/LoopAction.cs`
- `src/Switchboard/Builders/BranchBuilder.cs`
- `src/Switchboard/Builders/ConditionBuilder.cs`

---

### 4. Dynamic Configuration System (Medium Priority)

#### 4.1 Environment-Based Configuration
```csharp
// appsettings.Development.json
{
  "Connect": {
    "InstanceAlias": "dev-call-center",
    "EnableDetailedLogging": true
  }
}

// appsettings.Production.json
{
  "Connect": {
    "InstanceAlias": "prod-call-center",
    "EnableDetailedLogging": false
  }
}

// Program.cs
var config = builder.Configuration.GetSection("Connect").Get<ConnectConfig>();
var stack = app.CreateStack("CallCenter", config.InstanceAlias, env);
```

#### 4.2 Parameter Store / Secrets Manager Integration
```csharp
.SetQueueArn(ParameterStore.GetString("/connect/queues/sales-arn"))
.SetLambdaArn(SecretsManager.GetSecret("lambda-arn"))
```

#### 4.3 CloudFormation Parameter Injection
```csharp
var stack = new SwitchboardStack(app, "CallCenter", new StackProps
{
    Parameters = new[]
    {
        new CfnParameter(stack, "InstanceAlias", new CfnParameterProps
        {
            Type = "String",
            Description = "Unique alias for the Connect instance"
        })
    }
});
```

**Files to Create**:
- `src/Switchboard/Configuration/ConnectConfiguration.cs`
- `src/Switchboard/Configuration/ParameterStoreProvider.cs`
- `src/Switchboard/Configuration/SecretsManagerProvider.cs`
- `src/Switchboard/Configuration/IConfigurationProvider.cs`

---

### 5. Multi-Region Deployment (Medium Priority)

#### 5.1 Region-Aware Stack
```csharp
var regions = new[] { "us-east-1", "eu-west-1", "ap-southeast-1" };

foreach (var region in regions)
{
    var stack = app.CreateStack($"CallCenter-{region}", $"call-center-{region}", new StackProps
    {
        Env = new Environment { Region = region }
    });

    stack.AddQueue(salesQueue, "BusinessHours");
    stack.AddFlow(mainFlow);
}
```

#### 5.2 Cross-Region Resource Sharing
```csharp
// Primary region (us-east-1)
var primaryStack = app.CreateStack("CallCenter-Primary", "call-center-primary", usEast1);
var lambdaArn = primaryStack.DeployLambda("ProcessCall");

// Secondary regions reference the Lambda
var euStack = app.CreateStack("CallCenter-EU", "call-center-eu", euWest1);
euStack.AddFlow(new FlowBuilder()
    .InvokeLambda(lambdaArn.Value) // Cross-region reference
    .Build());
```

**Files to Create**:
- `src/Switchboard/MultiRegion/MultiRegionStackFactory.cs`
- `src/Switchboard/MultiRegion/CrossRegionReference.cs`
- `src/Switchboard/MultiRegion/RegionConfig.cs`

---

### 6. Testing & Validation Framework (High Priority)

#### 6.1 Flow Validation API
```csharp
var validator = new FlowValidator();
var result = validator.Validate(flow);

if (!result.IsValid)
{
    foreach (var error in result.Errors)
    {
        Console.WriteLine($"{error.Code}: {error.Message}");
    }
}
```

#### 6.2 Unit Testing Helpers
```csharp
[Test]
public void Flow_ShouldTransferToSalesQueue()
{
    var flow = new FlowBuilder()
        .SetName("TestFlow")
        .PlayPrompt("Hello")
        .TransferToQueue("Sales")
        .Disconnect()
        .Build();

    var json = flow.Content;

    json.Should().ContainAction("MessageParticipant")
        .WithParameter("Text", "Hello");

    json.Should().ContainAction("TransferContactToQueue")
        .WithTransition("NextAction", "disconnect-*");
}
```

#### 6.3 Integration Testing
```csharp
[Test]
public async Task Deploy_ShouldCreateAllResources()
{
    var app = new SwitchboardApp();
    var stack = app.CreateStack("TestStack", "test-instance");

    // Deploy to AWS
    await stack.DeployAsync();

    // Verify resources exist
    var connectClient = new AmazonConnectClient();
    var instance = await connectClient.DescribeInstanceAsync(stack.InstanceId);

    instance.Should().NotBeNull();
    instance.InstanceAlias.Should().Be("test-instance");
}
```

**Files to Create**:
- `src/Switchboard.Testing/FlowValidator.cs`
- `src/Switchboard.Testing/FlowAssertions.cs`
- `src/Switchboard.Testing/TestHelpers.cs`
- `tests/Switchboard.IntegrationTests/DeploymentTests.cs`

---

### 7. Enhanced Developer Experience (Low Priority)

#### 7.1 CLI Tool
```bash
switchboard init --name MyCallCenter --region us-east-1
switchboard generate flow --name CustomerService
switchboard validate --flow CustomerService
switchboard deploy --environment production
switchboard destroy --stack CallCenter-Dev
```

#### 7.2 Visual Flow Designer (Future)
- Web-based drag-and-drop flow designer
- Generates C# code from visual design
- Real-time validation and preview

#### 7.3 Documentation Generator
```csharp
/// <summary>
/// Transfers the contact to the specified queue.
/// </summary>
/// <param name="queueName">The name of the queue to transfer to.</param>
/// <param name="identifier">Optional unique identifier for this action.</param>
[FlowAction("TransferToQueue")]
public IFlowBuilder TransferToQueue(string queueName, string? identifier = null)
{
    // Implementation
}

// Generator creates:
// - API documentation (markdown)
// - XML documentation
// - Sample code snippets
```

**Files to Create**:
- `src/Switchboard.Cli/Program.cs`
- `src/Switchboard.Cli/Commands/InitCommand.cs`
- `src/Switchboard.Cli/Commands/GenerateCommand.cs`
- `src/Switchboard.Cli/Commands/ValidateCommand.cs`
- `src/Switchboard.Cli/Commands/DeployCommand.cs`

---

## 🚀 Phase 2 Implementation Order

### Sprint 1 (Weeks 1-2): Foundation
1. **Source Generators Setup**
   - Create `Switchboard.SourceGenerators` project
   - Implement `[FlowAction]` attribute
   - Basic flow action generator
   - Unit tests for generator

2. **Roslyn Analyzers Setup**
   - Create `Switchboard.Analyzers` project
   - Implement basic flow validation (SWB001-SWB010)
   - Unit tests for analyzers

### Sprint 2 (Weeks 3-4): Advanced Actions
1. **Conditional Branching**
   - `BranchAction` and `BranchBuilder`
   - Condition evaluation logic
   - Update `FlowBuilder` with `.Branch()` method

2. **Contact Attributes**
   - `SetContactAttributesAction`
   - Attribute interpolation (e.g., `$.Lambda.OrderId`)
   - Update JSON generation

### Sprint 3 (Weeks 5-6): Configuration & Testing
1. **Dynamic Configuration**
   - Environment-based config loading
   - Parameter Store / Secrets Manager integration
   - Configuration validation

2. **Testing Framework**
   - `FlowValidator` API
   - Unit testing helpers (FluentAssertions style)
   - Integration testing setup

### Sprint 4 (Weeks 7-8): Multi-Region & Polish
1. **Multi-Region Support**
   - `MultiRegionStackFactory`
   - Cross-region resource references
   - Region-specific configuration

2. **CLI Tool**
   - Basic commands (init, generate, validate, deploy)
   - Integration with CDK CLI

---

## 📁 New Project Structure (Phase 2)

```
src/
├── Switchboard/                    # Core library (existing)
│   ├── Actions/                    # NEW: Advanced actions
│   │   ├── BranchAction.cs
│   │   ├── SetContactAttributesAction.cs
│   │   ├── CheckQueueStatusAction.cs
│   │   └── LoopAction.cs
│   ├── Builders/                   # NEW: Advanced builders
│   │   ├── BranchBuilder.cs
│   │   ├── ConditionBuilder.cs
│   │   └── AttributeBuilder.cs
│   ├── Configuration/              # NEW: Config system
│   │   ├── ConnectConfiguration.cs
│   │   ├── IConfigurationProvider.cs
│   │   └── ParameterStoreProvider.cs
│   └── MultiRegion/                # NEW: Multi-region
│       ├── MultiRegionStackFactory.cs
│       └── CrossRegionReference.cs
│
├── Switchboard.SourceGenerators/   # NEW: Source generators
│   ├── FlowActionGenerator.cs
│   ├── ConstructGenerator.cs
│   ├── ConfigurationGenerator.cs
│   └── Attributes/
│       ├── FlowActionAttribute.cs
│       ├── ParameterAttribute.cs
│       └── TransitionAttribute.cs
│
├── Switchboard.Analyzers/          # NEW: Roslyn analyzers
│   ├── FlowValidationAnalyzer.cs
│   ├── ParameterValidationAnalyzer.cs
│   ├── CdkBestPracticesAnalyzer.cs
│   ├── DiagnosticIds.cs
│   └── CodeFixes/
│       ├── AddDisconnectCodeFix.cs
│       └── AddRequiredParameterCodeFix.cs
│
├── Switchboard.Testing/            # NEW: Testing helpers
│   ├── FlowValidator.cs
│   ├── FlowAssertions.cs
│   ├── TestHelpers.cs
│   └── Mocks/
│
└── Switchboard.Cli/                # NEW: CLI tool
    ├── Program.cs
    └── Commands/
        ├── InitCommand.cs
        ├── GenerateCommand.cs
        ├── ValidateCommand.cs
        └── DeployCommand.cs

tests/
├── Switchboard.Tests/              # Existing unit tests
├── Switchboard.SourceGenerators.Tests/  # NEW
├── Switchboard.Analyzers.Tests/         # NEW
└── Switchboard.IntegrationTests/        # NEW

examples/
├── SimpleCallCenter/               # Existing POC
├── AdvancedFlows/                  # NEW: Phase 2 examples
│   ├── BranchingFlow/
│   ├── MultiRegionDeployment/
│   └── CustomActions/
└── RealWorldScenarios/             # NEW: Production examples
    ├── Ecommerce/
    ├── Healthcare/
    └── FinancialServices/
```

---

## 🎯 Success Criteria for Phase 2

### Must Have
- ✅ Source generators for flow actions work
- ✅ Roslyn analyzers catch common errors at compile-time
- ✅ Conditional branching (`.Branch()`) works in flows
- ✅ Contact attributes can be set and referenced
- ✅ Flow validation API catches invalid flows
- ✅ Unit testing helpers make flow testing easy
- ✅ Multi-region deployment works correctly
- ✅ All features have comprehensive unit tests
- ✅ Documentation updated with Phase 2 features

### Nice to Have
- 🎁 CLI tool for common operations
- 🎁 Integration tests deploy to real AWS
- 🎁 Parameter Store / Secrets Manager integration
- 🎁 Loop/retry action support
- 🎁 Cross-region resource references

### Future (Phase 3)
- 🔮 Visual flow designer (web UI)
- 🔮 Auto-generated TypeScript definitions
- 🔮 Real-time flow testing/debugging
- 🔮 Flow versioning and rollback
- 🔮 Analytics and metrics collection

---

## 💡 Technical Guidelines for Agents

### Code Quality Standards
- Follow **SOLID principles**
- Use **dependency injection** throughout
- Write **unit tests** for every feature (minimum 80% coverage)
- Follow **.NET naming conventions**
- Add **XML documentation** to all public APIs
- Use **FluentAssertions** for test assertions

### Git Workflow
- Create feature branches: `feature/phase2-source-generators`
- Commit often with clear messages: `feat: add FlowActionGenerator`
- Create PRs for each major feature
- Ensure all tests pass before merging

### Documentation Requirements
- Update `README.md` with new features
- Create separate docs for:
  - Source generators (`docs/source-generators.md`)
  - Analyzers (`docs/analyzers.md`)
  - Advanced flows (`docs/advanced-flows.md`)
  - Testing (`docs/testing.md`)
- Include code examples for every feature

### Performance Considerations
- Source generators must complete in < 100ms
- Analyzers must not slow down IDE
- Flow JSON generation should be lazy (only when needed)
- Cache compiled flow JSON to avoid regeneration

---

## 📚 Recommended Reading

- [Roslyn Source Generators](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/source-generators-overview)
- [Roslyn Analyzers Tutorial](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/tutorials/how-to-write-csharp-analyzer-code-fix)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [Amazon Connect Flow Language](https://docs.aws.amazon.com/connect/latest/adminguide/flow-language.html)
- [FluentAssertions Documentation](https://fluentassertions.com/introduction)

---

## 🚦 Getting Started

1. **Clone the latest code** from the POC branch
2. **Create Sprint 1 feature branches**:
   - `feature/phase2-source-generators`
   - `feature/phase2-analyzers`
3. **Set up new projects**:
   ```bash
   dotnet new classlib -n Switchboard.SourceGenerators
   dotnet new classlib -n Switchboard.Analyzers
   dotnet sln add src/Switchboard.SourceGenerators
   dotnet sln add src/Switchboard.Analyzers
   ```
4. **Start with Sprint 1 tasks** (see Implementation Order above)

---

## 🎉 Let's Build Something Amazing!

The POC proved the concept works. Now let's make it production-ready and developer-friendly!

**Questions?** Open an issue with the `phase-2` label.

**Ready to start?** Pick a task from Sprint 1 and create a feature branch!
