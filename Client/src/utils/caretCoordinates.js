const MIRROR_STYLES = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
    'lineHeight', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize'
];

export function getCaretCoordinates(textarea, position) {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const style = div.style;
    const computed = window.getComputedStyle(textarea);

    style.whiteSpace = 'pre-wrap';
    style.wordWrap = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';

    MIRROR_STYLES.forEach(prop => { style[prop] = computed[prop]; });

    div.textContent = textarea.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = textarea.value.substring(position) || '.';
    div.appendChild(span);

    const top = span.offsetTop - textarea.scrollTop;
    const left = span.offsetLeft - textarea.scrollLeft;

    document.body.removeChild(div);
    return { top, left };
}