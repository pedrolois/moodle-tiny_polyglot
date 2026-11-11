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
 * Translation dialogue.
 *
 * @module     tiny_polyglot/dialogue
 * @copyright  2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import ModalSaveCancel from 'core/modal_save_cancel';
import ModalEvents from 'core/modal_events';
import CustomEvents from 'core/custom_interaction_events';
import Templates from 'core/templates';
import Notification from 'core/notification';
import {add as addToast} from 'core/toast';
import {get_string as getString} from 'core/str';
import Policy from 'core_ai/policy';
import PolicyModal from 'core_ai/policymodal';
import {component} from './common';
import {getOptions} from './options';
import {translate} from './repository';
import {
    FORMAT_MULTILANG2,
    buildHtml,
    chunk,
    findBlocks,
    getExistingLanguages,
    getSourceHtml,
    readVariants,
} from './content';

/** @var {String} Browser storage key for the last target languages chosen. */
const STORAGE_KEY = 'tiny_polyglot_targets';

/**
 * Target languages chosen last time, if the browser remembers them.
 *
 * @returns {String[]}
 */
const getRememberedTargets = () => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
};

/**
 * Remember the target languages for next time.
 *
 * @param {String[]} targets
 */
const rememberTargets = (targets) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
    } catch (e) {
        // Storage not available: nothing to remember.
    }
};

/**
 * Pick the default source language: the current language if offered, else its parent, else the first one.
 *
 * @param {Array<{code: String}>} languages
 * @param {String} current
 * @returns {String}
 */
const defaultSource = (languages, current) => {
    const codes = languages.map((language) => language.code);
    if (codes.includes(current)) {
        return current;
    }
    const parent = current.split('_')[0];
    return codes.includes(parent) ? parent : codes[0];
};

/**
 * Open the dialogue, asking for the AI policy first when needed.
 *
 * @param {TinyMCE} editor
 */
export const openDialogue = async(editor) => {
    const options = getOptions(editor);

    Policy.preconfigurePolicyState(options.userid, options.policyagreed);
    if (!await Policy.getPolicyStatus(options.userid)) {
        const policyModal = await PolicyModal.create();
        policyModal.getModal().on(CustomEvents.events.activate, policyModal.getActionSelector('save'), () => {
            openDialogue(editor);
        });
        return;
    }

    const {blocks, selection} = findBlocks(editor);
    if (!blocks.length) {
        Notification.alert(await getString('buttontitle', component), await getString('error:nocontent', component));
        return;
    }

    // Ticked = the content has (or will have) that language. Unticking an existing language removes it.
    const existing = getExistingLanguages(blocks);
    const source = defaultSource(options.languages, options.currentlang);
    const remembered = getRememberedTargets();
    const context = {
        uniqid: `${editor.id}_polyglot`,
        languages: options.languages.map((language) => ({
            ...language,
            source: language.code === source,
            existing: existing.has(language.code) && language.code !== source,
            checked: language.code === source || existing.has(language.code) || remembered.includes(language.code),
            disabled: language.code === source,
        })),
        summary: await getString(selection ? 'blockcount_selection' : 'blockcount', component, blocks.length),
        formatlabel: await getString(options.format === FORMAT_MULTILANG2 ? 'format_multilang2' : 'format_multilang', component),
    };

    const modal = await ModalSaveCancel.create({
        title: getString('buttontitle', component),
        body: Templates.render('tiny_polyglot/dialogue', context),
        buttons: {save: getString('apply', component)},
        removeOnClose: true,
        show: true,
    });
    const root = modal.getRoot()[0];

    root.addEventListener('change', (e) => {
        // The source language is always kept: lock its checkbox.
        if (e.target.matches('[data-region="source"]')) {
            root.querySelectorAll('[data-region="target"]').forEach((checkbox) => {
                const isSource = checkbox.value === e.target.value;
                checkbox.disabled = isSource;
                checkbox.checked = isSource || existing.has(checkbox.value);
            });
            root.querySelectorAll('[data-region="retranslaterow"]').forEach((row) => {
                row.classList.toggle('d-none', row.dataset.code === e.target.value);
            });
        }
        // "Translate again" only makes sense for a language that is kept.
        if (e.target.matches('[data-region="target"]')) {
            const retranslate = root.querySelector(`[data-region="retranslate"][value="${e.target.value}"]`);
            if (retranslate) {
                retranslate.disabled = !e.target.checked;
                retranslate.checked = retranslate.checked && e.target.checked;
            }
        }
    });

    modal.getRoot().on(ModalEvents.save, (e) => {
        e.preventDefault();
        run(editor, modal, root, blocks, existing, options);
    });
};

/**
 * Translate the blocks and write the result into the editor.
 *
 * @param {TinyMCE} editor
 * @param {Modal} modal
 * @param {HTMLElement} root
 * @param {Element[]} blocks
 * @param {Set<String>} existing Languages present in every block when the dialogue opened.
 * @param {Object} options
 */
const run = async(editor, modal, root, blocks, existing, options) => {
    const source = root.querySelector('[data-region="source"]').value;
    const values = (selector) => new Set(Array.from(root.querySelectorAll(selector)).map((input) => input.value));
    const ticked = values('[data-region="target"]:checked');
    const unticked = values('[data-region="target"]:not(:checked)');
    const again = values('[data-region="retranslate"]:checked');

    // New languages, plus existing ones the user wants translated again.
    const targets = [...ticked].filter((code) => code !== source && (!existing.has(code) || again.has(code)));
    // Offered languages the user unticked. Languages not offered here are never touched.
    const removals = [...unticked].filter((code) => code !== source);
    const status = root.querySelector('[data-region="status"]');

    const removesSomething = blocks.some((block) => {
        const {variants, multilang} = readVariants(block);
        return multilang && removals.some((code) => code in variants);
    });
    if (!targets.length && !removesSomething) {
        status.innerHTML = `<div class="alert alert-warning mb-0">${await getString('error:nochange', component)}</div>`;
        return;
    }

    rememberTargets([...ticked].filter((code) => code !== source));

    const saveButton = modal.getFooter()[0].querySelector('[data-action="save"]');
    saveButton.disabled = true;
    root.querySelectorAll('select, input').forEach((input) => {
        input.disabled = true;
    });

    const blockVariants = blocks.map((block) => readVariants(block));
    const sources = blockVariants.map(({variants}) => getSourceHtml(variants, source));
    const chunks = chunk(sources, options.maxchars, options.maxfragments);
    const names = Object.fromEntries(options.languages.map((language) => [language.code, language.name]));

    // Translations by block index, then by language.
    const results = blocks.map(() => ({}));
    const errors = [];

    for (const [position, target] of targets.entries()) {
        status.innerHTML = `<div class="d-flex align-items-center">
            <span class="spinner-border spinner-border-sm me-2 mr-2" aria-hidden="true"></span>
            <span></span></div>`;
        status.querySelector('span:last-child').textContent = await getString('progress', component, {
            language: names[target],
            current: position + 1,
            total: targets.length,
        });
        try {
            const translated = [];
            for (const {start, items} of chunks) {
                const response = await translate(options.contextid, source, target, items);
                if (!response.success) {
                    throw new Error(response.errormessage);
                }
                response.translations.forEach((html, offset) => {
                    translated[start + offset] = html;
                });
            }
            translated.forEach((html, index) => {
                results[index][target] = html;
            });
        } catch (error) {
            errors.push(`${names[target]}: ${error.message}`);
        }
    }

    // Write every block that gets a translation or loses a language, as one undoable step.
    const changes = blocks.map((block, index) => {
        const {variants, multilang} = blockVariants[index];
        const removed = multilang ? removals.filter((code) => code in variants) : [];
        return {block, index, variants, multilang, removed};
    }).filter(({index, removed}) => removed.length || Object.keys(results[index]).length);

    if (changes.length) {
        editor.undoManager.transact(() => {
            changes.forEach(({block, index, variants, multilang}) => {
                editor.dom.setHTML(block, buildHtml({
                    source,
                    sourceHtml: sources[index],
                    existing: multilang ? variants : {},
                    translations: results[index],
                    remove: removals,
                    format: options.format,
                    fallback: options.fallback,
                }));
            });
        });
        editor.nodeChanged();
    }

    if (errors.length) {
        const list = document.createElement('ul');
        list.className = 'mb-0';
        errors.forEach((message) => {
            const item = document.createElement('li');
            item.textContent = message;
            list.appendChild(item);
        });
        status.innerHTML = '<div class="alert alert-danger mb-0"></div>';
        status.firstElementChild.appendChild(list);
        return;
    }

    modal.destroy();
    addToast(await getString('done', component));
};
