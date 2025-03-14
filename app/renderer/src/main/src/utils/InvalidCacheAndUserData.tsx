import React from "react";
import {info, yakitFailed} from "@/utils/notification";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import { getReleaseEditionName } from "./envfile";
import i18next from "../i18n"
import emiter from "./eventBus/eventBus";

const {ipcRenderer} = window.require("electron");

export const invalidCacheAndUserData = (temporaryProjectId: string, setTemporaryProjectId) => {
    const handleTemporaryProject = async () => {
        if (temporaryProjectId) {
            try {
                await ipcRenderer.invoke("DeleteProject", {Id: +temporaryProjectId, IsDeleteLocal: true})
                setTemporaryProjectId("")
                emiter.emit("onFeachGetCurrentProject")
            } catch (error) {
                yakitFailed(error + "")
            }
        }
    }

    const m = showModal({
        title: i18next.t("重置用户数据与缓存"),
        content: (
            <Space style={{width: 600}} direction={"vertical"}>
                <Alert type={"error"} message={i18next.t("如果你的 ${getReleaseEditionName()} 出现异常，可使用此功能删除所有本地缓存和用户数据，重连重启。", {v1: getReleaseEditionName()})}/>
                <Alert type={"error"} message={i18next.t("注意，本操作将永久删除缓存数据，难以恢复，请谨慎操作")}/>
                <Button type={"primary"} danger={true} onClick={async () => {
                    m.destroy()
                    await handleTemporaryProject()
                    ipcRenderer.invoke("ResetAndInvalidUserData", {}).then(() => {
                    }).catch(e => {
                    }).finally(() => {
                        info(i18next.t("执行重置用户数据成功"))
                    })
                }}>{i18next.t("我确认此风险，立即删除")}</Button>
            </Space>
        ),
        width: 700,
    })

}