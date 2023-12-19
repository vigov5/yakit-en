import React, {useEffect, useState} from "react";
import {
    Typography,
    Button,
    PageHeader,
    Table,
    Tag,
    Space,
    Popconfirm,
    Row,
    Col,
    Card,
    Empty,
    Divider,
    Descriptions, Form, Modal
} from "antd";
import {showDrawer} from "../../utils/showModal";
import {YakScriptCreatorForm} from "./YakScriptCreator";
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "./schema";
import {ReloadOutlined} from "@ant-design/icons";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import {YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil";
import {startExecuteYakScript} from "./ExecYakScript";
import {YakBatchExecutorLegacy} from "./batch/YakBatchExecutorLegacy";
import cloneDeep from "lodash/cloneDeep"
import i18next from "../../i18n"

export interface YakScriptManagerPageProp {
    type?: "yak" | "nuclei" | string
    keyword?: string
    limit?: number
    onLoadYakScript?: (s: YakScript) => any
    onlyViewer?: boolean
}

const {Text} = Typography;
const {ipcRenderer} = window.require("electron");

export const YakScriptManagerPage: React.FC<YakScriptManagerPageProp> = (props) => {
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [], Pagination: {
            Limit: props.limit || 15, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        },
        Total: 0
    });
    const [selectedScript, setSelectedScript] = useState<YakScript>();
    const {Data, Pagination, Total} = response;
    const [params, setParams] = useState<QueryYakScriptRequest>({
        Pagination: {
            Limit: props.limit || 15, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        }, Type: props.type || undefined,
        Keyword: props.keyword || "", IsHistory: false
    });
    const [loading, setLoading] = useState(false);

    const isMainPage = !props.onLoadYakScript

    const update = (page?: number, limit?: number) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;
        setLoading(true)

        ipcRenderer.invoke("QueryYakScript", newParams).then((data: QueryYakScriptsResponse) => {
            setResponse(data)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    };

    useEffect(() => {
        update(1)
    }, [params.Type])

    const renderTable = () => {
        return <Space direction={"vertical"} style={{width: "100%"}}>
            {!props.onlyViewer && <Form onSubmitCapture={e => {
                e.preventDefault()
                update(1)
            }} layout={"inline"}>
                <InputItem
                    label={i18next.t("搜索关键字")}
                    setValue={Keyword => setParams({...params, Keyword})}
                    value={params.Keyword}
                />
                <Form.Item colon={false}>
                    <Button.Group>
                        <Button type="primary" htmlType="submit">{i18next.t("搜索")}</Button>
                        <Button onClick={e => {
                            if (!params.Keyword) {
                                Modal.error({title: i18next.t("关键字为空无法生成批量扫描能力")});
                                return
                            }
                            showDrawer({
                                title: "", width: "93%", mask: false, keyboard: false,
                                content: <>
                                    <YakBatchExecutorLegacy
                                        keyword={params.Keyword || ""}
                                        verbose={i18next.t("自定义搜索关键字")+`: ${params.Keyword}`}
                                    />
                                </>,
                            })
                        }}>{i18next.t("批量")}</Button>
                    </Button.Group>
                </Form.Item>
            </Form>}
            <Table<YakScript>
                size={"small"}
                dataSource={Data}
                rowKey={"Id"}
                loading={loading} bordered={true}
                scroll={{y: 750}}
                expandable={{
                    expandedRowRender: (i: YakScript) => {
                        return <div style={{height: 400}}>
                            <YakEditor
                                type={i.Type} readOnly={true} value={i.Content}
                            />
                        </div>
                    },
                }}
                onRow={isMainPage ? r => {
                    return {
                        onClick: () => {
                            setSelectedScript(r)
                        }
                    }
                } : undefined}
                pagination={{
                    size: "small",
                    pageSize: Pagination?.Limit || 10,
                    total: Total,
                    showTotal: (i) => <Tag>{i18next.t("共")}{i}条历史记录</Tag>,
                    // onChange(page: number, limit?: number): any {
                    //     update(page, limit)
                    // },
                }}
                onChange={(p) => {
                    update(p.current, p.pageSize)
                }}
                columns={isMainPage ? [
                    {
                        title: i18next.t("模块名称"), width: 300,
                        render: (i: YakScript) => <Tag><Text
                            style={{maxWidth: 260}} copyable={true}
                            ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    // {
                    //     title: i18next.t("描述"), render: (i: YakScript) => <Text
                    //         style={{maxWidth: 300}}
                    //         ellipsis={{tooltip: true}}
                    //     >{i.Help}</Text>, width: 330,
                    // },
                    {
                        title: i18next.t("操作"), fixed: "right", width: 135, render: (i: YakScript) => <Space>
                            <Button size={"small"} onClick={e => {
                                let m = showDrawer({
                                    title: i18next.t("修改当前 Yak 模块"), width: "90%", keyboard: false,
                                    content: <>
                                        <YakScriptCreatorForm
                                            modified={i} onChanged={i => update()}
                                            onCreated={(created) => {
                                                m.destroy()
                                            }}
                                        />
                                    </>
                                })
                            }}>{i18next.t("修改")}</Button>
                            <Popconfirm
                                title={i18next.t("确认想要删除该模块？")}
                                onConfirm={e => {
                                    ipcRenderer.invoke("delete-yak-script", i.Id)
                                    setLoading(true)
                                    setTimeout(() => update(1), 1000)
                                }}
                            >
                                <Button size={"small"} danger={true}>{i18next.t("删除")}</Button>
                            </Popconfirm>
                        </Space>
                    },
                ] : [
                    {
                        title: i18next.t("模块名称"), fixed: "left",
                        render: (i: YakScript) => <Tag><Text style={{maxWidth: 200}} copyable={true}
                                                             ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    {
                        title: i18next.t("描述"), render: (i: YakScript) => <Text
                            style={{maxWidth: 200}}
                            ellipsis={{tooltip: true}}
                        >{i.Help}</Text>
                    },
                    {
                        title: i18next.t("操作"), fixed: "right", render: (i: YakScript) => <Space>
                            {props.onLoadYakScript && <Button size={"small"} onClick={e => {
                                props.onLoadYakScript && props.onLoadYakScript(i)
                            }} type={"primary"}>{i18next.t("加载")}</Button>}
                        </Space>
                    },
                ]}
            />
        </Space>
    }

    return <div>
        {!props.onlyViewer && <PageHeader
            title={i18next.t("Yak 模块管理器")}
            subTitle={<Space>
                <Button
                    icon={<ReloadOutlined/>}
                    type={"link"}
                    onClick={() => {
                        update()
                    }}
                />
                {props.type ? undefined : <Form layout={"inline"}>
                    <ManySelectOne
                        formItemStyle={{marginBottom: 0, width: 200}}
                        label={i18next.t("模块类型")}
                        data={[
                            {value: "yak", text: i18next.t("Yak 原生模块")},
                            {value: "nuclei", text: i18next.t("nuclei Yaml模块")},
                            {value: undefined, text: i18next.t("全部")},
                        ]}
                        setValue={Type => setParams({...params, Type})} value={params.Type}
                    />
                </Form>}
                <div>{i18next.t("你可以在这里管理 / 添加你的 Yak 模块")}
                </div>
            </Space>}
            extra={[
                isMainPage ? <Popconfirm
                    title={<>
                        确定要加载本地 yaml(nuclei) poc 吗？<br/>{i18next.t("可通过")} <Text mark={true} copyable={true}>yak update-nuclei-poc</Text>{i18next.t("一键更新已知 PoC")}
                    </>}
                    onConfirm={() => {
                        ipcRenderer.invoke("update-nuclei-poc")
                    }}
                >
                    <Button>{i18next.t("加载")} PoC(nuclei)</Button>
                </Popconfirm> : undefined,
                <Button type={"primary"} onClick={e => {
                    let m = showDrawer({
                        title: i18next.t("创建新的 Yakit 模块"),
                        keyboard: false,
                        width: "95%",
                        content: <>
                            <YakScriptCreatorForm onCreated={() => {
                                m.destroy()
                            }} onChanged={e => update(1)}/>
                        </>
                    })
                }}>{i18next.t("创建新脚本")}</Button>
            ]}
        />}
        {(isMainPage && !props.onlyViewer) ? <Row gutter={12}>
            <Col span={8}>
                {renderTable()}
            </Col>
            <Col span={16}>
                {selectedScript ? <YakScriptOperator script={selectedScript}/> : <Empty/>}
            </Col>
        </Row> : <Row>
            <Col span={24}>
                {renderTable()}
            </Col>
        </Row>}
    </div>
};

export interface YakScriptOperatorProp {
    script: YakScript
    target?: string
}

export const YakScriptOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const {script, target} = props;
    let defaultScript:YakScript  = cloneDeep(script)
    defaultScript.Params = defaultScript.Params.map(item =>{
        if(item.Field === "target"){
            item.DefaultValue = target || ""
            return item
        }
        return item
    })

    return <Card title={<Space>
        <Text>{script.ScriptName}</Text>
        <Tag color={"geekblue"}>{script.Type}</Tag>
    </Space>}>
        <Descriptions bordered={true} column={2} labelStyle={{
            width: 100,
        }}>
            <Descriptions.Item span={2} label={<Space>
                <Tag><Text>{i18next.t("模块描述")}</Text></Tag>
            </Space>}>
                {script.Help}
            </Descriptions.Item>
            {script.Level && <Descriptions.Item label={<Space>
                <Tag><Text>{i18next.t("模块级别")}</Text></Tag>
            </Space>}>
                {script.Level}
            </Descriptions.Item>}
            {script.Author && <Descriptions.Item label={<Space>
                <Tag><Text>{i18next.t("模块作者")}</Text></Tag>
            </Space>}>
                {script.Author}
            </Descriptions.Item>}
            {script.Tags && <Descriptions.Item label={<Space>
                <Tag><Text>{i18next.t("标签/关键字")}</Text></Tag>
            </Space>}>
                {script.Tags}
            </Descriptions.Item>}
        </Descriptions>
        <Divider/>
        <YakScriptParamsSetter
            submitVerbose={i18next.t("执行该脚本")}
            {...defaultScript}
            onParamsConfirm={r => {
                startExecuteYakScript(script, r)
            }}
        />
    </Card>
};