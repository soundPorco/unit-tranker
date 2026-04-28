import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimetableSettings, PeriodTime } from '../types';

const STORAGE_KEY = '@timetable_settings';

const DEFAULT_TIMES: PeriodTime[] = [
  { start: '09:00', end: '10:30' },
  { start: '10:40', end: '12:10' },
  { start: '13:00', end: '14:30' },
  { start: '14:40', end: '16:10' },
  { start: '16:20', end: '17:50' },
  { start: '18:00', end: '19:30' },
  { start: '19:40', end: '21:10' },
  { start: '21:20', end: '22:50' },
];

export const DEFAULT_TIMETABLE_SETTINGS: TimetableSettings = {
  periodCount: 6,
  daysMode: 'weekdays_sat',
  periodTimes: DEFAULT_TIMES,
};

// 常に8件になるよう補完する
function normalize(s: TimetableSettings): TimetableSettings {
  const times = [...s.periodTimes];
  while (times.length < 8) times.push(DEFAULT_TIMES[times.length]);
  return { ...s, periodTimes: times.slice(0, 8) };
}

export function useTimetableSettings() {
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_TIMETABLE_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(json => {
      if (json) {
        try {
          setSettings(normalize(JSON.parse(json)));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const saveSettings = async (next: TimetableSettings) => {
    const normalized = normalize(next);
    setSettings(normalized);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  };

  return { settings, saveSettings, loaded };
}
