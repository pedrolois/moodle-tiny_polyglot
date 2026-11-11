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
 * Admin settings.
 *
 * @package   tiny_polyglot
 * @category  admin
 * @copyright 2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_polyglot\local\translator;

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedIf
    if ($ADMIN->fulltree) {
        $aisettings = new moodle_url('/admin/settings.php', ['section' => 'aiplacement_editor']);
        $settings->add(new admin_setting_heading(
            'tiny_polyglot/aiinfo',
            '',
            new lang_string('settings:aiinfo', 'tiny_polyglot', $aisettings->out(false))
        ));

        $settings->add(new admin_setting_configselect(
            'tiny_polyglot/format',
            new lang_string('settings:format', 'tiny_polyglot'),
            new lang_string('settings:format_desc', 'tiny_polyglot'),
            translator::FORMAT_AUTO,
            [
                translator::FORMAT_AUTO => new lang_string('settings:format_auto', 'tiny_polyglot'),
                translator::FORMAT_MULTILANG2 => new lang_string('settings:format_multilang2', 'tiny_polyglot'),
                translator::FORMAT_MULTILANG => new lang_string('settings:format_multilang', 'tiny_polyglot'),
            ]
        ));

        $settings->add(new admin_setting_configcheckbox(
            'tiny_polyglot/fallback',
            new lang_string('settings:fallback', 'tiny_polyglot'),
            new lang_string('settings:fallback_desc', 'tiny_polyglot'),
            1
        ));

        $settings->add(new admin_setting_configtext(
            'tiny_polyglot/languages',
            new lang_string('settings:languages', 'tiny_polyglot'),
            new lang_string('settings:languages_desc', 'tiny_polyglot'),
            '',
            PARAM_TEXT
        ));

        $settings->add(new admin_setting_configtextarea(
            'tiny_polyglot/instructions',
            new lang_string('settings:instructions', 'tiny_polyglot'),
            new lang_string('settings:instructions_desc', 'tiny_polyglot'),
            '',
            PARAM_TEXT
        ));
    }
}
