import React, {useEffect, useRef, useState} from "react"
import {Form, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, info, warn, yakitNotify} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {LoadYakitPluginForm} from "@/pages/yakitStore/YakitStorePage"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitRoute} from "@/routes/newRoute"
import {ImportLocalPlugin} from "@/pages/mitm/MITMPage"
import emiter from "@/utils/eventBus/eventBus"
import i18next from "../../../../i18n"

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

const {ipcRenderer} = window.require("electron")

interface ShareImportProps {
    onClose: () => void
}

interface pwdRequestProps {
    share_id: string
    token: string
}

export function onImportShare() {
    const m = showYakitModal({
        title: i18next.t("导入数据包 ID"),
        content: <ShareImport onClose={() => m.destroy()} />,
        footer: null
    })
}
export function onImportPlugin() {
    const m = showYakitModal({
        title: null,
        footer: null,
        mask: false,
        width: 680,
        content: (
            <>
                <ImportLocalPlugin
                    visible={true}
                    setVisible={(v) => {
                        if (!v) {
                            m.destroy()
                            setTimeout(() => {
                                emiter.emit("onRefLocalPluginList", "")
                            }, 200)
                        }
                    }}
                />
            </>
        )
    })
}

export const ShareImport: React.FC<ShareImportProps> = (props) => {
    const {onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowPassword, setIsShowPassword] = useState<boolean>(false)
    // 全局监听登录状态
    const {userInfo} = useStore()
    const onFinish = useMemoizedFn((value) => {
        if (value.extract_code) {
            onShareExtract(value)
        } else {
            onExtractPwd(value)
        }
    })
    /**
     * @description 先进行密码验证
     */
    const onExtractPwd = useMemoizedFn((value) => {
        setLoading(true)
        const pwdRequest: pwdRequestProps = {
            share_id: value.share_id,
            token: userInfo.token
        }
        NetWorkApi<pwdRequestProps, boolean>({
            url: "module/extract/pwd",
            method: "get",
            params: {...pwdRequest}
        })
            .then((pwd) => {
                if (pwd) {
                    setIsShowPassword(true)
                    warn(i18next.t("该分享需要输入密码!"))
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                } else {
                    onShareExtract(value)
                }
            })
            .catch((err) => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
                yakitNotify("error", i18next.t("密码验证失败：") + err)
            })
    })
    /**
     * @description 获取分享数据
     */
    const onShareExtract = useMemoizedFn((value) => {
        if (userInfo.isLogin) {
            value.token = userInfo.token
        }
        setLoading(true)
        NetWorkApi<API.ShareResponse, API.ExtractResponse>({
            url: "module/extract",
            method: "post",
            data: value
        })
            .then((res) => {
                switch (res.module) {
                    case "fuzzer":
                        handleWebFuzzerShare(res)
                        break
                    case YakitRoute.HTTPHacker:
                    case YakitRoute.DB_HTTPHistory:
                        handleHttpHistoryShare(res)
                        break
                    default:
                        break
                }
            })
            .catch((err) => {
                yakitNotify("error", i18next.t("获取分享数据失败：") + err)
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleWebFuzzerShare = useMemoizedFn((res: API.ExtractResponse) => {
        const shareContent = JSON.parse(res.extract_content)
        ipcRenderer
            .invoke("send-to-tab", {
                type: res.module,
                data: {
                    isHttps: shareContent.isHttps,
                    isGmTLS: shareContent.isGmTLS,
                    request: shareContent.request,
                    shareContent: res.extract_content
                }
            })
            .then(() => {
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", i18next.t("打开web fuzzer失败:") + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleHttpHistoryShare = useMemoizedFn((res: API.ExtractResponse) => {
        ipcRenderer
            .invoke("HTTPFlowsExtract", {
                ShareExtractContent: res.extract_content
            })
            .then(() => {
                ipcRenderer
                    .invoke("send-to-tab", {
                        type: res.module
                    })
                    .then(() => {
                        setTimeout(() => {
                            ipcRenderer.invoke("send-positioning-http-history", {
                                activeTab: "history"
                            })
                        }, 200)
                    })
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", i18next.t("储存HttpHistory分享数据失败") + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <>
            <Form {...layout} name='control-hooks' onFinish={onFinish} style={{padding: 24}}>
                <Form.Item name='share_id' label={i18next.t("分享id")} rules={[{required: true, message: i18next.t("该项为必填")}]}>
                    <YakitInput placeholder={i18next.t("请输入分享id")} />
                </Form.Item>
                {isShowPassword && (
                    <Form.Item name='extract_code' label={i18next.t("密码")} rules={[{required: true, message: i18next.t("该项为必填")}]}>
                        <YakitInput placeholder={i18next.t("请输入密码")} allowClear />
                    </Form.Item>
                )}
                <Form.Item {...tailLayout}>
                    <YakitButton type='primary' htmlType='submit' className='btn-sure' loading={loading}>{i18next.t("确定")}
                    </YakitButton>
                </Form.Item>
            </Form>
        </>
    )
}
