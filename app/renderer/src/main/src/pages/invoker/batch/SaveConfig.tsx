import React, {useState} from "react";
import {SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {Button, Form} from "antd";
import {InputItem} from "../../../utils/inputUtil";
import {YakEditor} from "../../../utils/editors";
import {saveABSFileToOpen} from "../../../utils/openWebsite";
import moment from "moment";
import {YakScriptParamsSetter} from "../YakScriptParamsSetter";
import {ImportMenuConfig} from "./consts_importConfigYakCode";
import {startExecYakCode} from "../../../utils/basic";
import i18next from "../../../i18n"

export interface SaveConfigProp {
    QueryConfig: SimpleQueryYakScriptSchema
    onSave: (filename: string) => any
}

export interface BatchScanConfig {
    group: string
    name: string
    query: SimpleQueryYakScriptSchema
}

export const SaveConfig: React.FC<SaveConfigProp> = (props) => {
    const [params, setParams] = useState<BatchScanConfig>({group: "", name: "", query: props.QueryConfig});
    return <div>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()
                const filename = `config-${moment().format("YYYY-MM-DD-HH-mm-SS")}.json`
                saveABSFileToOpen(filename, JSON.stringify(params))
                if (!!props.onSave) {
                    props.onSave(filename)
                }
            }}
        >
            <InputItem required={true} label={i18next.t("一级菜单组")} setValue={Group => setParams({...params, group: Group})}
                       value={params.group}/>
            <InputItem required={true} label={i18next.t("二级菜单")} setValue={Name => setParams({...params, name: Name})}
                       value={params.name}/>
            <Form.Item label={i18next.t("内容")}>
                <div style={{height: 300}}>
                    <YakEditor type={"http"} readOnly={true} value={JSON.stringify(params.query)}/>
                </div>
            </Form.Item>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit">{i18next.t("保存到本地")} </Button>
            </Form.Item>
        </Form>
    </div>
};

export interface ImportConfigProp {

}

export const ImportConfig: React.FC<ImportConfigProp> = (props) => {
    return <div>
        <YakScriptParamsSetter
            Params={ImportMenuConfig.Params} primaryParamsOnly={true}
            onParamsConfirm={params => {
                startExecYakCode(i18next.t("导入配置"), {
                    Script: ImportMenuConfig.Code,
                    Params: params,
                })
            }}
        />
    </div>
};