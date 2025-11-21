# After Hours Handling

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Route calls differently based on business hours.

## Pattern

```csharp
[HoursOfOperation("BusinessHours", TimeZone = "America/New_York")]
[ContactFlow("AfterHoursFlow")]
public partial class AfterHoursFlow : FlowDefinitionBase
{
    [Message("Welcome")]
    public partial void Welcome();

    [CheckHours("BusinessHours")]
    [OnTrue(Target = nameof(WithinHours))]
    [OnFalse(Target = nameof(AfterHours))]
    public partial void CheckIfOpen();

    [Message("Our agents are available now")]
    [TransferToQueue("Support")]
    public partial void WithinHours();

    [Message("We're closed. Hours: Monday-Friday, 9am-5pm EST")]
    [GetUserInput("Press 1 to leave voicemail, 2 for callback", MaxDigits = 1)]
    [Branch(OnDigit = "1", Target = nameof(Voicemail))]
    [Branch(OnDigit = "2", Target = nameof(ScheduleCallback))]
    public partial void AfterHours();

    [PlayPrompt("s3://bucket/voicemail-instructions.wav")]
    [StartVoicemailRecording]
    [Disconnect]
    public partial void Voicemail();

    [Message("We'll call you tomorrow morning")]
    [SetCallback(Queue = "Support", DelayMinutes = 720)]  // Next day
    [Disconnect]
    public partial void ScheduleCallback();
}
```

## Hours Configuration

Define business hours in DynamoDB or code:

```csharp
var hours = new HoursOfOperation
{
    Monday = new TimeRange("09:00", "17:00"),
    Tuesday = new TimeRange("09:00", "17:00"),
    Wednesday = new TimeRange("09:00", "17:00"),
    Thursday = new TimeRange("09:00", "17:00"),
    Friday = new TimeRange("09:00", "17:00"),
    TimeZone = "America/New_York"
};
```

## Next Steps

- **[IVR Menu](/examples/flows/ivr-menu)** - Menu pattern
- **[Callback](/examples/flows/callback)** - Callback pattern
