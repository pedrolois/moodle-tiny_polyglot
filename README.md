# Polyglot — AI translation for the TinyMCE editor (tiny_polyglot)

Polyglot adds a **Translate with AI** button to the TinyMCE editor. One click translates
your content into several languages at once and writes it as multi-language content, so
every learner sees the text in their own language.

## Features

- Translates into several languages in one go (for example English, French, Spanish,
  Arabic, Chinese and Russian).
- Translates text only: images, tables, media and layout stay as they are.
- Works on the selection, or on the whole content when nothing is selected.
- Re-run it at any time: existing translations are kept and new languages are added.
- Writes either format:
  - Multi-Language Content (v2) filter: `{mlang es}Hola{mlang}`
  - Core multi-language filter: `<span lang="es" class="multilang">Hola</span>`
- Blocks marked `translate="no"` or with the `notranslate` class, and `<pre>` blocks,
  are left untouched.
- Every change can be undone with the editor's Undo (Ctrl+Z).

## Requirements

- Moodle 4.5 or later.
- The Moodle AI subsystem, with:
  - an AI provider enabled (OpenAI, Azure AI, Anthropic, Gemini, Ollama, …), and
  - the **Text editor** AI placement enabled with its **Generate text** action.
- A multi-language filter enabled: the core *Multi-Language Content* filter, or
  [Multi-Language Content (v2)](https://moodle.org/plugins/filter_multilang2).

Polyglot does not store API keys or talk to AI services directly. Every request goes
through the Moodle AI subsystem, which applies the site's AI policy, logs usage and
respects the provider's rate limits.

## Settings

*Site administration › Plugins › Text editors › TinyMCE editor › Polyglot (AI translation)*

| Setting | Description |
|---|---|
| Output format | Automatic, Multi-Language Content (v2) or core multi-language filter. |
| Source text as fallback | With multilang2, write the source as `{mlang other}`. |
| Languages offered | Comma-separated codes. Empty offers the installed language packs. |
| Extra instructions for the AI | Tone or terminology rules added to every request. |

## Capability

`tiny/polyglot:use` — granted to managers, course creators and editing teachers by default.
Users also need the `aiplacement/editor:generate_text` capability.

## License

GNU GPL v3 or later.
