import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TimetableGrid } from "../components/TimetableGrid";
import { TimetableSettingsModal } from "../components/TimetableSettingsModal";
import { useClasses } from "../hooks/useClasses";
import { useTimetables, DEFAULT_SETTINGS } from "../hooks/useTimetables";
import { TimetableStackParamList, DayOfWeek, Period, Class, TimetableSettings, Timetable } from "../types";

type Nav = NativeStackNavigationProp<TimetableStackParamList, "TimetableMain">;
type Route = RouteProp<TimetableStackParamList, "TimetableMain">;

function TimetableSwitcher({
    timetables,
    currentId,
    onSelect,
    onClose,
}: {
    timetables: Timetable[];
    currentId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={sw.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={sw.card}>
                            <FlatList
                                data={timetables}
                                keyExtractor={item => item.id}
                                scrollEnabled={timetables.length > 6}
                                ItemSeparatorComponent={() => <View style={sw.sep} />}
                                renderItem={({ item }) => {
                                    const label = `${item.grade} ${item.semester}`;
                                    const active = item.id === currentId;
                                    return (
                                        <TouchableOpacity
                                            style={sw.row}
                                            activeOpacity={0.6}
                                            onPress={() => {
                                                onSelect(item.id);
                                                onClose();
                                            }}
                                        >
                                            <Text style={[sw.label, active && sw.labelActive]}>
                                                {label}
                                            </Text>
                                            {active && (
                                                <Ionicons name="checkmark" size={18} color="#007AFF" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

export function TimetableScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();

    const { timetables, loaded, updateSettings } = useTimetables();
    const [currentTimetableId, setCurrentTimetableId] = useState(route.params.timetableId);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const { classes, loading, refetch } = useClasses(currentTimetableId);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const timetable = timetables.find(t => t.id === currentTimetableId) ?? null;
    const settings: TimetableSettings = timetable
        ? { periodCount: timetable.periodCount, daysMode: timetable.daysMode, periodTimes: timetable.periodTimes }
        : DEFAULT_SETTINGS;

    const handleCellPress = (day: DayOfWeek, period: Period, existing?: Class) => {
        navigation.navigate("ClassForm", { classData: existing, day, period, timetableId: currentTimetableId });
    };

    const handleSaveSettings = async (next: TimetableSettings) => {
        await updateSettings(currentTimetableId, next);
    };

    if (loading || !loaded) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    const headerLabel = timetable ? `${timetable.grade} ${timetable.semester}` : '時間割';

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-back" size={22} color="#007AFF" />
                </TouchableOpacity>

                {/* 時間割切り替えボタン */}
                <TouchableOpacity
                    style={styles.switcherBtn}
                    onPress={() => setShowSwitcher(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.semesterTitle}>{headerLabel}</Text>
                    <Ionicons
                        name={showSwitcher ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#8E8E93"
                        style={styles.switcherChevron}
                    />
                </TouchableOpacity>

                <View style={styles.headerSide}>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.gearBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="settings-outline" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* グリッド */}
            <View style={styles.gridContainer}>
                <TimetableGrid
                    classes={classes}
                    settings={settings}
                    onCellPress={handleCellPress}
                />
            </View>

            {/* 時間割切り替えドロップダウン */}
            {showSwitcher && (
                <TimetableSwitcher
                    timetables={timetables}
                    currentId={currentTimetableId}
                    onSelect={setCurrentTimetableId}
                    onClose={() => setShowSwitcher(false)}
                />
            )}

            {/* 設定モーダル */}
            <TimetableSettingsModal
                visible={showSettings}
                settings={settings}
                onSave={handleSaveSettings}
                onClose={() => setShowSettings(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 10,
    },
    backBtn: {
        width: 36,
        alignItems: "flex-start",
    },
    switcherBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    semesterTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1C1C1E",
        letterSpacing: 0.3,
    },
    switcherChevron: {
        marginTop: 3,
    },
    headerSide: {
        width: 36,
        alignItems: "flex-end",
    },
    gearBtn: {
        padding: 4,
    },
    gridContainer: {
        flex: 1,
    },
});

// ドロップダウンスタイル
const sw = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "center",
        paddingTop: 100, // ヘッダー分の余白
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        width: 200,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    sep: {
        height: 0.5,
        backgroundColor: "#E5E5EA",
        marginHorizontal: 16,
    },
    label: {
        fontSize: 16,
        color: "#1C1C1E",
        fontWeight: "500",
    },
    labelActive: {
        color: "#007AFF",
        fontWeight: "600",
    },
});
