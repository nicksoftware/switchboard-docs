# Flow Building Blocks Reference

This section provides comprehensive API documentation for each flow block available in Switchboard. Flow blocks are the core building units for creating Amazon Connect contact flows.

## Block Categories

### [Interact](./interact/index.md)
Blocks that interact with customers through prompts and input collection.

- [PlayPrompt](./interact/play-prompt.md) - Play audio or text-to-speech to the customer
- [GetCustomerInput](./interact/get-customer-input.md) - Collect DTMF or voice input from customers
- [StoreCustomerInput](./interact/store-customer-input.md) - Securely capture and encrypt sensitive input
- [HoldCustomerOrAgent](./interact/hold-customer-or-agent.md) - Place customer or agent on hold

### [Check](./check/index.md)
Blocks that evaluate conditions and branch the flow accordingly.

- [CheckContactAttribute](./check/check-contact-attribute.md) - Branch based on contact attribute values
- [CheckHoursOfOperation](./check/check-hours-of-operation.md) - Branch based on business hours
- [CheckStaffing](./check/check-staffing.md) - Branch based on agent availability
- [CheckQueueStatus](./check/check-queue-status.md) - Branch based on queue metrics

### [Integrate](./integrate/index.md)
Blocks that integrate with external systems and other flows.

- [InvokeLambda](./integrate/invoke-lambda.md) - Call AWS Lambda functions
- [InvokeFlow](./integrate/invoke-flow.md) - Transfer to another contact flow

### [Set](./set/index.md)
Blocks that configure contact properties and behaviors.

- [SetContactAttributes](./set/set-contact-attributes.md) - Set or update contact attributes
- [SetLoggingBehavior](./set/set-logging-behavior.md) - Enable or disable flow logging
- [SetRecordingBehavior](./set/set-recording-behavior.md) - Control call recording
- [SetWhisperFlow](./set/set-whisper-flow.md) - Configure whisper flows for agents
- [SetQueueMetrics](./set/set-queue-metrics.md) - Retrieve queue statistics
- [SetCallback](./set/set-callback.md) - Configure callback settings

### [Terminate](./terminate/index.md)
Blocks that end or transfer the contact flow.

- [Disconnect](./terminate/disconnect.md) - End the contact
- [EndFlowExecution](./terminate/end-flow-execution.md) - End the current flow without disconnecting
- [TransferToQueue](./terminate/transfer-to-queue.md) - Transfer to an agent queue
- [TransferToFlow](./terminate/transfer-to-flow.md) - Transfer to another flow
- [TransferToThirdParty](./terminate/transfer-to-third-party.md) - Transfer to external phone number

### [Logic](./logic/index.md)
Blocks that control flow execution logic.

- [Loop](./logic/loop.md) - Repeat a section of the flow
- [Wait](./logic/wait.md) - Pause flow execution

## Common Patterns

### Error Handling

Most blocks support error handling through `.OnError()`:

```csharp
.PlayPrompt("Welcome!")
    .OnError(error => error
        .PlayPrompt("Technical difficulties. Please try again.")
        .Disconnect())
```

### Branch Continuation

Use `.ThenContinue()` to explicitly continue to the next action after a branch:

```csharp
.GetCustomerInput("Press 1 for Sales, 2 for Support")
    .OnDigit("1", sales => sales
        .SetContactAttributes(attrs => attrs["Department"] = "Sales")
        .ThenContinue())  // Continue to next action after this branch
    .OnDigit("2", support => support
        .SetContactAttributes(attrs => attrs["Department"] = "Support")
        .ThenContinue())
.TransferToQueue("General")  // Both branches continue here
```

### Join Points

Use `.JoinPoint()` and `.ContinueAt()` for complex flow convergence:

```csharp
.PlayPrompt("Welcome!", "MainMenu")
.GetCustomerInput("Press 1 or 2")
    .OnDigit("1", one => one
        .PlayPrompt("You pressed 1")
        .ContinueAt("MainMenu"))  // Go back to main menu
    .OnDigit("2", two => two
        .TransferToQueue("Support"))
```

## Quick Reference

| Block | Category | Purpose |
|-------|----------|---------|
| `PlayPrompt()` | Interact | Play audio/TTS message |
| `GetCustomerInput()` | Interact | Collect DTMF/voice input |
| `StoreCustomerInput()` | Interact | Capture encrypted input |
| `CheckContactAttribute()` | Check | Branch on attribute values |
| `CheckHoursOfOperation()` | Check | Branch on business hours |
| `CheckStaffing()` | Check | Branch on agent availability |
| `InvokeLambda()` | Integrate | Call Lambda function |
| `SetContactAttributes()` | Set | Update contact attributes |
| `SetLoggingBehavior()` | Set | Configure logging |
| `Loop()` | Logic | Repeat flow section |
| `Wait()` | Logic | Pause execution |
| `Disconnect()` | Terminate | End contact |
| `TransferToQueue()` | Terminate | Transfer to queue |
| `TransferToFlow()` | Terminate | Transfer to flow |
