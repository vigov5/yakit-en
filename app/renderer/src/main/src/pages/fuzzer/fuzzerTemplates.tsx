import React, {useEffect, useState} from "react"
import {IMonacoCodeEditor, IMonacoEditor} from "../../utils/editors"
import {InputInteger, InputItem} from "../../utils/inputUtil"
import {RandInt, RandStrWithLen, RandStrWithMax, RandStrWIthRepeat} from "./templates/Rand"
import {FuzzWithRange, RangeChar} from "./templates/Range"
import {EncodeTag, SingleTag} from "./templates/SingleTag"
import {editor, IRange, ISelection} from "monaco-editor"
import "./style.css"
import {Form} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import i18next from "../../i18n"

export const fuzzerTemplates = [
    {
        name: i18next.t("GET 请求"),
        template: `GET / HTTP/1.1
Host: www.example.com

`
    },
    {
        name: i18next.t("POST 请求"),
        template: `POST / HTTP/1.1
Host: www.example.com`
    },
    {
        name: i18next.t("POST Json 请求"),
        template: `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`
    },
    {name: i18next.t("无"), template: ""}
]

export interface FuzzOperatorItem {
    name: string
    tag?: string
    callback?: (editor: IMonacoEditor) => any
    params?: []
    optionsRender: (s: string, callback: (s: string) => any) => any
}

export interface FuzzOperatorParam {
    key: string
    defaultValue?: string
    optional?: string
}

export const monacoEditorWrite = (editor: IMonacoEditor | IMonacoCodeEditor, text: string, range?: IRange | null) => {
    if (editor) {
        if (range) {
            editor.executeEdits(editor.getValue(), [{range: range, text: text}])
            return
        }

        const selection = editor.getSelection()
        if (selection) {
            editor.executeEdits(editor.getValue(), [{range: selection, text: text}])
        }
    }
}

export const monacoEditorReplace = (editor: IMonacoEditor | IMonacoCodeEditor, text: string) => {
    if (editor) editor.setValue(text)
}

export const monacoEditorClear = (editor?: IMonacoEditor | IMonacoCodeEditor) => {
    if (editor) {
        editor.getModel()?.setValue("")
    }
}

const highlightRanges: any[] = []

export const monacoEditorRemoveAllHighlight = (editor?: IMonacoEditor) => {
    if (editor && highlightRanges.length > 0) {
        editor.deltaDecorations(
            [],
            highlightRanges.map((i) => {
                return {range: i, options: {inlineClassName: undefined}} as any
            })
        )
    }
}

export const fuzzOperators: FuzzOperatorItem[] = [
    {
        name: i18next.t("生成一个字符"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{char(a-z)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={i18next.t("生成一个字符，例如 {{char(a-z)}}，使用 - 作为分割，解析前后 char 并生成此间范围")}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"char"}
                    defaultInput={"a-z"}
                    label={i18next.t("字符范围")}
                    enableInput={true}
                    exampleInput={"{{char(a-z)}}"}
                />
            )
        }
    },
    {
        name: i18next.t("重复一个空字符串"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{repeat(10)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={i18next.t("控制重复执行次数的 Tag，一般 {{repeat(10)}} 指的是整体重复生成 10 次数据")}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"repeat"}
                    defaultInput={"10"}
                    label={i18next.t("重复次数")}
                    enableInput={true}
                    exampleInput={i18next.t("例如：{{repeat(10)}}")}
                />
            )
        }
    },
    {
        name: i18next.t("重复生成字符串"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{repeatstr(abc|3)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    help={i18next.t("控制重复渲染一定次数的数据，以 |n 来输入次数，一般 {{repeatstr(abc|3)}} 渲染为 abcabcabc")}
                    origin={origin}
                    setOrigin={setOrigin}
                    tag={"repeatstr"}
                    defaultInput={"abc|3"}
                    label={i18next.t("重复次数")}
                    enableInput={true}
                    exampleInput={i18next.t("例如：{{repeatstr(abc|3)}} -> abcabcabc")}
                />
            )
        }
    },
    {
        name: i18next.t("构造数组（列表）"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{list(1|2|3)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <SingleTag
                    origin={origin}
                    setOrigin={setOrigin}
                    enableInput={true}
                    help={i18next.t("把数据进行切割，并把切割后的数据渲染进 payload，默认使用 | 分割")}
                    tag={"list"}
                    defaultInput={"1|2|3"}
                    label={i18next.t("切割字符串（也可以用于组合 fuzztag）")}
                    exampleInput={i18next.t("例如：{{list(1|2|3)}} 解析为 [1,2,3]")}
                />
            )
        }
    },
    {
        name: i18next.t("随机字符串(固定长度)"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithLen setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: i18next.t("随机字符串(指定长度)"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithMax setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: i18next.t("随机字符串(多次渲染)"),
        callback: (editor) => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        },
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWIthRepeat setOrigin={setOrigin} origin={origin} />
        }
    },
    {
        name: i18next.t("整数(自由范围) - 也可用于端口"),
        callback: (editor) => {},
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return (
                <Form.Item label={i18next.t("输入范围")}>
                    <YakitInput
                        onChange={(v) => {
                            setOrigin(`{{int(${v.target.value})}}`)
                        }}
                    />
                </Form.Item>
            )
        }
    },
    {
        name: i18next.t("随机整数(范围)"),
        callback: (editor) => {},
        optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandInt {...{origin, setOrigin}} />
        }
    },
    {
        name: i18next.t("IP/IP段/网络/域名(多个，逗号分隔)"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => (
            <FuzzWithRange
                label={i18next.t("IP/网段/域名组")}
                origin={origin}
                setOrigin={setOrigin}
                tag={"network"}
                help={i18next.t("一般用于拆开扫描目标，例如: 192.168.0.1/24,example.com,10.1.11.1")}
            />
        )
    },
    {
        name: i18next.t("生成 .ico 文件头"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={i18next.t("生成一个 .ico 文件的文件头，一般用于上传文件")} tag={"ico"} />
            )
        },
        tag: "ico"
    },
    {
        name: i18next.t("生成 .png 文件头"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={i18next.t("生成一个 .png 文件的文件头，一般用于上传文件")} tag={"png"} />
            )
        },
        tag: "png"
    },
    {
        name: i18next.t("生成 .gif 文件头"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag {...{origin, setOrigin}} help={i18next.t("生成一个 .gif 文件的文件头，一般用于上传文件")} tag={"gif"} />
            )
        },
        tag: "gif"
    },
    {
        name: i18next.t("生成 .tiff 文件头"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={i18next.t("生成一个 .tiff 文件的文件头，一般用于上传文件")}
                    tag={"tiff"}
                />
            )
        },
        tag: "tiff"
    },
    {
        name: i18next.t("生成 .jpeg(jpg) 文件头"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={i18next.t("生成一个 .jpeg/jpg 文件的文件头，一般用于上传文件")}
                    tag={"jpegstart"}
                />
            )
        },
        tag: "jpegstart"
    },
    {
        name: i18next.t("生成 .jpeg(jpg) 文件尾"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return (
                <SingleTag
                    {...{origin, setOrigin}}
                    help={i18next.t("生成一个 .jpeg/jpg 文件的文件尾，一般用于上传文件")}
                    tag={"jpegend"}
                />
            )
        },
        tag: "jpegend"
    },
    {
        name: i18next.t("任意字符（ASCII码范围）"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return <RangeChar {...{origin, setOrigin}} />
        }
    },
    {
        name: i18next.t("生成所有特殊字符"),
        callback: (editor) => {},
        optionsRender: (origin, setOrigin) => {
            return <SingleTag {...{origin, setOrigin}} help={i18next.t("生成所有特殊字符，一般用于模糊测试")} tag={"punc"} />
        },
        tag: "punc"
    }
]

export const encodeOperators: FuzzOperatorItem[] = [
    {
        name: i18next.t("全部转大写"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"upper"} help={i18next.t("编码标签内容转大写")} />
        ),
        tag: "upper"
    },
    {
        name: i18next.t("全部转小写"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"lower"} help={i18next.t("编码标签内容转小写")} />
        ),
        tag: "lower"
    },
    {
        name: i18next.t("解析成字符串（例如{{str(\\xA0\\x45)}}）"),
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"str"}
                help={i18next.t('解析成字符串（例如{{str("\xA0\x45")}}），用于转换不可见字符')}
            />
        ),
        tag: "str"
    },
    {
        name: i18next.t("base64编码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64enc"} help={i18next.t("Base64 编码标签内内容")} />
        ),
        tag: "base64enc"
    },
    {
        name: i18next.t("base64解码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64dec"} help={i18next.t("Base64 解码标签内内容")} />
        ),
        tag: "base64dec"
    },
    {
        name: i18next.t("16进制编码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hex"} help={i18next.t("把标签内容变成16进制编码")} />
        ),
        tag: "hex"
    },
    {
        name: i18next.t("16进制解码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hexdec"} help={i18next.t("把标签内容按16进制解码")} />
        ),
        tag: "hexdec"
    },
    {
        name: i18next.t("计算SHA1"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha1"} help={i18next.t("计算标签内容的 Sha1")} />
        ),
        tag: "sha1"
    },
    {
        name: i18next.t("计算SHA256"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha256"} help={i18next.t("计算标签内容的 Sha256")} />
        ),
        tag: "sha256"
    },
    {
        name: i18next.t("计算SHA512"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha512"} help={i18next.t("计算标签内容的 Sha512")} />
        ),
        tag: "sha512"
    },
    {
        name: i18next.t("URL 编码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urlenc"} help={i18next.t("把标签内容变成URL 编码")} />
        ),
        tag: "urlenc"
    },
    {
        name: i18next.t("URL 解码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urldec"} help={i18next.t("把标签内容按URL 解码")} />
        ),
        tag: "urldec"
    },
    {
        name: i18next.t("'双重URL'编码"),
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"doubleurlenc"}
                help={i18next.t("把标签内容变成'双重URL'编码")}
            />
        ),
        tag: "doubleurlenc"
    },
    {
        name: i18next.t("'双重URL'解码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"doubleurldec"} help={i18next.t("把标签内容按'双重URL'解码")} />
        ),
        tag: "doubleurldec"
    },
    {
        name: i18next.t("HTML(&#xxxx;)编码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"html"} help={i18next.t("把标签内容变成HTML(&#xxxx;)编码")} />
        ),
        tag: "html"
    },
    {
        name: i18next.t("HTML(&#xAAAA;)编码 - 16进制"),
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"htmlhex"}
                help={i18next.t("把标签内容变成HTML(&#xAAAA;)编码")}
            />
        ),
        tag: "htmlhex"
    },
    {
        name: i18next.t("HTML(&#xxxx;)解码"),
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"htmldec"} help={i18next.t("把标签内容按HTML(&#xxxx;)解码")} />
        ),
        tag: "htmldec"
    },
    {
        name: i18next.t("'ASCII'编码"),
        tag: "ascii",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"ascii"} help={i18next.t("把标签内容变成'ASCII'编码")} />
        )
    },
    {
        name: i18next.t("'ASCII'解码"),
        tag: "asciidec",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"asciidec"} help={i18next.t("把标签内容按'ASCII'解码")} />
        )
    }
]
