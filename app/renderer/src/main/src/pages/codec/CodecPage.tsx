import React, {useEffect, useState} from "react"
import {
    Button,
    PageHeader,
    Space,
    Dropdown,
    Menu,
    Row,
    Col,
    Tag,
    Divider,
    Typography,
    Alert,
    Popover,
    Input,
    List
} from "antd"
import {DownOutlined, SwapOutlined, ArrowsAltOutlined} from "@ant-design/icons"
import {YakCodeEditor, YakEditor} from "../../utils/editors"
import {failed} from "../../utils/notification"
import {LineConversionIcon} from "../../assets/icons"
import {AutoCard} from "../../components/AutoCard"
import {AutoSpin} from "../../components/AutoSpin"
import {YakExecutorParam} from "../invoker/YakExecutorParams"
import {YakScript} from "../invoker/schema"
import {useMemoizedFn} from "ahooks"
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter"
import {queryYakScriptList} from "../yakitStore/network"

import "./style.css"
import {Uint8ArrayToString} from "../../utils/str"
import { YakParamProps } from "../plugins/pluginsType"
import i18next from "../../i18n"

const {ipcRenderer} = window.require("electron")

export interface CodecType {
    key?: string
    verbose: string
    subTypes?: CodecType[]
    params?: YakParamProps[]
    help?: React.ReactNode
    isYakScript?: boolean
}

const {Text} = Typography

const generateSM4AmpAESParams = () => {
    return [
        {
            Field: "key",
            FieldVerbose: i18next.t("密钥（HEX 编码）"),
            Required: true,
            TypeVerbose: "string",
            Help: i18next.t("HEX(十六进制) 编码后的 KEY")
        },
        {
            Field: "iv",
            FieldVerbose: i18next.t("IV-初始块（HEX 编码）"),
            TypeVerbose: "string",
            Help: i18next.t("十六进制编码后的 IV（初始块）")
        }
    ] as YakParamProps[]
}

const SM4AmpAESEncHelp = () => {
    return (
        <>
            <Text>{i18next.t("加密：任何文本被加密成的")} <Text mark={true}>{i18next.t("结果经过 HEX 编码")}</Text>
            </Text>
            <br />
            <Text>{i18next.t("密钥：")}<Text mark={true}>{i18next.t("被 HEX 编码")}</Text>{i18next.t("的")} <Text mark={true}>{i18next.t("长度为16位")}</Text>{i18next.t(`的字符串 （为兼容 Key
                中不可见字符）`)}
            </Text>
        </>
    )
}

const SM4AmpAESDecHelp = () => {
    return (
        <>
            <Text>{i18next.t("解密：解密的密文需要经过")} <Text mark={true}>{i18next.t("HEX 编码")}</Text>{i18next.t("后作为输入")}
            </Text>
            <br />
            <Text>{i18next.t("密钥：")}<Text mark={true}>{i18next.t("被 HEX 编码")}</Text>{i18next.t("的")} <Text mark={true}>{i18next.t("长度为16位")}</Text>{i18next.t(`的字符串（为兼容 Key
                中不可见字符）`)}
            </Text>
        </>
    )
}

const EncAmpDecMenu: CodecType[] = [
    {
        verbose: i18next.t("国密算法(sm4)对称加解密"),
        subTypes: [
            {
                key: "sm4-cbc-encrypt",
                verbose: i18next.t("SM4-CBC 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-cbc-decrypt",
                verbose: i18next.t("SM4-CBC 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-cfb-encrypt",
                verbose: i18next.t("SM4-CFB 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-cfb-decrypt",
                verbose: i18next.t("SM4-CFB 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-ebc-encrypt",
                verbose: i18next.t("SM4-EBC 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-ebc-decrypt",
                verbose: i18next.t("SM4-EBC 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-ofb-encrypt",
                verbose: i18next.t("SM4-OFB 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-ofb-decrypt",
                verbose: i18next.t("SM4-OFB 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "sm4-gcm-encrypt",
                verbose: i18next.t("SM4-GCM 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "sm4-gcm-decrypt",
                verbose: i18next.t("SM4-GCM 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            }
        ]
    },
    {
        verbose: i18next.t("AES对称加解密"),
        subTypes: [
            {
                key: "aes-cbc-encrypt",
                verbose: i18next.t("AES-CBC 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "aes-cbc-decrypt",
                verbose: i18next.t("AES-CBC 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            },
            {
                key: "aes-gcm-encrypt",
                verbose: i18next.t("AES-GCM 加密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESEncHelp()
            },
            {
                key: "aes-gcm-decrypt",
                verbose: i18next.t("AES-GCM 解密"),
                params: generateSM4AmpAESParams(),
                help: SM4AmpAESDecHelp()
            }
        ]
    }
]

const CodecMenu: CodecType[] = [
    {key: "jwt-parse-weak", verbose: i18next.t("JWT解析与弱密码")},
    {
        verbose: "Java",
        subTypes: [
            {key: "java-unserialize-hex-dumper", verbose: i18next.t("反序列化(SerialDumper)")},
            {key: "java-unserialize-hex", verbose: i18next.t("反序列化 Java 对象流(hex)")},
            {key: "java-unserialize-base64", verbose: i18next.t("反序列化 Java 对象流(base64)")},
            {key: "java-serialize-json", verbose: i18next.t("Java 对象流序列化（JSON=>HEX）")}
        ]
    },
    {
        verbose: i18next.t("解码"),
        subTypes: [
            {key: "base64-decode", verbose: i18next.t("Base64 解码")},
            {key: "htmldecode", verbose: i18next.t("HTML 解码")},
            {key: "urlunescape", verbose: i18next.t("URL 解码")},
            {key: "urlunescape-path", verbose: i18next.t("URL 路径解码")},
            {key: "double-urldecode", verbose: i18next.t("双重 URL 解码")},
            {key: "hex-decode", verbose: i18next.t("十六进制解码")},
            {key: "json-unicode-decode", verbose: i18next.t("Unicode 中文解码")}
        ]
    },
    {
        verbose: i18next.t("编码"),
        subTypes: [
            {key: "base64", verbose: i18next.t("Base64 编码")},
            {key: "htmlencode", verbose: i18next.t("HTML 实体编码（强制）")},
            {key: "htmlencode-hex", verbose: i18next.t("HTML 实体编码（强制十六进制模式）")},
            {key: "htmlescape", verbose: i18next.t("HTML 实体编码（只编码特殊字符）")},
            {key: "urlencode", verbose: i18next.t("URL 编码（强制）")},
            {key: "urlescape", verbose: i18next.t("URL 编码（只编码特殊字符）")},
            {key: "urlescape-path", verbose: i18next.t("URL 路径编码（只编码特殊字符）")},
            {key: "double-urlencode", verbose: i18next.t("双重 URL 编码")},
            {key: "hex-encode", verbose: i18next.t("十六进制编码")},
            {key: "json-unicode", verbose: i18next.t("Unicode 中文编码")}
        ]
    },
    {
        verbose: i18next.t("计算(HASH)"),
        subTypes: [
            {key: "md5", verbose: i18next.t("计算 md5")},
            {key: "sm3", verbose: i18next.t("计算 SM3(国密3)")},
            {key: "sha1", verbose: i18next.t("计算 Sha1")},
            {key: "sha256", verbose: i18next.t("计算 Sha256")},
            {key: "sha512", verbose: i18next.t("计算 Sha512")}
        ]
    },
    {
        verbose: i18next.t("Json处理"),
        subTypes: [
            {key: "json-formatter", verbose: i18next.t("JSON 美化（缩进4）")},
            {key: "json-formatter-2", verbose: i18next.t("JSON 美化（缩进2）")},
            {key: "json-inline", verbose: i18next.t("JSON 压缩成一行")}
        ]
    },
    {
        verbose: i18next.t("美化"),
        subTypes: [
            {key: "pretty-packet", verbose: i18next.t("HTTP 数据包美化")},
            {key: "json-formatter", verbose: i18next.t("JSON 美化（缩进4）")},
            {key: "json-formatter-2", verbose: i18next.t("JSON 美化（缩进2）")},
            {key: "json-inline", verbose: i18next.t("JSON 压缩成一行")}
        ]
    },
    {key: "fuzz", verbose: i18next.t("模糊测试(标签同 Web Fuzzer)")},
    {
        verbose: "HTTP",
        subTypes: [
            {key: "http-get-query", verbose: i18next.t("解析 HTTP 参数")},
            {key: "pretty-packet", verbose: i18next.t("HTTP 数据包美化")},
            {key: "packet-from-url", verbose: i18next.t("从 URL 中加载数据包")},
            {key: "packet-to-curl", verbose: i18next.t("数据包转 CURL 命令")},
        ]
    }
]

export interface CodecPageProp {}

const CodecPage: React.FC<CodecPageProp> = (props) => {
    const [text, setText] = useState("")
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(true)

    const [leftWidth, setLeftWidth] = useState<boolean>(false)
    const [rightWidth, setRightWidth] = useState<boolean>(false)
    const [leftLine, setLeftLine] = useState<boolean>(true)
    const [rightLine, setRightLine] = useState<boolean>(false)

    const [codecType, setCodecType] = useState<CodecType>()
    const [params, setParams] = useState<YakExecutorParam[]>([])
    const [codecPlugin, setCodecPlugin] = useState<CodecType[]>([])
    const [pluginLoading, setPluginLoading] = useState<boolean>(false)
    const [pluginVisible, setPluginVisible] = useState<boolean>(false)

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    let timer: any = null

    const codec = (t: string, params?: YakExecutorParam[], isYakScript?: boolean) => {
        if (!t) {
            failed(i18next.t("BUG: 空的解码类型"))
            return
        }
        if (!text && !isYakScript) {
            failed(i18next.t("左侧编辑器内容为空，请输入内容后重试!"))
            return
        }

        ipcRenderer
            .invoke("Codec", {Type: t, Text: text, Params: params || [], ScriptName: isYakScript ? t : ""})
            .then((res) => {
                onHandledResult(res?.Result || "")
            })
            .catch((err) => {
                onHandleError(`${err}`)
            })
    }

    const onHandledResult = (data: string) => {
        setResult(data)
    }
    const onHandleError = (err: string) => {
        if (err) failed(i18next.t("CODEC 解码失败：${err}", { v1: err }))
    }

    useEffect(() => {
        setLoading(true)
        setTimeout(() => setLoading(false), 300)
    }, [])

    const renderCodecTypes = useMemoizedFn((items: CodecType[], notAutoExec?: boolean, isYakScript?: boolean) => {
        return items.map((item) => {
            if ((item.subTypes || []).length > 0) {
                return (
                    <Dropdown
                        key={item.verbose}
                        overlay={
                            <Menu activeKey={codecType?.key}>
                                {item.subTypes?.map((subItem) => {
                                    return (
                                        <Menu.Item
                                            key={`${subItem.key}`}
                                            onClick={() => {
                                                setCodecType(subItem)
                                                if (!notAutoExec) {
                                                    codec(subItem.key || "", [], isYakScript)
                                                }
                                            }}
                                        >
                                            <span>{subItem.verbose}</span>
                                        </Menu.Item>
                                    )
                                })}
                            </Menu>
                        }
                        placement='bottomLeft'
                    >
                        <Button
                            type={
                                (item?.subTypes || []).filter((i) => {
                                    return i.key === codecType?.key
                                }).length > 0
                                    ? "primary"
                                    : undefined
                            }
                        >
                            {item.verbose}
                            <DownOutlined />
                        </Button>
                    </Dropdown>
                )
            } else {
                return (
                    <Button
                        key={item.key}
                        type={codecType?.key === item.key ? "primary" : undefined}
                        onClick={() => {
                            setCodecType(item)
                            if (!notAutoExec) {
                                codec(item.key || "", [], isYakScript)
                            }
                        }}
                        style={{marginRight: 8}}
                    >
                        {item.verbose}
                    </Button>
                )
            }
        })
    })

    const search = useMemoizedFn((keyword?: string) => {
        setPluginLoading(true)
        queryYakScriptList(
            "codec",
            (i: YakScript[], total) => {
                setCodecPlugin([
                    {
                        subTypes: i.map((script) => {
                            return {
                                key: script.ScriptName,
                                help: script.Help,
                                verbose: script.ScriptName,
                                isYakScript: true
                            }
                        }),
                        key: "from-yakit-codec-plugin",
                        verbose: i18next.t("CODEC 社区插件")
                    }
                ])
            },
            () => setTimeout(() => setPluginLoading(false), 300),
            10,
            undefined,
            keyword
        )
    })

    useEffect(() => {
        search()
    }, [])

    const refresh = useMemoizedFn(() => {
        setRefreshTrigger(!refreshTrigger)
    })
    return (
        <AutoSpin spinning={loading}>
            <PageHeader
                title={"Codec"}
                className={"codec-pageheader-title"}
                subTitle={
                    <>
                        {codecType && <Tag color={"geekblue"}>{i18next.t("当前类型：")}{codecType?.verbose}</Tag>}
                        {codecType && (codecType?.params || []).length <= 0 && (
                            <Button
                                type={"primary"}
                                size={"small"}
                                onClick={(e) => {
                                    codec(codecType?.key || "", [], codecType?.isYakScript)
                                }}
                            >{i18next.t("立即执行")}
                            </Button>
                        )}
                    </>
                }
            />
            <div className={"codec-function-bar"}>
                <Space direction={"vertical"} style={{width: "100%"}}>
                    <Space>{renderCodecTypes(CodecMenu)}</Space>
                    <Space>
                        {renderCodecTypes(EncAmpDecMenu, true)}
                        {/* {renderCodecTypes(codecPlugin, false, true)} */}
                        <Popover
                            overlayClassName='codec-plugin-lib'
                            trigger='hover'
                            placement='bottomLeft'
                            visible={pluginVisible}
                            onVisibleChange={setPluginVisible}
                            content={
                                <div style={{width: 250}}>
                                    <Input
                                        placeholder={i18next.t("模糊搜索插件名")}
                                        allowClear
                                        onChange={(event) => {
                                            if (timer) {
                                                clearTimeout(timer)
                                                timer = null
                                            }
                                            timer = setTimeout(() => {
                                                search(event.target.value)
                                            }, 500)
                                        }}
                                    ></Input>
                                    <List
                                        loading={pluginLoading}
                                        size='small'
                                        dataSource={codecPlugin[0]?.subTypes || []}
                                        rowKey={(row) => row.key || ""}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <div
                                                    style={{width: "100%", padding: "5px 7px"}}
                                                    onClick={() => {
                                                        setCodecType(item)
                                                        codec(item.key || "", [], true)
                                                        setPluginVisible(false)
                                                    }}
                                                >
                                                    {item.key || ""}
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            }
                        >
                            <Button
                                type={
                                    (codecPlugin[0]?.subTypes || []).filter((item) => codecType?.key === item.key)
                                        .length !== 0
                                        ? "primary"
                                        : "default"
                                }
                            >{i18next.t("CODEC 社区插件")} <DownOutlined style={{fontSize: 10}} />
                            </Button>
                        </Popover>
                    </Space>
                    {codecType && codecType?.params && codecType.params.length > 0 && (
                        <Row style={{width: "100%"}} gutter={20}>
                            <Col span={codecType?.help ? 18 : 24}>
                                <Divider>{i18next.t("设置参数")}</Divider>
                                <YakScriptParamsSetter
                                    primaryParamsOnly={true}
                                    styleSize={"small"}
                                    Params={codecType?.params || []}
                                    onParamsConfirm={(finalParams) => {
                                        setParams([...finalParams])
                                        codec(codecType?.key || "", finalParams, codecType?.isYakScript)
                                    }}
                                    hideClearButton={true}
                                    submitVerbose={i18next.t("执行")}
                                />
                            </Col>
                            {codecType?.help && (
                                <Col span={6} style={{paddingTop: 30}}>
                                    <Alert type={"info"} message={codecType?.help} />
                                </Col>
                            )}
                        </Row>
                    )}
                </Space>
            </div>
            <div className={"codec-content"}>
                <Row wrap={false} justify='space-between' style={{flexGrow: 1}}>
                    <Col flex={leftWidth ? "0 1 80%" : rightWidth ? "0 1 18%" : "0 1 49%"}>
                        <YakCodeEditor
                            noTitle={true}
                            language={"html"}
                            originValue={Buffer.from(text, "utf8")} hideSearch={true}
                            onChange={i => setText(Uint8ArrayToString(i, "utf8"))}
                            refreshTrigger={refreshTrigger}
                            noHex={true}
                            noHeader={false}
                            extra={
                                <Space>
                                    <Button
                                        size={"small"}
                                        type={leftWidth ? "primary" : "link"}
                                        icon={<ArrowsAltOutlined />}
                                        onClick={() => {
                                            setLeftWidth(!leftWidth)
                                            setRightWidth(false)
                                        }}
                                    />
                                </Space>
                            }
                        />
                    </Col>
                    <Col flex='0 1 2%'>
                        <div className={"exchange-btn"}>
                            <SwapOutlined
                                className={"exchange-icon"}
                                onClick={() => {
                                    const left = text
                                    const right = result
                                    setText(right)
                                    setResult(left)
                                    refresh()
                                }}
                            />
                        </div>
                    </Col>
                    <Col flex={rightWidth ? "0 1 80%" : leftWidth ? "0 1 18%" : "0 1 49%"}>
                        <YakCodeEditor
                            noTitle={true}
                            language={"html"}
                            readOnly={true}
                            originValue={Buffer.from(result, "utf8")}
                            hideSearch={true}
                            noHex={true}
                            noHeader={false}
                            extra={
                                <Space>
                                    <Button
                                        size={"small"}
                                        type={rightWidth ? "primary" : "link"}
                                        icon={<ArrowsAltOutlined />}
                                        onClick={() => {
                                            setRightWidth(!rightWidth)
                                            setLeftWidth(false)
                                        }}
                                    />
                                </Space>
                            }
                        />
                    </Col>
                </Row>
            </div>
        </AutoSpin>
    )
}
export default CodecPage
