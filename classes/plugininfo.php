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

namespace tiny_polyglot;

use context;
use editor_tiny\editor;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;
use tiny_polyglot\local\translator;

/**
 * Tiny Polyglot plugin definition.
 *
 * @package   tiny_polyglot
 * @copyright 2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugininfo extends plugin implements plugin_with_buttons, plugin_with_configuration, plugin_with_menuitems {
    /**
     * Whether the plugin is enabled in this context.
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param editor|null $editor
     * @return bool
     */
    public static function is_enabled(
        context $context,
        array $options,
        array $fpoptions,
        ?editor $editor = null
    ): bool {
        return translator::is_available($context);
    }

    /**
     * Toolbar buttons.
     *
     * @return string[]
     */
    public static function get_available_buttons(): array {
        return ['tiny_polyglot/translate'];
    }

    /**
     * Menu items.
     *
     * @return string[]
     */
    public static function get_available_menuitems(): array {
        return ['tiny_polyglot/translate'];
    }

    /**
     * Configuration passed to the JavaScript plugin.
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param editor|null $editor
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?editor $editor = null
    ): array {
        global $USER;

        $languages = [];
        foreach (translator::get_languages() as $code => $name) {
            $languages[] = ['code' => (string) $code, 'name' => $name];
        }

        return [
            'contextid' => $context->id,
            'userid' => (int) $USER->id,
            'policyagreed' => \core_ai\manager::get_user_policy_status((int) $USER->id),
            'languages' => $languages,
            'currentlang' => current_language(),
            'format' => translator::get_format(),
            'fallback' => (bool) get_config('tiny_polyglot', 'fallback'),
            'maxchars' => translator::MAX_CHARS,
            'maxfragments' => translator::MAX_FRAGMENTS,
        ];
    }
}
