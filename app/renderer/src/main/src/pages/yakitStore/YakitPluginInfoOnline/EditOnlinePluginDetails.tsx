import React, {useState, useEffect} from "react"
import {Form, Modal, Radio, Select, Switch} from "antd"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {UserQuery} from "@/pages/loginOperationMenu/TrustListPage"
import {failed, success} from "@/utils/notification"
import {OnlineUserItem} from "@/components/OnlineUserItem/OnlineUserItem"
import {UserInfoProps} from "@/store"
import i18next from "../../../i18n"

const {Option} = Select

interface EditOnlinePluginDetailsProps {
    pulgin: API.YakitPluginDetail
    visible: boolean
    userInfo: UserInfoProps
    handleOk: () => void
    handleCancel: () => void
}

const layout = {
    labelCol: {span: 4},
    wrapperCol: {span: 20}
}

const EditOnlinePluginDetails: React.FC<EditOnlinePluginDetailsProps> = (props) => {
    const {visible, pulgin, userInfo} = props
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm()
    const handleOk = useMemoizedFn(() => {
        form.validateFields()
            .then((value) => {
                if (value.user_id && isNaN(Number(value.user_id))) {
                    delete value.user_id
                }
                const params: API.UpdatePluginRequest = {
                    ...value,
                    uuid: pulgin.uuid
                }
                updatePlugin(params)
            })
            .catch((err) => {})
    })
    const updatePlugin = useMemoizedFn((params: API.UpdatePluginRequest) => {
        setLoading(true)
        NetWorkApi<API.UpdatePluginRequest, API.ActionSucceeded>({
            method: "post",
            url: "update/plugin",
            data: {
                ...params
            }
        })
            .then((res) => {
                success(i18next.t("修改插件成功"))
                onReset()
                props.handleOk()
            })
            .catch((err) => {
                failed(i18next.t("修改插件失败：") + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const handleCancel = useMemoizedFn(() => {
        onReset()
        props.handleCancel()
    })
    const onReset = useMemoizedFn(() => {
        setUserList({
            data: []
        })
        form.resetFields()
    })
    const getUserList = useDebounceFn(
        useMemoizedFn((str: string) => {
            if (!str) {
                onReset()
                return
            }
            NetWorkApi<UserQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {
                    keywords: str || "all"
                }
            })
                .then((res) => {
                    setUserList(res)
                })
                .catch((err) => {
                    failed(i18next.t("获取普通用户失败：") + err)
                })
                .finally(() => {
                    // setTimeout(() => setLoading(false), 200)
                })
        }),
        {wait: 200}
    ).run
    useEffect(() => {
        form.setFieldsValue({
            user_id: pulgin.authors,
            is_official: `${pulgin.official}`,
            is_private: `${pulgin.is_private}`
        })
    }, [pulgin, visible])
    return (
        <Modal
            title={i18next.t("修改")}
            okText={i18next.t("确定")}
            cancelText={i18next.t("取消")}
            visible={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            confirmLoading={loading}
        >
            <Form {...layout} form={form} name='control-hooks'>
                {["admin","superAdmin"].includes(userInfo.role||"")&& (
                    <>
                        <Form.Item name='user_id' label={i18next.t("作者")}>
                            <Select
                                optionLabelProp='label'
                                filterOption={() => true}
                                placeholder={i18next.t("请输入用户名称搜索")}
                                showSearch
                                onSearch={getUserList}
                            >
                                {(userList.data || []).map((info) => (
                                    <Option value={info.id} key={info.id} label={info.name}>
                                        <OnlineUserItem info={info} />
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name='is_official' label={i18next.t("是否官方")}>
                            <Radio.Group>
                                <Radio.Button value='true'>{i18next.t("是")}</Radio.Button>
                                <Radio.Button value='false'>{i18next.t("否")}</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </>
                )}     
                {pulgin.user_id === userInfo.user_id && (
                    <Form.Item name='is_private' label={i18next.t("私密/公开")}>
                        <Radio.Group>
                            <Radio.Button value='true'>{i18next.t("私密")}</Radio.Button>
                            <Radio.Button value='false'>{i18next.t("公开")}</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                )}
            </Form>
        </Modal>
    )
}

export default EditOnlinePluginDetails
