import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timetable, TimetableSettings, PeriodTime, Semester } from '../types';

const STORAGE_KEY = '@timetables_v2';
const LEGACY_KEY = '@timetable_settings';

const DEFAULT_TIMES: PeriodTime[] = [
  { start: '09:00', end: '10:30' },
  { start: '10:45', end: '12:15' },
  { start: '13:00', end: '14:30' },
  { start: '14:45', end: '16:15' },
  { start: '16:30', end: '18:00' },
  { start: '18:15', end: '19:45' },
  { start: '20:00', end: '21:30' },
  { start: '21:45', end: '23:15' },
];

export const DEFAULT_SETTINGS: TimetableSettings = {
  periodCount: 6,
  daysMode: 'weekdays_sat',
  periodTimes: DEFAULT_TIMES,
};

function normalizeTimes(times: PeriodTime[]): PeriodTime[] {
  const t = [...(times ?? [])];
  while (t.length < 8) t.push(DEFAULT_TIMES[t.length]);
  return t.slice(0, 8);
}

function normalizeTimetable(raw: any): Timetable {
  // 旧データ (grade: string) を academicYear: number に移行
  const academicYear: number =
    typeof raw.academicYear === 'number'
      ? raw.academicYear
      : new Date().getFullYear();
  return {
    ...raw,
    academicYear,
    periodTimes: normalizeTimes(raw.periodTimes),
  };
}

export function useTimetables() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        try {
          const parsed: any[] = JSON.parse(json);
          setTimetables(parsed.map(normalizeTimetable));
          setLoaded(true);
          return;
        } catch {}
      }

      // レガシーデータからマイグレーション
      const legacyJson = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacyJson) {
        try {
          const legacy = JSON.parse(legacyJson);
          const semStr: string = legacy.semester ?? '';
          const semester: Semester = semStr.includes('後期') ? '後期' : '前期';
          const defaultTimetable: Timetable = {
            id: 'default',
            academicYear: new Date().getFullYear(),
            semester,
            created_at: new Date().toISOString(),
            periodCount: legacy.periodCount ?? 6,
            daysMode: legacy.daysMode ?? 'weekdays_sat',
            periodTimes: normalizeTimes(legacy.periodTimes ?? []),
          };
          const list = [defaultTimetable];
          setTimetables(list);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch {}
      }
      setLoaded(true);
    })();
  }, []);

  const persist = async (list: Timetable[]) => {
    setTimetables(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const reload = useCallback(async () => {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      try {
        const parsed: any[] = JSON.parse(json);
        setTimetables(parsed.map(normalizeTimetable));
      } catch {}
    }
  }, []);

  const createTimetable = async (academicYear: number, semester: Semester): Promise<Timetable> => {
    const newT: Timetable = {
      id: Date.now().toString(),
      academicYear,
      semester,
      created_at: new Date().toISOString(),
      periodCount: DEFAULT_SETTINGS.periodCount,
      daysMode: DEFAULT_SETTINGS.daysMode,
      periodTimes: normalizeTimes(DEFAULT_TIMES),
    };
    await persist([...timetables, newT]);
    return newT;
  };

  const deleteTimetable = async (id: string) => {
    await persist(timetables.filter(t => t.id !== id));
  };

  const updateSettings = async (id: string, settings: TimetableSettings) => {
    await persist(
      timetables.map(t =>
        t.id === id
          ? { ...t, ...settings, periodTimes: normalizeTimes(settings.periodTimes) }
          : t,
      ),
    );
  };

  const updateTimetable = async (id: string, fields: Partial<Omit<Timetable, 'id' | 'created_at'>>) => {
    await persist(
      timetables.map(t =>
        t.id === id
          ? {
              ...t,
              ...fields,
              periodTimes: normalizeTimes(fields.periodTimes ?? t.periodTimes),
            }
          : t,
      ),
    );
  };

  return { timetables, loaded, reload, createTimetable, deleteTimetable, updateSettings, updateTimetable };
}
