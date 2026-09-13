import React from "react"
import { View, StyleSheet } from "react-native"
import { converterTools } from "../data/converterTools"
import ConverterDetail from "../components/ConverterDetail"
import Currency from "./Currency"
import { useTheme } from "../theme"

type Props = {
    toolKey: string
    onOpenTools?: () => void
}

export default ({ toolKey, onOpenTools }: Props) => {
    const { colors } = useTheme()
    if (toolKey === "currency") {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Currency onOpenTools={onOpenTools} />
            </View>
        )
    }

    const tool = converterTools.find((t) => t.key === toolKey)
    if (!tool) return null

    return (
        <View style={[styles.container, styles.toolContainer, { backgroundColor: colors.background }]}>
            <ConverterDetail tool={tool} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        backgroundColor: "black",
    },
    toolContainer: {
        paddingTop: 16,
    },
})
