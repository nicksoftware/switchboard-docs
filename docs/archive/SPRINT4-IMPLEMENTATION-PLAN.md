# Sprint 4: Multi-Language Support - Implementation Plan

**Status:** Planning Complete → Ready to Implement
**Priority:** MEDIUM
**Estimated Duration:** 2-3 weeks
**Dependencies:** PlayPrompt ✅, ASR ✅

---

## Executive Summary

Enable Amazon Connect flows to support multiple languages with language-specific prompts, voice selection, and locale-aware ASR. This will allow contact centers to serve international customers in their preferred language.

## Current State Assessment

### What Already Exists ✅

From code review of `PlayPromptAction`:
- ✅ `Voice` property (defaults to "Joanna")
- ✅ `LanguageCode` property (e.g., "en-US", "es-ES")
- ✅ `UseNeuralVoice` property
- ✅ `DynamicTextAttribute` for runtime text resolution

### What's Missing ❌

- ❌ TranslationDictionary class
- ❌ Multi-language PlayPrompt overload
- ❌ VoiceHelper with locale mapping
- ❌ Language selection flow patterns
- ❌ Tests for multi-language scenarios
- ❌ Documentation

---

## Implementation Strategy

We'll implement **Option 1 (Simple)** from Phase 2.2 plan:
- TranslationDictionary for managing translations
- PlayPrompt overload accepting TranslationDictionary
- VoiceHelper for locale→voice mapping
- Runtime language resolution via contact attributes

---

## Detailed Implementation Tasks

### Task 1: Create VoiceHelper Class

**File:** `/src/Switchboard/Helpers/VoiceHelper.cs`

**Purpose:** Map locales to appropriate Amazon Polly voices

```csharp
namespace Switchboard.Helpers;

/// <summary>
/// Helper class for mapping locales to Amazon Polly voices.
/// </summary>
public static class VoiceHelper
{
    /// <summary>
    /// Maps locales to available Amazon Polly voices.
    /// First voice in each array is the default for that locale.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string[]> VoicesByLocale = new Dictionary<string, string[]>
    {
        // English variants
        ["en-US"] = new[] { "Joanna", "Matthew", "Kendra", "Kimberly", "Ivy", "Joey", "Justin", "Salli" },
        ["en-GB"] = new[] { "Amy", "Emma", "Brian" },
        ["en-AU"] = new[] { "Nicole", "Russell" },
        ["en-IN"] = new[] { "Aditi", "Raveena" },
        ["en-NZ"] = new[] { "Aria" },
        ["en-ZA"] = new[] { "Ayanda" },

        // Spanish variants
        ["es-ES"] = new[] { "Lucia", "Conchita", "Enrique" },
        ["es-MX"] = new[] { "Mia", "Andres" },
        ["es-US"] = new[] { "Lupe", "Penelope", "Miguel" },

        // French variants
        ["fr-FR"] = new[] { "Celine", "Lea", "Mathieu" },
        ["fr-CA"] = new[] { "Chantal", "Gabrielle", "Liam" },
        ["fr-BE"] = new[] { "Isabelle" },

        // German
        ["de-DE"] = new[] { "Vicki", "Marlene", "Hans", "Daniel" },
        ["de-AT"] = new[] { "Hannah" },

        // Italian
        ["it-IT"] = new[] { "Carla", "Bianca", "Giorgio", "Adriano" },

        // Portuguese
        ["pt-BR"] = new[] { "Vitoria", "Camila", "Ricardo", "Thiago" },
        ["pt-PT"] = new[] { "Ines", "Cristiano" },

        // Asian languages
        ["ja-JP"] = new[] { "Mizuki", "Takumi", "Kazuha", "Tomoko" },
        ["ko-KR"] = new[] { "Seoyeon" },
        ["zh-CN"] = new[] { "Zhiyu" },
        ["zh-HK"] = new[] { "Hiujin" },
        ["zh-TW"] = new[] { "Zhiyu" },

        // Nordic languages
        ["da-DK"] = new[] { "Naja", "Mads" },
        ["nb-NO"] = new[] { "Liv", "Ida" },
        ["sv-SE"] = new[] { "Astrid", "Elin" },
        ["fi-FI"] = new[] { "Suvi" },
        ["is-IS"] = new[] { "Dora", "Karl" },

        // Other European
        ["nl-NL"] = new[] { "Laura", "Lotte" },
        ["nl-BE"] = new[] { "Lisa" },
        ["pl-PL"] = new[] { "Ola", "Jacek" },
        ["ro-RO"] = new[] { "Carmen" },
        ["ru-RU"] = new[] { "Tatyana", "Maxim" },
        ["tr-TR"] = new[] { "Filiz" },

        // Other
        ["ar-AE"] = new[] { "Hala", "Zayd" },
        ["hi-IN"] = new[] { "Aditi", "Kajal" },
        ["ca-ES"] = new[] { "Arlet" }
    };

    /// <summary>
    /// Gets the default voice for a given locale.
    /// </summary>
    /// <param name="locale">The locale code (e.g., "en-US", "es-ES")</param>
    /// <returns>The default voice name, or "Joanna" if locale not found</returns>
    public static string GetDefaultVoice(string locale)
    {
        if (string.IsNullOrEmpty(locale))
            return "Joanna";

        // Try exact match first
        if (VoicesByLocale.TryGetValue(locale, out var voices))
            return voices[0];

        // Try language-only match (e.g., "en" from "en-US")
        var language = locale.Split('-')[0];
        var languageMatch = VoicesByLocale
            .FirstOrDefault(kvp => kvp.Key.StartsWith(language + "-"));

        return languageMatch.Value?[0] ?? "Joanna";
    }

    /// <summary>
    /// Gets all available voices for a locale.
    /// </summary>
    /// <param name="locale">The locale code</param>
    /// <returns>Array of voice names, or null if locale not supported</returns>
    public static string[]? GetVoicesForLocale(string locale)
    {
        return VoicesByLocale.TryGetValue(locale, out var voices) ? voices : null;
    }

    /// <summary>
    /// Checks if a locale is supported.
    /// </summary>
    /// <param name="locale">The locale code to check</param>
    /// <returns>True if locale is supported, false otherwise</returns>
    public static bool IsLocaleSupported(string locale)
    {
        return VoicesByLocale.ContainsKey(locale);
    }

    /// <summary>
    /// Gets all supported locales.
    /// </summary>
    /// <returns>Collection of supported locale codes</returns>
    public static IEnumerable<string> GetSupportedLocales()
    {
        return VoicesByLocale.Keys;
    }
}
```

**Tests:** `/tests/Switchboard.Tests/Helpers/VoiceHelperTests.cs`

---

### Task 2: Create TranslationDictionary Class

**File:** `/src/Switchboard/Configuration/TranslationDictionary.cs`

**Purpose:** Store and manage multi-language prompt translations

```csharp
namespace Switchboard.Configuration;

/// <summary>
/// Stores prompt text in multiple languages with associated voices.
/// </summary>
public class TranslationDictionary
{
    private readonly Dictionary<string, LanguagePrompt> _translations = new();

    /// <summary>
    /// Adds a translation for a specific locale.
    /// </summary>
    /// <param name="locale">The locale code (e.g., "en-US", "es-ES")</param>
    /// <param name="text">The prompt text in this language</param>
    /// <param name="voice">Optional voice name. If null, uses default voice for locale.</param>
    /// <returns>This dictionary for fluent chaining</returns>
    public TranslationDictionary Add(string locale, string text, string? voice = null)
    {
        _translations[locale] = new LanguagePrompt
        {
            Text = text,
            Voice = voice ?? Helpers.VoiceHelper.GetDefaultVoice(locale),
            Locale = locale
        };
        return this;
    }

    /// <summary>
    /// Gets the translation for a specific locale.
    /// </summary>
    /// <param name="locale">The locale code</param>
    /// <returns>The language prompt, or null if not found</returns>
    public LanguagePrompt? Get(string locale)
    {
        return _translations.TryGetValue(locale, out var prompt) ? prompt : null;
    }

    /// <summary>
    /// Tries to get a translation, falling back to a default language if not found.
    /// </summary>
    /// <param name="locale">The preferred locale</param>
    /// <param name="fallbackLocale">The fallback locale (default: "en-US")</param>
    /// <returns>The language prompt</returns>
    public LanguagePrompt GetOrFallback(string locale, string fallbackLocale = "en-US")
    {
        return Get(locale) ?? Get(fallbackLocale) ?? throw new InvalidOperationException($"No translation found for '{locale}' or fallback '{fallbackLocale}'");
    }

    /// <summary>
    /// Gets all available locales in this dictionary.
    /// </summary>
    public IEnumerable<string> AvailableLocales => _translations.Keys;

    /// <summary>
    /// Gets the count of translations.
    /// </summary>
    public int Count => _translations.Count;

    /// <summary>
    /// Checks if a locale exists in this dictionary.
    /// </summary>
    public bool HasLocale(string locale) => _translations.ContainsKey(locale);
}

/// <summary>
/// Represents a prompt in a specific language.
/// </summary>
public class LanguagePrompt
{
    /// <summary>
    /// Gets or sets the prompt text.
    /// </summary>
    public required string Text { get; set; }

    /// <summary>
    /// Gets or sets the voice to use for text-to-speech.
    /// </summary>
    public string? Voice { get; set; }

    /// <summary>
    /// Gets or sets the locale code.
    /// </summary>
    public required string Locale { get; set; }

    /// <summary>
    /// Gets or sets whether to use neural voice engine.
    /// Default: true (neural voices sound more natural).
    /// </summary>
    public bool UseNeuralVoice { get; set; } = true;

    /// <summary>
    /// Gets or sets the speaking rate (0.5 to 2.0, default 1.0).
    /// Only applies to neural voices.
    /// </summary>
    public double SpeakingRate { get; set; } = 1.0;
}
```

**Tests:** `/tests/Switchboard.Tests/Configuration/TranslationDictionaryTests.cs`

---

### Task 3: Add Multi-Language Support to PlayPromptAction

**File:** `/src/Switchboard/Actions/FlowAction.cs` (extend PlayPromptAction)

Add new properties to support multi-language:

```csharp
public class PlayPromptAction : FlowAction
{
    // ... existing properties ...

    /// <summary>
    /// Gets or sets the translation dictionary for multi-language prompts.
    /// When set, the prompt will resolve text based on the LanguageAttribute.
    /// </summary>
    public TranslationDictionary? Translations { get; set; }

    /// <summary>
    /// Gets or sets the JSONPath to the language attribute (e.g., "$.Attributes.Language").
    /// Used to determine which translation to use at runtime.
    /// </summary>
    public string? LanguageAttribute { get; set; }

    /// <summary>
    /// Gets whether this prompt uses multi-language translation.
    /// </summary>
    public bool IsMultiLanguage => Translations != null && !string.IsNullOrEmpty(LanguageAttribute);
}
```

---

### Task 4: Extend FlowBuilder with Multi-Language PlayPrompt

**File:** `/src/Switchboard/Builders/FlowBuilder.cs`

Add new overload:

```csharp
/// <summary>
/// Plays a multi-language prompt based on a contact attribute.
/// </summary>
/// <param name="translations">The translation dictionary</param>
/// <param name="languageAttribute">JSONPath to language attribute (e.g., "$.Attributes.Language")</param>
/// <returns>Flow builder for chaining</returns>
public FlowBuilder PlayPrompt(TranslationDictionary translations, string languageAttribute)
{
    var action = new PlayPromptAction
    {
        Identifier = GenerateIdentifier("PlayPrompt"),
        Translations = translations,
        LanguageAttribute = languageAttribute
    };

    _actions.Add(action);
    return this;
}
```

---

### Task 5: Update JSON Generation for Multi-Language

**File:** `/src/Switchboard/Builders/FlowBuilder.cs` (in GeneratePlayPromptParameters)

Handle multi-language prompts in JSON generation:

```csharp
private Dictionary<string, object> GeneratePlayPromptParameters(PlayPromptAction action)
{
    // If multi-language, generate conditional logic
    if (action.IsMultiLanguage && action.Translations != null)
    {
        // Generate a ComparisonValue structure for each language
        // This creates a switch-case style prompt selection in Amazon Connect JSON
        // based on the language attribute value
        return new Dictionary<string, object>
        {
            ["PromptType"] = "Text",
            ["DynamicPrompt"] = new
            {
                LanguageAttribute = action.LanguageAttribute,
                Translations = action.Translations.AvailableLocales.Select(locale =>
                {
                    var prompt = action.Translations.Get(locale)!;
                    return new
                    {
                        Locale = locale,
                        Text = prompt.Text,
                        Voice = prompt.Voice,
                        UseNeuralVoice = prompt.UseNeuralVoice
                    };
                })
            }
        };
    }

    // ... existing single-language logic ...
}
```

---

## Testing Strategy

### Unit Tests (20+ tests)

**File:** `/tests/Switchboard.Tests/Helpers/VoiceHelperTests.cs`
- ✅ GetDefaultVoice returns correct voice for locale
- ✅ GetDefaultVoice falls back to "Joanna" for unknown locale
- ✅ GetDefaultVoice handles language-only codes
- ✅ GetVoicesForLocale returns all voices
- ✅ IsLocaleSupported returns true for supported locales
- ✅ GetSupportedLocales returns all locales

**File:** `/tests/Switchboard.Tests/Configuration/TranslationDictionaryTests.cs`
- ✅ Add creates translation entry
- ✅ Add with explicit voice uses that voice
- ✅ Add without voice uses default for locale
- ✅ Add is fluent (returns self)
- ✅ Get returns correct translation
- ✅ Get returns null for missing locale
- ✅ GetOrFallback uses fallback when locale missing
- ✅ GetOrFallback throws when both missing
- ✅ HasLocale returns true for existing
- ✅ AvailableLocales returns all locales
- ✅ Count returns correct number

**File:** `/tests/Switchboard.Tests/Builders/FlowBuilderMultiLanguageTests.cs`
- ✅ PlayPrompt with TranslationDictionary creates action
- ✅ PlayPrompt multi-language sets IsMultiLanguage
- ✅ PlayPrompt multi-language includes all translations
- ✅ Build generates valid JSON for multi-language prompt

---

## Documentation

### Create `/docs/guide/flows/multi-language.md`

**Sections:**
1. Overview - Why multi-language support
2. Voice Selection - VoiceHelper usage
3. Translation Dictionary - Creating translations
4. Multi-Language Prompts - FlowBuilder usage
5. Language Selection Pattern - Common flow pattern
6. Complete Example - Production-ready multi-language flow
7. Best Practices - 5 recommendations
8. Supported Locales - Complete list with voices
9. Troubleshooting - Common issues
10. See Also - Related docs

---

## Example Flow

**File:** `/examples/EnterpriseFluentExample/Flows/MultiLanguage/MultiLanguageFlowBuilder.cs`

Complete example showing:
- Language selection (English/Spanish/French)
- TranslationDictionary usage
- Multi-language prompts
- Locale-aware ASR
- Queue transfer with language routing

---

## Success Criteria

- [x] Sprint 4 plan reviewed and approved
- [ ] VoiceHelper class implemented and tested
- [ ] TranslationDictionary class implemented and tested
- [ ] PlayPromptAction extended with multi-language support
- [ ] FlowBuilder PlayPrompt overload implemented
- [ ] JSON generation handles multi-language prompts
- [ ] 20+ unit tests passing
- [ ] multi-language.md documentation complete
- [ ] Example flow created
- [ ] VitePress sidebar updated
- [ ] Phase 2 roadmap updated

---

## Timeline

**Week 1:**
- Day 1-2: VoiceHelper + tests
- Day 3-4: TranslationDictionary + tests
- Day 5: PlayPromptAction extensions

**Week 2:**
- Day 1-2: FlowBuilder overload + JSON generation
- Day 3: Additional tests + integration tests
- Day 4-5: Documentation + example flow

**Week 3:** Buffer for polish and refinement

---

## Notes

- VoiceHelper uses Amazon Polly voice list (as of Jan 2025)
- Neural voices are default (better quality)
- Fallback to "Joanna" (en-US) if locale unknown
- Translation dictionary is immutable after build
- Language attribute typically "$.Attributes.Language" or "$.Attributes.PreferredLanguage"
