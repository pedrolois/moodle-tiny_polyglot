<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace tiny_polyglot\local;

use core_ai\aiactions\generate_text;

/**
 * Translation service built on the core AI subsystem.
 *
 * @package   tiny_polyglot
 * @copyright 2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class translator {
    /** @var string Output for filter_multilang2: {mlang xx}...{mlang}. */
    public const FORMAT_MULTILANG2 = 'multilang2';

    /** @var string Output for the core multilang filter: <span lang="xx" class="multilang">. */
    public const FORMAT_MULTILANG = 'multilang';

    /** @var string Pick the format from the filters enabled on the site. */
    public const FORMAT_AUTO = 'auto';

    /** @var int Maximum number of fragments in a single request. */
    public const MAX_FRAGMENTS = 200;

    /** @var int Maximum total characters in a single request. */
    public const MAX_CHARS = 12000;

    /**
     * Whether the current user can translate in the given context.
     *
     * Polyglot runs on the "generate text" action of the text editor AI placement, so the
     * administrator controls it from the AI settings, like the rest of the editor AI tools.
     *
     * @param \context $context
     * @return bool
     */
    public static function is_available(\context $context): bool {
        if (!has_capability('tiny/polyglot:use', $context)) {
            return false;
        }
        if (!class_exists(\aiplacement_editor\utils::class)) {
            return false;
        }
        return \aiplacement_editor\utils::is_html_editor_placement_action_available(
            $context,
            'generate_text',
            generate_text::class,
        );
    }

    /**
     * Output format used when writing translations.
     *
     * @return string One of the FORMAT_MULTILANG* constants.
     */
    public static function get_format(): string {
        $format = get_config('tiny_polyglot', 'format') ?: self::FORMAT_AUTO;
        if ($format !== self::FORMAT_AUTO) {
            return $format;
        }
        $enabled = filter_get_globally_enabled();
        if (isset($enabled['multilang2'])) {
            return self::FORMAT_MULTILANG2;
        }
        if (isset($enabled['multilang'])) {
            return self::FORMAT_MULTILANG;
        }
        // No multilang filter enabled: prefer multilang2 when installed, it is the more capable one.
        if (\core_component::get_component_directory('filter_multilang2')) {
            return self::FORMAT_MULTILANG2;
        }
        return self::FORMAT_MULTILANG;
    }

    /**
     * Languages offered in the translation dialogue.
     *
     * @return array Language code => display name.
     */
    public static function get_languages(): array {
        $installed = get_string_manager()->get_list_of_translations();
        $configured = trim((string) get_config('tiny_polyglot', 'languages'));
        if ($configured === '') {
            return $installed;
        }

        $languages = [];
        foreach (preg_split('/[\s,;]+/', $configured, -1, PREG_SPLIT_NO_EMPTY) as $code) {
            $code = clean_param(strtolower($code), PARAM_ALPHANUMEXT);
            if ($code !== '') {
                $languages[$code] = $installed[$code] ?? self::get_english_name($code);
            }
        }
        return $languages ?: $installed;
    }

    /**
     * English name of a language code, as used in the prompt (for example "Spanish (es_mx)").
     *
     * @param string $code
     * @return string
     */
    public static function get_english_name(string $code): string {
        $names = get_string_manager()->get_list_of_languages('en');
        $base = explode('_', $code)[0];
        if (!isset($names[$base])) {
            return $code;
        }
        // ISO names can list alternatives ("Spanish; Castilian"): keep the first one.
        $name = trim(explode(';', $names[$base])[0]);
        return "{$name} ({$code})";
    }

    /**
     * Build the prompt sent to the AI provider.
     *
     * @param string[] $fragments HTML fragments to translate.
     * @param string $source Source language code.
     * @param string $target Target language code.
     * @return string
     */
    public static function build_prompt(array $fragments, string $source, string $target): string {
        $sourcename = self::get_english_name($source);
        $targetname = self::get_english_name($target);
        $count = count($fragments);
        $json = json_encode(array_values($fragments), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $rules = [
            "You are a professional translator of educational content.",
            "Translate every string in the JSON array below from {$sourcename} to {$targetname}.",
            "Rules:",
            "- Keep every HTML tag and attribute exactly as it is; translate only the human-readable text.",
            "- Do not translate URLs, e-mail addresses, code, or placeholders such as {\$a}, {{name}}, %%NAME%% or [[tag]].",
            "- Keep the meaning, tone, register and punctuation style of the original.",
            "- If a string is already in {$targetname} or has nothing to translate, return it unchanged.",
        ];
        $extra = trim((string) get_config('tiny_polyglot', 'instructions'));
        if ($extra !== '') {
            $rules[] = "- Additional instructions from the site administrator: {$extra}";
        }
        $rules[] = "Answer with ONLY a JSON array of exactly {$count} strings, in the same order, "
            . "with no explanations and no Markdown code fences.";

        return implode("\n", $rules) . "\n\n" . $json;
    }

    /**
     * Extract the translated fragments from the AI answer.
     *
     * @param string $answer Raw text returned by the provider.
     * @param int $expected Number of fragments sent.
     * @return string[]
     * @throws \moodle_exception When the answer is not a JSON array of the expected size.
     */
    public static function parse_response(string $answer, int $expected): array {
        $answer = trim($answer);
        // Tolerate Markdown fences and chatter around the array.
        $start = strpos($answer, '[');
        $end = strrpos($answer, ']');
        if ($start === false || $end === false || $end < $start) {
            throw new \moodle_exception('error:badresponse', 'tiny_polyglot');
        }
        $decoded = json_decode(substr($answer, $start, $end - $start + 1), true);
        if (!is_array($decoded) || count($decoded) !== $expected) {
            throw new \moodle_exception('error:badresponse', 'tiny_polyglot');
        }

        $result = [];
        foreach (array_values($decoded) as $item) {
            if (!is_string($item)) {
                throw new \moodle_exception('error:badresponse', 'tiny_polyglot');
            }
            $result[] = $item;
        }
        return $result;
    }

    /**
     * Translate fragments with the AI subsystem.
     *
     * @param \context $context Context the editor is used in.
     * @param string[] $fragments HTML fragments.
     * @param string $source Source language code.
     * @param string $target Target language code.
     * @return string[] Translated fragments, same order.
     * @throws \moodle_exception On provider failure or unusable answer.
     */
    public static function translate(\context $context, array $fragments, string $source, string $target): array {
        $fragments = array_values($fragments);
        $translations = self::request($context, $fragments, $source, $target, false);

        // Small models sometimes drop links or formatting: retry those fragments once, with a stricter prompt.
        $broken = array_keys(array_filter($translations,
            fn($html, $i) => !self::same_markup($fragments[$i], $html), ARRAY_FILTER_USE_BOTH));
        if ($broken) {
            try {
                $retry = self::request($context, array_map(fn($i) => $fragments[$i], $broken), $source, $target, true);
                foreach ($broken as $position => $index) {
                    if (self::same_markup($fragments[$index], $retry[$position])) {
                        $translations[$index] = $retry[$position];
                    }
                }
            } catch (\moodle_exception $e) {
                // Keep the first answer: a translation with lost formatting beats no translation.
                debugging('Polyglot retry failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }
        return $translations;
    }

    /**
     * Markup that a translation must keep: tag names plus link and image targets, in any order.
     *
     * @param string $html
     * @return string[]
     */
    public static function get_markup_signature(string $html): array {
        preg_match_all('/<([a-z][a-z0-9]*)\b([^>]*)>/i', $html, $matches, PREG_SET_ORDER);
        $signature = [];
        foreach ($matches as [, $tag, $attributes]) {
            $tag = strtolower($tag);
            $target = '';
            if (in_array($tag, ['a', 'img', 'iframe', 'video', 'audio', 'source'])
                    && preg_match('/\b(?:href|src)\s*=\s*["\']([^"\']*)["\']/i', $attributes, $url)) {
                $target = ' ' . html_entity_decode($url[1]);
            }
            $signature[] = $tag . $target;
        }
        sort($signature);
        return $signature;
    }

    /**
     * Whether a translation kept the markup of its source.
     *
     * @param string $source
     * @param string $translation
     * @return bool
     */
    public static function same_markup(string $source, string $translation): bool {
        return self::get_markup_signature($source) === self::get_markup_signature($translation);
    }

    /**
     * Send one translation request to the AI subsystem.
     *
     * @param \context $context
     * @param string[] $fragments
     * @param string $source
     * @param string $target
     * @param bool $strict Remind the model that markup was lost last time.
     * @return string[]
     * @throws \moodle_exception
     */
    protected static function request(\context $context, array $fragments, string $source, string $target, bool $strict): array {
        global $USER;

        $prompt = self::build_prompt($fragments, $source, $target);
        if ($strict) {
            $prompt = "IMPORTANT: a previous translation lost HTML tags or links. Every tag, attribute and URL "
                . "of each string must appear in its translation.\n" . $prompt;
        }
        $action = new generate_text(
            contextid: $context->id,
            userid: $USER->id,
            prompttext: $prompt,
        );
        $manager = \core\di::get(\core_ai\manager::class);
        try {
            $response = $manager->process_action($action);
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $e) {
            // Some providers throw instead of returning an error response, for example when the
            // AI service cannot be reached at all.
            debugging('Polyglot AI request failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
            throw new \moodle_exception('error:provider', 'tiny_polyglot', '', get_string('error:unreachable', 'tiny_polyglot'));
        }

        if (!$response->get_success()) {
            throw new \moodle_exception('error:provider', 'tiny_polyglot', '', $response->get_errormessage()
                ?: $response->get_error());
        }
        $answer = $response->get_response_data()['generatedcontent'] ?? '';
        return self::parse_response((string) $answer, count($fragments));
    }
}
