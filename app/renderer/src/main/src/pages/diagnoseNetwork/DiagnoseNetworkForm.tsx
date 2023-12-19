import React from "react";
import {Form} from "antd";
import {useGetState} from "ahooks";
import {InputInteger, InputItem, SwitchItem} from "@/utils/inputUtil";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import i18next from "../../i18n"

export interface DiagnoseNetworkFormProp {
    onSubmit: (params: DiagnoseNetworkParams) => any
}

export interface DiagnoseNetworkParams {
    NetworkTimeout: number
    ConnectTarget: string
    Proxy: string
    ProxyAuthUsername: string
    ProxyAuthPassword: string
    ProxyToAddr: string
}

export const DiagnoseNetworkForm: React.FC<DiagnoseNetworkFormProp> = (props) => {
    const [params, setParams] = useGetState<DiagnoseNetworkParams>({
        ConnectTarget: "www.baidu.com",
        NetworkTimeout: 5,
        Proxy: "",
        ProxyAuthPassword: "",
        ProxyAuthUsername: "",
        ProxyToAddr: ""
    });
    return <Form
        size={"small"}
        onSubmitCapture={e => {
            e.preventDefault()

            props.onSubmit(params)
        }}
    >
        <InputItem label={i18next.t("目标地址")}
                   setValue={ConnectTarget => setParams({...params, ConnectTarget})}
                   value={params.ConnectTarget} required={true}
        />
        <InputInteger label={i18next.t("超时时间")} setValue={NetworkTimeout => setParams({...params, NetworkTimeout})}
                      value={params.NetworkTimeout}/>
        <InputItem label={i18next.t("代理地址")} help={i18next.t("可选，如果填写的话则需要补充代理测试的目标")} setValue={Proxy => setParams({...params, Proxy})} value={params.Proxy}/>
        {!!params.Proxy && <InputItem label={i18next.t("测试地址")} help={i18next.t("填入需要测试的代理地址，例如 www.google.com")} setValue={ProxyToAddr => setParams({...params, ProxyToAddr})} value={params.ProxyToAddr}/>}
        <Form.Item colon={false} label={" "}>
            <YakitButton type="primary" htmlType="submit">{i18next.t("诊断基础网络配置")} </YakitButton>
        </Form.Item>
    </Form>
};