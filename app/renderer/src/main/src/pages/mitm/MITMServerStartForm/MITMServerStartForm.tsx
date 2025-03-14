import React, {useEffect, useRef, useState} from "react"
import {Form, Space, Modal} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, ExtraMITMServerProps, MITMResponse} from "@/pages/mitm/MITMPage"
import {MITMConsts} from "@/pages/mitm/MITMConsts"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import styles from "./MITMServerStartForm.module.scss"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {yakitFailed} from "@/utils/notification"
import {CogIcon, RefreshIcon} from "@/assets/newIcon"
import {RuleExportAndImportButton} from "../MITMRule/MITMRule"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {AdvancedConfigurationFromValue} from "./MITMFormAdvancedConfiguration"
import ReactResizeDetector from "react-resize-detector"
import {useWatch} from "antd/es/form/Form"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {inputHTTPFuzzerHostConfigItem} from "../../fuzzer//HTTPFuzzerHosts"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import i18next from "../../../i18n"
const MITMFormAdvancedConfiguration = React.lazy(() => import("./MITMFormAdvancedConfiguration"))
const ChromeLauncherButton = React.lazy(() => import("../MITMChromeLauncher"))

const {ipcRenderer} = window.require("electron")

export interface MITMServerStartFormProp {
    onStartMITMServer: (
        host: string,
        port: number,
        downstreamProxy: string,
        enableInitialPlugin: boolean,
        enableHttp2: boolean,
        clientCertificates: ClientCertificate[],
        extra?: ExtraMITMServerProps
    ) => any
    visible: boolean
    setVisible: (b: boolean) => void
    enableInitialPlugin: boolean
    setEnableInitialPlugin: (b: boolean) => void
    status: "idle" | "hijacked" | "hijacking"
}

const {Item} = Form

export interface ClientCertificate {
    CerName: string
    CrtPem: Uint8Array
    KeyPem: Uint8Array
    CaCertificates: Uint8Array[]
}

const defHost = "127.0.0.1"
export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    const [hostHistoryList, setHostHistoryList] = useState<string[]>([])

    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])
    const [openRepRuleFlag, setOpenRepRuleFlag] = useState<boolean>(false)
    const [isUseDefRules, setIsUseDefRules] = useState<boolean>(false)
    const [advancedFormVisible, setAdvancedFormVisible] = useState<boolean>(false)

    // 高级配置 关闭后存的最新的form值
    const [advancedValue, setAdvancedValue] = useState<AdvancedConfigurationFromValue>()

    const ruleButtonRef = useRef<any>()
    const advancedFormRef = useRef<any>()
    const downstreamProxyRef = useRef<any>(null)

    const [form] = Form.useForm()
    const enableGMTLS = useWatch<boolean>("enableGMTLS", form)
    useEffect(() => {}, [enableGMTLS])

    useEffect(() => {
        if (props.status !== "idle") return
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then((a) => {
            form.setFieldsValue({enableInitialPlugin: !!a})
        })
        getRemoteValue(MITMConsts.MITMDefaultServer).then((e) => {
            if (!!e) {
                form.setFieldsValue({host: e || defHost})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultPort).then((e) => {
            if (!!e) {
                form.setFieldsValue({port: e})
            }
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableHTTP2).then((e) => {
            form.setFieldsValue({enableHttp2: !!e})
        })
        getRemoteValue(MITMConsts.MITMDefaultEnableGMTLS).then((e) => {
            form.setFieldsValue({enableGMTLS: !!e})
        })
        getRemoteValue(MITMConsts.MITMDefaultHostHistoryList).then((e) => {
            if (!!e) {
                setHostHistoryList(JSON.parse(e))
            } else {
                getRemoteValue(MITMConsts.MITMDefaultServer).then((h) => {
                    if (!!h) {
                        setHostHistoryList([h])
                    }
                })
            }
        })
    }, [props.status])
    useUpdateEffect(() => {
        form.setFieldsValue({enableInitialPlugin: props.enableInitialPlugin})
    }, [props.enableInitialPlugin])
    useEffect(() => {
        getRules()
    }, [props.visible])
    const getRules = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                const findOpenRepRule = newRules.find(
                    (item) => !item.Disabled && (!item.NoReplace || item.Drop || item.ExtraRepeat)
                )
                setOpenRepRuleFlag(findOpenRepRule !== undefined)
                setRules(newRules)
            })
            .catch((e) => yakitFailed(i18next.t("获取规则列表失败:") + e))
    })
    const onSwitchPlugin = useMemoizedFn((checked) => {
        props.setEnableInitialPlugin(checked)
    })
    const onStartMITM = useMemoizedFn((values) => {
        // 开启替换规则
        if (openRepRuleFlag) {
            Modal.confirm({
                title: i18next.t("温馨提示"),
                icon: <ExclamationCircleOutlined />,
                content: i18next.t("检测到开启了替换规则，可能会影响劫持，是否确认开启？"),
                okText: i18next.t("确认"),
                cancelText: i18next.t("取消"),
                closable: true,
                centered: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    execStartMITM(values)
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
            return
        }
        execStartMITM(values)
    })
    const execStartMITM = useMemoizedFn((values) => {
        // 获取高级配置的默认值
        const advancedFormValue = advancedFormRef.current?.getValue()
        let params = {
            ...values,
            ...advancedFormValue,
            ...advancedValue
        }
        props.onStartMITMServer(
            params.host,
            params.port,
            params.downstreamProxy,
            params.enableInitialPlugin,
            params.enableHttp2,
            params.certs,
            {
                enableGMTLS: params.enableGMTLS,
                onlyEnableGMTLS: params.onlyEnableGMTLS,
                preferGMTLS: params.preferGMTLS,
                enableProxyAuth: params.enableProxyAuth,
                proxyUsername: params.proxyUsername,
                proxyPassword: params.proxyPassword,
                dnsServers: params.dnsServers,
                hosts: params.etcHosts
            }
        )
        const index = hostHistoryList.findIndex((ele) => ele === params.host)
        if (index === -1) {
            const newHostHistoryList = [params.host, ...hostHistoryList].filter((_, index) => index < 10)
            setRemoteValue(MITMConsts.MITMDefaultHostHistoryList, JSON.stringify(newHostHistoryList))
        }
        if (downstreamProxyRef.current) {
            downstreamProxyRef.current.onSetRemoteValues(params.downstreamProxy || "")
        }
        setRemoteValue(MITMConsts.MITMDefaultServer, params.host)
        setRemoteValue(MITMConsts.MITMDefaultPort, `${params.port}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableHTTP2, `${params.enableHttp2 ? "1" : ""}`)
        setRemoteValue(MITMConsts.MITMDefaultEnableGMTLS, `${params.enableGMTLS ? "1" : ""}`)
        setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, params.enableInitialPlugin ? "true" : "")
        // 记录时间戳
        const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
        setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
    })
    const [width, setWidth] = useState<number>(0)

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)

    return (
        <div className={styles["mitm-server-start-form"]}>
            <ReactResizeDetector
                onResize={(w) => {
                    if (!w) {
                        return
                    }
                    setWidth(w)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <Form
                form={form}
                onFinish={onStartMITM}
                labelCol={{span: width > 610 ? 5 : 9}}
                wrapperCol={{span: width > 610 ? 13 : 11}}
            >
                <Item
                    label={i18next.t("劫持代理监听主机")}
                    help={i18next.t("远程模式可以修改为 0.0.0.0 以监听主机所有网卡")}
                    rules={[{required: true, message: i18next.t("该项为必填")}]}
                    name='host'
                >
                    <YakitAutoComplete
                        options={hostHistoryList.map((item) => ({value: item, label: item}))}
                        placeholder={i18next.t("请输入")}
                    />
                </Item>
                <Item label={i18next.t("劫持代理监听端口")} name='port' rules={[{required: true, message: i18next.t("该项为必填")}]}>
                    <YakitInputNumber
                        wrapperClassName={styles["form-input-number"]}
                        style={{width: "100%", maxWidth: "none"}}
                    />
                </Item>
                <Item
                    label={i18next.t("下游代理")}
                    name='downstreamProxy'
                    help={
                        <span className={styles["form-rule-help"]}>{i18next.t(`为经过该 MITM
                            代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描，代理如有密码格式为：http://user:pass@ip:port`)}
                            <span
                                className={styles["form-rule-help-setting"]}
                                onClick={() => setAgentConfigModalVisible(true)}
                            >{i18next.t("配置用户名密码")}&nbsp;
                            </span>
                        </span>
                    }
                >
                    <YakitAutoComplete
                        ref={downstreamProxyRef}
                        cacheHistoryDataKey={MITMConsts.MITMDefaultDownstreamProxyHistory}
                        placeholder={i18next.t("例如 http://127.0.0.1:7890 或者 socks5://127.0.0.1:7890")}
                    />
                </Item>
                <Item
                    label={i18next.t("HTTP/2.0 支持")}
                    name='enableHttp2'
                    help={
                        i18next.t("开启该选项将支持 HTTP/2.0 劫持，关闭后自动降级为 HTTP/1.1，开启后 HTTP2 协商失败也会自动降级")
                    }
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>
                <Item
                    label={i18next.t("国密劫持")}
                    name='enableGMTLS'
                    initialValue={true}
                    help={i18next.t("适配国密算法的 TLS (GM-tls) 劫持，对目标网站发起国密 TLS 的连接")}
                    valuePropName='checked'
                >
                    <YakitSwitch size='large' />
                </Item>
                <Item
                    label={i18next.t("内容规则")}
                    help={
                        <span className={styles["form-rule-help"]}>{i18next.t("使用规则进行匹配、替换、标记、染色，同时配置生效位置")}
                            <span
                                className={styles["form-rule-help-setting"]}
                                onClick={() => {
                                    setIsUseDefRules(true)
                                    ruleButtonRef.current.onSetImportVisible(true)
                                }}
                            >{i18next.t("默认配置")}&nbsp;
                                <RefreshIcon />
                            </span>
                        </span>
                    }
                >
                    <div className={styles["form-rule-body"]}>
                        <div className={styles["form-rule"]} onClick={() => props.setVisible(true)}>
                            <div className={styles["form-rule-text"]}>{i18next.t("现有规则")} {rules.length} {i18next.t("条")}</div>
                            <div className={styles["form-rule-icon"]}>
                                <CogIcon />
                            </div>
                        </div>
                    </div>
                    <div className={styles["form-rule-button"]}>
                        <RuleExportAndImportButton
                            ref={ruleButtonRef}
                            isUseDefRules={isUseDefRules}
                            setIsUseDefRules={setIsUseDefRules}
                            onOkImport={() => getRules()}
                        />
                    </div>
                </Item>
                <Item label={i18next.t("启用插件")} name='enableInitialPlugin' valuePropName='checked'>
                    <YakitSwitch size='large' onChange={(checked) => onSwitchPlugin(checked)} />
                </Item>
                <Item label={" "} colon={false}>
                    <Space>
                        <YakitButton type='primary' size='large' htmlType='submit'>{i18next.t("劫持启动")}
                        </YakitButton>
                        <ChromeLauncherButton
                            host={useWatch("host", form)}
                            port={useWatch("port", form)}
                            onFished={(host, port) => {
                                const values = {
                                    ...form.getFieldsValue(),
                                    host,
                                    port
                                }
                                execStartMITM(values)
                            }}
                            repRuleFlag={openRepRuleFlag}
                        />
                        <YakitButton type='text' size='large' onClick={() => setAdvancedFormVisible(true)}>{i18next.t("高级配置")}
                        </YakitButton>
                    </Space>
                </Item>
            </Form>
            {/* 代理劫持弹窗 */}
            <AgentConfigModal
                agentConfigModalVisible={agentConfigModalVisible}
                onCloseModal={() => setAgentConfigModalVisible(false)}
                generateURL={(url) => {
                    form.setFieldsValue({downstreamProxy: url})
                }}
            ></AgentConfigModal>
            <React.Suspense fallback={<div>loading...</div>}>
                <MITMFormAdvancedConfiguration
                    visible={advancedFormVisible}
                    setVisible={setAdvancedFormVisible}
                    onSave={(val) => {
                        setAdvancedValue(val)
                        setAdvancedFormVisible(false)
                    }}
                    enableGMTLS={enableGMTLS}
                    ref={advancedFormRef}
                />
            </React.Suspense>
        </div>
    )
})

interface GenerateURLRequest {
    Scheme: string
    Host: string
    Port: string
    Username: string
    Password: string
}

interface GenerateURLResponse {
    URL: string
}
interface AgentConfigModalParams extends Omit<GenerateURLRequest, "Host" | "Port"> {
    Address?: string
}

const initAgentConfigModalParams = {
    Scheme: "http",
    Address: "",
    Username: "",
    Password: ""
}

interface AgentConfigModalProp {
    agentConfigModalVisible: boolean
    onCloseModal: () => void
    generateURL: (url: string) => void
}

// 代理劫持弹窗
const AgentConfigModal: React.FC<AgentConfigModalProp> = React.memo((props) => {
    const {agentConfigModalVisible, onCloseModal, generateURL} = props
    const [form] = Form.useForm()
    const [params, setParams] = useState<AgentConfigModalParams>(initAgentConfigModalParams)

    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const handleReqParams = () => {
        const copyParams = structuredClone(params)
        const address = copyParams.Address?.split(":") || []
        delete copyParams.Address
        return {
            ...copyParams,
            Host: address[0] || "",
            Port: address[1] || ""
        }
    }

    const onOKFun = useMemoizedFn(async () => {
        await form.validateFields()
        try {
            const res: GenerateURLResponse = await ipcRenderer.invoke("mitm-agent-hijacking-config", handleReqParams())
            generateURL(res.URL)
            onClose()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onClose = useMemoizedFn(() => {
        setParams(initAgentConfigModalParams)
        form.setFieldsValue(initAgentConfigModalParams)
        onCloseModal()
    })

    return (
        <YakitModal
            visible={agentConfigModalVisible}
            title={i18next.t('配置用户名密码')}
            width={506}
            maskClosable={false}
            closable
            centered
            okText={i18next.t("确认")}
            onCancel={onClose}
            onOk={onOKFun}
            bodyStyle={{padding: 0}}
        >
            <div style={{padding: 15}}>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    initialValues={{...params}}
                    style={{height: "100%"}}
                    onValuesChange={onValuesChange}
                >
                    <Form.Item label={i18next.t("协议")} name='Scheme' style={{marginBottom: 4}}>
                        <YakitSelect
                            options={["http", "socks5"].map((item) => ({
                                value: item,
                                label: item
                            }))}
                            size='small'
                        />
                    </Form.Item>
                    <Form.Item
                        label={i18next.t("地址")}
                        name='Address'
                        style={{marginBottom: 4}}
                        rules={[
                            {required: true, message: i18next.t("请输入地址")},
                            {
                                pattern:
                                    /^((([a-z\d]([a-z\d-]*[a-z\d])*)\.)*[a-z]([a-z\d-]*[a-z\d])?|(?:\d{1,3}\.){3}\d{1,3}):\d+$/,
                                message: i18next.t("输入地址格式不正确")
                            }
                        ]}
                    >
                        <YakitInput placeholder={i18next.t("例如：127.0.0.1:7890")} />
                    </Form.Item>
                    <Form.Item
                        label={i18next.t("用户名")}
                        name='Username'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: i18next.t("请输入用户名")}]}
                    >
                        <YakitInput placeholder={i18next.t("请输入用户名")} />
                    </Form.Item>
                    <Form.Item
                        label={i18next.t("密码")}
                        name="Password"
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: i18next.t("请输入密码")}]}
                    >
                        <YakitInput placeholder={i18next.t("请输入密码")} />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
})
