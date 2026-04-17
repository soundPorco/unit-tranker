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

const SEMESTER_OPTIONS: Semester[] = ['前期', '後期'];

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
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modal.cancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={modal.title}>時間割を追加</Text>
          <TouchableOpacity onPress={() => onCreate(academicYear, semester)}>
            <Text style={modal.save}>追加</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modal.scroll}>
          <Text style={modal.label}>年度</Text>
          <View style={modal.card}>
            <View style={modal.yearRow}>
              <TouchableOpacity
                style={modal.yearBtn}
                onPress={() => setAcademicYear(y => y - 1)}
              >
                <Ionicons name="remove" size={20} color="#3eb370" />
              </TouchableOpacity>
              <Text style={modal.yearText}>{academicYear}年度</Text>
              <TouchableOpacity
                style={modal.yearBtn}
                onPress={() => setAcademicYear(y => y + 1)}
              >
                <Ionicons name="add" size={20} color="#3eb370" />
              </TouchableOpacity>
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

  const handleCreate = async (academicYear: number, semester: Semester) => {
    setShowCreate(false);
    const newT = await createTimetable(academicYear, semester);
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
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {timetables.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={52} color="rgba(255,255,255,0.6)" />
          <Text style={styles.emptyTitle}>時間割がありません</Text>
          <Text style={styles.emptyDesc}>右上の＋ボタンで追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={timetables}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const label = `${item.academicYear}年度 ${item.semester}`;
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
                  <Ionicons name="calendar" size={24} color="#3eb370" />
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
  container: { flex: 1, backgroundColor: '#3eb370' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginTop: 8 },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#1a5c38',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e6f5ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  cardDate: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0faf5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#b8dfc9',
    backgroundColor: '#f0faf5',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  cancel: { fontSize: 17, color: '#3eb370' },
  save: { fontSize: 17, color: '#3eb370', fontWeight: '600' },

  scroll: { padding: 16, gap: 4 },

  label: {
    fontSize: 13,
    color: '#2d8a58',
    fontWeight: '600',
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
    backgroundColor: '#d4edda',
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
    backgroundColor: '#d4edda',
  },
  segActive: { backgroundColor: '#3eb370' },
  segText: { fontSize: 14, color: '#2d8a58', fontWeight: '500' },
  segTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
