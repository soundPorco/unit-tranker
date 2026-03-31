import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { Class, DayOfWeek, Period, TimetableSettings } from "../types";

const ALL_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

const DAY_INDICES: Record<TimetableSettings["daysMode"], number[]> = {
    weekdays: [0, 1, 2, 3, 4],
    weekdays_sat: [0, 1, 2, 3, 4, 5],
    all: [0, 1, 2, 3, 4, 5, 6],
};

const PERIOD_COL_W = 46;
const HEADER_ROW_H = 30;
const CELL_GAP = 3; // セル間の隙間
const GRID_PAD = 6; // グリッド全体のパディング

interface Props {
    classes: Class[];
    settings: TimetableSettings;
    onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
}

export function TimetableGrid({ classes, settings, onCellPress }: Props) {
    const { width } = useWindowDimensions();
    const dayIndices = DAY_INDICES[settings.daysMode];
    // セル幅：画面幅 - グリッドパディング×2 - 限数列 - セル間ギャップ合計
    const totalGap = CELL_GAP * dayIndices.length;
    const cellWidth =
        (width - GRID_PAD * 2 - PERIOD_COL_W - totalGap) / dayIndices.length;
    const periods = Array.from(
        { length: settings.periodCount },
        (_, i) => (i + 1) as Period,
    );

    const getClass = (day: DayOfWeek, period: Period) =>
        classes.find((c) => c.day_of_week === day && c.period === period);

    return (
        <View style={styles.container}>
            {/* 曜日ヘッダー行 */}
            <View style={[styles.headerRow, { height: HEADER_ROW_H }]}>
                {/* 限数列のスペーサー */}
                <View style={{ width: PERIOD_COL_W + CELL_GAP }} />
                {dayIndices.map((di, idx) => (
                    <View
                        key={di}
                        style={[
                            styles.dayHeaderCell,
                            { width: cellWidth },
                            idx < dayIndices.length - 1 && {
                                marginRight: CELL_GAP,
                            },
                        ]}
                    >
                        <Text style={styles.dayText}>{ALL_DAYS[di]}</Text>
                    </View>
                ))}
            </View>

            {/* 時限行（残り全高を均等分割） */}
            <View style={styles.periodsContainer}>
                {periods.map((period) => {
                    const pIdx = period - 1;
                    const timeInfo = settings.periodTimes[pIdx];

                    return (
                        <View key={period} style={styles.periodRow}>
                            {/* 限数 + 時間ラベル */}
                            <View
                                style={[
                                    styles.periodCell,
                                    {
                                        width: PERIOD_COL_W,
                                        marginRight: CELL_GAP,
                                    },
                                ]}
                            >
                                <Text style={styles.periodNumber}>
                                    {period}
                                </Text>
                                {timeInfo && (
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeText}>
                                            {timeInfo.start}
                                        </Text>
                                        <Text style={styles.timeSep}>|</Text>
                                        <Text style={styles.timeText}>
                                            {timeInfo.end}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* 各曜日セル */}
                            {dayIndices.map((di, idx) => {
                                const day = di as DayOfWeek;
                                const cls = getClass(day, period);
                                return (
                                    <TouchableOpacity
                                        key={di}
                                        activeOpacity={0.6}
                                        style={[
                                            styles.cell,
                                            { width: cellWidth },
                                            idx < dayIndices.length - 1 && {
                                                marginRight: CELL_GAP,
                                            },
                                            cls
                                                ? styles.cellFilled
                                                : styles.cellEmpty,
                                        ]}
                                        onPress={() =>
                                            onCellPress(day, period, cls)
                                        }
                                    >
                                        {cls ? (
                                            <View style={styles.classInner}>
                                                <Text
                                                    style={styles.className}
                                                    numberOfLines={3}
                                                >
                                                    {cls.name}
                                                </Text>
                                                {cls.room ? (
                                                    <Text
                                                        style={styles.roomText}
                                                        numberOfLines={1}
                                                    >
                                                        {cls.room}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        ) : (
                                            <View style={styles.emptyContainer}>
                                                <Text
                                                    style={styles.emptyPlus}
                                                ></Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
        paddingHorizontal: GRID_PAD,
        paddingBottom: GRID_PAD,
    },

    // ヘッダー行
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: CELL_GAP,
    },
    dayHeaderCell: {
        alignItems: "center",
        justifyContent: "center",
    },
    dayText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1C1C1E",
        letterSpacing: 0.2,
    },

    // 時限コンテナ
    periodsContainer: {
        flex: 1,
        gap: CELL_GAP,
    },
    periodRow: {
        flex: 1,
        flexDirection: "row",
    },

    // 限数列
    periodCell: {
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
    },
    periodNumber: {
        fontSize: 11,
        fontWeight: "700",
        color: "#3C3C43",
    },
    timeBlock: {
        alignItems: "center",
        gap: 0,
    },
    timeText: {
        fontSize: 8.5,
        color: "#8E8E93",
        letterSpacing: -0.3,
        lineHeight: 10,
    },
    timeSep: {
        fontSize: 7,
        color: "#C7C7CC",
        lineHeight: 9,
    },

    // セル共通
    cell: {
        flex: 1,
        borderRadius: 8,
        padding: 4,
        overflow: "hidden",
    },
    cellFilled: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    cellEmpty: {
        backgroundColor: "#eeeeee",
    },

    // 科目カード内容
    classInner: {
        flex: 1,
        justifyContent: "center",
        paddingLeft: 2,
    },
    className: {
        fontSize: 10,
        fontWeight: "600",
        color: "#1C1C1E",
        lineHeight: 13,
    },
    roomText: {
        fontSize: 10,
        color: "#8E8E93",
        marginTop: 2,
    },

    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyPlus: {
        color: "#C7C7CC",
        fontSize: 14,
    },
});
