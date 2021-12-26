import { Selector, SelectorType, AttributeAction } from "./types";

const attribValChars = ["\\", '"'];
const pseudoValChars = [...attribValChars, "(", ")"];

const charsToEscapeInAttributeValue = new Set(
    attribValChars.map((c) => c.charCodeAt(0))
);
const charsToEscapeInPseudoValue = new Set(
    pseudoValChars.map((c) => c.charCodeAt(0))
);
const charsToEscapeInName = new Set(
    [
        ...pseudoValChars,
        "~",
        "^",
        "$",
        "*",
        "+",
        "!",
        "|",
        ":",
        "[",
        "]",
        " ",
        ".",
    ].map((c) => c.charCodeAt(0))
);

/**
 * Turns `selector` back into a string.
 *
 * @param selector Selector to stringify.
 */
export function stringify(selector: Selector[][]): string {
    return selector
        .map((token) => token.map((t) => stringifyToken(t)).join(""))
        .join(", ");
}

function stringifyToken(token: Selector): string {
    switch (token.type) {
        // Simple types
        case SelectorType.Child:
            return " > ";
        case SelectorType.Parent:
            return " < ";
        case SelectorType.Sibling:
            return " ~ ";
        case SelectorType.Adjacent:
            return " + ";
        case SelectorType.Descendant:
            return " ";
        case SelectorType.ColumnCombinator:
            return " || ";
        case SelectorType.Universal:
            return `${getNamespace(token.namespace)}*`;

        case SelectorType.Tag:
            return getNamespacedName(token);

        case SelectorType.PseudoElement:
            return `::${escapeName(token.name, charsToEscapeInName)}`;

        case SelectorType.Pseudo:
            if (token.data === null)
                return `:${escapeName(token.name, charsToEscapeInName)}`;
            if (typeof token.data === "string") {
                return `:${escapeName(
                    token.name,
                    charsToEscapeInName
                )}(${escapeName(token.data, charsToEscapeInPseudoValue)})`;
            }
            return `:${escapeName(token.name, charsToEscapeInName)}(${stringify(
                token.data
            )})`;

        case SelectorType.Attribute: {
            if (
                token.name === "id" &&
                token.action === AttributeAction.Equals &&
                token.ignoreCase === "quirks" &&
                !token.namespace
            ) {
                return `#${escapeName(token.value, charsToEscapeInName)}`;
            }
            if (
                token.name === "class" &&
                token.action === AttributeAction.Element &&
                token.ignoreCase === "quirks" &&
                !token.namespace
            ) {
                return `.${escapeName(token.value, charsToEscapeInName)}`;
            }

            const name = getNamespacedName(token);

            if (token.action === AttributeAction.Exists) {
                return `[${name}]`;
            }

            return `[${name}${getActionValue(token.action)}="${escapeName(
                token.value,
                charsToEscapeInAttributeValue
            )}"${
                token.ignoreCase === null ? "" : token.ignoreCase ? " i" : " s"
            }]`;
        }
    }
}

function getActionValue(action: AttributeAction): string {
    switch (action) {
        case AttributeAction.Equals:
            return "";
        case AttributeAction.Element:
            return "~";
        case AttributeAction.Start:
            return "^";
        case AttributeAction.End:
            return "$";
        case AttributeAction.Any:
            return "*";
        case AttributeAction.Not:
            return "!";
        case AttributeAction.Hyphen:
            return "|";
        case AttributeAction.Exists:
            throw new Error("Shouldn't be here");
    }
}

function getNamespacedName(token: {
    name: string;
    namespace: string | null;
}): string {
    return `${getNamespace(token.namespace)}${escapeName(
        token.name,
        charsToEscapeInName
    )}`;
}

function getNamespace(namespace: string | null): string {
    return namespace !== null
        ? `${
              namespace === "*"
                  ? "*"
                  : escapeName(namespace, charsToEscapeInName)
          }|`
        : "";
}

function escapeName(str: string, charsToEscape: Set<number>): string {
    let lastIdx = 0;
    let ret = "";

    for (let i = 0; i < str.length; i++) {
        if (charsToEscape.has(str.charCodeAt(i))) {
            ret += `${str.slice(lastIdx, i)}\\${str.charAt(i)}`;
            lastIdx = i + 1;
        }
    }

    return ret.length > 0 ? ret + str.slice(lastIdx) : str;
}
