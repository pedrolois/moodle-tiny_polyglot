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
 * Button and menu item registration.
 *
 * @module     tiny_polyglot/commands
 * @copyright  2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getButtonImage} from 'editor_tiny/utils';
import {get_string as getString} from 'core/str';
import {component, buttonName, icon} from './common';
import {openDialogue} from './dialogue';

/** @var {String} CSS that makes core multilang spans visible while editing. */
const CONTENT_CSS = 'span.multilang[lang]{outline:1px dashed rgba(0,102,204,.45);outline-offset:1px;}';

export const getSetup = async() => {
    const [title, buttonImage] = await Promise.all([
        getString('buttontitle', component),
        getButtonImage('icon', component),
    ]);

    return (editor) => {
        editor.ui.registry.addIcon(icon, buttonImage.html);
        editor.ui.registry.addButton(buttonName, {
            icon,
            tooltip: title,
            onAction: () => openDialogue(editor),
        });
        editor.ui.registry.addMenuItem(buttonName, {
            icon,
            text: title,
            onAction: () => openDialogue(editor),
        });
        editor.on('init', () => editor.dom.addStyle(CONTENT_CSS));
    };
};
