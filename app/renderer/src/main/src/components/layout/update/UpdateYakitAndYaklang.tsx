import React, {useEffect, useMemo, useRef, useState} from "react"
import {useGetState, useMemoizedFn} from "ahooks"
import {YaklangInstallHintSvgIcon} from "../icons"
import {Progress} from "antd"
import {DownloadingState} from "@/yakitGVDefine"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setLocalValue} from "@/utils/kv"
import {LocalGV} from "@/yakitGV"
import {failed, success} from "@/utils/notification"
import {getReleaseEditionName, isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {FetchUpdateContentProp, UpdateContentProp} from "../FuncDomain"
import {NetWorkApi} from "@/services/fetch"

import classNames from "classnames"
import styles from "./UpdateYakitAndYaklang.module.scss"
import i18next from "../../../i18n"

const {ipcRenderer} = window.require("electron")

export interface UpdateYakitAndYaklangProps {
    currentYakit: string
    latestYakit: string
    setLatestYakit: (val: string) => any
    currentYaklang: string
    latestYaklang: string
    setLatestYaklang: (val: string) => any
    isShow: boolean
    onCancel: () => any
}

export const UpdateYakitAndYaklang: React.FC<UpdateYakitAndYaklangProps> = React.memo((props) => {
    const {
        currentYakit,
        latestYakit,
        setLatestYakit,
        currentYaklang,
        latestYaklang,
        setLatestYaklang,
        isShow,
        onCancel
    } = props

    const [yakitProgress, setYakitProgress, getYakitProgress] = useGetState<DownloadingState>()
    const isYakitBreak = useRef<boolean>(false)
    const [yaklangProgress, setYaklangProgress, getYaklangProgress] = useGetState<DownloadingState>()
    const isYaklangBreak = useRef<boolean>(false)

    const [installYakit, setInstallYakit] = useState<boolean>(false)
    const [installedYakit, setInstalledYakit] = useState<boolean>(false)
    const [yakitLoading, setYakitLoading] = useState<boolean>(false)
    const [installYaklang, setInstallYaklang] = useState<boolean>(false)
    const [yaklangLoading, setYaklangLoading] = useState<boolean>(false)

    const [yakitUpdateContent, setYakitUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })
    const [yaklangUpdateContent, setYaklangUpdateContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })
    const yakitContent: string[] = useMemo(() => {
        if (!yakitUpdateContent.content) return []
        if (yakitUpdateContent.version !== latestYakit) return []
        if (yakitUpdateContent.content) {
            return yakitUpdateContent.content.split("\n")
        }
        return []
    }, [yakitUpdateContent])
    const yaklangContent: string[] = useMemo(() => {
        if (!yaklangUpdateContent.content) return []
        if (yaklangUpdateContent.version !== latestYaklang) return []
        if (yaklangUpdateContent.content) {
            return yaklangUpdateContent.content.split("\n")
        }
        return []
    }, [yaklangUpdateContent])

    /** 获取 yakit 更新内容 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        if (yakitUpdateContent.version) return

        NetWorkApi<FetchUpdateContentProp, any>({
            diyHome: "https://www.yaklang.com",
            method: "get",
            url: "yak/versions",
            params: {type: "yakit", source: isEnterpriseEdition() ? "company" : "community"}
        })
            .then((res: any) => {
                if (!res) return
                try {
                    const data: UpdateContentProp = JSON.parse(res)
                    if (data.version !== latestYakit) return
                    setYakitUpdateContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })
    /** 获取 yaklang 更新内容 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        if (yaklangUpdateContent.version) return

        NetWorkApi<FetchUpdateContentProp, any>({
            diyHome: "https://www.yaklang.com",
            method: "get",
            url: "yak/versions",
            params: {type: "yaklang", source: "community"}
        })
            .then((res: any) => {
                if (!res) return
                try {
                    const data: UpdateContentProp = JSON.parse(res)
                    if (data.version !== latestYaklang) return
                    setYaklangUpdateContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })

    useEffect(() => {
        if (latestYakit) fetchYakitLastVersion()
        if (latestYaklang) fetchYaklangLastVersion()
    }, [latestYakit, latestYaklang])

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", (e: any, state: DownloadingState) => {
            if (isYakitBreak.current) return
            setYakitProgress(state)
        })

        ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
            if (isYaklangBreak.current) return
            setYaklangProgress(state)
        })

        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
            ipcRenderer.removeAllListeners("download-yak-engine-progress")
        }
    }, [])

    const isShowYakit = useMemo(() => {
        if (isEnpriTraceAgent()) return false
        if (!isShow) return false
        if (!currentYakit || !latestYakit) return false
        if (`v${currentYakit}` !== latestYakit) return true
        else return false
    }, [currentYakit, latestYakit, isShow])
    const isShowYaklang = useMemo(() => {
        if (!isShow) return false
        if (!currentYaklang || !latestYaklang) return false
        if (currentYaklang !== latestYaklang) return true
        else return false
    }, [currentYaklang, latestYaklang, isShow])

    /** 不再提示 */
    const noHint = () => {
        setLocalValue(LocalGV.NoAutobootLatestVersionCheck, true)
        setLatestYakit("")
        setLatestYaklang("")
        onCancel()
    }

    const yakitLater = useMemoizedFn(() => {
        setLatestYakit("")
        if (!isShowYaklang) onCancel()
    })
    const yaklangLater = useMemoizedFn(() => {
        setLatestYaklang("")
        onCancel()
    })

    const yakitDownload = () => {
        let version = ""
        if (latestYakit.startsWith("v")) version = latestYakit.substr(1)
        isYakitBreak.current = false
        setInstallYakit(true)
        ipcRenderer
            .invoke("download-latest-yakit", version, isEnterpriseEdition())
            .then(() => {
                if (isYakitBreak.current) return
                success(i18next.t("下载完毕"))
                if (!getYakitProgress()?.size) return
                setYakitProgress({
                    time: {
                        elapsed: getYakitProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYakitProgress().size
                })
                setInstallYakit(false)
                setInstalledYakit(true)
            })
            .catch((e: any) => {
                if (isYakitBreak.current) return
                failed(i18next.t("下载失败: ${e}", { v1: e }))
                setYakitProgress(undefined)
                setInstallYakit(false)
            })
    }
    const yakitBreak = useMemoizedFn(() => {
        setYakitLoading(true)
        isYakitBreak.current = true
        setInstallYakit(false)
        setYakitProgress(undefined)
        yakitLater()
        setTimeout(() => {
            setYakitLoading(false)
        }, 300)
    })
    const yakitUpdate = useMemoizedFn(() => {
        ipcRenderer.invoke("open-yakit-or-yaklang")
        setTimeout(() => {
            ipcRenderer.invoke("UIOperate", "close")
        }, 100)
    })

    const yaklangDownload = useMemoizedFn(() => {
        isYaklangBreak.current = false
        setInstallYaklang(true)
        ipcRenderer
            .invoke("download-latest-yak", latestYaklang)
            .then(() => {
                if (isYaklangBreak.current) return

                success(i18next.t("下载完毕"))
                if (!getYaklangProgress()?.size) return
                setYaklangProgress({
                    time: {
                        elapsed: getYaklangProgress()?.time.elapsed || 0,
                        remaining: 0
                    },
                    speed: 0,
                    percent: 100,
                    // @ts-ignore
                    size: getYaklangProgress().size
                })
                yaklangUpdate()
            })
            .catch((e: any) => {
                if (isYaklangBreak.current) return
                failed(i18next.t("引擎下载失败: ${e}", { v1: e }))
                setInstallYaklang(false)
                setYaklangProgress(undefined)
            })
    })
    const yaklangBreak = useMemoizedFn(() => {
        setYaklangLoading(true)
        isYaklangBreak.current = true
        setInstallYaklang(false)
        setYaklangProgress(undefined)
        yaklangLater()
        setTimeout(() => {
            setYaklangLoading(false)
        }, 300)
    })
    const yaklangUpdate = useMemoizedFn(() => {
        ipcRenderer
            .invoke("install-yak-engine", latestYaklang)
            .then(() => {
                success(i18next.t("安装成功，如未生效，重启 ${getReleaseEditionName()} 即可", {v1: getReleaseEditionName()}))
            })
            .catch((err: any) => {
                failed(
                    i18next.t("安装失败:") + (err.message.indexOf("operation not permitted") > -1 ? i18next.t("请关闭引擎后重启软件尝试") : err)
                )
            })
            .finally(() => {
                yaklangLater()
            })
    })

    return (
        <div className={isShow ? styles["update-mask"] : styles["hidden-update-mask"]}>
            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installedYakit ? (
                                <>
                                    <div className={styles["hint-right-title"]}>{getReleaseEditionName()} i18next.t("下载成功")</div>
                                    <div className={styles["hint-right-content"]}>{i18next.t("安装需关闭软件，双击安装包即可安装完成，是否立即安装？")}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div></div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>{i18next.t("取消")}
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitUpdate}>{i18next.t("确定")}
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            ) : installYakit ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>{i18next.t("Yakit下载中...")}</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yakitProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>{i18next.t("剩余时间 :")} {(yakitProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("耗时 :")} {(yakitProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("下载速度 :")} {((yakitProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yakitLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yakitBreak}
                                        >{i18next.t("取消")}
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>{i18next.t("检测到")} {getReleaseEditionName()} {i18next.t("版本升级")}</div>
                                    <div className={styles["hint-right-content"]}>
                                        {/* {`当前版本：v${currentYakit}`}
                                        <br />
                                        {`最新版本：${latestYakit}`} */}
                                        {i18next.t("${getReleaseEditionName()} ${latestYakit} 更新说明 :", {v1: getReleaseEditionName(), v2: latestYakit})}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yakitContent.length === 0
                                            ? i18next.t("管理员未编辑更新通知")
                                            : yakitContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>{i18next.t("不再提示")}
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yakitLater}>{i18next.t("稍后再说")}
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yakitDownload}>{i18next.t("立即更新")}
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={classNames(
                    styles["yaklang-update-modal"],
                    isShowYaklang && !isShowYakit ? styles["engine-hint-modal-wrapper"] : styles["modal-hidden-wrapper"]
                )}
            >
                <div className={styles["modal-yaklang-engine-hint"]}>
                    <div className={styles["yaklang-engine-hint-wrapper"]}>
                        <div className={styles["hint-left-wrapper"]}>
                            <div className={styles["hint-icon"]}>
                                <YaklangInstallHintSvgIcon />
                            </div>
                        </div>

                        <div className={styles["hint-right-wrapper"]}>
                            {installYaklang ? (
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>{i18next.t("引擎下载中...")}</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((yaklangProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>{i18next.t("剩余时间 :")} {(yaklangProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("耗时 :")} {(yaklangProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("下载速度 :")} {((yaklangProgress?.speed || 0) / 1000000).toFixed(2)}
                                            M/s
                                        </div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        <YakitButton
                                            loading={yaklangLoading}
                                            size='max'
                                            type='outline2'
                                            onClick={yaklangBreak}
                                        >{i18next.t("取消")}
                                        </YakitButton>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["hint-right-title"]}>{i18next.t("检测到引擎版本升级")}</div>
                                    <div className={styles["hint-right-content"]}>
                                        {/* {`当前版本：${currentYaklang}`}
                                        <br />
                                        {`最新版本：${latestYaklang}`} */}
                                        {i18next.t("Yaklang ${latestYaklang} 更新说明 :", { v1: latestYaklang })}
                                    </div>
                                    <div className={styles["hint-right-update-content"]}>
                                        {yaklangContent.length === 0
                                            ? i18next.t("管理员未编辑更新通知")
                                            : yaklangContent.map((item, index) => {
                                                  return <div key={`${item}-${index}`}>{item}</div>
                                              })}
                                    </div>

                                    <div className={styles["hint-right-btn"]}>
                                        <div>
                                            <YakitButton size='max' type='outline2' onClick={noHint}>{i18next.t("不再提示")}
                                            </YakitButton>
                                        </div>
                                        <div className={styles["btn-group-wrapper"]}>
                                            <YakitButton size='max' type='outline2' onClick={yaklangLater}>{i18next.t("稍后再说")}
                                            </YakitButton>
                                            <YakitButton size='max' onClick={yaklangDownload}>{i18next.t("立即更新")}
                                            </YakitButton>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
