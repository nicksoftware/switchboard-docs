# Prompt Configuration API Reference

Complete API reference for prompt configuration classes.

## PlayPromptConfiguration

Configuration for playing prompts to customers with support for text, SSML, audio files, and library prompts.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `PromptType` | `PromptType` | `PromptType.Text` | The type of prompt |
| `Text` | `string?` | `null` | The text to speak (for PromptType.Text) |
| `SSML` | `string?` | `null` | The SSML markup (for PromptType.SSML). Must be valid SSML within `<speak>` tags |
| `Voice` | `string` | `"Joanna"` | The Amazon Polly voice to use for text-to-speech |
| `S3BucketName` | `string?` | `null` | The S3 bucket name containing the audio file (for PromptType.Audio) |
| `S3Key` | `string?` | `null` | The S3 object key/path to the audio file (for PromptType.Audio) |
| `AudioPromptArn` | `string?` | `null` | The audio file ARN from Amazon Connect prompt library (for PromptType.LibraryPrompt) |
| `SpeakingRate` | `double?` | `null` | The speaking rate for neural voices (0.5 to 2.0). 1.0 is normal speed |
| `Pitch` | `string?` | `null` | The pitch for text-to-speech (-50% to +50%) |
| `Volume` | `string?` | `null` | The volume level (silent, x-soft, soft, medium, loud, x-loud, or dB value) |
| `UseNeuralVoice` | `bool` | `false` | Whether to use a neural voice engine (higher quality, more natural) |
| `LanguageCode` | `string?` | `null` | The language code for text-to-speech (e.g., "en-US", "es-US", "fr-CA") |

### Methods

#### Validate()

Validates the configuration and throws an exception if invalid.

**Throws:**
- `InvalidOperationException` - When configuration is invalid

**Validation Rules:**
- `PromptType.Text`: Requires `Text` property
- `PromptType.SSML`: Requires `SSML` property with `<speak>` tags
- `PromptType.Audio`: Requires both `S3BucketName` and `S3Key`
- `PromptType.LibraryPrompt`: Requires `AudioPromptArn`
- `SpeakingRate`: Must be between 0.5 and 2.0 if specified

```csharp
var config = new PlayPromptConfiguration
{
    PromptType = PromptType.Text,
    Text = "Welcome"
};

config.Validate(); // No exception - valid configuration
```

---

## PromptType Enum

Defines the type of prompt to play to the customer.

### Values

| Value | Description |
|-------|-------------|
| `Text` | Plain text that will be converted to speech using Amazon Polly |
| `SSML` | Speech Synthesis Markup Language (SSML) for advanced text-to-speech control |
| `Audio` | Audio file stored in Amazon S3. Supports WAV and MP3 formats |
| `LibraryPrompt` | Amazon Connect prompt library prompt. References a pre-recorded prompt stored in the Connect instance |

---

## Examples

### Text Prompt

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Text;
    prompt.Text = "Welcome to customer service";
    prompt.Voice = "Matthew";
    prompt.LanguageCode = "en-US";
})
```

### SSML Prompt

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome to our service.
        <break time='1s'/>
        How may I <emphasis level='strong'>assist</emphasis> you today?
    </speak>";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true;
})
```

### Audio File Prompt

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "my-prompts-bucket";
    prompt.S3Key = "greetings/welcome-en.wav";
})
```

### Library Prompt

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.LibraryPrompt;
    prompt.AudioPromptArn = "arn:aws:connect:us-east-1:123456789012:instance/abc/prompt/xyz";
})
```

### Neural Voice with Speaking Rate

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = "<speak>I will speak at 1.5 times normal speed</speak>";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true;
    prompt.SpeakingRate = 1.5; // 1.5x speed
})
```

### Multi-Language Prompt

```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Bienvenue à notre service";
    prompt.Voice = "Celine";
    prompt.LanguageCode = "fr-CA"; // Canadian French
    prompt.UseNeuralVoice = true;
})
```

---

## Available Voices

### US English

**Female:**
- `Joanna` - Warm and friendly (neural available)
- `Kendra` - Professional (neural available)
- `Kimberly` - Conversational (neural available)
- `Salli` - Clear (neural available)
- `Ivy` - Young adult (neural available)

**Male:**
- `Matthew` - Professional (neural available)
- `Joey` - Young adult (neural available)
- `Justin` - Young adult (neural available)

### British English

**Female:**
- `Amy` (neural available)
- `Emma` (neural available)

**Male:**
- `Brian` (neural available)

### Other Languages

**Spanish (US):**
- `Lupe` (female, neural)
- `Pedro` (male, neural)

**French (Canadian):**
- `Chantal` (female)

**Portuguese (Brazilian):**
- `Camila` (female, neural)

**For complete list:** [Amazon Polly Voice List](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)

---

## SSML Tags Reference

### Common SSML Tags

```xml
<!-- Pauses -->
<break time="500ms"/>
<break time="2s"/>
<break strength="medium"/>

<!-- Emphasis -->
<emphasis level="strong">important text</emphasis>
<emphasis level="moderate">moderate emphasis</emphasis>
<emphasis level="reduced">less emphasis</emphasis>

<!-- Speaking rate -->
<prosody rate="slow">speak slowly</prosody>
<prosody rate="fast">speak quickly</prosody>
<prosody rate="x-slow">very slow</prosody>

<!-- Volume -->
<prosody volume="soft">quiet voice</prosody>
<prosody volume="loud">loud voice</prosody>
<prosody volume="x-loud">very loud</prosody>

<!-- Pitch -->
<prosody pitch="+10%">higher pitch</prosody>
<prosody pitch="-10%">lower pitch</prosody>

<!-- Say as -->
<say-as interpret-as="spell-out">ABC123</say-as>
<say-as interpret-as="digits">1234567</say-as>
<say-as interpret-as="cardinal">100</say-as>
<say-as interpret-as="ordinal">1</say-as>
<say-as interpret-as="date" format="mdy">12/25/2025</say-as>
<say-as interpret-as="time">2:30pm</say-as>
<say-as interpret-as="telephone">555-1234</say-as>

<!-- Phonemes -->
<phoneme alphabet="ipa" ph="pɪˈkɑːn">pecan</phoneme>

<!-- Substitution -->
<sub alias="World Wide Web Consortium">W3C</sub>
```

---

## Validation Examples

### Valid Configurations

```csharp
// ✅ Valid: Text prompt
var config1 = new PlayPromptConfiguration
{
    PromptType = PromptType.Text,
    Text = "Welcome"
};
config1.Validate(); // OK

// ✅ Valid: SSML with speak tags
var config2 = new PlayPromptConfiguration
{
    PromptType = PromptType.SSML,
    SSML = "<speak>Welcome</speak>"
};
config2.Validate(); // OK

// ✅ Valid: Audio with both bucket and key
var config3 = new PlayPromptConfiguration
{
    PromptType = PromptType.Audio,
    S3BucketName = "my-bucket",
    S3Key = "welcome.wav"
};
config3.Validate(); // OK

// ✅ Valid: Speaking rate in range
var config4 = new PlayPromptConfiguration
{
    PromptType = PromptType.SSML,
    SSML = "<speak>Test</speak>",
    SpeakingRate = 1.5
};
config4.Validate(); // OK
```

### Invalid Configurations

```csharp
// ❌ Invalid: Missing text
var bad1 = new PlayPromptConfiguration
{
    PromptType = PromptType.Text
    // Text is null
};
bad1.Validate();
// Throws: "Text is required when PromptType is Text"

// ❌ Invalid: SSML without speak tags
var bad2 = new PlayPromptConfiguration
{
    PromptType = PromptType.SSML,
    SSML = "Welcome" // Missing <speak> tags
};
bad2.Validate();
// Throws: "SSML must be wrapped in <speak> tags"

// ❌ Invalid: Audio missing S3Key
var bad3 = new PlayPromptConfiguration
{
    PromptType = PromptType.Audio,
    S3BucketName = "my-bucket"
    // S3Key is null
};
bad3.Validate();
// Throws: "S3BucketName and S3Key are required when PromptType is Audio"

// ❌ Invalid: Speaking rate too high
var bad4 = new PlayPromptConfiguration
{
    PromptType = PromptType.SSML,
    SSML = "<speak>Test</speak>",
    SpeakingRate = 2.5 // Above 2.0
};
bad4.Validate();
// Throws: "SpeakingRate must be between 0.5 and 2.0"
```

---

## Audio File Requirements

When using `PromptType.Audio`:

**Supported Formats:**
- WAV (recommended): 8 kHz, 16-bit, mono
- MP3: Up to 48 kHz

**Best Practices:**
- Use WAV for best quality
- 8 kHz sample rate for telephony
- 16-bit depth
- Mono (single channel)
- Keep files under 50 MB
- Use consistent audio levels

**S3 Bucket Permissions:**
- Amazon Connect must have read access to the S3 bucket
- Configure bucket policy or IAM role permissions
- See [AWS Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-release-notes.html) for details

---

## See Also

- [Advanced Prompts Guide](/guide/flows/prompts)
- [Flow Builders Reference](/guide/flows/fluent-builders)
- [SSML Reference](https://docs.aws.amazon.com/polly/latest/dg/ssml.html)
- [Amazon Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)
