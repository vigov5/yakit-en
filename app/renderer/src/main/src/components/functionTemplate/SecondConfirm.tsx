import React, {memo} from "react"
import {Button, Modal} from "antd"

import "./SecondConfirm.scss"
import i18next from "../../i18n"
export interface SecondConfirmProps {
    visible: boolean
    onCancel: (flag: number) => any
}

export const SecondConfirm: React.FC<SecondConfirmProps> = memo((props) => {
    const {visible, onCancel} = props

    const kindClick = (flag: number) => onCancel(flag)

    return (
        <Modal
            wrapClassName='second-confirm-dialog'
            visible={!!visible}
            width={260}
            centered={true}
            closable={false}
            destroyOnClose={true}
            footer={null}
            onCancel={() => kindClick(0)}
        >
            <div className='second-confirm-container'>
                <div className='container-title'>{i18next.t("确认关闭?")}</div>

                <div className='container-subtitle'>{i18next.t("关闭之后将不可恢复")}</div>

                <div className='container-btn'>
                    <Button onClick={() => kindClick(1)}>
                        {i18next.t("取消")}
                    </Button>
                    <Button type="primary" onClick={() => kindClick(2)}>
                        {i18next.t("确认")}
                    </Button>
                </div>
            </div>
        </Modal>
    )
})
