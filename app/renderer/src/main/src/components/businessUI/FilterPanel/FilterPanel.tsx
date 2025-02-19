import React, {useEffect, useState} from "react"
import {FilterPanelProps} from "./FilterPanelType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {Tooltip} from "antd"
import {OutlineCloseIcon} from "@/assets/icon/outline"
import {API} from "@/services/swagger/resposeType"

import styles from "./FilterPanel.module.scss"
import classNames from "classnames"
import i18next from "../../../i18n"

const {YakitPanel} = YakitCollapse

export const FilterPanel: React.FC<FilterPanelProps> = React.memo((props) => {
    const {
        wrapperClassName,
        loading = false,
        visible,
        setVisible,
        selecteds,
        onSelect,
        groupList,
        noDataHint,
        listClassName
    } = props

    const [activeKey, setActiveKey] = useState<string[]>([])
    useEffect(() => {
        const keys = groupList.map((l) => l.groupKey)
        setActiveKey(keys)
    }, [groupList])

    const onClear = useMemoizedFn((key: string) => {
        const selected = {...selecteds}
        selected[key] = []
        onSelect({...selected})
    })
    const onCheck = useMemoizedFn((groupKey: string, data: API.PluginsSearchData, check: boolean) => {
        const selected = {...selecteds}
        if (check) {
            selected[groupKey] = [...(selected[groupKey] || []), data]
        } else {
            selected[groupKey] = (selected[groupKey] || []).filter((item) => item.value !== data.value)
        }
        onSelect({...selected})
    })
    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    return (
        <div className={classNames(styles["filter-panel-wrapper"], wrapperClassName || "")}>
            <div className={styles["filter-panel-container"]}>
                <div className={styles["panel-header"]}>
                    <span className={styles["header-title"]}>{i18next.t("高级筛选")}</span>
                    <Tooltip title={i18next.t("收起筛选")} placement='top' overlayClassName='plugins-tooltip'>
                        <YakitButton
                            type='text2'
                            onClick={onClose}
                            icon={<OutlineCloseIcon className={styles["panel-header-icon"]} />}
                        ></YakitButton>
                    </Tooltip>
                </div>
                <div className={styles["panel-content"]}>
                    <YakitSpin spinning={loading}>
                        <div className={classNames(styles["content-body"], listClassName)}>
                            <YakitCollapse
                                activeKey={activeKey}
                                onChange={(key) => setActiveKey(key as string[])}
                                className={styles["content-collapse"]} 
                            >
                                {groupList.map((item, i) => (
                                    <YakitPanel
                                        header={item.groupName}
                                        key={item.groupKey}
                                        extra={
                                            <YakitButton
                                                type='text'
                                                colors='danger'
                                                className={styles["clear-btn"]}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onClear(item.groupKey)
                                                }}
                                            >
                                                {i18next.t("清空")}
                                            </YakitButton>
                                        }
                                    >
                                        {(item.data || []).map((listItem) => {
                                            const checked =
                                                (selecteds[item.groupKey] || []).findIndex(
                                                    (ele) => ele.value === listItem.value
                                                ) !== -1
                                            return (
                                                <label
                                                    className={classNames(styles["list-item"], {
                                                        [styles["list-item-active"]]: checked
                                                    })}
                                                    key={`${item.groupKey}-${listItem.value}`}
                                                >
                                                    <div className={styles["list-item-left"]}>
                                                        <YakitCheckbox
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                onCheck(item.groupKey, listItem, e.target.checked)
                                                            }
                                                        />
                                                        <span
                                                            className={classNames(
                                                                styles["item-title"],
                                                                "yakit-content-single-ellipsis"
                                                            )}
                                                            title={listItem.label}
                                                        >
                                                            {listItem.label}
                                                        </span>
                                                    </div>
                                                    <span className={styles["list-item-extra"]}>{listItem.count}</span>
                                                </label>
                                            )
                                        })}
                                    </YakitPanel>
                                ))}
                            </YakitCollapse>
                            {groupList.length > 0 && <div className={styles["to-end"]}>{i18next.t("已经到底啦～")}</div>}
                            {groupList.length === 0 && (
                                <YakitEmpty style={{paddingTop: 48}} title={noDataHint || i18next.t("暂无数据")} />
                            )}
                        </div>
                    </YakitSpin>
                </div>
            </div>
        </div>
    )
})
