# Customer Authentication

::: warning ALPHA RELEASE
Switchboard is currently in **preview** (v0.1.0-preview.17). APIs may change between releases.
:::

Verify customer identity using PIN authentication.

## Pattern

```csharp
[ContactFlow("AuthFlow")]
public partial class AuthFlow : FlowDefinitionBase
{
    [Message("For security, please enter your 4-digit PIN")]
    public partial void RequestPin();

    [GetUserInput("Enter PIN", MaxDigits = 4, Timeout = 10)]
    public partial void GetPin();

    [InvokeLambda("ValidatePinFunction", Timeout = 5)]
    [OnSuccess(Target = nameof(Authenticated))]
    [OnError(Target = nameof(InvalidPin))]
    public partial void ValidatePin();

    [Message("PIN verified")]
    [SetAttribute("Authenticated", "true")]
    [TransferToQueue("SecureSupport")]
    public partial void Authenticated();

    [Message("Invalid PIN")]
    [Loop(Target = nameof(GetPin), MaxIterations = 3)]
    public partial void InvalidPin();
}
```

## Lambda Function

```csharp
public class PinValidator
{
    public async Task<AuthResponse> ValidatePin(PinRequest request)
    {
        var pin = request.Pin;
        var customer = request.CustomerNumber;

        // Validate against database
        var isValid = await _db.ValidatePinAsync(customer, pin);

        return new AuthResponse
        {
            IsValid = isValid,
            CustomerName = isValid ? await _db.GetNameAsync(customer) : null
        };
    }
}
```

## Next Steps

- **[IVR Menu](/examples/flows/ivr-menu)** - Menu pattern
- **[Callback](/examples/flows/callback)** - Callback pattern
