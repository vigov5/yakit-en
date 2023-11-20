import {PluginParamDataProps} from "../pluginsType"
import i18next from "../../../i18n"
/**
 * @name 插件数据修改时-内置的tags列表数据
 */
export const BuiltInTags: string[] = [
    "IOT",
    i18next.t("主流CMS"),
    i18next.t("中间件"),
    i18next.t("代码研发"),
    i18next.t("功能类型"),
    i18next.t("应用类型"),
    i18next.t("网络设备"),
    i18next.t("大数据平台"),
    i18next.t("数据库服务"),
    i18next.t("虚拟化服务"),
    i18next.t("邮件服务器"),
    i18next.t("集权管控类"),
    i18next.t("主流应用框架"),
    i18next.t("协同办公套件"),
    i18next.t("通用漏洞检测"),
    i18next.t("主流第三方服务"),
    i18next.t("信息收集"),
    i18next.t("数据处理"),
    i18next.t("暴力破解"),
    i18next.t("指纹识别"),
    i18next.t("目录爆破"),
    i18next.t("加解密工具"),
    i18next.t("威胁情报"),
    i18next.t("空间引擎")
]

/**
 * @name 插件类型为port-scan(端口扫描)时，内置的两个参数配置信息
 */
export const PortScanPluginParams: Record<string, PluginParamDataProps> = {
    target: {
        Field: "target",
        FieldVerbose: i18next.t("扫描的目标"),
        TypeVerbose: "string",
        Required: true,
        DefaultValue: "",
        Help: ""
    },
    ports: {
        Field: "ports",
        FieldVerbose: i18next.t("端口"),
        TypeVerbose: "string",
        Required: false,
        DefaultValue: "80",
        Help: ""
    }
}
