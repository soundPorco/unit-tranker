import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TimetableGrid } from "../components/TimetableGrid";
import { TimetableSettingsModal } from "../components/TimetableSettingsModal";
import { useClasses } from "../hooks/useClasses";
import { useTimetables, DEFAULT_SETTINGS } from "../hooks/useTimetables";
import { TimetableStackParamList, DayOfWeek, Period, Class, TimetableSettings } from "../types";

type Nav = NativeStackNavigationProp<TimetableStackParamList, "TimetableMain">;
type Route = RouteProp<TimetableStackParamList, "TimetableMain">;

export function TimetableScreen() {
    const navigation = useNavigation<Nav>();
    const route = useRoute<Route>();
    const { timetableId } = route.params;

    const { timetables, loaded, updateSettings } = useTimetables();
    const { classes, loading, refetch } = useClasses(timetableId);
    const [showSettings, setShowSettings] = useState(false);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const timetable = timetables.find(t => t.id === timetableId) ?? null;
    const settings: TimetableSettings = timetable
        ? { periodCount: timetable.periodCount, daysMode: timetable.daysMode, periodTimes: timetable.periodTimes }
        : DEFAULT_SETTINGS;

    const handleCellPress = (
        day: DayOfWeek,
        period: Period,
        existing?: Class,
    ) => {
        navigation.navigate("ClassForm", { classData: existing, day, period, timetableId });
    };

    const handleSaveSettings = async (next: TimetableSettings) => {
        await updateSettings(timetableId, next);
    };

    if (loading || !loaded) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    const headerLabel = timetable
        ? `${timetable.grade} ${timetable.semester}`
        : '時間割';

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
                <Text style={styles.semesterTitle}>{headerLabel}</Text>
                <View style={styles.headerSide}>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.gearBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name="settings-outline"
                            size={20}
                            color="#8E8E93"
                        />
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
    headerSide: {
        width: 36,
        alignItems: "flex-end",
    },
    semesterTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1C1C1E",
        letterSpacing: 0.3,
        textAlign: "center",
        flex: 1,
    },
    gearBtn: {
        padding: 4,
    },
    gridContainer: {
        flex: 1,
    },
});
