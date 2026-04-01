import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimetableSettings, PeriodTime } from '../types';

const STORAGE_KEY = '@timetable_settings';

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
