import { monaco } from "react-monaco-editor";
import { newYaklangCompletionHandlerProvider, yaklangCompletionHandlerProvider, getCompletions, getGlobalCompletions, Range, SuggestionDescription, YaklangLanguageSuggestionRequest, YaklangLanguageSuggestionResponse, getWordWithPointAtPosition } from "./yakCompletionSchema";
import { languages } from "monaco-editor";
import CodeAction = languages.CodeAction;
import CodeActionList = languages.CodeActionList;

export const YaklangMonacoSpec = "yak";
// export const GolangMonacoSpec = "go";

export const YAK_FORMATTER_COMMAND_ID = "yak-formatter";

const { ipcRenderer } = window.require("electron");
const { CompletionItemKind } = monaco.languages;
var modelToEditorMap = new Map<monaco.editor.ITextModel, monaco.editor.ICodeEditor>();

monaco.languages.register({
    id: YaklangMonacoSpec,
    extensions: [".yak"],
    aliases: ['Yak'],
});




interface YaklangInformationKV {
    Key: string
    Value: Uint8Array
    Extern: YaklangInformationKV[]
}
interface YaklangInformation {
    Name: string
    Data: YaklangInformationKV[]
}

interface YaklangInspectInformationRequest {
    YakScriptType: "yak" | "mitm" | "port-scan" | "codec"
    YakScriptCode: string
    Range: Range
}

interface YaklangInspectInformationResponse {
    Information: YaklangInformation[]
}



export const setUpYaklangMonaco = () => {
    monaco.languages.setLanguageConfiguration(YaklangMonacoSpec, {
        autoClosingPairs: [
            { "open": "{{", "close": "}}" },
            { "open": "{", "close": "}", "notIn": ["string"] },
            { "open": "[", "close": "]" },
            { "open": "(", "close": ")" },
            { "open": "'", "close": "'", "notIn": ["string", "comment"] },
            { "open": "\"", "close": "\"", "notIn": ["string"] },
            { "open": "`", "close": "`", "notIn": ["string", "comment"] },
            { "open": "/**", "close": " */", "notIn": ["string"] }
        ],
        "comments": {
            "lineComment": "//",
            "blockComment": ["/*", "*/"]
        },
        "autoCloseBefore": ";:.,=}])>` \n\t",

        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ],
        wordPattern: new RegExp("(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)"),
        indentationRules: {
            "increaseIndentPattern": new RegExp("^((?!.*?\\/\\*).*\\*\/)?\\s*[\\}\\]].*$"),
            "decreaseIndentPattern": new RegExp("^((?!\\/\\/).)*(\\{[^}\"'`]*|\\([^)\"'`]*|\\[[^\\]\"'`]*)$"),
        }
    })
    monaco.languages.setMonarchTokensProvider(YaklangMonacoSpec, {
        brackets: [
            { "open": "{{", "close": "}}", token: "double-braces" },
            { "open": "{", "close": "}", token: "braces" },
            { "open": "[", "close": "]", token: "brackets" },
            { "open": "(", "close": ")", token: "parentheses" },
            // {"open": "'", "close": "'", token: "single-quote"},
            // {"open": "\"", "close": "\"", token: "quote"},
            // {"open": "`", "close": "`", token: "backticks"},
            { "open": "/**", "close": " */", token: "comment" }
        ],
        defaultToken: "",
        tokenPostfix: ".yak",
        keywords: [
            "break", "case", "continue", "default", "defer", "else",
            "for", "go", "if", "range", "return", "select", "switch",
            "chan", "func", "fn", "def", "var", "nil", "undefined",
            "map", "class", "include", "type", "bool", "true", "false",
            "string", "try", "catch", "finally", "in"
        ],
        operators: [
            '+',
            '-',
            '*',
            '/',
            '%',
            '&',
            '|',
            '^',
            '<<',
            '>>',
            '&^',
            '+=',
            '-=',
            '*=',
            '/=',
            '%=',
            '&=',
            '|=',
            '^=',
            '<<=',
            '>>=',
            '&^=',
            '&&',
            '||',
            '<-',
            '++',
            '--',
            '==',
            '<',
            '>',
            '=',
            '!',
            '!=',
            '<=',
            '>=',
            ':=',
            '...',
            '(',
            ')',
            '',
            ']',
            '{',
            '}',
            ',',
            ';',
            '.',
            ':'
        ],
        libnames: getCompletions().libNames,
        libFuncNames: getCompletions().libCompletions.reduce((acc, cur) => {
            cur.functions.forEach(func => {
                const funcName = func.functionName.split("(")[0];
                acc.push(`${cur.libName}.${funcName}`);
            })
            return acc;
        }, [] as Array<string>),
        globals: getGlobalCompletions().reduce((acc, cur) => {
            const match = /(^\w+)\(.*\)/.exec(cur.insertText)
            if (match?.length === 2) {
                acc.push(match[1].toString());
            }
            return acc;
        }, [] as Array<string>),
        digits: /\d+(_+\d+)*/,
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        tokenizer: {
            root: [
                // identifiers and keywords
                [/_(?!\w)/, 'keyword.$0'],
                [
                    /([a-zA-Z_]\w+)(\.)([a-zA-Z_]\w+)/,
                    {
                        cases: {
                            '@libFuncNames': ['type.identifier', 'delimiter', 'libFunction'],
                            '@default': 'identifier'
                        }
                    },
                ],
                [
                    /[a-zA-Z_]\w*/,
                    {
                        cases: {
                            '@keywords': { token: 'keyword.$0' },
                            '@libnames': 'type.identifier',
                            '@globals': 'globals',
                            '@default': 'identifier'
                        }
                    },
                ],




                // whitespace
                { include: '@whitespace' },

                // [[ attributes ]].
                [/\[\[.*\]\]/, 'annotation'],

                // Preprocessor directive
                [/^\s*#\w+/, 'keyword'],

                // delimiters and operators
                [/[{}()\[\]]/, '@brackets'],
                // [/[<>](?!@symbols)/, '@brackets'],
                [
                    /@symbols/,
                    {
                        cases: {
                            '@operators': 'operator',
                            '@default': ''
                        }
                    }
                ],

                // numbers
                [/\d*\d+[eE]([\-+]?\d+)?/, 'number.float'],
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F']*[0-9a-fA-F]/, 'number.hex'],
                [/0[0-7']*[0-7]/, 'number.octal'],
                [/0[bB][0-1']*[0-1]/, 'number.binary'],
                [/\d[\d']*/, 'number'],
                [/\d/, 'number'],

                // delimiter: after number because of .\d floats
                [/[;,.]/, 'delimiter'],

                // characters
                [/'[^\\']'/, 'string'],
                [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],

                // strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                [/"/, 'string.quoted.double.js', '@string'],
                [/'/, 'string.quoted.single.js', '@string2'],
                [/`/, 'string', '@rawstring'],
                [/'/, 'string.invalid'],
            ],


            whitespace: [
                [/[ \t\r\n]+/, ''],
                [/\/\*\*(?!\/)/, 'comment.doc', '@doccomment'],
                [/\/\*/, 'comment', '@comment'],
                [/\/\/.*$/, 'comment'],
                [/#.*$/, 'comment']
            ],

            comment: [
                [/[^\/*]+/, 'comment'],
                // [/\/\*/, 'comment', '@push' ],    // nested comment not allowed :-(
                // [/\/\*/,    'comment.invalid' ],    // this breaks block comments in the shape of /* //*/
                [/\*\//, 'comment', '@pop'],
                [/[\/*]/, 'comment'],
                [/#/, "comment"],
            ],
            //Identical copy of comment above, except for the addition of .doc
            doccomment: [
                [/[^\/*]+/, 'comment.doc'],
                // [/\/\*/, 'comment.doc', '@push' ],    // nested comment not allowed :-(
                [/\/\*/, 'comment.doc.invalid'],
                [/\*\//, 'comment.doc', '@pop'],
                [/[\/*]/, 'comment.doc']
            ],

            string: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop']
            ],

            string2: [
                [/[^\\']/, 'string'],
                [/@escapes/, 'string.escape'],
                [/'/, 'string', '@pop']
            ],

            rawstring: [
                [/[^`]/, 'string'],
                [/`/, 'string', '@pop']
            ],


        }
    })

}

monaco.languages.registerCompletionItemProvider(YaklangMonacoSpec, {
    provideCompletionItems: (editor, position, context, token) => {
        return new Promise(async (resolve, reject) => {
            await newYaklangCompletionHandlerProvider(editor, position, context, token as any).then((data) => {
                if (data.suggestions.length > 0) {
                    let items = data.suggestions;
                    for (const item of items) {
                        if (item.kind === CompletionItemKind.Method || item.kind === CompletionItemKind.Function) {
                            item.command = { title: 'triggerParameterHints', id: 'editor.action.triggerParameterHints' };
                        }
                    }
                    resolve({
                        suggestions: items,
                        incomplete: data.incomplete,
                    })
                } else {
                    resolve({ suggestions: [] })
                }
            })
        })
    },
    triggerCharacters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.']
});

monaco.editor.onDidCreateEditor((editor) => {
    editor.onDidChangeModel((e) => {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        modelToEditorMap.set(model, editor);
    })
})

monaco.languages.registerSignatureHelpProvider(YaklangMonacoSpec, {
    provideSignatureHelp: (model, position, token, context) => {
        
        return new Promise(async (resolve, reject) => {
            let newPosition = new monaco.Position(position.lineNumber, position.column - 1)
            const editor = modelToEditorMap.get(model);
            if (editor) { // 修复在补全后的函数签名提示问题
                const selection = editor.getSelection();
                if (selection) {
                    const selectionLastChar = model.getValueInRange({startLineNumber: selection.startLineNumber, startColumn: selection.startColumn-1, endLineNumber: selection.endLineNumber, endColumn: selection.startColumn});
                    if (selectionLastChar === "(") {
                        newPosition = new monaco.Position(selection.startLineNumber, selection.startColumn-1);
                    }
                }
            }
            const iWord = getWordWithPointAtPosition(model, newPosition);
            let doc = "";
            let decl = "";

            await ipcRenderer.invoke("YaklangLanguageSuggestion", {
                InspectType: "signature",
                YakScriptType: "yak",
                YakScriptCode: model.getValue(),
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
                if (r.SuggestionMessage.length > 0) {
                    r.SuggestionMessage.forEach(v => {
                        decl += v.Label ?? "" + "\n";
                        doc += v.Description ?? "" + "\n";
                    })
                    doc = doc.trim();
                    decl = decl.trim();
                    if (decl.length === 0) {
                        resolve(null);
                        return
                    }
                    resolve({
                        value: {
                            signatures: [
                                {
                                    label: decl,
                                    parameters: [],
                                    documentation: { value: doc, isTrusted: true },
                                }
                            ],
                            activeSignature: 0,
                            activeParameter: 0
                        },
                        dispose: () => { },
                    });
                    return
                }
            })
        })
    },
    signatureHelpTriggerCharacters: ['(']
})

monaco.languages.registerHoverProvider(YaklangMonacoSpec, {
    provideHover: function (model: monaco.editor.ITextModel, position: monaco.Position, cancellationToken: monaco.CancellationToken): languages.ProviderResult<languages.Hover> {
        return new Promise(async (resolve, reject) => {
            const iWord = getWordWithPointAtPosition(model, position);
            let desc = "";
            await ipcRenderer.invoke("YaklangLanguageSuggestion", {
                InspectType: "hover",
                YakScriptType: "yak",
                YakScriptCode: model.getValue(),
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
                if (r.SuggestionMessage.length > 0) {
                    r.SuggestionMessage.forEach(v => {
                        desc += v.Label ?? "" + "\n";
                    })
                    resolve({
                        range: new monaco.Range(position.lineNumber, iWord.startColumn, position.lineNumber, iWord.endColumn),
                        contents: [
                            {
                                value: desc,
                                isTrusted: true
                            },
                        ],
                    });
                    return
                }
            })


            resolve(null);
        })


    }
})

// monaco.languages.registerCodeActionProvider(YaklangMonacoSpec, {
//     provideCodeActions: (model, range, context, token) => {
//         console.info("code action: RANGE - ", range)
//         console.info("code action: CONTEXT - ", context)
//         return {
//             actions: [{title: "Hello World!"}],
//             dispose: () => {
//                 console.info("dispose called")
//             }
//         } as CodeActionList;
//     }
// })

// monaco.languages.registerCodeLensProvider(YaklangMonacoSpec, {
//     provideCodeLenses: (model, token) => {
//         return {
//             lenses: [
//                 {
//                     range: {
//                         startLineNumber: 1,
//                         startColumn: 1,
//                         endLineNumber: 2,
//                         endColumn: 1,
//                     },
//                     id: "代码格式化",
//                     command: {
//                         title: "Yak 代码格式化",
//                         id: YAK_FORMATTER_COMMAND_ID,
//                     }
//                 }
//             ],
//             dispose(): void {
//             }
//         }
//     }
// })