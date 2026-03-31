import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimetableSettings, DaysMode } from '../types';

interface Props {
  visible: boolean;
  settings: TimetableSettings;
  onSave: (s: TimetableSettings) => void;
  onClose: () => void;
}

const DAYS_OPTIONS: { value: DaysMode; label: string }[] = [
  { value: 'weekdays',     label: '平日のみ' },
  { value: 'weekdays_sat', label: '平日+土' },
  { value: 'all',          label: '全曜日' },
];

function generateSemesters(): string[] {
  const y = new Date().getFullYear();
  return [-1, 0, 1, 2].flatMap(d => [`${y + d}年度前期`, `${y + d}年度後期`]);
}

const SEMESTERS = generateSemesters();

export function TimetableSettingsModal({ visible, settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<TimetableSettings>(settings);

  // visible になるたびに最新 settings を draft に反映
  useEffect(() => {
    if (visible) setDraft(settings);
  }, [visible, settings]);

  const setTime = (idx: number, field: 'start' | 'end', val: string) => {
    const times = draft.periodTimes.map((t, i) => i === idx ? { ...t, [field]: val } : t);
    setDraft(d => ({ ...d, periodTimes: times }));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>時間割の設定</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>保存</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* 学期 */}
            <Text style={styles.sectionLabel}>学期</Text>
            <View style={styles.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterRow}>
                {SEMESTERS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.semesterChip, draft.semester === s && styles.chipActive]}
                    onPress={() => setDraft(d => ({ ...d, semester: s }))}
                  >
                    <Text style={[styles.chipText, draft.semester === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 表示曜日 */}
            <Text style={styles.sectionLabel}>表示曜日</Text>
            <View style={[styles.card, styles.row]}>
              {DAYS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segmentBtn, draft.daysMode === opt.value && styles.segmentActive]}
                  onPress={() => setDraft(d => ({ ...d, daysMode: opt.value }))}
                >
                  <Text style={[styles.segmentText, draft.daysMode === opt.value && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 時限数 */}
            <Text style={styles.sectionLabel}>時限数</Text>
            <View style={[styles.card, styles.row, { flexWrap: 'wrap', gap: 8 }]}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.periodNumBtn, draft.periodCount === n && styles.periodNumActive]}
                  onPress={() => setDraft(d => ({ ...d, periodCount: n }))}
                >
                  <Text style={[styles.periodNumText, draft.periodCount === n && styles.periodNumTextActive]}>
                    {n}限
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 各時限の時間 */}
            <Text style={styles.sectionLabel}>各時限の時間</Text>
            <View style={styles.card}>
              {Array.from({ length: draft.periodCount }, (_, i) => i).map(idx => (
                <View
                  key={idx}
                  style={[styles.timeRow, idx < draft.periodCount - 1 && styles.timeRowBorder]}
                >
                  <Text style={styles.timeLabel}>{idx + 1}限</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={draft.periodTimes[idx]?.start ?? ''}
                    onChangeText={v => setTime(idx, 'start', v)}
                    placeholder="09:00"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={styles.timeSep}>〜</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={draft.periodTimes[idx]?.end ?? ''}
                    onChangeText={v => setTime(idx, 'end', v)}
                    placeholder="10:30"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              ))}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  cancelBtn: { minWidth: 60 },
  cancelText: { fontSize: 17, color: '#007AFF' },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { fontSize: 17, color: '#007AFF', fontWeight: '600' },

  scroll: { padding: 16, gap: 4, paddingBottom: 40 },

  sectionLabel: {
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

  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  // 学期チップ
  semesterRow: { gap: 8, paddingVertical: 2 },
  semesterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 表示曜日セグメント
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  segmentActive: { backgroundColor: '#007AFF' },
  segmentText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 時限数ボタン
  periodNumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  periodNumActive: { backgroundColor: '#007AFF' },
  periodNumText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  periodNumTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // 時間入力行
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  timeRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  timeLabel: {
    width: 32,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 15,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  timeSep: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
