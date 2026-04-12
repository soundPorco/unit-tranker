import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEY = 'assignment_notification_ids';

async function getStoredIds(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveStoredIds(ids: Record<string, string>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** 課題の通知をスケジュール（締切日の当日 8:00 AM） */
export async function scheduleAssignmentNotification(
  assignmentId: string,
  title: string,
  dueDate: string,
): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // 既存の通知をキャンセル
  await cancelAssignmentNotification(assignmentId);

  const trigger = new Date(dueDate);
  trigger.setHours(8, 0, 0, 0);

  // 過去の日時ならスキップ
  if (trigger <= new Date()) return;

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '課題の締切日です',
      body: title,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });

  const ids = await getStoredIds();
  ids[assignmentId] = notifId;
  await saveStoredIds(ids);
}

/** 課題の通知をキャンセル */
export async function cancelAssignmentNotification(assignmentId: string): Promise<void> {
  const ids = await getStoredIds();
  const notifId = ids[assignmentId];
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId);
    delete ids[assignmentId];
    await saveStoredIds(ids);
  }
}

/** 課題の通知が設定されているか確認 */
export async function hasAssignmentNotification(assignmentId: string): Promise<boolean> {
  const ids = await getStoredIds();
  return !!ids[assignmentId];
}
