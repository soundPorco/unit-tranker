export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 月〜日
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'cancelled';
export type EvaluationType = 'attendance' | 'assignment' | 'exam' | 'balanced';
export type ClassType = 'required' | 'elective_required' | 'elective';
export type ExamType = 'written' | 'report' | 'oral' | 'none';
export type DaysMode = 'weekdays' | 'weekdays_sat' | 'all';
export type Semester = '前期' | '後期';

export interface PeriodTime {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface TimetableSettings {
  periodCount: number;       // 1〜8
  daysMode: DaysMode;
  periodTimes: PeriodTime[]; // 常に8件
}

export interface Timetable extends TimetableSettings {
  id: string;
  academicYear: number; // e.g. 2025
  semester: Semester;
  created_at: string;
}

export interface Class {
  id: string;
  user_id: string;
  timetable_id: string | null;
  name: string;
  teacher: string | null;
  room: string | null;
  day_of_week: DayOfWeek;
  period: Period;
  credits: number | null;        // 単位数
  class_type: ClassType | null;  // 必修/選択必修/選択
  evaluation_type: EvaluationType;
  exam_date: string | null;      // 試験日 ISO date
  exam_type: ExamType | null;    // 試験形式
  memo: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  class_id: string;
  user_id: string;
  date: string;
  status: AttendanceStatus;
  memo: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  is_submitted: boolean;
  memo: string | null;
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
  Assignments: undefined;
  Grade: undefined;
  Log: undefined;
  Settings: undefined;
};

export type TimetableStackParamList = {
  TimetableMain: undefined;
  TimetableSettings: { timetableId: string };
  ClassForm: { classData?: Class; day?: DayOfWeek; period?: Period; timetableId: string };
  ClassDetail: { classId: string; className: string };
};

export type GradeStackParamList = {
  GradeList: undefined;
  ClassDetail: { classId: string; className: string };
  AttendanceList: { classId: string; className: string };
  AssignmentList: { classId: string; className: string };
};
