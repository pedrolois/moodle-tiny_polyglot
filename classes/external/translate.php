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

namespace tiny_polyglot\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use tiny_polyglot\local\translator;

/**
 * Translate HTML fragments into one target language.
 *
 * @package   tiny_polyglot
 * @copyright 2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class translate extends external_api {
    /**
     * Parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context the editor is used in'),
            'sourcelang' => new external_value(PARAM_ALPHANUMEXT, 'Source language code'),
            'targetlang' => new external_value(PARAM_ALPHANUMEXT, 'Target language code'),
            'fragments' => new external_multiple_structure(
                new external_value(PARAM_RAW, 'HTML fragment'),
                'Fragments to translate'
            ),
        ]);
    }

    /**
     * Translate the fragments.
     *
     * @param int $contextid
     * @param string $sourcelang
     * @param string $targetlang
     * @param string[] $fragments
     * @return array
     */
    public static function execute(int $contextid, string $sourcelang, string $targetlang, array $fragments): array {
        [
            'contextid' => $contextid,
            'sourcelang' => $sourcelang,
            'targetlang' => $targetlang,
            'fragments' => $fragments,
        ] = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'sourcelang' => $sourcelang,
            'targetlang' => $targetlang,
            'fragments' => $fragments,
        ]);

        $context = \core\context::instance_by_id($contextid);
        self::validate_context($context);
        require_capability('tiny/polyglot:use', $context);
        if (!translator::is_available($context)) {
            throw new \moodle_exception('error:notavailable', 'tiny_polyglot');
        }

        $languages = translator::get_languages();
        if (!isset($languages[$targetlang])) {
            throw new \invalid_parameter_exception('Target language not offered: ' . $targetlang);
        }
        if ($sourcelang === $targetlang) {
            throw new \invalid_parameter_exception('Source and target languages are the same');
        }
        if (!$fragments) {
            return ['success' => true, 'translations' => [], 'errormessage' => ''];
        }
        if (count($fragments) > translator::MAX_FRAGMENTS
                || \core_text::strlen(implode('', $fragments)) > translator::MAX_CHARS) {
            throw new \invalid_parameter_exception('Too much content in a single request');
        }

        try {
            $translations = translator::translate($context, $fragments, $sourcelang, $targetlang);
        } catch (\moodle_exception $e) {
            return ['success' => false, 'translations' => [], 'errormessage' => $e->getMessage()];
        }
        return ['success' => true, 'translations' => $translations, 'errormessage' => ''];
    }

    /**
     * Return structure.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the translation worked'),
            'translations' => new external_multiple_structure(
                new external_value(PARAM_RAW, 'Translated HTML fragment')
            ),
            'errormessage' => new external_value(PARAM_TEXT, 'Error message for the user, if any'),
        ]);
    }
}
