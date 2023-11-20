import React, {useState} from "react"
import {DemoItemSelectMultiForString, DemoItemSelectOne} from "./itemSelect/ItemSelect"
import {DemoItemSwitch} from "./itemSwitch/ItemSwitch"
import {DemoItemCheckBox, DemoItemRadio, DemoItemRadioButton} from "./itemRadioAndCheckbox/RadioAndCheckbox"
import {
    DemoItemAutoComplete,
    DemoItemInput,
    DemoItemInputDraggerPath,
    DemoItemInputFloat,
    DemoItemInputInteger,
    DemoItemTextArea
} from "./itemInput/ItemInput"
import {DemoVirtualTable} from "./virtualTable/VirtualTable"

import {v4 as uuidv4} from "uuid"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import i18next from "../i18n"
interface InfoProps {
    id: number
    name: string
    time: number
    content: string
}

const apiFetchList: () => Promise<{
    data: InfoProps[]
    pagemeta: {limit: number; page: number; total: number; total_page: number}
}> = () => {
    return new Promise((resolve, reject) => {
        try {
            const obj: {data: InfoProps[]; pagemeta: {limit: number; page: number; total: number; total_page: number}} =
                {
                    data: [1, 2, 3, 4, 5].map((item) => {
                        const id = Math.floor(Math.random() * 1000)
                        const name = uuidv4()
                        const obj: InfoProps = {
                            id: id,
                            name: name,
                            time: new Date().getTime(),
                            content: name
                        }
                        return obj
                    }),
                    pagemeta: {limit: 20, page: 1, total: 10000, total_page: 500}
                }
            setTimeout(() => {
                resolve(obj)
            }, 1000)
        } catch (error) {
            reject("error")
        }
    })
}

export const DemoLayout: React.FC<any> = (p) => {
    const [oneSelect, setOneSelect] = useState<number>()
    const [multiSelect, setMultiSelect] = useState<string>()

    const [switchValue, setSwitchValue] = useState<boolean>(false)

    const [radios, setRadios] = useState<string>("1")
    const [radiosButton, setRadiosButton] = useState<string>("1")
    const [checkboxs, setCheckboxs] = useState<string[]>([])

    const [inputs, setInputs] = useState<string>("")
    const [textareas, setTextareas] = useState<string>("")
    const [autoCompletes, setAutoCompletes] = useState<string>("")
    const [integers, setIntegers] = useState<number>(0)
    const [floats, setFloats] = useState<number>(0.01)
    const [path, setPath] = useState<string>("")

    const [isStop, setIsStop] = useState<boolean>(false)
    const [triggerClear, setTriggetClear] = useState<boolean>(false)
    const loadMore: (info?: InfoProps) => Promise<{data: InfoProps[]}> = useMemoizedFn((info) => {
        return new Promise((resolve, reject) => {
            apiFetchList()
                .then((res) => {
                    resolve({data: res.data})
                })
                .catch((e) => {
                    reject(e)
                })
        })
    })

    return (
        <div style={{width: "100%", height: "100%", overflow: "hidden", display: "flex"}}>
            <div
                style={{
                    paddingLeft: 20,
                    width: "40%",
                    height: "100%",
                    borderRight: "1px solid #000",
                    overflow: "hidden auto"
                }}
            >
                <DemoItemSelectOne
                    value={oneSelect}
                    setValue={setOneSelect}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("单选下拉框")}
                    help={i18next.t("这里是帮助信息")}
                    placeholder={i18next.t("请选择")}
                    data={[
                        {label: "1", value: 1},
                        {label: "2", value: 2},
                        {label: "3", value: 3},
                        {label: "4", value: 4}
                    ]}
                />
                <DemoItemSelectMultiForString
                    value={multiSelect}
                    setValue={setMultiSelect}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("多选下拉框")}
                    help={i18next.t("这里是帮助信息")}
                    placeholder={i18next.t("请选择")}
                    allowClear={true}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemSwitch
                    value={switchValue}
                    setValue={setSwitchValue}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("开关")}
                    help={i18next.t("这里是帮助信息")}
                />
                <DemoItemRadio
                    value={radios}
                    setValue={setRadios}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("单选组")}
                    help={i18next.t("这里是帮助信息")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemRadioButton
                    value={radiosButton}
                    setValue={setRadiosButton}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("单选按钮组")}
                    help={i18next.t("这里是帮助信息")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemCheckBox
                    value={checkboxs}
                    setValue={setCheckboxs}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("复选框")}
                    help={i18next.t("这里是帮助信息")}
                    data={[
                        {label: "1", value: "1"},
                        {label: "2", value: "2"},
                        {label: "3", value: "3"},
                        {label: "4", value: "4"}
                    ]}
                />
                <DemoItemInput
                    value={inputs}
                    setValue={setInputs}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("输入框")}
                    help={i18next.t("这里是帮助信息")}
                    required={true}
                    placeholder={i18next.t("提示信息")}
                />
                <DemoItemTextArea
                    value={textareas}
                    setValue={setTextareas}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("文本域")}
                    help={i18next.t("这里是帮助信息")}
                    placeholder={i18next.t("提示信息")}
                    allowClear={true}
                    autoSize={{minRows: 1, maxRows: 3}}
                />
                <DemoItemAutoComplete
                    value={autoCompletes}
                    setValue={setAutoCompletes}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("提示输入框")}
                    help={i18next.t("这里是帮助信息")}
                    placeholder={i18next.t("提示信息")}
                    allowClear={true}
                    autoComplete={[i18next.t("真的加的1"), i18next.t("真的加的2"), i18next.t("真的加的3"), i18next.t("真的加的4")]}
                />
                <DemoItemInputInteger
                    value={integers}
                    setValue={setIntegers}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("整数框")}
                    help={i18next.t("这里是帮助信息")}
                    min={0}
                    max={10}
                />
                <DemoItemInputFloat
                    value={floats}
                    setValue={setFloats}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("浮点数框")}
                    help={i18next.t("这里是帮助信息")}
                    min={0}
                    max={10}
                    precision={2}
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("input文件框")}
                    help={i18next.t("这里是帮助信息")}
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("textarea文件框")}
                    help={i18next.t("这里是帮助信息")}
                    renderType='textarea'
                />
                <DemoItemInputDraggerPath
                    value={path}
                    setValue={setPath}
                    formItemStyle={{width: "80%"}}
                    label={i18next.t("textarea文件夹框")}
                    help={i18next.t("这里是帮助信息")}
                    selectType='folder'
                    renderType='textarea'
                />
            </div>
            <div style={{width: "60%", height: "100%", display: "flex", flexDirection: "column"}}>
                <div style={{width: "100%", height: 450, overflow: "hidden", display: "flex", flexDirection: "column"}}>
                    <div style={{display: "flex", gap: 10}}>
                        <YakitButton onClick={() => setTriggetClear(!triggerClear)}>{i18next.t("清空数据")}</YakitButton>
                        <YakitButton onClick={() => setIsStop(!isStop)}>{isStop ? i18next.t("开始更新") : i18next.t("停止更新")}</YakitButton>
                    </div>
                    <DemoVirtualTable
                        isTopLoadMore={true}
                        isStop={isStop}
                        triggerClear={triggerClear}
                        wait={2000}
                        rowKey='name'
                        loadMore={loadMore}
                        columns={[
                            {
                                key: "id",
                                headerTitle: "ID",
                                width: 80
                            },
                            {
                                key: "name",
                                headerTitle: i18next.t("名字")
                            },
                            {
                                key: "time",
                                headerTitle: i18next.t("时间")
                            },
                            {
                                key: "content",
                                headerTitle: i18next.t("内容")
                            },
                            {
                                key: "op",
                                headerTitle: i18next.t("操作"),
                                width: 100,
                                colRender: (info) => {
                                    return <YakitButton type='text'>{i18next.t("详情")}</YakitButton>
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}
