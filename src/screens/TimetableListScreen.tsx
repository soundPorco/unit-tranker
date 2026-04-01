import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTimetables } from '../hooks/useTimetables';
import { TimetableStackParamList, Semester } from '../types';

type Nav = NativeStackNavigationProp<TimetableStackParamList, 'TimetableList'>;

const GRADE_OPTIONS = ['1年', '2年', '3年', '4年', 'その他'];
const SEMESTER_OPTIONS: Semester[] = ['前期', '後期'];

function CreateTimetableModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (grade: string, semester: Semester) => void;
}) {
  const [grade, setGrade] = useState('1年');
  const [semester, setSemester] = useState<Semester>('前期');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={modal.title}>時間割を追加</Text>
          <TouchableOpacity onPress={() => onCreate(grade, semester)}>
            <Text style={modal.save}>追加</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.scroll}>
          <Text style={modal.label}>学年</Text>
          <View style={modal.card}>
            <View style={modal.chipRow}>
              {GRADE_OPTIONS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[modal.chip, grade === g && modal.chipActive]}
                  onPress={() => setGrade(g)}
                >
                  <Text style={[modal.chipText, grade === g && modal.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={modal.label}>学期</Text>
          <View style={[modal.card, modal.row]}>
            {SEMESTER_OPTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[modal.segBtn, semester === s && modal.segActive]}
                onPress={() => setSemester(s)}
              >
                <Text style={[modal.segText, semester === s && modal.segTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function TimetableListScreen() {
  const navigation = useNavigation<Nav>();
  const { timetables, loaded, createTimetable, deleteTimetable } = useTimetables();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (grade: string, semester: Semester) => {
    setShowCreate(false);
    const newT = await createTimetable(grade, semester);
    navigation.navigate('TimetableMain', { timetableId: newT.id });
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert('削除確認', `「${label}」を削除しますか？\n登録済みの講義は残ります。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: () => deleteTimetable(id),
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>時間割</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={26} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {timetables.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={52} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>時間割がありません</Text>
          <Text style={styles.emptyDesc}>右上の＋ボタンで追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={timetables}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const label = `${item.grade} ${item.semester}`;
            const date = new Date(item.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TimetableMain', { timetableId: item.id })}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="calendar" size={24} color="#007AFF" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.cardDate}>作成日: {date}</Text>
                </View>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => handleDelete(item.id, label)}
                >
                  <Ionicons name="trash-outline" size={18} color="#C7C7CC" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <CreateTimetableModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: 0.3 },
  addBtn: { padding: 4 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
  emptyDesc: { fontSize: 14, color: '#8E8E93' },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  cardDate: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});

const modal = StyleSheet.create({
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
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
