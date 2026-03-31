import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../hooks/useAttendance';
import { useAssignments } from '../hooks/useAssignments';
import { supabase } from '../lib/supabase';
import { AttendanceButton } from '../components/AttendanceButton';
import { GradeStackParamList, AttendanceStatus, Note } from '../types';

type Route = RouteProp<GradeStackParamList, 'ClassDetail'>;
type Tab = 'attendance' | 'assignment' | 'note';

const today = new Date().toISOString().slice(0, 10);

// 出席率のリング
function RingGauge({ rate, color }: { rate: number; color: string }) {
  const label = rate === 0 ? '—' : `${rate}%`;
  return (
    <View style={ring.container}>
      <View style={[ring.track, { borderColor: '#E5E5EA' }]}>
        <View style={[ring.fill, {
          borderColor: color,
          // 簡易的に回転でリング風を表現（右半分）
          transform: [{ rotate: `${Math.min(rate / 100 * 360, 180)}deg` }],
        }]} />
      </View>
      <View style={ring.center}>
        <Text style={[ring.value, { color }]}>{label}</Text>
        <Text style={ring.subLabel}>出席率</Text>
      </View>
    </View>
  );
}
const ring = StyleSheet.create({
  container: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 6, borderColor: '#E5E5EA',
  },
  fill: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 6, borderColor: '#007AFF',
    borderLeftColor: 'transparent', borderBottomColor: 'transparent',
  },
  center: { alignItems: 'center' },
  value: { fontSize: 16, fontWeight: '700' },
  subLabel: { fontSize: 9, color: '#8E8E93', marginTop: 1 },
});

export function ClassDetailScreen() {
  const route = useRoute<Route>();
  const { classId, className } = route.params;

  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const { records, loading: attLoading, upsertAttendance, stats: attStats } = useAttendance(classId);
  const { assignments, loading: asgLoading, addAssignment, toggleSubmitted, deleteAssignment, stats: asgStats } = useAssignments(classId);

  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [showAddAsg, setShowAddAsg] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(today);

  const [showAddAtt, setShowAddAtt] = useState(false);
  const [attDate, setAttDate] = useState(today);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');

  useEffect(() => {
    supabase.from('notes').select('*').eq('class_id', classId).single().then(({ data }) => {
      if (data) setNote((data as Note).content ?? '');
    });
  }, [classId]);

  const handleSaveNote = async () => {
    setNoteSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notes').upsert(
      { class_id: classId, user_id: user?.id ?? null, content: note, updated_at: new Date().toISOString() },
      { onConflict: 'class_id,user_id' }
    );
    setNoteSaving(false);
  };

  const handleAddAssignment = async () => {
    if (!newTitle.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    await addAssignment({ title: newTitle.trim(), due_date: newDue, class_id: classId });
    setNewTitle(''); setNewDue(today); setShowAddAsg(false);
  };

  const handleAddAttendance = async () => {
    await upsertAttendance(attDate, attStatus);
    setShowAddAtt(false);
  };

  const todayRecord = records.find(r => r.date === today);

  // ステータスカラー
  const attColor = attStats.rate >= 80 ? '#34C759' : attStats.rate >= 60 ? '#FF9500' : '#FF3B30';
  const asgColor = asgStats.rate >= 80 ? '#34C759' : asgStats.rate >= 60 ? '#FF9500' : '#FF3B30';

  if (attLoading || asgLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'attendance', label: '出席',  icon: 'person-outline' },
    { key: 'assignment', label: '課題',  icon: 'document-text-outline' },
    { key: 'note',       label: 'メモ',  icon: 'create-outline' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* サマリーカード */}
      <View style={s.summary}>
        <View style={s.summaryLeft}>
          <Text style={s.summaryClassName} numberOfLines={2}>{className}</Text>
          <RingGauge rate={attStats.rate} color={attColor} />
        </View>
        <View style={s.summaryStats}>
          <View style={s.statBlock}>
            <Text style={[s.statNum, { color: asgColor }]}>{asgStats.rate}%</Text>
            <Text style={s.statLbl}>課題提出率</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statNum}>{attStats.present}</Text>
            <Text style={s.statLbl}>出席</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={[s.statNum, { color: '#FF3B30' }]}>{attStats.absent}</Text>
            <Text style={s.statLbl}>欠席</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={[s.statNum, { color: '#FF9500' }]}>{attStats.late}</Text>
            <Text style={s.statLbl}>遅刻</Text>
          </View>
        </View>
      </View>

      {/* セグメントタブ */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* タブコンテンツ */}
      {activeTab === 'attendance' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          {/* 今日の出席 */}
          <Text style={s.sectionLabel}>今日の出席</Text>
          <View style={s.card}>
            <AttendanceButton
              selected={todayRecord?.status}
              onSelect={(status) => upsertAttendance(today, status)}
            />
          </View>

          {/* 出席記録一覧 */}
          <View style={s.listHeader}>
            <Text style={s.sectionLabel}>記録一覧</Text>
            <TouchableOpacity onPress={() => setShowAddAtt(true)} style={s.addBtn}>
              <Ionicons name="add" size={16} color="#007AFF" />
              <Text style={s.addBtnText}>追加</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {records.length === 0 ? (
              <Text style={s.emptyText}>出席記録がありません</Text>
            ) : (
              records.map((r, idx) => {
                const statusConf = {
                  present: { label: '出席', color: '#34C759' },
                  late:    { label: '遅刻', color: '#FF9500' },
                  absent:  { label: '欠席', color: '#FF3B30' },
                }[r.status];
                return (
                  <View key={r.id} style={[s.listRow, idx < records.length - 1 && s.listRowBorder]}>
                    <View style={[s.statusDot, { backgroundColor: statusConf.color }]} />
                    <Text style={s.listDate}>{r.date}</Text>
                    <Text style={[s.listStatus, { color: statusConf.color }]}>{statusConf.label}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'assignment' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <View style={s.listHeader}>
            <Text style={s.sectionLabel}>課題一覧 ({asgStats.submitted}/{asgStats.total})</Text>
            <TouchableOpacity onPress={() => setShowAddAsg(true)} style={s.addBtn}>
              <Ionicons name="add" size={16} color="#007AFF" />
              <Text style={s.addBtnText}>追加</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {assignments.length === 0 ? (
              <Text style={s.emptyText}>課題が登録されていません</Text>
            ) : (
              assignments.map((item, idx) => {
                const isOverdue = !item.is_submitted && item.due_date < today;
                return (
                  <View key={item.id} style={[s.listRow, idx < assignments.length - 1 && s.listRowBorder]}>
                    <TouchableOpacity
                      style={[s.checkbox, item.is_submitted && s.checkboxDone]}
                      onPress={() => toggleSubmitted(item.id, item.is_submitted)}
                    >
                      {item.is_submitted && (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <View style={s.asgInfo}>
                      <Text style={[s.asgTitle, item.is_submitted && s.strikethrough]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[s.asgDue, isOverdue && { color: '#FF3B30' }]}>
                        {isOverdue ? '期限切れ · ' : ''}{item.due_date}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => Alert.alert('削除', `「${item.title}」を削除しますか？`, [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: () => deleteAssignment(item.id) },
                      ])}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'note' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>メモ</Text>
          <View style={s.card}>
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="評価基準・試験範囲・特記事項など自由に記録..."
              placeholderTextColor="#C7C7CC"
              multiline
              textAlignVertical="top"
              onBlur={handleSaveNote}
            />
          </View>
          <TouchableOpacity
            style={[s.saveNoteBtn, noteSaving && { opacity: 0.5 }]}
            onPress={handleSaveNote}
            disabled={noteSaving}
          >
            <Text style={s.saveNoteBtnText}>保存</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 課題追加モーダル */}
      <Modal visible={showAddAsg} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowAddAsg(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>課題を追加</Text>
            <Text style={s.sheetLabel}>タイトル</Text>
            <TextInput
              style={s.sheetInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="例：レポート第3回"
              placeholderTextColor="#C7C7CC"
              autoFocus
            />
            <Text style={s.sheetLabel}>締切日（YYYY-MM-DD）</Text>
            <TextInput
              style={s.sheetInput}
              value={newDue}
              onChangeText={setNewDue}
              placeholder={today}
              placeholderTextColor="#C7C7CC"
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleAddAssignment}>
              <Text style={s.sheetConfirmText}>追加</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 出席追加モーダル */}
      <Modal visible={showAddAtt} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowAddAtt(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>出席を記録</Text>
            <Text style={s.sheetLabel}>日付（YYYY-MM-DD）</Text>
            <TextInput
              style={s.sheetInput}
              value={attDate}
              onChangeText={setAttDate}
              placeholder={today}
              placeholderTextColor="#C7C7CC"
              keyboardType="numbers-and-punctuation"
            />
            <Text style={s.sheetLabel}>状態</Text>
            <AttendanceButton selected={attStatus} onSelect={setAttStatus} />
            <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleAddAttendance}>
              <Text style={s.sheetConfirmText}>記録</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  // サマリー
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  summaryLeft: { alignItems: 'center', gap: 6 },
  summaryClassName: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textAlign: 'center', maxWidth: 80 },
  summaryStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statBlock: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  statLbl: { fontSize: 10, color: '#8E8E93' },
  statDivider: { width: 0.5, height: 28, backgroundColor: '#E5E5EA' },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#007AFF' },
  tabLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  tabLabelActive: { color: '#007AFF', fontWeight: '600' },

  // コンテンツ
  tabContent: { padding: 16, gap: 8, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  listRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  listDate: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  listStatus: { fontSize: 14, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: '#C7C7CC', fontSize: 14, paddingVertical: 20 },

  // 課題
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#34C759', borderColor: '#34C759' },
  asgInfo: { flex: 1 },
  asgTitle: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: '#C7C7CC' },
  asgDue: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  // メモ
  noteInput: {
    fontSize: 15,
    color: '#1C1C1E',
    minHeight: 180,
    paddingVertical: 14,
    lineHeight: 22,
  },
  saveNoteBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveNoteBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // モーダルシート
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center', marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  sheetLabel: { fontSize: 13, color: '#6C6C70', fontWeight: '500', marginTop: 4 },
  sheetInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  sheetConfirmBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
