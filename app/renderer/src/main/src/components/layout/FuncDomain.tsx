import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Modal, Tooltip, Avatar, Upload, Spin, Progress, Form} from "antd"
import {
    BellSvgIcon,
    RiskStateSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useCreation, useMemoizedFn} from "ahooks"
import {showModal} from "@/utils/showModal"
import {LoadYakitPluginForm} from "@/pages/yakitStore/YakitStorePage"
import {failed, info, success, yakitFailed, warn, yakitNotify} from "@/utils/notification"
import {ConfigPrivateDomain} from "../ConfigPrivateDomain/ConfigPrivateDomain"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitSettingCallbackType, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {showConfigEngineProxyForm} from "@/utils/ConfigEngineProxy"
import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import Login from "@/pages/Login"
import {useStore, yakitDynamicStatus} from "@/store"
import {defaultUserInfo, MenuItemType, SetUserInfo} from "@/pages/MainOperator"
import {DropdownMenu} from "../baseTemplate/DropdownMenu"
import {loginOut} from "@/utils/login"
import {UserPlatformType} from "@/pages/globalVariable"
import SetPassword from "@/pages/SetPassword"
import SelectUpload from "@/pages/SelectUpload"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "../yakitUI/YakitMenu/YakitMenu"
import {
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseEdition,
    showDevTool
} from "@/utils/envfile"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {showPcapPermission} from "@/utils/ConfigPcapPermission"
import {migrateLegacyDatabase} from "@/utils/ConfigMigrateLegacyDatabase"
import {GithubSvgIcon, PencilAltIcon, TerminalIcon, CameraIcon} from "@/assets/newIcon"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {addToTab} from "@/pages/MainTabs"
import {DatabaseUpdateModal} from "@/pages/cve/CVETable"
import {ExclamationCircleOutlined, InboxOutlined, LoadingOutlined} from "@ant-design/icons"
import {DynamicControl, SelectControlType, ControlMyself, ControlOther} from "../../pages/dynamicControl/DynamicControl"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {MacKeyborad, WinKeyborad} from "../yakitUI/YakitEditor/editorUtils"
import {ScrecorderModal} from "@/pages/screenRecorder/ScrecorderModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitRoute} from "@/routes/newRoute"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {RcFile} from "antd/lib/upload"
import {useRunNodeStore} from "@/store/runNode"
import {Uint8ArrayToString} from "@/utils/str"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./funcDomain.module.scss"
import yakitImg from "../../assets/yakit.jpg"
import {onImportPlugin} from "@/pages/fuzzer/components/ShareImport"
import { useTemporaryProjectStore } from "@/store/temporaryProject"
import i18next from "../../i18n"


const {ipcRenderer} = window.require("electron")
const {Dragger} = Upload

export const judgeDynamic = (userInfo, avatarColor: string, active: boolean, dynamicConnect: boolean) => {
    const {companyHeadImg, companyName} = userInfo
    // 点击且已被远程控制
    const activeConnect: boolean = active && dynamicConnect
    return (
        <div
            className={classNames(styles["judge-avatar"], {
                [styles["judge-avatar-active"]]: activeConnect,
                [styles["judge-avatar-connect"]]: dynamicConnect
            })}
        >
            <div>
                {companyHeadImg && !!companyHeadImg.length ? (
                    <Avatar size={20} style={{cursor: "pointer"}} src={companyHeadImg} />
                ) : (
                    <Avatar
                        size={20}
                        style={activeConnect ? {} : {backgroundColor: avatarColor}}
                        className={classNames(styles["judge-avatar-avatar"], {
                            [styles["judge-avatar-active-avatar"]]: activeConnect
                        })}
                    >
                        {companyName && companyName.slice(0, 1)}
                    </Avatar>
                )}
            </div>
            {dynamicConnect && (
                <div
                    className={classNames(styles["judge-avatar-text"], {[styles["judge-avatar-active-text"]]: active})}
                >
                    {i18next.t("远程中")}
                </div>
            )}
        </div>
    )
}

/** 随机头像颜色 */
const randomAvatarColor = () => {
    const colorArr: string[] = ["#8863F7", "#DA5FDD", "#4A94F8", "#35D8EE", "#56C991", "#F4736B", "#FFB660", "#B4BBCA"]
    let color: string = colorArr[Math.round(Math.random() * 7)]
    return color
}

export interface UploadYakitEEProps {
    onClose: () => void
}

export const UploadYakitEE: React.FC<UploadYakitEEProps> = (props) => {
    const {onClose} = props
    const [filePath, setFilePath] = useState<RcFile>()
    const [loading, setLoading] = useState<boolean>(false)
    const [percent, setPercent] = useState(0)

    const suffixFun = (file_name: string) => {
        let file_index = file_name.lastIndexOf(".")
        return file_name.slice(file_index, file_name.length)
    }

    useEffect(() => {
        ipcRenderer.on("call-back-upload-yakit-ee", async (e, res: any) => {
            const {progress} = res
            setPercent(progress)
        })
        return () => {
            ipcRenderer.removeAllListeners("call-back-upload-yakit-ee")
        }
    }, [])

    const uploadYakitEEPackage = useMemoizedFn(async () => {
        setLoading(true)
        // @ts-ignore
        const {path, size} = filePath
        await ipcRenderer
            .invoke("yak-install-package", {path, size})
            .then((TaskStatus) => {
                if (TaskStatus) {
                    success(i18next.t("上传成功"))
                    setPercent(100)
                    setTimeout(() => {
                        onClose()
                    }, 1000)
                }
            })
            .catch((err) => {
                console.log(i18next.t("文件上传失败"), err)
                setFilePath(undefined)
                failed(i18next.t("文件上传失败：${err}", { v1: err }))
                setTimeout(() => {
                    setLoading(false)
                    setPercent(0)
                }, 1000)
            })
    })

    const cancleUpload = () => {
        ipcRenderer.invoke("yak-cancle-upload-package").then(() => {
            warn(i18next.t("取消上传成功"))
            setLoading(false)
            setPercent(0)
        })
    }
    return (
        <div className={styles["upload-yakit-ee"]}>
            <div style={{marginBottom: 8}}>{i18next.t("选择zip压缩文件进行上传")}</div>
            <Spin spinning={loading}>
                <Dragger
                    multiple={false}
                    maxCount={1}
                    showUploadList={false}
                    accept={".zip"}
                    beforeUpload={(f) => {
                        const file_name = f.name
                        const suffix = suffixFun(file_name)
                        if (![".zip"].includes(suffix)) {
                            warn(i18next.t("上传文件格式错误，请重新上传"))
                            return false
                        }
                        setFilePath(f)
                        return false
                    }}
                >
                    <p className='ant-upload-drag-icon'>
                        <InboxOutlined />
                    </p>
                    <p className='ant-upload-text'>{filePath ? filePath.name : i18next.t("拖拽文件到框内或点击上传")}</p>
                </Dragger>
            </Spin>
            {loading && <Progress percent={percent} status='active' />}
            <div style={{textAlign: "center", marginTop: 16}}>
                {loading ? (
                    <YakitButton
                        className={styles["btn-style"]}
                        onClick={() => {
                            cancleUpload()
                        }}
                    >
                        {i18next.t("取消")}
                    </YakitButton>
                ) : (
                    <YakitButton
                        className={styles["btn-style"]}
                        type='primary'
                        disabled={!filePath}
                        onClick={() => {
                            uploadYakitEEPackage()
                        }}
                    >
                        {i18next.t("确定")}
                    </YakitButton>
                )}
            </div>
        </div>
    )
}

export interface FuncDomainProp {
    isEngineLink: boolean
    isReverse?: Boolean
    engineMode: YaklangEngineMode
    isRemoteMode: boolean
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
    /** 远程控制 - 自动切换远程连接 */
    runDynamicControlRemote: (v: string, url: string) => void
    /** 当前是否验证License/登录 */
    isJudgeLicense: boolean

    /** @name 当前是否展示项目管理页面 */
    showProjectManage?: boolean
    /** @name 操作系统类型 */
    system: YakitSystem
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {
        isEngineLink,
        isReverse = false,
        engineMode,
        isRemoteMode,
        onEngineModeChange,
        runDynamicControlRemote,
        typeCallback,
        showProjectManage = false,
        system,
        isJudgeLicense
    } = props

    /** 登录用户信息 */
    const {userInfo, setStoreUserInfo} = useStore()

    const [loginShow, setLoginShow] = useState<boolean>(false)
    /** 用户功能菜单 */
    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {title: i18next.t("退出登录"), key: "sign-out"}
        // {title: "帐号绑定(监修)", key: "account-bind"}
    ])
    /** 修改密码弹框 */
    const [passwordShow, setPasswordShow] = useState<boolean>(false)
    /** 是否允许密码框关闭 */
    const [passwordClose, setPasswordClose] = useState<boolean>(true)
    /** 上传数据弹框 */
    const [uploadModalShow, setUploadModalShow] = useState<boolean>(false)

    /** 发起远程弹框 受控端 - 控制端 */
    const [dynamicControlModal, setDynamicControlModal] = useState<boolean>(false)
    const [controlMyselfModal, setControlMyselfModal] = useState<boolean>(false)
    const [controlOtherModal, setControlOtherModal] = useState<boolean>(false)
    const [dynamicMenuOpen, setDynamicMenuOpen] = useState<boolean>(false)
    /** 当前远程连接状态 */
    const {dynamicStatus} = yakitDynamicStatus()
    const [dynamicConnect] = useState<boolean>(dynamicStatus.isDynamicStatus)
    let avatarColor = useRef<string>(randomAvatarColor())

    useEffect(() => {
        const SetUserInfoModule = () => (
            <SetUserInfo userInfo={userInfo} avatarColor={avatarColor.current} setStoreUserInfo={setStoreUserInfo} />
        )
        const LoginOutBox = () => <div className={styles["login-out-component"]}>{i18next.t("退出登录")}</div>
        // 非企业管理员登录
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "plugin-aduit", title: i18next.t("插件管理")},
                {key: "sign-out", title: i18next.t("退出登录"), render: () => LoginOutBox()}
            ])
        }
        // 非企业超级管理员登录
        else if (userInfo.role === "superAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: i18next.t("用户管理")},
                {key: "license-admin", title: i18next.t("License管理")},
                {key: "plugin-aduit", title: i18next.t("插件管理")},
                {key: "sign-out", title: i18next.t("退出登录"), render: () => LoginOutBox()}
            ])
        }
        // 非企业license管理员
        else if (userInfo.role === "licenseAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "license-admin", title: i18next.t("License管理")},
                {key: "sign-out", title: i18next.t("退出登录"), render: () => LoginOutBox()}
            ])
        }
        // 企业用户管理员登录
        else if (userInfo.role === "admin" && userInfo.platform === "company") {
            let cacheMenu = (() => {
                if (isEnpriTraceAgent()) {
                    return [
                        {key: "user-info", title: i18next.t("用户信息"), render: () => SetUserInfoModule()},
                        {key: "hole-collect", title: i18next.t("漏洞汇总")},
                        {key: "role-admin", title: i18next.t("角色管理")},
                        {key: "account-admin", title: i18next.t("用户管理")},
                        {key: "set-password", title: i18next.t("修改密码")},
                        {key: "plugin-aduit", title: i18next.t("插件管理")},
                        {key: "sign-out", title: i18next.t("退出登录"), render: () => LoginOutBox()}
                    ]
                }
                let cacheMenu = [
                    {key: "user-info", title: i18next.t("用户信息"), render: () => SetUserInfoModule()},
                    {key: "upload-data", title: i18next.t("上传数据")},
                    {key: "dynamic-control", title: i18next.t("发起远程")},
                    {key: "control-admin", title: i18next.t("远程管理")},
                    {key: "close-dynamic-control", title: i18next.t("退出远程")},
                    {key: "role-admin", title: i18next.t("角色管理")},
                    {key: "account-admin", title: i18next.t("用户管理")},
                    {key: "set-password", title: i18next.t("修改密码")},
                    {key: "upload-yakit-ee", title: i18next.t("上传安装包")},
                    {key: "plugin-aduit", title: i18next.t("插件管理")},
                    {key: "sign-out", title: i18next.t("退出登录"), render: () => LoginOutBox()}
                ]
                // 远程中时不显示发起远程 显示退出远程
                if (dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
                }
                // 非远程控制时显示发起远程 不显示退出远程
                if (!dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
                }
                return cacheMenu
            })()
            setUserMenu(cacheMenu)
        }
        // 企业用户非管理员登录
        else if (userInfo.role !== "admin" && userInfo.platform === "company") {
            let cacheMenu = [
                {key: "user-info", title: i18next.t("用户信息"), render: () => SetUserInfoModule()},
                {key: "upload-data", title: i18next.t("上传数据")},
                {key: "dynamic-control", title: i18next.t("发起远程")},
                {key: "close-dynamic-control", title: i18next.t("退出远程")},
                {key: "set-password", title: i18next.t("修改密码")},
                {key: "plugin-aduit", title: i18next.t("插件管理")},
                {key: "sign-out", title: i18next.t("退出登录")}
            ]
            if(!userInfo.checkPlugin){
                cacheMenu = cacheMenu.filter((item) => item.key !== "plugin-aduit")
            }
            if (isEnpriTraceAgent()) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "upload-data")
            }
            // 远程中时不显示发起远程 显示退出远程
            if (dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
            }
            // 非远程控制时显示发起远程 不显示退出远程
            if (!dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
            }
            setUserMenu(cacheMenu)
        } else {
            setUserMenu([{key: "sign-out", title: i18next.t("退出登录")}])
        }
    }, [userInfo.role, userInfo.checkPlugin, userInfo.companyHeadImg, dynamicConnect])

    /** 渲染端通信-打开一个指定页面 */
    const onOpenPage = useMemoizedFn((info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })

    const {screenRecorderInfo, setRecording} = useScreenRecorder()
    useEffect(() => {
        ipcRenderer.on(`${screenRecorderInfo.token}-data`, async (e, data) => {})
        ipcRenderer.on(`${screenRecorderInfo.token}-error`, (e, error) => {
            setRecording(false)
        })
        ipcRenderer.on(`${screenRecorderInfo.token}-end`, (e, data) => {
            setRecording(false)
        })
        return () => {
            setRecording(false)
            ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-data`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-error`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-end`)
        }
    }, [screenRecorderInfo.token])
    useEffect(() => {
        ipcRenderer.on("open-screenCap-modal", async (e) => {
            openScreenRecorder()
        })
        return () => {
            ipcRenderer.removeAllListeners("open-screenCap-modal")
        }
    }, [])

    const openScreenRecorder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                if (data.Ok) {
                    const m = showYakitModal({
                        title: i18next.t("录屏须知"),
                        footer: null,
                        type: "white",
                        width: 520,
                        content: (
                            <ScrecorderModal
                                onClose={() => {
                                    m.destroy()
                                }}
                                token={screenRecorderInfo.token}
                                onStartCallback={() => {
                                    setRecording(true)
                                    m.destroy()
                                }}
                            />
                        )
                    })
                } else {
                    addToTab("**screen-recorder")
                }
            })
            .catch((err) => {
                yakitFailed(i18next.t("IsScrecorderReady失败:") + err)
            })
    })

    useEffect(() => {
        // ipc通信退出登录
        ipcRenderer.on("ipc-sign-out-callback", async (e) => {
            setStoreUserInfo(defaultUserInfo)
            loginOut(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("ipc-sign-out-callback")
        }
    }, [])

    useEffect(() => {
        // 强制修改密码
        ipcRenderer.on("reset-password-callback", async (e) => {
            setPasswordShow(true)
            setPasswordClose(false)
        })
        return () => {
            ipcRenderer.removeAllListeners("reset-password-callback")
        }
    }, [])

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classNames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                {showDevTool() && <UIDevTool />}

                <ScreenAndScreenshot
                    system={system}
                    token={screenRecorderInfo.token}
                    isRecording={screenRecorderInfo.isRecording}
                />

                {!showProjectManage && (
                    <div
                        className={styles["ui-op-btn-wrapper"]}
                        onClick={() => {
                            getLocalValue(RemoteGV.ShowBaseConsole).then((val: boolean) => {
                                if (!val) {
                                    typeCallback("console")
                                }
                            })
                        }}
                    >
                        <div className={styles["op-btn-body"]}>
                            <Tooltip placement='bottom' title={i18next.t("引擎Console")}>
                                <TerminalIcon className={classNames(styles["icon-style"], styles["size-style"])} />
                            </Tooltip>
                        </div>
                    </div>
                )}

                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    {!showProjectManage && <UIOpRisk isEngineLink={isEngineLink} />}
                    <UIOpNotice isEngineLink={isEngineLink} isRemoteMode={isRemoteMode} />
                    {!showProjectManage && (
                        <UIOpSetting
                            engineMode={engineMode}
                            onEngineModeChange={onEngineModeChange}
                            typeCallback={typeCallback}
                        />
                    )}
                </div>
                {!showProjectManage && !isJudgeLicense && (
                    <>
                        <div className={styles["divider-wrapper"]}></div>
                        <div
                            className={classNames(styles["user-wrapper"], {
                                [styles["user-wrapper-dynamic"]]: dynamicConnect
                            })}
                        >
                            {userInfo.isLogin ? (
                                <div
                                    className={classNames({
                                        [styles["user-info"]]: !dynamicConnect,
                                        [styles["user-info-dynamic"]]: dynamicConnect
                                    })}
                                >
                                    <DropdownMenu
                                        menu={{
                                            data: userMenu
                                        }}
                                        dropdown={{
                                            placement: "bottomCenter",
                                            trigger: ["click"],
                                            overlayClassName: "user-dropdown-menu-box",
                                            onVisibleChange: (value: boolean) => {
                                                setDynamicMenuOpen(value)
                                            }
                                        }}
                                        onClick={(key) => {
                                            setDynamicMenuOpen(false)
                                            if (key === "sign-out") {
                                                if (
                                                    dynamicStatus.isDynamicStatus ||
                                                    dynamicStatus.isDynamicSelfStatus
                                                ) {
                                                    Modal.confirm({
                                                        title: i18next.t("温馨提示"),
                                                        icon: <ExclamationCircleOutlined />,
                                                        content: i18next.t("点击退出登录将自动退出远程控制，是否确认退出"),
                                                        cancelText: i18next.t("取消"),
                                                        okText: i18next.t("退出"),
                                                        onOk() {
                                                            if (dynamicStatus.isDynamicStatus) {
                                                                ipcRenderer.invoke("lougin-out-dynamic-control", {
                                                                    loginOut: true
                                                                })
                                                            }
                                                            if (dynamicStatus.isDynamicSelfStatus) {
                                                                ipcRenderer
                                                                    .invoke("kill-dynamic-control")
                                                                    .finally(() => {
                                                                        setStoreUserInfo(defaultUserInfo)
                                                                        loginOut(userInfo)
                                                                        setTimeout(() => success(i18next.t("已成功退出账号")), 500)
                                                                    })
                                                                // 立即退出界面
                                                                ipcRenderer.invoke("lougin-out-dynamic-control-page")
                                                            }
                                                        },
                                                        onCancel() {}
                                                    })
                                                } else {
                                                    setStoreUserInfo(defaultUserInfo)
                                                    loginOut(userInfo)
                                                    setTimeout(() => success(i18next.t("已成功退出账号")), 500)
                                                }
                                            }
                                            if (key === "trust-list") {
                                                onOpenPage({route: YakitRoute.TrustListPage})
                                            }
                                            if (key === "set-password") {
                                                setPasswordClose(true)
                                                setPasswordShow(true)
                                            }
                                            if (key === "upload-data") setUploadModalShow(true)
                                            if (key === "upload-yakit-ee") {
                                                const m = showYakitModal({
                                                    title: i18next.t("上传安装包"),
                                                    width: 450,
                                                    footer: null,
                                                    centered: true,
                                                    content: (
                                                        <UploadYakitEE
                                                            onClose={() => {
                                                                m.destroy()
                                                            }}
                                                        />
                                                    )
                                                })
                                            }
                                            if (key === "role-admin") {
                                                onOpenPage({route: YakitRoute.RoleAdminPage})
                                            }
                                            if (key === "account-admin") {
                                                onOpenPage({route: YakitRoute.AccountAdminPage})
                                            }
                                            if (key === "license-admin") {
                                                onOpenPage({route: YakitRoute.LicenseAdminPage})
                                            }
                                            if (key === "plugin-aduit") {
                                                onOpenPage({route: YakitRoute.Plugin_Audit})
                                            }
                                            if (key === "hole-collect") {
                                                onOpenPage({route: YakitRoute.HoleCollectPage})
                                            }
                                            if (key === "control-admin") {
                                                onOpenPage({route: YakitRoute.ControlAdminPage})
                                            }
                                            if (key === "dynamic-control") {
                                                setDynamicControlModal(true)
                                            }
                                            if (key === "close-dynamic-control") {
                                                ipcRenderer.invoke("lougin-out-dynamic-control", {loginOut: false})
                                            }
                                        }}
                                    >
                                        {userInfo.platform === "company" ? (
                                            judgeDynamic(userInfo, avatarColor.current, dynamicMenuOpen, dynamicConnect)
                                        ) : (
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg
                                                }
                                                style={{width: 24, height: 24, borderRadius: "50%"}}
                                            />
                                        )}
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className={styles["user-show"]} onClick={() => setLoginShow(true)}>
                                    <UnLoginSvgIcon />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {loginShow && <Login visible={loginShow} onCancel={() => setLoginShow(false)} />}
            <Modal
                visible={passwordShow}
                closable={passwordClose}
                title={i18next.t("修改密码")}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setPasswordShow(false)}
                footer={null}
            >
                <SetPassword onCancel={() => setPasswordShow(false)} userInfo={userInfo} />
            </Modal>

            <Modal
                visible={uploadModalShow}
                title={i18next.t("上传数据")}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setUploadModalShow(false)}
                footer={null}
            >
                <SelectUpload onCancel={() => setUploadModalShow(false)} />
            </Modal>

            <DynamicControl
                mainTitle={i18next.t("远程控制")}
                secondTitle={i18next.t("请选择你的角色")}
                isShow={dynamicControlModal}
                onCancle={() => setDynamicControlModal(false)}
                width={345}
            >
                <SelectControlType
                    onControlMyself={() => {
                        setControlMyselfModal(true)
                        setDynamicControlModal(false)
                    }}
                    onControlOther={() => {
                        setControlOtherModal(true)
                        setDynamicControlModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={i18next.t("受控端")}
                secondTitle={i18next.t("复制密钥，并分享给控制端用户")}
                isShow={controlMyselfModal}
                onCancle={() => setControlMyselfModal(false)}
            >
                <ControlMyself
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlMyselfModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={i18next.t("控制端")}
                secondTitle={i18next.t("可通过受控端分享的密钥远程控制他的 客户端")}
                isShow={controlOtherModal}
                onCancle={() => setControlOtherModal(false)}
            >
                <ControlOther
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlOtherModal(false)
                    }}
                    runControl={(v: string, url: string) => {
                        setControlOtherModal(false)
                        runDynamicControlRemote(v, url)
                    }}
                />
            </DynamicControl>
        </div>
    )
})

// 运行节点弹窗内容
interface RunNodeContProp {
    runNodeModalVisible: boolean
    onClose: () => void
}

const initRunNodeModalParams = {
    ipOrdomain: "",
    port: "",
    nodename: ""
}

const RunNodeModal: React.FC<RunNodeContProp> = (props) => {
    const {runNodeModalVisible, onClose} = props
    const [visible, setVisible] = useState(false)
    const [form] = Form.useForm()
    const [params, setParams] = useState<{ipOrdomain: string; port: string; nodename: string}>(initRunNodeModalParams)
    const {hasRunNodeInList, setRunNodeList, firstRunNodeFlag, setFirstRunNodeFlag} = useRunNodeStore()

    useEffect(() => {
        setVisible(runNodeModalVisible)
    }, [runNodeModalVisible])

    // 表单字段改变回调
    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const onOKFun = useMemoizedFn(async () => {
        try {
            if (!params.ipOrdomain || !params.port || !params.nodename) {
                throw Error(i18next.t("请输入ip/域名、端口号、节点名"))
            }
            if (hasRunNodeInList(JSON.stringify(params))) {
                throw Error(i18next.t("相同节点正在运行"))
            }
            const res = await ipcRenderer.invoke("call-command-generate-node", {
                ipOrdomain: params.ipOrdomain,
                port: params.port,
                nodename: params.nodename
            })
            setRunNodeList(JSON.stringify(params), res + "")
            yakitNotify("success", i18next.t("成功开启运行节点"))
            !firstRunNodeFlag && setFirstRunNodeFlag(true)
            onCloseModal()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onCloseModal = useMemoizedFn(() => {
        setParams(initRunNodeModalParams)
        form.setFieldsValue(initRunNodeModalParams)
        onClose()
    })

    return (
        <YakitModal
            title={i18next.t("运行节点")}
            width={506}
            maskClosable={false}
            closable={true}
            visible={visible}
            okText={i18next.t("确认")}
            onCancel={onCloseModal}
            onOk={onOKFun}
        >
            <div>
                <div style={{fontSize: 12, color: "#85899e", marginBottom: 10}}>
                    {i18next.t("运行节点会占用引擎资源，建议运行节点的时候，适度使用Yakit，否则会造成节点运行任务缓慢，可以运行多个节点（运行在不同平台，或统一平台节点名称不同）。")}
                </div>
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
                    <Form.Item
                        label={i18next.t("平台IP/域名")}
                        name='ipOrdomain'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: i18next.t("请输入平台IP/域名")}]}
                    >
                        <YakitInput placeholder={i18next.t("请输入平台IP/域名")} maxLength={100} showCount />
                    </Form.Item>
                    <Form.Item
                        label={i18next.t("平台端口")}
                        name='port'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: i18next.t("请输入平台端口")}]}
                    >
                        <YakitInput placeholder={i18next.t("请输入平台端口")} maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item
                        label={i18next.t("节点名称")}
                        name='nodename'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: i18next.t("请输入节点名称")}]}
                    >
                        <YakitInput placeholder={i18next.t("请输入节点名称")} maxLength={50} showCount />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
}

interface UIOpSettingProp {
    /** 当前引擎模式 */
    engineMode: YaklangEngineMode
    /** yaklang引擎切换启动模式 */
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
}

const GetUIOpSettingMenu = () => {
    // 便携版
    if (isEnpriTraceAgent()) {
        return [
            {
                key: "pcapfix",
                label: i18next.t("网卡权限修复")
            },
            {
                key: "plugin",
                label: i18next.t("配置插件源"),
                children: [
                    {label: i18next.t("外部"), key: "external"},
                    {label: i18next.t("插件商店"), key: "store"}
                ]
            },
            {
                key: "system-manager",
                label: i18next.t("进程与缓存管理"),
                children: [{key: "invalidCache", label: i18next.t("删除缓存数据")}]
            },
            {
                key: "diagnose-network",
                label: i18next.t("网络诊断")
            },
            {
                key: "link",
                label: i18next.t("切换连接模式"),
                children: [
                    {label: i18next.t("本地"), key: "local"},
                    {label: i18next.t("远程"), key: "remote"}
                ]
            }
        ]
    }

    // 默认社区版
    return [
        {
            key: "pcapfix",
            label: i18next.t("网卡权限修复")
        },
        {
            key: "project",
            label: i18next.t("项目管理"),
            children: [
                {label: i18next.t("切换项目"), key: "changeProject"},
                {label: i18next.t("加密导出"), key: "encryptionProject"},
                {label: i18next.t("明文导出"), key: "plaintextProject"}
            ]
        },
        {
            key: "explab",
            label: i18next.t("试验性功能"),
            children: [
                {
                    key: "bas-chaosmaker",
                    label: i18next.t("BAS实验室")
                },
                {
                    key: "debug-plugin",
                    label: i18next.t("插件调试功能")
                },
                {
                    key: "debug-monaco-editor",
                    label: "(DEV)调试Playground"
                },
                {
                    key: "vulinbox-manager",
                    label: "(靶场)Vulinbox"
                },
                {
                    key: "new-codec",
                    label: i18next.t("新版Codec")
                },
                {
                    key: "run-node",
                    label: i18next.t("运行节点")
                },
            ]
        },
        {type: "divider"},
        {
            key: "system-manager",
            label: i18next.t("进程与缓存管理"),
            children: [{key: "invalidCache", label: i18next.t("删除缓存数据")}]
        },
        {
            key: "plugin",
            label: i18next.t("配置插件源"),
            children: [
                {label: i18next.t("插件商店"), key: "store"},
                {label: i18next.t("外部"), key: "external"}
            ]
        },
        {
            key: "cve-database",
            label: i18next.t("CVE 数据库"),
            children: [
                {label: i18next.t("全量更新"), key: "cve-database-all-update"},
                {label: i18next.t("差量更新"), key: "cve-database-differential-update"}
            ]
        },
        {
            key: "link",
            label: i18next.t("切换连接模式"),
            children: [
                {label: i18next.t("本地"), key: "local"},
                {label: i18next.t("远程"), key: "remote"}
            ]
        },
        {type: "divider"},
        // {
        //     key: "otherMode",
        //     label: "其他操作",
        //     children: [
        //         {label: "管理员模式", key: "adminMode"},
        //         {label: "旧版本迁移", key: "migrateLegacy"}
        //     ]
        // },
        {
            key: "systemSet",
            label: i18next.t("系统设置"),
            children: [
                { key: "reverse",label: i18next.t("全局反连") },
                { key: "agent",label: i18next.t("系统代理") },
                // { key: "engineAgent",label: "引擎扫描代理" },
                // { key: "engineVar",label: "引擎环境变量" },
                { key: "config-network", label: i18next.t("全局网络配置") },
            ]
        },
        {
            key: "diagnose-network",
            label: i18next.t("网络诊断")
        },
        {
            key: "refreshMenu",
            label: i18next.t("刷新菜单")
        }
    ]
}

const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, onEngineModeChange, typeCallback} = props

    const [runNodeModalVisible, setRunNodeModalVisible] = useState<boolean>(false)
    const [show, setShow] = useState<boolean>(false)
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [available, setAvailable] = useState(false) // cve数据库是否可用
    const [isDiffUpdate, setIsDiffUpdate] = useState(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const {temporaryProjectId, setTemporaryProjectId} = useTemporaryProjectStore()

    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                setAvailable(rsp.Ok)
            })
            .catch((err) => {
                yakitFailed(i18next.t("IsCVEDatabaseReady失败：") + err)
            })
    })
    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "cve-database-all-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(false)
                return
            case "cve-database-differential-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(true)
                return
            case "external":
                onImportPlugin()
                return
            case "store":
                if (dynamicStatus.isDynamicStatus) {
                    warn(i18next.t("远程控制中，暂无法修改"))
                    return
                }
                const m = showYakitModal({
                    width: 800,
                    title: i18next.t("配置私有域"),
                    type: "white",
                    footer: null,
                    maskClosable: false,
                    // onCancel: () => m.destroy(),
                    content: <ConfigPrivateDomain onClose={() => m.destroy()} />
                })
                return m
            case "reverse":
                showModal({
                    title: i18next.t("配置全局反连"),
                    width: 1000,
                    content: (
                        <div style={{width: 1000}}>
                            <ConfigGlobalReverse />
                        </div>
                    )
                })
                return
            case "agent":
                showConfigSystemProxyForm()
                return
            case "engineAgent":
                showConfigEngineProxyForm()
                return
            case "engineVar":
                showConfigYaklangEnvironment()
                return
            case "remote":
                if (dynamicStatus.isDynamicStatus) {
                    warn(i18next.t("远程控制中，暂无法修改"))
                    return
                }
                onEngineModeChange(type)
                return
            case "local":
            case "admin":
                if (dynamicStatus.isDynamicStatus) {
                    warn(i18next.t("远程控制中，暂无法修改"))
                    return
                }
                if (type === engineMode) {
                    return
                }
                onEngineModeChange(type)
                return
            case "refreshMenu":
                ipcRenderer.invoke("change-main-menu")
                return
            case "bas-chaosmaker":
                addToTab("**chaos-maker")
                return
            case "screen-recorder":
                addToTab("**screen-recorder")
                return
            // case "matcher-extractor":
            //     addToTab("**matcher-extractor")
            //     return
            case "debug-plugin":
                addToTab("**debug-plugin")
                return
            case "debug-monaco-editor":
                addToTab("**debug-monaco-editor")
                return
            case "vulinbox-manager":
                addToTab("**vulinbox-manager")
                return
            case "diagnose-network":
                addToTab("**diagnose-network")
                return
            case "config-network":
                addToTab("**config-network")
                return
            case "new-codec":
                addToTab("**beta-codec")
                return
            case "invalidCache":
                invalidCacheAndUserData(temporaryProjectId, setTemporaryProjectId)
                return
            case "pcapfix":
                showPcapPermission()
                return
            case "adminMode":
                typeCallback("adminMode")
                return
            case "migrateLegacy":
                migrateLegacyDatabase()
                return
            case "changeProject":
            case "encryptionProject":
            case "plaintextProject":
                typeCallback(type)
                return
            case "run-node":
                setRunNodeModalVisible(true)
                return
            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            data={GetUIOpSettingMenu() as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                placement={"bottom"}
                content={menu}
                onVisibleChange={(visible) => setShow(visible)}
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
            <DatabaseUpdateModal
                available={available}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
                latestMode={isDiffUpdate}
            />
            <RunNodeModal runNodeModalVisible={runNodeModalVisible} onClose={() => setRunNodeModalVisible(false)} />
        </>
    )
})

const UIDevTool: React.FC = React.memo(() => {
    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                ipcRenderer.invoke("trigger-reload")
                return
            case "reloadCache":
                ipcRenderer.invoke("trigger-reload-cache")
                return

            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            selectedKeys={undefined}
            data={[
                {
                    key: "devtool",
                    label: i18next.t("控制台")
                },
                {
                    key: "reload",
                    label: i18next.t("刷新")
                },
                {
                    key: "reloadCache",
                    label: i18next.t("强制刷新")
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})

interface UIOpUpdateProps {
    version: string
    lastVersion: string
    localVersion?: string
    isUpdateWait?: boolean
    isRemoteMode?: boolean
    onDownload: (type: "yakit" | "yaklang") => any
    isSimple?: boolean
    isEnterprise: boolean
    role?: string | null
    updateContent?: string
    onUpdateEdit?: (type: "yakit" | "yaklang", isEnterprise?: boolean) => any
}

/** @name Yakit版本 */
const UIOpUpdateYakit: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        isUpdateWait,
        onDownload,
        isSimple = false,
        isEnterprise,
        role,
        updateContent = "",
        onUpdateEdit
    } = props

    const isUpdate = isSimple ? false : lastVersion !== "" && lastVersion !== version

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: isUpdate && !isUpdateWait
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YakitWhiteSvgIcon />
                    </div>
                    {/* 等使用更新内容时，下面"当前版本"-div需要被删除 */}
                    <div>
                        <div className={isSimple ? styles["update-simple-title"] : styles["update-title"]}>{`${
                            isEnterprise ? i18next.t("企业版") : i18next.t("社区版")
                        } ${getReleaseEditionName()} ${isUpdate ? lastVersion : version}`}</div>
                        {!isSimple && <div className={styles["update-time"]}>{i18next.t("当前版本: ${version}", { v1: version })}</div>}
                        {/* <div className={styles["update-time"]}>2022-10-01</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isSimple ? (
                        <></>
                    ) : isUpdateWait ? (
                        <YakitButton onClick={() => ipcRenderer.invoke("open-yakit-or-yaklang")}>{i18next.t("安装 ")}</YakitButton>
                    ) : isUpdate ? (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yakit")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            {i18next.t("立即下载")}
                        </div>
                    ) : (
                        i18next.t("已是最新")
                    )}
                    {role === "superAdmin" && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yakit", isEnterprise)
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>{i18next.t("管理员未编辑更新通知")}</div>
                    ) : (
                        content.map((item, index) => {
                            return (
                                <div key={item} className={classNames({[styles["paragraph-spacing"]]: index !== 0})}>
                                    {item}
                                </div>
                            )
                        })
                    )}
                </div>
                {/* <div className={styles["current-version"]}>当前版本：Yakit 1.1.3-sq1</div> */}
            </div>
        </div>
    )
})
/** @name Yaklang引擎版本 */
const UIOpUpdateYaklang: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        localVersion = "",
        isRemoteMode = false,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit
    } = props

    const isUpdate = lastVersion !== "" && lastVersion !== version && localVersion !== lastVersion
    const isKillEngine = localVersion && localVersion !== version && localVersion === lastVersion

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && (isUpdate || isKillEngine)
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    {/* 等使用更新内容时，下面"当前版本"-div需要被删除 */}
                    <div>
                        <div className={styles["update-title"]}>{`Yaklang ${isUpdate ? lastVersion : version}`}</div>
                        <div className={styles["update-time"]}>{i18next.t("当前版本: ${version}", { v1: version })}</div>
                        {/* <div className={styles["upda te-time"]}>2022-09-29</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {!isRemoteMode && isUpdate && (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yaklang")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                           {i18next.t(" 立即更新")}
                        </div>
                    )}
                    {!isRemoteMode && isKillEngine && (
                        <YakitButton
                            onClick={() => ipcRenderer.invoke("kill-old-engine-process")}
                        >{i18next.t("更新 ")}</YakitButton>
                    )}
                    {!isUpdate && !isKillEngine && i18next.t("已是最新")}
                    {isRemoteMode && isUpdate && i18next.t("远程连接无法更新")}
                    {!isRemoteMode && role === "superAdmin" && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yaklang", isEnterpriseEdition())
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>{i18next.t("管理员未编辑更新通知")}</div>
                    ) : (
                        content.map((item, index) => {
                            return (
                                <div key={item} className={classNames({[styles["paragraph-spacing"]]: index !== 0})}>
                                    {item}
                                </div>
                            )
                        })
                    )}
                </div>
                {/* <div className={styles["current-version"]}>当前版本：Yaklang 1.1.3-sp3-5</div> */}
            </div>
        </div>
    )
})

interface UIOpLetterProps {}

/** @name 插件商店消息及系统消息 */
const UIOpLetter: React.FC<UIOpLetterProps> = React.memo((props) => {
    const LetterInfo = useMemoizedFn((type: string) => {
        return (
            <div key={type} className={styles["letter-info-wrapper"]}>
                <div className={styles["info-header"]}>
                    <BellSvgIcon />
                </div>
                {type === "follow" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>{i18next.t("又又呀～")}</span>
                            &nbsp;{i18next.t("关注了你")}
                        </div>
                        <div className={styles["content-time"]}>{i18next.t("3 小时前")}</div>
                    </div>
                )}
                {type === "star" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>{i18next.t("桔子爱吃橘子")}</span>
                            &nbsp;{i18next.t("赞了你的插件")}&nbsp;
                            <span className={styles["accent-content"]}>{i18next.t("致远OA Session泄露漏洞检测")}</span>
                        </div>
                        <div className={styles["content-time"]}>{i18next.t("7 小时前")}</div>
                    </div>
                )}
                {type === "commit" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>{i18next.t("桔子爱吃橘子")}</span>
                            &nbsp;{i18next.t("评论了你的插件")}&nbsp;
                            <span className={styles["accent-content"]}>{i18next.t("Websphere弱口令检测")}</span>
                        </div>
                        <div className={styles["content-commit"]}>{i18next.t("“大佬，牛批！”")}</div>
                        <div className={styles["content-time"]}>{i18next.t("3 天前")}</div>
                    </div>
                )}
                {type === "issue" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Alex-null</span>
                            &nbsp;{i18next.t("向你提交了")}&nbsp;
                            <span className={styles["accent-content"]}>issue</span>
                        </div>
                        <div className={styles["content-time"]}>2022-10-09</div>
                    </div>
                )}
                {type === "system" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>{i18next.t("系统消息")}</span>
                        </div>
                        <div className={styles["content-commit"]}>
                            {i18next.t("手把手教学，从入门到实战！Yak Events 9月16号下午3点，Yak Project直播间不见不散！")}
                        </div>
                        <div className={styles["content-time"]}>2022-10-01</div>
                    </div>
                )}
            </div>
        )
    })

    return (
        <div className={styles["letter-wrapper"]}>
            {["follow", "star", "commit", "issue", "system"].map((item) => LetterInfo(item))}
        </div>
    )
})

interface UIOpNoticeProp {
    isEngineLink: boolean
    isRemoteMode: boolean
}

export interface UpdateContentProp {
    version: string
    content: string
}

export interface FetchUpdateContentProp {
    source: "company" | "community"
    type: "yakit" | "yaklang"
}

export interface FetchEnpriTraceUpdateContentProp {
    version: string
}

export interface UpdateEnpriTraceInfoProps {
    version: string
}

interface SetUpdateContentProp extends FetchUpdateContentProp {
    updateContent: string
}

const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const {isEngineLink, isRemoteMode} = props

    const {userInfo} = useStore()

    const [show, setShow] = useState<boolean>(false)
    const [type, setType] = useState<"letter" | "update">("update")

    /** Yakit版本号 */
    const [yakitVersion, setYakitVersion] = useState<string>("dev")
    const [yakitLastVersion, setYakitLastVersion] = useState<string>("")
    const yakitTime = useRef<any>(null)

    /** Yaklang引擎版本号 */
    const [yaklangVersion, setYaklangVersion] = useState<string>("dev")
    const [yaklangLastVersion, setYaklangLastVersion] = useState<string>("")
    const [yaklangLocalVersion, setYaklangLocalVersion] = useState<string>("")
    const yaklangTime = useRef<any>(null)

    const [companyYakitContent, setCompanyYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYakitContent, setCommunityYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYaklangContent, setCommunityYaklangContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })
    const companyYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        if (yakitLastVersion !== companyYakitContent.version) return ""
        if (yakitLastVersion === companyYakitContent.version) return companyYakitContent.content
        return ""
    }, [yakitLastVersion, companyYakitContent])
    const communityYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        if (yakitLastVersion !== communityYakitContent.version) return ""
        if (yakitLastVersion === communityYakitContent.version) return communityYakitContent.content
        return ""
    }, [yakitLastVersion, communityYakitContent])
    const communityYaklang: string = useMemo(() => {
        if (!yaklangLastVersion) return ""
        if (yaklangLastVersion !== communityYaklangContent.version) return ""
        if (yaklangLastVersion === communityYaklangContent.version) return communityYaklangContent.content
        return ""
    }, [yaklangLastVersion, communityYaklangContent])

    /** 是否启动检测更新 */
    const [isCheck, setIsCheck] = useState<boolean>(true)

    /** 获取最新Yakit版本号 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        /** 社区版获取yakit最新版本号 */
        isCommunityEdition() &&
            ipcRenderer
                .invoke("fetch-latest-yakit-version")
                .then((data: string) => {
                    if (yakitVersion !== data) setYakitLastVersion(data)
                })
                .catch(() => {})
        /** 获取社区版yakit更新内容 */
        isCommunityEdition() &&
            NetWorkApi<FetchUpdateContentProp, any>({
                diyHome: "https://www.yaklang.com",
                method: "get",
                url: "yak/versions",
                params: {type: "yakit", source: "community"}
            })
                .then((res: any) => {
                    if (!res) return
                    try {
                        const data: UpdateContentProp = JSON.parse(res)
                        if (data.content === communityYakitContent.content) return
                        setCommunityYakitContent({...data})
                    } catch (error) {}
                })
                .catch((err) => {})
        /** 企业版获取yakit最新版本号 */
        isEnpriTrace() &&
            ipcRenderer.invoke("update-enpritrace-info").then((info: UpdateEnpriTraceInfoProps) => {
                const {version} = info
                if (version) {
                    NetWorkApi<FetchEnpriTraceUpdateContentProp, any>({
                        method: "get",
                        url: "yak/install/package",
                        params: {version}
                    })
                        .then((res: {from: string}) => {
                            if (!res) return
                            try {
                                const {from} = res
                                if (from) {
                                    const regex = /EnpriTrace-(.*?)-(darwin-arm64|darwin-x64|linux-amd64|windows-amd64)/
                                    const match = from.match(regex)
                                    if (match) {
                                        const result = `v${match[1]}`
                                        if (yakitVersion !== result) setYakitLastVersion(result)
                                    }
                                }
                            } catch (error) {}
                        })
                        .catch((err) => {
                            setYakitLastVersion("")
                            // console.log("err", err)
                        })
                }
            })
        /** 获取企业版yakit更新内容 */
        isEnpriTrace() &&
            NetWorkApi<FetchUpdateContentProp, any>({
                diyHome: "https://www.yaklang.com",
                method: "get",
                url: "yak/versions",
                params: {type: "yakit", source: "company"}
            })
                .then((res: any) => {
                    if (!res) return
                    try {
                        const data: UpdateContentProp = JSON.parse(res)
                        if (data.content === companyYakitContent.content) return
                        setCompanyYakitContent({...data})
                    } catch (error) {}
                })
                .catch((err) => {})
    })
    /** 获取最新Yaklang版本号和本地版本号 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer.invoke("fetch-latest-yaklang-version").then((data: string) => {
            if (yaklangVersion !== data) setYaklangLastVersion(data)
        })
        ipcRenderer.invoke("get-current-yak").then((data: string) => {
            !isRemoteMode && setYaklangLocalVersion(data)
        })
        /** 获取社区版yaklang更新内容 */
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
                    if (data.content === communityYaklangContent.content) return
                    setCommunityYaklangContent({...data})
                } catch (error) {}
            })
            .catch((err) => {})
    })

    /** 接收本地Yaklang引擎版本号信息 */
    useEffect(() => {
        if (isEngineLink) {
            ipcRenderer.on("fetch-yak-version-callback", async (e: any, data: string) => {
                setYaklangVersion(data || "dev")
            })

            return () => {
                ipcRenderer.removeAllListeners("fetch-yak-version-callback")
            }
        }
    }, [isEngineLink])

    useEffect(() => {
        if (isEngineLink) {
            getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
                setIsCheck(val)
            })
            /** 获取本地Yakit版本号，启动获取最新Yakit版本的定时器 */
            ipcRenderer.invoke("fetch-yakit-version").then((v: string) => setYakitVersion(`v${v}`))
            if (yakitTime.current) clearInterval(yakitTime.current)
            fetchYakitLastVersion()
            yakitTime.current = setInterval(fetchYakitLastVersion, 60000)

            /** 获取本地Yaklang版本号，启动获取最新Yaklang版本的定时器 */
            ipcRenderer.invoke("fetch-yak-version")
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            fetchYaklangLastVersion()
            yaklangTime.current = setInterval(fetchYaklangLastVersion, 60000)

            return () => {
                clearInterval(yakitTime.current)
                clearInterval(yaklangTime.current)
            }
        } else {
            /** 清空Yakit引擎相关版本号和定时器 */
            if (yakitTime.current) clearInterval(yakitTime.current)
            yakitTime.current = null
            setYakitLastVersion("")
            /** 清空Yaklang引擎相关版本号和定时器 */
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            yaklangTime.current = null
            setYaklangLastVersion("")
        }
    }, [isEngineLink])

    const onDownload = useMemoizedFn((type: "yakit" | "yaklang") => {
        ipcRenderer.invoke("receive-download-yaklang-or-yakit", type)
    })

    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    /** 监听下载 yaklang 或 yakit 成功后是否稍后安装 */
    useEffect(() => {
        ipcRenderer.on("download-update-wait-callback", (e: any, type: "yakit") => {
            if (type === "yakit") setIsYakitUpdateWait(true)
        })

        return () => {
            ipcRenderer.removeAllListeners("download-update-wait-callback")
        }
    }, [])

    const [editLoading, setEditLoading] = useState<boolean>(false)
    const [editShow, setEditShow] = useState<{visible: boolean; type: "yakit" | "yaklang"; isEnterprise?: boolean}>({
        visible: false,
        type: "yakit"
    })
    const [editInfo, setEditInfo] = useState<string>("")
    const UpdateContentEdit = useMemoizedFn((type: "yakit" | "yaklang", isEnterprise?: boolean) => {
        if (editShow.visible) return
        setEditInfo(type === "yakit" ? (isEnterprise ? companyYakit : communityYakit) : communityYaklang)
        setEditShow({visible: true, type: type, isEnterprise: !!isEnterprise})
        setShow(false)
    })
    const onSubmitEdit = useMemoizedFn(() => {
        setEditLoading(true)
        const params: SetUpdateContentProp = {
            type: editShow.type,
            source: editShow.isEnterprise ? "company" : "community",
            updateContent: JSON.stringify({
                version: editShow.type === "yakit" ? yakitLastVersion : yaklangLastVersion,
                content: editInfo || ""
            })
        }

        NetWorkApi<SetUpdateContentProp, API.ActionSucceeded>({
            method: "post",
            url: "yak/versions",
            data: params
        })
            .then((res) => {
                info(i18next.t("修改更新内容成功"))
                if (editShow.type === "yakit") fetchYakitLastVersion()
                else fetchYaklangLastVersion()
                setTimeout(() => setEditShow({visible: false, type: "yakit"}), 100)
            })
            .catch((e) => failed(i18next.t("修改错误 ${e}", { v1: e })))
            .finally(() => {
                setTimeout(() => setEditLoading(false), 300)
            })
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-notice-body"]}>
                    {/* <div className={styles["notice-tabs-wrapper"]}>
                        <div className={styles["notice-tabs-body"]}>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "letter"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("letter")
                                }}
                            >
                                <Badge dot offset={[4, 0]}>
                                    私信
                                </Badge>
                            </div>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "update"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("update")
                                }}
                            >
                                更新通知
                            </div>
                        </div>
                    </div> */}
                    <div className={styles["notice-version-header"]}>
                        <div className={styles["header-title"]}>{i18next.t("更新通知")}</div>
                        <div className={styles["switch-title"]}>
                            {i18next.t("启动检测更新")}
                            <YakitSwitch
                                style={{marginLeft: 4}}
                                showInnerText={true}
                                size='large'
                                checked={!isCheck}
                                onChange={(val: boolean) => {
                                    setLocalValue(LocalGV.NoAutobootLatestVersionCheck, !val)
                                    setIsCheck(!val)
                                }}
                            />
                        </div>
                    </div>

                    {type === "update" && (
                        <div className={styles["notice-version-wrapper"]}>
                            <div className={styles["version-wrapper"]}>
                                {userInfo.role === "superAdmin" && !isEnpriTraceAgent() && (
                                    <UIOpUpdateYakit
                                        version={yakitVersion}
                                        lastVersion={yakitLastVersion}
                                        isUpdateWait={isYakitUpdateWait}
                                        onDownload={onDownload}
                                        isSimple={true}
                                        isEnterprise={isCommunityEdition()}
                                        role={userInfo.role}
                                        updateContent={isCommunityEdition() ? companyYakit : communityYakit}
                                        onUpdateEdit={UpdateContentEdit}
                                    />
                                )}
                                {!isEnpriTraceAgent() && (
                                    <UIOpUpdateYakit
                                        version={yakitVersion}
                                        lastVersion={yakitLastVersion}
                                        isUpdateWait={isYakitUpdateWait}
                                        onDownload={onDownload}
                                        isEnterprise={isEnterpriseEdition()}
                                        role={userInfo.role}
                                        updateContent={isEnterpriseEdition() ? companyYakit : communityYakit}
                                        onUpdateEdit={UpdateContentEdit}
                                    />
                                )}
                                <UIOpUpdateYaklang
                                    version={yaklangVersion}
                                    lastVersion={yaklangLastVersion}
                                    localVersion={yaklangLocalVersion}
                                    isRemoteMode={isRemoteMode}
                                    onDownload={onDownload}
                                    isEnterprise={isEnterpriseEdition()}
                                    role={userInfo.role}
                                    updateContent={communityYaklang}
                                    onUpdateEdit={UpdateContentEdit}
                                />
                            </div>
                            <div className={styles["history-version"]}>
                                <div
                                    className={styles["content-style"]}
                                    onClick={() => ipcRenderer.invoke("open-url", CodeGV.HistoricalVersion)}
                                >
                                    <GithubSvgIcon className={styles["icon-style"]} /> {i18next.t("历史版本")}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* {type === "letter" && (
                        <>
                            <div>
                                <UIOpLetter />
                            </div>
                            <div className={styles["notice-footer"]}>
                                <div className={styles["notice-footer-btn"]}>{i18next.t("全部已读")}</div>
                                <div className={styles["notice-footer-btn"]}>查看所有私信</div>
                            </div>
                        </>
                    )} */}
                </div>
            </div>
        )
    }, [
        type,
        isCheck,
        userInfo,
        isEngineLink,
        yakitVersion,
        yakitLastVersion,
        isYakitUpdateWait,
        companyYakit,
        communityYakit,
        yaklangVersion,
        yaklangLastVersion,
        yaklangLocalVersion,
        isRemoteMode,
        communityYaklang
    ])

    const isUpdate = useMemo(() => {
        return isEnpriTraceAgent()
            ? yaklangLastVersion !== "" && yaklangLastVersion !== yaklangVersion
            : (yakitLastVersion !== "" && yakitLastVersion !== yakitVersion) ||
                  (yaklangLastVersion !== "" && yaklangLastVersion !== yaklangVersion)
    }, [yakitVersion, yakitLastVersion, yaklangLastVersion, yaklangVersion])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            visible={show}
            onVisibleChange={(visible) => {
                if (editShow.visible) setShow(false)
                else setShow(visible)
            }}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge dot={isUpdate}>
                        <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
            <YakitModal
                title={
                    editShow.type === "yakit"
                        ? i18next.t("${getReleaseEditionName()} ${yakitLastVersion} 更新通知", {v1: getReleaseEditionName(), v2: yakitLastVersion})
                        : i18next.t("Yaklang ${yaklangLastVersion} 更新通知", { v1: yaklangLastVersion })
                }
                centered={true}
                closable={true}
                type='white'
                size="large"
                visible={editShow.visible}
                cancelButtonProps={{loading: editLoading}}
                okButtonProps={{loading: editLoading}}
                onCancel={() => setEditShow({visible: false, type: "yakit"})}
                onOk={onSubmitEdit}
                bodyStyle={{padding: "16px 24px"}}
            >
                <div>
                    <YakitInput.TextArea
                        rows={10}
                        value={editInfo}
                        onChange={(e) => setEditInfo(e.target.value)}
                    ></YakitInput.TextArea>
                </div>
            </YakitModal>
        </YakitPopover>
    )
})

interface UIOpRiskProp {
    isEngineLink: boolean
}

/** 最新风险与漏洞信息 */
interface LatestRiskInfo {
    Title: string
    Id: number
    CreatedAt: number
    UpdatedAt: number
    Verbose: string
    TitleVerbose: string
    IsRead: boolean
}

interface RisksProps {
    Data: LatestRiskInfo[]
    Total: number
    NewRiskTotal: number
}

/** 漏洞与风险等级对应关系 */
const RiskType: {[key: string]: string} = {
    "Information/Fingerprint": "info",
    "Low Risk": "low",
    "Medium Risk": "middle",
    "High Risk": "high",
    "Critical": "critical"
}
const UIOpRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const {isEngineLink} = props

    const [show, setShow] = useState<boolean>(false)

    /** 查询最新风险与漏洞信息节点 */
    const fetchNode = useRef<number>(0)
    const [risks, setRisks] = useState<RisksProps>({
        Data: [],
        Total: 0,
        NewRiskTotal: 0
    })

    /** 定时器 */
    const timeRef = useRef<any>(null)

    /** 查询最新的风险数据 */
    const update = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-risk-info", {AfterId: fetchNode.current})
            .then((res: RisksProps) => {
                if (
                    JSON.stringify(risks.Data) === JSON.stringify(res.Data) &&
                    risks.NewRiskTotal === res.NewRiskTotal &&
                    risks.Total === res.Total
                ) {
                    return
                }

                const risksOjb: RisksProps = {
                    Total: res.Total,
                    NewRiskTotal: res.NewRiskTotal,
                    Data: [...res.Data]
                }
                setRisks({...risksOjb})
            })
            .catch(() => {})
    })

    /** 获取最新的风险与漏洞信息(5秒一次) */
    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)

            ipcRenderer
                .invoke("QueryRisks", {
                    Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "id"}
                })
                .then((res: QueryGeneralResponse<Risk>) => {
                    const {Data} = res
                    fetchNode.current = Data.length === 0 ? 0 : Data[0].Id
                })
                .catch((e) => {})
                .finally(() => {
                    setTimeout(() => {
                        update()
                        timeRef.current = setInterval(update, 5000)
                    }, 300)
                })

            return () => {
                clearInterval(timeRef.current)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            fetchNode.current = 0
            setRisks({Data: [], Total: 0, NewRiskTotal: 0})
        }
    }, [isEngineLink])

    /** 单条点击阅读 */
    const singleRead = useMemoizedFn((info: LatestRiskInfo) => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current, Ids: [info.Id]})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: info.IsRead ? risks.NewRiskTotal : risks.NewRiskTotal - 1,
                    Data: risks.Data.map((item) => {
                        if (item.Id === info.Id && item.Title === info.Title) item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
        ipcRenderer
            .invoke("QueryRisk", {Id: info.Id})
            .then((res: Risk) => {
                if (!res) return
                showModal({
                    width: "80%",
                    title: i18next.t("详情"),
                    content: (
                        <div style={{overflow: "auto"}}>
                            <RiskDetails info={res} />
                        </div>
                    )
                })
            })
            .catch(() => {})
    })
    /** 全部已读 */
    const allRead = useMemoizedFn(() => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => {
                        item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
    })
    /** 查看全部 */
    const viewAll = useMemoizedFn(() => {
        addToTab(YakitRoute.DB_Risk)
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-risk-body"]}>
                    <div className={styles["risk-header"]}>
                        {i18next.t("漏洞和风险统计（共 {risks.Total || 0} 条，其中未读 {risks.NewRiskTotal || 0} 条）", {v1: risks.Total || 0, v2: risks.NewRiskTotal || 0})}
                    </div>

                    <div className={styles["risk-info"]}>
                        {risks.Data.map((item) => {
                            const type = RiskType[item.Verbose]
                            if (!!type) {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <div
                                            className={classNames(styles["opt-icon-style"], styles[`opt-${type}-icon`])}
                                        >
                                            {item.Verbose}
                                        </div>
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={item.TitleVerbose||item.Title} width={type === "info" ? 280 : 310}/>
                                        </Badge>
                                    </div>
                                )
                            } else {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={`${item.Title} ${item.Verbose}}`} width={350} />
                                        </Badge>
                                    </div>
                                )
                            }
                        })}
                    </div>

                    <div className={styles["risk-footer"]}>
                        <div className={styles["risk-footer-btn"]} onClick={allRead}>
                            {i18next.t("全部已读")}
                        </div>
                        <div className={styles["risk-footer-btn"]} onClick={viewAll}>
                            {i18next.t("查看全部")}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [risks])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge count={risks.NewRiskTotal} offset={[2, 15]}>
                        <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
        </YakitPopover>
    )
})

interface ScreenAndScreenshotProps {
    system: YakitSystem
    isRecording: boolean
    token: string
}

const ScreenAndScreenshot: React.FC<ScreenAndScreenshotProps> = React.memo((props) => {
    const {system, isRecording, token} = props
    const [show, setShow] = useState<boolean>(false)
    /** 截图功能的loading */
    const [screenshotLoading, setScreenshotLoading] = useState<boolean>(false)
    /** 录屏功能的loading */
    const [screenCapLoading, setScreenCapLoading] = useState<boolean>(false)

    const yakitMenuData = useCreation(() => {
        if (system === "Darwin" || system === "Windows_NT") {
            return [
                {
                    label: isRecording ? (
                        <div
                            className={styles["stop-screen-menu-item"]}
                            onClick={() => {
                                ipcRenderer.invoke("cancel-StartScrecorder", token)
                            }}
                        >
                            {i18next.t("停止录屏")}
                        </div>
                    ) : (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>{i18next.t("录屏")}</span>
                            {/* <span className={styles["shortcut-keys"]}>
                                {system === "Darwin"
                                    ? `${MacKeyborad[17]} ${MacKeyborad[16]} X`
                                    : `${WinKeyborad[17]} ${WinKeyborad[16]} X`}
                            </span> */}
                        </div>
                    ),
                    key: "screenCap"
                },
                {
                    label: (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>{i18next.t("截屏")}</span>
                            {
                                screenshotLoading && (
                                    <div
                                        className={styles["icon-loading-wrapper"]}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <LoadingOutlined className={styles["icon-hover-style"]} />
                                    </div>
                                )
                                // : (
                                //     <span className={styles["shortcut-keys"]}>
                                //         {system === "Darwin"
                                //             ? `${MacKeyborad[17]} ${MacKeyborad[16]} B`
                                //             : `${WinKeyborad[17]} ${WinKeyborad[16]} B`}
                                //     </span>
                                // )
                            }
                        </div>
                    ),
                    key: "screenshot"
                },
                {
                    type: "divider"
                },
                {
                    label: i18next.t("录屏管理"),
                    key: "screen-recorder"
                }
            ]
        }
        return [
            {
                label: isRecording ? (
                    <div
                        className={styles["stop-screen-menu-item"]}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", token)
                        }}
                    >
                        {i18next.t("停止录屏")}
                    </div>
                ) : (
                    <div className={styles["screen-and-screenshot-menu-item"]}>
                        <span>{i18next.t("录屏")}</span>
                        <span className={styles["shortcut-keys"]}>{`${WinKeyborad[17]} ${WinKeyborad[16]} X`}</span>
                    </div>
                ),
                key: "screenCap"
            },
            {
                type: "divider"
            },
            {
                label: <span>{i18next.t("录屏管理")}</span>,
                key: "screen-recorder"
            }
        ]
    }, [system, screenshotLoading, isRecording])
    const menuSelect = useMemoizedFn((type: string) => {
        setShow(false)
        switch (type) {
            case "screenCap":
                if (isRecording) {
                    ipcRenderer.invoke("cancel-StartScrecorder", token)
                } else {
                    ipcRenderer.invoke("send-open-screenCap-modal")
                }

                break
            case "screenshot":
                if (screenshotLoading) return
                setScreenshotLoading(true)
                ipcRenderer.invoke("activate-screenshot")
                setTimeout(() => {
                    setScreenshotLoading(false)
                }, 1000)
                break
            case "screen-recorder":
                addToTab("**screen-recorder")
                break
            default:
                break
        }
    })

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            data={yakitMenuData as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )
    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                overlayStyle={{paddingBottom: 0}}
                placement={"bottom"}
                content={menu}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <CameraIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
        </>
    )
})
