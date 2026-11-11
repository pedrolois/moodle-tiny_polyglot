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
 * Reads and writes multi-language content in the editor.
 *
 * Translation works on "text blocks": block elements (paragraphs, headings, list items,
 * table cells…) that contain no other block. Each block is translated on its own, so
 * images, tables and layout stay single and only the text gets language variants.
 *
 * @module     tiny_polyglot/content
 * @copyright  2026 Pedro Lois {@link https://github.com/pedrolois}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const FORMAT_MULTILANG2 = 'multilang2';
export const FORMAT_MULTILANG = 'multilang';
export const OTHER = 'other';

const BLOCK_TAGS = [
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CAPTION', 'DD', 'DETAILS', 'DIV', 'DL', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER',
    'HR', 'LEGEND', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'TBODY',
    'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
];
const BLOCK_SELECTOR = BLOCK_TAGS.join(',').toLowerCase();

/** Blocks that never hold translatable text directly. */
const STRUCTURAL = new Set(['DL', 'FIGURE', 'HR', 'OL', 'TABLE', 'TBODY', 'TFOOT', 'THEAD', 'TR', 'UL']);

/** Blocks whose content must never be translated. */
const SKIPPED = new Set(['PRE', 'SCRIPT', 'STYLE', 'TEMPLATE']);

const EXCLUDED_SELECTOR = 'pre, [translate="no"], .notranslate';

const MLANG_REGEX = /\{mlang\s+([^}]+)\}([\s\S]*?)\{mlang\}/gi;

/**
 * Whether a string is a safe language code (for example "es", "zh_cn", "other").
 *
 * @param {String} code
 * @returns {Boolean}
 */
const isLangCode = (code) => /^[a-z0-9_-]{2,30}$/.test(code);

/**
 * Whether the element opts out of translation.
 *
 * @param {Element} element
 * @returns {Boolean}
 */
const isExcluded = (element) => SKIPPED.has(element.nodeName)
    || element.getAttribute('translate') === 'no'
    || element.classList.contains('notranslate')
    || element.hasAttribute('data-mce-bogus');

/**
 * Collect the text blocks under a node.
 *
 * @param {Element} node
 * @param {Element[]} found
 * @returns {Element[]}
 */
const collect = (node, found = []) => {
    Array.from(node.children).forEach((child) => {
        if (isExcluded(child) || !BLOCK_TAGS.includes(child.nodeName)) {
            return;
        }
        if (child.querySelector(BLOCK_SELECTOR)) {
            collect(child, found);
        } else if (!STRUCTURAL.has(child.nodeName)) {
            found.push(child);
        }
    });
    return found;
};

/**
 * Whether any variant has words to translate (numbers and symbols alone are left as they are).
 *
 * @param {Object<string, string>} variants
 * @returns {Boolean}
 */
const hasText = (variants) => Object.values(variants).some((html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return /\p{L}/u.test(div.textContent);
});

/**
 * Read the language variants of a text block.
 *
 * Content without multi-language markup returns a single variant keyed "other",
 * meaning "the source language".
 *
 * @param {Element} block
 * @returns {{variants: Object<string, string>, multilang: Boolean}}
 */
export const readVariants = (block) => {
    const html = block.innerHTML;

    // Multi-Language Content (v2): {mlang xx}...{mlang}, with nothing but whitespace outside.
    if (html.match(MLANG_REGEX)) {
        const outside = html.replace(MLANG_REGEX, '').replace(/&nbsp;|<br[^>]*>/gi, '').trim();
        if (outside === '') {
            const variants = {};
            for (const [, langs, content] of html.matchAll(MLANG_REGEX)) {
                langs.split(',').map((lang) => lang.trim().toLowerCase()).filter(isLangCode).forEach((lang) => {
                    variants[lang] = content;
                });
            }
            return {variants, multilang: true};
        }
    }

    // Core filter: consecutive <span lang="xx" class="multilang"> children.
    const children = Array.from(block.childNodes).filter(
        (node) => !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '')
    );
    const isSpan = (node) => node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'SPAN'
        && node.classList.contains('multilang') && isLangCode((node.getAttribute('lang') || '').toLowerCase());
    if (children.length > 1 && children.every(isSpan)) {
        const variants = {};
        children.forEach((span) => {
            variants[span.getAttribute('lang').toLowerCase()] = span.innerHTML;
        });
        return {variants, multilang: true};
    }

    return {variants: {[OTHER]: html}, multilang: false};
};

/**
 * Find the text blocks to translate: the selected ones, or the whole content.
 *
 * @param {TinyMCE} editor
 * @returns {{blocks: Element[], selection: Boolean}}
 */
export const findBlocks = (editor) => {
    const body = editor.getBody();
    let blocks = [];
    let selection = false;

    if (!editor.selection.isCollapsed()) {
        const unique = new Set();
        editor.selection.getSelectedBlocks().forEach((block) => {
            if (block === body || block.closest(EXCLUDED_SELECTOR)) {
                return;
            }
            const leaves = block.querySelector(BLOCK_SELECTOR) ? collect(block) : [block];
            leaves.filter((leaf) => !STRUCTURAL.has(leaf.nodeName)).forEach((leaf) => unique.add(leaf));
        });
        blocks = Array.from(unique);
        selection = blocks.length > 0;
    }
    if (!selection) {
        blocks = collect(body);
    }

    return {
        blocks: blocks.filter((block) => hasText(readVariants(block).variants)),
        selection,
    };
};

/**
 * Pick the source HTML of a block for the given source language.
 *
 * @param {Object<string, string>} variants
 * @param {String} source
 * @returns {String}
 */
export const getSourceHtml = (variants, source) => variants[source]
    ?? variants[source.split('_')[0]]
    ?? variants[OTHER]
    ?? Object.values(variants)[0];

/**
 * Languages already present in every block.
 *
 * @param {Element[]} blocks
 * @returns {Set<String>}
 */
export const getExistingLanguages = (blocks) => {
    let common = null;
    blocks.forEach((block) => {
        const {variants, multilang} = readVariants(block);
        const langs = new Set(multilang ? Object.keys(variants) : []);
        common = common === null ? langs : new Set([...common].filter((lang) => langs.has(lang)));
    });
    return common ?? new Set();
};

/**
 * Build the multi-language HTML of a block.
 *
 * @param {Object} params
 * @param {String} params.source Source language code.
 * @param {String} params.sourceHtml Source content.
 * @param {Object<string, string>} params.existing Variants already in the block.
 * @param {Object<string, string>} params.translations New translations by language.
 * @param {String[]} params.remove Languages to drop from the existing variants.
 * @param {String} params.format FORMAT_MULTILANG2 or FORMAT_MULTILANG.
 * @param {Boolean} params.fallback Write the source as {mlang other} (multilang2 only).
 * @returns {String}
 */
export const buildHtml = ({source, sourceHtml, existing, translations, remove = [], format, fallback}) => {
    const variants = new Map();
    const sourceKey = format === FORMAT_MULTILANG2 && fallback ? OTHER : source;
    variants.set(sourceKey, sourceHtml);

    Object.entries(existing).forEach(([lang, html]) => {
        if (lang === source || lang === OTHER || variants.has(lang) || remove.includes(lang)) {
            return;
        }
        variants.set(lang, html);
    });
    Object.entries(translations).forEach(([lang, html]) => variants.set(lang, html));

    // Only the original is left: write it back as plain content.
    if (variants.size === 1) {
        return sourceHtml;
    }

    // The core filter has no "other": the source keeps its own code.
    if (format === FORMAT_MULTILANG && variants.has(OTHER)) {
        const html = variants.get(OTHER);
        variants.delete(OTHER);
        if (!variants.has(source)) {
            variants.set(source, html);
        }
    }

    let output = '';
    variants.forEach((html, lang) => {
        if (format === FORMAT_MULTILANG2) {
            output += `{mlang ${lang}}${html}{mlang}`;
        } else {
            output += `<span lang="${lang}" class="multilang">${html}</span>`;
        }
    });
    return output;
};

/**
 * Split fragments into requests that respect the server limits.
 *
 * @param {String[]} fragments
 * @param {Number} maxChars
 * @param {Number} maxFragments
 * @returns {Array<{start: Number, items: String[]}>}
 */
export const chunk = (fragments, maxChars, maxFragments) => {
    const chunks = [];
    let current = {start: 0, items: [], size: 0};
    fragments.forEach((fragment, index) => {
        if (current.items.length && (current.size + fragment.length > maxChars || current.items.length >= maxFragments)) {
            chunks.push(current);
            current = {start: index, items: [], size: 0};
        }
        current.items.push(fragment);
        current.size += fragment.length;
    });
    if (current.items.length) {
        chunks.push(current);
    }
    return chunks.map(({start, items}) => ({start, items}));
};
