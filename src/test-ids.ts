/**
 * Centralized testID constants for Detox E2E tests.
 *
 * Used as `testID` props on React Native components and matched
 * via `by.id()` in Detox tests.
 *
 * Naming convention: section.element.action
 */
export const TestIds = {
  // Auth
  LOGIN_SCREEN: 'login-screen',
  LOGIN_HUB_URL_INPUT: 'login-hub-url-input',
  LOGIN_CONNECT_BTN: 'login-connect-btn',
  LOGIN_NSEC_INPUT: 'login-nsec-input',
  LOGIN_IMPORT_BTN: 'login-import-btn',
  LOGIN_GENERATE_BTN: 'login-generate-btn',
  LOGIN_IMPORT_LINK: 'login-import-link',
  LOGIN_BACK_TO_PIN: 'login-back-to-pin',

  // Onboarding
  ONBOARDING_SCREEN: 'onboarding-screen',
  ONBOARDING_GENERATE_BTN: 'onboarding-generate-btn',
  ONBOARDING_NSEC_DISPLAY: 'onboarding-nsec-display',
  ONBOARDING_COPY_BTN: 'onboarding-copy-btn',
  ONBOARDING_CONFIRM_BACKUP_BTN: 'onboarding-confirm-backup-btn',
  ONBOARDING_CHANGE_PIN: 'onboarding-change-pin',

  // PIN
  PIN_INPUT: 'pin-input',
  PIN_DIGIT: 'pin-digit',
  PIN_ERROR: 'pin-error',

  // Dashboard
  DASHBOARD_SCREEN: 'dashboard-screen',
  DASHBOARD_HUB_NAME: 'dashboard-hub-name',
  DASHBOARD_SHIFT_STATUS: 'dashboard-shift-status',
  DASHBOARD_BREAK_BTN: 'dashboard-break-btn',
  DASHBOARD_CALLS_TODAY: 'dashboard-calls-today',
  DASHBOARD_VOLUNTEERS_STATUS: 'dashboard-volunteers-status',
  DASHBOARD_EMPTY_STATE: 'dashboard-empty-state',

  // Calls
  CALL_CARD: 'call-card',
  CALL_ANSWER_BTN: 'call-answer-btn',
  CALL_HANGUP_BTN: 'call-hangup-btn',
  CALL_SPAM_BTN: 'call-spam-btn',

  // Notes
  NOTES_SCREEN: 'notes-screen',
  NOTES_LIST: 'notes-list',
  NOTE_CARD: 'note-card',
  NOTE_NEW_BTN: 'note-new-btn',
  NOTE_CONTENT: 'note-content',
  NOTE_EMPTY_STATE: 'notes-empty-state',

  // Shifts
  SHIFTS_SCREEN: 'shifts-screen',
  SHIFTS_LIST: 'shifts-list',
  SHIFT_CARD: 'shift-card',
  SHIFT_SIGNUP_BTN: 'shift-signup-btn',
  SHIFT_DROP_BTN: 'shift-drop-btn',
  SHIFTS_EMPTY_STATE: 'shifts-empty-state',

  // Conversations
  CONVERSATIONS_SCREEN: 'conversations-screen',
  CONVERSATIONS_LIST: 'conversations-list',
  CONVERSATION_ROW: 'conversation-row',
  CONVERSATIONS_EMPTY_STATE: 'conversations-empty-state',

  // Settings
  SETTINGS_SCREEN: 'settings-screen',
  SETTINGS_THEME_LIGHT: 'settings-theme-light',
  SETTINGS_THEME_DARK: 'settings-theme-dark',
  SETTINGS_THEME_SYSTEM: 'settings-theme-system',
  SETTINGS_LANGUAGE_PICKER: 'settings-language-picker',
  SETTINGS_LOCK_BTN: 'settings-lock-btn',
  SETTINGS_WIPE_BTN: 'settings-wipe-btn',

  // Admin
  ADMIN_VOLUNTEERS_LIST: 'admin-volunteers-list',
  ADMIN_VOLUNTEER_ROW: 'admin-volunteer-row',
  ADMIN_BANS_LIST: 'admin-bans-list',
  ADMIN_AUDIT_LIST: 'admin-audit-list',
  ADMIN_SETTINGS_SCREEN: 'admin-settings-screen',

  // Navigation
  TAB_DASHBOARD: 'tab-dashboard',
  TAB_NOTES: 'tab-notes',
  TAB_SHIFTS: 'tab-shifts',
  TAB_CONVERSATIONS: 'tab-conversations',
  TAB_SETTINGS: 'tab-settings',

  // Generic
  LOADING_SKELETON: 'loading-skeleton',
  ERROR_BOUNDARY: 'error-boundary',
  OFFLINE_BANNER: 'offline-banner',
  RELAY_STATUS: 'relay-status',
} as const
