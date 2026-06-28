import React, { useState, useEffect } from 'react';
import TaskBoard from './components/TaskBoard';
import ScheduleTimeline from './components/ScheduleTimeline';
import FocusCoach from './components/FocusCoach';
import ProductivityDashboard from './components/ProductivityDashboard';
import ConversationalAssistant from './components/ConversationalAssistant';
import UserProfileSection from './components/UserProfileSection';
import { Task, UserRole, DailySchedule, ProductivityInsights, Goal, UserProfile, StressAssessment } from './types';
import { Theme, THEMES } from './theme';
import { 
  Sparkles, 
  CalendarRange, 
  Compass, 
  TrendingUp, 
  CheckSquare, 
  HelpCircle,
  Clock,
  Briefcase,
  AlertCircle,
  Palette,
  Bot,
  User,
  Sun,
  Moon
} from 'lucide-react';

const STARTER_TASKS: Task[] = [
  {
    id: 'starter-1',
    title: 'Establish product MVP timeline',
    description: 'Map out the core features and release stages for our product launch.',
    category: 'Entrepreneur',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
    estimatedDuration: 60,
    priority: 'High',
    aiScore: 92,
    aiJustification: 'This is a strategic structural dependency. Getting this done unblocks the entire development timeline.',
    subTasks: [
      { id: 'sub-1', text: 'Identify essential MVP user stories', completed: true },
      { id: 'sub-2', text: 'Draft calendar-based milestones', completed: false },
      { id: 'sub-3', text: 'Review timeline constraints with cofounder', completed: false }
    ],
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'starter-2',
    title: 'Research cognitive design principles',
    description: 'Find user behaviors that increase software engagement and productivity.',
    category: 'Student',
    deadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days from now
    estimatedDuration: 90,
    priority: 'Medium',
    aiScore: 74,
    aiJustification: 'High value exploration, but can be scheduled during a lower-energy afternoon slot.',
    subTasks: [
      { id: 'sub-4', text: 'Read top 3 design psychology papers', completed: false },
      { id: 'sub-5', text: 'Synthesize actionable design list', completed: false }
    ],
    completed: false,
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ai_companion_tasks');
    return saved ? JSON.parse(saved) : STARTER_TASKS;
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('ai_companion_role');
    return (saved as UserRole) || 'General';
  });

  const [schedule, setSchedule] = useState<DailySchedule | null>(() => {
    const saved = localStorage.getItem('ai_companion_schedule');
    return saved ? JSON.parse(saved) : null;
  });

  const [insights, setInsights] = useState<ProductivityInsights | null>(() => {
    const saved = localStorage.getItem('ai_companion_insights');
    return saved ? JSON.parse(saved) : null;
  });

  // Dynamic user profile context for Sera
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ai_companion_user_profile');
    const parsed = saved ? JSON.parse(saved) : null;
    const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    const currentAvatar = localStorage.getItem('winwise_avatar_url') || defaultAvatar;
    if (parsed) {
      if (!parsed.avatarUrl) {
        parsed.avatarUrl = currentAvatar;
      }
      return parsed;
    }
    return { 
      name: 'Aryan', 
      customRole: 'medical student', 
      streakDays: 14,
      avatarUrl: currentAvatar
    };
  });

  // Dynamic macro goals
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('ai_companion_goals');
    return saved ? JSON.parse(saved) : [
      { id: 'goal-1', name: 'Pass board exams', deadline: '2026-07-31', totalTasksCount: 12 },
      { id: 'goal-2', name: 'Launch product MVP', deadline: '2026-08-15', totalTasksCount: 5 }
    ];
  });

  const [activeTab, setActiveTab] = useState<'schedule' | 'coach' | 'dashboard' | 'assistant' | 'profile'>('profile');
  const [themeKey, setThemeKey] = useState<string>(() => {
    return localStorage.getItem('flowstate_theme') || 'sage';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('winwise_dark_mode') === 'true';
  });
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stressAssessment, setStressAssessment] = useState<StressAssessment | null>(() => {
    const saved = localStorage.getItem('ai_companion_stress_assessment');
    return saved ? JSON.parse(saved) : null;
  });
  const [isGeneratingStressSchedule, setIsGeneratingStressSchedule] = useState(false);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('ai_companion_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ai_companion_role', userRole);
  }, [userRole]);

  useEffect(() => {
    if (schedule) {
      localStorage.setItem('ai_companion_schedule', JSON.stringify(schedule));
    }
  }, [schedule]);

  useEffect(() => {
    if (insights) {
      localStorage.setItem('ai_companion_insights', JSON.stringify(insights));
    }
  }, [insights]);

  useEffect(() => {
    localStorage.setItem('ai_companion_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('ai_companion_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('flowstate_theme', themeKey);
  }, [themeKey]);

  useEffect(() => {
    localStorage.setItem('winwise_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (stressAssessment) {
      localStorage.setItem('ai_companion_stress_assessment', JSON.stringify(stressAssessment));
    }
  }, [stressAssessment]);

  const activeTheme = THEMES[themeKey] || THEMES.slate;

  // Goals action handlers
  const handleAddGoal = (name: string, deadline: string) => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      name,
      deadline,
      totalTasksCount: 0
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    // Remove association from tasks
    setTasks(prev => prev.map(t => t.goalId === goalId ? { ...t, goalId: undefined } : t));
  };

  // Tasks actions
  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'createdAt' | 'subTasks' | 'completed'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subTasks: [],
      completed: false
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return { 
          ...t, 
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
          // If parent toggled complete, optionally mark all subtasks as complete
          subTasks: t.subTasks.map(sub => ({ ...sub, completed: nextCompleted }))
        };
      }
      return t;
    }));
  };

  const handleCompleteTaskWithReflection = (taskId: string, actualTime: number, completionStatus: 'early' | 'on-time' | 'late') => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: true,
          completedAt: new Date().toISOString(),
          actualTime,
          completionStatus,
          subTasks: t.subTasks.map(sub => ({ ...sub, completed: true }))
        };
      }
      return t;
    }));
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextSubTasks = t.subTasks.map(sub => 
          sub.id === subTaskId ? { ...sub, completed: !sub.completed } : sub
        );
        const allCompleted = nextSubTasks.every(s => s.completed);
        return {
          ...t,
          subTasks: nextSubTasks,
          completed: allCompleted ? true : t.completed,
          completedAt: allCompleted ? new Date().toISOString() : t.completedAt
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // API 1: Prioritize Tasks
  const handlePrioritize = async (energyLevel: 'High' | 'Medium' | 'Low') => {
    setIsPrioritizing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, userRole, energyLevel })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to prioritize tasks');
      }
      const data = await res.json();
      if (data.prioritizedTasks) {
        setTasks(data.prioritizedTasks);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Connecting to prioritized service failed. Ensure your server is active.');
    } finally {
      setIsPrioritizing(false);
    }
  };

  // API 2: Schedule builder
  const handleGenerateSchedule = async (preferences: {
    sleepHours: { start: string; end: string };
    focusPreference: 'morning' | 'afternoon' | 'evening';
    workDurationHours: number;
  }) => {
    setIsGeneratingSchedule(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.filter(t => !t.completed),
          ...preferences
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate schedule');
      }
      const data = await res.json();
      setSchedule(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Connecting to schedule service failed.');
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // API 2.5: Intelligent Stress & Cognitive Routine Optimizing API
  const handleGenerateStressSchedule = async (preferences: {
    sleepHours: { start: string; end: string };
    focusPreference: 'morning' | 'afternoon' | 'evening';
    workDurationHours: number;
    sleepPatterns: { hours: number; quality: string };
    calendarDensity: number;
  }) => {
    setIsGeneratingStressSchedule(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/stress-and-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          ...preferences
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze stress and optimize routine');
      }
      const data = await res.json();
      setStressAssessment(data.stressAssessment);
      if (data.updatedTasks) {
        setTasks(data.updatedTasks);
      }
      if (data.schedule) {
        setSchedule(data.schedule);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Connecting to stress scheduling service failed.');
    } finally {
      setIsGeneratingStressSchedule(false);
    }
  };

  // API 3: Refresh insights
  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to analyze insights');
      }
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Insight computation failed.');
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const handleSelectTaskForFocus = (taskId: string) => {
    // Bring focus tab up
    setActiveTab('coach');
  };

  return (
    <div id="application-container" className={`min-h-screen bg-[#FAF9F6] text-gray-900 flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Top Professional Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className={`${activeTheme.primaryBg} p-2 rounded-xl text-white transition-all duration-300`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-display font-bold tracking-tight text-gray-900">
              WinWise
            </h1>
            <p className="text-[10px] text-gray-400 font-medium font-mono uppercase tracking-widest">
              plan smarter win smarter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Light/Dark Mode Toggle Button */}
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            className="flex items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all shadow-3xs cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition-all cursor-pointer shrink-0"
            title="Go to Profile & Settings"
          >
            <img
              src={userProfile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
              alt={userProfile.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
              referrerPolicy="no-referrer"
            />
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>System Engine Active</span>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 py-8 md:px-8">
        
        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-150 rounded-xl p-4 mb-6 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-red-800 text-xs block">Service Interruption</span>
              <p className="text-xs text-gray-700 mt-1 leading-normal">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage(null)} 
              className="text-xs text-red-500 hover:text-red-700 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col gap-12">
          
          {/* Top Broad Section: Task Board Workspace */}
          <div className="w-full">
            <TaskBoard
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onToggleSubTask={handleToggleSubTask}
              onDeleteTask={handleDeleteTask}
              onPrioritize={handlePrioritize}
              isPrioritizing={isPrioritizing}
              userRole={userRole}
              onChangeUserRole={setUserRole}
              goals={goals}
              onAddGoal={handleAddGoal}
              onDeleteGoal={handleDeleteGoal}
              userProfile={userProfile}
              onUpdateProfile={setUserProfile}
              onCompleteTaskWithReflection={handleCompleteTaskWithReflection}
              theme={activeTheme}
            />
          </div>

          {/* Bottom Broad Section: Sera Copilot & Workspace Tools */}
          <div className="w-full flex flex-col gap-6 border-t border-gray-100 pt-10">
            
            <div className="mb-2">
              <h2 className="text-lg font-display font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                Sera Copilot & Workspace Tools
              </h2>
              <p className="text-xs text-gray-400 mt-1 font-medium">Toggle between different dynamic workspaces to manage routines, run self-coaching sessions, explore data, or update profile settings.</p>
            </div>

            {/* Custom high-contrast Tab Selector */}
            <div className="bg-white border border-gray-100 rounded-xl p-1.5 flex flex-wrap gap-1.5 shadow-2xs">
              <button
                onClick={() => setActiveTab('assistant')}
                className={`flex-1 py-3 px-4 rounded-lg font-display text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 min-w-[110px] ${
                  activeTab === 'assistant'
                    ? `${activeTheme.primaryBg} text-white shadow-xs`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Bot className="w-4 h-4" />
                Sera Assistant
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 py-3 px-4 rounded-lg font-display text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 min-w-[110px] ${
                  activeTab === 'schedule'
                    ? `${activeTheme.primaryBg} text-white shadow-xs`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                Daily Routine
              </button>

              <button
                onClick={() => setActiveTab('coach')}
                className={`flex-1 py-3 px-4 rounded-lg font-display text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 min-w-[110px] ${
                  activeTab === 'coach'
                    ? `${activeTheme.primaryBg} text-white shadow-xs`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Compass className="w-4 h-4" />
                Anti-Procrastination
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-3 px-4 rounded-lg font-display text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 min-w-[110px] ${
                  activeTab === 'dashboard'
                    ? `${activeTheme.primaryBg} text-white shadow-xs`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Productivity Analytics
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-3 px-4 rounded-lg font-display text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 min-w-[110px] ${
                  activeTab === 'profile'
                    ? `${activeTheme.primaryBg} text-white shadow-xs`
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                Profile & Settings
              </button>
            </div>

            {/* Display selected tab */}
            <div className="flex-1">
              {activeTab === 'assistant' && (
                <ConversationalAssistant
                  tasks={tasks}
                  goals={goals}
                  userProfile={userProfile}
                  theme={activeTheme}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onGenerateSchedule={handleGenerateSchedule}
                  onGenerateStressSchedule={handleGenerateStressSchedule}
                />
              )}

              {activeTab === 'schedule' && (
                <ScheduleTimeline
                  tasks={tasks}
                  schedule={schedule}
                  onGenerateSchedule={handleGenerateSchedule}
                  isGenerating={isGeneratingSchedule}
                  onSelectTaskForFocus={handleSelectTaskForFocus}
                  theme={activeTheme}
                  stressAssessment={stressAssessment}
                  onGenerateStressSchedule={handleGenerateStressSchedule}
                  isGeneratingStress={isGeneratingStressSchedule}
                />
              )}

              {activeTab === 'coach' && (
                <FocusCoach
                  tasks={tasks}
                  onCompleteTask={handleToggleTask}
                  theme={activeTheme}
                />
              )}

              {activeTab === 'dashboard' && (
                <ProductivityDashboard
                  tasks={tasks}
                  insights={insights}
                  onRefreshInsights={handleRefreshInsights}
                  isRefreshing={isRefreshingInsights}
                  theme={activeTheme}
                />
              )}

              {activeTab === 'profile' && (
                <UserProfileSection
                  userProfile={userProfile}
                  onUpdateProfile={setUserProfile}
                  tasks={tasks}
                  goals={goals}
                  themeKey={themeKey}
                  onChangeTheme={setThemeKey}
                  activeTheme={activeTheme}
                />
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Humble outer credits */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <p>© 2026 WinWise. Plan smarter, win smarter.</p>
      </footer>

    </div>
  );
}
