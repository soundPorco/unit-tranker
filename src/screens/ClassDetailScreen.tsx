import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAttendance } from '../hooks/useAttendance';
import { useAssignments } from '../hooks/useAssignments';
import { supabase } from '../lib/supabase';
import { AttendanceButton } from '../components/AttendanceButton';
import { AssignmentItem } from '../components/AssignmentItem';
import { StatusBadge } from '../components/StatusBadge';
import { GradeStackParamList, AttendanceStatus, Note } from '../types';

type Route = RouteProp<GradeStackParamList, 'ClassDetail'>;

const today = new Date().toISOString().slice(0, 10);

export function ClassDetailScreen() {
  const route = useRoute<Route>();
  const { classId, className } = route.params;

  const { records, loading: attLoading, upsertAttendance, stats: attStats } = useAttendance(classId);
  const { assignments, loading: asgLoading, addAssignment, toggleSubmitted, deleteAssignment, stats: asgStats } = useAssignments(classId);

  // メモ
  const [note, setNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  // 課題追加モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(today);

  // 出席追加モーダル
  const [showAttModal, setShowAttModal] = useState(false);
  const [attDate, setAttDate] = useState(today);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('class_id', classId)
        .single();
      if (data) {
        setNote((data as Note).content ?? '');
        setNoteId(data.id);
      }
    })();
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
    setNewTitle('');
    setNewDue(today);
    setShowAddModal(false);
  };

  const handleAddAttendance = async () => {
    await upsertAttendance(attDate, attStatus);
    setShowAttModal(false);
  };

  const todayRecord = records.find(r => r.date === today);

  if (attLoading || asgLoading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ステータスカード */}
        <View style={styles.statusCard}>
          <Text style={styles.classTitle}>{className}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{attStats.rate}%</Text>
              <Text style={styles.statLabel}>出席率</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{asgStats.rate}%</Text>
              <Text style={styles.statLabel}>提出率</Text>
            </View>
            <StatusBadge attendanceRate={attStats.rate} submissionRate={asgStats.rate} />
          </View>
        </View>

        {/* 出席管理 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>出席管理</Text>
            <TouchableOpacity onPress={() => setShowAttModal(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ 記録</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionSub}>
            出席 {attStats.present} / 遅刻 {attStats.late} / 欠席 {attStats.absent}（計 {attStats.total}回）
          </Text>

          <Text style={styles.todayLabel}>今日の出席</Text>
          <AttendanceButton
            selected={todayRecord?.status}
            onSelect={(status) => upsertAttendance(today, status)}
          />

          {records.slice(0, 5).map(r => (
            <View key={r.id} style={styles.recordRow}>
              <Text style={styles.recordDate}>{r.date}</Text>
              <Text style={[styles.recordStatus, {
                color: r.status === 'present' ? '#22c55e' : r.status === 'late' ? '#f59e0b' : '#ef4444'
              }]}>
                {r.status === 'present' ? '出席' : r.status === 'late' ? '遅刻' : '欠席'}
              </Text>
            </View>
          ))}
        </View>

        {/* 課題管理 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>課題</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ 追加</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSub}>{asgStats.submitted}/{asgStats.total} 提出済み</Text>

          {assignments.length === 0 && (
            <Text style={styles.emptyText}>課題が登録されていません</Text>
          )}
          {assignments.map(item => (
            <AssignmentItem
              key={item.id}
              item={item}
              onToggle={toggleSubmitted}
              onDelete={deleteAssignment}
            />
          ))}
        </View>

        {/* メモ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="評価基準や特記事項など自由に記録..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            onBlur={handleSaveNote}
          />
          <TouchableOpacity
            style={[styles.saveNoteBtn, noteSaving && { opacity: 0.6 }]}
            onPress={handleSaveNote}
            disabled={noteSaving}
          >
            <Text style={styles.saveNoteBtnText}>メモを保存</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 課題追加モーダル */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>課題を追加</Text>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="課題名"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.label}>締切日（YYYY-MM-DD）</Text>
            <TextInput
              style={styles.input}
              value={newDue}
              onChangeText={setNewDue}
              placeholder={today}
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddAssignment}>
                <Text style={styles.confirmText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 出席追加モーダル */}
      <Modal visible={showAttModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>出席を記録</Text>
            <Text style={styles.label}>日付（YYYY-MM-DD）</Text>
            <TextInput
              style={styles.input}
              value={attDate}
              onChangeText={setAttDate}
              placeholder={today}
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.label}>出席状態</Text>
            <AttendanceButton selected={attStatus} onSelect={setAttStatus} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAttModal(false)}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddAttendance}>
                <Text style={styles.confirmText}>記録</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 12, gap: 12 },
  statusCard: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    padding: 16,
  },
  classTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#c7d2fe', fontSize: 11 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  sectionSub: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  addBtn: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: { color: '#6366f1', fontWeight: '600', fontSize: 13 },
  todayLabel: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  recordDate: { fontSize: 13, color: '#64748b' },
  recordStatus: { fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    height: 120,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  saveNoteBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveNoteBtnText: { color: '#6366f1', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#64748b', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700' },
});
