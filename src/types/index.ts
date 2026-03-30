export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5; // 月〜土
export type Period = 1 | 2 | 3 | 4 | 5 | 6;
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type EvaluationType = 'attendance' | 'assignment' | 'exam' | 'balanced';

export interface Class {
  id: string;
  user_id: string;
  name: string;
  teacher: string | null;
  day_of_week: DayOfWeek;
  period: Period;
  evaluation_type: EvaluationType;
  memo: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  class_id: string;
  user_id: string;
  date: string; // ISO date string
  status: AttendanceStatus;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  due_date: string; // ISO date string
  is_submitted: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  class_id: string;
  user_id: string;
  content: string;
  updated_at: string;
}

export type RootTabParamList = {
  Timetable: undefined;
  Calendar: undefined;
  Grade: undefined;
  Settings: undefined;
};

export type TimetableStackParamList = {
  TimetableMain: undefined;
  ClassForm: { classData?: Class; day?: DayOfWeek; period?: Period };
};

export type GradeStackParamList = {
  GradeList: undefined;
  ClassDetail: { classId: string; className: string };
};
