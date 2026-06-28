export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export type UserRole = 'Student' | 'Professional' | 'Entrepreneur' | 'General';

export interface Goal {
  id: string;
  name: string;
  deadline: string;
  totalTasksCount: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: UserRole;
  deadline: string; // YYYY-MM-DD
  estimatedDuration: number; // in minutes
  priority: 'High' | 'Medium' | 'Low';
  aiScore?: number; // 1 to 100 computed by AI
  aiJustification?: string;
  subTasks: SubTask[];
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  goalId?: string; // link to active Goal
  actualTime?: number;
  completionStatus?: 'early' | 'on-time' | 'late';
  postponed?: boolean;
  postponedReason?: string;
}

export interface StressAssessment {
  stressScore: number; // 0 to 100
  stressLabel: 'Low' | 'Medium' | 'High' | 'Critical';
  cognitiveLoadScore: number; // 0 to 100
  cognitiveLoadLabel: 'Optimal' | 'Manageable' | 'Heavy' | 'Overloaded';
  peakFocusPeriods: { start: string; end: string; label: string }[];
  analysis: string;
  postponedTasksCount: number;
  postponedTaskTitles: string[];
}

export interface UserProfile {
  name: string;
  customRole: string; // e.g. "medical student", "startup founder"
  streakDays: number;
  avatarUrl?: string;
}

export interface SparkCelebration {
  taskTitle: string;
  message: string;
  timestamp: string;
}

export interface ScheduleBlock {
  id: string;
  timeStart: string; // e.g. "09:00"
  timeEnd: string; // e.g. "10:30"
  title: string;
  type: 'focus' | 'break' | 'admin' | 'leisure';
  associatedTaskId?: string;
  aiAdvice?: string;
}

export interface DailySchedule {
  blocks: ScheduleBlock[];
  date: string;
  generationAdvice?: string;
}

export interface CoachingResponse {
  message: string;
  microStep: string;
  timerMinutes: number;
  checkInQuestion: string;
}

export interface ProductivityInsights {
  efficiencyScore: number;
  completedCount: number;
  pendingCount: number;
  insights: string[];
  recommendations: string[];
}
