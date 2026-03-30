import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useClasses } from '../hooks/useClasses';
import { TimetableStackParamList, EvaluationType } from '../types';

type Route = RouteProp<TimetableStackParamList, 'ClassForm'>;

const EVAL_OPTIONS: { value: EvaluationType; label: string }[] = [
  { value: 'balanced',   label: '総合' },
  { value: 'attendance', label: '出席重視' },
  { value: 'assignment', label: '課題重視' },
  { value: 'exam',       label: 'テスト重視' },
];

const DAYS = ['月', '火', '水', '木', '金', '土'];

export function ClassFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { classData, day, period } = route.params ?? {};
  const { addClass, updateClass, deleteClass } = useClasses();

  const [name, setName] = useState(classData?.name ?? '');
  const [teacher, setTeacher] = useState(classData?.teacher ?? '');
  const [room, setRoom] = useState(classData?.room ?? '');
  const [evalType, setEvalType] = useState<EvaluationType>(classData?.evaluation_type ?? 'balanced');
  const [memo, setMemo] = useState(classData?.memo ?? '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!classData;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('エラー', '講義名を入力してください'); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      teacher: teacher.trim() || null,
      room: room.trim() || null,
      day_of_week: classData?.day_of_week ?? day ?? 0,
      period: classData?.period ?? period ?? 1,
      evaluation_type: evalType,
      memo: memo.trim() || null,
    };
    const error = isEdit
      ? await updateClass(classData!.id, payload)
      : await addClass(payload as any);
    setSaving(false);
    if (error) { Alert.alert('エラー', error.message); return; }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('削除確認', `「${classData?.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteClass(classData!.id);
          navigation.goBack();
        }
      },
    ]);
  };

  const currentDay = classData?.day_of_week ?? day ?? 0;
  const currentPeriod = classData?.period ?? period ?? 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{DAYS[currentDay]}曜 {currentPeriod}限</Text>
          </View>

          <Text style={styles.label}>講義名 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例：微分積分学"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>教員名（任意）</Text>
          <TextInput
            style={styles.input}
            value={teacher}
            onChangeText={setTeacher}
            placeholder="例：山田 太郎"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>教室（任意）</Text>
          <TextInput
            style={styles.input}
            value={room}
            onChangeText={setRoom}
            placeholder="例：A棟 201号室"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>評価タイプ</Text>
          <View style={styles.evalRow}>
            {EVAL_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.evalBtn, evalType === opt.value && styles.evalBtnActive]}
                onPress={() => setEvalType(opt.value)}
              >
                <Text style={[styles.evalText, evalType === opt.value && styles.evalTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={memo}
            onChangeText={setMemo}
            placeholder="評価基準や特記事項など"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{isEdit ? '更新' : '登録'}</Text>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>この講義を削除</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 4 },
  meta: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  metaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  evalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  evalBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  evalBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  evalText: { fontSize: 13, color: '#64748b' },
  evalTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 14 },
});
