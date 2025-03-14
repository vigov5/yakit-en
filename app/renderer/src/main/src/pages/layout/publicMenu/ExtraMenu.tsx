import React, {useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRoute} from "@/routes/newRoute"
import {onImportPlugin, onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import { OutlineSaveIcon } from "@/assets/icon/outline"
import { SolidCodecIcon, SolidPayloadIcon, SolidTerminalIcon } from "@/assets/icon/solid"
import i18next from "../../../i18n"

import styles from "./ExtraMenu.module.scss"

interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props

    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
    const importMenuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "import-plugin":
                onImportPlugin()
                setImportMenuShow(false)
                return
            case "import-share":
                onImportShare()
                setImportMenuShow(false)
                return

            default:
                return
        }
    })
    const importMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                data={[
                    {
                        key: "import-plugin",
                        label: i18next.t("导入插件")
                    },
                    {
                        key: "import-share",
                        label: i18next.t("导入分享数据")
                    }
                ]}
                onClick={({key}) => importMenuSelect(key)}
            />
        ),
        []
    )

    return (
        <div className={styles["extra-menu-wrapper"]}>
            <YakitPopover
                overlayClassName={styles["import-resource-popover"]}
                overlayStyle={{paddingTop: 2}}
                placement={"bottom"}
                trigger={"click"}
                content={importMenu}
                visible={importMenuShow}
                onVisibleChange={(visible) => setImportMenuShow(visible)}
            >
                <YakitButton
                    type='text'
                    style={{fontWeight: 500}}
                    onClick={(e) => e.preventDefault()}
                    icon={<OutlineSaveIcon />}
                >{i18next.t("导入资源")}
                </YakitButton>
            </YakitPopover>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.Codec})
                }}
                icon={<SolidCodecIcon />}
            >
                Codec
            </YakitButton>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.PayloadManager})
                }}
                icon={<SolidPayloadIcon/>}
            >
                Payload
            </YakitButton>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.YakScript})
                }}
                icon={<SolidTerminalIcon />}
            >
                Yak Runner
            </YakitButton>
        </div>
    )
})
