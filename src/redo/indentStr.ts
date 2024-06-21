//////////// Pretty printing
export function indentStr(
    indent: number,
    multiLineInput: string
): string {
    const indentToAdd = "    ".repeat(indent);
    const lines = multiLineInput.split("\n");
    const indentedLines = lines.map(
        (line) => indentToAdd + line
    );
    return indentedLines.join("\n");
}
function dedentStr(
    multiLineInput: string,
    maxDedent = Number.POSITIVE_INFINITY
): string {
    const lines = multiLineInput.split("\n");
    const dedentedLines = lines.map((line1) => {
        let line = line1;
        let dedentCount = 0;
        while (line.startsWith("    ") &&
            dedentCount < maxDedent) {
            line = line.slice(4);
            dedentCount++;
        }
        return line;
    });
    return dedentedLines.join("\n");
}
// Template string version of the above functions
export const indent = (
    strings: TemplateStringsArray,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ...values: any[]
): string => {
    // dedent the input string, then indent all values and combine
    const dedented = strings.map((str) => dedentStr(str));
    const indentedValues = values.map((value) => {
        if (!value) {
            return "";
        } if (typeof value === "string") {
            return indentStr(1, value);
        } if (typeof value === "object" &&
            "toString" in value) {
            return indentStr(1, value.toString());
        }
        return indentStr(1, JSON.stringify(value, null, 4));
    });
    let result = "";
    for (let i = 0; i < dedented.length; i++) {
        result += dedented[i];
        if (i < indentedValues.length) {
            result += indentedValues[i];
        }
    }
    return result;
};
