import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase.js';

// ===== Storage Helpers =====

const DEFAULT_FREE_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

const KEYS = {
  USERS: 'app_users',
  PROMPTS: 'app_prompt_templates',
  CURRENT_USER: 'app_current_user',
  USER_SETTINGS: 'app_user_settings_',
  HISTORY: 'app_generation_history',
};

const COLLECTIONS = {
  USERS: 'users',
  PROMPTS: 'promptTemplates',
  SETTINGS: 'userSettings',
  USAGE: 'usageLogs',
  HISTORY: 'generationHistory',
};

const DEFAULT_PROMPT_VERSION = 2;
const ADMIN_SHARED_KEY_USERNAME = 'admin';

const LOCAL_USAGE_KEY = 'app_usage_logs';

// ===== Default Data =====
const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
  { id: 2, username: 'user1', password: 'pass123', role: 'user', createdAt: new Date().toISOString() },
];

const DEFAULT_PROMPT_TEMPLATE = {
  id: 1,
  name: 'Storyboard Gem (Locked JSON)',
  description: 'Editable Gemini Gem-style instructions. JSON output schema is locked by the app.',
  isDefault: true,
  lockedJson: true,
  version: DEFAULT_PROMPT_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  template: `You are a production storyboard Gem for short-form viral content.

Goal:
- Create a storyboard for {{STYLE}} on {{PLATFORM}}
- Mood/tone: {{MOOD}}
- Total scenes: {{SCENE_COUNT}}
- Product or subject: {{PRODUCT}}

Creative rules:
1. Start with a strong hook that fits the platform.
2. Make the story flow logically from problem, desire, selling point, proof, and CTA.
3. Dialogue must sound natural and fit short-video pacing.
4. Action must clearly describe what appears on screen, including movement, expressions, props, and context.
5. image_prompt must be production-ready English for image generators: subject, composition, camera angle, lens, lighting, texture, mood, and background.
6. video_audio_prompt must be production-ready English for editors or video generators: camera movement, transition, pacing, sound design, voice tone, and music cues.
7. Keep claims credible. Do not invent proof that the user did not provide.

Language rules:
- dialogue, action, caption, and hashtags should match the user's product language.
- image_prompt and video_audio_prompt must be English.
- Do not explain your process. Do not output markdown. Do not output anything outside JSON.`,
};

// ===== Initialization =====
export async function initializeStorage() {
  if (isFirebaseEnabled) {
    await initializeFirestore();
    return;
  }

  initializeLocalStorage();
}

async function initializeFirestore() {
  const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  if (usersSnapshot.empty) {
    await Promise.all(DEFAULT_USERS.map(user => setDoc(doc(db, COLLECTIONS.USERS, String(user.id)), user)));
  }

  const promptsSnapshot = await getDocs(collection(db, COLLECTIONS.PROMPTS));
  if (promptsSnapshot.empty) {
    await setDoc(doc(db, COLLECTIONS.PROMPTS, String(DEFAULT_PROMPT_TEMPLATE.id)), DEFAULT_PROMPT_TEMPLATE);
    return;
  }

  await migrateDefaultPromptTemplate();
}

function initializeLocalStorage() {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }

  if (!localStorage.getItem(KEYS.PROMPTS)) {
    localStorage.setItem(KEYS.PROMPTS, JSON.stringify([DEFAULT_PROMPT_TEMPLATE]));
    return;
  }

  migrateDefaultPromptTemplate();
}

async function migrateDefaultPromptTemplate() {
  const templates = await getPromptTemplates();
  const defaultIndex = templates.findIndex(t => t.id === DEFAULT_PROMPT_TEMPLATE.id || t.isDefault);

  if (defaultIndex === -1) {
    await savePromptTemplates([DEFAULT_PROMPT_TEMPLATE, ...templates]);
    return;
  }

  const current = templates[defaultIndex];
  if (current.version === DEFAULT_PROMPT_VERSION && current.lockedJson) return;

  const updated = {
    ...current,
    ...DEFAULT_PROMPT_TEMPLATE,
    id: current.id || DEFAULT_PROMPT_TEMPLATE.id,
    isDefault: true,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.PROMPTS, String(updated.id)), updated);
    return;
  }

  templates[defaultIndex] = updated;
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(templates));
}

// ===== User CRUD =====
export async function getUsers() {
  if (isFirebaseEnabled) {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.USERS), orderBy('id')));
    return snapshot.docs.map(item => item.data());
  }

  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
}

export async function findUser(username, password) {
  const users = await getUsers();
  return users.find(u => u.username === username && u.password === password);
}

export async function addUser(userData) {
  const users = await getUsers();
  const maxId = users.reduce((max, u) => Math.max(max, u.id), 0);
  const newUser = {
    id: maxId + 1,
    ...userData,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.USERS, String(newUser.id)), newUser);
    return newUser;
  }

  users.push(newUser);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  return newUser;
}

export async function updateUser(id, updates) {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;

  const updated = { ...users[idx], ...updates };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.USERS, String(id)), updated);
    return updated;
  }

  users[idx] = updated;
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  return updated;
}

export async function deleteUser(id) {
  if (isFirebaseEnabled) {
    await deleteDoc(doc(db, COLLECTIONS.USERS, String(id)));
    return;
  }

  let users = await getUsers();
  users = users.filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

// ===== Prompt Templates CRUD =====
export async function getPromptTemplates() {
  if (isFirebaseEnabled) {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.PROMPTS), orderBy('id')));
    return snapshot.docs.map(item => item.data());
  }

  return JSON.parse(localStorage.getItem(KEYS.PROMPTS) || '[]');
}

export async function getPromptTemplate(id) {
  const templates = await getPromptTemplates();
  return templates.find(p => p.id === id);
}

export async function addPromptTemplate(data) {
  const templates = await getPromptTemplates();
  const maxId = templates.reduce((max, t) => Math.max(max, t.id), 0);
  const newTemplate = {
    id: maxId + 1,
    ...data,
    isDefault: false,
    lockedJson: true,
    version: DEFAULT_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.PROMPTS, String(newTemplate.id)), newTemplate);
    return newTemplate;
  }

  templates.push(newTemplate);
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(templates));
  return newTemplate;
}

export async function updatePromptTemplate(id, updates) {
  const templates = await getPromptTemplates();
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return null;

  const updated = {
    ...templates[idx],
    ...updates,
    lockedJson: true,
    version: DEFAULT_PROMPT_VERSION,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.PROMPTS, String(id)), updated);
    return updated;
  }

  templates[idx] = updated;
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(templates));
  return updated;
}

export async function deletePromptTemplate(id) {
  if (isFirebaseEnabled) {
    await deleteDoc(doc(db, COLLECTIONS.PROMPTS, String(id)));
    return;
  }

  let templates = await getPromptTemplates();
  templates = templates.filter(t => t.id !== id);
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(templates));
}

export async function seedDefaultPromptTemplate() {
  const templates = await getPromptTemplates();
  const existing = templates.find(t => t.id === DEFAULT_PROMPT_TEMPLATE.id || t.isDefault);
  const seededTemplate = {
    ...DEFAULT_PROMPT_TEMPLATE,
    createdAt: existing?.createdAt || DEFAULT_PROMPT_TEMPLATE.createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.PROMPTS, String(seededTemplate.id)), seededTemplate);
    return seededTemplate;
  }

  const nextTemplates = existing
    ? templates.map(t => (t.id === existing.id ? seededTemplate : t))
    : [seededTemplate, ...templates];
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(nextTemplates));
  return seededTemplate;
}

async function savePromptTemplates(templates) {
  if (isFirebaseEnabled) {
    await Promise.all(templates.map(template => setDoc(doc(db, COLLECTIONS.PROMPTS, String(template.id)), template)));
    return;
  }

  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(templates));
}

// ===== User Settings =====
export async function getUserSettings(username) {
  const defaults = {
    apiKey: '',
    selectedModel: DEFAULT_FREE_MODEL,
    sharedUserModel: DEFAULT_FREE_MODEL,
    theme: 'dark',
    selectedTemplateId: 1,
    generationCount: 0,
  };

  if (isFirebaseEnabled) {
    const snapshot = await getDoc(doc(db, COLLECTIONS.SETTINGS, username));
    return { ...defaults, ...(snapshot.exists() ? snapshot.data() : {}) };
  }

  const key = KEYS.USER_SETTINGS + username;
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  return { ...defaults, ...saved };
}

export async function saveUserSettings(username, settings) {
  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, username), settings);
    return;
  }

  const key = KEYS.USER_SETTINGS + username;
  localStorage.setItem(key, JSON.stringify(settings));
}

export async function getEffectiveApiKey(username, selectedModel) {
  const config = await getEffectiveApiConfig(username, selectedModel);
  return { apiKey: config.apiKey, source: config.source };
}

export async function getEffectiveApiConfig(username, selectedModel) {
  const userSettings = await getUserSettings(username);
  const userKey = String(userSettings.apiKey || '').trim();
  if (userKey) {
    return {
      apiKey: userKey,
      source: 'user',
      selectedModel: selectedModel || userSettings.selectedModel,
      canChangeModel: true,
    };
  }

  const adminSettings = await getUserSettings(ADMIN_SHARED_KEY_USERNAME);
  const adminKey = String(adminSettings.apiKey || '').trim();
  if (adminKey) {
    return {
      apiKey: adminKey,
      source: 'admin-shared',
      selectedModel: adminSettings.sharedUserModel || DEFAULT_FREE_MODEL,
      canChangeModel: false,
    };
  }

  return {
    apiKey: '',
    source: 'missing',
    selectedModel: adminSettings.sharedUserModel || DEFAULT_FREE_MODEL,
    canChangeModel: false,
  };
}

// ===== Usage Tracking =====
export async function recordUsageLog(data) {
  const usage = data.usage || {};
  const log = {
    id: data.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: data.username,
    action: data.action || 'generate',
    requestedModel: data.requestedModel || '',
    usedModel: data.usedModel || data.requestedModel || '',
    apiKeySource: data.apiKeySource || 'unknown',
    promptTokens: Number(usage.promptTokens || 0),
    completionTokens: Number(usage.completionTokens || 0),
    totalTokens: Number(usage.totalTokens || 0),
    sceneCount: Number(data.sceneCount || 0),
    product: data.product || '',
    fallbackModels: data.fallbackModels || [],
    createdAt: data.createdAt || new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await addDoc(collection(db, COLLECTIONS.USAGE), log);
    return log;
  }

  const logs = JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) || '[]');
  logs.unshift(log);
  localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(logs));
  return log;
}

export async function getUsageLogs() {
  if (isFirebaseEnabled) {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.USAGE), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  }

  return JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) || '[]')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getUsageSummary() {
  const logs = await getUsageLogs();
  const byUser = logs.reduce((acc, log) => {
    const username = log.username || 'unknown';
    if (!acc[username]) {
      acc[username] = {
        username,
        runs: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        lastUsedAt: '',
      };
    }

    acc[username].runs += 1;
    acc[username].promptTokens += Number(log.promptTokens || 0);
    acc[username].completionTokens += Number(log.completionTokens || 0);
    acc[username].totalTokens += Number(log.totalTokens || 0);
    if (!acc[username].lastUsedAt || String(log.createdAt) > String(acc[username].lastUsedAt)) {
      acc[username].lastUsedAt = log.createdAt;
    }
    return acc;
  }, {});

  return {
    logs,
    users: Object.values(byUser).sort((a, b) => b.totalTokens - a.totalTokens),
    totals: {
      runs: logs.length,
      promptTokens: logs.reduce((sum, log) => sum + Number(log.promptTokens || 0), 0),
      completionTokens: logs.reduce((sum, log) => sum + Number(log.completionTokens || 0), 0),
      totalTokens: logs.reduce((sum, log) => sum + Number(log.totalTokens || 0), 0),
    },
  };
}

// ===== Generated History =====
export async function saveGeneratedHistory(data) {
  const historyItem = {
    id: data.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    username: data.username,
    title: data.title || data.input?.product || data.result?.product_name || 'Untitled storyboard',
    action: data.action || 'generate',
    input: data.input || {},
    result: data.result || {},
    usage: data.usage || {},
    createdAt: data.createdAt || new Date().toISOString(),
  };

  if (isFirebaseEnabled) {
    await setDoc(doc(db, COLLECTIONS.HISTORY, historyItem.id), historyItem);
    return historyItem;
  }

  const items = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
  items.unshift(historyItem);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(items.slice(0, 100)));
  return historyItem;
}

export async function getUserGeneratedHistory(username) {
  if (isFirebaseEnabled) {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.HISTORY), orderBy('createdAt', 'desc')));
    return snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.username === username);
  }

  return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]')
    .filter(item => item.username === username)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function deleteGeneratedHistory(id) {
  if (isFirebaseEnabled) {
    await deleteDoc(doc(db, COLLECTIONS.HISTORY, id));
    return;
  }

  const items = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]')
    .filter(item => item.id !== id);
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(items));
}

// ===== Session =====
export function saveSession(user) {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export function getSession() {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function clearSession() {
  localStorage.removeItem(KEYS.CURRENT_USER);
}
