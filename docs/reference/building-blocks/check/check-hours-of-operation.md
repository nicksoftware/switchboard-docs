# CheckHoursOfOperation

Branch the flow based on whether the current time falls within defined business hours.

## Signature

```csharp
ICheckHoursBranchBuilder CheckHoursOfOperation(
    string hoursOfOperationName, 
    string? identifier = null)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hoursOfOperationName` | `string` | Yes | Name or ARN of the hours of operation |
| `identifier` | `string?` | No | Optional identifier for the action |

## Return Value

Returns `ICheckHoursBranchBuilder` which provides:

| Method | Description |
|--------|-------------|
| `.OnInHours(Action<IFlowBuilder>)` | Branch when within business hours |
| `.OnOutOfHours(Action<IFlowBuilder>)` | Branch when outside business hours |
| `.OnError(Action<IFlowBuilder>)` | Branch when an error occurs |

## Examples

### Basic Hours Check

```csharp
Flow.Create("Business Hours Flow")
    .PlayPrompt("Thank you for calling Nick Software.")
    .CheckHoursOfOperation("MainBusinessHours")
        .OnInHours(open => open
            .PlayPrompt("We are open. Transferring to support.")
            .TransferToQueue("Support")
            .Disconnect())
        .OnOutOfHours(closed => closed
            .PlayPrompt("We are currently closed. Our hours are Monday through Friday, 9 AM to 5 PM.")
            .Disconnect())
        .OnError(error => error
            .PlayPrompt("Unable to determine business hours. Transferring to support.")
            .TransferToQueue("Support")
            .Disconnect());
```

### After-Hours Menu

```csharp
Flow.Create("Hours Aware Support")
    .CheckHoursOfOperation("SupportHours")
        .OnInHours(open => open
            .GetCustomerInput("Press 1 for Sales, 2 for Support.")
                .OnDigit("1", sales => sales.TransferToQueue("Sales").Disconnect())
                .OnDigit("2", support => support.TransferToQueue("Support").Disconnect())
                .OnDefault(def => def.TransferToQueue("General").Disconnect())
                .OnTimeout(t => t.TransferToQueue("General").Disconnect()))
        .OnOutOfHours(closed => closed
            .GetCustomerInput("We're closed. Press 1 to leave a voicemail, or 2 for emergency support.")
                .OnDigit("1", voicemail => voicemail
                    .PlayPrompt("Please leave your message after the tone.")
                    .Disconnect())
                .OnDigit("2", emergency => emergency
                    .PlayPrompt("Connecting to emergency support.")
                    .TransferToQueue("EmergencySupport")
                    .Disconnect())
                .OnDefault(def => def
                    .PlayPrompt("Goodbye.")
                    .Disconnect())
                .OnTimeout(t => t
                    .PlayPrompt("Goodbye.")
                    .Disconnect()))
        .OnError(error => error
            .TransferToQueue("Support")
            .Disconnect());
```

### Combined with Staffing Check

```csharp
Flow.Create("Smart Routing")
    .PlayPrompt("Welcome to Nick Software.")
    
    // First check hours
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(open => open
            // During hours, check if agents are available
            .CheckStaffingForQueue("SupportQueue", StaffingMetricType.Available)
                .OnTrue(available => available
                    .PlayPrompt("An agent is available to assist you.")
                    .TransferToQueue("Support"))
                .OnFalse(unavailable => unavailable
                    .PlayPrompt("All agents are currently busy. Please hold.")
                    .TransferToQueue("Support"))
                .OnError(e => e.TransferToQueue("Support")))
        .OnOutOfHours(closed => closed
            .PlayPrompt("We are closed. Please call back during business hours.")
            .Disconnect())
        .OnError(error => error
            .TransferToQueue("Support"))
    .Disconnect();
```

### Multiple Hours Checks

```csharp
Flow.Create("Department Router")
    .GetCustomerInput("Press 1 for Sales, 2 for Support.")
        .OnDigit("1", sales => sales
            .CheckHoursOfOperation("SalesHours")
                .OnInHours(open => open.TransferToQueue("Sales"))
                .OnOutOfHours(closed => closed
                    .PlayPrompt("Sales is closed. Transferring to general support.")
                    .TransferToQueue("Support"))
                .OnError(e => e.TransferToQueue("Support"))
            .Disconnect())
        .OnDigit("2", support => support
            .CheckHoursOfOperation("SupportHours")
                .OnInHours(open => open.TransferToQueue("Support"))
                .OnOutOfHours(closed => closed
                    .PlayPrompt("Support is closed. Please call back tomorrow.")
                    .Disconnect())
                .OnError(e => e.TransferToQueue("Support"))
            .Disconnect())
        .OnDefault(def => def.TransferToQueue("General").Disconnect())
        .OnTimeout(t => t.TransferToQueue("General").Disconnect());
```

### Using ARN

```csharp
// You can use either the name or the full ARN
Flow.Create("ARN Hours Check")
    .CheckHoursOfOperation("arn:aws:connect:us-east-1:123456789012:instance/abc123/operating-hours/def456")
        .OnInHours(open => open.TransferToQueue("Support"))
        .OnOutOfHours(closed => closed.Disconnect())
        .OnError(e => e.TransferToQueue("Support"));
```

### Callback Offering During Closed Hours

```csharp
Flow.Create("Callback Flow")
    .CheckHoursOfOperation("BusinessHours")
        .OnInHours(open => open
            .TransferToQueue("Support")
            .Disconnect())
        .OnOutOfHours(closed => closed
            .PlayPrompt("We're currently closed.")
            .GetCustomerInput("Press 1 to receive a callback when we reopen.")
                .OnDigit("1", callback => callback
                    .SetContactAttributes(attrs =>
                    {
                        attrs["RequestedCallback"] = "true";
                        attrs["CallbackNumber"] = Attributes.System(SystemAttributes.CustomerEndpointAddress);
                    })
                    .PlayPrompt("We will call you back when we reopen. Thank you.")
                    .Disconnect())
                .OnDefault(def => def
                    .PlayPrompt("Thank you for calling. Goodbye.")
                    .Disconnect())
                .OnTimeout(t => t.Disconnect()))
        .OnError(e => e.TransferToQueue("Support").Disconnect());
```

## Setting Up Hours of Operation

Hours of Operation are configured in Amazon Connect. You can:

1. **Create via AWS Console**: Navigate to Routing → Hours of Operation
2. **Create via CDK**: Use Switchboard's resource factories

```csharp
// Creating hours of operation with CDK
var hours = HoursOfOperation.Create("SupportHours", hoursConfig =>
{
    hoursConfig.TimeZone = "America/New_York";
    hoursConfig.AddConfig("MONDAY", "09:00", "17:00");
    hoursConfig.AddConfig("TUESDAY", "09:00", "17:00");
    hoursConfig.AddConfig("WEDNESDAY", "09:00", "17:00");
    hoursConfig.AddConfig("THURSDAY", "09:00", "17:00");
    hoursConfig.AddConfig("FRIDAY", "09:00", "17:00");
});
```

## AWS Connect Block Type

This block generates the `CheckHoursOfOperation` action type in the exported flow JSON.

## Time Zone Considerations

- Hours of Operation use the time zone configured in the Amazon Connect instance
- Consider customers in different time zones
- Holiday schedules need separate handling (typically via Lambda)

## Best Practices

1. **Always handle OnError** - System issues should have fallback routing
2. **Provide clear messages** - Tell customers when you're open
3. **Offer alternatives** - Voicemail, callback, emergency support
4. **Consider holidays** - Use Lambda for complex holiday logic
5. **Test thoroughly** - Verify time zone behavior

## See Also

- [CheckStaffing](./check-staffing.md) - Check agent availability
- [CheckContactAttribute](./check-contact-attribute.md) - General condition checking
- [HoursOfOperation.Create](../stack.md#hoursofoperationcreate) - Creating hours resources
