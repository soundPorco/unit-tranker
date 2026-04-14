import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    FlatList,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TimetableGrid } from "../components/TimetableGrid";
import { useClasses } from "../hooks/useClasses";
import { useTimetables } from "../hooks/useTimetables";
import { TimetableStackParamList, DayOfWeek, Period, Class, TimetableSettings, Timetable, Semester } from "../types";


type Nav = NativeStackNavigationProp<TimetableStackParamList, "TimetableMain">;

const SEMESTER_OPTIONS: Semester[] = ['前期', '後期'];

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
                                    const label = `${item.academicYear}年度 ${item.semester}`;
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

function CreateTimetableModal({
    visible,
    onClose,
    onCreate,
}: {
    visible: boolean;
    onClose: () => void;
    onCreate: (academicYear: number, semester: Semester) => void;
}) {
    const currentYear = new Date().getFullYear();
    const [academicYear, setAcademicYear] = useState(currentYear);
    const [semester, setSemester] = useState<Semester>('前期');

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={cm.container}>
                <View style={cm.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={cm.cancel}>キャンセル</Text>
                    </TouchableOpacity>
                    <Text style={cm.title}>時間割を追加</Text>
                    <TouchableOpacity onPress={() => onCreate(academicYear, semester)}>
                        <Text style={cm.save}>追加</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={cm.scroll}>
                    <Text style={cm.label}>年度</Text>
                    <View style={cm.card}>
                        <View style={cm.yearRow}>
                            <TouchableOpacity
                                style={cm.yearBtn}
                                onPress={() => setAcademicYear(y => y - 1)}
                            >
                                <Ionicons name="remove" size={20} color="#007AFF" />
                            </TouchableOpacity>
                            <Text style={cm.yearText}>{academicYear}年度</Text>
                            <TouchableOpacity
                                style={cm.yearBtn}
                                onPress={() => setAcademicYear(y => y + 1)}
                            >
                                <Ionicons name="add" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={cm.label}>学期</Text>
                    <View style={[cm.card, cm.row]}>
                        {SEMESTER_OPTIONS.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[cm.segBtn, semester === s && cm.segActive]}
                                onPress={() => setSemester(s)}
                            >
                                <Text style={[cm.segText, semester === s && cm.segTextActive]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

export function TimetableScreen() {
    const navigation = useNavigation<Nav>();

    const { timetables, loaded, reload, globalSettings, createTimetable } = useTimetables();
    const [currentTimetableId, setCurrentTimetableId] = useState<string | null>(null);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (loaded && currentTimetableId === null && timetables.length > 0) {
            setCurrentTimetableId(timetables[0].id);
        }
    }, [loaded, timetables, currentTimetableId]);

    const { classes, loading, refetch } = useClasses(currentTimetableId ?? '');

    useFocusEffect(
        useCallback(() => {
            refetch();
            reload();
        }, [refetch, reload]),
    );

    const timetable = timetables.find(t => t.id === currentTimetableId) ?? null;
    const settings: TimetableSettings = globalSettings;

    const handleCellPress = (day: DayOfWeek, period: Period, existing?: Class) => {
        if (!currentTimetableId) return;
        if (existing) {
            navigation.navigate("ClassDetail", { classId: existing.id, className: existing.name });
        } else {
            navigation.navigate("ClassForm", { day, period, timetableId: currentTimetableId });
        }
    };

    const handleCreate = async (academicYear: number, semester: Semester) => {
        setShowCreate(false);
        const newT = await createTimetable(academicYear, semester);
        setCurrentTimetableId(newT.id);
    };

    if (loading || !loaded) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    if (loaded && timetables.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <Text style={styles.semesterTitle}>時間割</Text>
                    <View style={styles.headerSide}>
                        <TouchableOpacity
                            onPress={() => setShowCreate(true)}
                            style={styles.gearBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="add" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={52} color="#C7C7CC" />
                    <Text style={styles.emptyTitle}>時間割がありません</Text>
                    <Text style={styles.emptyDesc}>右上の＋ボタンで追加しましょう</Text>
                </View>
                <CreateTimetableModal
                    visible={showCreate}
                    onClose={() => setShowCreate(false)}
                    onCreate={handleCreate}
                />
            </SafeAreaView>
        );
    }

    const headerLabel = timetable ? `${timetable.academicYear}年度 ${timetable.semester}` : '時間割';

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* ヘッダー */}
            <View style={styles.header}>
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
                        onPress={() => setShowCreate(true)}
                        style={styles.gearBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="add" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => currentTimetableId && navigation.navigate("TimetableSettings", { timetableId: currentTimetableId })}
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
                    currentId={currentTimetableId ?? ''}
                    onSelect={setCurrentTimetableId}
                    onClose={() => setShowSwitcher(false)}
                />
            )}

            {/* 時間割作成モーダル */}
            <CreateTimetableModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
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
    switcherBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
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
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    gearBtn: {
        padding: 4,
    },
    gridContainer: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 60,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
    emptyDesc: { fontSize: 14, color: '#8E8E93' },
});

// ドロップダウンスタイル
const sw = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "center",
        paddingTop: 100,
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

// 作成モーダルスタイル
const cm = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#C6C6C8',
        backgroundColor: '#F2F2F7',
    },
    title: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
    cancel: { fontSize: 17, color: '#007AFF' },
    save: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
    scroll: { padding: 16, gap: 4 },
    label: {
        fontSize: 13,
        color: '#6C6C70',
        fontWeight: '500',
        marginTop: 16,
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
    },
    yearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    yearBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    yearText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1C1C1E',
        minWidth: 120,
        textAlign: 'center',
    },
    row: { flexDirection: 'row', gap: 8 },
    segBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#F2F2F7',
    },
    segActive: { backgroundColor: '#007AFF' },
    segText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
    segTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
