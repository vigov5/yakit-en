import { OtherMenuListProps, YakitEditorKeyCode, YakitIMonacoEditor } from "./YakitEditorType"
import { EditorMenuItemType } from "./EditorMenu"
import { Space } from "antd"
import { showModal } from "@/utils/showModal"
import { AutoCard } from "../../AutoCard"
import { YakitEditor } from "./YakitEditor"
import { YakitButton } from "../YakitButton/YakitButton"
import { monacoEditorClear, monacoEditorWrite } from "@/pages/fuzzer/fuzzerTemplates"
import { failed } from "@/utils/notification"
import { fetchCursorContent, fetchSelectionRange } from "./editorUtils"
import i18next from "../../../i18n"

const { ipcRenderer } = window.require("electron")

/** @name 基础菜单组配置信息 */
export const baseMenuLists: OtherMenuListProps = {
    fontSize: {
        menu: [
            {
                key: "font-size",
                label: i18next.t("字体大小"),
                children: [
                    { key: "font-size-small", label: i18next.t("小") },
                    { key: "font-size-middle", label: i18next.t("中") },
                    { key: "font-size-large", label: i18next.t("大") }
                ]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => { }
    },
    cut: {
        menu: [{ key: "cut", label: i18next.t("剪切") }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (editor?.executeEdits) {
                /** 获取需要剪切的范围 */
                const position = fetchSelectionRange(editor, true)
                if (!position) return
                /** 获取需要剪切的内容 */
                const content = fetchCursorContent(editor, true)

                const flag = editor.executeEdits("", [
                    {
                        range: position,
                        text: "",
                        forceMoveMarkers: true
                    }
                ])
                if (flag) {
                    ipcRenderer.invoke("set-copy-clipboard", `${content}`)
                    editor.focus()
                }
            }
            return
        }
    },
    copy: {
        menu: [{ key: "copy", label: i18next.t("复制") }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (editor) ipcRenderer.invoke("set-copy-clipboard", `${fetchCursorContent(editor, true)}`)
            return
        }
    },
    paste: {
        menu: [{ key: "paste", label: i18next.t("粘贴") }],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            if (!editor) return

            /** 获取需要粘贴的范围 */
            const position = fetchSelectionRange(editor, false)
            if (!position) return

            ipcRenderer
                .invoke("get-copy-clipboard")
                .then((str: string) => {
                    if (editor?.executeEdits) {
                        editor.executeEdits("", [
                            {
                                range: position,
                                text: str || "",
                                forceMoveMarkers: true
                            }
                        ])
                        editor.focus()
                    }
                })
                .catch(() => { })

            return
        }
    }
}

interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

/** @name 编码模块子菜单 */
const codeSubmenu: { key: string; label: string }[] = [
    { key: "double-urlencode", label: i18next.t("双重 URL 编码") },
    { key: "base64-url-encode", label: i18next.t("先 Base64 后 URL 编码") },
    { key: "base64", label: i18next.t("Base64 编码") },
    { key: "hex-encode", label: i18next.t("HEX 编码（十六进制编码）") },
    { key: "htmlencode", label: i18next.t("HTML 编码") },
    { key: "unicode-encode", label: "Unicode 编码（\\uXXXX 编码）" },
    { key: "urlencode", label: i18next.t("URL 编码") },
    { key: "urlescape", label: i18next.t("URL 编码(只编码特殊字符)") }
]
/** @name 解码模块子菜单 */
const decodeSubmenu: { key: string; label: string }[] = [
    { key: "url-base64-decode", label: i18next.t("先 URL 后 Base64 解码") },
    { key: "base64-decode", label: i18next.t("Base64 解码") },
    { key: "hex-decode", label: i18next.t("HEX 解码（十六进制解码）") },
    { key: "htmldecode", label: i18next.t("HTML 解码") },
    { key: "jwt-parse-weak", label: i18next.t("JWT 解析（同时测试弱 Key）") },
    { key: "unicode-decode", label: i18next.t("Unicode 解码（\\uXXXX 解码）") },
    { key: "urlunescape", label: i18next.t("URL 解码") }
]
/** @name 自定义HTTP数据包变形模块子菜单 */
/** @name HTTP数据包变形模块子菜单 */
const httpSubmenu: {
    key: string
    label: string
    params?: MutateHTTPRequestParams
    keybindings?: YakitEditorKeyCode[]
}[] = [
        {
            key: "mutate-http-method-get",
            label: i18next.t("改变 HTTP 方法成 GET"),
            params: { FuzzMethods: ["GET"] } as MutateHTTPRequestParams,
            keybindings: [
                process.platform === "darwin" ? YakitEditorKeyCode.Meta : YakitEditorKeyCode.Control,
                YakitEditorKeyCode.Shift,
                YakitEditorKeyCode.KEY_H
            ]
        },
        {
            key: "mutate-http-method-post",
            label: i18next.t("改变 HTTP 方法成 POST"),
            params: { FuzzMethods: ["POST"] } as MutateHTTPRequestParams
        },
        {
            key: "mutate-http-method-head",
            label: i18next.t("改变 HTTP 方法成 HEAD"),
            params: { FuzzMethods: ["HEAD"] } as MutateHTTPRequestParams
        },
        { key: "mutate-chunked", label: i18next.t("HTTP Chunk 编码"), params: { ChunkEncode: true } as MutateHTTPRequestParams },
        { key: "mutate-upload", label: i18next.t("修改为上传数据包"), params: { UploadEncode: true } as MutateHTTPRequestParams }
    ]
/** @name 内置菜单组配置信息 */

export const extraMenuLists: OtherMenuListProps = {
    code: {
        menu: [
            {
                key: "code",
                label: i18next.t("编码"),
                children: [...codeSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                execCodec(key, text, false, editor)
            } catch (e) {
                failed(`editor exec code failed ${e}`)
            }
        }
    },
    decode: {
        menu: [
            {
                key: "decode",
                label: i18next.t("解码"),
                children: [...decodeSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                // @ts-ignore
                const text = editor.getModel()?.getValueInRange(editor.getSelection()) || ""
                execCodec(key, text, false, editor)
            } catch (e) {
                failed(`editor exec decode failed ${e}`)
            }
        }
    },
    http: {
        menu: [
            {
                key: "http",
                label: i18next.t("HTTP数据包变形"),
                children: [...httpSubmenu] as any as EditorMenuItemType[]
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            const params = httpSubmenu.filter((item) => item.key === key)[0]?.params || ({} as MutateHTTPRequestParams)

            try {
                const model = editor.getModel()
                const fullText = model?.getValue()
                mutateRequest({ ...params, Request: new Buffer(fullText || "") }, editor)
            } catch (e) {
                failed(`mutate request failed: ${e}`)
            }
        }
    },
    customhttp: {
        menu: [
            {
                key: "customhttp",
                label: i18next.t("自定义HTTP数据包变形"),
                //  generate from YakitEditor.tsx
                children: [],
            }
        ],
        onRun: (editor: YakitIMonacoEditor, key: string) => {
            try {
                customMutateRequest(key, editor.getModel()?.getValue(), editor)
            } catch (e) {
                failed(`custom mutate request failed: ${e}`)
            }
        }
    }
}




/** @name codec模块和JSON美化模块处理函数 */
const execCodec = async (
    typeStr: string,
    text: string,
    noPrompt?: boolean,
    replaceEditor?: YakitIMonacoEditor,
    clear?: boolean
) => {
    return ipcRenderer
        .invoke("Codec", { Text: text, Type: typeStr })
        .then((result: { Result: string }) => {
            if (replaceEditor) {
                let m = showModal({
                    width: "50%",
                    content: (
                        <AutoCard
                            title={i18next.t("编码结果")}
                            bordered={false}
                            extra={
                                <YakitButton
                                    type={"primary"}
                                    onClick={() => {
                                        if (clear) {
                                            monacoEditorClear(replaceEditor)
                                            replaceEditor.getModel()?.setValue(result.Result)
                                        } else {
                                            monacoEditorWrite(replaceEditor, result.Result)
                                        }
                                        m.destroy()
                                    }}
                                >{i18next.t("替换内容")}
                                </YakitButton>
                            }
                            size={"small"}
                        >
                            <div style={{ width: "100%", height: 300 }}>
                                <YakitEditor type={"http"} readOnly={true} value={result.Result} />
                            </div>
                        </AutoCard>
                    )
                })
            }

            if (noPrompt) {
                showModal({
                    title: i18next.t("编码结果"),
                    width: "50%",
                    content: (
                        <div style={{ width: "100%" }}>
                            <Space style={{ width: "100%" }} direction={"vertical"}>
                                <div style={{ height: 300 }}>
                                    <YakitEditor fontSize={20} type={"html"} readOnly={true} value={result.Result} />
                                </div>
                            </Space>
                        </div>
                    )
                })
            }
        })
        .catch((e: any) => { })
}

interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}
/** @name HTTP数据包变形模块处理函数 */
const mutateRequest = (params: MutateHTTPRequestParams, editor?: YakitIMonacoEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {
           
            // monacoEditorClear(editor)
            // monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"))
            monacoEditorWrite(editor, new Buffer(result.Result).toString("utf8"), editor.getModel()?.getFullModelRange())
            return
        }
    })
}
/** @name 自定义HTTP数据包变形模块处理函数 */
const customMutateRequest = (key: string, text?: string, editor?: YakitIMonacoEditor) => {
    if (editor) {
        ipcRenderer
            .invoke("Codec", { Type: key, Text: text, Params: [], ScriptName: key })
            .then((res) => {
                monacoEditorWrite(editor, new Buffer(res?.Result || "").toString("utf8"), editor.getModel()?.getFullModelRange())
            })
            .catch((err) => {
                if (err) throw err;
            })
    }
}