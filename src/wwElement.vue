<template>
    <div
        ref="triggerRef"
        class="autocomplete"
        :class="{
            'is-disabled': isDisabled,
            'is-readonly': isReadonly,
            'is-open': isListVisible,
        }"
        :style="triggerCssVars"
    >
        <input
            ref="inputRef"
            class="autocomplete__input"
            type="text"
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            :aria-label="accessibleName"
            :aria-expanded="isListVisible"
            :aria-controls="isListVisible ? listId : undefined"
            :aria-activedescendant="activeDescendantId"
            :aria-invalid="isInvalid || undefined"
            :name="fieldNameValue || undefined"
            :required="isRequired"
            :disabled="isDisabled"
            :readonly="isReadonly"
            :placeholder="placeholderText"
            :value="textValue"
            @input="handleInput"
            @keydown="handleKeydown"
            @focus="handleFocus"
            @blur="handleBlur"
            @click="handleInputClick"
        />

        <button
            v-if="isClearable && textValue"
            class="autocomplete__clear-btn"
            type="button"
            tabindex="-1"
            :aria-label="clearLabel"
            :disabled="isDisabled || isReadonly"
            @click.stop="clearValue"
            @mousedown.prevent
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>

        <!-- Announces result counts to screen readers; the list itself is only
             reachable through aria-activedescendant, so nothing else says it changed. -->
        <span class="autocomplete__sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</span>

        <!-- Suggestions (teleported so an ancestor with overflow: hidden, like a modal, never clips them) -->
        <teleport v-if="isListVisible" :to="teleportTarget" :disabled="!teleportRoot">
            <div
                ref="dropdownRef"
                class="autocomplete__dropdown"
                :style="[floatingStyles, dropdownCssVars]"
                @mousedown="handleDropdownMousedown"
            >
                <div
                    ref="optionsRef"
                    class="autocomplete__options"
                    role="listbox"
                    :id="listId"
                    :aria-label="accessibleName"
                >
                    <div
                        v-for="(suggestion, index) in suggestions"
                        :key="suggestion._uid"
                        :id="`${listId}-opt-${index}`"
                        class="autocomplete__option"
                        :class="{ 'is-active': activeIndex === index }"
                        role="option"
                        :aria-selected="activeIndex === index"
                        @click="selectSuggestion(suggestion)"
                        @mouseenter="activeIndex = index"
                    >
                        <span class="autocomplete__option-label">{{ suggestion.label }}</span>
                        <span v-if="suggestion.description" class="autocomplete__option-description">
                            {{ suggestion.description }}
                        </span>
                    </div>
                    <div v-if="showLoading" class="autocomplete__status" role="presentation">
                        {{ loadingText }}
                    </div>
                    <div v-else-if="showEmpty" class="autocomplete__status" role="presentation">
                        {{ emptyText }}
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script>
import { ref, computed, watch, inject, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useFloating, autoUpdate, flip, shift, offset, size } from '@floating-ui/vue';

// Keyboard, ARIA and dropdown plumbing adapted from jpui-combobox. The model
// differs: the value is the typed text, and suggestions come from outside and
// are never filtered here (the parent searches, the component only displays).

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'update:content', 'update:sidepanel-content', 'add-state', 'remove-state'],
    setup(props, { emit }) {
        /* wwEditor:start */
        inject('_wwForm:selectForm', () => {});
        /* wwEditor:end */

        const isEditing = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return true;
            /* wwEditor:end */
            return false;
        });

        // ── Refs ──────────────────────────────────────────────────────────────
        const triggerRef = ref(null);
        const dropdownRef = ref(null);
        const optionsRef = ref(null);
        const inputRef = ref(null);
        const isOpen = ref(false);
        const isFocused = ref(false);
        const isFocusVisible = ref(false);
        const activeIndex = ref(-1);
        // Query the last `search` event was emitted for. The empty state is only
        // shown once a search for the current text has actually gone out.
        const lastSearchedQuery = ref(null);
        let searchTimer = null;
        let blurTimer = null;

        const listId = `autocomplete-${props.uid}`;

        // Resolved after mount: during editor boot `#app` may not exist yet.
        const teleportRoot = ref(null);
        onMounted(() => {
            const doc = wwLib.getFrontDocument();
            teleportRoot.value = doc?.querySelector('#app') ?? doc?.body ?? null;
        });
        const teleportTarget = computed(() => teleportRoot.value || 'body');

        // ── Flags ─────────────────────────────────────────────────────────────
        const isDisabled = computed(() => props.content?.disabled || false);
        const isReadonly = computed(() => props.content?.readonly || false);
        const isInvalid = computed(() => props.content?.invalid || false);
        const isRequired = computed(() => props.content?.required || false);
        const isClearable = computed(() => props.content?.clearable !== false);
        const submitOnEnter = computed(() => props.content?.submitOnEnter || false);
        const autoHighlightFirst = computed(() => props.content?.autoHighlightFirst !== false);
        const isLoading = computed(() => props.content?.isLoading || false);
        // Number(null) is 0, so an unset binding must fall back before converting.
        const toCount = (v, fallback) => {
            if (v === null || v === undefined || v === '') return fallback;
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 ? n : fallback;
        };
        const minChars = computed(() => toCount(props.content?.minChars, 3));
        const debounceDelay = computed(() => toCount(props.content?.debounceDelay, 300));

        const getText = v => wwLib.wwLang?.getText(v);
        const placeholderText = computed(() => getText(props.content?.placeholder) || '');
        const emptyText = computed(() => getText(props.content?.emptyStateText) ?? '');
        const loadingText = computed(() => getText(props.content?.loadingText) || 'Searching…');
        const clearLabel = computed(() => getText(props.content?.clearAriaLabel) || 'Clear');

        const asName = v => (v === null || v === undefined ? '' : String(v).trim());
        const accessibleName = computed(
            () =>
                asName(getText(props.content?.ariaLabel)) ||
                asName(props.content?.fieldName) ||
                asName(props.wwElementState?.name) ||
                'Search'
        );

        // ── Value (free text) ─────────────────────────────────────────────────
        const toText = v => (v === null || v === undefined ? '' : String(v));
        const initValue = computed(() => toText(props.content?.initValue));

        const { value: variableValue, setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            type: 'string',
            defaultValue: initValue,
        });
        const textValue = computed(() => toText(variableValue.value));
        const query = computed(() => textValue.value.trim());
        const isQueryLongEnough = computed(() => query.value.length >= minChars.value);

        // A changed init value replaces the text, but never starts a search: it is
        // the parent writing (a picked place, a moved pin), not the user typing.
        watch(
            initValue,
            next => {
                if (next !== textValue.value) {
                    cancelSearch();
                    setValue(next);
                }
                emit('trigger-event', { name: 'initValueChange', event: { value: next } });
            },
            { immediate: true }
        );

        // ── Suggestions ───────────────────────────────────────────────────────
        const { resolveMappingFormula } = wwLib.wwFormula.useFormula();

        const suggestions = computed(() => {
            const raw = props.content?.suggestions;
            if (!Array.isArray(raw)) return [];
            return raw.map((item, index) => {
                const isObject = item !== null && typeof item === 'object';
                const label = toText(
                    resolveMappingFormula(props.content?.mappingLabel, item) ??
                        (isObject ? item.label ?? item.name : item) ??
                        ''
                );
                const description = toText(
                    resolveMappingFormula(props.content?.mappingDescription, item) ??
                        (isObject ? item.description : '') ??
                        ''
                );
                const value = toText(
                    resolveMappingFormula(props.content?.mappingValue, item) ??
                        (isObject ? item.value : null) ??
                        label
                );
                return { _uid: `${index}-${value}`, label, description, value, item };
            });
        });

        // New results: start from the top (or nothing) instead of keeping an index
        // that now points at a different row.
        // Keyed on content, not on the array: WeWeb can hand back a new array with the
        // same rows whenever the element's bindings re-evaluate (moving the highlight
        // updates the local context, which is enough). Resetting on reference would
        // snap the highlight back to the first row on every arrow press.
        const suggestionsKey = computed(() =>
            suggestions.value.map(s => `${s.value}\u0000${s.label}\u0000${s.description}`).join('\u0001')
        );
        watch(suggestionsKey, () => {
            activeIndex.value = autoHighlightFirst.value && suggestions.value.length > 0 ? 0 : -1;
        });

        const forceOpen = computed(() => {
            /* wwEditor:start */
            if (props.content?.forceOpen) return true;
            /* wwEditor:end */
            return false;
        });

        const showLoading = computed(() => isLoading.value && suggestions.value.length === 0);
        const showEmpty = computed(
            () =>
                !isLoading.value &&
                suggestions.value.length === 0 &&
                !!emptyText.value &&
                (forceOpen.value || lastSearchedQuery.value === query.value)
        );

        const isListVisible = computed(() => {
            if (forceOpen.value) return true;
            if (isEditing.value || !isOpen.value || !isFocused.value || !isQueryLongEnough.value) return false;
            return suggestions.value.length > 0 || showLoading.value || showEmpty.value;
        });

        const activeSuggestion = computed(() =>
            isListVisible.value && activeIndex.value >= 0 ? suggestions.value[activeIndex.value] ?? null : null
        );
        const activeDescendantId = computed(() =>
            activeSuggestion.value ? `${listId}-opt-${activeIndex.value}` : undefined
        );

        const liveMessage = computed(() => {
            if (!isListVisible.value) return '';
            if (showLoading.value) return loadingText.value;
            const n = suggestions.value.length;
            if (n === 0) return emptyText.value;
            return n === 1 ? '1 suggestion' : `${n} suggestions`;
        });

        // ── Search (debounced) ────────────────────────────────────────────────
        function cancelSearch() {
            if (searchTimer !== null) clearTimeout(searchTimer);
            searchTimer = null;
        }
        function scheduleSearch() {
            cancelSearch();
            if (!isQueryLongEnough.value) return;
            const run = () => {
                searchTimer = null;
                lastSearchedQuery.value = query.value;
                emit('trigger-event', { name: 'search', event: { value: query.value } });
            };
            if (debounceDelay.value === 0) run();
            else searchTimer = setTimeout(run, debounceDelay.value);
        }

        // ── Focus / states ────────────────────────────────────────────────────
        function isKeyboardFocus(event) {
            const el = event?.target;
            if (typeof el?.matches !== 'function') return false;
            try {
                return el.matches(':focus-visible');
            } catch {
                return false;
            }
        }

        watch(isDisabled, v => emit(v ? 'add-state' : 'remove-state', 'disabled'), { immediate: true });
        watch(isReadonly, v => emit(v ? 'add-state' : 'remove-state', 'readonly'), { immediate: true });
        watch(isInvalid, v => emit(v ? 'add-state' : 'remove-state', 'invalid'), { immediate: true });

        function handleFocus(event) {
            if (blurTimer !== null) {
                clearTimeout(blurTimer);
                blurTimer = null;
            }
            if (isFocused.value) return;
            isFocused.value = true;
            isFocusVisible.value = isKeyboardFocus(event);
            emit('add-state', 'focus');
            if (isFocusVisible.value) emit('add-state', 'focus-visible');
            emit('trigger-event', { name: 'focus', event: { value: textValue.value } });
        }

        // Deferred so a click on a suggestion (which keeps focus anyway, see
        // handleDropdownMousedown) or on the clear button never reads as a blur.
        function handleBlur() {
            if (blurTimer !== null) clearTimeout(blurTimer);
            blurTimer = setTimeout(() => {
                blurTimer = null;
                const focused = wwLib.getFrontDocument()?.activeElement;
                if (inputRef.value && focused === inputRef.value) return;
                isFocused.value = false;
                isFocusVisible.value = false;
                closeList();
                emit('remove-state', 'focus');
                emit('remove-state', 'focus-visible');
                emit('trigger-event', { name: 'blur', event: { value: textValue.value } });
            }, 150);
        }

        function handleDropdownMousedown(event) {
            // Keep focus in the input while clicking a suggestion.
            event.preventDefault();
        }

        // ── Open / close ──────────────────────────────────────────────────────
        function openList() {
            if (isDisabled.value || isReadonly.value || isEditing.value) return;
            if (!isOpen.value) {
                isOpen.value = true;
                activeIndex.value = autoHighlightFirst.value && suggestions.value.length > 0 ? 0 : -1;
            }
        }
        function closeList() {
            isOpen.value = false;
            activeIndex.value = -1;
        }

        watch(isListVisible, (visible, was) => {
            if (visible === was) return;
            emit('trigger-event', { name: visible ? 'open' : 'close', event: null });
        });

        // ── Input handlers ────────────────────────────────────────────────────
        function handleInput(event) {
            const text = toText(event?.target?.value);
            setValue(text);
            emit('trigger-event', { name: 'change', event: { value: text } });
            if (isQueryLongEnough.value) openList();
            scheduleSearch();
        }

        function handleInputClick() {
            if (isQueryLongEnough.value && suggestions.value.length > 0) openList();
        }

        function selectSuggestion(suggestion) {
            if (!suggestion) return;
            cancelSearch();
            setValue(suggestion.value);
            closeList();
            emit('trigger-event', { name: 'change', event: { value: suggestion.value } });
            emit('trigger-event', { name: 'select', event: { item: suggestion.item, value: suggestion.value } });
            nextTick(() => inputRef.value?.focus());
        }

        function clearValue() {
            cancelSearch();
            setValue('');
            closeList();
            lastSearchedQuery.value = null;
            emit('trigger-event', { name: 'change', event: { value: '' } });
            nextTick(() => inputRef.value?.focus());
        }

        // ── Keyboard ──────────────────────────────────────────────────────────
        function moveActive(step) {
            const n = suggestions.value.length;
            if (n === 0) return;
            const i = activeIndex.value;
            // Wrap around, and pass through "nothing highlighted" only from the edges.
            activeIndex.value = i < 0 ? (step > 0 ? 0 : n - 1) : (i + step + n) % n;
            scrollActiveIntoView();
        }

        function handleKeydown(event) {
            // An IME (Korean, Japanese…) uses Enter and arrows to compose text.
            if (event?.isComposing || event?.keyCode === 229) return;
            if (isDisabled.value || isReadonly.value) return;

            switch (event.key) {
                case 'ArrowDown':
                    if (!isListVisible.value) {
                        if (!isQueryLongEnough.value || suggestions.value.length === 0) return;
                        event.preventDefault();
                        openList();
                        if (activeIndex.value < 0) activeIndex.value = 0;
                        scrollActiveIntoView();
                        return;
                    }
                    event.preventDefault();
                    moveActive(1);
                    break;
                case 'ArrowUp':
                    if (!isListVisible.value) return;
                    event.preventDefault();
                    moveActive(-1);
                    break;
                case 'Enter':
                    if (activeSuggestion.value) {
                        event.preventDefault();
                        selectSuggestion(activeSuggestion.value);
                        return;
                    }
                    // Nothing highlighted: keep the typed text. Inside a form the browser
                    // would submit on this keydown, unless told not to.
                    if (!submitOnEnter.value) event.preventDefault();
                    closeList();
                    emit('trigger-event', { name: 'enter', event: { value: textValue.value } });
                    break;
                case 'Escape':
                    // Only swallow Escape when there is a list to dismiss, so it still
                    // reaches an enclosing modal otherwise.
                    if (!isListVisible.value) return;
                    event.preventDefault();
                    event.stopPropagation();
                    closeList();
                    break;
                case 'Tab':
                    closeList();
                    break;
            }
        }

        // By hand rather than scrollIntoView(), which would also scroll the page
        // under a teleported list.
        function scrollActiveIntoView() {
            nextTick(() => {
                const container = optionsRef.value;
                if (!container || activeIndex.value < 0) return;
                const el = container.querySelector(`[id="${listId}-opt-${activeIndex.value}"]`);
                if (!el) return;
                const top = el.offsetTop;
                const bottom = top + el.offsetHeight;
                if (top < container.scrollTop) container.scrollTop = top;
                else if (bottom > container.scrollTop + container.clientHeight) {
                    container.scrollTop = bottom - container.clientHeight;
                }
            });
        }

        // ── Floating UI ───────────────────────────────────────────────────────
        const floatingMiddleware = computed(() => [
            offset(props.content?.offsetY ?? 4),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            size({
                apply({ availableHeight, rects, elements }) {
                    const floating = elements.floating;
                    const maxH = props.content?.dropdownMaxHeight || '300px';
                    floating.style.maxHeight = `min(${Math.max(availableHeight - 8, 0)}px, ${maxH})`;
                    floating.style.width = `${rects.reference.width}px`;
                },
            }),
        ]);

        const { floatingStyles } = useFloating(triggerRef, dropdownRef, {
            placement: computed(() => props.content?.side || 'bottom-start'),
            middleware: floatingMiddleware,
            whileElementsMounted: autoUpdate,
        });

        onBeforeUnmount(() => {
            cancelSearch();
            if (blurTimer !== null) clearTimeout(blurTimer);
        });

        // ── Form integration ──────────────────────────────────────────────────
        const fieldNameValue = computed(() => props.content?.fieldName || props.wwElementState?.name || '');
        const validation = computed(() => props.content?.validation);
        const customValidation = computed(() => props.content?.customValidation);

        const useForm = inject('_wwForm:useForm', () => {});
        useForm(
            variableValue,
            { fieldName: fieldNameValue, validation, customValidation, initialValue: initValue },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue }
        );

        // ── CSS variables ─────────────────────────────────────────────────────
        const triggerCssVars = computed(() => ({
            '--input-font-size': props.content?.inputFontSize || '16px',
            '--input-font-weight': props.content?.inputFontWeight || null,
            '--input-text-color': props.content?.inputTextColor || '#111827',
            '--placeholder-color': props.content?.placeholderColor || '#6b7280',
            '--icon-color': props.content?.iconColor || '#6b7280',
            '--icon-size': props.content?.iconSize || '16px',
        }));

        const dropdownCssVars = computed(() => ({
            '--dropdown-bg': props.content?.dropdownBgColor || '#ffffff',
            '--dropdown-border': props.content?.dropdownBorderAll || '1px solid #e5e7eb',
            '--dropdown-radius': props.content?.dropdownBorderRadius || '6px',
            '--dropdown-padding': props.content?.dropdownPadding || '4px',
            '--dropdown-shadow':
                props.content?.dropdownShadow || '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)',
            '--dropdown-z-index': props.content?.zIndex || 9999,
            '--option-font-size': props.content?.optionFontSize || null,
            '--option-font-weight': props.content?.optionFontWeight || null,
            '--option-color': props.content?.optionFontColor || '#111827',
            '--option-bg-active': props.content?.optionBgColorActive || '#f3f4f6',
            '--option-padding': props.content?.optionPadding || '6px 8px',
            '--option-radius': props.content?.optionBorderRadius || '4px',
            '--description-font-size': props.content?.descriptionFontSize || '13px',
            '--description-color': props.content?.descriptionFontColor || '#6b7280',
            '--status-font-size': props.content?.statusFontSize || '14px',
            '--status-color': props.content?.statusFontColor || '#6b7280',
        }));

        // ── Local context ─────────────────────────────────────────────────────
        const localData = computed(() => ({
            value: textValue.value,
            query: query.value,
            isOpen: isListVisible.value,
            activeSuggestion: activeSuggestion.value?.item ?? null,
            suggestionsCount: suggestions.value.length,
        }));

        const localMarkdown = `### Autocomplete local information

#### value
The text in the field (typed or picked from a suggestion).

#### query
\`value\` trimmed — what the last or next \`search\` event carries.

#### isOpen
Whether the suggestion list is shown.

#### activeSuggestion
The original suggestion object currently highlighted with the keyboard or mouse, or \`null\`.

#### suggestionsCount
Number of suggestions currently bound.

**Usage Example:**
\`\`\`
context.local.data?.['autocomplete']?.['value']
\`\`\`
`;

        wwLib.wwElement.useRegisterElementLocalContext('autocomplete', localData, {}, localMarkdown);

        // ── Workflow actions ──────────────────────────────────────────────────
        function actionFocus() {
            inputRef.value?.focus();
        }
        function actionSetValue(val) {
            const text = toText(val);
            cancelSearch();
            setValue(text);
            closeList();
            emit('trigger-event', { name: 'change', event: { value: text } });
        }
        function actionClear() {
            cancelSearch();
            setValue('');
            closeList();
            lastSearchedQuery.value = null;
            emit('trigger-event', { name: 'change', event: { value: '' } });
        }
        function actionOpen() {
            openList();
        }
        function actionClose() {
            closeList();
        }

        return {
            triggerRef,
            dropdownRef,
            optionsRef,
            inputRef,
            activeIndex,
            listId,
            teleportRoot,
            teleportTarget,
            isDisabled,
            isReadonly,
            isInvalid,
            isRequired,
            isClearable,
            placeholderText,
            emptyText,
            loadingText,
            clearLabel,
            accessibleName,
            textValue,
            suggestions,
            showLoading,
            showEmpty,
            isListVisible,
            activeDescendantId,
            liveMessage,
            fieldNameValue,
            floatingStyles,
            triggerCssVars,
            dropdownCssVars,
            handleInput,
            handleKeydown,
            handleFocus,
            handleBlur,
            handleInputClick,
            handleDropdownMousedown,
            selectSuggestion,
            clearValue,
            actionFocus,
            actionSetValue,
            actionClear,
            actionOpen,
            actionClose,
        };
    },
};
</script>

<style lang="scss" scoped>
.autocomplete {
    position: relative;
    display: flex !important;
    align-items: center;
    gap: 4px;
    cursor: text;
    width: 100%;

    &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }

    &.is-readonly {
        cursor: default;
    }

    &__input {
        flex: 1;
        min-width: 0;
        height: 100%;
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        font-size: var(--input-font-size, inherit);
        font-weight: var(--input-font-weight, inherit);
        color: var(--input-text-color, inherit);
        padding: 0;
        cursor: inherit;

        &::placeholder {
            color: var(--placeholder-color, #6b7280);
            font: inherit;
        }

        &:disabled {
            cursor: not-allowed;
        }
    }

    &__clear-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        color: var(--icon-color, #6b7280);
        padding: 0;
        margin: 0;

        svg {
            width: var(--icon-size, 16px);
            height: var(--icon-size, 16px);
            display: block;
        }
    }

    &__sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
}

// Rendered via teleport, outside .autocomplete
.autocomplete__dropdown {
    position: absolute;
    z-index: var(--dropdown-z-index, 9999);
    background: var(--dropdown-bg, #ffffff);
    border: var(--dropdown-border, 1px solid #e5e7eb);
    border-radius: var(--dropdown-radius, 6px);
    box-shadow: var(--dropdown-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
    overflow: hidden;

    .autocomplete__options {
        // offsetParent of the rows, for scrollActiveIntoView()
        position: relative;
        overflow-y: auto;
        padding: var(--dropdown-padding, 4px);
        max-height: inherit;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .autocomplete__option {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--option-padding, 6px 8px);
        border-radius: var(--option-radius, 4px);
        color: var(--option-color, #111827);
        font-size: var(--option-font-size, inherit);
        font-weight: var(--option-font-weight, inherit);
        cursor: pointer;
        user-select: none;

        &.is-active {
            background: var(--option-bg-active, #f3f4f6);
        }
    }

    .autocomplete__option-label,
    .autocomplete__option-description {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .autocomplete__option-description {
        font-size: var(--description-font-size, 13px);
        font-weight: 400;
        color: var(--description-color, #6b7280);
    }

    .autocomplete__status {
        padding: var(--option-padding, 6px 8px);
        font-size: var(--status-font-size, 14px);
        color: var(--status-color, #6b7280);
    }
}
</style>
