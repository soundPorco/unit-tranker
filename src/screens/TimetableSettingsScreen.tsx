import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Modal,
  TouchableWithoutFeedback, NativeSyntheticEvent, NativeScrollEvent,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTimetables } from '../hooks/useTimetables';
import { useClasses } from '../hooks/useClasses';
import { TimetableStackParamList, TimetableSettings, DaysMode, Semester, Class } from '../types';

type Nav = NativeStackNavigationProp<TimetableStackParamList, 'TimetableSettings'>;
type Route = RouteProp<TimetableStackParamList, 'TimetableSettings'>;

const SEMESTER_OPTIONS: Semester[] = ['前期', '後期'];
const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

const DAYS_MODE_MAX: Record<DaysMode, number> = {
  weekdays: 4,
  weekdays_sat: 5,
  all: 6,
};

const DAYS_OPTIONS: { value: DaysMode; label: string }[] = [
  { value: 'weekdays',     label: '平日のみ' },
  { value: 'weekdays_sat', label: '平日+土' },
  { value: 'all',          label: '全曜日' },
];

// ─── スクロールピッカー ───────────────────────────────────

const ITEM_H = 46;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// 選択状態に依存しないメモ化アイテム — スクロール中に再レンダリングしない
const PickerItem = React.memo(({ label }: { label: string }) => (
  <View style={ps.item}>
    <Text style={ps.itemText}>{label}</Text>
  </View>
));

const ScrollColumn = React.memo(function ScrollColumn({
  values,
  selected,
  onChange,
}: {
  values: string[];
  selected: string;
  onChange: (val: string) => void;
}) {
  const listRef = useRef<FlatList<string>>(null);
  const isScrollingRef = useRef(false);

  // selectedIdx を ref で持ち、常に最新値を参照できるようにする
  const selectedIdxRef = useRef(Math.max(0, values.indexOf(selected)));
  selectedIdxRef.current = Math.max(0, values.indexOf(selected));

  const scrollToIdx = useCallback((idx: number, animated: boolean) => {
    listRef.current?.scrollToOffset({ offset: idx * ITEM_H, animated });
  }, []);

  // selected が外部から変わったとき（モーダルを開いた直後）だけスクロール
  useEffect(() => {
    if (!isScrollingRef.current) {
      scrollToIdx(selectedIdxRef.current, false);
    }
  }, [selected, scrollToIdx]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_H,
    offset: PAD + ITEM_H * index, // ListHeader 分のオフセットを含む
    index,
  }), []);

  const renderItem = useCallback(({ item }: { item: string }) => (
    <PickerItem label={item} />
  ), []);

  const keyExtractor = useCallback((item: string) => item, []);

  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  // スクロール終了時のみ onChange を呼ぶ（二重発火なし）
  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = false;
    const rawIdx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const idx = Math.max(0, Math.min(rawIdx, values.length - 1));
    onChange(values[idx]);
  }, [values, onChange]);

  const listHeader = useMemo(() => <View style={{ height: PAD }} />, []);
  const listFooter = useMemo(() => <View style={{ height: PAD }} />, []);

  return (
    <View style={ps.column}>
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={() => scrollToIdx(selectedIdxRef.current, false)}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        removeClippedSubviews={false}
      />
      {/* 選択中ハイライト枠 */}
      <View style={ps.highlight} pointerEvents="none" />
    </View>
  );
});

function TimePickerModal({
  visible,
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: string;
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const parts = value.split(':');
  const [selH, setSelH] = useState(parts[0] ?? '09');
  const [selM, setSelM] = useState(parts[1] ?? '00');

  // モーダルが開くたびに初期値をリセット
  useEffect(() => {
    if (visible) {
      const p = value.split(':');
      setSelH(p[0] ?? '09');
      setSelM(p[1] ?? '00');
    }
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={pm.backdrop}>
          <TouchableWithoutFeedback>
            <View style={pm.sheet}>
              {/* ヘッダー */}
              <View style={pm.header}>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={pm.cancel}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={pm.title}>時間を選択</Text>
                <TouchableOpacity
                  onPress={() => { onConfirm(`${selH}:${selM}`); onClose(); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={pm.done}>完了</Text>
                </TouchableOpacity>
              </View>

              {/* ピッカー本体 */}
              <View style={pm.pickerRow}>
                <ScrollColumn values={HOURS} selected={selH} onChange={setSelH} />
                <Text style={pm.colon}>:</Text>
                <ScrollColumn values={MINUTES} selected={selM} onChange={setSelM} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── メイン画面 ──────────────────────────────────────────

export function TimetableSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { timetableId } = route.params;

  const { timetables, updateTimetable, loaded, globalSettings, updateGlobalSettings } = useTimetables();
  const { classes, deleteClass } = useClasses(timetableId);

  const timetable = timetables.find(t => t.id === timetableId) ?? null;

  // 個別設定（この時間割）
  const [draftYear, setDraftYear] = useState(timetable?.academicYear ?? new Date().getFullYear());
  const [draftSemester, setDraftSemester] = useState<Semester>(timetable?.semester ?? '前期');

  // 全体設定（全時間割共通）
  const [globalDraft, setGlobalDraft] = useState<TimetableSettings>(globalSettings);

  useEffect(() => {
    if (loaded && timetable) {
      setDraftYear(timetable.academicYear);
      setDraftSemester(timetable.semester);
    }
  }, [timetableId, loaded]);

  useEffect(() => {
    if (loaded) {
      setGlobalDraft(globalSettings);
    }
  }, [loaded]);

  // 時間ピッカー
  const [editingField, setEditingField] = useState<{ idx: number; field: 'start' | 'end' } | null>(null);

  const openPicker = (idx: number, field: 'start' | 'end') => setEditingField({ idx, field });
  const closePicker = () => setEditingField(null);

  const handleTimeConfirm = (val: string) => {
    if (!editingField) return;
    const { idx, field } = editingField;
    const times = globalDraft.periodTimes.map((t, i) => i === idx ? { ...t, [field]: val } : t);
    setGlobalDraft(d => ({ ...d, periodTimes: times }));
  };

  const pickerValue = editingField
    ? (globalDraft.periodTimes[editingField.idx]?.[editingField.field] ?? '09:00')
    : '09:00';

  // 削除確認モーダル
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAffected, setPendingAffected] = useState<Class[]>([]);

  const handleSave = () => {
    const newMaxDay = DAYS_MODE_MAX[globalDraft.daysMode];
    const hiddenByDay = classes.filter(c => c.day_of_week > newMaxDay);
    const hiddenByPeriod = classes.filter(c => c.period > globalDraft.periodCount);
    const affected = [...hiddenByDay, ...hiddenByPeriod.filter(c => !hiddenByDay.find(d => d.id === c.id))];

    if (affected.length === 0) {
      save([]);
      return;
    }
    setPendingAffected(affected);
    setConfirmVisible(true);
  };

  const save = async (classIdsToDelete: string[]) => {
    for (const id of classIdsToDelete) {
      await deleteClass(id);
    }
    await updateTimetable(timetableId, { academicYear: draftYear, semester: draftSemester });
    await updateGlobalSettings(globalDraft);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ─── 個別設定セクション ─── */}
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="calendar-outline" size={15} color="#007AFF" />
            </View>
            <Text style={s.sectionHeaderText}>この時間割の設定</Text>
          </View>
          <Text style={s.sectionNote}>この時間割にのみ適用されます</Text>

          {/* 年度 */}
          <Text style={s.fieldLabel}>年度</Text>
          <View style={s.card}>
            <View style={s.yearRow}>
              <TouchableOpacity style={s.yearBtn} onPress={() => setDraftYear(y => y - 1)}>
                <Ionicons name="remove" size={20} color="#007AFF" />
              </TouchableOpacity>
              <Text style={s.yearText}>{draftYear}年度</Text>
              <TouchableOpacity style={s.yearBtn} onPress={() => setDraftYear(y => y + 1)}>
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 学期 */}
          <Text style={s.fieldLabel}>学期</Text>
          <View style={[s.card, s.row]}>
            {SEMESTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.segBtn, draftSemester === opt && s.segActive]}
                onPress={() => setDraftSemester(opt)}
              >
                <Text style={[s.segText, draftSemester === opt && s.segTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── 全体設定セクション ─── */}
          <View style={[s.sectionHeader, { marginTop: 28 }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: '#F0FFF4' }]}>
              <Ionicons name="grid-outline" size={15} color="#34C759" />
            </View>
            <Text style={s.sectionHeaderText}>全体設定</Text>
          </View>
          <Text style={s.sectionNote}>全ての時間割に共通して適用されます</Text>

          {/* 表示曜日 */}
          <Text style={s.fieldLabel}>表示曜日</Text>
          <View style={[s.card, s.row]}>
            {DAYS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.segBtn, globalDraft.daysMode === opt.value && s.segActive]}
                onPress={() => setGlobalDraft(d => ({ ...d, daysMode: opt.value }))}
              >
                <Text style={[s.segText, globalDraft.daysMode === opt.value && s.segTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 時限数 */}
          <Text style={s.fieldLabel}>時限数</Text>
          <View style={[s.card, s.row, { flexWrap: 'wrap', gap: 8 }]}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <TouchableOpacity
                key={n}
                style={[s.periodBtn, globalDraft.periodCount === n && s.periodBtnActive]}
                onPress={() => setGlobalDraft(d => ({ ...d, periodCount: n }))}
              >
                <Text style={[s.periodText, globalDraft.periodCount === n && s.periodTextActive]}>{n}限</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 授業時間 */}
          <Text style={s.fieldLabel}>授業時間</Text>
          <View style={s.card}>
            {Array.from({ length: globalDraft.periodCount }, (_, i) => i).map(idx => (
              <View key={idx} style={[s.timeRow, idx < globalDraft.periodCount - 1 && s.timeRowBorder]}>
                <Text style={s.timeLabel}>{idx + 1}限</Text>
                <TouchableOpacity
                  style={s.timeBtn}
                  onPress={() => openPicker(idx, 'start')}
                  activeOpacity={0.7}
                >
                  <Text style={s.timeBtnText}>
                    {globalDraft.periodTimes[idx]?.start || '──:──'}
                  </Text>
                </TouchableOpacity>
                <Text style={s.timeSep}>〜</Text>
                <TouchableOpacity
                  style={s.timeBtn}
                  onPress={() => openPicker(idx, 'end')}
                  activeOpacity={0.7}
                >
                  <Text style={s.timeBtnText}>
                    {globalDraft.periodTimes[idx]?.end || '──:──'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>保存</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* 時間ピッカーモーダル */}
      <TimePickerModal
        visible={editingField !== null}
        value={pickerValue}
        onConfirm={handleTimeConfirm}
        onClose={closePicker}
      />

      {/* 削除確認モーダル */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={c.overlay}>
          <View style={c.card}>
            <View style={c.iconWrap}>
              <Ionicons name="trash-outline" size={28} color="#FF3B30" />
            </View>
            <Text style={c.title}>{pendingAffected.length}件の講義が削除されます</Text>
            <Text style={c.subtitle}>
              設定変更により表示範囲外となる講義を削除します。この操作は取り消せません。
            </Text>
            <ScrollView style={c.list} contentContainerStyle={c.listContent}>
              {pendingAffected.map(cls => (
                <View key={cls.id} style={c.classRow}>
                  <View style={c.classDot} />
                  <Text style={c.className}>{cls.name}</Text>
                  <Text style={c.classSlot}>{DAY_LABELS[cls.day_of_week]}曜 {cls.period}限</Text>
                </View>
              ))}
            </ScrollView>
            <View style={c.btnRow}>
              <TouchableOpacity style={c.btnCancel} onPress={() => { setConfirmVisible(false); setPendingAffected([]); }}>
                <Text style={c.btnCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={c.btnDelete} onPress={() => { setConfirmVisible(false); save(pendingAffected.map(cls => cls.id)); }}>
                <Text style={c.btnDeleteText}>削除する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── スクロールカラムスタイル ─────────────────────────────

const ps = StyleSheet.create({
  column: {
    width: 80,
    height: PICKER_H,
    overflow: 'hidden',
  },
  item: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  highlight: {
    position: 'absolute',
    top: PAD,
    height: ITEM_H,
    left: 6,
    right: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
    borderRadius: 4,
  },
});

// ─── 時間ピッカーモーダルスタイル ────────────────────────

const pm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  cancel: {
    fontSize: 17,
    color: '#8E8E93',
  },
  done: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  colon: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1C1C1E',
    marginHorizontal: 4,
    marginBottom: 4,
  },
});

// ─── メイン画面スタイル ───────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 16, gap: 4, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sectionNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 10,
    marginLeft: 2,
  },

  fieldLabel: {
    fontSize: 13,
    color: '#6C6C70',
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  yearBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center',
  },
  yearText: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', minWidth: 120, textAlign: 'center' },

  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F2F2F7' },
  segActive: { backgroundColor: '#007AFF' },
  segText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  segTextActive: { color: '#FFFFFF', fontWeight: '600' },

  periodBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F2F2F7' },
  periodBtnActive: { backgroundColor: '#007AFF' },
  periodText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  periodTextActive: { color: '#FFFFFF', fontWeight: '600' },

  timeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  timeRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  timeLabel: { width: 32, fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  timeBtn: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  timeSep: { fontSize: 14, color: '#8E8E93' },

  saveBtn: {
    backgroundColor: '#007AFF', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

// ─── 削除確認モーダルスタイル ─────────────────────────────

const c = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  card: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFF1F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#6C6C70', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  list: { width: '100%', maxHeight: 180, marginBottom: 20 },
  listContent: { gap: 10 },
  classRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F9F9FB', borderRadius: 8,
  },
  classDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' },
  className: { flex: 1, fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  classSlot: { fontSize: 13, color: '#8E8E93' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F2F2F7', alignItems: 'center' },
  btnCancelText: { fontSize: 16, fontWeight: '600', color: '#3C3C43' },
  btnDelete: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#FF3B30', alignItems: 'center' },
  btnDeleteText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
