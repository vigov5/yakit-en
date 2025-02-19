import React, {useEffect, useMemo, useRef, useState} from "react"
import {YakitLoadingSvgIcon, YakitThemeLoadingSvgIcon} from "./icon"
import {Dropdown, Progress} from "antd"
import {DownloadingState, YakitStatusType, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {outputToWelcomeConsole} from "@/components/layout/WelcomeConsoleUtil"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import {useGetState, useMemoizedFn} from "ahooks"
import {HelpSvgIcon, YaklangInstallHintSvgIcon} from "../layout/icons"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import Draggable from "react-draggable"
import type {DraggableEvent, DraggableData} from "react-draggable"
import {failed, info, success} from "@/utils/notification"
import {CheckIcon} from "@/assets/newIcon"
import {UpdateYakitAndYaklang} from "../layout/update/UpdateYakitAndYaklang"
import {InstallEngine, QuestionModal} from "../layout/update/InstallEngine"

import classNames from "classnames"
import styles from "./yakitLoading.module.scss"
import {getReleaseEditionName, isCommunityEdition, isEnpriTrace, isEnpriTraceAgent} from "@/utils/envfile"
import { RemoteLinkInfo } from "../layout/UILayout"
import { DynamicStatusProps } from "@/store"
import yakitSE from "@/assets/yakitSE.png";
import yakitEE from "@/assets/yakitEE.png";
import { useTranslation } from "react-i18next"
import i18next from "../../i18n";

const {ipcRenderer} = window.require("electron")

/** 首屏加载蒙层展示语 */
const LoadingTitle: string[] = [
    i18next.t("没有困难的工作，只有勇敢的打工人。"),
    i18next.t("打工累吗？累！但我不能哭，因为骑电动车擦眼泪不安全。"),
    i18next.t("打工不仅能致富，还能交友娶媳妇"),
    i18next.t("今天搬砖不狠，明天地位不稳"),
    i18next.t("打工可能会少活十年，不打工你一天也活不下去。"),
    i18next.t("有人相爱，有人夜里看海，有人七八个闹钟起不来，早安打工人!"),
    i18next.t("打工人，打工魂，打工人是人上人"),
    i18next.t("@所有人，据说用了Yakit后就不必再卷了！"),
    i18next.t("再不用Yakit，卷王就是别人的了"),
    i18next.t("来用Yakit啦？安全圈还是你最成功"),
    i18next.t("这届网安人，人手一个Yakit，香惨了！"),

    i18next.t("webfuzzer时根目录插入字典，会有意想不到的收获 ——是果实菌啊"),
    i18next.t("yakit写监听参数时不必写socks的版本号 ——是果实菌啊 "),
    i18next.t("使用热标签，可以中间处理des aes等加密，无需再碰py ——是果实菌啊"),
    i18next.t("Yakit，为您提供渗透问题的完美解决方案 ——酒零"),
    i18next.t("热加载fuzz快速定位，轻松挖洞无压力 ——k1115h0t"),
    i18next.t("别让无聊占据你的时间，来探索新世界吧！——Chelth"),
    i18next.t("<script>alert(‘Hello Yakit!’)</script> ——红炉点雪"),
    i18next.t("你的鼠标，掌控世界！——Chelth")
]

export const EngineModeVerbose = (m: YaklangEngineMode,n?:DynamicStatusProps) => {
    if(n&&n.isDynamicStatus){
        return i18next.t("控制模式")
    }
    switch (m) {
        // case "admin":
        //     return "管理权限"
        case "local":
            return i18next.t("本地模式")
        case "remote":
            return i18next.t("远程模式")
        default:
            return i18next.t("未知模式")
    }
}

export interface YakitLoadingProp {
    /** yakit模式 */
    yakitStatus: YakitStatusType
    // setYakitStatus: (type: YakitStatusType) => any
    yakitStatusCallback: (type: YakitStatusType) => any
    /** 引擎模式 */
    engineMode: YaklangEngineMode
    /** 是否完成初始化 */
    loading: boolean

    currentYakit: string
    latestYakit: string
    setLatestYakit: (val: string) => any
    currentYaklang: string
    latestYaklang: string
    setLatestYaklang: (val: string) => any

    localPort: number
    adminPort: number
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    showEngineLog: boolean
    setShowEngineLog: (flag: boolean) => any

    connectControl: () => any
    setRunRemote:(v:boolean) => void
}

export const YakitLoading: React.FC<YakitLoadingProp> = (props) => {
    const {
        yakitStatus,
        yakitStatusCallback,
        engineMode,
        loading,
        currentYakit,
        latestYakit,
        setLatestYakit,
        currentYaklang,
        latestYaklang,
        setLatestYaklang,
        showEngineLog,
        setShowEngineLog,
        onEngineModeChange,
        connectControl,
        setRunRemote
    } = props

    const [restartLoading, setRestartLoading] = useState<boolean>(false)

    const [system, setSystem] = useState<YakitSystem>("Darwin")

    /** 启动引擎倒计时 */
    const [__engineReady, setEngineReady, getEngineReady] = useGetState<number>(3)
    const readyTime = useRef<any>(null)
    /** 引擎日志展示倒计时 */
    const [__showLog, setShowLog, getShowLog] = useGetState<number>(0)
    const logTime = useRef<any>(null)
    const { t } = useTranslation()

    /** 计时器清除 */
    const engineTimeClear = (type: "log" | "ready") => {
        if (type === "log") {
            if (logTime.current) {
                clearInterval(logTime.current)
                logTime.current = null
            }
            setShowLog(0)
        }
        if (type === "ready") {
            if (readyTime.current) {
                clearInterval(readyTime.current)
                readyTime.current = null
            }
            setEngineReady(3)
        }
    }
    /** 计时器 */
    const engineTime = useMemoizedFn((type: "log" | "ready") => {
        engineTimeClear(type)

        setTimeout(() => {
            if (type === "log") {
                logTime.current = setInterval(() => {
                    setShowLog(getShowLog() + 1)
                    if (getShowLog() >= 5) {
                        clearInterval(logTime.current)
                        logTime.current = null
                    }
                }, 1000)
            }
            if (type === "ready") {
                readyTime.current = setInterval(() => {
                    setEngineReady(getEngineReady() - 1)
                    if (getEngineReady() <= 0) {
                        clearInterval(readyTime.current)
                        readyTime.current = null
                        ipcRenderer.invoke("engine-ready-link").finally(() => {
                            engineTime("log")
                        })
                    }
                }, 1000)
            }
        }, 100)
    })

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => setSystem(type))
    }, [])

    useEffect(() => {
        if (yakitStatus === "ready") {
            engineTime("ready")
        }
        if (yakitStatus === "error") {
            setTimeout(() => {
                skipTime()
            }, 300)
        }
        if (yakitStatus === "link") {
            setLatestYakit("")
            setLatestYaklang("")
        }
        if (yakitStatus === "break") {
            setEngineReady(0)
            clearInterval(readyTime.current)
            setShowLog(0)
        }

        return () => {
            engineTimeClear("log")
            engineTimeClear("ready")
        }
    }, [yakitStatus])

    const isShowUpdate = useMemo(() => {
        if (yakitStatus !== "ready") return false

        if (
            !!currentYakit &&
            !!latestYakit &&
            `v${currentYakit}` !== latestYakit &&
            getEngineReady() > 0 &&
            !!readyTime.current
        ) {
            setTimeout(() => {
                clearInterval(readyTime.current)
            }, 300)
            return true
        }

        if (
            !!currentYaklang &&
            !!latestYaklang &&
            currentYaklang !== latestYaklang &&
            getEngineReady() > 0 &&
            !!readyTime.current
        ) {
            setTimeout(() => {
                clearInterval(readyTime.current)
            }, 300)
            return true
        }

        return false
    }, [currentYakit, latestYakit, currentYaklang, latestYaklang, yakitStatus, readyTime.current])

    const selectEngineMode = useMemoizedFn((key: string) => {
        if (key === "remote" && onEngineModeChange) {
            engineTimeClear("ready")
            onEngineModeChange("remote")
        }
        if (key === "local") {
            ipcRenderer
                .invoke("start-local-yaklang-engine", {
                    port: props.localPort,
                    sudo: false,
                    isEnpriTraceAgent:isEnpriTraceAgent()
                })
                .then(() => {
                    outputToWelcomeConsole(i18next.t("手动引擎启动成功！"))
                    if (onEngineModeChange) {
                        onEngineModeChange(key, true)
                    }
                })
                .catch((e) => {
                    outputToWelcomeConsole(i18next.t("手动引擎启动失败！"))
                    outputToWelcomeConsole(i18next.t(`失败原因`) + `:${e}`)
                })
        }
    })

    /** i18next.t("跳过倒计时") */
    const skipTime = useMemoizedFn(() => {
        setEngineReady(0)
        clearInterval(readyTime.current)
        ipcRenderer.invoke("engine-ready-link").finally(() => {
            engineTime("log")
        })
    })
    /** 手动启动引擎 */
    const manuallyStartEngine = useMemoizedFn(() => {
        setRestartLoading(true)

        outputToWelcomeConsole(i18next.t("手动引擎启动成功！"))

        ipcRenderer.invoke("engine-ready-link")
        engineTime("log")
        setTimeout(() => {
            setRestartLoading(false)
        }, 1000)
    })

    /** 切换模式 */
    const changeMode = useMemoizedFn((val: boolean) => {
        if (val) clearInterval(readyTime.current)
        else {
            readyTime.current = setInterval(() => {
                setEngineReady(getEngineReady() - 1)
                if (getEngineReady() <= 0) {
                    clearInterval(readyTime.current)
                    readyTime.current = null
                    ipcRenderer.invoke("engine-ready-link").finally(() => {
                        engineTime("log")
                    })
                }
            }, 1000)
        }
    })

    const menu = useMemo(() => {
        return (
            <YakitMenu
                selectedKeys={[engineMode]}
                width={280}
                data={[
                    {
                        key: "local",
                        label:
                            engineMode === "local" ? (
                                <div className={styles["engine-mode-change-menu-item"]}>
                                    {i18next.t("本地模式")}
                                    <CheckIcon />
                                </div>
                            ) : (
                                i18next.t("本地模式")
                            )
                    },
                    {
                        key: "remote",
                        label:
                            engineMode === "remote" ? (
                                <div className={styles["engine-mode-change-menu-item"]}>
                                    {i18next.t("远程模式")}
                                    <CheckIcon />
                                </div>
                            ) : (
                                i18next.t("远程模式")
                            )
                    }
                ]}
                onClick={({key}) => {
                    if (key === engineMode && key === "local") return
                    selectEngineMode(key)
                }}
            />
        )
    }, [engineMode])

    const [isRefresh,setRefresh] = useState<boolean>(false)
    useEffect(()=>{
        // 自动远程连接
        if(yakitStatus === "control-remote"){
           connectControl() 
        }
    },[isRefresh])

    const refresh = () => {
        setRefresh(!isRefresh)
    }

    const goBack = () => {
        ipcRenderer
        .invoke("start-local-yaklang-engine", {
            port: props.localPort,
            sudo: false,
            isEnpriTraceAgent:isEnpriTraceAgent()
        })
        .then(() => {
            outputToWelcomeConsole(i18next.t("手动引擎启动成功！"))
            if (onEngineModeChange) {
                onEngineModeChange("local", true)
                setRunRemote(false)
            }
        })
        .catch((e) => {
            outputToWelcomeConsole(i18next.t("手动引擎启动失败！"))
            outputToWelcomeConsole(i18next.t(`失败原因`) + `:${e}`)
        })
    }

    const hintTitle = useMemo(() => {
        if (loading) {
            return <div className={styles["time-wait-title"]}>{i18next.t("软件加载中 ...")}</div>
        }
        if (yakitStatus === "ready") {
            if (__engineReady > 0) {
                return (
                    <div className={styles["time-wait-title"]}>
                        <span className={styles["time-link-title"]}>{`${__engineReady}s`}</span> {i18next.t("后自动连接引擎 ...")}
                    </div>
                )
            }
            if (__engineReady === 0 && __showLog < 5) {
                return <div className={styles["time-link-title"]}>{i18next.t("引擎连接中 ...")}</div>
            }
            if (__showLog >= 5) {
                return <div className={styles["time-out-title"]}>{i18next.t("连接超时 ...")}</div>
            }
            return <></>
        }
        if (yakitStatus === "error") {
            if (__showLog >= 5) {
                return <div className={styles["time-out-title"]}>{i18next.t("连接超时 ...")}</div>
            } else {
                return <div className={styles["time-link-title"]}>{i18next.t("尝试重新连接引擎中 ...")}</div>
            }
        }
        if (yakitStatus === "break") {
            if (__showLog === 0) {
                return <div className={styles["time-wait-title"]}>{i18next.t("请选择连接模式")}</div>
            }
            if (__showLog >= 5) {
                return <div className={styles["time-out-title"]}>{i18next.t("连接超时 ...")}</div>
            } else {
                return <div className={styles["time-link-title"]}>{i18next.t("引擎连接中 ...")}</div>
            }
        }

        return <></>
    }, [yakitStatus, loading, __engineReady, readyTime.current, __showLog, logTime.current])

    const btns = useMemo(() => {
        if(yakitStatus === "control-remote"){
            return <>
                <YakitButton className={styles["btn-style"]} size='max' onClick={refresh}>
                    {i18next.t("刷新")}
                </YakitButton>
                <YakitButton className={styles["btn-style"]} type='outline2' size='max' onClick={goBack}>
                    {i18next.t("返回")}
                </YakitButton>
            </>
        }
        if (yakitStatus === "ready") {
            if (__engineReady > 0) {
                return (
                    <>
                        <YakitButton className={styles["btn-style"]} size='max' disabled={loading} onClick={skipTime}>
                            {i18next.t("跳过倒计时")}
                        </YakitButton>

                        <Dropdown overlay={menu} placement='bottom' trigger={["click"]} onVisibleChange={changeMode}>
                            <YakitButton className={styles["btn-style"]} size='max' type='outline2' disabled={loading}>
                                {i18next.t("切换连接模式")}
                            </YakitButton>
                        </Dropdown>
                    </>
                )
            }
            if (__showLog >= 5) {
                return (
                    <>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            disabled={loading}
                            onClick={manuallyStartEngine}
                        >
                            {i18next.t("手动连接引擎")}
                        </YakitButton>
                        <Dropdown overlay={menu} placement='bottom' trigger={["click"]} onVisibleChange={changeMode}>
                            <YakitButton className={styles["btn-style"]} size='max' type='outline2' disabled={loading}>
                                {i18next.t("切换连接模式")}
                            </YakitButton>
                        </Dropdown>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            type='text'
                            onClick={() => setShowEngineLog(!showEngineLog)}
                        >
                            {showEngineLog ? i18next.t("隐藏日志") : i18next.t("查看日志")}
                        </YakitButton>
                    </>
                )
            }
            return <></>
        }

        if (yakitStatus === "error") {
            if (__showLog >= 5) {
                return (
                    <>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            disabled={loading}
                            onClick={manuallyStartEngine}
                        >
                            {i18next.t("手动连接引擎")}
                        </YakitButton>
                        <Dropdown overlay={menu} placement='bottom' trigger={["click"]} onVisibleChange={changeMode}>
                            <YakitButton className={styles["btn-style"]} size='max' type='outline2' disabled={loading}>
                                {i18next.t("切换连接模式")}
                            </YakitButton>
                        </Dropdown>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            type='text'
                            onClick={() => setShowEngineLog(!showEngineLog)}
                        >
                            {showEngineLog ? i18next.t("隐藏日志") : i18next.t("查看日志")}
                        </YakitButton>
                    </>
                )
            } else {
                return <></>
            }
        }

        if (yakitStatus === "break") {
            if (__showLog === 0) {
                return (
                    <>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            disabled={loading}
                            onClick={manuallyStartEngine}
                        >
                            {i18next.t("手动连接引擎")}
                        </YakitButton>
                        <Dropdown overlay={menu} placement='bottom' trigger={["click"]} onVisibleChange={changeMode}>
                            <YakitButton className={styles["btn-style"]} size='max' type='outline2' disabled={loading}>
                                {i18next.t("切换连接模式")}
                            </YakitButton>
                        </Dropdown>
                    </>
                )
            }
            if (__showLog >= 5) {
                return (
                    <>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            loading={restartLoading}
                            disabled={loading}
                            onClick={manuallyStartEngine}
                        >
                            {i18next.t("手动连接引擎")}
                        </YakitButton>
                        <Dropdown overlay={menu} placement='bottom' trigger={["click"]} onVisibleChange={changeMode}>
                            <YakitButton className={styles["btn-style"]} size='max' type='outline2' disabled={loading}>
                                {i18next.t("切换连接模式")}
                            </YakitButton>
                        </Dropdown>
                        <YakitButton
                            className={styles["btn-style"]}
                            size='max'
                            type='text'
                            onClick={() => setShowEngineLog(!showEngineLog)}
                        >
                            {showEngineLog ? i18next.t("隐藏日志") : i18next.t("查看日志")}
                        </YakitButton>
                    </>
                )
            } else {
                return <></>
            }
        }

        return <></>
    }, [
        yakitStatus,
        loading,
        __engineReady,
        readyTime.current,
        __showLog,
        logTime.current,
        skipTime,
        changeMode,
        manuallyStartEngine,
        menu,
        showEngineLog,
        restartLoading
    ])

    /** 加载页随机宣传语 */
    const loadingTitle = useMemo(() => LoadingTitle[Math.floor(Math.random() * (LoadingTitle.length - 0)) + 0], [])
    /** Title */
    const Title = useMemo(() => yakitStatus==="control-remote"?i18next.t("远程控制中 ..."):i18next.t("欢迎使用 ${getReleaseEditionName()}", {v1: getReleaseEditionName()}), [])
    
    return (
        <div className={styles["yakit-loading-wrapper"]}>
            <div className={styles["yakit-loading-body"]}>
                <div className={styles["body-content"]}>
                    <div className={styles["yakit-loading-title"]}>
                        <div className={styles["title-style"]}>{Title}</div>
                        {isCommunityEdition() && <div className={styles["subtitle-stlye"]}>{loadingTitle}</div>}
                    </div>

                    {/* 社区版 - 启动Logo */}
                    {isCommunityEdition() && <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["theme-icon-wrapper"]}>
                            <div className={styles["theme-icon"]}>
                                <YakitThemeLoadingSvgIcon />
                            </div>
                        </div>
                        <div className={styles["white-icon"]}>
                            <YakitLoadingSvgIcon />
                        </div>
                    </div>}
                    {/* 企业版 - 启动Logo */}
                    {
                        isEnpriTrace()&& <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <img src={yakitEE} alt={i18next.t("暂无图片")} />
                        </div>
                    </div>
                    }
                    {/* 便携版 - 启动Logo */}
                    {
                        isEnpriTraceAgent()&& <div className={styles["yakit-loading-icon-wrapper"]}>
                        <div className={styles["white-icon"]}>
                            <img src={yakitSE} alt={i18next.t("暂无图片")} />
                        </div>
                    </div>
                    }

                    <div className={styles["yakit-loading-content"]}>
                        {hintTitle}
                        <div className={styles["engine-log-btn"]}>{btns}</div>
                    </div>
                </div>
            </div>

            <DownloadYaklang
                system={system}
                visible={yakitStatus === "update"}
                onCancel={() => yakitStatusCallback("update")}
            />

            <InstallEngine
                visible={yakitStatus === "install"}
                system={system}
                onSuccess={() => yakitStatusCallback("install")}
                onRemoreLink={() => selectEngineMode("remote")}
            />

            <UpdateYakitAndYaklang
                currentYakit={currentYakit}
                latestYakit={latestYakit}
                setLatestYakit={setLatestYakit}
                currentYaklang={currentYaklang}
                latestYaklang={latestYaklang}
                setLatestYaklang={setLatestYaklang}
                isShow={isShowUpdate}
                onCancel={() => yakitStatusCallback("update")}
            />

            <DatabaseErrorHint visible={yakitStatus === "database"} onSuccess={() => yakitStatusCallback("database")} />
        </div>
    )
}

interface YakitControlLoadingProp{
    localPort: number
    onEngineModeChange: (mode: YaklangEngineMode, keepalive?: boolean) => any
    onSubmit: () => any
}

export const YakitControlLoading: React.FC<YakitControlLoadingProp> = (props) => {
    const {localPort,onEngineModeChange,onSubmit} = props
    const [isRefresh,setRefresh] = useState<boolean>(false)
    useEffect(()=>{
        // 自动远程连接
        onSubmit()
    },[isRefresh])

    const refresh = () => {
        setRefresh(!isRefresh)
    }

    const goBack = () => {
        ipcRenderer
        .invoke("start-local-yaklang-engine", {
            port: localPort,
            sudo: false,
            isEnpriTraceAgent:isEnpriTraceAgent()
        })
        .then(() => {
            outputToWelcomeConsole(i18next.t("手动引擎启动成功！"))
            if (onEngineModeChange) {
                onEngineModeChange("local", true)
            }
        })
        .catch((e) => {
            outputToWelcomeConsole(i18next.t("手动引擎启动失败！"))
            outputToWelcomeConsole(i18next.t(`失败原因`)+`:${e}`)
        })
    }
    return <div className={styles["yakit-loading-wrapper"]}>
    <div className={styles["yakit-loading-body"]}>
        <div className={styles["body-content"]}>
            <div className={styles["yakit-loading-title"]}>
                <div className={styles["title-style"]}>{i18next.t("远程控制中 ...")}</div>
            </div>

            <div className={styles["yakit-loading-icon-wrapper"]}>
                <div className={styles["theme-icon-wrapper"]}>
                    <div className={styles["theme-icon"]}>
                        <YakitThemeLoadingSvgIcon />
                    </div>
                </div>
                <div className={styles["white-icon"]}>
                    <YakitLoadingSvgIcon />
                </div>
            </div>

            <div className={styles["yakit-loading-content"]}>
                {/* <div className={styles["time-wait-title"]}>{i18next.t("远程控制中 ...")}</div> */}
                <div className={styles["engine-log-btn"]}>
                        <YakitButton className={styles["btn-style"]} size='max' onClick={refresh}>
                            {i18next.t("刷新")}
                        </YakitButton>
                        <YakitButton className={styles["btn-style"]} type='outline2' size='max' onClick={goBack}>
                            {i18next.t("返回")}
                        </YakitButton>
                </div>
            </div>
        </div>
    </div>
</div>
}
interface DownloadYaklangProps {
    system: YakitSystem
    visible: boolean
    onCancel: () => any
}

/** @name Yaklang引擎更新下载弹窗 */
const DownloadYaklang: React.FC<DownloadYaklangProps> = React.memo((props) => {
    const {system, visible, onCancel} = props

    /** 常见问题弹窗是否展示 */
    const [qsShow, setQSShow] = useState<boolean>(false)

    /** 是否置顶 */
    const [isTop, setIsTop] = useState<0 | 1 | 2>(0)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** 远端最新yaklang引擎版本 */
    const [latestVersion, setLatestVersion, getLatestVersion] = useGetState("")
    /** 下载进度条数据 */
    const [downloadProgress, setDownloadProgress, getDownloadProgress] = useGetState<DownloadingState>()

    const [loading, setLoading] = useState<boolean>(false)
    // 是否中断下载进程
    const isBreakRef = useRef<boolean>(false)
    // 执行中途是否失败
    const [__isFailed, setIsFailed, getIsFailed] = useGetState<boolean>(false)

    const fetchVersion = useMemoizedFn(() => {
        setIsFailed(false)
        setDownloadProgress(undefined)

        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => setLatestVersion(data))
            .catch((e: any) => {
                if (isBreakRef.current) return
                failed(i18next.t(`获取引擎最新版本失败`) + ` ${e}`)
                setIsFailed(true)
            })
            .finally(() => {
                if (isBreakRef.current) return
                if (getIsFailed()) return

                ipcRenderer
                    .invoke("download-latest-yak", getLatestVersion())
                    .then(() => {
                        if (isBreakRef.current) return

                        success(i18next.t("下载完毕"))
                        if (!getDownloadProgress()?.size) return
                        setDownloadProgress({
                            time: {
                                elapsed: downloadProgress?.time.elapsed || 0,
                                remaining: 0
                            },
                            speed: 0,
                            percent: 100,
                            // @ts-ignore
                            size: getDownloadProgress().size
                        })
                        onUpdate()
                    })
                    .catch((e: any) => {
                        if (isBreakRef.current) return
                        failed(i18next.t(`引擎下载失败`) + `: ${e}`)
                        setDownloadProgress(undefined)
                        setIsFailed(true)
                    })
            })
    })

    /**
     * 1. 获取最新引擎版本号(版本号内带有'v'字符)，并下载
     * 2. 监听本地下载引擎进度数据
     */
    useEffect(() => {
        if (visible) {
            isBreakRef.current = false
            fetchVersion()

            ipcRenderer.on("download-yak-engine-progress", (e: any, state: DownloadingState) => {
                if (isBreakRef.current) return
                setDownloadProgress(state)
            })

            return () => {
                ipcRenderer.removeAllListeners("download-yak-engine-progress")
            }
        } else {
            isBreakRef.current = true
        }
    }, [visible])

    /** 立即更新 */
    const onUpdate = useMemoizedFn(() => {
        if (isBreakRef.current) return
        ipcRenderer
            .invoke("install-yak-engine", latestVersion)
            .then(() => {
                success(i18next.t("安装成功，如未生效，重启 ${getReleaseEditionName()} 即可", {v1: getReleaseEditionName()}))
            })
            .catch((err: any) => {
                failed(i18next.t(`安装失败`) + `: ${err.message.indexOf("operation not permitted") > -1 ? i18next.t("请关闭引擎后重试") : err}`)
            })
            .finally(() => {
                onInstallClose()
                setTimeout(() => {
                    onCancel()
                }, 100)
            })
    })

    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    /** i18next.t("取消")下载事件 */
    const onInstallClose = useMemoizedFn(() => {
        isBreakRef.current = true
        setDownloadProgress(undefined)
        setQSShow(false)
    })

    return (
        <div className={visible ? styles["yakit-modal-mask"] : styles["hidden-yakit-modal-mask"]}>
            <Draggable
                defaultClassName={classNames(styles["yaklang-update-modal"], styles["hint-modal-wrapper"], {
                    [styles["modal-top-wrapper"]]: isTop === 0
                })}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]} onClick={() => setIsTop(0)}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                                onMouseDown={() => setIsTop(0)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                                <div
                                    className={styles["qs-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setQSShow(true)
                                        setIsTop(2)
                                    }}
                                >
                                    <HelpSvgIcon style={{fontSize: 20}} />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-download"]}>
                                    <div className={styles["hint-right-title"]}>{i18next.t("Yaklang 引擎下载中...")}</div>
                                    <div className={styles["download-progress"]}>
                                        <Progress
                                            strokeColor='#F28B44'
                                            trailColor='#F0F2F5'
                                            percent={Math.floor((downloadProgress?.percent || 0) * 100)}
                                        />
                                    </div>
                                    <div className={styles["download-info-wrapper"]}>
                                        <div>{i18next.t("剩余时间 :")} {(downloadProgress?.time.remaining || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("耗时 :")} {(downloadProgress?.time.elapsed || 0).toFixed(2)}s</div>
                                        <div className={styles["divider-wrapper"]}>
                                            <div className={styles["divider-style"]}></div>
                                        </div>
                                        <div>{i18next.t("下载速度 :")} {((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s</div>
                                    </div>
                                    <div className={styles["download-btn"]}>
                                        {__isFailed && (
                                            <YakitButton size='max' type='outline2' onClick={() => fetchVersion()}>
                                                {i18next.t("重试")}
                                            </YakitButton>
                                        )}
                                        <YakitButton
                                            loading={loading}
                                            size='max'
                                            type='outline2'
                                            onClick={() => {
                                                setLoading(true)
                                                onInstallClose()
                                                setTimeout(() => {
                                                    setLoading(false)
                                                    onCancel()
                                                }, 100)
                                            }}
                                        >
                                            {i18next.t("取消")}
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
            <QuestionModal isTop={isTop} setIsTop={setIsTop} system={system} visible={qsShow} setVisible={setQSShow} />
        </div>
    )
})

interface DatabaseErrorHintProps {
    visible: boolean
    onSuccess: () => any
}

/** @name 数据库权限不足提示弹窗 */
const DatabaseErrorHint: React.FC<DatabaseErrorHintProps> = React.memo((props) => {
    const {visible, onSuccess} = props

    const [loading, setLoading] = useState<boolean>(false)

    const [disabled, setDisabled] = useState(true)
    const [bounds, setBounds] = useState({left: 0, top: 0, bottom: 0, right: 0})
    const draggleRef = useRef<HTMLDivElement>(null)

    /** i18next.t("立即修复") */
    const onRestart = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer
            .invoke("fix-local-database")
            .then((e) => {
                info(i18next.t("修复成功"))
                onSuccess()
            })
            .catch((e) => {
                failed(i18next.t(`修复数据库权限错误`) + `：${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    /** 弹窗拖拽移动触发事件 */
    const onStart = useMemoizedFn((_event: DraggableEvent, uiData: DraggableData) => {
        const {clientWidth, clientHeight} = window.document.documentElement
        const targetRect = draggleRef.current?.getBoundingClientRect()
        if (!targetRect) return

        setBounds({
            left: -targetRect.left + uiData.x,
            right: clientWidth - (targetRect.right - uiData.x),
            top: -targetRect.top + uiData.y + 36,
            bottom: clientHeight - (targetRect.bottom - uiData.y)
        })
    })

    return (
        <div className={visible ? styles["yakit-modal-mask"] : styles["hidden-yakit-modal-mask"]}>
            <Draggable
                defaultClassName={classNames(styles["yaklang-update-modal"], styles["hint-modal-wrapper"], [
                    styles["modal-top-wrapper"]
                ])}
                disabled={disabled}
                bounds={bounds}
                onStart={(event, uiData) => onStart(event, uiData)}
            >
                <div ref={draggleRef}>
                    <div className={styles["modal-yaklang-engine-hint"]}>
                        <div className={styles["yaklang-engine-hint-wrapper"]}>
                            <div
                                className={styles["hint-draggle-body"]}
                                onMouseEnter={() => {
                                    if (disabled) setDisabled(false)
                                }}
                                onMouseLeave={() => setDisabled(true)}
                            ></div>

                            <div className={styles["hint-left-wrapper"]}>
                                <div className={styles["hint-icon"]}>
                                    <YaklangInstallHintSvgIcon />
                                </div>
                            </div>

                            <div className={styles["hint-right-wrapper"]}>
                                <div className={styles["hint-right-title"]}>{i18next.t("yaklang 数据库错误")}</div>
                                <div className={styles["hint-right-content"]}>
                                    {i18next.t("尝试修复数据库写权限（可能要求 ROOT 权限）")}
                                </div>

                                <div className={styles["hint-right-btn"]}>
                                    <div></div>
                                    <div className={styles["btn-group-wrapper"]}>
                                        <YakitButton size='max' loading={loading} onClick={onRestart}>
                                            {i18next.t("立即修复")}
                                        </YakitButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Draggable>
        </div>
    )
})
