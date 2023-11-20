import React, {memo} from "react"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "./PageLoading.module.scss"
import i18next from "../i18n"

interface PageLoadingProps {}

export const PageLoading: React.FC<PageLoadingProps> = memo((props) => {
    return (
        <div className={styles["page-loading-wrapper"]}>
            <div className={styles["page-loading-body"]}>
                <div className={styles["spin-body"]}>
                    <YakitSpin spinning={true} size='large'>
                        <div className={styles["page-loading-wrapper"]}></div>
                    </YakitSpin>
                </div>
                <div className={styles["spin-title-body"]}>{i18next.t("页面正在加载中 ...")}</div>
            </div>
        </div>
    )
})
