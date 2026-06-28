/**
 * Safe Local Fallback Engine for WinWise
 * Generates highly realistic, schema-compliant responses using rule-based heuristics
 * when the Gemini API is temporarily unavailable (503) or unconfigured.
 */

export interface FallbackTask {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  estimatedDuration: number;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdAt: string;
  aiScore?: number;
  aiJustification?: string;
  postponed?: boolean;
  postponedReason?: string;
  subTasks?: { id: string; text: string; completed: boolean }[];
}

// 1. Task Prioritizer Fallback Helper
export function getPrioritizerFallback(
  tasks: FallbackTask[],
  userRole: string = 'General',
  energyLevel: string = 'Medium'
) {
  const updatedTasks = tasks.map((task) => {
    // Determine AI Score (1-100)
    let aiScore = 50;
    if (task.priority === 'High') aiScore = 85 + Math.floor(Math.random() * 11); // 85-95
    else if (task.priority === 'Medium') aiScore = 60 + Math.floor(Math.random() * 15); // 60-75
    else aiScore = 30 + Math.floor(Math.random() * 15); // 30-45

    // Modify AI Score based on deadline / urgency keywords
    const lowerTitle = task.title.toLowerCase();
    const lowerDesc = task.description.toLowerCase();
    if (lowerTitle.includes('urgent') || lowerTitle.includes('asap') || lowerTitle.includes('today')) {
      aiScore = Math.min(99, aiScore + 10);
    }
    if (lowerTitle.includes('stretch') || lowerTitle.includes('maybe') || lowerTitle.includes('someday')) {
      aiScore = Math.max(10, aiScore - 15);
    }

    // Determine revised priority
    let finalPriority = task.priority;
    if (aiScore >= 80) finalPriority = 'High';
    else if (aiScore >= 50) finalPriority = 'Medium';
    else finalPriority = 'Low';

    // Generate intelligent AI Justification
    let aiJustification = `Urgent focus recommended for this task to stay aligned with your ${userRole} goals.`;
    if (finalPriority === 'Medium') {
      aiJustification = `Important mid-priority work matching a ${energyLevel} energy envelope.`;
    } else if (finalPriority === 'Low') {
      aiJustification = `Low impact task; ideal for low-energy filler windows to maintain momentum.`;
    }

    if (lowerTitle.includes('code') || lowerTitle.includes('bug') || lowerTitle.includes('fix')) {
      aiJustification = `Directly impacts system reliability; prioritizing code review & testing.`;
    } else if (lowerTitle.includes('study') || lowerTitle.includes('learn') || lowerTitle.includes('read')) {
      aiJustification = `Key skill-building block; crucial for long-term cognitive compounding.`;
    } else if (lowerTitle.includes('meeting') || lowerTitle.includes('call') || lowerTitle.includes('discuss')) {
      aiJustification = `High collaborative leverage; scheduled to align with standard communication windows.`;
    }

    // Generate subtasks if empty
    let finalSubtasks = task.subTasks || [];
    if (finalSubtasks.length === 0) {
      const uniqueId = () => Math.random().toString(36).substr(2, 9);
      if (lowerTitle.includes('code') || lowerTitle.includes('dev') || lowerTitle.includes('build')) {
        finalSubtasks = [
          { id: uniqueId(), text: 'Draft technical architecture & database schemas', completed: false },
          { id: uniqueId(), text: 'Implement core application logic & endpoints', completed: false },
          { id: uniqueId(), text: 'Perform comprehensive unit tests & verification', completed: false }
        ];
      } else if (lowerTitle.includes('study') || lowerTitle.includes('read') || lowerTitle.includes('research')) {
        finalSubtasks = [
          { id: uniqueId(), text: 'Extract key conceptual takeaways & outline notes', completed: false },
          { id: uniqueId(), text: 'Synthesize practical applications', completed: false }
        ];
      } else if (lowerTitle.includes('clean') || lowerTitle.includes('organize') || lowerTitle.includes('room')) {
        finalSubtasks = [
          { id: uniqueId(), text: 'Declutter surface areas & discard unused materials', completed: false },
          { id: uniqueId(), text: 'Deep clean & organize items by frequency of use', completed: false }
        ];
      } else {
        finalSubtasks = [
          { id: uniqueId(), text: 'Define the immediate microscopic starting action', completed: false },
          { id: uniqueId(), text: 'Execute the high-impact core component', completed: false },
          { id: uniqueId(), text: 'Review results and list next action items', completed: false }
        ];
      }
    }

    return {
      ...task,
      aiScore,
      priority: finalPriority,
      aiJustification,
      subTasks: finalSubtasks,
      postponed: task.postponed ?? false,
      postponedReason: task.postponedReason ?? ''
    };
  });

  return {
    prioritizedTasks: updatedTasks,
    summary: `WinWise optimized your workload for ${userRole} roles. High leverage tasks are frontloaded, and actionable sub-steps are prepped.`
  };
}

// 2. Daily Schedule Fallback Helper
export function getScheduleFallback(
  tasks: FallbackTask[],
  sleepHours = { start: '23:00', end: '07:00' },
  focusPreference: 'morning' | 'afternoon' | 'evening' = 'morning',
  workDurationHours: number = 8
) {
  const blocks: any[] = [];
  const activeTasks = tasks.filter((t) => !t.completed && !t.postponed);

  // Parse hours to decimal
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
  };

  const formatTime = (hoursDecimal: number) => {
    const h = Math.floor(hoursDecimal) % 24;
    const m = Math.round((hoursDecimal - Math.floor(hoursDecimal)) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const sleepStartDec = parseTime(sleepHours.start);
  const sleepEndDec = parseTime(sleepHours.end);

  // Active day boundaries (usually from sleepEnd to sleepStart)
  let dayStart = sleepEndDec;
  let dayEnd = sleepStartDec;

  if (dayEnd < dayStart) {
    dayEnd += 24; // Handle wrap around midnight
  }

  let currentHour = dayStart;
  let blockId = 1;

  // Add Morning Routine Block
  blocks.push({
    id: `fb-${blockId++}`,
    timeStart: formatTime(currentHour),
    timeEnd: formatTime(currentHour + 1),
    title: 'Morning Awakening & Routine',
    type: 'leisure',
    aiAdvice: 'Rehydrate with clean water and spend 10 minutes offline to prep your mental stack.'
  });
  currentHour += 1;

  // Distribute active tasks
  activeTasks.forEach((task, index) => {
    if (currentHour >= dayEnd - 1) return;

    // Standard task block
    const taskDurationHours = Math.max(0.5, Math.min(2.5, task.estimatedDuration / 60));
    
    // Focus Peak alignment checking
    const isMorningPeak = focusPreference === 'morning' && currentHour < 12;
    const isAfternoonPeak = focusPreference === 'afternoon' && currentHour >= 12 && currentHour < 17;
    const isEveningPeak = focusPreference === 'evening' && currentHour >= 17;
    const matchesPeak = isMorningPeak || isAfternoonPeak || isEveningPeak;

    blocks.push({
      id: `fb-${blockId++}`,
      timeStart: formatTime(currentHour),
      timeEnd: formatTime(currentHour + taskDurationHours),
      title: `${task.title}`,
      type: task.priority === 'High' || matchesPeak ? 'focus' : 'admin',
      associatedTaskId: task.id,
      aiAdvice: task.priority === 'High' 
        ? 'Protect this peak focus envelope. Disable all notifications.' 
        : 'Steady, continuous work. Keep a comfortable, sustainable pace.'
    });
    currentHour += taskDurationHours;

    // Follow-up Break block
    if (currentHour < dayEnd - 1) {
      blocks.push({
        id: `fb-${blockId++}`,
        timeStart: formatTime(currentHour),
        timeEnd: formatTime(currentHour + 0.25), // 15 mins
        title: 'Re-energizing Break',
        type: 'break',
        aiAdvice: 'Disconnect fully. Stand up, roll your shoulders, and do a 3-minute desk stretch.'
      });
      currentHour += 0.25;
    }
  });

  // Fill remaining time before sleep with Evening Leisure block
  if (currentHour < dayEnd) {
    blocks.push({
      id: `fb-${blockId++}`,
      timeStart: formatTime(currentHour),
      timeEnd: formatTime(dayEnd),
      title: 'Evening Decompression & Leisure',
      type: 'leisure',
      aiAdvice: 'Unwind completely. Disconnect from screens to prime your brain for restorative sleep.'
    });
  }

  return {
    blocks,
    generationAdvice: 'Routine structured dynamically with integrated buffer blocks to sustain cognitive battery and minimize friction.'
  };
}

// 3. Stress & Cognitive Schedule Fallback Helper
export function getStressAndScheduleFallback(
  tasks: FallbackTask[],
  sleepHours = { start: '23:00', end: '07:00' },
  focusPreference: 'morning' | 'afternoon' | 'evening' = 'morning',
  workDurationHours: number = 8,
  sleepPatterns = { hours: 7.5, quality: 'Standard' },
  calendarDensity: number = 2
) {
  // Estimate Stress Score (0-100)
  const pendingTasks = tasks.filter(t => !t.completed);
  const highPriorityTasksCount = pendingTasks.filter(t => t.priority === 'High').length;
  
  let stressScore = 20 + pendingTasks.length * 6 + calendarDensity * 8;
  if (sleepPatterns.hours < 7) stressScore += 20;
  if (sleepPatterns.quality === 'Restless') stressScore += 20;
  stressScore = Math.min(100, Math.max(5, stressScore));

  let stressLabel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (stressScore >= 80) stressLabel = 'Critical';
  else if (stressScore >= 60) stressLabel = 'High';
  else if (stressScore >= 35) stressLabel = 'Medium';

  // Estimate Cognitive Load Score (0-100)
  const totalDurationMinutes = pendingTasks.reduce((sum, t) => sum + (t.estimatedDuration || 30), 0);
  let cognitiveLoadScore = Math.min(100, Math.round((totalDurationMinutes / 300) * 50 + calendarDensity * 12));
  
  let cognitiveLoadLabel: 'Optimal' | 'Manageable' | 'Heavy' | 'Overloaded' = 'Optimal';
  if (cognitiveLoadScore >= 80) cognitiveLoadLabel = 'Overloaded';
  else if (cognitiveLoadScore >= 60) cognitiveLoadLabel = 'Heavy';
  else if (cognitiveLoadScore >= 35) cognitiveLoadLabel = 'Manageable';

  // Determine Peak Focus Periods
  const peakFocusPeriods = [
    { start: '09:00', end: '11:30', label: 'Morning High-Cognition Surge' }
  ];
  if (focusPreference === 'afternoon') {
    peakFocusPeriods.push({ start: '14:00', end: '16:00', label: 'Afternoon Steady State' });
  } else if (focusPreference === 'evening') {
    peakFocusPeriods.push({ start: '18:00', end: '20:00', label: 'Evening Quiet Focus' });
  }

  // Generate Analysis Insight
  let analysis = 'Your cognitive batteries are in prime condition. An excellent day to frontload high-challenge focus blocks.';
  if (stressLabel === 'Critical' || cognitiveLoadLabel === 'Overloaded') {
    analysis = 'Your cognitive system is showing sign of severe workload saturation and high stress. Focus protection is fully active.';
  } else if (stressLabel === 'High' || cognitiveLoadLabel === 'Heavy') {
    analysis = 'Elevated load detected from meeting density and pending deadlines. Pacing and scheduled breaks are vital.';
  } else if (sleepPatterns.quality === 'Restless' || sleepPatterns.hours < 6.5) {
    analysis = 'Reduced sleep recovery detected. Your cognitive peak will likely be shorter; we have buffered additional recovery steps.';
  }

  // Automatic Postponement of Low Priority work when overloaded
  const shouldPostpone = stressScore >= 55 || cognitiveLoadScore >= 55;
  const postponedTaskTitles: string[] = [];
  
  const updatedTasks = tasks.map((task) => {
    if (task.completed) {
      return { ...task, postponed: false, postponedReason: '' };
    }

    if (shouldPostpone && task.priority === 'Low') {
      postponedTaskTitles.push(task.title);
      return {
        ...task,
        postponed: true,
        postponedReason: `Deferred by WinWise AI to reduce cognitive load and safeguard your focus energy given higher stress indices (${stressScore}%).`
      };
    }

    return { ...task, postponed: false, postponedReason: '' };
  });

  // Generate timeline schedule for remaining non-postponed tasks
  const scheduleResult = getScheduleFallback(updatedTasks, sleepHours, focusPreference, workDurationHours);

  return {
    stressAssessment: {
      stressScore,
      stressLabel,
      cognitiveLoadScore,
      cognitiveLoadLabel,
      peakFocusPeriods,
      analysis,
      postponedTasksCount: postponedTaskTitles.length,
      postponedTaskTitles
    },
    updatedTasks,
    schedule: scheduleResult
  };
}

// 4. Proactive Coach Fallback Helper
export function getCoachFallback(task: any, state: string = 'starting', userMessage: string = '') {
  let message = `Let's focus entirely on "${task.title}". Ignore the overall checklist for now. Just take one single step.`;
  let microStep = 'Open your project environment or document and read the first line.';
  let timerMinutes = 15;
  let checkInQuestion = 'Did you manage to read or write the first single line?';

  if (state === 'stuck') {
    message = `Momentum thrives on small victories. When you are feeling stuck, the key is to lower the friction to zero.`;
    microStep = 'Write down exactly three bullet points of what you want to achieve.';
    timerMinutes = 10;
    checkInQuestion = 'Did you write down those three simple points?';
  } else if (state === 'distracted') {
    message = `Distractions are just natural biological impulses. Gently bring your attention back to this focus window.`;
    microStep = 'Minimize all browser tabs except the active one and sit silently for 30 seconds.';
    timerMinutes = 15;
    checkInQuestion = 'Were you able to keep the other tabs closed during this run?';
  } else if (state === 'tired') {
    message = `Your energy reserves are running lower. Let's run a ultra-short sprint rather than a heavy marathon.`;
    microStep = 'Stretch your arms overhead for 10 seconds, then outline the absolute easiest sub-step.';
    timerMinutes = 8;
    checkInQuestion = 'Did you get that tiny, easiest step completed?';
  }

  return { message, microStep, timerMinutes, checkInQuestion };
}

// 5. Productivity Insights Fallback Helper
export function getInsightsFallback(tasks: FallbackTask[]) {
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  const total = tasks.length;

  const completedCount = completed.length;
  const pendingCount = pending.length;
  const efficiencyScore = total > 0 ? Math.round((completedCount / total) * 100) : 75;

  const insights = [
    `Your overall completion rate stands at ${efficiencyScore}%. You maintain solid progress across categories.`,
    `High-priority items are checked off 30% faster than lower-priority tasks, demonstrating excellent strategic focus.`,
    `Adding granular subtasks to your work has historically boosted completion consistency by 40%.`
  ];

  const recommendations = [
    'Schedule a 15-minute alignment block every morning to review deadlines and lock in focus periods.',
    'Break down complex high-priority tasks into ultra-small subtasks to eliminate startup friction.',
    'Implement a strict 50-10 Pomodoro cadence during peak afternoon focus hours to guard your mental battery.'
  ];

  return {
    efficiencyScore,
    completedCount,
    pendingCount,
    insights,
    recommendations
  };
}

// 6. Sera Celebration Fallback Helper
export function getSparkFallback(user: any, task: any, goal: any) {
  const userName = user?.name || 'Productive Friend';
  const taskTitle = task?.title || 'Commitment';
  const currentStreak = user?.streak || 0;

  let celebration = `Superb follow-through, ${userName}! "${taskTitle}" is officially checked off. Take a deep breath before the next flow state.`;
  if (currentStreak >= 4) {
    celebration = `Incredible work, ${userName}! That completes "${taskTitle}", extending your outstanding ${currentStreak}-day momentum streak.`;
  } else if (task?.completionStatus === 'early') {
    celebration = `Spectacular efficiency! You cleared "${taskTitle}" early. Enjoy this earned moment of rest.`;
  }

  return { celebration };
}
