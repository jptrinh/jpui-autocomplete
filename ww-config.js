const lengthOptions = (max = 72) => ({
    unitChoices: [
        { value: 'px', label: 'px', min: 8, max },
        { value: 'rem', label: 'rem', min: 0.5, max: 4 },
        { value: 'em', label: 'em', min: 0.5, max: 4 },
    ],
    noRange: true,
});

const mappingTemplate = content => ({
    template: Array.isArray(content.suggestions) && content.suggestions.length > 0 ? content.suggestions[0] : null,
});

const mappingHidden = (content, sidepanelContent, boundProps) =>
    !Array.isArray(content.suggestions) || !content.suggestions?.length || !boundProps.suggestions;

export default {
    editor: {
        label: 'Autocomplete',
        icon: 'search',
        customSettingsPropertiesOrder: [
            'suggestions',
            'mappingLabel',
            'mappingDescription',
            'mappingValue',
            'initValue',
            {
                label: 'Search',
                isCollapsible: true,
                properties: ['minChars', 'debounceDelay', 'isLoading', 'loadingText', 'emptyStateText'],
            },
            {
                label: 'Behavior',
                isCollapsible: true,
                properties: [
                    'placeholder',
                    'autoHighlightFirst',
                    'submitOnEnter',
                    'clearable',
                    'disabled',
                    'readonly',
                    'invalid',
                    'required',
                    'forceOpen',
                ],
            },
            {
                label: 'Accessibility',
                isCollapsible: true,
                properties: ['ariaLabel', 'clearAriaLabel'],
            },
            'formInfobox',
            ['fieldName', 'customValidation', 'validation'],
        ],
        customStylePropertiesOrder: [
            {
                label: 'Input',
                isCollapsible: true,
                properties: [
                    'inputFontSize',
                    'inputFontWeight',
                    'inputTextColor',
                    'placeholderColor',
                    'iconColor',
                    'iconSize',
                ],
            },
            {
                label: 'Dropdown',
                isCollapsible: true,
                properties: [
                    'side',
                    'offsetY',
                    'dropdownMaxHeight',
                    'dropdownBgColor',
                    'dropdownBorderAll',
                    'dropdownBorderRadius',
                    'dropdownPadding',
                    'dropdownShadow',
                    'zIndex',
                ],
            },
            {
                label: 'Suggestion',
                isCollapsible: true,
                properties: [
                    'optionFontSize',
                    'optionFontWeight',
                    'optionFontColor',
                    'optionBgColorActive',
                    'optionPadding',
                    'optionBorderRadius',
                    'descriptionFontSize',
                    'descriptionFontColor',
                ],
            },
            {
                label: 'Loading / empty',
                isCollapsible: true,
                properties: ['statusFontSize', 'statusFontColor'],
            },
        ],
    },
    options: {
        autoByContent: true,
        displayAllowedValues: ['block'],
    },
    states: ['focus', 'focus-visible', 'disabled', 'readonly', 'invalid'],
    triggerEvents: [
        { name: 'change', label: { en: 'On change' }, event: { value: '' }, default: true },
        { name: 'search', label: { en: 'On search' }, event: { value: '' } },
        { name: 'select', label: { en: 'On select' }, event: { item: {}, value: '' } },
        { name: 'enter', label: { en: 'On enter (no suggestion highlighted)' }, event: { value: '' } },
        { name: 'initValueChange', label: { en: 'On init value change' }, event: { value: '' } },
        { name: 'focus', label: { en: 'On focus' }, event: { value: '' } },
        { name: 'blur', label: { en: 'On blur' }, event: { value: '' } },
        { name: 'open', label: { en: 'On suggestions open' }, event: null },
        { name: 'close', label: { en: 'On suggestions close' }, event: null },
    ],
    actions: [
        { label: 'Focus', action: 'actionFocus', args: [] },
        {
            label: 'Set value',
            action: 'actionSetValue',
            args: [{ name: 'Value', type: 'string', required: true }],
        },
        { label: 'Clear', action: 'actionClear', args: [] },
        { label: 'Open suggestions', action: 'actionOpen', args: [] },
        { label: 'Close suggestions', action: 'actionClose', args: [] },
    ],
    properties: {
        // ── DATA ──────────────────────────────────────────────────────────────
        suggestions: {
            label: { en: 'Suggestions' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: [
                { label: 'Blue Bottle Coffee', description: 'Seongmisan-ro 32-gil 52, Seoul' },
                { label: 'Rue de Gerland', description: '7th Arrondissement, Lyon, France' },
            ],
            options: {
                expandable: true,
                getItemLabel(item) {
                    return item?.label || item?.value || 'Suggestion';
                },
                item: {
                    type: 'Object',
                    defaultValue: { label: 'New suggestion', description: '' },
                    options: {
                        item: {
                            label: { label: { en: 'Label' }, type: 'Text' },
                            description: { label: { en: 'Description' }, type: 'Text' },
                            value: { label: { en: 'Value (text put in the field)' }, type: 'Text' },
                        },
                    },
                },
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip:
                    'Results of your search, displayed as-is (never filtered): `[{ label, description?, value? }]`. Any other fields are kept and returned in On select.',
            },
            propertyHelp: {
                tooltip:
                    'Bind the result of the workflow run by On search. The component does not filter: what you bind is what is shown.',
            },
            /* wwEditor:end */
        },
        mappingLabel: {
            label: { en: 'Label field' },
            type: 'Formula',
            section: 'settings',
            options: mappingTemplate,
            defaultValue: { type: 'f', code: "context.mapping?.['label']" },
            hidden: mappingHidden,
        },
        mappingDescription: {
            label: { en: 'Description field' },
            type: 'Formula',
            section: 'settings',
            options: mappingTemplate,
            defaultValue: { type: 'f', code: "context.mapping?.['description']" },
            hidden: mappingHidden,
        },
        mappingValue: {
            label: { en: 'Value field' },
            type: 'Formula',
            section: 'settings',
            options: mappingTemplate,
            defaultValue: { type: 'f', code: "context.mapping?.['value']" },
            hidden: mappingHidden,
            /* wwEditor:start */
            propertyHelp: {
                tooltip: 'Text written in the field when this suggestion is picked. Falls back to the label.',
            },
            /* wwEditor:end */
        },
        initValue: {
            label: { en: 'Init value' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Text shown in the field. Changing it replaces the text without starting a search.',
            },
            /* wwEditor:end */
        },

        // ── SEARCH ────────────────────────────────────────────────────────────
        minChars: {
            label: { en: 'Min characters' },
            type: 'Number',
            section: 'settings',
            options: { min: 0, max: 20, step: 1 },
            defaultValue: 3,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'On search only fires, and the list only opens, from this many characters (trimmed).',
            },
            /* wwEditor:end */
        },
        debounceDelay: {
            label: { en: 'Debounce (ms)' },
            type: 'Number',
            section: 'settings',
            options: { min: 0, max: 2000, step: 50 },
            defaultValue: 300,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'Delay after the last keystroke before On search fires. On change is never debounced.',
            },
            /* wwEditor:end */
        },
        isLoading: {
            label: { en: 'Loading' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'Bind to your own "searching" flag. Shows the loading text while there are no suggestions.',
            },
            /* wwEditor:end */
        },
        loadingText: {
            label: { en: 'Loading text' },
            type: 'Text',
            section: 'settings',
            multiLang: true,
            bindable: true,
            defaultValue: { en: 'Searching…' },
        },
        emptyStateText: {
            label: { en: 'No results text' },
            type: 'Text',
            section: 'settings',
            multiLang: true,
            bindable: true,
            defaultValue: { en: 'No suggestions' },
            /* wwEditor:start */
            propertyHelp: {
                tooltip:
                    'Shown when a search went out for the current text and no suggestion is bound. Leave empty to keep the list closed instead.',
            },
            /* wwEditor:end */
        },

        // ── BEHAVIOR ──────────────────────────────────────────────────────────
        placeholder: {
            label: { en: 'Placeholder' },
            type: 'Text',
            section: 'settings',
            multiLang: true,
            bindable: true,
            defaultValue: { en: 'Search…' },
        },
        autoHighlightFirst: {
            label: { en: 'Highlight first suggestion' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: true,
            bindable: true,
            /* wwEditor:start */
            propertyHelp: {
                tooltip:
                    'When results arrive, highlight the first one, so Enter picks it. Off: Enter keeps the typed text until the user arrows down.',
            },
            /* wwEditor:end */
        },
        submitOnEnter: {
            label: { en: 'Submit form on Enter' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            /* wwEditor:start */
            propertyHelp: {
                tooltip:
                    'Only when no suggestion is highlighted. Off (default): Enter never submits the parent form, it fires "On enter" instead.',
            },
            /* wwEditor:end */
        },
        clearable: {
            label: { en: 'Clearable' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: true,
            bindable: true,
        },
        disabled: {
            label: { en: 'Disabled' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
        },
        readonly: {
            label: { en: 'Read only' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
        },
        invalid: {
            label: { en: 'Invalid' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
        },
        required: {
            label: { en: 'Required' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
        },
        /* wwEditor:start */
        forceOpen: {
            label: { en: 'Show suggestions (editor)' },
            type: 'OnOff',
            section: 'settings',
            editorOnly: true,
            defaultValue: false,
        },
        /* wwEditor:end */

        // ── ACCESSIBILITY ─────────────────────────────────────────────────────
        ariaLabel: {
            label: { en: 'Accessible label' },
            type: 'Text',
            section: 'settings',
            multiLang: true,
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            propertyHelp: {
                tooltip: 'Screen-reader name. Falls back to the field name, then the element name.',
            },
            /* wwEditor:end */
        },
        clearAriaLabel: {
            label: { en: 'Clear button label' },
            type: 'Text',
            section: 'settings',
            multiLang: true,
            bindable: true,
            defaultValue: { en: 'Clear' },
        },

        // ── FORM ──────────────────────────────────────────────────────────────
        /* wwEditor:start */
        form: {
            editorOnly: true,
            hidden: true,
            defaultValue: false,
        },
        formInfobox: {
            type: 'InfoBox',
            section: 'settings',
            options: (_, sidePanelContent) => ({
                variant: sidePanelContent.form?.name ? 'success' : 'warning',
                icon: 'pencil',
                title: sidePanelContent.form?.name || 'Unnamed form',
                content: !sidePanelContent.form?.name && 'Give your form a meaningful name.',
                cta: { label: 'Select form', action: 'selectForm' },
            }),
            hidden: (_, sidePanelContent) => !sidePanelContent.form?.uid,
        },
        /* wwEditor:end */
        fieldName: {
            label: 'Field name',
            section: 'settings',
            type: 'Text',
            defaultValue: '',
            bindable: true,
            hidden: (_, sidePanelContent) => !sidePanelContent.form?.uid,
        },
        customValidation: {
            label: 'Custom validation',
            section: 'settings',
            type: 'OnOff',
            defaultValue: false,
            bindable: true,
            hidden: (_, sidePanelContent) => !sidePanelContent.form?.uid,
        },
        validation: {
            label: 'Validation',
            section: 'settings',
            type: 'Formula',
            defaultValue: '',
            hidden: (content, sidePanelContent) => !sidePanelContent.form?.uid || !content.customValidation,
        },

        // ── STYLE: INPUT ──────────────────────────────────────────────────────
        inputFontSize: {
            label: { en: 'Font size' },
            type: 'Length',
            section: 'style',
            options: lengthOptions(),
            bindable: true,
            responsive: true,
            defaultValue: '16px',
        },
        inputFontWeight: {
            label: { en: 'Font weight' },
            type: 'Number',
            section: 'style',
            options: { min: 100, max: 900, step: 100 },
            bindable: true,
            responsive: true,
            defaultValue: 400,
        },
        inputTextColor: {
            label: { en: 'Text color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            defaultValue: '#111827',
        },
        placeholderColor: {
            label: { en: 'Placeholder color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            // #6b7280 on white is 4.83:1 (WCAG AA for text).
            defaultValue: '#6b7280',
        },
        iconColor: {
            label: { en: 'Clear icon color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            defaultValue: '#6b7280',
        },
        iconSize: {
            label: { en: 'Clear icon size' },
            type: 'Length',
            section: 'style',
            options: { unitChoices: [{ value: 'px', label: 'px', min: 8, max: 48 }], noRange: true },
            bindable: true,
            responsive: true,
            defaultValue: '16px',
        },

        // ── STYLE: DROPDOWN ───────────────────────────────────────────────────
        side: {
            label: { en: 'Position' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'bottom-start', label: 'Bottom' },
                    { value: 'top-start', label: 'Top' },
                ],
            },
            defaultValue: 'bottom-start',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Valid values: bottom-start | top-start (flips automatically when there is no room).',
            },
            /* wwEditor:end */
        },
        offsetY: {
            label: { en: 'Offset' },
            type: 'Number',
            section: 'style',
            options: { min: -100, max: 100, step: 1 },
            defaultValue: 4,
            bindable: true,
        },
        dropdownMaxHeight: {
            label: { en: 'Max height' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 50, max: 1000 },
                    { value: 'vh', label: 'vh', min: 10, max: 90 },
                ],
                noRange: true,
            },
            defaultValue: '300px',
            bindable: true,
        },
        dropdownBgColor: {
            label: { en: 'Background' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '#ffffff',
        },
        dropdownBorderAll: {
            label: { en: 'Border' },
            type: 'Border',
            section: 'style',
            classes: true,
            bindable: true,
            responsive: true,
            defaultValue: '1px solid #e5e7eb',
        },
        dropdownBorderRadius: {
            label: { en: 'Border radius' },
            type: 'Spacing',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 48 },
                    { value: '%', label: '%', min: 0, max: 50 },
                ],
                isCorner: true,
                noRange: true,
            },
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '6px',
        },
        dropdownPadding: {
            label: { en: 'Padding' },
            type: 'Spacing',
            section: 'style',
            options: { unitChoices: [{ value: 'px', label: 'px', min: 0, max: 48 }], noRange: true },
            bindable: true,
            responsive: true,
            defaultValue: '4px',
        },
        dropdownShadow: {
            label: { en: 'Shadow' },
            type: 'Shadows',
            section: 'style',
            options: { nullable: true },
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)',
        },
        zIndex: {
            label: { en: 'Z-index' },
            type: 'Number',
            section: 'style',
            options: { min: 1, max: 99999 },
            defaultValue: 9999,
            bindable: true,
            /* wwEditor:start */
            propertyHelp: {
                tooltip: 'The list is rendered at the root of the page: keep it above your modals.',
            },
            /* wwEditor:end */
        },

        // ── STYLE: SUGGESTION ─────────────────────────────────────────────────
        optionFontSize: {
            label: { en: 'Font size' },
            type: 'Length',
            section: 'style',
            options: lengthOptions(),
            bindable: true,
            responsive: true,
            defaultValue: '15px',
        },
        optionFontWeight: {
            label: { en: 'Font weight' },
            type: 'Number',
            section: 'style',
            options: { min: 100, max: 900, step: 100 },
            bindable: true,
            responsive: true,
            defaultValue: 500,
        },
        optionFontColor: {
            label: { en: 'Text color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '#111827',
        },
        optionBgColorActive: {
            label: { en: 'Background (highlighted)' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '#f3f4f6',
        },
        optionPadding: {
            label: { en: 'Padding' },
            type: 'Spacing',
            section: 'style',
            options: { unitChoices: [{ value: 'px', label: 'px', min: 0, max: 48 }], noRange: true },
            bindable: true,
            responsive: true,
            defaultValue: '6px 8px',
        },
        optionBorderRadius: {
            label: { en: 'Border radius' },
            type: 'Spacing',
            section: 'style',
            options: {
                unitChoices: [{ value: 'px', label: 'px', min: 0, max: 24 }],
                isCorner: true,
                noRange: true,
            },
            bindable: true,
            responsive: true,
            defaultValue: '4px',
        },
        descriptionFontSize: {
            label: { en: 'Description font size' },
            type: 'Length',
            section: 'style',
            options: lengthOptions(),
            bindable: true,
            responsive: true,
            defaultValue: '13px',
        },
        descriptionFontColor: {
            label: { en: 'Description color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '#6b7280',
        },

        // ── STYLE: LOADING / EMPTY ────────────────────────────────────────────
        statusFontSize: {
            label: { en: 'Font size' },
            type: 'Length',
            section: 'style',
            options: lengthOptions(),
            bindable: true,
            responsive: true,
            defaultValue: '14px',
        },
        statusFontColor: {
            label: { en: 'Text color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '#6b7280',
        },
    },
};
