import {ArrowCircleRightSvgIcon, FilterIcon} from "@/assets/newIcon"
import {DurationMsToColor, RangeInputNumberTable, StatusCodeToColor} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {ResizeBox} from "@/components/ResizeBox"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {compareAsc, compareDesc} from "@/pages/yakitStore/viewers/base"
import {HTTP_PACKET_EDITOR_Response_Info, IMonacoEditor, NewHTTPPacketEditor} from "@/utils/editors"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {failed, yakitFailed, yakitNotify} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {formatTimestamp} from "@/utils/timeUtil"
import {useCreation, useDebounceFn, useMemoizedFn, useThrottleEffect, useUpdateEffect} from "ahooks"
import classNames from "classnames"
import moment from "moment"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {analyzeFuzzerResponse, FuzzerResponse, onAddOverlayWidget} from "../../HTTPFuzzerPage"
import styles from "./HTTPFuzzerPageTable.module.scss"
import {ArrowRightSvgIcon} from "@/components/layout/icons"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {Divider, Space, Tooltip} from "antd"
import {ExtractionResultsContent} from "../../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import emiter from "@/utils/eventBus/eventBus"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import { openABSFileLocated } from "@/utils/openWebsite"
import i18next from "../../../../i18n"

const {ipcRenderer} = window.require("electron")

interface HTTPFuzzerPageTableProps {
    ref?: any
    query?: HTTPFuzzerPageTableQuery
    data: FuzzerResponse[]
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    isRefresh?: boolean
    /**@name 提取的数据 */
    extractedMap: Map<string, string>
    /**@name 数据是否传输完成 */
    isEnd: boolean
    setExportData?: (v: FuzzerResponse[]) => void
    /**@name 是否可以调试匹配器或提取器 */
    isShowDebug?: boolean
    /**点击调试回调 */
    onDebug?: (res: string) => void
    pageId?: string
}

/**
 * @description B转为kB M
 * @returns {string}
 */
const convertBodyLength = (val: string) => {
    const limit = parseInt(val)
    let size = ""
    if (limit < 0.1 * 1024) {
        //小于0.1KB，则转化成B
        size = limit.toFixed(2) + "B"
    } else if (limit < 0.1 * 1024 * 1024) {
        //小于0.1MB，则转化成KB
        size = (limit / 1024).toFixed(2) + "KB"
    } else if (limit < 0.1 * 1024 * 1024 * 1024) {
        //小于0.1GB，则转化成MB
        size = (limit / (1024 * 1024)).toFixed(2) + "MB"
    }
    return size
}

export interface HTTPFuzzerPageTableQuery {
    keyWord?: string
    afterBodyLength?: number
    beforeBodyLength?: number
    StatusCode?: string[]
    // bodyLengthUnit: "B" | "k" | "M"
}

export const sorterFunction = (list, sorterTable, defSorter = "Count") => {
    // ------------  排序 开始  ------------
    let newList = list
    // 重置
    if (sorterTable?.order === "none") {
        newList = list.sort((a, b) => compareAsc(a, b, defSorter))
    }
    // 升序
    if (sorterTable?.order === "asc") {
        newList = list.sort((a, b) => compareAsc(a, b, sorterTable?.orderBy))
    }
    // 降序
    if (sorterTable?.order === "desc") {
        newList = list.sort((a, b) => compareDesc(a, b, sorterTable?.orderBy))
    }
    // ------------  排序 结束  ------------
    return newList
}

export const HTTPFuzzerPageTable: React.FC<HTTPFuzzerPageTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            data,
            success,
            query = {},
            setQuery,
            isRefresh,
            extractedMap,
            isEnd,
            setExportData,
            isShowDebug,
            onDebug,
            pageId
        } = props
        const [listTable, setListTable] = useState<FuzzerResponse[]>([...data])
        const [loading, setLoading] = useState<boolean>(false)
        const [sorterTable, setSorterTable] = useState<SortProps>()

        const [firstFull, setFirstFull] = useState<boolean>(true) // 表格是否全屏
        const [currentSelectItem, setCurrentSelectItem] = useState<FuzzerResponse>() //选中的表格项
        const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("response") //选中的表格项

        const [isHaveData, setIsHaveData] = useState<boolean>(false) // 查询提取数据不为空

        const [editor, setEditor] = useState<IMonacoEditor>()
        const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

        const bodyLengthRef = useRef<any>()
        const tableRef = useRef<any>(null)

        useImperativeHandle(
            ref,
            () => ({
                // 减少父组件获取的DOM元素属性,只暴露给父组件需要用到的方法
                setCurrentSelectItem,
                setFirstFull
            }),
            []
        )

        const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
            return success
                ? [
                      {
                          title: i18next.t("请求"),
                          dataKey: "Count",
                          render: (v, _, index) => index + 1,
                          width: 80,
                          sorterProps: {
                              sorter: true
                          },
                          fixed: "left"
                      },
                      {
                          title: "Method",
                          dataKey: "Method",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: i18next.t("状态"),
                          dataKey: "StatusCode",
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !hasRedOpacityBg(rowData.cellClassName) ? StatusCodeToColor(v) : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              ),
                          width: 90,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterMultiple: true,
                              filtersType: "select",
                              filters: [
                                  {
                                      value: "100-200",
                                      label: "100-200"
                                  },
                                  {
                                      value: "200-300",
                                      label: "200-300"
                                  },
                                  {
                                      value: "300-400",
                                      label: "300-400"
                                  },
                                  {
                                      value: "400-500",
                                      label: "400-500"
                                  },
                                  {
                                      value: "500-600",
                                      label: "500-600"
                                  }
                              ]
                          }
                      },
                      {
                          title: i18next.t("响应大小"),
                          dataKey: "BodyLength",
                          width: 120,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterKey: "bodyLength",
                              filterIcon: (
                                  <FilterIcon
                                      className={classNames(styles["filter-icon"], {
                                          [styles["active-icon"]]: query?.afterBodyLength || query?.beforeBodyLength
                                      })}
                                  />
                              ),
                              filterRender: () => (
                                  <BodyLengthInputNumber
                                      ref={bodyLengthRef}
                                      query={query}
                                      setQuery={(q) => {
                                          setQuery({
                                              ...q
                                          })
                                      }}
                                      onSure={() => {
                                          setTimeout(() => {
                                              update()
                                          }, 100)
                                      }}
                                      showFooter={true}
                                  />
                              )
                          }
                      },
                      {
                          title: i18next.t("延迟(ms)"),
                          dataKey: "DurationMs",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          },
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !hasRedOpacityBg(rowData.cellClassName) ? DurationMsToColor(v) : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          width: 300,
                          render: (v) => (v ? v.join(",") : "-")
                      },
                      {
                          title: i18next.t("提取数据"),
                          dataKey: "ExtractedResults",
                          width: 300,
                          beforeIconExtra: (
                              <div className={classNames(styles["extracted-checkbox"])}>
                                  <YakitCheckbox
                                      checked={isHaveData}
                                      onChange={(e) => setIsHaveData(e.target.checked)}
                                  />
                                  <span className={styles["tip"]}>{i18next.t("不为空")}</span>
                              </div>
                          ),
                          render: (item, record) =>
                              extractedMap.size > 0 ? (
                                  extractedMap.get(record["UUID"]) || "-"
                              ) : item?.length > 0 ? (
                                  <div className={styles["table-item-extracted-results"]}>
                                      <span className={styles["extracted-results-text"]}>
                                          {item.map((i) => `${i.Key}: ${i.Value} `)}
                                      </span>
                                      {item?.length > 1 && (
                                          <YakitButton
                                              type='text'
                                              size='small'
                                              onClick={(e) => {
                                                  e.stopPropagation()
                                                  onViewExecResults(item)
                                              }}
                                          >{i18next.t("详情")}
                                          </YakitButton>
                                      )}
                                  </div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: i18next.t("响应相似度"),
                          dataKey: "BodySimilarity",
                          width: 120,
                          render: (v, rowData) => {
                              const text = parseFloat(`${v}`).toFixed(3)
                              return text ? (
                                  <div
                                      style={{
                                          color:
                                              !hasRedOpacityBg(rowData.cellClassName) && text.startsWith("1.00")
                                                  ? "var(--yakit-success-5)"
                                                  : undefined
                                      }}
                                  >
                                      {text}
                                  </div>
                              ) : (
                                  "-"
                              )
                          },
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: i18next.t("HTTP头相似度"),
                          dataKey: "HeaderSimilarity",
                          render: (v) => (v ? parseFloat(`${v}`).toFixed(3) : "-"),
                          width: 120,
                          sorterProps: {
                              sorter: true
                          }
                      },

                      {
                          title: "Content-Type",
                          dataKey: "ContentType",
                          width: 300
                      },
                      {
                          title: "time",
                          dataKey: "Timestamp",
                          width: 165,
                          render: (text) => (text ? formatTimestamp(text) : "-"),
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: i18next.t("操作"),
                          dataKey: "UUID",
                          fixed: "right",
                          width: isShowDebug !== false ? 85 : 60,
                          render: (_, record, index: number) => {
                              return (
                                  <div className={styles["operate-icons"]}>
                                      {isShowDebug !== false && (
                                          <>
                                              <Tooltip title={i18next.t("调试")}>
                                                  <HollowLightningBoltIcon
                                                      onClick={(e) => {
                                                          e.stopPropagation()
                                                          if (onDebug) {
                                                              onDebug(Uint8ArrayToString(record.ResponseRaw))
                                                          } else {
                                                              ipcRenderer.invoke("send-open-matcher-and-extraction", {
                                                                  httpResponseCode: Uint8ArrayToString(
                                                                      record.ResponseRaw
                                                                  )
                                                              })
                                                          }
                                                      }}
                                                      style={{
                                                          color: !hasRedOpacityBg(record.cellClassName) ? "" : "#fff"
                                                      }}
                                                  />
                                              </Tooltip>
                                              <Divider type='vertical' style={{margin: 0}} />
                                          </>
                                      )}

                                      <ArrowCircleRightSvgIcon
                                          style={{
                                              color: !hasRedOpacityBg(record.cellClassName) ? "" : "#fff"
                                          }}
                                          onClick={(e) => {
                                              e.stopPropagation()
                                              onDetails(record, index)
                                          }}
                                      />
                                  </div>
                              )
                          }
                      }
                  ]
                : [
                      {
                          title: "Method",
                          dataKey: "Method",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: i18next.t("失败原因"),
                          dataKey: "Reason",
                          render: (v) => {
                              return v ? (
                                  <YakitTag color='danger' style={{maxWidth: "100%"}}>
                                      <span className={styles["fail-reason"]}>{v}</span>
                                      <CopyComponents copyText={v} />
                                  </YakitTag>
                              ) : (
                                  "-"
                              )
                          }
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          render: (v) => v.join(",")
                      }
                  ]
        }, [success, query?.afterBodyLength, query?.beforeBodyLength, extractedMap, isHaveData, isShowDebug])

        // 背景颜色是否标注为红色
        const hasRedOpacityBg = (cellClassName: string) => cellClassName.indexOf("color-opacity-bg-red") !== -1

        useThrottleEffect(
            () => {
                if (isEnd && sorterTable) {
                    const scrollTop = tableRef.current?.containerRef?.scrollTop
                    if (scrollTop <= 10) {
                        queryData()
                    }
                } else {
                    queryData()
                }
            },
            [data, isEnd],
            {wait: 200}
        )

        useEffect(() => {
            update()
        }, [isRefresh])
        useUpdateEffect(() => {
            update()
        }, [query, isHaveData])
        useEffect(() => {
            getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
                .then((data) => {
                    setShowResponseInfoSecondEditor(data === "false" ? false : true)
                })
                .catch(() => {
                    setShowResponseInfoSecondEditor(true)
                })
        }, [])
        const onViewExecResults = useMemoizedFn((list) => {
            showYakitModal({
                title: i18next.t("提取结果"),
                width: "60%",
                footer: <></>,
                content: <ExtractionResultsContent list={list} />
            })
        })
        const onDetails = useMemoizedFn((record, index: number) => {
            analyzeFuzzerResponse(record, index, data)
        })
        const onTableChange = useMemoizedFn(
            (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
                const l = bodyLengthRef?.current?.getValue() || {}
                setQuery({
                    ...query,
                    ...filters,
                    ...l
                })
                setSorterTable(sorter)
            }
        )

        const update = useDebounceFn(
            () => {
                setLoading(true)
                new Promise((resolve, reject) => {
                    try {
                        queryData()
                        resolve(true)
                    } catch (error) {
                        reject(error)
                    }
                })
                    .catch((e) => {
                        yakitFailed(i18next.t("搜索失败:") + e)
                    })
                    .finally(() => {
                        setTimeout(() => {
                            setLoading(false)
                        }, 200)
                    })
            },
            {
                wait: 200
            }
        ).run
        /**
         * @description 前端搜索
         */
        const queryData = useMemoizedFn(() => {
            try {
                // ------------  搜索 开始  ------------
                // 有搜索条件才循环
                if (
                    query?.keyWord ||
                    (query?.StatusCode && query?.StatusCode?.length > 0) ||
                    query?.afterBodyLength ||
                    query?.beforeBodyLength ||
                    isHaveData
                ) {
                    const newDataTable = sorterFunction(data, sorterTable) || []
                    const l = newDataTable.length
                    const searchList: FuzzerResponse[] = []
                    for (let index = 0; index < l; index++) {
                        const record = newDataTable[index]
                        // 关键字搜索是否满足，默认 满足，以下同理,搜索同时为true时，push新数组
                        let keyWordIsPush = true
                        let statusCodeIsPush = true
                        let bodyLengthMinIsPush = true
                        let bodyLengthMaxIsPush = true
                        let isHaveDataIsPush = true
                        // 搜索满足条件 交集
                        // 关键字搜索
                        if (query?.keyWord) {
                            const responseString = Uint8ArrayToString(record.ResponseRaw)
                            const payloadsString = (record.Payloads || []).join("")
                            keyWordIsPush = (responseString + payloadsString).includes(query.keyWord)
                        }
                        // 状态码搜索
                        if (query?.StatusCode && query?.StatusCode?.length > 0) {
                            const cLength = query.StatusCode
                            const codeIsPushArr: boolean[] = []
                            for (let index = 0; index < cLength.length; index++) {
                                const element = query.StatusCode[index]
                                const codeArr = element.split("-")
                                if (record.StatusCode >= codeArr[0] && record.StatusCode <= codeArr[1]) {
                                    codeIsPushArr.push(true)
                                } else {
                                    codeIsPushArr.push(false)
                                }
                            }
                            statusCodeIsPush = codeIsPushArr.includes(true)
                        }
                        // 响应大小搜索
                        if (query?.afterBodyLength) {
                            // 最小
                            bodyLengthMinIsPush = Number(record.BodyLength) >= query.afterBodyLength
                        }
                        if (query?.beforeBodyLength) {
                            // 最大
                            bodyLengthMaxIsPush = Number(record.BodyLength) <= query.beforeBodyLength
                        }
                        // 是否有提取数据
                        if (isHaveData) {
                            if (extractedMap.size > 0) {
                                isHaveDataIsPush = !!extractedMap.get(record["UUID"])
                            } else {
                                isHaveDataIsPush = record.ExtractedResults.length > 0
                            }
                        }
                        // 搜索同时为true时，push新数组
                        if (
                            keyWordIsPush &&
                            statusCodeIsPush &&
                            bodyLengthMinIsPush &&
                            bodyLengthMaxIsPush &&
                            isHaveDataIsPush
                        ) {
                            searchList.push(record)
                        }
                    }
                    setExportData && setExportData([...searchList])
                    setListTable([...searchList])
                } else {
                    const newData = sorterFunction(data, sorterTable) || []
                    setExportData && setExportData([...newData])
                    setListTable([...newData])
                }
                // ------------  搜索 结束  ------------
            } catch (error) {
                yakitFailed(i18next.t("搜索失败:") + error)
            }
        })

        const onGetExportFuzzerEvent = useMemoizedFn((v: string) => {
            try {
                const obj:{pageId:string,type:"all" | "payload"} = JSON.parse(v)
                if(pageId===obj.pageId){
                    // 处理Uint8Array经过JSON.parse(JSON.stringify())导致数据损失和变形
                    const newListTable = listTable.map((item)=>({
                        ...item,
                        RequestRaw:Uint8ArrayToString(item.RequestRaw),
                        ResponseRaw:Uint8ArrayToString(item.ResponseRaw)
                    }))
                    emiter.emit("onGetExportFuzzerCallBack", JSON.stringify({listTable:newListTable, type:obj.type ,pageId})) 
                }
            } catch (error) {}
            
            
        })

        // 获取最新table值 用于筛选
        useEffect(() => {
            emiter.on("onGetExportFuzzer", onGetExportFuzzerEvent)
            return () => {
                emiter.off("onGetExportFuzzer", onGetExportFuzzerEvent)
            }
        }, [])

        const onRowClick = useMemoizedFn((val) => {
            if (val?.UUID === currentSelectItem?.UUID) {
                setCurrentSelectItem(undefined)
                setFirstFull(true)
            } else {
                setCurrentSelectItem(val)
                setFirstFull(false)
            }
        })

        const onSetCurrentRow = useDebounceFn(
            (rowDate: FuzzerResponse) => {
                onRowClick(rowDate)
            },
            {wait: 200}
        ).run

        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (firstFull) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
            }
            return p
        }, [firstFull])

        const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
            return {
                overlayWidgetv: {
                    menu: [
                        {
                            key: "is-show-add-overlay-widgetv",
                            label: showResponseInfoSecondEditor ? i18next.t("隐藏响应信息") : i18next.t("显示响应信息")
                        }
                    ],
                    onRun: () => {
                        setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                        setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                    }
                }
            }
        }, [showResponseInfoSecondEditor])
        useEffect(() => {
            if (!editor || !currentSelectItem) return
            onAddOverlayWidget(editor, currentSelectItem, showResponseInfoSecondEditor)
        }, [currentSelectItem, showResponseInfoSecondEditor])
        const onExecResults = useMemoizedFn(() => {
            if (currentSelectItem) {
                onViewExecResults(currentSelectItem.ExtractedResults)
            }
        })
        return (
            <div className={styles['http-fuzzer-page-table']} style={{overflowY: "hidden", height: "100%"}}>
                <YakitResizeBox
                    isVer={true}
                    lineDirection='bottom'
                    lineStyle={{display: firstFull ? "none" : ""}}
                    secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                    firstNode={
                        <TableVirtualResize<FuzzerResponse>
                            ref={tableRef}
                            query={query}
                            isRefresh={isRefresh || loading}
                            titleHeight={0.01}
                            renderTitle={<></>}
                            renderKey='UUID'
                            data={listTable}
                            loading={loading}
                            enableDrag={true}
                            columns={columns}
                            onChange={onTableChange}
                            containerClassName={classNames(styles["table-container"], {
                                [styles["table-container-border"]]: currentSelectItem?.ResponseRaw
                            })}
                            currentSelectItem={currentSelectItem}
                            onSetCurrentRow={onSetCurrentRow}
                            useUpAndDown={true}
                        />
                    }
                    secondNode={
                        <NewHTTPPacketEditor
                            language={currentSelectItem?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!currentSelectItem?.IsTooLargeResponse}
                            title={
                                <div className={styles["second-node-title-wrapper"]}>
                                    <span className={styles["second-node-title-text"]}>{i18next.t("快速预览")}</span>
                                    <div className={styles["second-node-title-btns"]}>
                                        <YakitRadioButtons
                                            size='small'
                                            value={currentSelectShowType}
                                            onChange={(e) => {
                                                setCurrentSelectShowType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "request",
                                                    label: i18next.t("请求")
                                                },
                                                {
                                                    value: "response",
                                                    label: i18next.t("响应")
                                                }
                                            ]}
                                        />
                                        {currentSelectItem?.IsTooLargeResponse && (
                                            <YakitTag style={{marginLeft: 8}} color='danger'>{i18next.t("超大响应")}
                                            </YakitTag>
                                        )}
                                    </div>
                                </div>
                            }
                            defaultHttps={currentSelectItem?.IsHTTPS}
                            isResponse={true}
                            readOnly={true}
                            hideSearch={true}
                            noHex={true}
                            // noHeader={true}
                            originValue={
                                (currentSelectShowType === "request"
                                    ? currentSelectItem?.RequestRaw
                                    : currentSelectItem?.ResponseRaw) || new Buffer([])
                            }
                            onAddOverlayWidget={(editor) => {
                                setEditor(editor)
                            }}
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={currentSelectItem?.RequestRaw || new Buffer([])}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            extra={[
                                currentSelectItem?.IsTooLargeResponse && (
                                    <YakitDropdownMenu
                                        menu={{
                                            data: [
                                                {key: "tooLargeResponseHeaderFile", label: i18next.t("查看Header")},
                                                {key: "tooLargeResponseBodyFile", label: i18next.t("查看Body")}
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "tooLargeResponseHeaderFile":
                                                        ipcRenderer
                                                            .invoke("is-file-exists", currentSelectItem.TooLargeResponseHeaderFile)
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(currentSelectItem.TooLargeResponseHeaderFile)
                                                                } else {
                                                                    failed(i18next.t("目标文件已不存在!"))
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    case "tooLargeResponseBodyFile":
                                                        ipcRenderer
                                                            .invoke("is-file-exists", currentSelectItem.TooLargeResponseBodyFile)
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(currentSelectItem.TooLargeResponseBodyFile)
                                                                } else {
                                                                    failed(i18next.t("目标文件已不存在!"))
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <YakitButton type='primary' size='small'>{i18next.t("完整响应")}
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                ),
                                <YakitButton size='small' onClick={onExecResults}>{i18next.t("提取数据")}
                                </YakitButton>
                            ]}
                        />
                    }
                    {...ResizeBoxProps}
                />
            </div>
        )
    })
)

interface BodyLengthInputNumberProps {
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    onSure?: () => void
    showFooter?: boolean
    ref?: any
}

export const BodyLengthInputNumber: React.FC<BodyLengthInputNumberProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {query, setQuery, showFooter} = props
        // 响应大小
        const [afterBodyLength, setAfterBodyLength] = useState<number>()
        const [beforeBodyLength, setBeforeBodyLength] = useState<number>()
        useEffect(() => {
            setAfterBodyLength(query?.afterBodyLength)
            setBeforeBodyLength(query?.beforeBodyLength)
        }, [query])
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const objLength = {
                        afterBodyLength,
                        beforeBodyLength
                    }
                    return objLength
                }
            }),
            [afterBodyLength, beforeBodyLength]
        )
        return (
            <div className={styles["range-input-number"]}>
                <RangeInputNumberTable
                    showFooter={showFooter}
                    minNumber={afterBodyLength}
                    setMinNumber={setAfterBodyLength}
                    maxNumber={beforeBodyLength}
                    setMaxNumber={setBeforeBodyLength}
                    onReset={() => {
                        setQuery({
                            ...query,
                            afterBodyLength,
                            beforeBodyLength
                        })
                        setBeforeBodyLength(undefined)
                        setAfterBodyLength(undefined)
                    }}
                    onSure={() => {
                        setQuery({
                            ...query,
                            afterBodyLength,
                            beforeBodyLength
                        })
                    }}
                />
            </div>
        )
    })
)
