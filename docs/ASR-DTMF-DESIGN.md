# ASR + DTMF Design Proposal

## Overview

This document explores the design of a fluent API that supports:
1. **ASR with DTMF fallback** - Try conversational IVR first, fall back to touch-tone on failure
2. **Flat ASR vs Hierarchical DTMF** - Single-level intent recognition vs multi-level DTMF menus
3. **Dynamic touchpoint configuration** - Load menu structures from DynamoDB at runtime

---

## Scenario 1: ASR with DTMF Fallback

### Business Requirement

**Customer wants:**
- Start with conversational ASR (natural language)
- If ASR fails (no match, low confidence, max retries), fall back to traditional DTMF menu
- Track which input mode was used for analytics

### Proposed Fluent API

#### Option A: Explicit Fallback Chain

```csharp
var flow = new FlowBuilder()
    .SetName("ASRWithDTMFFallback")
    .SetDescription("Try ASR first, fall back to DTMF on failure")

    .PlayPrompt("Welcome to ABC Company. How can I help you today?")

    // Primary: ASR Input
    .GetCustomerInput(input =>
    {
        input.InputMode = InputMode.Speech;
        input.LexBotName = "CustomerServiceBot";
        input.LexBotAlias = "Production";
        input.IntentConfidenceThreshold = 0.70;
        input.MaxRetries = 2;
        input.RetryPrompt = "I didn't quite catch that. Could you please repeat?";
        input.NoMatchPrompt = "I'm not sure I understand. Let me try another way.";

        // Define what happens on failure
        input.OnMaxRetriesExceeded = FallbackBehavior.ContinueToNextInput;
        input.OnNoMatch = FallbackBehavior.ContinueToNextInput;
        input.OnLowConfidence = FallbackBehavior.ContinueToNextInput;
    })

    // Set flag for analytics
    .SetContactAttributes(attrs =>
    {
        attrs["InputMode"] = "ASR";
        attrs["ASRIntent"] = "$.Lex.IntentName";
    })

    // Branch on ASR results (if successful)
    .Branch(branch =>
    {
        branch
            .Condition("$.Lex.IntentName", ConditionOperator.IsSet)
            .OnTrue(asrSuccess => asrSuccess
                .RouteByIntent() // Helper to route based on Lex intent
            )
            .OnFalse(dtmfFallback => dtmfFallback
                // Fallback: DTMF Menu
                .PlayPrompt("Let's try a different approach. Listen to the following menu.")
                .GetCustomerInput(input =>
                {
                    input.InputMode = InputMode.DTMF;
                    input.PromptText = "Press 1 for Sales, 2 for Support, 3 for Billing, or 0 for an operator.";
                    input.MaxDigits = 1;
                    input.TimeoutSeconds = 5;
                    input.MaxRetries = 3;
                })
                .SetContactAttributes(attrs => attrs["InputMode"] = "DTMF")
                .RouteByDTMF() // Helper to route based on digits
            );
    })

    .Build();
```

#### Option B: Fluent Fallback Chain (More Concise)

```csharp
var flow = new FlowBuilder()
    .SetName("ASRWithDTMFFallback")

    .PlayPrompt("Welcome to ABC Company. How can I help you today?")

    // Chained input with automatic fallback
    .GetCustomerInput(input =>
    {
        // Primary: ASR
        input.Primary.Mode = InputMode.Speech;
        input.Primary.LexBot = "CustomerServiceBot";
        input.Primary.ConfidenceThreshold = 0.70;
        input.Primary.MaxRetries = 2;
        input.Primary.NoMatchPrompt = "I didn't quite catch that. Let me try a different way.";

        // Fallback: DTMF
        input.Fallback.Mode = InputMode.DTMF;
        input.Fallback.PromptText = "Please use your keypad. Press 1 for Sales, 2 for Support, 3 for Billing.";
        input.Fallback.MaxDigits = 1;
        input.Fallback.MaxRetries = 3;

        // Trigger fallback conditions
        input.FallbackTriggers = FallbackTrigger.NoMatch
                               | FallbackTrigger.LowConfidence
                               | FallbackTrigger.MaxRetriesExceeded;
    })

    // Unified routing based on either ASR intent or DTMF digits
    .RouteByInput(router =>
    {
        // Maps both ASR intents and DTMF digits to same destinations
        router.When("SalesIntent", "1", target => target.TransferToQueue("Sales"));
        router.When("SupportIntent", "2", target => target.TransferToQueue("Support"));
        router.When("BillingIntent", "3", target => target.TransferToQueue("Billing"));
        router.Otherwise(target => target.TransferToQueue("General"));
    })

    .Build();
```

**Recommendation**: Option B is cleaner and more intuitive.

---

## Scenario 2: Flat ASR vs Hierarchical DTMF

### Business Requirement

**ASR Menu (Flat):**
- Single prompt: "What do you need help with?"
- Intents: Sales, Support, Billing, AccountStatus, OrderTracking, TechnicalHelp, Cancellation, etc.
- **All intents recognized in one interaction**

**DTMF Menu (Hierarchical):**
- Main Menu: 1=Sales, 2=Support, 3=Account Services
- Account Services Sub-Menu: 1=Balance, 2=Orders, 3=Cancellation
- **Multi-step navigation**

### Proposed Fluent API

```csharp
var flow = new FlowBuilder()
    .SetName("FlatASRvsHierarchicalDTMF")

    .PlayPrompt("Welcome to ABC Company.")

    .GetCustomerInput(input =>
    {
        // ASR: Flat menu (all intents at once)
        input.Primary.Mode = InputMode.Speech;
        input.Primary.LexBot = "CustomerServiceBot";
        input.Primary.Prompt = "What can I help you with today? You can say things like check my balance, track an order, or speak to sales.";
        input.Primary.MaxRetries = 2;

        // DTMF: Hierarchical menu (step-by-step)
        input.Fallback.Mode = InputMode.DTMF;
        input.Fallback.PromptText = "Let's use the menu. Press 1 for Sales, 2 for Support, or 3 for Account Services.";
        input.Fallback.MaxDigits = 1;
    })

    // Route ASR intents (flat structure)
    .RouteByInput(router =>
    {
        // ASR: Direct routing from any intent
        router.WhenIntent("SalesIntent", target => target.TransferToQueue("Sales"));
        router.WhenIntent("SupportIntent", target => target.TransferToQueue("Support"));
        router.WhenIntent("AccountBalanceIntent", target => target.TransferToQueue("Accounts"));
        router.WhenIntent("OrderTrackingIntent", target => target.TransferToQueue("Orders"));
        router.WhenIntent("CancellationIntent", target => target.TransferToQueue("Retention"));

        // DTMF: Hierarchical routing
        router.WhenDigits("1", target => target.TransferToQueue("Sales"));
        router.WhenDigits("2", target => target.TransferToQueue("Support"));
        router.WhenDigits("3", target => target
            // Sub-menu for Account Services
            .PlayPrompt("Account Services. Press 1 for balance, 2 to track an order, or 3 for cancellations.")
            .GetCustomerInput(subInput =>
            {
                subInput.InputMode = InputMode.DTMF;
                subInput.MaxDigits = 1;
            })
            .Branch(subBranch =>
            {
                subBranch.WhenDigits("1", b => b.TransferToQueue("Accounts"));
                subBranch.WhenDigits("2", b => b.TransferToQueue("Orders"));
                subBranch.WhenDigits("3", b => b.TransferToQueue("Retention"));
            })
        );
    })

    .Build();
```

**Key Design Decision:**
- ASR uses `WhenIntent()` for flat routing
- DTMF uses `WhenDigits()` and can nest sub-menus naturally with the fluent API

---

## Scenario 3: Dynamic Touchpoint Configuration from Database

### Business Requirement

**Customer wants:**
- Menu structure stored in DynamoDB
- Change menu options without redeploying infrastructure
- A/B test different menu structures
- Support multi-tenant configurations

### Database Schema

#### DynamoDB Table: `MenuConfigurations`

**Primary Key:** `MenuId` (e.g., "MainMenu", "AccountServicesMenu")

**Example Record:**
```json
{
  "MenuId": "MainMenu",
  "Version": "v2",
  "Active": true,
  "Prompt": {
    "Text": "Press 1 for Sales, 2 for Support, 3 for Account Services, or 0 for operator.",
    "SSML": "<speak>Press 1 for Sales, <break time='300ms'/> 2 for Support, <break time='300ms'/> 3 for Account Services, <break time='300ms'/> or 0 for an operator.</speak>"
  },
  "Options": [
    {
      "Digit": "1",
      "Intent": "SalesIntent",
      "Label": "Sales",
      "Action": {
        "Type": "TransferToQueue",
        "Target": "Sales"
      }
    },
    {
      "Digit": "2",
      "Intent": "SupportIntent",
      "Label": "Support",
      "Action": {
        "Type": "TransferToQueue",
        "Target": "Support"
      }
    },
    {
      "Digit": "3",
      "Intent": "AccountServicesIntent",
      "Label": "Account Services",
      "Action": {
        "Type": "SubMenu",
        "Target": "AccountServicesMenu"
      }
    },
    {
      "Digit": "0",
      "Intent": "OperatorIntent",
      "Label": "Operator",
      "Action": {
        "Type": "TransferToQueue",
        "Target": "General"
      }
    }
  ],
  "Fallback": {
    "MaxRetries": 3,
    "RetryPrompt": "I didn't catch that. Please try again.",
    "OnMaxRetries": {
      "Type": "TransferToQueue",
      "Target": "General"
    }
  }
}
```

#### DynamoDB Table: `PromptLibrary`

**Primary Key:** `PromptId`

```json
{
  "PromptId": "WelcomePrompt",
  "Version": "v1",
  "Text": "Welcome to ABC Company.",
  "SSML": "<speak>Welcome to <emphasis level='strong'>ABC Company</emphasis>.</speak>",
  "AudioS3Key": "prompts/welcome-v1.wav",
  "Language": "en-US"
}
```

### Proposed Fluent API

#### Approach 1: Lambda-Fetched Dynamic Menu

```csharp
var flow = new FlowBuilder()
    .SetName("DynamicMenuFromDatabase")

    // 1. Invoke Lambda to fetch menu configuration
    .InvokeLambda("MenuConfigFetcher", lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:GetMenuConfig";
        lambda.InputParameters["MenuId"] = "MainMenu";
        lambda.InputParameters["TenantId"] = "$.Attributes.TenantId"; // Multi-tenant support
    })

    // 2. Store menu config in contact attributes
    .SetContactAttributes(attrs =>
    {
        attrs["MenuPrompt"] = "$.Lambda.MenuPrompt";
        attrs["MenuOptions"] = "$.Lambda.MenuOptions"; // JSON string
    })

    // 3. Use dynamic menu
    .PlayPromptDynamic("$.Attributes.MenuPrompt") // Play prompt from attribute

    .GetCustomerInput(input =>
    {
        input.InputMode = InputMode.Both; // ASR + DTMF
        input.LexBot = "CustomerServiceBot";
        input.MaxDigits = 1;
        input.MaxRetries = 3;
    })

    // 4. Invoke Lambda to determine routing based on input + menu config
    .InvokeLambda("MenuRouter", lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:RouteMenuSelection";
        lambda.InputParameters["MenuOptions"] = "$.Attributes.MenuOptions";
        lambda.InputParameters["CustomerInput"] = "$.StoredCustomerInput";
        lambda.InputParameters["LexIntent"] = "$.Lex.IntentName";
    })

    // 5. Route based on Lambda response
    .SetContactAttributes(attrs =>
    {
        attrs["RouteAction"] = "$.Lambda.Action"; // "TransferToQueue", "SubMenu", etc.
        attrs["RouteTarget"] = "$.Lambda.Target"; // Queue name or sub-menu ID
    })

    .Branch(branch =>
    {
        branch.When("$.Attributes.RouteAction", "TransferToQueue", target => target
            .TransferToQueueDynamic("$.Attributes.RouteTarget") // Dynamic queue name
        );

        branch.When("$.Attributes.RouteAction", "SubMenu", target => target
            // Recursive: Load and execute sub-menu
            .InvokeLambda("MenuConfigFetcher", lambda =>
            {
                lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:GetMenuConfig";
                lambda.InputParameters["MenuId"] = "$.Attributes.RouteTarget";
            })
            // ... repeat menu logic
        );

        branch.Otherwise(target => target.TransferToQueue("General"));
    })

    .Build();
```

#### Approach 2: Framework-Managed Dynamic Menu Helper

```csharp
var flow = new FlowBuilder()
    .SetName("DynamicMenuHelper")

    // Use built-in dynamic menu helper
    .DynamicMenu(menu =>
    {
        menu.MenuId = "MainMenu";
        menu.FetcherLambdaArn = "arn:aws:lambda:us-east-1:123456789012:function:GetMenuConfig";
        menu.RouterLambdaArn = "arn:aws:lambda:us-east-1:123456789012:function:RouteMenuSelection";

        menu.InputMode = InputMode.Both; // ASR + DTMF
        menu.LexBot = "CustomerServiceBot";

        menu.MaxRetries = 3;
        menu.RetryBehavior = RetryBehavior.RepeatPrompt;

        // Support nested menus
        menu.EnableSubMenus = true;
        menu.MaxMenuDepth = 3; // Prevent infinite recursion

        // Multi-tenant support
        menu.TenantIdAttribute = "$.Attributes.TenantId";
    })

    .Build();
```

**Recommendation**: Provide both approaches:
- **Approach 1** for maximum flexibility (customer has full control)
- **Approach 2** as a convenience helper for common scenarios

---

## Implementation Plan

### Core Components to Build

#### 1. Input Mode Enhancements

```csharp
public enum InputMode
{
    DTMF,           // Touch-tone only
    Speech,         // ASR only (Lex)
    Both,           // Try ASR first, accept DTMF as override
    Sequential      // ASR with DTMF fallback (our new pattern)
}

public class CustomerInputConfiguration
{
    // Mode
    public InputMode InputMode { get; set; }

    // Primary input (usually ASR)
    public InputConfiguration Primary { get; set; }

    // Fallback input (usually DTMF)
    public InputConfiguration Fallback { get; set; }

    // Fallback triggers
    public FallbackTrigger FallbackTriggers { get; set; }
}

public class InputConfiguration
{
    public InputMode Mode { get; set; }
    public string? PromptText { get; set; }
    public string? LexBot { get; set; }
    public string? LexAlias { get; set; }
    public double ConfidenceThreshold { get; set; } = 0.70;
    public int MaxRetries { get; set; } = 3;
    public string? RetryPrompt { get; set; }
    public string? NoMatchPrompt { get; set; }
    public int MaxDigits { get; set; } = 1;
    public int TimeoutSeconds { get; set; } = 5;
}

[Flags]
public enum FallbackTrigger
{
    None = 0,
    NoMatch = 1,
    LowConfidence = 2,
    MaxRetriesExceeded = 4,
    Timeout = 8,
    Error = 16,
    All = NoMatch | LowConfidence | MaxRetriesExceeded | Timeout | Error
}
```

#### 2. Unified Routing Helper

```csharp
public interface IInputRouter
{
    // Route by intent (ASR)
    IInputRouter WhenIntent(string intentName, Action<IFlowBuilder> configure);

    // Route by digits (DTMF)
    IInputRouter WhenDigits(string digits, Action<IFlowBuilder> configure);

    // Route by either intent OR digits (unified)
    IInputRouter When(string intentName, string digits, Action<IFlowBuilder> configure);

    // Default route
    IFlowBuilder Otherwise(Action<IFlowBuilder> configure);
}

// Usage:
.RouteByInput(router =>
{
    // Maps both ASR intent and DTMF digit to same destination
    router.When("SalesIntent", "1", target => target.TransferToQueue("Sales"));
    router.When("SupportIntent", "2", target => target.TransferToQueue("Support"));
    router.Otherwise(target => target.TransferToQueue("General"));
})
```

#### 3. Dynamic Menu Framework

```csharp
// Lambda function to fetch menu config
public class MenuConfigFetcherLambda
{
    private readonly IAmazonDynamoDB _dynamoDb;

    public async Task<MenuConfiguration> FunctionHandler(MenuConfigRequest request)
    {
        var response = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = "MenuConfigurations",
            Key = new Dictionary<string, AttributeValue>
            {
                ["MenuId"] = new AttributeValue { S = request.MenuId }
            }
        });

        return DeserializeMenuConfig(response.Item);
    }
}

// Lambda function to route based on menu config + input
public class MenuRouterLambda
{
    public MenuRouteResponse FunctionHandler(MenuRouteRequest request)
    {
        var menuOptions = JsonSerializer.Deserialize<MenuOption[]>(request.MenuOptions);

        // Find matching option by digit OR intent
        var selectedOption = menuOptions.FirstOrDefault(opt =>
            opt.Digit == request.CustomerInput ||
            opt.Intent == request.LexIntent
        );

        if (selectedOption == null)
        {
            return new MenuRouteResponse
            {
                Action = "TransferToQueue",
                Target = "General"
            };
        }

        return new MenuRouteResponse
        {
            Action = selectedOption.Action.Type,
            Target = selectedOption.Action.Target
        };
    }
}
```

#### 4. Dynamic Attribute Support in FlowBuilder

```csharp
public interface IFlowBuilder
{
    // Existing
    IFlowBuilder PlayPrompt(string text);
    IFlowBuilder TransferToQueue(string queueName);

    // NEW: Dynamic versions that read from contact attributes
    IFlowBuilder PlayPromptDynamic(string attributePath); // e.g., "$.Attributes.MenuPrompt"
    IFlowBuilder TransferToQueueDynamic(string attributePath); // e.g., "$.Attributes.TargetQueue"

    // NEW: High-level dynamic menu helper
    IFlowBuilder DynamicMenu(Action<DynamicMenuConfiguration> configure);
}
```

---

## JSON Output Examples

### ASR with DTMF Fallback

The framework would generate Amazon Connect JSON with:

1. **Get Customer Input Block (ASR)**
   - LexBot integration
   - Confidence threshold
   - Error branches

2. **Check Condition Block**
   - Check if ASR succeeded (intent is set)

3. **Get Customer Input Block (DTMF)** - Only executed if ASR failed
   - DTMF configuration
   - Different prompt

4. **Unified Routing Logic**
   - Routes based on either `$.Lex.IntentName` or `$.StoredCustomerInput`

---

## Questions to Consider

### 1. **Nested vs Flat Menu Generation**

For DTMF hierarchical menus, should we:

**Option A:** Generate separate flows for each sub-menu?
- Cleaner separation
- Easier to test individual menus
- Can use TransferToFlow action

**Option B:** Generate all menus in single flow with loop-backs?
- Single flow, simpler deployment
- Harder to read generated JSON
- Better performance (no flow transfers)

**Recommendation**: Option A for clarity and maintainability.

### 2. **Dynamic Menu Recursion Limits**

How deep should sub-menus go?
- AWS limit: Flow JSON size ~25KB
- Practical limit: 2-3 levels deep
- Should we enforce `MaxMenuDepth` configuration?

**Recommendation**: Yes, enforce max depth (default: 3 levels).

### 3. **Menu Configuration Caching**

Should menu configurations be cached?
- Lambda can cache in /tmp
- Reduces DynamoDB reads
- Add TTL configuration

**Recommendation**: Yes, with configurable TTL (default: 5 minutes).

### 4. **A/B Testing Support**

How to support multiple menu versions for testing?

```json
{
  "MenuId": "MainMenu",
  "Versions": [
    {
      "VersionId": "v1",
      "Weight": 0.50,  // 50% of traffic
      "Active": true,
      "Prompt": { ... }
    },
    {
      "VersionId": "v2",
      "Weight": 0.50,  // 50% of traffic
      "Active": true,
      "Prompt": { ... }
    }
  ]
}
```

Lambda can randomly select version based on weights.

**Recommendation**: Add in Phase 2.2 or 2.3.

---

## Summary of API Decisions

| Feature | API Design Choice |
|---------|------------------|
| **ASR + DTMF Fallback** | Sequential input mode with `Primary` and `Fallback` configurations |
| **Flat ASR vs Hierarchical DTMF** | Unified routing with `WhenIntent()` + `WhenDigits()` + natural nesting |
| **Dynamic Menus** | Provide both Lambda-based approach AND high-level `DynamicMenu()` helper |
| **Touchpoint Storage** | DynamoDB tables for menu configurations and prompt library |
| **Routing** | Lambda functions for dynamic routing logic |
| **Recursion** | Support sub-menus with configurable max depth (default: 3) |
| **Caching** | Lambda-based caching with configurable TTL |

---

## Next Steps

1. **Gather Feedback** on proposed API designs
2. **Prioritize** which scenario to implement first
3. **Prototype** the `InputMode.Sequential` with fallback logic
4. **Create** DynamoDB schema for menu configurations
5. **Build** Lambda functions for menu fetching and routing
6. **Test** with real Lex bot integration
7. **Document** best practices for menu design

---

## ✅ Decisions Made (October 26, 2024)

### API Style
**Decision**: Option B (Concise Primary/Fallback configuration)

```csharp
.GetCustomerInput(input =>
{
    input.Primary.Mode = InputMode.Speech;
    input.Fallback.Mode = InputMode.DTMF;
    input.FallbackTriggers = FallbackTrigger.All;
})
```

### Dynamic Menu Approach
**Decision**: Implement BOTH approaches from the start
- Lambda-based approach for maximum flexibility
- Framework helper for convenience
- This dual approach is a **major selling point** for developers

### Sub-Menu Strategy
**Decision**: Generate separate flows for sub-menus
- Cleaner separation and easier testing
- Use TransferToFlow action for navigation
- Better maintainability

### Implementation Priority
**Decision**: Follow recommended priority order:

**Phase 2.1** (High Priority - Q1 2025):
1. ✅ Unified routing API (`RouteByInput`, `WhenIntent`, `WhenDigits`)
2. ✅ Sequential input mode (ASR with DTMF fallback)
3. ✅ Enhanced input configuration (Primary/Fallback)
4. ✅ PlayPrompt lambda overload with SSML support

**Phase 2.2** (Medium Priority - Q2 2025):
1. ✅ Dynamic menu framework (Lambda + Helper)
2. ✅ DynamoDB schema for menu configurations
3. ✅ Dynamic attribute support (`PlayPromptDynamic`, `TransferToQueueDynamic`)
4. ✅ Audio file prompts from S3
5. ✅ Multi-language support

---

**Last Updated**: October 26, 2024
**Status**: ✅ Approved - Ready for Implementation
