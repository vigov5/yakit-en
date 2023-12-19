import React, {useState, useEffect} from "react"
import {Form, Button} from "antd"
import {InputInteger, InputItem, SwitchItem, InputStringOrJsonItem} from "../../utils/inputUtil"
import {useGetState, useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "../../utils/kv"
import {NetInterface} from "@/models/Traffic";
const {ipcRenderer} = window.require("electron")
export const BRIDGE_ADDR = "yak-bridge-addr"
export const BRIDGE_SECRET = "yak-bridge-secret"
import i18next from "../../i18n"
interface GetTunnelServerExternalIPParams {
    Addr: string
    Secret: string
}

export interface StartFacadeServerParams {
    IsRemote: boolean
    BridgeParam: GetTunnelServerExternalIPParams
    ReversePort: number
    ReverseHost: string
}
export interface FacadeOptionsProp {
    onStartFacades: (StartFacadeServerParams) => any
}
export const FacadeOptions: React.FC<FacadeOptionsProp> = (props) => {
    const [onLoad, setOnLoad] = useState(false)
    const [params, setParams] = useState<StartFacadeServerParams>({
        BridgeParam: {Addr: "", Secret: ""},
        IsRemote: false,
        ReversePort: 8085,
        ReverseHost: "127.0.0.1"
    })
    useEffect(() => {
        getRemoteValue(BRIDGE_ADDR)
            .then((data: string) => {
                if (!!data) {
                    params.BridgeParam.Addr = data
                    setParams(params)
                    getRemoteValue(BRIDGE_SECRET).then((data: string) => {
                        params.BridgeParam.Secret = data
                        params.IsRemote = true
                        setParams(params)
                        setOnLoad(false)
                    })
                }
            })
            .finally(() => {
                setOnLoad(false)
                ipcRenderer.invoke("AvailableLocalAddr", {}).then((data: {Interfaces: NetInterface[]}) => {
                    const arr = (data.Interfaces || []).filter((i) => i.IP !== "127.0.0.1")
                    if (arr.length === 1) {
                        setParams({...params, ReverseHost: arr[0].IP})
                    }
                })
            })
    }, [])

    return (
        <>
            <Form
                onSubmitCapture={(e) => {
                    // e.preventDefault()
                    props.onStartFacades(params)
                    // connectBridge()
                }}
                // layout={"inline"}
                labelCol={{span: 8}}
                wrapperCol={{span: 8}}
                layout='horizontal'
            >
                {/* <span>aaa</span> */}
                <SwitchItem
                    setValue={(IsRemote) => {
                        setParams({...params, IsRemote})
                    }}
                    value={params.IsRemote}
                    label={i18next.t("启用公网反连")}
                ></SwitchItem>

                {params.IsRemote ? (
                    <>
                        <InputItem
                            label={i18next.t("Bridge地址")}
                            value={params.BridgeParam.Addr}
                            setValue={(BridgeAddr) => {
                                params.BridgeParam.Addr = BridgeAddr
                                setParams(params)
                            }}
                        />
                        <InputItem
                            type='password'
                            label={i18next.t("密码")}
                            value={params.BridgeParam.Secret}
                            setValue={(Secret) => {
                                params.BridgeParam.Secret = Secret
                                setParams(params)
                            }}
                        />
                        <InputInteger
                            label={i18next.t("反连端口")}
                            setValue={(ReversePort) => {
                                setParams({...params, ReversePort})
                            }}
                            value={params.ReversePort}
                        />
                    </>
                ) : (
                    <>
                        <InputItem
                            label={i18next.t("反连地址")}
                            value={params.ReverseHost}
                            setValue={(host) => {
                                setParams({...params, ReverseHost: host})
                            }}
                        />
                        <InputInteger
                            label={i18next.t("反连端口")}
                            setValue={(ReversePort) => {
                                setParams({...params, ReversePort})
                            }}
                            value={params.ReversePort}
                        />
                    </>
                )}
                <Form.Item wrapperCol={{offset: 8}}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        启动FacadeServer{" "}
                    </Button>
                </Form.Item>
            </Form>
        </>
    )
}
