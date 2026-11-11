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
 * Web service calls.
 *
 * @module     tiny_polyglot/repository
 * @copyright  2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as fetchMany} from 'core/ajax';

/**
 * Translate HTML fragments into one language.
 *
 * @param {Number} contextid
 * @param {String} sourcelang
 * @param {String} targetlang
 * @param {String[]} fragments
 * @returns {Promise<{success: Boolean, translations: String[], errormessage: String}>}
 */
export const translate = (contextid, sourcelang, targetlang, fragments) => fetchMany([{
    methodname: 'tiny_polyglot_translate',
    args: {contextid, sourcelang, targetlang, fragments},
}])[0];
