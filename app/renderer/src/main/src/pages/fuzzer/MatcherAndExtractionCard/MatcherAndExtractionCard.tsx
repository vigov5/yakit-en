import React, {ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    ExtractorValueProps,
    HTTPResponseExtractor,
    HTTPResponseMatcher,
    MatcherValueProps,
    MatcherAndExtractionCardProps,
    MatcherAndExtractionProps,
    MatcherCollapseProps,
    labelNodeItemProps,
    MatcherItemProps,
    MatchHTTPResponseParams,
    ColorSelectProps,
    MatchingAndExtraction,
    ExtractorCollapseProps,
    ExtractorItemProps,
    MatcherAndExtractionValueListProps,
    ExtractionResultsContentProps,
    MatcherAndExtractionDrawerProps,
    MatcherAndExtractionValueProps
} from "./MatcherAndExtractionCardType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import styles from "./MatcherAndExtraction.module.scss"
import {
    AdjustmentsIcon,
    ColorSwatchIcon,
    PencilAltIcon,
    PlusIcon,
    RemoveIcon,
    ResizerIcon,
    TrashIcon
} from "@/assets/newIcon"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {Descriptions} from "antd"
import classNames from "classnames"
import {useCreation, useMemoizedFn, useSize} from "ahooks"
import {yakitNotify} from "@/utils/notification"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitModalConfirm, showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import _ from "lodash"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RuleContent} from "@/pages/mitm/MITMRule/MITMRuleFromModal"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AutoTextarea} from "../components/AutoTextarea/AutoTextarea"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {CopyableField} from "@/utils/inputUtil"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {menuBodyHeight} from "@/pages/globalVariable"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import i18next from "../../../i18n"

const {ipcRenderer} = window.require("electron")

const {YakitPanel} = YakitCollapse
/**@name 过滤器模式 */
export const filterModeOptions = [
    {
        value: "drop",
        label: i18next.t("丢弃")
    },
    {
        value: "match",
        label: i18next.t("保留")
    },
    {
        value: "onlyMatch",
        label: i18next.t("仅匹配")
    }
]

/**@name 条件关系 */
export const matchersConditionOptions = [
    {
        value: "and",
        label: "AND"
    },
    {
        value: "or",
        label: "OR"
    }
]

export const defaultMatcherItem: HTTPResponseMatcher = {
    MatcherType: "word",
    ExprType: "nuclei-dsl",
    Scope: "body",
    Group: [""],
    Condition: "and",
    Negative: false,
    // ---------
    SubMatchers: [],
    SubMatcherCondition: "",
    GroupEncoding: ""
}

export const defaultExtractorItem: HTTPResponseExtractor = {
    Type: "regex",
    Scope: "raw",
    Groups: [""],
    // ---------
    Name: "data_0",
    RegexpMatchGroup: [],
    XPathAttribute: ""
}

const isMatcherItemEmpty = (i: HTTPResponseMatcher) => {
    return (i?.Group || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

const isExtractorEmpty = (item: HTTPResponseExtractor) => {
    return (item?.Groups || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}

export const matcherTypeList = [
    {label: i18next.t("关键字"), value: "word"},
    {label: i18next.t("正则表达式"), value: "regex"},
    {label: i18next.t("状态码"), value: "status_code"},
    {label: i18next.t("十六进制"), value: "binary"},
    {label: i18next.t("表达式"), value: "expr"}
]

export const extractorTypeList = [
    {label: i18next.t("正则表达式"), value: "regex"},
    {label: "XPath", value: "xpath"},
    {label: i18next.t("键值对"), value: "kval"},
    {label: "JQ(*)", value: "json"},
    {label: i18next.t("表达式"), value: "nuclei-dsl"}
]

export const defMatcherAndExtractionCode =
    "HTTP/1.1 200 OK\r\n" +
    "Date: Mon, 23 May 2005 22:38:34 GMT\r\n" +
    "Content-Type: text/html; charset=UTF-8\r\n" +
    "Content-Encoding: UTF-8\r\n" +
    "\r\n" +
    "<html>" +
    '<!doctype html>\n<html>\n<body>\n  <div id="result">%d</div>\n</body>\n</html>' +
    "</html>"

export const MatcherAndExtractionCard: React.FC<MatcherAndExtractionCardProps> = React.memo((props) => {
    const {httpResponse, ...restProps} = props
    const [codeValue, setCodeValue] = useState<string>(httpResponse || defMatcherAndExtractionCode)
    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false)
    useEffect(() => {
        setCodeValue(httpResponse || defMatcherAndExtractionCode)
        setRefreshTrigger(!refreshTrigger)
    }, [httpResponse])
    return (
        <div className={styles["matching-extraction-resize-box"]}>
            <YakitResizeBox
                firstNode={
                    <div className={styles["matching-extraction-editor"]}>
                        <NewHTTPPacketEditor
                            refreshTrigger={refreshTrigger}
                            bordered={false}
                            noHeader={true}
                            originValue={StringToUint8Array(codeValue)}
                            onChange={(e) => setCodeValue(Uint8ArrayToString(e))}
                        />
                    </div>
                }
                secondMinSize={530}
                firstMinSize={300}
                secondNode={<MatcherAndExtraction {...restProps} httpResponse={codeValue} />}
                secondNodeStyle={{paddingLeft: 0}}
                lineDirection='right'
            />
        </div>
    )
})

export const MatcherAndExtraction: React.FC<MatcherAndExtractionProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {onClose, onSave, extractorValue, matcherValue, defActiveKey, httpResponse, defActiveType} = props
        const [type, setType] = useState<MatchingAndExtraction>(defActiveType)
        const [matcher, setMatcher] = useState<MatcherValueProps>(matcherValue)
        const [extractor, setExtractor] = useState<ExtractorValueProps>(extractorValue)
        const [executeLoading, setExecuteLoading] = useState<boolean>(false)

        const contentRef = useRef<any>(null)
        const {width} = useSize(contentRef) || {width: 0}

        useImperativeHandle(
            ref,
            () => ({
                validate: onValidate
            }),
            [matcher, extractor]
        )

        useEffect(() => {
            setType(defActiveType)
        }, [defActiveType])
        useEffect(() => {
            setMatcher({
                ..._.cloneDeepWith(matcherValue),
                matchersList:
                    defActiveType === "matchers" && matcherValue.matchersList.length === 0
                        ? [_.cloneDeepWith(defaultMatcherItem)]
                        : _.cloneDeepWith(matcherValue.matchersList)
            })
        }, [matcherValue, defActiveType])
        useEffect(() => {
            setExtractor({
                ..._.cloneDeepWith(extractorValue),
                extractorList:
                    defActiveType === "extractors" && extractorValue.extractorList.length === 0
                        ? [_.cloneDeepWith(defaultExtractorItem)]
                        : _.cloneDeepWith(extractorValue.extractorList)
            })
        }, [extractorValue, defActiveType])
        const isEffectiveMatcher: boolean = useMemo(() => {
            return (
                matcher?.matchersList?.filter((i) => !((i?.Group || []).map((i) => i.trim()).join("") === "")).length <=
                0
            )
        }, [matcher.matchersList])
        const isEffectiveExtractor: boolean = useMemo(() => {
            return (
                extractor?.extractorList?.filter((i) => !((i?.Groups || []).map((i) => i.trim()).join("") === ""))
                    .length <= 0
            )
        }, [extractor.extractorList])
        const onValidate = useMemoizedFn(() => {
            return new Promise((resolve: (val: MatcherAndExtractionValueProps) => void, reject) => {
                const matcherAndExtractor = onClearEmptyGroups()
                const data: MatcherAndExtractionValueProps = {
                    matcher: {
                        ...matcher,
                        matchersList: matcherAndExtractor.newMatchersList
                    },
                    extractor: {
                        ...extractor,
                        extractorList: matcherAndExtractor.newExtractorList
                    }
                }
                // 没有空的条件，再检测两次的值是否一致,不一致需提示用户
                if (_.isEqual(matcherValue, data.matcher) && _.isEqual(extractorValue, data.extractor)) {
                    resolve(data)
                } else {
                    let m = YakitModalConfirm({
                        width: 420,
                        type: "white",
                        onCancelText: i18next.t("不应用"),
                        onOkText: i18next.t("应用"),
                        icon: <ExclamationCircleOutlined />,
                        onOk: () => {
                            resolve(data)
                            m.destroy()
                        },
                        onCancel: () => {
                            reject(false)
                            m.destroy()
                        },
                        content: i18next.t("是否应用修改的内容")
                    })
                }
            })
        })
        const onAddCondition = useMemoizedFn(() => {
            switch (type) {
                case "matchers":
                    onAddMatcher()
                    break
                case "extractors":
                    onAddExtractors()
                    break
                default:
                    break
            }
        })
        const onAddMatcher = useMemoizedFn(() => {
            if (matcher.matchersList.filter((i) => isMatcherItemEmpty(i)).length > 0) {
                yakitNotify("error", i18next.t("已有空匹配器条件"))
                return
            }
            setMatcher({
                ...matcher,
                matchersList: [...matcher.matchersList, _.cloneDeepWith(defaultMatcherItem)]
            })
        })
        const onAddExtractors = useMemoizedFn(() => {
            if (extractor.extractorList.filter((i) => isExtractorEmpty(i)).length > 0) {
                yakitNotify("error", i18next.t("已有空匹配器条件"))
                return
            }
            setExtractor({
                ...extractor,
                extractorList: [
                    ...extractor.extractorList,
                    _.cloneDeepWith({...defaultExtractorItem, Name: `data_${extractor.extractorList.length}`})
                ]
            })
        })
        const onExecute = useMemoizedFn(() => {
            switch (type) {
                case "matchers":
                    onExecuteMatcher()
                    break
                case "extractors":
                    onExecuteExtractors()
                    break
                default:
                    break
            }
        })
        const onExecuteMatcher = useMemoizedFn(() => {
            const matchHTTPResponseParams: MatchHTTPResponseParams = {
                HTTPResponse: httpResponse,
                Matchers: matcher.matchersList,
                MatcherCondition: matcher.matchersCondition
            }
            if (isEffectiveMatcher) {
                yakitNotify("error", i18next.t("所有匹配条件均为空，请先设置条件"))
                return
            }
            setExecuteLoading(true)
            ipcRenderer
                .invoke("MatchHTTPResponse", matchHTTPResponseParams)
                .then((data: {Matched: boolean}) => {
                    if (data.Matched) {
                        yakitNotify("success", i18next.t("匹配成功"))
                    } else {
                        yakitNotify("error", i18next.t("匹配失败"))
                    }
                })
                .catch((err) => {
                    yakitNotify("error", i18next.t("匹配报错:") + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setExecuteLoading(false)
                    }, 200)
                )
        })
        const onExecuteExtractors = useMemoizedFn(() => {
            if (isEffectiveExtractor) {
                yakitNotify("error", i18next.t("没有有效提取器（都为空）"))
                return
            }
            setExecuteLoading(true)
            ipcRenderer
                .invoke("ExtractHTTPResponse", {
                    HTTPResponse: httpResponse,
                    Extractors: extractor.extractorList
                })
                .then((obj: {Values: {Key: string; Value: string}[]}) => {
                    if (!obj) {
                        yakitNotify("error", i18next.t("匹配不到有效结果"))
                        return
                    }
                    if ((obj?.Values || []).length <= 0) {
                        yakitNotify("error", i18next.t("匹配不到有效结果"))
                        return
                    }
                    showYakitModal({
                        title: i18next.t("提取结果"),
                        width: "60%",
                        footer: <></>,
                        content: <ExtractionResultsContent list={obj.Values || []} />
                    })
                })
                .catch((err) => {
                    yakitNotify("error", i18next.t("数据提取报错:") + err)
                })
                .finally(() =>
                    setTimeout(() => {
                        setExecuteLoading(false)
                    }, 200)
                )
        })
        const onApplyConfirm = useMemoizedFn(() => {
            const matcherAndExtractor = onClearEmptyGroups()
            if (onIsDuplicateName(matcherAndExtractor.newExtractorList)) return
            onSave(
                {...matcher, matchersList: matcherAndExtractor.newMatchersList},
                {...extractor, extractorList: matcherAndExtractor.newExtractorList}
            )
            onClose()
        })
        /**
         * 提取器名称是否重名 并提示
         * @returns bool
         */
        const onIsDuplicateName = useMemoizedFn((list: HTTPResponseExtractor[]) => {
            let isDuplicateName = false
            const names = list.map((e) => e.Name)
            const nameLength = names.length
            let newNames: string[] = []
            for (let index = 0; index < nameLength; index++) {
                const namesElement = names[index]
                const n = newNames.findIndex((n) => n === namesElement)
                if (n === -1) {
                    newNames.push(namesElement)
                } else {
                    isDuplicateName = true
                    yakitNotify("error", i18next.t("【${namesElement}】名称重复，请修改后再应用", { v1: namesElement }))
                    break
                }
            }
            return isDuplicateName
        })
        /**
         * @returns 返回过滤空值的Group的匹配器和提取器数据
         */
        const onClearEmptyGroups = useMemoizedFn(() => {
            const newMatchersList: HTTPResponseMatcher[] = []
            matcher.matchersList.forEach((item) => {
                if (item.Group.join("") === "") return
                newMatchersList.push({
                    ...item,
                    Group: item.Group.filter((g) => g !== "")
                })
            })
            const newExtractorList: HTTPResponseExtractor[] = []
            extractor.extractorList.forEach((item) => {
                if (item.Groups.join("") === "") return
                newExtractorList.push({
                    ...item,
                    Groups: item.Groups.filter((g) => g !== "")
                })
            })
            return {
                newMatchersList,
                newExtractorList
            }
        })

        const onCheckClose = useMemoizedFn(() => {
            const matcherAndExtractor = onClearEmptyGroups()
            const data = {
                matcher: {
                    ...matcher,
                    matchersList: matcherAndExtractor.newMatchersList
                },
                extractor: {
                    ...extractor,
                    extractorList: matcherAndExtractor.newExtractorList
                }
            }
            // 没有空的条件，再检测两次的值是否一致,不一致需提示用户
            if (_.isEqual(matcherValue, data.matcher) && _.isEqual(extractorValue, data.extractor)) {
                onClose()
                return
            } else {
                let m = YakitModalConfirm({
                    width: 420,
                    type: "white",
                    onCancelText: i18next.t("不应用"),
                    onOkText: i18next.t("应用"),
                    icon: <ExclamationCircleOutlined />,
                    onOk: () => {
                        onApplyConfirm()
                        m.destroy()
                    },
                    onCancel: () => {
                        onClose()
                        m.destroy()
                    },
                    content: i18next.t("是否应用修改的内容")
                })
            }
        })
        const isSmallMode: boolean = useMemo(() => {
            if (width) {
                return width < 550
            } else {
                return false
            }
        }, [width])
        return (
            <YakitSpin spinning={executeLoading}>
                <div className={styles["matching-extraction"]} ref={contentRef}>
                    <div className={styles["matching-extraction-heard"]}>
                        <div className={styles["matching-extraction-title"]}>
                            <YakitRadioButtons
                                value={type}
                                onChange={(e) => {
                                    const {value} = e.target
                                    setType(value)
                                    if (value === "matchers" && matcher.matchersList.length === 0) {
                                        setMatcher({
                                            ...matcher,
                                            matchersList: [_.cloneDeepWith(defaultMatcherItem)]
                                        })
                                    }
                                    if (value === "extractors" && extractor.extractorList.length === 0) {
                                        setExtractor({
                                            ...extractor,
                                            extractorList: [_.cloneDeepWith(defaultExtractorItem)]
                                        })
                                    }
                                }}
                                buttonStyle='solid'
                                size={isSmallMode ? "small" : "middle"}
                                options={[
                                    {
                                        value: "matchers",
                                        label: i18next.t("匹配器")
                                    },
                                    {
                                        value: "extractors",
                                        label: i18next.t("数据提取器")
                                    }
                                ]}
                            />
                            <span className={styles["matching-extraction-title-tip"]}>{i18next.t("已添加")}
                                <span className={styles["primary-number"]}>
                                    {type === "matchers" ? matcher.matchersList.length : extractor.extractorList.length}
                                </span>{i18next.t("条")}
                            </span>
                        </div>
                        <div className={styles["matching-extraction-extra"]}>
                            <YakitButton
                                type='outline1'
                                icon={<PlusIcon />}
                                onClick={() => onAddCondition()}
                                size={isSmallMode ? "small" : undefined}
                            >{i18next.t("添加条件")}
                            </YakitButton>
                            <YakitButton
                                type='outline1'
                                onClick={() => onExecute()}
                                size={isSmallMode ? "small" : undefined}
                            >{i18next.t("调试执行")}
                            </YakitButton>
                            <YakitButton
                                type='primary'
                                onClick={() => onApplyConfirm()}
                                size={isSmallMode ? "small" : undefined}
                            >{i18next.t("应用")}
                            </YakitButton>
                            <RemoveIcon className={styles["remove-icon"]} onClick={() => onCheckClose()} />
                        </div>
                    </div>
                    <MatcherCollapse
                        type={type}
                        matcher={matcher}
                        setMatcher={setMatcher}
                        defActiveKey={defActiveKey}
                        httpResponse={httpResponse}
                        isSmallMode={isSmallMode}
                    />
                    <ExtractorCollapse
                        type={type}
                        extractor={extractor}
                        setExtractor={setExtractor}
                        defActiveKey={defActiveKey}
                        httpResponse={httpResponse}
                        isSmallMode={isSmallMode}
                    />
                </div>
            </YakitSpin>
        )
    })
)

export const MatcherCollapse: React.FC<MatcherCollapseProps> = React.memo((props) => {
    const {type, matcher, setMatcher, notEditable, defActiveKey, httpResponse, isSmallMode} = props
    const [activeKey, setActiveKey] = useState<string>("ID:0")
    useEffect(() => {
        setActiveKey(defActiveKey)
    }, [defActiveKey])
    useEffect(() => {
        const length = matcher.matchersList.length
        setActiveKey(`ID:${length - 1}`)
    }, [matcher.matchersList.length])
    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        if (notEditable) return
        matcher.matchersList[index][field] = value
        setMatcher({
            ...matcher,
            matchersList: [...matcher.matchersList]
        })
    })
    return (
        <div
            className={classNames(styles["matching-extraction-content"], {
                [styles["matching-extraction-content-hidden"]]: type !== "matchers"
            })}
        >
            <div className={styles["matching-extraction-condition"]}>
                <div className={styles["condition-mode"]}>
                    <span className={styles["condition-mode-text"]}>{i18next.t("过滤器模式")}</span>
                    <YakitRadioButtons
                        value={matcher.filterMode}
                        onChange={(e) => {
                            setMatcher({
                                ...matcher,
                                filterMode: e.target.value
                            })
                        }}
                        buttonStyle='solid'
                        options={filterModeOptions}
                        size={isSmallMode ? "small" : "middle"}
                    />
                    {matcher.filterMode === "onlyMatch" && (
                        <ColorSelect
                            value={matcher.hitColor}
                            onChange={(value) => {
                                setMatcher({
                                    ...matcher,
                                    hitColor: value
                                })
                            }}
                        />
                    )}
                </div>
                <div className={styles["condition-mode"]}>
                    <span className={styles["condition-mode-text"]}>{i18next.t("条件关系")}</span>
                    <YakitRadioButtons
                        value={matcher.matchersCondition}
                        onChange={(e) => {
                            setMatcher({
                                ...matcher,
                                matchersCondition: e.target.value
                            })
                        }}
                        buttonStyle='solid'
                        options={matchersConditionOptions}
                        size={isSmallMode ? "small" : "middle"}
                    />
                </div>
            </div>
            <YakitCollapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string)}
                accordion
                className={styles["matcher-extraction-collapse"]}
            >
                {matcher.matchersList.map((matcherItem, index) => (
                    <YakitPanel
                        header={
                            <div className={styles["collapse-panel-header"]}>
                                <span className={styles["header-id"]}>ID&nbsp;{index}</span>
                                <span>[{matcherTypeList.find((e) => e.value === matcherItem.MatcherType)?.label}]</span>
                                {matcherItem.Group.length > 0 ? (
                                    <span className={styles["header-number"]}>{matcherItem.Group.length}</span>
                                ) : (
                                    <YakitTag color='danger' size='small'>{i18next.t("暂未设置条件")}
                                    </YakitTag>
                                )}
                            </div>
                        }
                        extra={
                            !notEditable && (
                                <TrashIcon
                                    className={styles["trash-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        matcher.matchersList.splice(index, 1)
                                        setMatcher({
                                            ...matcher,
                                            matchersList: [...matcher.matchersList]
                                        })
                                        if (index === 0) {
                                            setActiveKey(`ID:${index + 1}`)
                                        } else {
                                            setActiveKey(`ID:${index - 1}`)
                                        }
                                    }}
                                />
                            )
                        }
                        key={`ID:${index}`}
                    >
                        <MatcherItem
                            matcherItem={matcherItem}
                            notEditable={notEditable}
                            onEdit={(field, value) => onEdit(field, value, index)}
                            httpResponse={httpResponse}
                            isSmallMode={isSmallMode}
                        />
                    </YakitPanel>
                ))}
            </YakitCollapse>
        </div>
    )
})

export const MatcherItem: React.FC<MatcherItemProps> = React.memo((props) => {
    const {notEditable, matcherItem, onEdit, httpResponse, isSmallMode} = props

    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label={i18next.t("匹配类型")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={matcherItem.MatcherType}
                        onChange={(e) => {
                            onEdit("MatcherType", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={matcherTypeList}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={i18next.t("匹配位置")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={matcherItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: i18next.t("状态码"), value: "status_code"},
                            {label: i18next.t("响应头"), value: "all_headers"},
                            {label: i18next.t("响应体"), value: "body"},
                            {label: i18next.t("全部响应"), value: "raw"}
                        ]}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={i18next.t("条件关系")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={matcherItem.Condition}
                        onChange={(e) => {
                            onEdit("Condition", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: "AND", value: "and"},
                            {label: "OR", value: "or"}
                        ]}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={i18next.t("不匹配(取反)")} column={isSmallMode}>
                    <YakitSwitch checked={matcherItem.Negative} onChange={(checked) => onEdit("Negative", checked)} />
                </LabelNodeItem>
            </div>
            <MatcherAndExtractionValueList
                httpResponse={httpResponse}
                showRegex={matcherItem.MatcherType === "regex"}
                group={matcherItem.Group}
                notEditable={notEditable}
                onEditGroup={(g) => {
                    onEdit("Group", g)
                }}
                onAddGroup={() => {
                    if (isMatcherItemEmpty(matcherItem)) {
                        yakitNotify("error", i18next.t("请将已添加条件配置完成后再新增"))
                        return
                    } else {
                        matcherItem.Group.push("")
                        onEdit("Group", matcherItem.Group)
                    }
                }}
            />
        </>
    )
})

const MatcherAndExtractionValueList: React.FC<MatcherAndExtractionValueListProps> = React.memo((props) => {
    const {showRegex, group, notEditable, onEditGroup, onAddGroup, httpResponse} = props
    const onChangeGroupItemValue = useMemoizedFn((v: string, number: number) => {
        group[number] = v
        onEditGroup(group)
    })
    return (
        <div className={styles["matching-extraction-list-value"]}>
            {group.map((groupItem, number) => (
                <LabelNodeItem label={`${!showRegex ? number : "Regexp"}`} key={`Data_${number}`}>
                    <div className={styles["matcher-item-textarea-body"]}>
                        {notEditable ? (
                            <div className={styles["matcher-item-text"]}>{groupItem}</div>
                        ) : (
                            <>
                                <AutoTextarea
                                    value={groupItem}
                                    onChange={(e) => {
                                        onChangeGroupItemValue(e.target.value, number)
                                    }}
                                    placeholder={i18next.t("请输入...")}
                                    className={styles["matcher-item-textarea"]}
                                />
                                <ResizerIcon className={styles["resizer-icon"]} />
                            </>
                        )}
                    </div>
                    {!notEditable && (
                        <div className={styles["matcher-item-operate"]}>
                            {showRegex && (
                                <RuleContent
                                    getRule={(rule) => {
                                        onChangeGroupItemValue(rule, number)
                                    }}
                                    defaultCode={httpResponse}
                                >
                                    <AdjustmentsIcon className={styles["adjustments-icon"]} />
                                </RuleContent>
                            )}
                            <TrashIcon
                                className={styles["trash-icon"]}
                                onClick={() => {
                                    group.splice(number, 1)
                                    onEditGroup(group)
                                }}
                            />
                        </div>
                    )}
                </LabelNodeItem>
            ))}
            {!notEditable && !showRegex && (
                <LabelNodeItem label={""}>
                    <div className={styles["add-matcher"]}>
                        <div className={styles["divider"]} />
                        <YakitButton
                            type='text'
                            icon={<PlusIcon />}
                            style={{justifyContent: "flex-start"}}
                            onClick={() => onAddGroup()}
                        >{i18next.t("添加匹配内容")}
                        </YakitButton>
                    </div>
                </LabelNodeItem>
            )}
        </div>
    )
})

export const ExtractorCollapse: React.FC<ExtractorCollapseProps> = React.memo((props) => {
    const {type, extractor, setExtractor, defActiveKey, notEditable, httpResponse, isSmallMode} = props

    const [activeKey, setActiveKey] = useState<string>("ID:0")
    const [editNameVisible, setEditNameVisible] = useState<boolean>(false)
    const [currentIndex, setCurrentIndex] = useState<number>()

    useEffect(() => {
        setActiveKey(defActiveKey)
    }, [defActiveKey])
    useEffect(() => {
        const length = extractor.extractorList.length
        setActiveKey(`ID:${length - 1}`)
    }, [extractor.extractorList.length])
    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        if (notEditable) return
        extractor.extractorList[index][field] = value
        setExtractor({
            ...extractor,
            extractorList: [...extractor.extractorList]
        })
    })
    const onEditName = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const {value} = e.target
        if (value.length > 20) {
            yakitNotify("error", i18next.t("字符长度不超过20"))
            return
        }
        onEdit("Name", value || `data_${index}`, index)
    })
    return (
        <div
            className={classNames(styles["matching-extraction-content"], {
                [styles["matching-extraction-content-hidden"]]: type !== "extractors"
            })}
            style={{paddingTop: 8}}
        >
            <YakitCollapse
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as string)}
                accordion
                className={styles["matcher-extraction-collapse"]}
            >
                {extractor.extractorList.map((extractorItem, index) => (
                    <YakitPanel
                        header={
                            <div className={styles["collapse-panel-header"]}>
                                <span className={classNames(styles["header-id"])}>
                                    <span>{extractorItem.Name || `data_${index}`}</span>
                                    <YakitPopover
                                        overlayClassName={styles["edit-name-popover"]}
                                        content={
                                            <div
                                                className={styles["edit-name-popover-content"]}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                            >
                                                <div className={styles["edit-name-popover-content-title"]}>{i18next.t("修改名称")}
                                                </div>
                                                <YakitInput
                                                    defaultValue={extractorItem.Name}
                                                    onChange={(e) => {
                                                        onEditName(e, index)
                                                    }}
                                                    onBlur={(e) => {
                                                        onEditName(e, index)
                                                    }}
                                                    maxLength={20}
                                                />
                                            </div>
                                        }
                                        placement='top'
                                        trigger={["click"]}
                                        visible={editNameVisible && currentIndex === index}
                                        onVisibleChange={setEditNameVisible}
                                    >
                                        <PencilAltIcon
                                            className={classNames({
                                                [styles["icon-active"]]: editNameVisible && currentIndex === index
                                            })}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setCurrentIndex(index)
                                            }}
                                        />
                                    </YakitPopover>
                                </span>
                                <span>[{extractorTypeList.find((e) => e.value === extractorItem.Type)?.label}]</span>
                                {extractorItem.Groups.length > 0 ? (
                                    <span className={classNames("content-ellipsis", styles["header-number"])}>
                                        {extractorItem.Groups.length}
                                    </span>
                                ) : (
                                    <YakitTag color='danger' size='small'>{i18next.t("暂未设置条件")}
                                    </YakitTag>
                                )}
                            </div>
                        }
                        extra={
                            !notEditable && (
                                <TrashIcon
                                    className={styles["trash-icon"]}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        extractor.extractorList.splice(index, 1)
                                        setExtractor({
                                            ...extractor,
                                            extractorList: [...extractor.extractorList]
                                        })
                                        if (index === 0) {
                                            setActiveKey(`ID:${index + 1}`)
                                        } else {
                                            setActiveKey(`ID:${index - 1}`)
                                        }
                                    }}
                                />
                            )
                        }
                        key={`ID:${index}`}
                    >
                        <ExtractorItem
                            extractorItem={extractorItem}
                            notEditable={notEditable}
                            onEdit={(field, value) => onEdit(field, value, index)}
                            httpResponse={httpResponse}
                            isSmallMode={isSmallMode}
                        />
                    </YakitPanel>
                ))}
            </YakitCollapse>
        </div>
    )
})

export const ExtractorItem: React.FC<ExtractorItemProps> = React.memo((props) => {
    const {notEditable, extractorItem, onEdit, httpResponse, isSmallMode} = props
    const onRenderTypeExtra: ReactNode = useCreation(() => {
        switch (extractorItem.Type) {
            case "regex":
                return (
                    <LabelNodeItem label={i18next.t("匹配正则分组")}>
                        <YakitInputNumber
                            value={extractorItem.RegexpMatchGroup[0] || 0}
                            onChange={(value) => onEdit("RegexpMatchGroup", [value])}
                            type='horizontal'
                            min={0}
                            size='small'
                        />
                    </LabelNodeItem>
                )
            case "xpath":
                return (
                    <LabelNodeItem label={i18next.t("XPath 参数")}>
                        <YakitInput
                            value={extractorItem.XPathAttribute}
                            onChange={(e) => onEdit("XPathAttribute", e.target.value)}
                            size='small'
                        />
                    </LabelNodeItem>
                )
            default:
                return <></>
        }
    }, [extractorItem.Type, extractorItem.RegexpMatchGroup, extractorItem.XPathAttribute])
    return (
        <>
            <div
                className={classNames(styles["collapse-panel-condition"], {
                    [styles["collapse-panel-condition-notEditable"]]: notEditable
                })}
            >
                <LabelNodeItem label={i18next.t("提取类型")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={extractorItem.Type}
                        onChange={(e) => {
                            onEdit("Type", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={extractorTypeList}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={i18next.t("提取范围")} column={isSmallMode}>
                    <YakitRadioButtons
                        value={extractorItem.Scope}
                        onChange={(e) => {
                            onEdit("Scope", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: i18next.t("响应头"), value: "header"},
                            {label: i18next.t("响应体"), value: "body"},
                            {label: "Raw", value: "raw"}
                        ]}
                    />
                </LabelNodeItem>
                {onRenderTypeExtra}
            </div>
            <MatcherAndExtractionValueList
                httpResponse={httpResponse}
                showRegex={extractorItem.Type === "regex"}
                group={extractorItem.Groups}
                notEditable={notEditable}
                onEditGroup={(g) => {
                    onEdit("Groups", g)
                }}
                onAddGroup={() => {
                    if (isExtractorEmpty(extractorItem)) {
                        yakitNotify("error", i18next.t("请将已添加条件配置完成后再新增"))
                        return
                    } else {
                        extractorItem.Groups.push("")
                        onEdit("Groups", extractorItem.Groups)
                    }
                }}
            />
        </>
    )
})

export const LabelNodeItem: React.FC<labelNodeItemProps> = React.memo((props) => {
    const {column} = props
    return (
        <div
            className={classNames(
                styles["label-node"],
                {
                    [styles["label-node-column"]]: column
                },
                props.className
            )}
        >
            <span className={classNames(styles["label"], props.labelClassName)}>{props.label}</span>
            {props.children}
        </div>
    )
})
const colors = [
    {
        color: "red",
        title: i18next.t("红色")
    },
    {
        color: "green",
        title: i18next.t("绿色")
    },
    {
        color: "blue",
        title: i18next.t("蓝色")
    },
    {
        color: "yellow",
        title: i18next.t("黄色")
    },
    {
        color: "orange",
        title: i18next.t("橙色")
    },
    {
        color: "purple",
        title: i18next.t("紫色")
    },
    {
        color: "cyan",
        title: i18next.t("天蓝色")
    },
    {
        color: "grey",
        title: i18next.t("灰色")
    }
]
export const ColorSelect: React.FC<ColorSelectProps> = React.memo((props) => {
    const {value, onChange, size} = props
    const [isShowColor, setIsShowColor] = useState<boolean>(false)

    return (
        <YakitPopover
            overlayClassName={styles["color-select-popover"]}
            content={
                <div className={styles["color-select-content"]}>
                    <span className={styles["hit-color"]}>{i18next.t("命中颜色")}</span>
                    <div className={styles["color-list"]}>
                        {colors.map((colorItem) => (
                            <div
                                className={classNames(styles["color-list-item"], {
                                    [styles["color-list-item-active"]]: value === colorItem.color
                                })}
                                key={colorItem.color}
                                onClick={() => {
                                    if (onChange) onChange(colorItem.color)
                                    setIsShowColor(false)
                                }}
                            >
                                <div className={classNames(styles["color-chunk"], `color-bg-${colorItem.color}`)} />
                                <span>{colorItem.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            }
            placement='bottom'
            visible={isShowColor}
            onVisibleChange={setIsShowColor}
        >
            <div
                className={classNames(styles["color-select-btn"], {
                    [styles["color-select-btn-active"]]: isShowColor,
                    [styles["color-select-btn-small"]]: size === "small",
                    [`color-bg-${value}`]: !!value
                })}
            >
                {!value && <ColorSwatchIcon />}
            </div>
        </YakitPopover>
    )
})

export const ExtractionResultsContent: React.FC<ExtractionResultsContentProps> = React.memo((props) => {
    const {list = []} = props
    return (
        <div className={classNames(styles["extract-results"], "yakit-descriptions")}>
            {/* <Descriptions size={"small"} bordered={true} column={1}>
                {list.map((i) => {
                    return (
                        <Descriptions.Item
                            key={`${i.Key}-${i.Value}`}
                            label={<CopyableField maxWidth={150} text={i.Key} />}
                        >
                            <CopyableField maxWidth={400} text={i.Value} />
                        </Descriptions.Item>
                    )
                    // return <p key={i.Key}>{`${i.Key}: ${i.Value}`}</p>
                })}
            </Descriptions> */}
            <Descriptions bordered size='small' column={2}>
                {list.map((item, index) => (
                    <Descriptions.Item label={<YakitCopyText showText={item.Key} />} span={2}>
                        {item.Value ? <YakitCopyText showText={item.Value} /> : ""}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </div>
    )
})

export const MatcherAndExtractionDrawer: React.FC<MatcherAndExtractionDrawerProps> = React.memo((props) => {
    const {visibleDrawer, defActiveType, httpResponse, defActiveKey, matcherValue, extractorValue, onClose, onSave} =
        props
    const heightDrawer = useMemo(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 40
    }, [menuBodyHeight.firstTabMenuBodyHeight])

    return (
        <YakitDrawer
            mask={false}
            visible={visibleDrawer}
            width='100vh'
            headerStyle={{display: "none"}}
            style={{height: visibleDrawer ? heightDrawer : 0}}
            contentWrapperStyle={{height: heightDrawer, boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
            bodyStyle={{padding: 0}}
            placement='bottom'
        >
            <MatcherAndExtractionCard
                defActiveType={defActiveType}
                httpResponse={httpResponse}
                defActiveKey={defActiveKey}
                matcherValue={matcherValue}
                extractorValue={extractorValue}
                onClose={onClose}
                onSave={onSave}
            />
        </YakitDrawer>
    )
})
