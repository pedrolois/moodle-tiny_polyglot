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

/**
 * English strings.
 *
 * @package   tiny_polyglot
 * @category  string
 * @copyright 2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['apply'] = 'Apply';
$string['blockcount'] = '{$a} text blocks in the content.';
$string['blockcount_selection'] = '{$a} text blocks in your selection.';
$string['buttontitle'] = 'Translate with AI';
$string['done'] = 'Changes applied. Use Undo (Ctrl+Z) to revert.';
$string['error:badresponse'] = 'The AI answer could not be read. Please try again.';
$string['error:nochange'] = 'Nothing to change: tick a new language, untick one to remove it, or choose "Translate again".';
$string['error:nocontent'] = 'There is no text to translate.';
$string['error:notavailable'] = 'AI translation is not available here.';
$string['error:provider'] = 'The AI provider returned an error: {$a}';
$string['error:unreachable'] = 'the AI service could not be reached. Ask your administrator to check the AI provider settings.';
$string['format_multilang'] = 'Output: core multi-language filter';
$string['format_multilang2'] = 'Output: Multi-Language Content (v2) filter';
$string['pluginname'] = 'Polyglot (AI translation)';
$string['polyglot:use'] = 'Translate content with AI in the editor';
$string['privacy:metadata'] = 'Polyglot stores no personal data. Content to translate is sent through the Moodle AI subsystem, which records each request.';
$string['progress'] = 'Translating into {$a->language}… ({$a->current} of {$a->total})';
$string['retranslate'] = 'Translate again';
$string['settings:aiinfo'] = 'Polyglot uses the <strong>Generate text</strong> action of the <a href="{$a}">text editor AI placement</a>. Enable that placement, the action and an AI provider for the button to appear.';
$string['settings:fallback'] = 'Source text as fallback';
$string['settings:fallback_desc'] = 'With the Multi-Language Content (v2) filter, write the source text as {mlang other} so users whose language has no translation see the original.';
$string['settings:format'] = 'Output format';
$string['settings:format_auto'] = 'Automatic (use the multi-language filter enabled on the site)';
$string['settings:format_desc'] = 'How translations are written in the content. The matching filter must be enabled for users to see only their language.';
$string['settings:format_multilang'] = 'Core multi-language filter: &lt;span lang="xx" class="multilang"&gt;';
$string['settings:format_multilang2'] = 'Multi-Language Content (v2): {mlang xx}…{mlang}';
$string['settings:instructions'] = 'Extra instructions for the AI';
$string['settings:instructions_desc'] = 'Added to every translation request. Use it for tone or terminology, for example: "Use formal register. Never translate the product name Moodle."';
$string['settings:languages'] = 'Languages offered';
$string['settings:languages_desc'] = 'Comma-separated language codes, for example: en,fr,es,ar,zh_cn,ru. Leave empty to offer the language packs installed on the site.';
$string['sourcelang'] = 'Translate from';
$string['targetlangs'] = 'Languages';
$string['targetlangs_help'] = 'Tick a language to add it, untick it to remove it. The source language is always kept.';
