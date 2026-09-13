import React, { useState, useEffect, useRef, useContext, useCallback } from "react"
import { Text, TouchableOpacity, View, StyleSheet, Dimensions, ScrollView } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"

import * as Localization from "expo-localization"
import { create, all } from "mathjs"

import { hapticFeedback, hapticFeedbackSwitch, hapticSuccess } from "../utils"
import Button from "../components/Button"
import LucideIcon from "../components/LucideIcon"
import { clearHistory, saveCalculation } from "../utils/historyStorage"
import { CalcCallbackContext, HistoryContext } from "../../App"
import { useI18n } from "../i18n"
import { useTheme } from "../theme"

const config = {}
const MathJS = create(all, config)

// Get the device width and height
const { width: screenWidth } = Dimensions.get("window")

// Calculate button width and height based on screen size
const BUTTON_SIZE = (screenWidth - 40) / 4
const EXPANDED_BUTTON_SIZE = (screenWidth - 40) / 5

type Props = {
    onOpenTools?: () => void
}

const App = ({ onOpenTools }: Props) => {
    const { setOnSelect, bumpRefreshKey } = useContext(CalcCallbackContext)
    const { openHistory } = useContext(HistoryContext)
    const { t } = useI18n()
    const { colors, isDark, toggleTheme } = useTheme()
    const [currentInput, setCurrentInput] = useState("")
    const [history, setHistory] = useState([])
    const [selectedChunk, setSelectedChunk] = useState(-1)
    const [tempResult, setTempResult] = useState("")
    const [isClipboardMenuVisible, setIsClipboardMenuVisible] = useState(false)
    const [isEditingChunk, setIsEditingChunk] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [inverted, setInverted] = useState(false)
    const [hyperbolic, setHyperbolic] = useState(false)
    const [isRadian, setIsRadian] = useState(false)
    const [error, setError] = useState("")

    const [chunkWidths, setChunkWidths] = useState([])
    const [chunkFontSize, setChunkFontSize] = useState(48)

    useEffect(() => {
        if (isClipboardMenuVisible) setIsClipboardMenuVisible(false)
        computeTempResult()
    }, [currentInput])

    useEffect(() => {
        computeTempResult()
    }, [isRadian])

    useEffect(() => {
        setOnSelect((expression: string) => {
            setCurrentInput(expression)
        })
    }, [setOnSelect])

    useEffect(() => {
        const totalWidth = chunkWidths.reduce((acc, width) => acc + width, 0)
        console.log(totalWidth)
        const maxWidth = screenWidth - 100

        // Adjust the font size to fit the largest chunk into the container
        const scaleFactor = maxWidth / totalWidth
        setChunkFontSize((oldFontSize) => Math.min(48, Math.max(oldFontSize * scaleFactor, 20)))
    }, [currentInput])

    const computeTempResult = () => {
        try {
            const result = evaluateInput(currentInput)
            if (result !== undefined && result !== null && result !== "") {
                setTempResult(String(result))
            } else {
                setTempResult("")
            }
        } catch (error) {
            setTempResult("")
        }
    }

    const formatChunk = (chunk) => {
        if (chunk === "") return chunk
        if (chunk.includes(".") || (chunk.includes(",") && [",", ".", "0"].includes(chunk.at(-1)))) {
            return chunk.replace(".", Localization.getLocales()[0].decimalSeparator ?? ".")
        }

        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(chunk)) return chunk

        const formatted = new Intl.NumberFormat(Localization.getLocales()[0]?.languageTag ?? "en-US", {
            maximumFractionDigits: 5,
            useGrouping: true
        }).format(Number(chunk))

        return formatted
    }

    const formatResult = (result) => {
        if (result === "") return result
        const numericResult = Number(result)
        if (!Number.isFinite(numericResult)) return result

        const formatted = new Intl.NumberFormat(Localization.getLocales()[0]?.languageTag ?? "en-US", {
            maximumFractionDigits: 5,
            useGrouping: true
        }).format(numericResult)

        return formatted
    }

    const pasteClipboard = async () => {
        const text = await Clipboard.getStringAsync()
        setCurrentInput(text)
        setIsClipboardMenuVisible(false)
    }

    const handleCopy = async (value) => {
        hapticSuccess()
        await Clipboard.setStringAsync(value)
    }

    const openClipboardMenu = async () => {
        hapticSuccess()
        setIsClipboardMenuVisible(true)
    }

    const handlePress = (value) => {
        if (selectedChunk !== -1) {
            let chunks = currentInput.split(/([+\-*/])/)
            if (value.match(/[0-9.,]/)) {
                if (isEditingChunk) {
                    chunks[selectedChunk] = value
                    setIsEditingChunk(false)
                } else {
                    chunks[selectedChunk] += value
                }
            } else {
                setSelectedChunk(-1)
            }
            setCurrentInput(chunks.join(""))
        } else {
            // if the value is an operator and the last character is an operator, replace it
            if (value?.match(/[+\-*/]/) && currentInput.at(-1)?.match(/[+\-*/]/)) {
                return setCurrentInput(currentInput.slice(0, -1) + value)
            }
            setCurrentInput(currentInput + value)
        }
    }

    const handleClear = () => {
        hapticFeedbackSwitch()

        resetChunkFontSize()

        setCurrentInput("")
        setTempResult("")
        setError("")
        setSelectedChunk(-1)
    }

    const handleClearAll = () => {
        hapticFeedbackSwitch()
        resetChunkFontSize()
        setCurrentInput("")
        setTempResult("")
        setError("")
        setHistory([])
        setSelectedChunk(-1)
        void clearHistory().then(() => bumpRefreshKey())
    }

    const resetChunkFontSize = () => {
        setChunkWidths([])
        setChunkFontSize(48)
    }

    const handleSelectChunk = (index) => {
        setSelectedChunk(index)
        setIsEditingChunk(true)
    }

    const evaluateInput = (input) => {
        const normalizedInput = input.replaceAll("×", "*").replaceAll("÷", "/")
        // parse input to replace trigonometric functions values with deg or rad based on the isRadian state
        const parsedInput = normalizedInput.replace(
            new RegExp(`(sin|cos|tan)\\(([^)]+)\\)`, "g"),
            (match, func, value) => `${func}((${value}) ${isRadian ? "rad" : "deg"})`
        )
        let result = MathJS.evaluate(parsedInput)

        if (typeof result === "number" && !Number.isInteger(result)) {
            result = parseFloat(result.toFixed(5))
        }

        return result
    }

    const handleCalculate = () => {
        resetChunkFontSize()
        try {
            const result = evaluateInput(currentInput)
            const parsedResult = `${currentInput.toLocaleString()} = ${result.toLocaleString()}`
            setHistory((prev) => {
                if (prev.at(-1) === parsedResult) return prev
                return [...prev, parsedResult]
            })
            saveCalculation(currentInput, String(result)).then(() => bumpRefreshKey())
            setCurrentInput(String(result))
            setSelectedChunk(-1)
        } catch (error) {
            setError(t("calculator.invalidInput"))
        }
    }

    const handleHistoryCopy = (item) => {
        const parts = item.split("=")
        handleCopy(parts[1].trim())
    }

    const handleHistoryClick = (item) => {
        const parts = item.split("=")
        setCurrentInput(parts[0].trim())
    }

    const handleExpand = () => {
        hapticFeedbackSwitch()
        setExpanded(!expanded)
    }

    const handleInverse = () => {
        hapticFeedbackSwitch()
        setInverted(!inverted)
    }

    const handleHyperbolic = () => {
        hapticFeedbackSwitch()
        setHyperbolic(!hyperbolic)
    }

    const handleChangeAngleUnit = () => {
        hapticFeedbackSwitch()
        setIsRadian(!isRadian)
    }

    const handleDecimalPoint = () => {
        // Regular expression to find the last number in the input
        const lastNumberRegex = /(\d*\.?\d*)$/

        const match = currentInput.match(lastNumberRegex)
        if (match) {
            const lastSegment = match[0]

            // If the last segment is empty or only contains a decimal point, insert '0.'
            if (lastSegment === "" || lastSegment === ".") {
                return handlePress("0.")
            }
            // If the last segment is a number without a decimal, insert a decimal point
            else if (!lastSegment.includes(".")) {
                return handlePress(".")
            }
        }
    }

    const handleBackspace = () => {
        const operatorRegex =
            /asin\(|acos\(|atan\(|sinh\(|cosh\(|tanh\(|asinh\(|acosh\(|atanh\(|sin\(|cos\(|tan\(|pi|sqrt\(|log10\(|log\(/g
        const removeLastOperatorIfPresent = (text) => {
            let lastMatch
            let match
            // Find the last occurrence of an operator
            while ((match = operatorRegex.exec(text)) !== null) {
                lastMatch = match
            }

            // Check if the last operator is at the end of the string
            if (lastMatch && text.endsWith(lastMatch[0])) {
                return text.substring(0, lastMatch.index)
            } else {
                return text.slice(0, -1)
            }
        }

        if (selectedChunk !== -1) {
            const chunks = currentInput.split(/([+\-*/])/)
            chunks[selectedChunk] = removeLastOperatorIfPresent(chunks[selectedChunk])
            return setCurrentInput(chunks.join(""))
        } else {
            setCurrentInput((prevInput) => removeLastOperatorIfPresent(prevInput))
        }
    }

    const BUTTONS = [
        {
            type: "operator",
            theme: "secondary",
            label: "HYP",
            value: "HYP",
            expanded: true,
            action: handleHyperbolic
        },
        { type: "operator", theme: "secondary", label: "INV", value: "INV", expanded: true, action: handleInverse },
        { type: "operator", theme: "secondary", label: "sin", value: "sin", expanded: true },
        { type: "operator", theme: "secondary", label: "cos", value: "cos", expanded: true },
        { type: "operator", theme: "secondary", label: "tan", value: "tan", expanded: true },
        { type: "operator", theme: "secondary", label: "x^y", value: "^", expanded: true },
        { type: "operator", theme: "secondary", label: "lg", value: "log(", expanded: true },
        { type: "operator", theme: "secondary", label: "lg10", value: "log10(", expanded: true },
        {
            type: "operator",
            theme: "secondary",
            label: "Rand",
            value: "Rand",
            expanded: true,
            action: () => handlePress(Math.random().toFixed(5))
        },
        {
            type: "operator",
            theme: "secondary",
            label: "DEG",
            value: "DEG",
            expanded: true,
            action: handleChangeAngleUnit
        },
        { type: "operator", theme: "secondary", label: "√x", value: "sqrt(", expanded: true },
        { type: "action", theme: "secondary", label: currentInput || error ? "C" : "AC", value: "AC", action: handleClear },
        {
            type: "action",
            theme: "secondary",
            label: "(  )",
            value: "()",
            action: () => handlePress(nextParenthesis(currentInput))
        },
        { type: "action", theme: "secondary", label: "%", value: "%" },
        { type: "operator", theme: "primary", label: "÷", value: "/" },
        { type: "operator", theme: "secondary", label: "x!", value: "!", expanded: true },
        { type: "number", theme: "default", value: "7" },
        { type: "number", theme: "default", value: "8" },
        { type: "number", theme: "default", value: "9" },
        { type: "operator", theme: "primary", label: "×", value: "*" },
        { type: "operator", theme: "secondary", label: "1/x", value: "1/", expanded: true },
        { type: "number", theme: "default", value: "4" },
        { type: "number", theme: "default", value: "5" },
        { type: "number", theme: "default", value: "6" },
        { type: "operator", theme: "primary", label: "-", value: "-" },
        { type: "operator", theme: "secondary", label: "π", value: "pi", expanded: true },
        { type: "number", theme: "default", value: "1" },
        { type: "number", theme: "default", value: "2" },
        { type: "number", theme: "default", value: "3" },
        { type: "operator", theme: "primary", label: "+", value: "+" },
        { type: "expand", theme: "expand", label: "X", action: handleExpand },
        { type: "operator", theme: "default", label: "e", value: "e", expanded: true },
        { type: "number", theme: "default", value: "0" },
        {
            type: "number",
            theme: "default",
            label: ",",
            value: ".",
            action: handleDecimalPoint
        },
        { type: "operator", theme: "equal", label: "=", value: "=", action: handleCalculate }
    ]

    // The compact calculator follows the flat four-column layout from the reference UI.
    // Scientific keys remain available through the expand control below.
    const BASIC_BUTTONS = [
        { type: "action", theme: "default", label: currentInput || error ? "C" : "AC", value: "AC", action: handleClear },
        { type: "backspace", theme: "default", label: "", value: "backspace", action: handleBackspace },
        { type: "operator", theme: "default", label: "÷", value: "/" },
        { type: "operator", theme: "default", label: "×", value: "*" },
        { type: "number", theme: "default", value: "7" },
        { type: "number", theme: "default", value: "8" },
        { type: "number", theme: "default", value: "9" },
        { type: "operator", theme: "default", label: "−", value: "-" },
        { type: "number", theme: "default", value: "4" },
        { type: "number", theme: "default", value: "5" },
        { type: "number", theme: "default", value: "6" },
        { type: "operator", theme: "default", label: "+", value: "+" },
        { type: "number", theme: "default", value: "1" },
        { type: "number", theme: "default", value: "2" },
        { type: "number", theme: "default", value: "3" },
        { type: "action", theme: "default", label: "%", value: "%" },
        { type: "number", theme: "default", value: "0" },
        { type: "number", theme: "default", label: ",", value: ".", action: handleDecimalPoint },
    ]

    const EQUAL_BUTTON = { type: "operator", theme: "equal", label: "=", value: "=", action: handleCalculate }
    const BASIC_ROWS = [
        BASIC_BUTTONS.slice(0, 4),
        BASIC_BUTTONS.slice(4, 8),
        BASIC_BUTTONS.slice(8, 12),
        BASIC_BUTTONS.slice(12, 15),
        BASIC_BUTTONS.slice(15, 18),
    ]

    const renderInput = () => {
        if (error) return <Text style={[styles.inputText, { color: colors.accent }]}>{error}</Text>

        if (!currentInput) {
            return (
                <View style={styles.emptyInput}>
                    <Text style={[styles.inputText, { color: colors.text }]} onLongPress={openClipboardMenu}>
                        0
                    </Text>
                </View>
            )
        }

        const chunks = currentInput.split(/([+\-*/])/)
        const expressionLines: number[][] = []
        if (chunks[0]) expressionLines.push([0])
        for (let index = 1; index < chunks.length; index += 2) {
            const line = [index]
            if (chunks[index + 1]) line.push(index + 1)
            expressionLines.push(line)
        }
        const formatDisplayChunk = (chunk: string) => {
            if (chunk === "*") return "×"
            if (chunk === "/") return "÷"
            return formatChunk(chunk)
        }

        return (
            <View style={styles.displayContent}>
                <View style={styles.expressionContainer}>
                    {expressionLines.map((line, lineIndex) => (
                        <View style={styles.expressionLine} key={`line-${lineIndex}`}>
                            {line.map((chunkIndex) => {
                                const chunk = chunks[chunkIndex]
                                return (
                                    <TouchableOpacity
                                        key={`chunk-${chunkIndex}`}
                                        style={[
                                            styles.displayChunk,
                                            selectedChunk === chunkIndex && [styles.selectedChunk, { backgroundColor: colors.selection }]
                                        ]}
                                        onLongPress={() => handleCopy(chunk)}
                                        onPress={() => {
                                            if (isClipboardMenuVisible) return setIsClipboardMenuVisible(false)
                                            if (selectedChunk === chunkIndex) return setSelectedChunk(-1)
                                            handleSelectChunk(chunkIndex)
                                        }}
                                        onLayout={({ nativeEvent }) => {
                                            setChunkWidths((prev) => {
                                                const next = [...prev]
                                                next[chunkIndex] = nativeEvent.layout.width
                                                return next
                                            })
                                        }}
                                    >
                                        <Text style={[styles.expressionText, { color: colors.secondaryText }]}>
                                            {formatDisplayChunk(chunk)}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    ))}
                </View>

                <View style={styles.resultRow}>
                    <Text
                        style={[styles.resultText, { color: colors.text }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.55}
                    >
                        {tempResult ? `= ${formatResult(tempResult)}` : chunks.map(formatDisplayChunk).join("")}
                    </Text>
                    <TouchableOpacity
                        style={styles.backspaceButton}
                        onPressIn={hapticFeedback}
                        onPress={handleBackspace}
                        accessibilityLabel={t("calculator.backspace")}
                    >
                        <LucideIcon name="delete" size={30} color={colors.secondaryText} />
                    </TouchableOpacity>
                </View>

                {isClipboardMenuVisible && (
                    <View style={styles.clipboardMenuContainer}>
                        <TouchableOpacity style={styles.clipboardMenu} onPress={pasteClipboard}>
                            <Text style={[styles.clipboardMenuText, { color: colors.text }]}>{t("calculator.paste")}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        )
    }

    const openHistoryDrawer = () => {
        hapticFeedback()
        openHistory()
    }

    const insets = useSafeAreaInsets()

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: colors.overlay }]} onPress={openHistoryDrawer} activeOpacity={0.6} accessibilityLabel={t("history.title")}>
                        <LucideIcon name="clock" size={19} color={colors.secondaryText} />
                    </TouchableOpacity>
                    <View style={styles.topBarActions}>
                        <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: colors.overlay }]} onPress={handleClearAll} activeOpacity={0.6} accessibilityLabel={t("calculator.clearAll")}>
                            <LucideIcon name="trash-2" size={18} color={colors.accent} />
                        </TouchableOpacity>
                        {onOpenTools && (
                            <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: colors.overlay }]} onPress={onOpenTools} activeOpacity={0.6} accessibilityLabel={t("calculator.openTools")}>
                                <LucideIcon name="grid-3x3" size={19} color={colors.accent} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.toolbarButton, { backgroundColor: colors.overlay }]} onPress={toggleTheme} activeOpacity={0.6} accessibilityLabel={isDark ? t("calculator.lightMode") : t("calculator.darkMode")}>
                            <LucideIcon name={isDark ? "sun" : "moon"} size={19} color={colors.accent} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.historyContainer} onTouchStart={() => setSelectedChunk(-1)}>
                    <ScrollView
                        contentContainerStyle={{ padding: 10, alignItems: "flex-end" }}
                        showsVerticalScrollIndicator={false}
                    >
                        {history.map((result, index) => (
                            <TouchableOpacity
                                key={`result-${result}-${index}`}
                                onPressIn={() => hapticFeedback()}
                                onLongPress={() => handleHistoryCopy(result)}
                                onPress={() => handleHistoryClick(result)}
                            >
                                <Text style={[styles.historyText, { color: colors.secondaryText }]}>{result}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.inputContainer}>{renderInput()}</View>

            </View>

            {expanded ? (
                <View style={[styles.buttonContainer, { marginBottom: 75, paddingHorizontal: 15 }]}>
                    {BUTTONS.filter((button) => button.expanded || !button.expanded).map((button, index) => (
                        <View
                            key={`${button.value}-${index}`}
                            style={[
                                styles.buttonWrapper,
                                {
                                    width: EXPANDED_BUTTON_SIZE,
                                    height: EXPANDED_BUTTON_SIZE,
                                    margin: 1
                                }
                            ]}
                        >
                            <Button
                                {...button}
                                expanded={expanded}
                                inverted={inverted}
                                hyperbolic={hyperbolic}
                                isRadian={isRadian}
                                onPress={handlePress}
                            />
                        </View>
                    ))}
                </View>
            ) : (
                <View style={[styles.basicGrid, { backgroundColor: colors.surface }]}>
                    {BASIC_ROWS.map((buttons, row) => (
                        <View style={styles.basicRow} key={`basic-row-${row}`}>
                            {buttons.map((button, index) => {
                                const buttonIndex = row * 4 + index
                                return (
                                    <View style={styles.basicButtonWrapper} key={`${button.value}-${buttonIndex}`}>
                                        <Button
                                            {...button}
                                            flat
                                            expanded={false}
                                            inverted={inverted}
                                            hyperbolic={hyperbolic}
                                            isRadian={isRadian}
                                            onPress={handlePress}
                                        />
                                    </View>
                                )
                            })}
                            {row >= 3 && <View style={styles.basicEqualSpacer} />}
                        </View>
                    ))}
                    <View style={styles.basicEqualWrapper}>
                        <Button
                            {...EQUAL_BUTTON}
                            flat
                            expanded={false}
                            inverted={inverted}
                            hyperbolic={hyperbolic}
                            isRadian={isRadian}
                            onPress={handlePress}
                        />
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        backgroundColor: "black"
    },
    header: {
        flex: 1,
    },
    topBar: {
        position: "relative",
        top: 0,
        zIndex: 10,
        marginHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    topBarActions: {
        flexDirection: "row",
        gap: 8,
    },
    toolbarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    historyContainer: {
        flex: 1.1,
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingRight: 20
    },
    historyText: {
        fontSize: 22,
        paddingVertical: 5,
        color: "gray"
    },
    inputContainer: {
        flex: 2.2,
        minHeight: 170,
        width: "100%",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    buttonContainer: {
        marginTop: "auto",
        padding: 10,
        marginBottom: 25,
        width: screenWidth,
        height: BUTTON_SIZE * 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap"
    },
    basicGrid: {
        width: screenWidth,
        height: BUTTON_SIZE * 5,
        position: "relative",
        flexDirection: "column",
    },
    basicRow: {
        width: "100%",
        height: BUTTON_SIZE,
        flexDirection: "row",
    },
    basicButtonWrapper: {
        width: "25%",
        height: "100%",
        padding: 0,
        margin: 0,
    },
    basicEqualSpacer: {
        width: "25%",
        height: "100%",
    },
    basicEqualWrapper: {
        position: "absolute",
        right: 0,
        top: BUTTON_SIZE * 3,
        width: "25%",
        height: BUTTON_SIZE * 2,
    },
    buttonWrapper: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        margin: 2,
        padding: 5,
        justifyContent: "center",
        alignItems: "center"
    },
    inputText: {
        width: "100%",
        textAlign: "right",
        fontSize: 48,
        lineHeight: 52,
        color: "white"
    },
    emptyInput: {
        flex: 1,
        width: "100%",
        justifyContent: "flex-end",
    },
    displayContent: {
        width: "100%",
        flex: 1,
        justifyContent: "flex-end",
    },
    expressionContainer: {
        width: "100%",
        alignItems: "flex-end",
        paddingRight: 42,
        paddingTop: 2,
        paddingBottom: 0,
    },
    expressionLine: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        minHeight: 30,
    },
    displayChunk: {
        paddingHorizontal: 1,
        paddingVertical: 0,
    },
    expressionText: {
        fontSize: 24,
        lineHeight: 30,
        textAlign: "right",
    },
    resultRow: {
        width: "100%",
        minHeight: 68,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    resultText: {
        flexShrink: 1,
        fontSize: 48,
        lineHeight: 58,
        textAlign: "right",
    },
    backspaceButton: {
        justifyContent: "center",
        alignItems: "center",
        width: 40,
        height: 44,
        marginLeft: 8,
    },
    backspaceText: {
        fontSize: 32,
        color: "#B4B4B4"
    },
    chunkContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        width: "100%",
        paddingRight: 40,
        height: "auto",
        flexWrap: "wrap"
    },
    chunk: {
        padding: 5
    },
    selectedChunk: {
        backgroundColor: "rgba(40, 80, 200, 0.5)",
        borderRadius: 10,
        padding: 5
    },
    temporaryResultText: {
        height: 40,
        textAlign: "right",
        paddingRight: 30,
        fontSize: 25,
        color: "gray"
    },
    clipboardMenuContainer: {},
    clipboardMenu: {
        position: "absolute",
        top: -70,
        right: 5,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5
    },
    clipboardMenuText: {
        fontSize: 20,
        color: "white"
    }
})

const nextParenthesis = (inputString) => {
    const lastChar = inputString.at(-1)
    if (["+", "-", "/", "*", "("].includes(lastChar)) return "("
    const counts = inputString.split("").reduce(
        (acc, char) => {
            if (char === "(") {
                acc.openCount++
            } else if (char === ")") {
                acc.closeCount++
            }
            return acc
        },
        { openCount: 0, closeCount: 0 }
    )

    if (counts.closeCount > counts.openCount) {
        // The string is already unbalanced with more closing parentheses
        return "Error: Unbalanced expression"
    }

    return counts.openCount > counts.closeCount ? ")" : "("
}

export default App
