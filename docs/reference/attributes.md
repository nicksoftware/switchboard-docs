# Attributes Reference

::: warning PREVIEW RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). The attribute API may change before the stable 1.0 release.
:::

This reference documents all available attributes you can use for declarative flow, queue, and resource definitions in Switchboard.

## Table of Contents

[[toc]]

## Flow Attributes

### BranchAttribute

Marks a method as a branch action that evaluates conditions and routes calls accordingly.

**Namespace:** `Switchboard.Attributes`

**Target:** Methods

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `AttributeName` | `string?` | No | Name of the attribute or variable to evaluate (e.g., "CustomerInput", "External.CustomerId") |
| `Expression` | `string?` | No | Full comparison expression (e.g., "$.Attributes.CustomerInput") |

**Example:**

```csharp
[Action(Order = 3)]
[Branch(AttributeName = "CustomerInput")]
[Case("1", Target = "TransferToSales")]
[Case("2", Target = "TransferToSupport")]
[DefaultCase(Target = "InvalidInput")]
public partial void BranchByInput();
```

**Usage Notes:**
- Must be used with at least one `[Case]` attribute
- Should have a `[DefaultCase]` for fallback routing
- Use `AttributeName` for simple attribute lookups
- Use `Expression` for complex JSONPath expressions

---

### CaseAttribute

Defines a single case/condition within a branch action.

**Namespace:** `Switchboard.Attributes`

**Target:** Methods (used with `[Branch]`)

**Constructor:**
```csharp
CaseAttribute(string value)
```

**Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Value` | `string` | Yes | - | The value to compare against |
| `Target` | `string` | Yes | - | Target action identifier to execute if this case matches |
| `Operator` | `ComparisonOperator` | No | `Equals` | Comparison operator (Equals, NotEquals, GreaterThan, etc.) |

**Example:**

```csharp
[Branch(AttributeName = "CustomerTier")]
[Case("Gold", Target = "VIPQueue")]
[Case("Silver", Target = "StandardQueue")]
[Case("Bronze", Target = "BasicQueue", Operator = ComparisonOperator.Equals)]
[DefaultCase(Target = "DefaultQueue")]
public partial void RouteByTier();
```

**Available Operators:**
- `ComparisonOperator.Equals` (default)
- `ComparisonOperator.NotEquals`
- `ComparisonOperator.GreaterThan`
- `ComparisonOperator.LessThan`
- `ComparisonOperator.GreaterThanOrEquals`
- `ComparisonOperator.LessThanOrEquals`

---

### DefaultCaseAttribute

Defines the default case for a branch action when no conditions match.

**Namespace:** `Switchboard.Attributes`

**Target:** Methods (used with `[Branch]`)

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Target` | `string` | Yes | Target action identifier to execute when no cases match |

**Example:**

```csharp
[Branch(AttributeName = "UserInput")]
[Case("1", Target = "SalesFlow")]
[Case("2", Target = "SupportFlow")]
[DefaultCase(Target = "MainMenu")] // Fallback
public partial void HandleInput();
```

---

### SetContactAttributesAttribute

Marks a method as setting contact attributes in a flow.

**Namespace:** `Switchboard.Attributes`

**Target:** Methods

**Properties:** None (marker attribute)

**Example:**

```csharp
[Action(Order = 3)]
[SetContactAttributes]
[Attribute("CustomerTier", "Gold")]
[Attribute("OrderId", "$.Lambda.OrderId")]
[Attribute("Timestamp", "$.System.CurrentTimestamp")]
public partial void SetCustomerAttributes();
```

**Usage Notes:**
- Must be used with one or more `[Attribute]` attributes
- Attributes can be literal values or JSONPath expressions
- Use `$.Lambda.*` to reference Lambda function results
- Use `$.External.*` to reference external system data
- Use `$.System.*` to reference system values (timestamps, etc.)

---

### AttributeAttribute

Defines a single attribute to set on the contact.

**Namespace:** `Switchboard.Attributes`

**Target:** Methods (used with `[SetContactAttributes]`)

**Constructor:**
```csharp
AttributeAttribute(string name, string value)
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Name` | `string` | Yes | The attribute name |
| `Value` | `string` | Yes | The attribute value or reference expression (literal or JSONPath) |

**Example:**

```csharp
[SetContactAttributes]
[Attribute("CustomerName", "John Doe")] // Literal value
[Attribute("CustomerId", "$.External.CustomerId")] // External reference
[Attribute("Balance", "$.Lambda.AccountBalance")] // Lambda result
[Attribute("Timestamp", "$.System.CurrentTimestamp")] // System value
public partial void SetAttributes();
```

**Common Patterns:**

**Static Values:**
```csharp
[Attribute("Priority", "High")]
[Attribute("Queue", "Premium")]
```

**Lambda Results:**
```csharp
[Attribute("AccountBalance", "$.Lambda.Balance")]
[Attribute("CustomerTier", "$.Lambda.TierLevel")]
```

**External System Data:**
```csharp
[Attribute("OrderStatus", "$.External.Status")]
[Attribute("ShippingDate", "$.External.EstimatedDelivery")]
```

**System Values:**
```csharp
[Attribute("CallStartTime", "$.System.CurrentTimestamp")]
[Attribute("InstanceId", "$.System.InstanceArn")]
```

---

## Source Generator Attributes

These attributes are used by source generators to create code at compile-time.

### FlowActionAttribute

Marks a class as a flow action that should have extension methods generated.

**Namespace:** `Switchboard.SourceGenerators.Attributes`

**Target:** Classes

**Constructor:**
```csharp
FlowActionAttribute(string actionName)
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ActionName` | `string` | Yes | Name of the flow action (used for method generation) |
| `Description` | `string?` | No | Description of what this action does |

**Example:**

```csharp
using Switchboard.SourceGenerators.Attributes;

[FlowAction("PlayCustomMessage", Description = "Plays a custom message to the caller")]
public class PlayCustomMessageAction : FlowAction
{
    public string Message { get; set; }
    public string VoiceId { get; set; }
}
```

**Generated Code:**
The source generator will create fluent extension methods:

```csharp
// Generated automatically
public static IFlowBuilder PlayCustomMessage(
    this IFlowBuilder builder,
    string message,
    string voiceId = "Joanna")
{
    // Implementation generated
}
```

---

### ParameterAttribute

Marks a property or parameter for code generation with specific metadata.

**Namespace:** `Switchboard.SourceGenerators.Attributes`

**Target:** Properties, Parameters

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| TBD | - | - | Documentation pending implementation |

---

### TransitionAttribute

Defines transitions between flow actions for code generation.

**Namespace:** `Switchboard.SourceGenerators.Attributes`

**Target:** Methods, Properties

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| TBD | - | - | Documentation pending implementation |

---

## Complete Examples

### Example 1: Simple IVR Menu with Branching

```csharp
using Switchboard.Attributes;

[ContactFlow("MainMenu")]
public partial class MainMenuFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Message("Welcome to our company. For sales, press 1. For support, press 2.")]
    public partial void WelcomeMessage();

    [Action(Order = 2)]
    [GetCustomerInput]
    [Text("Please make your selection")]
    [MaxDigits(1)]
    [Timeout(5)]
    public partial Task<string> GetMenuSelection();

    [Action(Order = 3)]
    [Branch(AttributeName = "CustomerInput")]
    [Case("1", Target = "TransferToSales")]
    [Case("2", Target = "TransferToSupport")]
    [DefaultCase(Target = "InvalidSelection")]
    public partial void RouteCall();

    [Action(Order = 4, Identifier = "TransferToSales")]
    [TransferToQueue("Sales")]
    public partial void TransferToSales();

    [Action(Order = 5, Identifier = "TransferToSupport")]
    [TransferToQueue("Support")]
    public partial void TransferToSupport();

    [Action(Order = 6, Identifier = "InvalidSelection")]
    [Message("Invalid selection. Returning to main menu.")]
    [Transition(Target = "WelcomeMessage")]
    public partial void HandleInvalidInput();
}
```

### Example 2: Customer Lookup with Attributes

```csharp
using Switchboard.Attributes;

[ContactFlow("CustomerLookup")]
public partial class CustomerLookupFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput]
    [Text("Please enter your account number")]
    [MaxDigits(10)]
    public partial Task<string> GetAccountNumber();

    [Action(Order = 2)]
    [InvokeLambda]
    [FunctionName("CustomerLookupFunction")]
    [InputParameter("accountNumber", "$.Attributes.CustomerInput")]
    public partial Task<LambdaResult> LookupCustomer();

    [Action(Order = 3)]
    [SetContactAttributes]
    [Attribute("CustomerName", "$.Lambda.Name")]
    [Attribute("CustomerTier", "$.Lambda.Tier")]
    [Attribute("AccountBalance", "$.Lambda.Balance")]
    [Attribute("IsVIP", "$.Lambda.IsVIP")]
    public partial void SetCustomerData();

    [Action(Order = 4)]
    [Branch(AttributeName = "CustomerTier")]
    [Case("Gold", Target = "VIPGreeting")]
    [Case("Silver", Target = "StandardGreeting")]
    [DefaultCase(Target = "BasicGreeting")]
    public partial void RouteByTier();

    [Action(Order = 5, Identifier = "VIPGreeting")]
    [Message("Welcome back, valued customer!")]
    [TransferToQueue("VIPSupport")]
    public partial void GreetVIP();

    [Action(Order = 6, Identifier = "StandardGreeting")]
    [Message("Thank you for calling.")]
    [TransferToQueue("StandardSupport")]
    public partial void GreetStandard();

    [Action(Order = 7, Identifier = "BasicGreeting")]
    [Message("Hello!")]
    [TransferToQueue("GeneralSupport")]
    public partial void GreetBasic();
}
```

### Example 3: Business Hours Check

```csharp
using Switchboard.Attributes;

[ContactFlow("BusinessHoursCheck")]
public partial class BusinessHoursFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [CheckHoursOfOperation]
    [HoursRef("BusinessHours")]
    public partial Task<bool> CheckBusinessHours();

    [Action(Order = 2)]
    [Branch(AttributeName = "HoursOfOperationCheck")]
    [Case("true", Target = "DuringHours")]
    [Case("false", Target = "AfterHours")]
    [DefaultCase(Target = "DuringHours")]
    public partial void RouteByHours();

    [Action(Order = 3, Identifier = "DuringHours")]
    [Message("Thank you for calling during business hours.")]
    [TransferToQueue("Support")]
    public partial void HandleBusinessHours();

    [Action(Order = 4, Identifier = "AfterHours")]
    [Message("We are currently closed. Please call back during business hours.")]
    [Disconnect]
    public partial void HandleAfterHours();
}
```

---

## Best Practices

### 1. Use Descriptive Names

**Good:**
```csharp
[Case("Gold", Target = "RouteToVIPQueue")]
[Attribute("CustomerAccountBalance", "$.Lambda.Balance")]
```

**Bad:**
```csharp
[Case("1", Target = "Action1")]
[Attribute("Bal", "$.Lambda.B")]
```

### 2. Provide Fallbacks

Always include `[DefaultCase]` for branching:

```csharp
[Branch(AttributeName = "Input")]
[Case("1", Target = "Sales")]
[Case("2", Target = "Support")]
[DefaultCase(Target = "MainMenu")] // Always provide this!
```

### 3. Use JSONPath References Correctly

**For Lambda Results:**
```csharp
[Attribute("Result", "$.Lambda.FieldName")]
```

**For External Data:**
```csharp
[Attribute("Data", "$.External.FieldName")]
```

**For Contact Attributes:**
```csharp
[Branch(AttributeName = "$.Attributes.CustomerInput")]
```

### 4. Order Actions Logically

```csharp
[Action(Order = 1)]  // Welcome
[Action(Order = 2)]  // Get input
[Action(Order = 3)]  // Branch
[Action(Order = 4)]  // Handle case 1
[Action(Order = 5)]  // Handle case 2
```

### 5. Combine Attributes Appropriately

```csharp
// Good: Related attributes together
[Action(Order = 1)]
[SetContactAttributes]
[Attribute("Name", "$.Lambda.Name")]
[Attribute("Tier", "$.Lambda.Tier")]
public partial void SetData();

// Bad: Mixing unrelated attributes
[SetContactAttributes]
[TransferToQueue("Sales")] // Wrong! These are different actions
```

---

## Troubleshooting

### Common Errors

**Error:** "Target action not found"
```csharp
// Problem: Target doesn't exist
[Case("1", Target = "NonExistentAction")]

// Solution: Ensure target identifier exists
[Action(Order = 4, Identifier = "NonExistentAction")]
```

**Error:** "Attribute value must be specified"
```csharp
// Problem: Missing required property
[Attribute("Name")] // Missing value

// Solution: Provide both name and value
[Attribute("Name", "John")]
```

**Error:** "Branch must have at least one case"
```csharp
// Problem: Branch without cases
[Branch(AttributeName = "Input")]
public partial void Route();

// Solution: Add at least one case
[Branch(AttributeName = "Input")]
[Case("1", Target = "Action1")]
[DefaultCase(Target = "Default")]
public partial void Route();
```

---

## See Also

- [Source Generators Guide](/reference/source-generators) - How code generation works
- [Roslyn Analyzers](/reference/analyzers) - Compile-time validation
- [Flow Building Guide](/building/flows) - Complete flow construction guide
- [Examples](/examples/minimal-setup) - Working examples
