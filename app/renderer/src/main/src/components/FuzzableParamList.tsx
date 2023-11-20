import React from "react";
import {Button, Typography, Space, Table, Tag, Popconfirm} from "antd";
import {FuzzableParams} from "./HTTPFlowTable/HTTPFlowTable";
import {HTTPPacketFuzzable} from "./HTTPHistory";
import i18next from "../i18n"

const {ipcRenderer} = window.require("electron")
const {Text} = Typography;

export interface FuzzableParamListProp extends HTTPPacketFuzzable {
    data: FuzzableParams[]
    sendToWebFuzzer?: () => any
}

export const FuzzableParamList: React.FC<FuzzableParamListProp> = (props) => {
    return <Table<FuzzableParams>
        pagination={false}
        dataSource={props.data}
        rowKey={row => row.ParamName}
        columns={[
            {title: i18next.t("参数名"), render: (i: FuzzableParams) => <Tag>{i.ParamName}</Tag>},
            {title: i18next.t("参数位置"), render: (i: FuzzableParams) => <Tag>{i.Position}</Tag>},
            {
                title: i18next.t("参数原值"), render: (i: FuzzableParams) => <Tag><Text style={{maxWidth: 500}} ellipsis={{
                    tooltip: true,
                }} copyable={true}>
                    {i.OriginValue ? new Buffer(i.OriginValue).toString() : ""}
                </Text></Tag>
            },
            {title: "IsHTTPS", render: (i: FuzzableParams) => <Tag>{i.IsHTTPS}</Tag>},
            {
                title: i18next.t("操作"), render: (i: FuzzableParams) => <Space>
                    <Popconfirm title={i18next.t("测试该参数将会暂时进入 Web Fuzzer")}
                                onConfirm={(e) => {
                                    ipcRenderer.invoke("send-to-tab", {
                                        type: "fuzzer",
                                        data:{
                                            isHttps: i.IsHTTPS,
                                            request: new Buffer(i.AutoTemplate).toString("utf8")
                                        }
                                    })
                                    if (props.sendToWebFuzzer) props.sendToWebFuzzer()
                                }}
                    >
                        <Button
                            type={"primary"} size={"small"}
                        >{i18next.t("模糊测试该参数")}</Button>
                    </Popconfirm>
                </Space>
            },
        ]}
    >

    </Table>
};