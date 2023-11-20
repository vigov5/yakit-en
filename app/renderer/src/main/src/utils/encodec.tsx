import React from "react";
import {showModal} from "./showModal";
import {Button, Space} from "antd";
import {IMonacoActionDescriptor, IMonacoCodeEditor, YakEditor} from "./editors";
import {monacoEditorClear, monacoEditorReplace, monacoEditorWrite} from "../pages/fuzzer/fuzzerTemplates";
import {failed} from "./notification";
import {AutoCard} from "../components/AutoCard";
import {Buffer} from "buffer";
import i18next from "../i18n"

export type CodecType = |
    "fuzz" | "md5" | "sha1" | "sha256" | "sha512"
    | "base64" | "base64-decode" | "htmlencode" | "htmldecode" | "htmlescape"
    | "urlencode" | "urlunescape" | "double-urlencode" | "double-urldecode"
    | "hex-encode" | "hex-decode" | "packet-to-curl" | any;

const {ipcRenderer} = window.require("electron");

const editorCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || "";
            execCodec(typeStr, text, false, e)
        } catch (e) {
            failed("editor exec codec failed")
        }
    }
}

const editorFullCodecHandlerFactory = (typeStr: CodecType) => {
    return (e: IMonacoCodeEditor) => {
        try {
            // @ts-ignore
            const text = e.getModel()?.getValueInRange(e.getSelection()) || "";
            if (!!text) {
                execCodec(typeStr, text, false, e)
            } else {
                const model = e.getModel();
                const fullText = model?.getValue();
                execCodec(typeStr, fullText || "", false, e, true)
            }
        } catch (e) {
            failed("editor exec codec failed")
            console.error(e)
        }
    }
}

export interface MutateHTTPRequestParams {
    Request: Uint8Array
    FuzzMethods: string[]
    ChunkEncode: boolean
    UploadEncode: boolean
}

export interface MutateHTTPRequestResponse {
    Result: Uint8Array
    ExtraResults: Uint8Array[]
}

export const mutateRequest = (params: MutateHTTPRequestParams, editor?: IMonacoCodeEditor) => {
    ipcRenderer.invoke("HTTPRequestMutate", params).then((result: MutateHTTPRequestResponse) => {
        if (editor) {
            monacoEditorClear(editor)
            monacoEditorReplace(editor, new Buffer(result.Result).toString("utf8"));
            return
        }
    })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
    return (e: IMonacoCodeEditor) => {
        try {
            const model = e.getModel();
            const fullText = model?.getValue();
            mutateRequest({...params, Request: new Buffer(fullText || "")}, e)
        } catch (e) {
            failed(`mutate request failed: ${e}`)
        }
    }
}

export interface MonacoEditorActions extends IMonacoActionDescriptor {
    id: CodecType | string,
    label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
    keybindings?: any[]
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
    {id: "urlencode", label: i18next.t("URL 编码")},
    {id: "urlescape", label: i18next.t("URL 编码(只编码特殊字符)")},
    {id: "base64", label: i18next.t("Base64 编码")},
    {id: "base64-decode", label: i18next.t("Base64 解码")},
    {id: "htmlencode", label: i18next.t("HTML 编码")},
    {id: "htmldecode", label: i18next.t("HTML 解码")},
    {id: "urlunescape", label: i18next.t("URL 解码")},
    {id: "double-urlencode", label: i18next.t("双重 URL 编码")},
    {id: "unicode-decode", label: "Unicode 解码（\\uXXXX 解码）"},
    {id: "unicode-encode", label: "Unicode 编码（\\uXXXX 编码）"},
    {id: "base64-url-encode", label: i18next.t("先 Base64 后 URL 编码")},
    {id: "url-base64-decode", label: i18next.t("先 URL 后 Base64 解码")},
    {id: "hex-decode", label: i18next.t("HEX 解码（十六进制解码）")},
    {id: "hex-encode", label: i18next.t("HEX 编码（十六进制编码）")},
    {id: "jwt-parse-weak", label: i18next.t("JWT 解析（同时测试弱 Key）")},
].map(i => {
    return {id: i.id, label: i.label, contextMenuGroupId: "codec", run: editorCodecHandlerFactory(i.id as CodecType)}
});

export const MonacoEditorMutateHTTPRequestActions: {
    id: CodecType | string, label: string,
    contextMenuGroupId: "codec" | string,
    run: (editor: IMonacoCodeEditor) => any
}[] = [
    {
        id: "mutate-http-method-get",
        label: i18next.t("改变 HTTP 方法成 GET"),
        params: {FuzzMethods: ["GET"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-post",
        label: i18next.t("改变 HTTP 方法成 POST"),
        params: {FuzzMethods: ["POST"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-http-method-head",
        label: i18next.t("改变 HTTP 方法成 HEAD"),
        params: {FuzzMethods: ["HEAD"]} as MutateHTTPRequestParams
    },
    {
        id: "mutate-chunked",
        label: i18next.t("HTTP Chunk 编码"),
        params: {ChunkEncode: true} as MutateHTTPRequestParams
    },
    {
        id: "mutate-upload",
        label: i18next.t("修改为上传数据包"),
        params: {UploadEncode: true} as MutateHTTPRequestParams
    },
].map(i => {
    return {
        id: i.id,
        label: i.label,
        contextMenuGroupId: "mutate-http-request",
        run: editorMutateHTTPRequestHandlerFactory(i.params)
    }
})

export interface AutoDecodeResult {
    Type: string
    TypeVerbose: string
    Origin: Uint8Array
    Result: Uint8Array
}

export const execAutoDecode = async (text: string) => {
    return ipcRenderer.invoke("AutoDecode", {Data: text}).then((e: { Results: AutoDecodeResult[] }) => {
        showModal({
            title: i18next.t("自动解码（智能解码）"),
            width: "60%",
            content: (
                <Space style={{width: "100%"}} direction={"vertical"}>
                    {e.Results.map((i, index) => {
                        return <AutoCard
                            title={i18next.t("解码步骤[${index + 1}]: ${i.TypeVerbose}(${i.Type})", {v1: index + 1, v2: i.TypeVerbose, v3: i.Type})} size={"small"}
                            extra={<Button
                                size={"small"}
                                onClick={() => {
                                    showModal({
                                        title: i18next.t("原文"), width: "50%", content: (
                                            <div style={{height: 280}}>
                                                <YakEditor
                                                    type={"html"}
                                                    noMiniMap={true}
                                                    readOnly={true}
                                                    value={new Buffer(i.Origin).toString("utf8")}
                                                />
                                            </div>
                                        )
                                    })
                                }}
                            >{i18next.t("查看本次编码原文")}</Button>}
                        >
                            <div style={{height: 120}}>
                                <YakEditor
                                    noMiniMap={true}
                                    type={"html"} readOnly={true} value={new Buffer(i.Result).toString("utf8")}
                                />
                            </div>
                        </AutoCard>
                    })}
                </Space>
            )
        })
    }).catch(e => {
        failed(i18next.t("自动解码失败：${e}", { v1: e }))
    })
}

export const execCodec = async (typeStr: CodecType, text: string, noPrompt?: boolean, replaceEditor?: IMonacoCodeEditor, clear?: boolean, extraParams?: {
    Key: string,
    Value: string
}[]) => {
    return ipcRenderer.invoke("Codec", {Text: text, Type: typeStr, Params: extraParams}).then((result: {
        Result: string
    }) => {
        if (replaceEditor) {
            let m = showModal({
                width: "50%",
                content: (
                    <AutoCard title={i18next.t("编码结果")} bordered={false} extra={<Button type={"primary"} onClick={() => {
                        if (clear) {
                            monacoEditorClear(replaceEditor)
                            replaceEditor.getModel()?.setValue(result.Result)
                        } else {
                            monacoEditorWrite(replaceEditor, result.Result)
                        }
                        m.destroy()
                    }} size={"small"}>{i18next.t("替换内容")}
                    </Button>} size={"small"}>
                        <div style={{width: "100%", height: 300}}>
                            <YakEditor
                                type={"http"}
                                readOnly={true} value={result.Result}
                            />
                        </div>
                    </AutoCard>
                )
            })

        }

        if (noPrompt) {
            showModal({
                title: i18next.t("编码结果"),
                width: "50%",
                content: <div style={{width: "100%"}}>
                    <Space style={{width: "100%"}} direction={"vertical"}>
                        <div style={{height: 300}}>
                            <YakEditor
                                fontSize={20} type={"html"}
                                readOnly={true} value={result.Result}
                            />
                        </div>
                    </Space>
                </div>
            })
        }
        return result?.Result || ""
    }).catch((e: any) => {
        failed(i18next.t("CODEC[${typeStr}] 执行失败：${e}", { v1: typeStr, v2: e }))
    })
}

