export const SOCKET_EVENTS = {
  // Room management
  PROJECT_JOIN: 'project:join',
  PROJECT_LEAVE: 'project:leave',
  PROJECT_ERROR: 'project:error',

  // Presence
  PRESENCE_JOINED: 'presence:joined',
  PRESENCE_LEFT: 'presence:left',
  PRESENCE_LIST: 'presence:list',

  // Collaboration
  CURSOR_MOVE: 'cursor:move',
  CURSOR_UPDATE: 'cursor:update',
  PROJECT_CHANGED: 'project:changed',
  PROJECT_REMOTE_CHANGE: 'project:remote_change',

  // Univer realtime
  UNIVER_CELL_CHANGE: 'univer:cell_change',
  UNIVER_REMOTE_CELL: 'univer:remote_cell',
  UNIVER_CURSOR: 'univer:cursor',
  UNIVER_REMOTE_CURSOR: 'univer:remote_cursor',
  UNIVER_SNAPSHOT_SAVE: 'univer:snapshot_save',
  UNIVER_SNAPSHOT_ACK: 'univer:snapshot_ack',

  // Notifications
  NOTIFICATION_UNREAD_COUNT: 'notification:unread_count',
} as const
