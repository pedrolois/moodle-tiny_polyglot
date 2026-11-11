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
 * Editor options passed from the server.
 *
 * @module     tiny_polyglot/options
 * @copyright  2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName} from './common';

const names = {
    contextid: getPluginOptionName(pluginName, 'contextid'),
    userid: getPluginOptionName(pluginName, 'userid'),
    policyagreed: getPluginOptionName(pluginName, 'policyagreed'),
    languages: getPluginOptionName(pluginName, 'languages'),
    currentlang: getPluginOptionName(pluginName, 'currentlang'),
    format: getPluginOptionName(pluginName, 'format'),
    fallback: getPluginOptionName(pluginName, 'fallback'),
    maxchars: getPluginOptionName(pluginName, 'maxchars'),
    maxfragments: getPluginOptionName(pluginName, 'maxfragments'),
};

const processors = {
    contextid: 'number',
    userid: 'number',
    policyagreed: 'boolean',
    languages: 'array',
    currentlang: 'string',
    format: 'string',
    fallback: 'boolean',
    maxchars: 'number',
    maxfragments: 'number',
};

/**
 * Register the plugin options.
 *
 * @param {TinyMCE} editor
 */
export const register = (editor) => {
    Object.entries(names).forEach(([key, name]) => {
        editor.options.register(name, {processor: processors[key]});
    });
};

/**
 * Get all plugin options as a plain object.
 *
 * @param {TinyMCE} editor
 * @returns {Object}
 */
export const getOptions = (editor) => Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, editor.options.get(name)])
);
