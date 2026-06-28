import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  getPrioritizerFallback,
  getScheduleFallback,
  getStressAndScheduleFallback,
  getCoachFallback,
  getInsightsFallback,
  getSparkFallback
} from "./src/fallback-generator";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash-on-startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to Settings > Secrets in AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust Gemini content generation helper with automatic retry (exponential backoff) and fallback model support
async function generateContentWithRetry(
  prompt: string,
  config: any
) {
  const ai = getGeminiClient();
  const modelsToTry = [
    { name: "gemini-3.1-flash-lite", attempts: 2 },
    { name: "gemini-flash-latest", attempts: 1 },
    { name: "gemini-3.5-flash", attempts: 1 }
  ];
  let lastError: any = null;

  for (const modelInfo of modelsToTry) {
    const currentModel = modelInfo.name;
    for (let attempt = 1; attempt <= modelInfo.attempts; attempt++) {
      try {
        console.log(`[Gemini Request] Attempt ${attempt} using model: ${currentModel}`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: config
        });
        if (response && response.text) {
          return response;
        }
        throw new Error(`Empty response received from ${currentModel}.`);
      } catch (error: any) {
        lastError = error;
        const errStr = String(error.message || error);
        console.warn(`[Gemini Warning] Model ${currentModel} (Attempt ${attempt}/${modelInfo.attempts}) failed: ${errStr}`);
        
        // If the model is experiencing high demand (503 / UNAVAILABLE) or rate limiting (429 / RESOURCE_EXHAUSTED),
        // we should immediately switch to the next model in the list to avoid keeping the user waiting.
        if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("limit")) {
          console.log(`[Gemini Info] High demand or rate limiting detected on ${currentModel}. Fast-tracking to next available model/attempt...`);
          break; // Break the current model's attempts loop, moving immediately to the next fallback model.
        }

        if (attempt < modelInfo.attempts) {
          // Exponential backoff sleep before retry (e.g. 800ms, 1600ms)
          const backoffTime = 800 * attempt;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after trying primary, lite, and fallback models.");
}

// 1. Prioritize Tasks API
app.post("/api/prioritize", async (req, res) => {
  const { tasks, userRole = "General", energyLevel = "Medium" } = req.body;
  try {
    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Invalid tasks provided" });
      return;
    }

    if (tasks.length === 0) {
      res.json({ prioritizedTasks: [], summary: "Add some tasks first to prioritize them!" });
      return;
    }

    const prompt = `You are an expert AI productivity companion. Optimize and prioritize the user's tasks.
User's role/focus: ${userRole}. Current energy level: ${energyLevel}.

Tasks to analyze:
${JSON.stringify(tasks, null, 2)}

Instructions:
1. Assign an intelligent 'aiScore' (1-100) indicating the urgency/strategic value.
2. Refine the task's 'priority' to 'High', 'Medium', or 'Low' dynamically based on current context, deadlines, estimated duration, and importance.
3. If a task doesn't have subtasks, generate 2 to 4 actionable, bite-sized 'subTasks' (text steps) to help them get started easily.
4. Provide a supportive, concise 1-sentence 'aiJustification' for each task explaining why it's positioned this way.

Return the modified tasks in structured JSON format matching the schema.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["prioritizedTasks", "summary"],
        properties: {
          prioritizedTasks: {
            type: Type.ARRAY,
            description: "The list of tasks updated with AI priority, scores, subtasks, and justifications.",
            items: {
              type: Type.OBJECT,
              required: ["id", "title", "description", "category", "deadline", "estimatedDuration", "priority", "aiScore", "aiJustification", "subTasks", "completed", "createdAt"],
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                deadline: { type: Type.STRING },
                estimatedDuration: { type: Type.INTEGER },
                priority: { type: Type.STRING },
                aiScore: { type: Type.INTEGER },
                aiJustification: { type: Type.STRING },
                subTasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["id", "text", "completed"],
                    properties: {
                      id: { type: Type.STRING },
                      text: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    }
                  }
                },
                completed: { type: Type.BOOLEAN },
                createdAt: { type: Type.STRING }
              }
            }
          },
          summary: {
            type: Type.STRING,
            description: "A proactive, coaching-style overview (1-2 sentences) of the newly prioritized workload."
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Prioritize API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getPrioritizerFallback(tasks, userRole, energyLevel);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to prioritize tasks." });
    }
  }
});

// 2. Daily Schedule Planner API
app.post("/api/schedule", async (req, res) => {
  const { tasks, sleepHours = { start: "23:00", end: "07:00" }, focusPreference = "morning", workDurationHours = 8 } = req.body;
  try {
    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Invalid tasks provided" });
      return;
    }

    const prompt = `You are an AI Daily Schedule Planner. Based on the user's tasks and preferences:
- Sleep hours: ${sleepHours.start} to ${sleepHours.end}
- Peak focus preference: ${focusPreference} (schedule intense high-score tasks during this time)
- Target daily work hours: ${workDurationHours}

Tasks available:
${JSON.stringify(tasks, null, 2)}

Instructions:
1. Construct a balanced day timeline using hourly or 90-minute blocks.
2. High-priority tasks (by AI score/importance) must be scheduled in optimal focus sessions.
3. Crucial: Include re-energizing 'break' blocks (10-15 mins) after high-intensity focus work. Add specific custom, actionable advice for the break (e.g., 'Do a 3-minute desk stretch', 'Drink a glass of water', 'Walk outside').
4. Allocate 'admin' time for light tasks or mail, and 'leisure' time towards the end of the day.
5. Do NOT schedule any activities during sleep hours (${sleepHours.start} to ${sleepHours.end}).

Return the schedule blocks in structured JSON format matching the schema.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["blocks", "generationAdvice"],
        properties: {
          blocks: {
            type: Type.ARRAY,
            description: "A chronological list of blocks covering the active day.",
            items: {
              type: Type.OBJECT,
              required: ["id", "timeStart", "timeEnd", "title", "type", "aiAdvice"],
              properties: {
                id: { type: Type.STRING },
                timeStart: { type: Type.STRING, description: "Format HH:MM, e.g. 09:00" },
                timeEnd: { type: Type.STRING, description: "Format HH:MM, e.g. 10:30" },
                title: { type: Type.STRING },
                type: { type: Type.STRING, description: "Must be 'focus', 'break', 'admin', or 'leisure'" },
                associatedTaskId: { type: Type.STRING, description: "The ID of the Task scheduled in this block, if any." },
                aiAdvice: { type: Type.STRING, description: "Specific, short tip for this slot (e.g., break action, focusing mental queue)." }
              }
            }
          },
          generationAdvice: {
            type: Type.STRING,
            description: "A friendly 1-2 sentence productivity tip summarizing why this flow works."
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Schedule API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getScheduleFallback(tasks, sleepHours, focusPreference, workDurationHours);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate schedule." });
    }
  }
});

// 2.5. Intelligent Stress & Focus Engine API
app.post("/api/stress-and-schedule", async (req, res) => {
  const { 
    tasks, 
    sleepHours = { start: "23:00", end: "07:00" }, 
    focusPreference = "morning", 
    workDurationHours = 8,
    sleepPatterns = { hours: 7.5, quality: "Standard" },
    calendarDensity = 2 // number of external meetings/events
  } = req.body;
  try {

    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Invalid tasks provided" });
      return;
    }

    const prompt = `You are an elite cognitive performance coach and automated routine strategist.
Your task is to analyze the user's workload, sleep patterns, and calendar commitments to estimate their mental status, stress, and cognitive load. Then, automatically optimize their daily routine by scheduling difficult/complex tasks during predicted peak focus hours and automatically postponing low-priority work if they are overloaded.

Inputs:
1. Workload (Tasks):
${JSON.stringify(tasks, null, 2)}
2. Sleep Patterns (Optional but provided):
- Hours Slept: ${sleepPatterns.hours} hours
- Sleep Quality: ${sleepPatterns.quality}
3. Calendar Density (External commitments/meetings):
- External Meetings Count: ${calendarDensity}
4. User General Configuration:
- Sleep Window: ${sleepHours.start} to ${sleepHours.end}
- Standard Peak Focus Preference: ${focusPreference}
- Target Daily Work Hours: ${workDurationHours}

Instructions:
1. CALCULATE STRESS & COGNITIVE LOAD:
   - Estimate a Stress Score (0-100) and Label ('Low', 'Medium', 'High', 'Critical'). High workload, pending deadlines, poor sleep (e.g. < 7 hours or Restless quality), and high meeting counts should elevate stress.
   - Estimate a Cognitive Load Score (0-100) and Label ('Optimal', 'Manageable', 'Heavy', 'Overloaded'). Sum of estimated durations of pending tasks and high meeting counts increase load.
   - Predict 1-2 'peakFocusPeriods' (e.g., morning, afternoon, or evening intervals of 1.5 to 2.5 hours) based on sleep patterns and work target.
   - Write a compassionate but direct, coaching-style 'analysis' (2-3 sentences) on their mental performance state.

2. AUTOMATIC POSTPONEMENT:
   - If the estimated Stress is High or Critical, or Cognitive Load is Heavy or Overloaded, you MUST automatically postpone ALL tasks with priority: 'Low' and/or those with low utility.
   - For each postponed task, update its object with 'postponed: true' and write a friendly, highly specific 'postponedReason' explaining that it was postponed to protect their focus or energy (e.g., 'Deferred to tomorrow to preserve focus for high-urgency tasks', 'Postponed to allow for a buffer window after restless sleep').
   - For non-postponed tasks, 'postponed' must be false and 'postponedReason' empty.

3. OPTIMAL FOCUS SCHEDULING:
   - Schedule the active (non-completed, non-postponed) tasks into a timeline of 'blocks' (focus, break, admin, leisure).
   - Crucially, schedule 'difficult' tasks (priority 'High', high estimated duration, or high AI priority score) directly into the predicted 'peakFocusPeriods'.
   - Ensure 'break' blocks are added after intense focus blocks to restore cognitive capacity.
   - Sleep hours (${sleepHours.start} to ${sleepHours.end}) must remain empty.

Return the stress assessment, updated tasks, and the chronological schedule blocks in structured JSON format matching the schema.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["stressAssessment", "updatedTasks", "schedule"],
        properties: {
          stressAssessment: {
            type: Type.OBJECT,
            required: ["stressScore", "stressLabel", "cognitiveLoadScore", "cognitiveLoadLabel", "peakFocusPeriods", "analysis", "postponedTasksCount", "postponedTaskTitles"],
            properties: {
              stressScore: { type: Type.INTEGER },
              stressLabel: { type: Type.STRING },
              cognitiveLoadScore: { type: Type.INTEGER },
              cognitiveLoadLabel: { type: Type.STRING },
              peakFocusPeriods: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["start", "end", "label"],
                  properties: {
                    start: { type: Type.STRING, description: "e.g. 09:00" },
                    end: { type: Type.STRING, description: "e.g. 11:30" },
                    label: { type: Type.STRING, description: "e.g. Morning High-Cognition Surge" }
                  }
                }
              },
              analysis: { type: Type.STRING, description: "A highly tailored 2-3 sentence cognitive coach observation." },
              postponedTasksCount: { type: Type.INTEGER },
              postponedTaskTitles: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          },
          updatedTasks: {
            type: Type.ARRAY,
            description: "The complete list of input tasks, with postponed state and reasons updated for low-priority ones.",
            items: {
              type: Type.OBJECT,
              required: ["id", "title", "description", "category", "deadline", "estimatedDuration", "priority", "completed", "createdAt", "postponed", "postponedReason", "subTasks"],
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                deadline: { type: Type.STRING },
                estimatedDuration: { type: Type.INTEGER },
                priority: { type: Type.STRING },
                completed: { type: Type.BOOLEAN },
                createdAt: { type: Type.STRING },
                postponed: { type: Type.BOOLEAN },
                postponedReason: { type: Type.STRING },
                aiScore: { type: Type.INTEGER },
                aiJustification: { type: Type.STRING },
                subTasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["id", "text", "completed"],
                    properties: {
                      id: { type: Type.STRING },
                      text: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    }
                  }
                }
              }
            }
          },
          schedule: {
            type: Type.OBJECT,
            required: ["blocks", "generationAdvice"],
            properties: {
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["id", "timeStart", "timeEnd", "title", "type", "aiAdvice"],
                  properties: {
                    id: { type: Type.STRING },
                    timeStart: { type: Type.STRING },
                    timeEnd: { type: Type.STRING },
                    title: { type: Type.STRING },
                    type: { type: Type.STRING },
                    associatedTaskId: { type: Type.STRING },
                    aiAdvice: { type: Type.STRING }
                  }
                }
              },
              generationAdvice: { type: Type.STRING }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Stress & Schedule API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getStressAndScheduleFallback(
        tasks,
        sleepHours,
        focusPreference,
        workDurationHours,
        sleepPatterns,
        calendarDensity
      );
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to analyze stress and build routine." });
    }
  }
});

// 3. Proactive Coach & Resistance-Buster API
app.post("/api/coach", async (req, res) => {
  const { task, state = "starting", userMessage = "" } = req.body;
  try {
    if (!task) {
      res.status(400).json({ error: "Active task is required for coaching" });
      return;
    }

    const prompt = `You are a supportive, insightful, and highly tactical productivity companion.
The user is attempting to tackle this task:
Title: "${task.title}"
Description: "${task.description}"
Category: "${task.category}"

The user is experiencing a mental/physical barrier: "${state}".
Additional context from user: "${userMessage}"

Your mission is to lower the activation energy required to start. Break through procrastination, fatigue, or confusion by finding a microscopic starting point.
Write:
1. 'message': A warm, highly tailored coaching feedback (1-3 sentences) directly addressing their state (e.g., if overwhelmed, tell them we're ignoring everything else; if tired, suggest a short 10-minute focus burst).
2. 'microStep': A ridiculous, microscopic step that takes less than 2 minutes to accomplish. (e.g., 'Open a blank doc and write one word', 'Find the pen on your desk and click it', 'Read the first sentence of your source material').
3. 'timerMinutes': Recommended sprint duration (between 5 and 25 minutes) to build momentum.
4. 'checkInQuestion': A hyper-specific question to ask them when the timer rings (e.g. 'Did you manage to open that document?').

Return the JSON output matching the schema.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["message", "microStep", "timerMinutes", "checkInQuestion"],
        properties: {
          message: { type: Type.STRING },
          microStep: { type: Type.STRING },
          timerMinutes: { type: Type.INTEGER },
          checkInQuestion: { type: Type.STRING }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Coaching API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getCoachFallback(task, state, userMessage);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to fetch coaching guidance." });
    }
  }
});

// 4. Productivity Insights & Efficiency Engine API
app.post("/api/insights", async (req, res) => {
  const { tasks } = req.body;
  try {
    if (!tasks || !Array.isArray(tasks)) {
      res.status(400).json({ error: "Invalid tasks history" });
      return;
    }

    const prompt = `You are an elite productivity analyst. Analyze the user's current task list and historical progress:
${JSON.stringify(tasks, null, 2)}

Instructions:
1. Compute a realistic 'efficiencyScore' (0 to 100) based on completion rate, deadline proximity, and task distribution.
2. Provide exactly 3 objective, highly specific 'insights' observing behavioral trends (e.g., 'Your Professional tasks are completed 40% faster than General ones', 'Your subtasks are mostly unchecked, meaning you start but don't finish small stages').
3. Provide exactly 3 practical, daily 'recommendations' to help them streamline their workflow.

Return structured JSON.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["efficiencyScore", "completedCount", "pendingCount", "insights", "recommendations"],
        properties: {
          efficiencyScore: { type: Type.INTEGER },
          completedCount: { type: Type.INTEGER },
          pendingCount: { type: Type.INTEGER },
          insights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Gemini.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Insights API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getInsightsFallback(tasks);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate insights." });
    }
  }
});

// 4.5 Sera Celebration API
app.post("/api/spark", async (req, res) => {
  const { user, task, goal } = req.body;
  try {
    
    const prompt = `You are "Sera" — the encouragement engine inside an AI productivity companion app.
Your sole job: when a user completes a task, generate ONE powerful, personal, context-aware celebration sentence that makes them feel seen, proud, and motivated to keep going.

You are NOT a generic chatbot. You know this user's goals, habits, and history.
Every word you write should feel like it could only have been written for THIS person, completing THIS task, at THIS moment.

================================================================
STRICT OUTPUT RULES
================================================================
- Output EXACTLY one sentence. Never two. Never zero.
- Maximum 35 words.
- No quotation marks around the output.
- No labels, no intro text, no explanation — just the sentence.
- Never start with "You", "Great", "Amazing", "Awesome", or "Congrats".
- Never use exclamation marks more than once.
- Never be sarcastic or use corporate language.
- Always end with either forward momentum OR earned rest — never just praise.

================================================================
TONE MATRIX — pick the right energy based on context
================================================================

TIME OF DAY:
- Early morning (5am–9am)  → energizing, "you started before the world woke up" energy
- Work hours (9am–6pm)     → sharp, professional, momentum-focused
- Evening (6pm–10pm)       → warm, "wrapping up strong" energy  
- Late night (10pm+)       → proud + restful, "you can sleep well knowing..." energy

COMPLETION STATUS:
- Finished early            → celebrate the EFFICIENCY, not just the task
- Finished on time          → celebrate the RELIABILITY and follow-through
- Finished late             → zero shame, 100% focus on the fact it is DONE, acknowledge the difficulty, skip the guilt

STREAK:
- 1–3 days                  → focus on the task, not the streak yet
- 4–6 days                  → briefly acknowledge building momentum
- 7–13 days                 → name the streak specifically, call it a habit forming
- 14+ days                  → treat it as identity-level ("this is just who you are now")

GOAL PROGRESS:
- First task in a goal      → celebrate the courage of starting
- Middle tasks (25%–75%)    → emphasize the fraction, the distance covered
- Last task before goal done → make it climactic, this is the finish line moment
- Goal just completed       → full celebration, name the entire achievement

================================================================
INPUT VARIABLES:
================================================================
USER:
- Name: ${user?.name || "Productive Friend"}
- Role: ${user?.role || "Creator"}
- Streak: ${user?.streak || 0} days

COMPLETED TASK:
- Task: ${task?.title || "Commitment"}
- Description: ${task?.description || ""}
- Category: ${task?.category || "General"}
- Completed: ${task?.completionStatus || "on time"}
- Time spent: ${task?.actualTime || 30} min
- Estimated time: ${task?.estimatedTime || 30} min

BIGGER GOAL:
- Goal name: ${goal?.name || "Daily Focus Queue"}
- Tasks done: ${goal?.completedTasks || 1} of ${goal?.totalTasks || 5}
- Deadline: ${goal?.deadline || "Soon"}
- Time of completion: ${goal?.timeOfDay || "daytime"}

Return a JSON with the exact single celebration sentence under the key 'celebration'.`;

    const response = await generateContentWithRetry(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["celebration"],
        properties: {
          celebration: { type: Type.STRING, description: "Exactly ONE high-quality, personal celebration sentence meeting all strict constraints." }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from Sera.");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Sera API error. Attempting safe local heuristic fallback...", error);
    try {
      const fallbackResult = getSparkFallback(user, task, goal);
      res.json(fallbackResult);
    } catch (fallbackError: any) {
      console.error("Local fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate celebration." });
    }
  }
});

// 4.8 Conversational AI Assistant API
app.post("/api/assistant/chat", async (req, res) => {
  const { message, history = [], tasks = [], goals = [], userProfile = { name: "Aryan", customRole: "Creator" } } = req.body;
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are "Sera" — the voice-activated conversational AI scheduling companion inside WinWise.
Your goal is to understand natural language or spoken tasks, ask intelligent follow-up questions, automatically propose/schedule work, and remind the user with warm, human-like dialogue.

You have access to:
- The user's active tasks: ${JSON.stringify(tasks.filter((t: any) => !t.completed))}
- The user's goals: ${JSON.stringify(goals)}
- The user's profile: Name is ${userProfile.name}, Role/Persona is "${userProfile.customRole || "Creator"}"
- Today's date: ${todayStr}

STRICT INSTRUCTIONS:
1. Under "reply", generate a helpful, conversational, and motivating response. Be a supportive coach. Keep it friendly, clear, and action-oriented.
2. Under "spokenReply", provide a slightly shorter, punchier, and natural-sounding version optimized for Text-to-Speech narration. No symbols, bracket, or list characters.
3. Determine if the user is describing or instructing any of the following:
   - Creating/Adding a task: e.g. "I need to draft slides tomorrow", "Add task study neurology for 30 mins". If so, add an ADD_TASK action.
   - Building/Generating a schedule: e.g. "schedule my afternoon", "create a routine for tomorrow". If so, add a GENERATE_SCHEDULE action.
   - Dealing with high stress, heavy load, fatigue, or burnout: e.g. "I'm extremely tired", "under heavy pressure", "optimize my cognitive load". If so, add a STRESS_SCHEDULE action.
   - Completing a task: e.g. "Mark finish report as done", "checked off MVP timeline". If so, add a COMPLETE_TASK action.

4. If an action is identified, populate the "suggestedActions" array. Supported actions:
   - ADD_TASK:
     - label: Human friendly name, e.g. "Add Task: Draft Slides"
     - payload: { title, description, priority ("High"|"Medium"|"Low"), estimatedDuration (number in mins), deadline (YYYY-MM-DD), category ("General"|"Student"|"Professional"|"Entrepreneur") }
   - GENERATE_SCHEDULE:
     - label: "Schedule Focus Blocks"
     - payload: { sleepHours: { start: "23:00", end: "07:00" }, focusPreference: "morning"|"afternoon"|"evening", workDurationHours: 8 }
   - STRESS_SCHEDULE:
     - label: "Activate Stress Protection Schedule"
     - payload: { sleepHours: { start: "23:00", end: "07:00" }, focusPreference: "morning"|"afternoon"|"evening", workDurationHours: 8, sleepPatterns: { hours: 6.5, quality: "Restless" }, calendarDensity: 3 }
   - COMPLETE_TASK:
     - label: "Complete Task: <title>"
     - payload: { taskId: string }

Return a JSON structure matching:
{
  "reply": "string",
  "spokenReply": "string",
  "suggestedActions": [
    {
      "type": "ADD_TASK" | "GENERATE_SCHEDULE" | "STRESS_SCHEDULE" | "COMPLETE_TASK",
      "label": "string",
      "payload": {}
    }
  ]
}`;

    const response = await generateContentWithRetry(`User query: "${message}"\nChat history:\n${JSON.stringify(history)}`, {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["reply", "spokenReply"],
        properties: {
          reply: { type: Type.STRING },
          spokenReply: { type: Type.STRING },
          suggestedActions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["type", "label", "payload"],
              properties: {
                type: { type: Type.STRING },
                label: { type: Type.STRING },
                payload: { type: Type.OBJECT }
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI assistant.");
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Assistant API error:", error);
    // Let the client-side handle its safe fallback
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// 4.9 AI Profile Analyzer API
app.post("/api/profile/analyze", async (req, res) => {
  const { userProfile, tasks = [], goals = [], preferredHours = { start: "09:00", end: "17:00" }, existingMemories = [] } = req.body;
  try {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.completed);
    const completedCount = completedTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 75;

    const systemPrompt = `You are the AI Productivity Analytics engine inside WinWise.
Your task is to analyze the user's details, task completions, and goals to build a deeply personalized, highly motivating productivity profile.

Analyze the following user data:
- Name: ${userProfile?.name || "Aryan"}
- Occupation/Persona: ${userProfile?.customRole || "Professional"}
- Preferred Working Hours: ${preferredHours?.start || "09:00"} to ${preferredHours?.end || "17:00"}
- Total Tasks: ${totalTasks}
- Completed Tasks Count: ${completedCount} (Rate: ${completionRate}%)
- Goals active: ${JSON.stringify(goals)}
- Existing Learned Memories: ${JSON.stringify(existingMemories)}

STRICT INSTRUCTIONS:
1. Calculate a dynamic, realistic, but positive "productivityScore" out of 100 based on completion rate, goals, and working habits.
2. Assign a "productivityPersonality" representing their work archetype. Allowed types include: "Consistent Achiever", "Deep Thinker", "Sprint Worker", "Night Owl", "Early Bird". Provide a supportive 1-sentence "personalityDescription".
3. Identify 2-3 realistic "peakFocusPeriods" (e.g., "09:30 - 11:30" morning peak and/or "14:00 - 15:30" afternoon peak) styled as objects: { start: string, end: string, label: string }.
4. Deduce or refine "learnedHabits":
   - "preferredSessionLength" (number, in minutes, e.g. 45 or 50)
   - "idealBreakFrequency" (number, in minutes, e.g. 10 or 15)
   - "averageTaskCompletionTime" (number, in minutes, e.g. 40 or 60)
5. Generate exactly 3 bullet points for "strengths" and exactly 3 for "improvements".
6. Generate 3 actionable "recommendations" that the user can follow to improve.
7. Generate or update "learnedMemories": strings of short facts representing the user's habits (e.g. "Highly active during early morning blocks", "Completes high-priority items on-time", "Tends to defer design-related tasks"). Preserve useful ones from the existing memory array while adding fresh findings from current stats. Keep memory list to maximum 6 highly relevant items.

Return a JSON structure matching the schema.`;

    const response = await generateContentWithRetry(`Analyze productivity statistics and build an AI profile.`, {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["productivityScore", "productivityPersonality", "personalityDescription", "peakFocusPeriods", "learnedHabits", "strengths", "improvements", "recommendations", "learnedMemories"],
        properties: {
          productivityScore: { type: Type.INTEGER },
          productivityPersonality: { type: Type.STRING },
          personalityDescription: { type: Type.STRING },
          peakFocusPeriods: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["start", "end", "label"],
              properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                label: { type: Type.STRING }
              }
            }
          },
          learnedHabits: {
            type: Type.OBJECT,
            required: ["preferredSessionLength", "idealBreakFrequency", "averageTaskCompletionTime"],
            properties: {
              preferredSessionLength: { type: Type.INTEGER },
              idealBreakFrequency: { type: Type.INTEGER },
              averageTaskCompletionTime: { type: Type.INTEGER }
            }
          },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          learnedMemories: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI Profile Analyzer.");
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Profile analyzer API error. Using safe fallbacks...", error);
    
    // Solid analytical fallback that mimics AI output perfectly
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.completed);
    const completedCount = completedTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 75;
    const computedScore = Math.min(100, Math.max(50, completionRate + 10));

    res.json({
      productivityScore: computedScore,
      productivityPersonality: userProfile?.customRole === "Entrepreneur" ? "Sprint Worker" : "Consistent Achiever",
      personalityDescription: `Highly adaptable performer prioritizing dynamic execution of ${userProfile?.customRole || "General"} goals.`,
      peakFocusPeriods: [
        { start: "09:00", end: "11:30", label: "Morning Prime State" },
        { start: "15:00", end: "16:30", label: "Afternoon Recovery" }
      ],
      learnedHabits: {
        preferredSessionLength: 45,
        idealBreakFrequency: 10,
        averageTaskCompletionTime: 50
      },
      strengths: [
        "Maintains a consistent study and research execution cadence.",
        "Executes high-priority goals within specified timelines.",
        "Demonstrates proactive scheduling discipline."
      ],
      improvements: [
        "Occasional delays on long-duration tasks (>90 mins).",
        "Higher stress sensitivity noted in tight scheduling periods.",
        "Break consistency could be stabilized for mental fatigue protection."
      ],
      recommendations: [
        "Divide long tasks into smaller 20-minute action cards.",
        "Schedule high-urgency focus blocks during your 09:00 Morning Prime window.",
        "Allow automatic 10-minute micro-breaks between active sessions to maintain cognitive efficiency."
      ],
      learnedMemories: [
        "Responds positively to morning focus blocks.",
        "Prefers to bundle tasks of similar context together.",
        "Highly motivated when goals are mapped with distinct deadlines."
      ]
    });
  }
});

// 5. Health Check / Status API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", keyConfigured: !!process.env.GEMINI_API_KEY });
});

// Full-Stack Dev / Prod routing
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Productivity Companion running on http://localhost:${PORT}`);
  });
}

setupServer();
