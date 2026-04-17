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
const CELL_GAP = 3;
const GRID_PAD = 6;

const CLASS_COLOR = { bg: "#e6f5ee", border: "#b8dfc9", text: "#1a4a30", pill: "#3eb370" };

interface Props {
    classes: Class[];
    settings: TimetableSettings;
    onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
    todayDayIndex?: number; // 0=月, 1=火, ..., 6=日
}

export function TimetableGrid({ classes, settings, onCellPress, todayDayIndex }: Props) {
    const { width } = useWindowDimensions();
    const dayIndices = DAY_INDICES[settings.daysMode];
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
                <View style={{ width: PERIOD_COL_W + CELL_GAP }} />
                {dayIndices.map((di, idx) => {
                    const isToday = di === todayDayIndex;
                    return (
                        <View
                            key={di}
                            style={[
                                styles.dayHeaderCell,
                                { width: cellWidth },
                                idx < dayIndices.length - 1 && { marginRight: CELL_GAP },
                            ]}
                        >
                            <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                                    {ALL_DAYS[di]}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* 時限行 */}
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
                                    { width: PERIOD_COL_W, marginRight: CELL_GAP },
                                ]}
                            >
                                <Text style={styles.periodNumber}>{period}</Text>
                                {timeInfo && (
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeText}>{timeInfo.start}</Text>
                                        <Text style={styles.timeSep}>|</Text>
                                        <Text style={styles.timeText}>{timeInfo.end}</Text>
                                    </View>
                                )}
                            </View>

                            {/* 各曜日セル */}
                            {dayIndices.map((di, idx) => {
                                const day = di as DayOfWeek;
                                const cls = getClass(day, period);
                                const color = cls ? CLASS_COLOR : null;

                                return (
                                    <TouchableOpacity
                                        key={di}
                                        activeOpacity={0.65}
                                        style={[
                                            styles.cell,
                                            { width: cellWidth },
                                            idx < dayIndices.length - 1 && { marginRight: CELL_GAP },
                                            color
                                                ? { backgroundColor: color.bg, borderColor: color.border }
                                                : styles.cellEmpty,
                                        ]}
                                        onPress={() => onCellPress(day, period, cls)}
                                    >
                                        {cls && color ? (
                                            <>
                                                <View style={styles.classInner}>
                                                    <Text
                                                        style={[styles.className, { color: color.text }]}
                                                        numberOfLines={3}
                                                    >
                                                        {cls.name}
                                                    </Text>
                                                    {cls.room ? (
                                                        <View style={[styles.roomPill, { backgroundColor: color.pill }]}>
                                                            <Text
                                                                style={[styles.roomText, { color: "#FFFFFF" }]}
                                                                numberOfLines={1}
                                                            >
                                                                {cls.room}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.emptyContainer}>
                                                <Text style={styles.emptyPlus}></Text>
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
        backgroundColor: "#FFFFFF",
        paddingHorizontal: GRID_PAD,
        paddingTop: 8,
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
    dayBadge: {
        alignSelf: "stretch",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        borderRadius: 8,
    },
    dayBadgeToday: {
        backgroundColor: "#FFCC33",
    },
    dayText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1C1C1E",
        letterSpacing: 0.2,
    },
    dayTextToday: {
        color: "#1C1C1E",
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
        fontSize: 13,
        fontWeight: "700",
        color: "#3C3C43",
    },
    timeBlock: {
        alignItems: "center",
        gap: 0,
    },
    timeText: {
        fontSize: 10,
        color: "#8E8E93",
        letterSpacing: -0.3,
        lineHeight: 12,
    },
    timeSep: {
        fontSize: 8,
        color: "#C7C7CC",
        lineHeight: 10,
    },

    // セル共通
    cell: {
        flex: 1,
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1.5,
        flexDirection: "row",
    },
    cellEmpty: {
        backgroundColor: "#F8F8F8",
        borderColor: "#EFEFEF",
    },

    // 科目カード内容
    classInner: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    className: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 15,
    },
    roomPill: {
        alignSelf: "flex-start",
        marginTop: 3,
        borderRadius: 999,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    roomText: {
        fontSize: 10,
        letterSpacing: 0.1,
        fontWeight: "500",
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
