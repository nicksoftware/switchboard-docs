# Advanced Prompt Configuration

The Switchboard framework provides powerful prompt capabilities including text-to-speech, SSML, audio files, and multi-language support.

## Overview

Prompts can be configured in two ways:

1. **Simple Text Prompts** - Quick, inline text strings
2. **Advanced Configuration** - Full control over voice, language, SSML, audio files, and more

## Simple Text Prompts

For basic prompts, use the simple string overload:

```csharp
.PlayPrompt("Welcome to our service")
.PlayPrompt("Thank you for calling")
```

## Advanced Prompt Configuration

For advanced scenarios, use the configuration lambda:

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Text;
    prompt.Text = "Welcome to our service";
    prompt.Voice = "Matthew";
    prompt.LanguageCode = "en-US";
    prompt.UseNeuralVoice = true;
})
```

## Prompt Types

The framework supports four prompt types:

### 1. Text (Default)

Plain text converted to speech using Amazon Polly:

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Text; // Default
    prompt.Text = "Welcome to customer service";
    prompt.Voice = "Joanna"; // US English female voice
})
```

### 2. SSML (Speech Synthesis Markup Language)

Advanced speech control with pauses, emphasis, pronunciation, and more:

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome to our service.
        <break time='1s'/>
        How may I <emphasis level='strong'>assist</emphasis> you today?
    </speak>";
    prompt.Voice = "Matthew";
    prompt.UseNeuralVoice = true;
})
```

### 3. Audio Files (S3)

Pre-recorded audio files stored in Amazon S3:

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "my-prompts-bucket";
    prompt.S3Key = "welcome-message.wav";
})
```

### 4. Library Prompts

Amazon Connect prompt library prompts:

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.LibraryPrompt;
    prompt.AudioPromptArn = "arn:aws:connect:us-east-1:123456789012:instance/abc123/prompt/xyz789";
})
```

## SSML Examples

### Pauses and Breaks

```csharp
prompt.SSML = @"<speak>
    Welcome to customer service.
    <break time='500ms'/>
    Please listen carefully to the following options.
</speak>";
```

### Emphasis

```csharp
prompt.SSML = @"<speak>
    This is <emphasis level='moderate'>important</emphasis>.
    Please <emphasis level='strong'>do not</emphasis> hang up.
</speak>";
```

### Speaking Rate

```csharp
prompt.SSML = @"<speak>
    <prosody rate='slow'>
        I will speak slowly for clarity.
    </prosody>
    <break time='1s'/>
    <prosody rate='fast'>
        Now I'll speak quickly.
    </prosody>
</speak>";
```

### Volume Control

```csharp
prompt.SSML = @"<speak>
    <prosody volume='soft'>This is soft.</prosody>
    <prosody volume='loud'>This is loud!</prosody>
</speak>";
```

### Pronunciation

```csharp
prompt.SSML = @"<speak>
    The chemical symbol is
    <say-as interpret-as='spell-out'>H2O</say-as>.
    Your confirmation number is
    <say-as interpret-as='digits'>1234567</say-as>.
</speak>";
```

### Numbers and Dates

```csharp
prompt.SSML = @"<speak>
    Your appointment is on
    <say-as interpret-as='date' format='mdy'>12/25/2025</say-as>
    at
    <say-as interpret-as='time'>2:30pm</say-as>.
</speak>";
```

## Voice Selection

### Popular US English Voices

```csharp
// Female voices
prompt.Voice = "Joanna";  // US English, warm and friendly
prompt.Voice = "Kendra";  // US English, professional
prompt.Voice = "Kimberly"; // US English, conversational
prompt.Voice = "Salli";   // US English, clear
prompt.Voice = "Ivy";     // US English, young adult

// Male voices
prompt.Voice = "Matthew"; // US English, professional
prompt.Voice = "Joey";    // US English, young adult
prompt.Voice = "Justin";  // US English, young adult
```

### International Voices

```csharp
// British English
prompt.Voice = "Amy";    // British English female
prompt.Voice = "Emma";   // British English female
prompt.Voice = "Brian";  // British English male

// Canadian French
prompt.Voice = "Chantal"; // Canadian French female

// Mexican Spanish
prompt.Voice = "Mia";    // Mexican Spanish female

// Brazilian Portuguese
prompt.Voice = "Camila"; // Brazilian Portuguese female, neural
```

### Complete Voice List

For a complete list of available voices, see:
[Amazon Polly Voice List](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html)

## Neural Voices

Neural voices provide more natural, human-like speech:

```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Welcome to our premium service";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true; // Enable neural engine
})
```

**Neural Voice Benefits:**
- More natural intonation and rhythm
- Better prosody (stress and timing)
- Smoother speech quality
- Higher cost (check AWS pricing)

**Availability:**
- Not all voices support neural mode
- Check voice compatibility in AWS documentation
- Falls back to standard if neural unavailable

## Multi-Language Support

### Language Code Configuration

```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Bienvenue à notre service";
    prompt.Voice = "Celine";
    prompt.LanguageCode = "fr-CA"; // Canadian French
    prompt.UseNeuralVoice = true;
})
```

### Language-Specific Examples

**Spanish (US):**
```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Bienvenido a nuestro servicio de atención al cliente";
    prompt.Voice = "Lupe";  // US Spanish neural
    prompt.LanguageCode = "es-US";
    prompt.UseNeuralVoice = true;
})
```

**French (Canadian):**
```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Bienvenue à notre service client";
    prompt.Voice = "Chantal";
    prompt.LanguageCode = "fr-CA";
})
```

**Portuguese (Brazilian):**
```csharp
.PlayPrompt(prompt =>
{
    prompt.Text = "Bem-vindo ao nosso serviço de atendimento ao cliente";
    prompt.Voice = "Camila";
    prompt.LanguageCode = "pt-BR";
    prompt.UseNeuralVoice = true;
})
```

## Audio File Prompts

### S3 Audio Configuration

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "my-company-prompts";
    prompt.S3Key = "greetings/welcome-en.wav";
})
```

### Audio File Requirements

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

### S3 Bucket Setup

```bash
# Create S3 bucket for prompts
aws s3 mb s3://my-company-prompts

# Upload audio file
aws s3 cp welcome.wav s3://my-company-prompts/greetings/

# Set bucket policy for Amazon Connect access
# (See AWS Connect documentation for IAM policy)
```

## Complex SSML Examples

### Professional IVR Greeting

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Thank you for calling
        <emphasis level='moderate'>Acme Corporation</emphasis>.
        <break time='500ms'/>
        Your call may be monitored or recorded for quality assurance purposes.
        <break time='1s'/>
        Please listen carefully as our menu options have changed.
    </speak>";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true;
})
```

### After Hours Message

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Thank you for calling.
        <break time='500ms'/>
        Our office is currently <emphasis level='strong'>closed</emphasis>.
        <break time='1s'/>
        Our business hours are
        <prosody rate='slow'>
            Monday through Friday, 9 AM to 5 PM Eastern Time.
        </prosody>
        <break time='1s'/>
        Please call back during business hours,
        or visit our website at
        <say-as interpret-as='spell-out'>www</say-as> dot acme dot com.
    </speak>";
    prompt.Voice = "Matthew";
})
```

### Account Information Readback

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = $@"<speak>
        Your account number is
        <say-as interpret-as='digits'>{accountNumber}</say-as>.
        <break time='1s'/>
        Your current balance is
        <say-as interpret-as='cardinal'>{balance}</say-as>
        dollars and
        <say-as interpret-as='cardinal'>{cents}</say-as>
        cents.
    </speak>";
    prompt.Voice = "Kendra";
})
```

## Dynamic Prompts

### Context-Based Greetings

```csharp
// Time-based greeting
var greeting = DateTime.Now.Hour < 12 ? "Good morning" :
               DateTime.Now.Hour < 17 ? "Good afternoon" :
               "Good evening";

.PlayPrompt(prompt =>
{
    prompt.Text = $"{greeting}, welcome to customer service";
    prompt.Voice = "Joanna";
})
```

### Personalized Messages

```csharp
// Using contact attributes
.SetContactAttributes(attrs =>
{
    attrs["CustomerName"] = "$.External.CustomerName";
    attrs["AccountType"] = "$.External.AccountType";
})
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome back
        <emphasis level='moderate'>
            <say-as interpret-as='name'>$.Attributes.CustomerName</say-as>
        </emphasis>.
        <break time='500ms'/>
        I see you have a $.Attributes.AccountType account.
    </speak>";
})
```

## Validation

The framework automatically validates prompt configuration:

```csharp
// ✅ Valid: Text provided
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Text;
    prompt.Text = "Welcome";
})

// ❌ Invalid: Missing text
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Text;
    // Throws: "Text is required when PromptType is Text"
})

// ❌ Invalid: Invalid SSML
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = "Missing speak tags";
    // Throws: "SSML must be wrapped in <speak> tags"
})

// ❌ Invalid: Missing S3 info
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "my-bucket";
    // Throws: "S3BucketName and S3Key are required when PromptType is Audio"
})
```

## Best Practices

### 1. Use Appropriate Prompt Types

```csharp
// Simple messages: Use Text
.PlayPrompt("Thank you for calling")

// Complex messages: Use SSML
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = "<speak>Your payment of <say-as interpret-as='currency'>$100.50</say-as> has been received</speak>";
})

// Branding/consistency: Use Audio
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "company-branding";
    prompt.S3Key = "welcome-message.wav";
})
```

### 2. Voice Consistency

```csharp
// Pick one voice and stick with it throughout the flow
const string VOICE = "Joanna";

.PlayPrompt(prompt => { prompt.Voice = VOICE; prompt.Text = "Welcome"; })
.PlayPrompt(prompt => { prompt.Voice = VOICE; prompt.Text = "Thank you"; })
```

### 3. Neural Voices for Customer Experience

```csharp
// Use neural voices for customer-facing prompts
.PlayPrompt(prompt =>
{
    prompt.Text = "Welcome valued customer";
    prompt.Voice = "Joanna";
    prompt.UseNeuralVoice = true; // More natural sound
})

// Use standard voices for internal/testing
.PlayPrompt(prompt =>
{
    prompt.Text = "Test environment - agent callback";
    prompt.Voice = "Matthew";
    prompt.UseNeuralVoice = false; // Lower cost
})
```

### 4. Accessibility

```csharp
// Use clear, slow speech for important information
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        <prosody rate='slow'>
            Your confirmation code is
            <say-as interpret-as='spell-out'>A B C 1 2 3</say-as>.
        </prosody>
        <break time='2s'/>
        I'll repeat that.
        <prosody rate='slow'>
            <say-as interpret-as='spell-out'>A B C 1 2 3</say-as>.
        </prosody>
    </speak>";
})
```

### 5. Testing Different Voices

```csharp
#if DEBUG
    const string VOICE = "Matthew"; // Fast to test
#else
    const string VOICE = "Joanna";  // Production voice
    const bool NEURAL = true;
#endif
```

## Common Patterns

### Multi-Step Confirmation

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        I heard you say
        <emphasis level='strong'>cancel my subscription</emphasis>.
        <break time='1s'/>
        Press 1 to confirm, or press 2 to return to the main menu.
    </speak>";
    prompt.Voice = "Kendra";
})
```

### Hold Music Simulation

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.Audio;
    prompt.S3BucketName = "company-audio";
    prompt.S3Key = "hold-music/jazz-loop.mp3";
})
```

### Bilingual Greeting

```csharp
.PlayPrompt(prompt =>
{
    prompt.PromptType = PromptType.SSML;
    prompt.SSML = @"<speak>
        Welcome to customer service.
        <break time='500ms'/>
        Para español, oprima dos.
        <break time='500ms'/>
        For English, press one.
    </speak>";
    prompt.Voice = "Joanna";
})
```

## Related Documentation

- [Input Handling](/guide/flows/input-handling) - Customer input configuration
- [Flow Basics](/guide/flows/basics) - Fundamental flow concepts
- [SSML Reference](https://docs.aws.amazon.com/polly/latest/dg/ssml.html) - Complete SSML documentation
- [Amazon Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html) - Available voices
