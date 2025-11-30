# Attribute Reference Quick Guide

## TL;DR - Cheat Sheet

```csharp
using Switchboard.Models;

// Instead of magic strings:
"$.External.Authenticated"           → Attributes.External("Authenticated")
"$.Attributes.CustomerType"          → Attributes.Contact("CustomerType")
"$.CustomerInput.Value"              → SystemAttributes.CustomerInputValue
"$.Channel"                          → SystemAttributes.Channel
"$.Lex.IntentName"                   → SystemAttributes.LexIntentName
```

## The Three Attribute Namespaces

### 1. Contact Attributes (User-Defined)
**Namespace**: `$.Attributes.*`
**When**: You set these with `SetContactAttributes`

```csharp
// Setting attributes
.SetContactAttributes(attrs =>
{
    attrs["CustomerType"] = "VIP";
    attrs["AccountStatus"] = "Active";
})

// Reading attributes (type-safe)
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.Contact("CustomerType"))
        .Equals("VIP", FlowLabels.VipFlow);
})
```

### 2. External Attributes (Lambda Responses)
**Namespace**: `$.External.*`
**When**: Lambda functions return these

```csharp
// Lambda returns: { "Authenticated": true, "Balance": 1500 }

.InvokeLambda(lambdaArn, ...)
.OnSuccess(success =>
{
    success
        .CheckContactAttribute(check =>
        {
            check
                .Attribute(Attributes.External("Authenticated"))
                .Equals(true, FlowLabels.AuthenticatedMenu);
        })
        .SetContactAttributes(attrs =>
        {
            attrs["Balance"] = Attributes.External("Balance");
        });
})
```

### 3. System Attributes (Built-In)
**Namespace**: `$.{various}`
**When**: Provided automatically by Amazon Connect

```csharp
// Check contact channel
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.Channel)
        .Equals("VOICE", "voice-flow")
        .Equals("CHAT", "chat-flow")
        .Otherwise("task-flow");
})

// Route based on queue
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.QueueName)
        .Equals("Sales", "sales-routing")
        .Equals("Support", "support-routing");
})

// Check Lex intent
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.LexIntentName)
        .Equals("OrderStatus", "order-flow")
        .Equals("AccountBalance", "balance-flow");
})
```

## Complete System Attributes List

### Customer Input
| Attribute | Path | Description |
|-----------|------|-------------|
| `CustomerInputValue` | `$.CustomerInput.Value` | DTMF or text input from customer |
| `StoredCustomerInput` | `$.StoredCustomerInput` | Previously stored input |

### Customer Endpoint
| Attribute | Path | Description |
|-----------|------|-------------|
| `CustomerNumber` | `$.CustomerEndpoint.Address` | Customer phone number or chat ID |
| `CustomerEndpointType` | `$.CustomerEndpoint.Type` | TELEPHONE_NUMBER, VOIP, etc. |
| `CustomerCallbackNumber` | `$.CustomerCallbackNumber` | Callback number if set |
| `CustomerDisplayName` | `$.Customer.DisplayName` | Customer's display name |

### System Endpoint
| Attribute | Path | Description |
|-----------|------|-------------|
| `SystemEndpointAddress` | `$.SystemEndpoint.Address` | Your Connect phone number |
| `SystemEndpointType` | `$.SystemEndpoint.Type` | Endpoint type |
| `SystemDisplayName` | `$.System.DisplayName` | System display name |

### Contact Info
| Attribute | Path | Description |
|-----------|------|-------------|
| `Channel` | `$.Channel` | VOICE, CHAT, or TASK |
| `Language` | `$.Language` | Flow language |
| `ContactId` | `$.ContactId` | Unique contact identifier |
| `InitialContactId` | `$.InitialContactId` | First contact in chain |
| `PreviousContactId` | `$.PreviousContactId` | Previous contact ID |
| `RelatedContactId` | `$.RelatedContactId` | Related contact |
| `TaskContactId` | `$.Task.ContactId` | Task contact ID |

### Instance Info
| Attribute | Path | Description |
|-----------|------|-------------|
| `InstanceArn` | `$.InstanceARN` | Connect instance ARN |
| `AwsRegion` | `$.AWSRegion` | AWS region |
| `InitiationMethod` | `$.InitiationMethod` | INBOUND, OUTBOUND, TRANSFER, etc. |
| `ContactFlowName` | `$.Name` | Flow name |
| `ContactFlowDescription` | `$.Description` | Flow description |

### Queue Info
| Attribute | Path | Description |
|-----------|------|-------------|
| `QueueName` | `$.Queue.Name` | Queue name |
| `QueueArn` | `$.Queue.ARN` | Queue ARN |
| `QueueOutboundNumber` | `$.Queue.OutboundCallerId.Number` | Outbound caller ID |

### Amazon Lex
| Attribute | Path | Description |
|-----------|------|-------------|
| `LexIntentName` | `$.Lex.IntentName` | Detected intent |
| `LexIntentConfidence` | `$.Lex.IntentConfidence` | Confidence score (0.0-1.0) |
| `LexSentimentLabel` | `$.Lex.SentimentLabel` | POSITIVE, NEGATIVE, NEUTRAL, MIXED |
| `LexSentimentScore` | `$.Lex.SentimentScore` | Sentiment score |
| `LexSessionAttributes` | `$.Lex.SessionAttributes` | All session attributes |
| `LexSlot("name")` | `$.Lex.Slots.{name}` | Specific slot value |
| `LexSessionAttribute("name")` | `$.Lex.SessionAttributes.{name}` | Specific session attribute |

### Media & TTS
| Attribute | Path | Description |
|-----------|------|-------------|
| `TextToSpeechVoice` | `$.TextToSpeechVoice` | TTS voice setting |
| `CustomerAudioStreamArn` | `$.MediaStreams.Customer.Audio.StreamARN` | Audio stream ARN |

### Email Channel
| Attribute | Path | Description |
|-----------|------|-------------|
| `CcEmailAddressList` | `$.CCEmailAddressList` | CC recipients |
| `ToEmailAddressList` | `$.ToEmailAddressList` | To recipients |

### Other
| Attribute | Path | Description |
|-----------|------|-------------|
| `References` | `$.References` | Contact references |

## Common Patterns

### Pattern 1: Channel-Specific Routing
```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.Channel)
        .Equals("VOICE", FlowLabels.VoiceFlow)
        .Equals("CHAT", FlowLabels.ChatFlow)
        .Equals("TASK", FlowLabels.TaskFlow)
        .Otherwise(FlowLabels.DefaultFlow);
})
```

### Pattern 2: Language-Based Routing
```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.Language)
        .Equals("en-US", FlowLabels.EnglishFlow)
        .Equals("es-ES", FlowLabels.SpanishFlow)
        .Equals("fr-FR", FlowLabels.FrenchFlow)
        .Otherwise(FlowLabels.DefaultLanguageFlow);
})
```

### Pattern 3: Initiation Method Routing
```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.InitiationMethod)
        .Equals("INBOUND", FlowLabels.InboundFlow)
        .Equals("OUTBOUND", FlowLabels.OutboundFlow)
        .Equals("TRANSFER", FlowLabels.TransferFlow)
        .Equals("CALLBACK", FlowLabels.CallbackFlow)
        .Otherwise(FlowLabels.DefaultFlow);
})
```

### Pattern 4: Lex Intent Routing
```csharp
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.LexIntentName)
        .Equals("OrderStatus", FlowLabels.OrderStatusFlow)
        .Equals("AccountBalance", FlowLabels.BalanceFlow)
        .Equals("SpeakToAgent", FlowLabels.AgentTransfer)
        .Otherwise(FlowLabels.MainMenu);
})
```

### Pattern 5: Customer Type from Lambda
```csharp
// Lambda returns: { "CustomerType": "VIP", "AccountTier": "Gold" }

.InvokeLambda(customerLookupLambda, ...)
.OnSuccess(success =>
{
    success
        .CheckContactAttribute(check =>
        {
            check
                .Attribute(Attributes.External("CustomerType"))
                .Equals("VIP", FlowLabels.CustomerType.VipFlow)
                .Equals("Premium", FlowLabels.CustomerType.PremiumFlow)
                .Otherwise(FlowLabels.CustomerType.StandardFlow);
        });
})
```

### Pattern 6: Multi-Condition Check
```csharp
// Check if high-value customer AND English-speaking
.CheckContactAttribute(check =>
{
    check
        .Attribute(Attributes.External("AccountBalance"))
        .GreaterThan(10000, FlowLabels.HighValueCustomer)
        .Otherwise(FlowLabels.StandardCustomer);
})
.PlayPrompt("Welcome valued customer!", FlowLabels.HighValueCustomer)
.CheckContactAttribute(check =>
{
    check
        .Attribute(SystemAttributes.Language)
        .Equals("en-US", FlowLabels.EnglishHighValue)
        .Otherwise(FlowLabels.SpanishHighValue);
})
```

## Pro Tips

### ✅ DO:
- Use `SystemAttributes.*` for built-in Connect attributes
- Use `Attributes.Contact()` for user-defined attributes
- Use `Attributes.External()` for Lambda responses
- Create custom static classes for your domain attributes
- Group related attributes together

```csharp
// Good: Organized domain attributes
public static class CustomerAttributes
{
    public static ExternalAttribute Authenticated => Attributes.External("Authenticated");
    public static ExternalAttribute CustomerTier => Attributes.External("CustomerTier");
    public static ContactAttribute PreferredLanguage => Attributes.Contact("PreferredLanguage");
}
```

### ❌ DON'T:
- Mix magic strings with type-safe references
- Hardcode attribute paths in multiple places
- Forget to check if system attributes exist in your Connect version

## Quick Migration

| Old (Magic String) | New (Type-Safe) |
|-------------------|-----------------|
| `"$.CustomerInput.Value"` | `SystemAttributes.CustomerInputValue` |
| `"$.Channel"` | `SystemAttributes.Channel` |
| `"$.Lex.IntentName"` | `SystemAttributes.LexIntentName` |
| `"$.Attributes.CustomerType"` | `Attributes.Contact("CustomerType")` |
| `"$.External.Authenticated"` | `Attributes.External("Authenticated")` |
| `"$.Queue.Name"` | `SystemAttributes.QueueName` |

## Need Help?

- **Full list**: See `AttributeReference.cs` in the source code
- **AWS Docs**: [Amazon Connect Contact Attributes](https://docs.aws.amazon.com/connect/latest/adminguide/connect-contact-attributes.html)
- **Migration Guide**: See `CHECKCONTACTATTRIBUTE-MIGRATION.md`
- **Magic Strings Guide**: See `MAGIC-STRINGS-ELIMINATION.md`
