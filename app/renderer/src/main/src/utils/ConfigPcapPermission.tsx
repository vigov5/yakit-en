import React, {useEffect, useState} from "react";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Form, Tooltip} from "antd";
import {failed} from "@/utils/notification";
import {QuestionCircleTwoTone} from "@ant-design/icons/lib";
import { getReleaseEditionName } from "./envfile";
import i18next from "../i18n"

export interface ConfigPcapPermissionFormProp {
    onClose: () => any
}

const {ipcRenderer} = window.require("electron");

export const ConfigPcapPermissionForm: React.FC<ConfigPcapPermissionFormProp> = (props) => {
    const [response, setResponse] = useState<{
        IsPrivileged: boolean
        Advice: string,
        AdviceVerbose: string,
    }>({Advice: "unknown", AdviceVerbose: i18next.t("无法获取 PCAP 支持信息"), IsPrivileged: false});
    const [platform, setPlatform] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("IsPrivilegedForNetRaw", {}).then(setResponse).catch(e => {
            failed(i18next.t("获取 Pcap 权限状态失败：${e}", { v1: e }))
        }).finally(() => {
            ipcRenderer.invoke("fetch-system-and-arch").then((e: string) => setPlatform(e)).catch(e => {
                failed(i18next.t("获取 ${getReleaseEditionName()} 操作系统失败：${e}", {v1: getReleaseEditionName(), v2: e }))
            })
        })
    }, [])

    const isWindows = platform.toLowerCase().startsWith("win")

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            ipcRenderer.invoke(`PromotePermissionForUserPcap`, {}).then(() => {
                if (props?.onClose) {
                    props.onClose()
                }
            }).catch(e => {
                failed(i18next.t("提升 Pcap 用户权限失败：${e}", { v1: e }))
            })
        }}
    >
        <Form.Item
            label={" "} colon={false}
            // <Button type={"link"} icon={<QuestionCircleTwoTone/>}/>
            help={
                <>
                    <Tooltip title={i18next.t("原理：MacOS 通过设置 /dev/bpf* 权限组，可参考 Wireshark ChmodBPF 相关配置，Linux 可通过 setcap 命令设置 pcap 权限，Windows 推荐直接以 UAC 提升管理员权限启动")}>
                        <Button type={"link"} icon={<QuestionCircleTwoTone/>}/>
                    </Tooltip>
                    {isWindows ? i18next.t("Windows 可用管理员权限启动 ${getReleaseEditionName()} 以获取对 Pcap 的使用权限", {v1: getReleaseEditionName()}) : i18next.t("Linux 与 MacOS 可通过设置权限与组为用户态赋予网卡完全权限")}
                </>
            }
        >
            {
                response.IsPrivileged
                    ?
                    <Alert type={"success"} message={i18next.t("您可以正常试用 SYN 扫描等功能，无需修复")}/>
                    :
                    <Alert type={"warning"} message={i18next.t("当前引擎不具有网卡操作权限")}/>
            }
        </Form.Item>
        {
            response.IsPrivileged ? <Form.Item label={" "} colon={false}>
                {props?.onClose && <Button onClick={() => {
                    props.onClose()
                }}>{i18next.t("知道了～")}</Button>}
            </Form.Item> : <Form.Item
                label={" "} colon={false}
            >
                <Button htmlType={"submit"} type={"primary"}>{i18next.t("开启 PCAP 权限")}</Button>
                <Tooltip title={`${response.AdviceVerbose}: ${response.Advice}`}>
                    <Button type={"link"}>{i18next.t("手动修复")}</Button>
                </Tooltip>
            </Form.Item>
        }
    </Form>
};

export const showPcapPermission = () => {
    const m = showModal({
        title: i18next.t("修复 Pcap 权限"),
        width: "70%",
        content: (
            <ConfigPcapPermissionForm onClose={() => {
                m.destroy()
            }}/>
        )
    })
}