use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;

const HEARTBEAT_TIMEOUT_SECS: u64 = 15;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPresence {
    pub user_id: String,
    pub name: String,
    pub cursor: Option<CursorPosition>,
    pub viewport: Option<ViewportInfo>,
    #[serde(skip)]
    pub last_seen: Option<Instant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewportInfo {
    pub center_x: f64,
    pub center_y: f64,
    pub width: f64,
    pub height: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PresenceMessage {
    #[serde(rename = "cursor")]
    CursorUpdate { cursor: CursorPosition },
    #[serde(rename = "viewport")]
    ViewportUpdate { viewport: ViewportInfo },
    #[serde(rename = "join")]
    Join { user_id: String, name: String },
    #[serde(rename = "leave")]
    Leave { user_id: String },
    #[serde(rename = "state")]
    FullState { users: Vec<UserPresence> },
}

struct BoardPresence {
    users: DashMap<String, UserPresence>,
    tx: broadcast::Sender<String>,
}

pub struct PresenceManager {
    boards: DashMap<String, Arc<BoardPresence>>,
}

impl PresenceManager {
    pub fn new() -> Self {
        Self {
            boards: DashMap::new(),
        }
    }

    fn get_or_create_board(&self, board_id: &str) -> Arc<BoardPresence> {
        if let Some(board) = self.boards.get(board_id) {
            return Arc::clone(board.value());
        }

        let (tx, _) = broadcast::channel(512);
        let board = Arc::new(BoardPresence {
            users: DashMap::new(),
            tx,
        });

        self.boards
            .insert(board_id.to_string(), Arc::clone(&board));
        board
    }

    /// User joins a board — register presence and broadcast join event.
    pub fn join(&self, board_id: &str, user_id: &str, name: &str) {
        let board = self.get_or_create_board(board_id);

        let presence = UserPresence {
            user_id: user_id.to_string(),
            name: name.to_string(),
            cursor: None,
            viewport: None,
            last_seen: Some(Instant::now()),
        };

        board.users.insert(user_id.to_string(), presence);

        let msg = serde_json::to_string(&PresenceMessage::Join {
            user_id: user_id.to_string(),
            name: name.to_string(),
        })
        .unwrap_or_default();

        let _ = board.tx.send(msg);
    }

    /// User leaves a board — remove presence and broadcast leave event.
    pub fn leave(&self, board_id: &str, user_id: &str) {
        let board = self.get_or_create_board(board_id);
        board.users.remove(user_id);

        let msg = serde_json::to_string(&PresenceMessage::Leave {
            user_id: user_id.to_string(),
        })
        .unwrap_or_default();

        let _ = board.tx.send(msg);

        // Clean up empty boards
        if board.users.is_empty() {
            self.boards.remove(board_id);
        }
    }

    /// Update cursor position for a user.
    pub fn update_cursor(&self, board_id: &str, user_id: &str, cursor: CursorPosition) {
        let board = self.get_or_create_board(board_id);

        if let Some(mut entry) = board.users.get_mut(user_id) {
            entry.cursor = Some(cursor.clone());
            entry.last_seen = Some(Instant::now());
        }

        let msg = serde_json::to_string(&PresenceMessage::CursorUpdate { cursor })
            .unwrap_or_default();

        // Prepend user_id so clients can attribute the cursor
        let tagged = format!("{{\"from\":\"{user_id}\",\"data\":{msg}}}");
        let _ = board.tx.send(tagged);
    }

    /// Update viewport for a user.
    pub fn update_viewport(&self, board_id: &str, user_id: &str, viewport: ViewportInfo) {
        let board = self.get_or_create_board(board_id);

        if let Some(mut entry) = board.users.get_mut(user_id) {
            entry.viewport = Some(viewport.clone());
            entry.last_seen = Some(Instant::now());
        }

        let msg = serde_json::to_string(&PresenceMessage::ViewportUpdate { viewport })
            .unwrap_or_default();

        let tagged = format!("{{\"from\":\"{user_id}\",\"data\":{msg}}}");
        let _ = board.tx.send(tagged);
    }

    /// Get full presence state for a board (sent on initial connect).
    pub fn get_state(&self, board_id: &str) -> Vec<UserPresence> {
        let board = self.get_or_create_board(board_id);
        board
            .users
            .iter()
            .map(|entry| entry.value().clone())
            .collect()
    }

    /// Subscribe to presence updates for a board.
    pub fn subscribe(&self, board_id: &str) -> broadcast::Receiver<String> {
        let board = self.get_or_create_board(board_id);
        board.tx.subscribe()
    }

    /// Get the number of connected users on a board.
    pub fn connection_count(&self, board_id: &str) -> usize {
        self.boards
            .get(board_id)
            .map(|b| b.users.len())
            .unwrap_or(0)
    }

    /// Remove stale users (no heartbeat received).
    pub fn cleanup_stale(&self) {
        let now = Instant::now();
        let timeout = std::time::Duration::from_secs(HEARTBEAT_TIMEOUT_SECS);

        let empty_boards: Vec<String> = self
            .boards
            .iter()
            .filter_map(|entry| {
                let board_id = entry.key().clone();
                let board = entry.value();

                let stale_users: Vec<String> = board
                    .users
                    .iter()
                    .filter_map(|u| {
                        if let Some(last) = u.value().last_seen {
                            if now.duration_since(last) > timeout {
                                return Some(u.key().clone());
                            }
                        }
                        None
                    })
                    .collect();

                for user_id in &stale_users {
                    board.users.remove(user_id);
                    let msg = serde_json::to_string(&PresenceMessage::Leave {
                        user_id: user_id.clone(),
                    })
                    .unwrap_or_default();
                    let _ = board.tx.send(msg);
                }

                if board.users.is_empty() {
                    Some(board_id)
                } else {
                    None
                }
            })
            .collect();

        for board_id in empty_boards {
            self.boards.remove(&board_id);
        }
    }
}

/// Spawn periodic cleanup of stale presence entries.
pub fn spawn_cleanup_task(manager: Arc<PresenceManager>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(10));
        loop {
            interval.tick().await;
            manager.cleanup_stale();
        }
    });
}
