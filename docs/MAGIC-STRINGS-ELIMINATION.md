# Eliminating Magic Strings in Switchboard

## Overview

Magic strings are hard-coded string literals scattered throughout code that represent important values like attribute paths, comparison values, and jump targets. They're error-prone, not type-safe, and difficult to refactor.

The Switchboard framework provides comprehensive solutions to eliminate magic strings at every level.

## The Complete Transformation

### ❌ Before (Magic Strings Everywhere)

```csharp
// BEFORE: Full of magic strings, error-prone, no compile-time validation

.InvokeLambda(accountVerificationLambda.FunctionArn, lambda =>
{
    lambda.Parameters["Action"] = "VERIFY_PIN";  // Magic string
    lambda.Parameters["AccountNumber"] = "$.Attributes.AccountNumber";  // Magic string
    lambda.Parameters["PIN"] = "$.Attributes.EnteredPIN";  // Magic string
})
.OnSuccess(success =>
{
    success
        .Branch(branch =>  // Old method name
        {
            branch
                // Magic strings for attribute path AND comparison
                .When("$.External.Authenticated == \"True\"", "authenticated-menu")
                .Otherwise("authentication-failed");  // Magic string label
        })
        // Magic string label repeated
        .PlayPrompt("Welcome!", "authenticated-menu")
        .Disconnect();
})
```

**Problems:**
- ❌ `"$.External.Authenticated == \"True\""` - Complex magic string with escaping
- ❌ `"authenticated-menu"` - Repeated magic string (2 places = 2 chances for typos)
- ❌ `"authentication-failed"` - Another magic string label
- ❌ No compile-time validation
- ❌ No IntelliSense support
- ❌ Difficult to refactor (find all string occurrences)
- ❌ Easy to make typos
- ❌ Method name doesn't match AWS Connect terminology

### ✅ After (Type-Safe, No Magic Strings)

```csharp
// AFTER: Type-safe, refactor-friendly, IntelliSense support

.InvokeLambda(accountVerificationLambda.FunctionArn, lambda =>
{
    lambda.Parameters["Action"] = "VERIFY_PIN";
    lambda.Parameters["AccountNumber"] = Attributes.Contact("AccountNumber");  // ✅ Type-safe
    lambda.Parameters["PIN"] = Attributes.Contact("EnteredPIN");  // ✅ Type-safe
})
.OnSuccess(success =>
{
    success
        .CheckContactAttribute(check =>  // ✅ AWS-aligned name
        {
            check
                .Attribute(Attributes.External("Authenticated"))  // ✅ Type-safe attribute
                .Equals(true, FlowLabels.AuthenticatedMenu)       // ✅ C# bool + type-safe label
                .Otherwise(FlowLabels.AuthenticationFailed);      // ✅ Type-safe label
        })
        .PlayPrompt("Welcome!", FlowLabels.AuthenticatedMenu)  // ✅ Same constant reused
        .Disconnect();
})
```

**Benefits:**
- ✅ Type-safe attribute references: `Attributes.External("Authenticated")`
- ✅ Strong typing for comparisons: `true` (C# bool) instead of `"\"True\""`
- ✅ Static constants for labels: `FlowLabels.AuthenticatedMenu`
- ✅ Compile-time validation everywhere
- ✅ IntelliSense support
- ✅ Refactor-friendly (F2 rename works!)
- ✅ Self-documenting code
- ✅ AWS-aligned method naming

## Three Layers of Magic String Elimination

### 1. Type-Safe Attribute References

**Problem:** Magic attribute paths like `"$.External.Authenticated"`

**Solution:** `AttributeReference` classes with static helpers

```csharp
// Create static class for your attributes
public static class CustomerAttributes
{
    public static ExternalAttribute Authenticated => Attributes.External("Authenticated");
    public static ExternalAttribute AccountBalance => Attributes.External("AccountBalance");
    public static ExternalAttribute CustomerName => Attributes.External("CustomerName");

    public static ContactAttribute AccountNumber => Attributes.Contact("AccountNumber");
    public static ContactAttribute EnteredPIN => Attributes.Contact("EnteredPIN");
    public static ContactAttribute CustomerType => Attributes.Contact("CustomerType");
}

// Usage - clean and type-safe
.CheckContactAttribute(check =>
{
    check
        .Attribute(CustomerAttributes.Authenticated)
        .Equals(true, FlowLabels.AuthenticatedMenu);
})
```

**Built-in System Attributes:**

The framework provides 40+ pre-defined system attributes covering all Amazon Connect namespaces:

```csharp
// Customer Input
SystemAttributes.CustomerInputValue          // $.CustomerInput.Value
SystemAttributes.StoredCustomerInput         // $.StoredCustomerInput

// Customer Endpoint
SystemAttributes.CustomerNumber              // $.CustomerEndpoint.Address
SystemAttributes.CustomerEndpointType        // $.CustomerEndpoint.Type
SystemAttributes.CustomerCallbackNumber      // $.CustomerCallbackNumber

// System Info
SystemAttributes.Channel                     // $.Channel (VOICE, CHAT, TASK)
SystemAttributes.Language                    // $.Language
SystemAttributes.ContactId                   // $.ContactId
SystemAttributes.InitialContactId            // $.InitialContactId
SystemAttributes.PreviousContactId           // $.PreviousContactId
SystemAttributes.InitiationMethod            // $.InitiationMethod
SystemAttributes.InstanceArn                 // $.InstanceARN
SystemAttributes.AwsRegion                   // $.AWSRegion

// Queue Info
SystemAttributes.QueueName                   // $.Queue.Name
SystemAttributes.QueueArn                    // $.Queue.ARN
SystemAttributes.QueueOutboundNumber         // $.Queue.OutboundCallerId.Number

// Display Names
SystemAttributes.CustomerDisplayName         // $.Customer.DisplayName
SystemAttributes.SystemDisplayName           // $.System.DisplayName

// Amazon Lex
SystemAttributes.LexIntentName              // $.Lex.IntentName
SystemAttributes.LexIntentConfidence        // $.Lex.IntentConfidence
SystemAttributes.LexSentimentLabel          // $.Lex.SentimentLabel
SystemAttributes.LexSlot("slotName")        // $.Lex.Slots.{slotName}
SystemAttributes.LexSessionAttribute("key") // $.Lex.SessionAttributes.{key}

// Email Channel
SystemAttributes.CcEmailAddressList         // $.CCEmailAddressList
SystemAttributes.ToEmailAddressList         // $.ToEmailAddressList

// And many more...
```

**See `AttributeReference.cs` for the complete list of 40+ system attributes.**

### 2. Type-Safe Comparisons

**Problem:** Magic comparison strings like `"== \"True\""`

**Solution:** Strongly-typed comparison methods

```csharp
// Boolean comparisons - framework handles "True"/"False" conversion
.Equals(true, targetLabel)     // true → "True"
.Equals(false, targetLabel)    // false → "False"

// String comparisons
.Equals("VIP", targetLabel)
.NotEquals("Inactive", targetLabel)
.Contains("Premium", targetLabel)
.StartsWith("US", targetLabel)

// Numeric comparisons
.GreaterThan(1000, targetLabel)
.LessThan(100, targetLabel)
.GreaterThanOrEqual(500, targetLabel)
.LessThanOrEqual(5000, targetLabel)
```

### 3. Type-Safe Jump Targets (Labels)

**Problem:** Magic label strings like `"authenticated-menu"` repeated everywhere

**Solution:** Static constants in a centralized class

```csharp
// FlowLabels.cs - Single source of truth
public static class FlowLabels
{
    // Main flow labels
    public const string AuthenticatedMenu = "authenticated-menu";
    public const string AuthenticationFailed = "authentication-failed";
    public const string MainMenu = "main-menu";

    // Nested organization for complex flows
    public static class Account
    {
        public const string EnterAccountNumber = "enter-account-number";
        public const string EnterPin = "enter-pin";
        public const string LookupFailed = "account-lookup-failed";
        public const string PinVerificationFailed = "pin-verification-failed";
    }

    public static class Menu
    {
        public const string SalesMenu = "sales-menu";
        public const string SupportMenu = "support-menu";
        public const string AccountServicesMenu = "account-services-menu";
    }

    public static class CustomerType
    {
        public const string VipFlow = "vip-customer-flow";
        public const string PremiumFlow = "premium-customer-flow";
        public const string StandardFlow = "standard-customer-flow";
    }

    public static class Error
    {
        public const string GenericError = "generic-error";
        public const string Timeout = "timeout-error";
        public const string LambdaError = "lambda-error";
    }
}
```

**Usage:**

```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(CustomerAttributes.CustomerType)
        .Equals("VIP", FlowLabels.CustomerType.VipFlow)
        .Equals("Premium", FlowLabels.CustomerType.PremiumFlow)
        .Otherwise(FlowLabels.CustomerType.StandardFlow);
})
.PlayPrompt("Welcome VIP customer!", FlowLabels.CustomerType.VipFlow)
// ... more actions
.PlayPrompt("Welcome premium customer!", FlowLabels.CustomerType.PremiumFlow)
// ... more actions
.PlayPrompt("Welcome!", FlowLabels.CustomerType.StandardFlow)
```

## Complete Real-World Example

Here's a complete authentication flow with zero magic strings:

```csharp
// CustomerAttributes.cs - Type-safe attribute definitions
public static class CustomerAttributes
{
    // External attributes (from Lambda)
    public static ExternalAttribute Authenticated => Attributes.External("Authenticated");
    public static ExternalAttribute AccountBalance => Attributes.External("AccountBalance");
    public static ExternalAttribute CustomerName => Attributes.External("CustomerName");
    public static ExternalAttribute AccountNumber => Attributes.External("AccountNumber");

    // Contact attributes (user-defined)
    public static ContactAttribute EnteredAccountNumber => Attributes.Contact("EnteredAccountNumber");
    public static ContactAttribute EnteredPIN => Attributes.Contact("EnteredPIN");
    public static ContactAttribute AccountLast2 => Attributes.Contact("AccountLast2");
}

// FlowLabels.cs - Type-safe jump targets
public static class FlowLabels
{
    public const string AuthenticatedMenu = "authenticated-menu";
    public const string AuthenticationFailed = "authentication-failed";

    public static class Account
    {
        public const string PinPrompt = "account-pin-prompt";
        public const string LookupError = "account-lookup-error";
    }
}

// AcmeQueues.cs - Type-safe queue names
public static class AcmeQueues
{
    public const string Sales = "A-Sales";
    public const string Support = "A-Support";
}

// Program.cs - The flow with ZERO magic strings
var flow = new FlowBuilder()
    .SetName("Account Authentication Flow")

    // Capture account number
    .GetCustomerInput("Enter your account number followed by the hash key.", input =>
    {
        input.TimeoutSeconds = 10;
        input.EncryptInput = false;
    })
    .OnDefault(accountEntered =>
    {
        accountEntered
            // Store account number - type-safe attribute reference
            .SetContactAttributes(attrs =>
            {
                attrs["EnteredAccountNumber"] = SystemAttributes.CustomerInputValue;
            })

            // Lookup account via Lambda
            .InvokeLambda(accountVerificationLambda.FunctionArn, lambda =>
            {
                lambda.Parameters["Action"] = "LOOKUP";
                lambda.Parameters["AccountNumber"] = CustomerAttributes.EnteredAccountNumber;
            })
            .OnSuccess(lookupSuccess =>
            {
                lookupSuccess
                    // Store Lambda response - type-safe attributes
                    .SetContactAttributes(attrs =>
                    {
                        attrs["AccountNumber"] = CustomerAttributes.AccountNumber;
                        attrs["AccountLast2"] = Attributes.External("AccountLast2");
                    })

                    // Prompt for PIN
                    .PlayPrompt("Please enter your PIN.", FlowLabels.Account.PinPrompt)
                    .GetCustomerInput(input =>
                    {
                        input.TimeoutSeconds = 10;
                        input.EncryptInput = true;  // Secure PIN entry
                    })
                    .OnDefault(pinEntered =>
                    {
                        pinEntered
                            // Verify PIN via Lambda
                            .InvokeLambda(accountVerificationLambda.FunctionArn, verify =>
                            {
                                verify.Parameters["Action"] = "VERIFY_PIN";
                                verify.Parameters["AccountNumber"] = CustomerAttributes.AccountNumber;
                                verify.Parameters["PIN"] = CustomerAttributes.EnteredPIN;
                            })
                            .OnSuccess(verifySuccess =>
                            {
                                verifySuccess
                                    // Type-safe boolean check with static labels
                                    .CheckContactAttribute(check =>
                                    {
                                        check
                                            .Attribute(CustomerAttributes.Authenticated)
                                            .Equals(true, FlowLabels.AuthenticatedMenu)  // ✅ C# bool
                                            .Otherwise(FlowLabels.AuthenticationFailed);
                                    })

                                    // Authenticated path - type-safe label
                                    .PlayPrompt($"Welcome {CustomerAttributes.CustomerName}!",
                                        FlowLabels.AuthenticatedMenu)
                                    .TransferToQueue(AcmeQueues.Support)  // ✅ Type-safe queue
                                    .Disconnect()

                                    // Failed authentication - type-safe label
                                    .PlayPrompt("Invalid PIN. Goodbye.",
                                        FlowLabels.AuthenticationFailed)
                                    .Disconnect();
                            });
                    });
            })
            .OnError(lookupError => lookupError
                .PlayPrompt("Account not found.", FlowLabels.Account.LookupError)
                .Disconnect());
    })
    .Build();
```

## Benefits Summary

| Aspect | Magic Strings | Type-Safe Approach |
|--------|--------------|-------------------|
| **Attribute Paths** | `"$.External.Authenticated"` | `CustomerAttributes.Authenticated` |
| **Comparisons** | `"== \"True\""` | `.Equals(true, ...)` |
| **Labels** | `"authenticated-menu"` | `FlowLabels.AuthenticatedMenu` |
| **Queue Names** | `"A-Support"` | `AcmeQueues.Support` |
| **Compile-Time Validation** | ❌ None | ✅ Full validation |
| **IntelliSense** | ❌ No support | ✅ Full support |
| **Refactoring** | ❌ Find/replace strings | ✅ F2 rename |
| **Typo Protection** | ❌ Runtime errors | ✅ Compile errors |
| **Self-Documenting** | ❌ Unclear | ✅ Very clear |

## Migration Strategy

1. **Create static classes** for your project:
   - `CustomerAttributes.cs` - Attribute references
   - `FlowLabels.cs` - Jump target labels
   - `QueueNames.cs` - Queue name constants

2. **Update usings**:
   ```csharp
   using Switchboard.Models;
   ```

3. **Replace magic strings incrementally**:
   - Start with labels (easiest)
   - Then attribute paths
   - Finally comparison operators

4. **Test after each change** to ensure behavior is identical

5. **Remove old `Branch` calls** once migration is complete

## Best Practices

✅ **DO:**
- Organize constants into logical nested classes
- Use descriptive constant names
- Group related labels together
- Add XML documentation to constants
- Use `const` for compile-time constants

❌ **DON'T:**
- Mix magic strings with type-safe code
- Create duplicate constant definitions
- Use runtime variables for labels (loses refactor benefits)
- Forget to update all references when renaming

## Conclusion

Eliminating magic strings is one of the most impactful improvements you can make to your Switchboard flows:

- **Safer**: Compile-time validation prevents typos and runtime errors
- **Clearer**: Self-documenting code with discoverable constants
- **Maintainable**: Refactoring becomes trivial with F2 rename
- **Professional**: Type-safe code is a hallmark of quality software

The Switchboard framework provides comprehensive support for eliminating magic strings at every level. Use it!
