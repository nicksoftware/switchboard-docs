---
layout: home

hero:
  name: Switchboard
  text: Code-First Contact Center Infrastructure
  tagline: Build and manage Amazon Connect with AWS CDK and .NET - No more JSON wrestling
  actions:
    - theme: brand
      text: Get Started in 5 Minutes
      link: /guide/quick-start
    - theme: alt
      text: See Examples
      link: /examples/minimal-setup
    - theme: alt
      text: Why Switchboard?
      link: #why-i-built-this

features:
  - icon: 🎯
    title: Declarative & Type-Safe
    details: Define flows with attributes or fluent builders. IntelliSense guides you, Roslyn analyzers catch errors before deployment.

  - icon: 🏗️
    title: Infrastructure as Code
    details: Version-controlled, reviewable, testable contact center config. Built on AWS CDK - no manual console clicking.

  - icon: ⚡
    title: Zero-Downtime Updates
    details: Change flow parameters in DynamoDB without redeploying infrastructure. Update messages, routing rules, hours - instantly.

  - icon: 🔍
    title: Compile-Time Safety
    details: Find bugs at build time, not runtime. Missing queues, broken references, invalid flows - all caught before deployment.

  - icon: 📦
    title: Simple Installation
    details: "One command: dotnet add package. No framework cloning, no complex setup. Install and start building."

  - icon: 🚀
    title: Production Battle-Tested
    details: Multi-region, high availability, disaster recovery, monitoring, logging. Built for enterprise scale.
---

## Quick Example

```csharp

var app = new SwitchboardApp();
var uniqueAlias = "switchboard-demo-66890";
var callCenter = app.CreateCallCenter("SimpleCallCenter", uniqueAlias);


// 1. Create business hours (Mon-Fri 9am-5pm)
var businessHours = new HoursOfOperation
{
    Name = "BusinessHours",
    TimeZone = "America/New_York"
};

for (var day = DayOfWeek.Monday; day <= DayOfWeek.Friday; day++)
{
    businessHours.AddDayConfig(new HoursOfOperationConfig
    {
        Day = day,
        StartTime = new TimeRange { Hours = 9, Minutes = 0 },
        EndTime = new TimeRange { Hours = 17, Minutes = 0 }
    });
}

callCenter
.AddHoursOfOperation(businessHours);

// 2. Create queues
var salesQueue = new QueueBuilder()
    .SetName(AcmeQueues.Sales)
    .SetDescription("Sales inquiries queue")
    .SetMaxContacts(50)
    .AddTag("Department", "Sales")
    .Build();

var supportQueue = new QueueBuilder()
    .SetName(AcmeQueues.Support)
    .SetDescription("Technical support queue")
    .SetMaxContacts(100)
    .AddTag("Department", "Support")
    .Build();


callCenter.AddQueue(salesQueue, businessHours.Name);
callCenter.AddQueue(supportQueue, businessHours.Name);

var flow = new FlowBuilder()
    .SetName("General Support Inbound")
    .SetType(FlowType.ContactFlow)
    .SetDescription("Verifying stable construct IDs prevent resource replacement!")
    .AddTag("Department", "Support")
    .SetStatus("SAVED") // Use SAVED to skip validation for GetParticipantInput (AWS API limitation workaround)
     .SetContactAttributes(config =>
            {
                config["support_queue"] = "support";
            })
    // 1. Welcome message (SSML)
    .PlayPrompt(message =>
    {
        message.PromptType = PromptType.SSML;
        message.SSML = "<speak>\nWelcome to the Nicksoftware general support line. We are looking forward to supporting you.\n</speak>";
    })

    // 2. Main menu with GetCustomerInput
    .GetCustomerInput("For General Enquiries, press 1. For software support, press 2. For cloud support, press 3. To speak to an agent, press 4.", input =>
    {
        input.TimeoutSeconds = 5;
        input.EncryptInput = false;
        input.MaxDigits = 1;
    })
    .OnDefault(deflt => deflt.Disconnect())
    .OnTimeout(timeout => timeout.Disconnect())
    .OnError(error => error.Disconnect())
    .OnDigit("1", generalEnquiries =>
    {
        generalEnquiries
            .PlayPrompt("Your call is important to us please wait while we transfer you to our support agents")
             .TransferToQueueDynamic("$.Attributes.support_queue")
            .Disconnect();
    })
    // Digit 2: Software Support → Support queue
    .OnDigit("2", softwareSupport =>
    {
        softwareSupport
            .PlayPrompt("Your call is important to us please wait while we transfer you to our support agents")
            .TransferToQueueDynamic("$.Attributes.support_queue")
            .Disconnect();
    })
    // Digit 3: Temporarily removed TransferToThirdParty to test
    .OnDigit("3", cloudSupport =>
    {
        cloudSupport
            .PlayPrompt("Your call is important to us please wait while we transfer you to our cloud support specialists")
            .TransferToThirdParty("+18005550199") // Example number
            .Disconnect();
    })
    // Digit 4: Speak to Agent → Support queue
    .OnDigit("4", speakToAgent =>
    {
        speakToAgent
            .PlayPrompt("Your call is important to us please wait while we transfer you to our support agents")
            .TransferToQueueDynamic("$.Attributes.support_queue")
            .Disconnect();
    })
    .Disconnect()
    .Build();

callCenter.AddFlow(flow);

app.Synth();

public class AcmeQueues
{
    public const string Sales = "A-Sales";
    public const string Support = "A-Support";
};

```

## Installation

```bash
dotnet add package NickSoftware.Switchboard --prerelease
npm install -g aws-cdk
```

## Why I Built This

### The Problem I Faced

I'm a software engineer, not a DevOps or cloud engineer. When I started working with Amazon Connect at my job, I struggled—**a lot**.

**The reality of traditional Amazon Connect development:**

- **Massive JSON templates** for flows and queues that are impossible to read or understand
- **Manual ARN replacement** every time you export/import a flow (copy, paste, find, replace... hope you didn't miss one)
- **Zero validation** until deployment—you only discover errors after pushing to AWS
- **No version control** that makes sense—diffing JSON files with generated IDs is useless
- **No collaboration**—how do you review a 2,000-line JSON blob?
- **Hidden bugs** that only surface in production when customers are calling

**The gap between teams was huge.** Different organizations had their own patterns and frameworks involving complex JSON templates. Every time someone exported a flow, they'd manually replace ARNs in massive JSON objects. Errors were inevitable.

### The Breaking Point

After multiple times I deployed a flow with a typo in the JSON config, then having to modify it in the console because working with the JSON directly was nearly impossible, then having to update the JSON with dynamic values and accidentally missing a variable, I knew there had to be a better way.

**I'm a developer. I wanted to write code.**

### The Solution: Code-First Contact Centers

With a code-first approach:

✅ **Code is readable and understandable**—flows look like actual logic, not configuration soup
✅ **Real collaboration**—code reviews, pull requests, team development
✅ **Self-documenting**—the code speaks for itself about what gets created
✅ **Compile-time safety**—find errors before deployment, not after
✅ **Minimal boilerplate**—attributes and source generators handle the repetitive stuff
✅ **Built on CDK**—you still have full power to customize when needed
✅ **Version control that works**—meaningful diffs, rollback capability, audit trail

### For Developers, By a Developer

Switchboard was built to solve **my** problems. Maybe you have the same ones:

- You prefer writing code over clicking through consoles
- You want type safety and IntelliSense support
- You believe infrastructure should be version-controlled
- You think bugs should be caught at compile-time, not runtime
- You need to collaborate with your team effectively

If this resonates with you, **Switchboard is for you.**

---

**Ready to stop wrestling with JSON and start writing code?**

👉 [Get Started in 5 Minutes](/guide/quick-start)
