# 📞 Amazon Connect Flow Blocks - Complete Reference

## Overview

This document provides comprehensive examples of every Amazon Connect contact flow block type with code examples using the framework.

---

## Table of Contents

1. [Interact Blocks](#1-interact-blocks)
2. [Set Blocks](#2-set-blocks)
3. [Branch Blocks](#3-branch-blocks)
4. [Integrate Blocks](#4-integrate-blocks)
5. [Terminate/Transfer Blocks](#5-terminatetransfer-blocks)
6. [Loop Blocks](#6-loop-blocks)
7. [Media Blocks](#7-media-blocks)
8. [Real-World Flow Examples](#8-real-world-flow-examples)

---

## 1. Interact Blocks

### Play Prompt

**Purpose**: Play an audio message or text-to-speech to the customer.

**Attribute-Based Approach**:
```csharp
[ContactFlow("WelcomeFlow")]
public partial class WelcomeFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [PlayPrompt(Type = PromptType.Text)]
    [Text("Welcome to our customer service. Please hold while we connect you.")]
    public partial void WelcomeMessage();

    [Action(Order = 2)]
    [PlayPrompt(Type = PromptType.Audio)]
    [AudioPrompt("welcome-audio")]  // References stored audio file
    public partial void WelcomeAudio();

    [Action(Order = 3)]
    [PlayPrompt(Type = PromptType.SSML)]
    [SSML("<speak>Welcome! <break time='1s'/> How may I help you today?</speak>")]
    public partial void WelcomeSsml();
}
```

**Fluent Builder Approach**:
```csharp
var flow = new FlowBuilder()
    .SetName("WelcomeFlow")
    .AddPlayPrompt(prompt =>
    {
        prompt.Type = PromptType.Text;
        prompt.Text = "Welcome to our customer service";
        prompt.TextToSpeechVoice = "Joanna";
    })
    .ThenAddPlayPrompt(prompt =>
    {
        prompt.Type = PromptType.Audio;
        prompt.AudioPromptArn = "arn:aws:connect:us-east-1:123456789012:instance/.../prompt/...";
    })
    .Build();
```

**Generated CDK Output**:
```csharp
new CfnContactFlow(this, "WelcomeFlow", new CfnContactFlowProps
{
    Content = @"{
        'Version': '2019-10-30',
        'StartAction': 'welcome-message',
        'Actions': [
            {
                'Identifier': 'welcome-message',
                'Type': 'MessageParticipant',
                'Parameters': {
                    'Text': 'Welcome to our customer service',
                    'TextToSpeechType': 'text',
                    'TextToSpeechVoice': 'Joanna'
                },
                'Transitions': {
                    'NextAction': 'welcome-audio'
                }
            }
        ]
    }"
});
```

---

### Get Customer Input

**Purpose**: Collect DTMF input or speech from the customer.

**Attribute-Based**:
```csharp
[ContactFlow("MenuFlow")]
public partial class MenuFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput]
    [Text("For sales, press 1. For support, press 2. For billing, press 3.")]
    [Timeout(5)]
    [MaxDigits(1)]
    public partial Task<InputResult> GetDepartmentChoice();

    [Action(Order = 2)]
    [Branch(nameof(GetDepartmentChoice))]
    public partial void RouteByInput()
    {
        OnDigit("1", () => TransferTo<SalesQueue>());
        OnDigit("2", () => TransferTo<SupportQueue>());
        OnDigit("3", () => TransferTo<BillingQueue>());
        OnTimeout(() => PlayMessage("No input received. Transferring to operator."));
        OnInvalidInput(() => PlayMessage("Invalid selection. Please try again."));
    }
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .SetName("MenuFlow")
    .AddGetCustomerInput(input =>
    {
        input.Text = "For sales, press 1. For support, press 2.";
        input.TextToSpeechVoice = "Joanna";
        input.Timeout = 5;
        input.MaxDigits = 1;
        input.EncryptInput = false;

        // Define branches
        input.OnDigit("1", "transfer-to-sales");
        input.OnDigit("2", "transfer-to-support");
        input.OnTimeout("timeout-action");
        input.OnInvalidInput("invalid-input-action");
    })
    .Build();
```

**Advanced Input - Speech Recognition**:
```csharp
[Action(Order = 1)]
[GetCustomerInput(InputType = InputType.SpeechAndDTMF)]
[Text("Please say or press your account number")]
[SpeechRecognition(
    Grammar = "builtin:grammar/accountnumber",
    Model = "ALEXA"
)]
[DTMFInput(
    MinDigits = 6,
    MaxDigits = 10,
    TerminatingDigit = "#"
)]
public partial Task<InputResult> GetAccountNumber();
```

---

### Store Customer Input

**Purpose**: Capture customer input and store it as a contact attribute.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[StoreCustomerInput]
[AttributeName("AccountNumber")]
[Text("Please enter your 10-digit account number")]
[MaxDigits(10)]
[EncryptInput(true)]
[CustomerInputType(InputType.DTMF)]
public partial Task<string> CaptureAccountNumber();

[Action(Order = 2)]
[Lambda("ValidateAccount")]
[InputParameter("accountNumber", AttributeRef = "AccountNumber")]
public partial Task<ValidationResult> ValidateAccount();
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .AddStoreCustomerInput(input =>
    {
        input.Text = "Please enter your account number";
        input.AttributeName = "AccountNumber";
        input.MaxDigits = 10;
        input.EncryptInput = true;
        input.DisableCancel = false;
    })
    .InvokeLambda(lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:...";
        lambda.InputParameters = new Dictionary<string, string>
        {
            { "accountNumber", "$.Attributes.AccountNumber" }
        };
        lambda.Timeout = 8;
    })
    .Build();
```

---

## 2. Set Blocks

### Set Contact Attributes

**Purpose**: Set custom contact attributes for use later in the flow or for analytics.

**Attribute-Based**:
```csharp
[ContactFlow("SalesFlow")]
public partial class SalesFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [SetContactAttributes]
    [Attribute("Department", "Sales")]
    [Attribute("Priority", "High")]
    [Attribute("CallReason", "ProductInquiry")]
    [Attribute("Timestamp", "$CurrentTimestamp")]
    public partial void SetInitialAttributes();

    [Action(Order = 2)]
    [SetContactAttributes]
    [DynamicAttribute("CustomerTier", Source = AttributeSource.Lambda, Path = "$.tier")]
    [DynamicAttribute("AccountBalance", Source = AttributeSource.External, Path = "$.balance")]
    public partial void SetDynamicAttributes();
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .SetContactAttributes(attributes =>
    {
        attributes.Add("Department", "Sales");
        attributes.Add("Priority", "High");
        attributes.Add("Timestamp", AttributeValue.SystemTimestamp());
        attributes.Add("CustomerTier", AttributeValue.FromLambda("$.tier"));
    })
    .Build();
```

**Real-World Example**:
```csharp
[ContactFlow("CustomerAuthenticationFlow")]
public partial class CustomerAuthFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput]
    [Text("Please enter your phone number")]
    [AttributeName("PhoneNumber")]
    public partial Task<string> GetPhoneNumber();

    [Action(Order = 2)]
    [Lambda("CustomerLookup")]
    [InputParameter("phone", AttributeRef = "PhoneNumber")]
    public partial Task<Customer> LookupCustomer();

    [Action(Order = 3)]
    [SetContactAttributes]
    [Attribute("CustomerId", Source = AttributeSource.Lambda, Path = "$.customerId")]
    [Attribute("CustomerName", Source = AttributeSource.Lambda, Path = "$.name")]
    [Attribute("CustomerTier", Source = AttributeSource.Lambda, Path = "$.tier")]
    [Attribute("AccountStatus", Source = AttributeSource.Lambda, Path = "$.status")]
    [Attribute("IsAuthenticated", "true")]
    public partial void StoreCustomerData();

    [Action(Order = 4)]
    [CheckAttribute("CustomerTier")]
    public partial void RouteByTier()
    {
        When("VIP", () => TransferTo<VipQueue>());
        When("Premium", () => TransferTo<PremiumQueue>());
        Otherwise(() => TransferTo<StandardQueue>());
    }
}
```

---

### Set Working Queue

**Purpose**: Specify which queue the contact should be routed to.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[SetWorkingQueue("SalesQueue")]
public partial void SetQueue();

// Or dynamically based on attribute
[Action(Order = 2)]
[SetWorkingQueue(Source = AttributeSource.ContactAttribute, AttributeName = "TargetQueue")]
public partial void SetDynamicQueue();

// Or based on queue ARN
[Action(Order = 3)]
[SetWorkingQueue(
    QueueArn = "arn:aws:connect:us-east-1:123456789012:instance/.../queue/..."
)]
public partial void SetQueueByArn();
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .SetWorkingQueue(queue =>
    {
        queue.QueueName = "Sales";
        // OR
        queue.QueueArn = "arn:aws:connect:...";
        // OR
        queue.QueueFromAttribute = "$.Attributes.TargetQueue";
    })
    .Build();
```

---

### Set Recording Behavior

**Purpose**: Enable or disable call recording and analytics.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[SetRecordingBehavior(
    RecordAgent = true,
    RecordCustomer = true,
    EnableAnalytics = true
)]
public partial void EnableRecording();

// Conditional recording based on customer consent
[Action(Order = 2)]
[GetCustomerInput]
[Text("This call may be recorded for quality purposes. Press 1 to consent.")]
public partial Task<string> GetRecordingConsent();

[Action(Order = 3)]
[Branch(nameof(GetRecordingConsent))]
public partial void HandleConsent()
{
    OnDigit("1", () =>
    {
        SetRecording(agent: true, customer: true, analytics: true);
    });
    Otherwise(() =>
    {
        SetRecording(agent: true, customer: false, analytics: false);
    });
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .SetRecordingBehavior(recording =>
    {
        recording.RecordAgent = true;
        recording.RecordCustomer = true;
        recording.EnableAnalytics = true;
        recording.AnalyticsMode = AnalyticsMode.PostCall;
    })
    .Build();
```

---

### Set Disconnect Flow

**Purpose**: Specify a flow to run when the customer disconnects.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[SetDisconnectFlow("PostCallSurveyFlow")]
public partial void SetSurveyFlow();
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .SetDisconnectFlow(disconnect =>
    {
        disconnect.FlowArn = "arn:aws:connect:.../contact-flow/survey";
    })
    .Build();
```

---

## 3. Branch Blocks

### Check Contact Attributes

**Purpose**: Branch based on contact attribute values.

**Attribute-Based**:
```csharp
[ContactFlow("CustomerRoutingFlow")]
public partial class CustomerRoutingFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [CheckContactAttribute("CustomerTier")]
    public partial void RouteByTier()
    {
        When("VIP", () => TransferTo<VipQueue>());
        When("Premium", () => TransferTo<PremiumQueue>());
        When("Standard", () => TransferTo<StandardQueue>());
        Otherwise(() => TransferTo<DefaultQueue>());
    }

    [Action(Order = 2)]
    [CheckContactAttribute("AccountBalance")]
    [Condition(Operator.GreaterThan, 10000)]
    public partial void RouteByBalance()
    {
        When(true, () => TransferTo<HighValueQueue>());
        Otherwise(() => TransferTo<StandardQueue>());
    }
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .CheckContactAttribute(check =>
    {
        check.AttributeName = "CustomerTier";
        check.CompareValue("VIP", "vip-branch");
        check.CompareValue("Premium", "premium-branch");
        check.DefaultBranch("standard-branch");
    })
    .Build();
```

**Complex Conditions**:
```csharp
[Action(Order = 1)]
[CheckContactAttribute("AccountStatus")]
[MultipleConditions]
public partial void ComplexRouting()
{
    When(attr => attr.Equals("Active") && attr.Balance > 1000,
         () => TransferTo<PremiumQueue>());

    When(attr => attr.Equals("Active") && attr.Balance <= 1000,
         () => TransferTo<StandardQueue>());

    When(attr => attr.Equals("Suspended"),
         () => PlayMessage("Your account is suspended") + Disconnect());

    Otherwise(() => TransferTo<NewCustomerQueue>());
}
```

---

### Check Hours of Operation

**Purpose**: Branch based on whether it's within business hours.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[CheckHoursOfOperation("BusinessHours")]
public partial void CheckBusinessHours()
{
    OnOpen(() => TransferTo<SalesQueue>());
    OnClosed(() => PlayVoicemailMessage());
}

// Multiple hours of operation
[Action(Order = 2)]
[CheckHoursOfOperation("SalesHours")]
public partial void CheckSalesHours()
{
    OnOpen(() => CheckHoursOfOperation("SupportHours"));
    OnClosed(() => PlayMessage("Sales is closed"));
}

[Action(Order = 3)]
[CheckHoursOfOperation("SupportHours")]
public partial void CheckSupportHours()
{
    OnOpen(() => TransferTo<SupportQueue>());
    OnClosed(() => PlayMessage("All departments are closed"));
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .CheckHoursOfOperation(hours =>
    {
        hours.HoursOfOperationArn = "arn:aws:connect:.../hours/business-hours";
        hours.OnInHours("in-hours-action");
        hours.OnOutOfHours("out-of-hours-action");
    })
    .Build();
```

**Real-World Example**:
```csharp
[ContactFlow("InboundRoutingFlow")]
public partial class InboundRoutingFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [PlayPrompt("Welcome to customer service")]
    public partial void Welcome();

    [Action(Order = 2)]
    [CheckHoursOfOperation("BusinessHours")]
    public partial void CheckHours()
    {
        OnOpen(() => ProceedToDepartmentMenu());
        OnClosed(() => HandleAfterHours());
    }

    [Action(Order = 3)]
    [GetCustomerInput]
    [Text("For sales, press 1. For support, press 2.")]
    public partial Task<string> ProceedToDepartmentMenu();

    [Action(Order = 4)]
    [Sequence]
    public partial void HandleAfterHours()
    {
        PlayMessage("We are currently closed");
        SetQueue("VoicemailQueue");
        PlayMessage("Please leave a message after the tone");
        RecordVoicemail();
        PlayMessage("Thank you. We will call you back");
        Disconnect();
    }
}
```

---

### Check Queue Status

**Purpose**: Check queue metrics before transferring.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[CheckQueueStatus("SalesQueue")]
[Metric(QueueMetric.AgentsAvailable)]
[Threshold(1, Operator.GreaterThanOrEqual)]
public partial void CheckAgentsAvailable()
{
    When(true, () => TransferToQueue("SalesQueue"));
    Otherwise(() => OfferCallback());
}

[Action(Order = 2)]
[CheckQueueStatus("SalesQueue")]
[Metric(QueueMetric.OldestContactAge)]
[Threshold(300, Operator.GreaterThan)]  // 5 minutes
public partial void CheckQueueWaitTime()
{
    When(true, () => OfferCallback());
    Otherwise(() => TransferToQueue("SalesQueue"));
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .CheckQueueStatus(status =>
    {
        status.QueueArn = "arn:aws:connect:.../queue/sales";
        status.Metric = QueueMetric.AgentsAvailable;
        status.ComparisonOperator = Operator.GreaterThanOrEqual;
        status.ComparisonValue = "1";
        status.OnTrue("transfer-to-queue");
        status.OnFalse("offer-callback");
    })
    .Build();
```

**Multiple Queue Check**:
```csharp
[Action(Order = 1)]
[CheckMultipleQueues]
public partial void FindAvailableQueue()
{
    CheckQueue("PremiumSalesQueue", metric: QueueMetric.AgentsAvailable, threshold: 1,
        onAvailable: () => TransferTo<PremiumSalesQueue>());

    CheckQueue("StandardSalesQueue", metric: QueueMetric.AgentsAvailable, threshold: 1,
        onAvailable: () => TransferTo<StandardSalesQueue>());

    Otherwise(() => OfferCallback());
}
```

---

### Distribute by Percentage

**Purpose**: Randomly distribute contacts across branches (A/B testing).

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[DistributeByPercentage]
public partial void ABTest()
{
    Branch("FlowA", 50);  // 50% to Flow A
    Branch("FlowB", 30);  // 30% to Flow B
    Branch("FlowC", 20);  // 20% to Flow C
}

// A/B testing greeting messages
[Action(Order = 2)]
[DistributeByPercentage]
public partial void TestGreetings()
{
    Branch(() => PlayMessage("Welcome! How can I help you?"), 50);
    Branch(() => PlayMessage("Hello! What can I do for you today?"), 50);
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .DistributeByPercentage(distribute =>
    {
        distribute.AddBranch(50, "flow-a");
        distribute.AddBranch(30, "flow-b");
        distribute.AddBranch(20, "flow-c");
    })
    .Build();
```

---

## 4. Integrate Blocks

### Invoke AWS Lambda Function

**Purpose**: Call a Lambda function to retrieve or process data.

**Attribute-Based**:
```csharp
[ContactFlow("CustomerLookupFlow")]
public partial class CustomerLookupFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [GetCustomerInput]
    [Text("Please enter your account number")]
    [AttributeName("AccountNumber")]
    public partial Task<string> GetAccountNumber();

    [Action(Order = 2)]
    [InvokeLambda("CustomerLookupFunction")]
    [InputParameter("accountNumber", AttributeRef = "AccountNumber")]
    [InputParameter("includeHistory", "true")]
    [Timeout(8)]
    public partial Task<CustomerData> LookupCustomer();

    [Action(Order = 3)]
    [SetContactAttributes]
    [Attribute("CustomerId", Source = AttributeSource.Lambda, Path = "$.customerId")]
    [Attribute("CustomerName", Source = AttributeSource.Lambda, Path = "$.name")]
    [Attribute("CustomerTier", Source = AttributeSource.Lambda, Path = "$.tier")]
    public partial void StoreCustomerInfo();

    [Action(Order = 4)]
    [CheckLambdaResult]
    public partial void HandleResult()
    {
        OnSuccess(() => RouteByCustomerTier());
        OnError(() => PlayMessage("Unable to find your account. Transferring to agent."));
    }
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .InvokeLambda(lambda =>
    {
        lambda.FunctionArn = "arn:aws:lambda:us-east-1:123456789012:function:CustomerLookup";
        lambda.InputParameters = new Dictionary<string, string>
        {
            { "accountNumber", "$.Attributes.AccountNumber" },
            { "phoneNumber", "$.CustomerEndpoint.Address" }
        };
        lambda.Timeout = 8;
        lambda.OnSuccess("success-action");
        lambda.OnError("error-action");
    })
    .Build();
```

**Real-World Example - CRM Integration**:
```csharp
[ContactFlow("CRMIntegrationFlow")]
public partial class CRMIntegrationFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [InvokeLambda("GetCustomerFromCRM")]
    [InputParameter("phoneNumber", Source = AttributeSource.System, Path = "$.CustomerEndpoint.Address")]
    [InputParameter("callDirection", Source = AttributeSource.System, Path = "$.InitiationMethod")]
    public partial Task<CRMCustomer> GetCRMData();

    [Action(Order = 2)]
    [Branch(nameof(GetCRMData))]
    public partial void ProcessCRMData()
    {
        OnSuccess(() => WelcomeKnownCustomer());
        OnError(() => WelcomeNewCustomer());
    }

    [Action(Order = 3)]
    [Sequence]
    public partial void WelcomeKnownCustomer()
    {
        SetContactAttributes(
            ("CustomerId", LambdaPath("$.customerId")),
            ("CustomerName", LambdaPath("$.name")),
            ("OpenCases", LambdaPath("$.openCasesCount"))
        );

        PlayMessage($"Welcome back, {LambdaValue("$.name")}");

        // If customer has open cases
        CheckAttribute("OpenCases", op => op > 0,
            onTrue: () => PlayMessage("I see you have an open case. Let me connect you to that team."),
            onFalse: () => TransferTo<StandardSalesQueue>()
        );
    }
}
```

**Lambda Function Handler Example**:
```csharp
// CustomerLookupFunction/Function.cs
public class Function
{
    private readonly ICRMService _crmService;
    private readonly ILogger<Function> _logger;

    public async Task<ConnectLambdaResponse> FunctionHandler(
        ConnectLambdaRequest request,
        ILambdaContext context)
    {
        _logger.LogInformation("Looking up customer with account: {Account}",
            request.Parameters["accountNumber"]);

        try
        {
            var accountNumber = request.Parameters["accountNumber"].ToString();
            var customer = await _crmService.GetCustomerAsync(accountNumber);

            return new ConnectLambdaResponse
            {
                CustomerId = customer.Id,
                Name = customer.Name,
                Tier = customer.Tier,
                Balance = customer.Balance,
                OpenCasesCount = customer.OpenCases.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to lookup customer");
            throw;
        }
    }
}

public class ConnectLambdaRequest
{
    public Dictionary<string, object> Parameters { get; set; }
    public Dictionary<string, string> Attributes { get; set; }
}

public class ConnectLambdaResponse
{
    public string CustomerId { get; set; }
    public string Name { get; set; }
    public string Tier { get; set; }
    public decimal Balance { get; set; }
    public int OpenCasesCount { get; set; }
}
```

---

### Get Customer Input (Integration with Lex)

**Purpose**: Use Amazon Lex for conversational input.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[GetCustomerInput(InputType = InputType.Lex)]
[LexBot(
    BotName = "CustomerServiceBot",
    BotAlias = "Production",
    IntentName = "BookAppointment"
)]
[SessionAttributes]
[Attribute("CustomerName", Source = AttributeSource.ContactAttribute)]
[Attribute("AccountNumber", Source = AttributeSource.ContactAttribute)]
public partial Task<LexResult> GetLexInput();

[Action(Order = 2)]
[Branch(nameof(GetLexInput))]
public partial void HandleLexResult()
{
    OnIntentFulfilled(() => ConfirmAppointment());
    OnIntentFailed(() => TransferToAgent());
    OnError(() => PlayMessage("I'm having trouble understanding. Let me connect you to an agent."));
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .GetLexInput(lex =>
    {
        lex.BotName = "CustomerServiceBot";
        lex.BotAlias = "$LATEST";
        lex.IntentName = "BookAppointment";
        lex.SessionAttributes = new Dictionary<string, string>
        {
            { "CustomerName", "$.Attributes.CustomerName" },
            { "AccountNumber", "$.Attributes.AccountNumber" }
        };
    })
    .Build();
```

---

## 5. Terminate/Transfer Blocks

### Transfer to Queue

**Purpose**: Place the contact in a queue to wait for an agent.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[TransferToQueue("SalesQueue")]
[CallbackNumber(Source = AttributeSource.ContactAttribute, Path = "$.CustomerEndpoint.Address")]
public partial void TransferToSales();

// With custom hold flow
[Action(Order = 2)]
[TransferToQueue("SupportQueue")]
[CustomerHoldFlow("CustomHoldFlow")]
[AgentHoldFlow("AgentWhisperFlow")]
public partial void TransferToSupport();
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .TransferToQueue(transfer =>
    {
        transfer.QueueArn = "arn:aws:connect:.../queue/sales";
        transfer.CallbackNumber = "$.CustomerEndpoint.Address";
    })
    .Build();
```

**Advanced Transfer with Queue Flow**:
```csharp
[ContactFlow("QueueFlow")]
[FlowType(ContactFlowType.CustomerQueue)]
public partial class SalesQueueFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Loop(MaxLoops = 10)]
    public partial void QueueLoop()
    {
        PlayMessage("Thank you for waiting");
        Wait(30);

        CheckQueuePosition(position =>
        {
            if (position <= 3)
                PlayMessage("You are next in line");
            else
                PlayMessage($"You are number {position} in the queue");
        });

        Wait(30);
    }

    [Action(Order = 2)]
    [OnQueueTimeout]
    public partial void HandleTimeout()
    {
        PlayMessage("Sorry for the wait. Would you like a callback?");
        OfferCallback();
    }
}
```

---

### Transfer to Phone Number

**Purpose**: Transfer the call to an external phone number.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[TransferToPhoneNumber("+18005551234")]
[CallerId(Source = AttributeSource.Queue)]  // Use queue's outbound caller ID
public partial void TransferToExternalNumber();

// Dynamic transfer based on attribute
[Action(Order = 2)]
[TransferToPhoneNumber(Source = AttributeSource.ContactAttribute, AttributeName = "TransferNumber")]
[CallerId("+18005559999")]
public partial void TransferToDynamicNumber();
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .TransferToPhoneNumber(transfer =>
    {
        transfer.PhoneNumber = "+18005551234";
        transfer.CallerIdNumber = "$.Queue.OutboundCallerId";
        transfer.Timeout = 30;
    })
    .Build();
```

---

### Transfer to Flow

**Purpose**: Transfer the contact to another contact flow.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[TransferToFlow("EscalationFlow")]
public partial void EscalateToManager();

// Conditional transfer
[Action(Order = 2)]
[CheckContactAttribute("NeedsEscalation")]
public partial void ConditionalEscalate()
{
    When("true", () => TransferToFlow("ManagerEscalationFlow"));
    Otherwise(() => TransferTo<StandardQueue>());
}
```

---

### End Flow / Disconnect

**Purpose**: End the contact.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[Disconnect]
public partial void EndCall();

// With final message
[Action(Order = 2)]
[Sequence]
public partial void DisconnectWithMessage()
{
    PlayMessage("Thank you for calling. Goodbye!");
    Disconnect();
}
```

---

## 6. Loop Blocks

### Loop

**Purpose**: Repeat a set of actions.

**Attribute-Based**:
```csharp
[ContactFlow("RetryFlow")]
public partial class RetryFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Loop(MaxIterations = 3)]
    public partial void RetryAccountNumber()
    {
        GetCustomerInput("Please enter your account number");
        ValidateAccount();

        OnValid(() => ProceedToQueue());
        OnInvalid(() => ContinueLoop());
    }

    [Action(Order = 2)]
    [OnLoopComplete]
    public partial void HandleMaxRetries()
    {
        PlayMessage("Maximum attempts reached. Transferring to agent.");
        TransferTo<AgentQueue>();
    }
}
```

**Fluent Builder**:
```csharp
var flow = new FlowBuilder()
    .StartLoop(loop =>
    {
        loop.MaxIterations = 3;
        loop.LoopActions(actions =>
        {
            actions.GetCustomerInput(input => input.Text = "Enter account number");
            actions.InvokeLambda(lambda => lambda.FunctionArn = "ValidateAccount");
        });
        loop.OnComplete("max-retries-action");
    })
    .Build();
```

**Real-World Example - Interactive Menu**:
```csharp
[ContactFlow("MainMenuFlow")]
public partial class MainMenuFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [Loop(MaxIterations = 5)]
    public partial void MainMenuLoop()
    {
        GetCustomerInput(
            "For sales, press 1. For support, press 2. For account info, press 3."
        );

        Branch(onInput =>
        {
            onInput.Digit("1", () => { ExitLoop(); TransferTo<SalesQueue>(); });
            onInput.Digit("2", () => { ExitLoop(); TransferTo<SupportQueue>(); });
            onInput.Digit("3", () => { ExitLoop(); TransferToFlow("AccountInfoFlow"); });
            onInput.Invalid(() => PlayMessage("Invalid selection. Please try again."));
            onInput.Timeout(() => PlayMessage("No input received. Please make a selection."));
        });
    }

    [Action(Order = 2)]
    [OnLoopComplete]
    public partial void HandleNoSelection()
    {
        PlayMessage("No selection received. Transferring to operator.");
        TransferTo<OperatorQueue>();
    }
}
```

---

### Wait

**Purpose**: Pause the flow for a specified duration.

**Attribute-Based**:
```csharp
[Action(Order = 1)]
[Wait(Seconds = 2)]
public partial void PauseBriefly();

[Action(Order = 2)]
[Sequence]
public partial void PlayWithPause()
{
    PlayMessage("Thank you for your patience");
    Wait(1);
    PlayMessage("An agent will be with you shortly");
    Wait(2);
    TransferTo<Queue>();
}
```

---

## 7. Media Blocks

### Play Prompt (Detailed)

**Text-to-Speech**:
```csharp
[PlayPrompt(Type = PromptType.Text)]
[Text("Welcome to customer service")]
[Voice("Joanna")]  // Amazon Polly voice
public partial void TTSPrompt();
```

**SSML (Speech Synthesis Markup Language)**:
```csharp
[PlayPrompt(Type = PromptType.SSML)]
[SSML(@"
    <speak>
        Welcome to our service.
        <break time='500ms'/>
        For sales, <emphasis level='strong'>press one</emphasis>.
        <break time='300ms'/>
        For support, press two.
    </speak>
")]
public partial void SSMLPrompt();
```

**Audio File**:
```csharp
[PlayPrompt(Type = PromptType.Audio)]
[AudioFile("welcome-message")]  // References uploaded audio
public partial void AudioPrompt();
```

**Dynamic Prompt**:
```csharp
[PlayPrompt(Type = PromptType.Text)]
[DynamicText(Source = AttributeSource.ContactAttribute, AttributeName = "GreetingMessage")]
public partial void DynamicPrompt();

// Or with interpolation
[PlayPrompt(Type = PromptType.Text)]
[Text("Welcome, {CustomerName}. Your account balance is {AccountBalance}.")]
[Interpolate("CustomerName", Source = AttributeSource.ContactAttribute)]
[Interpolate("AccountBalance", Source = AttributeSource.Lambda, Path = "$.balance")]
public partial void InterpolatedPrompt();
```

---

## 8. Real-World Flow Examples

### Complete Customer Service Flow

```csharp
[ContactFlow("CompleteCustomerServiceFlow")]
public partial class CompleteCustomerServiceFlow : FlowDefinitionBase
{
    // 1. Welcome and set recording
    [Action(Order = 1)]
    [Sequence]
    public partial void Initialize()
    {
        SetRecordingBehavior(agent: true, customer: true, analytics: true);
        SetContactAttributes(("FlowStartTime", SystemTimestamp()));
        PlayPrompt("Thank you for calling ABC Company");
    }

    // 2. Check business hours
    [Action(Order = 2)]
    [CheckHoursOfOperation("BusinessHours")]
    public partial void CheckHours()
    {
        OnOpen(() => ProceedToAuthentication());
        OnClosed(() => HandleAfterHours());
    }

    // 3. Customer authentication
    [Action(Order = 3)]
    [Sequence]
    public partial void ProceedToAuthentication()
    {
        PlayPrompt("For faster service, please have your account number ready");
        GetCustomerInput("Please enter your account number", attributeName: "AccountNumber");
        InvokeLambda("CustomerLookup",
            input: ("accountNumber", AttributeRef("AccountNumber")));
    }

    // 4. Process authentication result
    [Action(Order = 4)]
    [CheckLambdaResult]
    public partial void ProcessAuth()
    {
        OnSuccess(() =>
        {
            SetContactAttributes(
                ("CustomerId", LambdaPath("$.customerId")),
                ("CustomerName", LambdaPath("$.name")),
                ("CustomerTier", LambdaPath("$.tier"))
            );
            WelcomeAuthenticatedCustomer();
        });
        OnError(() => WelcomeGuestCustomer());
    }

    // 5. Welcome authenticated customer
    [Action(Order = 5)]
    [Sequence]
    public partial void WelcomeAuthenticatedCustomer()
    {
        PlayPrompt("Welcome back, {CustomerName}",
            interpolate: ("CustomerName", AttributeRef("CustomerName")));
        CheckForOpenCases();
    }

    // 6. Check for open cases
    [Action(Order = 6)]
    [InvokeLambda("GetOpenCases")]
    [InputParameter("customerId", AttributeRef = "CustomerId")]
    public partial Task<CasesResult> CheckForOpenCases();

    [Action(Order = 7)]
    [Branch(nameof(CheckForOpenCases))]
    public partial void HandleOpenCases()
    {
        When(result => result.Count > 0, () =>
        {
            PlayPrompt("I see you have an open case");
            PresentMainMenu();
        });
        Otherwise(() => PresentMainMenu());
    }

    // 8. Main menu
    [Action(Order = 8)]
    [Loop(MaxIterations = 3)]
    public partial void PresentMainMenu()
    {
        GetCustomerInput(@"
            For sales, press 1.
            For technical support, press 2.
            For billing, press 3.
            To speak with an agent, press 0.
        ");

        Branch(input =>
        {
            input.Digit("1", () => RouteToSales());
            input.Digit("2", () => RouteToSupport());
            input.Digit("3", () => RouteToBilling());
            input.Digit("0", () => RouteToAgent());
            input.Invalid(() => PlayPrompt("Invalid selection"));
        });
    }

    // 9. Route to sales
    [Action(Order = 9)]
    [Sequence]
    public partial void RouteToSales()
    {
        CheckQueueStatus("SalesQueue", QueueMetric.AgentsAvailable, threshold: 1,
            onAvailable: () =>
            {
                SetWorkingQueue("SalesQueue");
                PlayPrompt("Connecting you to sales");
                TransferToQueue("SalesQueue");
            },
            onUnavailable: () =>
            {
                PlayPrompt("All sales agents are busy");
                OfferCallback("SalesQueue");
            }
        );
    }

    // 10. Offer callback
    [Action(Order = 10)]
    [Sequence]
    public partial void OfferCallback(string queueName)
    {
        GetCustomerInput("Press 1 for a callback, or press 2 to continue holding");

        Branch(input =>
        {
            input.Digit("1", () => SetupCallback(queueName));
            input.Digit("2", () => TransferToQueue(queueName));
        });
    }

    // 11. Setup callback
    [Action(Order = 11)]
    [Sequence]
    public partial void SetupCallback(string queueName)
    {
        InvokeLambda("CreateCallback",
            input: new
            {
                customerId = AttributeRef("CustomerId"),
                queueName = queueName,
                phoneNumber = SystemAttribute("CustomerEndpoint.Address")
            });

        PlayPrompt("Your callback has been scheduled. Thank you!");
        Disconnect();
    }

    // After hours handling
    [Action(Order = 20)]
    [Sequence]
    public partial void HandleAfterHours()
    {
        PlayPrompt("We are currently closed. Our business hours are Monday through Friday, 8 AM to 6 PM");
        PlayPrompt("Please leave a message and we will call you back");

        SetWorkingQueue("VoicemailQueue");
        StartVoicemailRecording();

        PlayPrompt("Thank you. We will contact you during business hours");
        Disconnect();
    }
}
```

### Advanced Routing Flow with Skills and Priority

```csharp
[ContactFlow("AdvancedRoutingFlow")]
public partial class AdvancedRoutingFlow : FlowDefinitionBase
{
    [Action(Order = 1)]
    [InvokeLambda("GetCustomerProfile")]
    [InputParameter("phoneNumber", SystemPath = "$.CustomerEndpoint.Address")]
    public partial Task<CustomerProfile> GetProfile();

    [Action(Order = 2)]
    [SetContactAttributes]
    [Attribute("CustomerTier", LambdaPath = "$.tier")]
    [Attribute("RequiredSkills", LambdaPath = "$.requiredSkills")]
    [Attribute("Priority", LambdaPath = "$.priority")]
    [Attribute("Language", LambdaPath = "$.preferredLanguage")]
    public partial void SetProfileAttributes();

    [Action(Order = 3)]
    [CheckContactAttribute("Language")]
    public partial void RouteByLanguage()
    {
        When("Spanish", () => RouteToSpanishQueue());
        When("French", () => RouteToFrenchQueue());
        Otherwise(() => RouteToEnglishQueue());
    }

    [Action(Order = 4)]
    [Sequence]
    public partial void RouteToSpanishQueue()
    {
        SetWorkingQueue("Spanish-Sales");

        CheckAttribute("CustomerTier",
            when: "VIP",
            onMatch: () => SetPriority(1),
            onNoMatch: () => SetPriority(5)
        );

        TransferToQueue("Spanish-Sales");
    }
}
```

---

## Summary

This reference guide covers all Amazon Connect flow blocks with:

✅ **Attribute-based examples** - Declarative, clean syntax
✅ **Fluent builder examples** - Programmatic alternative
✅ **Real-world scenarios** - Production-ready patterns
✅ **Lambda integration** - Full end-to-end examples
✅ **Advanced patterns** - Loops, branching, complex routing
✅ **Complete flows** - Full customer service implementations

Each block type includes:
- Purpose and use cases
- Code examples in both approaches
- Generated CDK output (where relevant)
- Real-world integration examples
- Best practices and patterns
