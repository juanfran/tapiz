use dashmap::DashMap;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use yrs::{Doc, ReadTxn, Transact, Update, updates::decoder::Decode, updates::encoder::Encode};

use crate::db;

const MAX_CACHED_DOCS: usize = 200;
const IDLE_TTL_SECS: u64 = 600;
const PERSIST_INTERVAL_SECS: u64 = 30;

pub struct Room {
    pub doc: Doc,
    pub tx: broadcast::Sender<Vec<u8>>,
    pub last_access: Instant,
    pub dirty: bool,
}

pub struct RoomManager {
    rooms: DashMap<String, Arc<tokio::sync::RwLock<Room>>>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: DashMap::new(),
        }
    }

    pub async fn get_or_create(
        &self,
        board_id: &str,
        db_pool: &PgPool,
    ) -> Arc<tokio::sync::RwLock<Room>> {
        if let Some(room) = self.rooms.get(board_id) {
            let room = Arc::clone(room.value());
            room.write().await.last_access = Instant::now();
            return room;
        }

        let doc = Doc::new();

        if let Some(state) = db::load_yjs_state(db_pool, board_id).await {
            if let Ok(update) = Update::decode_v1(&state) {
                let mut txn = doc.transact_mut();
                txn.apply_update(update)
                    .unwrap_or_else(|e| tracing::warn!("Failed to apply stored state: {e}"));
            }
        }

        let (tx, _) = broadcast::channel(256);

        let room = Arc::new(tokio::sync::RwLock::new(Room {
            doc,
            tx,
            last_access: Instant::now(),
            dirty: false,
        }));

        self.rooms.insert(board_id.to_string(), Arc::clone(&room));
        self.evict_if_needed(db_pool).await;

        room
    }

    pub async fn apply_update(
        &self,
        board_id: &str,
        update_data: &[u8],
        db_pool: &PgPool,
    ) -> Result<(), String> {
        let room = self.get_or_create(board_id, db_pool).await;
        let mut room_guard = room.write().await;

        let update = Update::decode_v1(update_data)
            .map_err(|e| format!("Invalid Yjs update: {e}"))?;

        {
            let mut txn = room_guard.doc.transact_mut();
            txn.apply_update(update)
                .map_err(|e| format!("Failed to apply update: {e}"))?;
        }

        room_guard.dirty = true;
        room_guard.last_access = Instant::now();

        let _ = room_guard.tx.send(update_data.to_vec());

        Ok(())
    }

    pub async fn get_state_vector(
        &self,
        board_id: &str,
        db_pool: &PgPool,
    ) -> Vec<u8> {
        let room = self.get_or_create(board_id, db_pool).await;
        let room_guard = room.read().await;
        // Encode state vector synchronously — no await while txn is alive
        let sv = {
            let txn = room_guard.doc.transact();
            txn.state_vector().encode_v1()
        };
        sv
    }

    pub async fn encode_state_as_update(
        &self,
        board_id: &str,
        db_pool: &PgPool,
        sv: &[u8],
    ) -> Result<Vec<u8>, String> {
        let room = self.get_or_create(board_id, db_pool).await;
        let room_guard = room.read().await;

        let remote_sv = yrs::StateVector::decode_v1(sv)
            .map_err(|e| format!("Invalid state vector: {e}"))?;

        let encoded = {
            let txn = room_guard.doc.transact();
            txn.encode_diff_v1(&remote_sv)
        };
        Ok(encoded)
    }

    pub async fn subscribe(
        &self,
        board_id: &str,
        db_pool: &PgPool,
    ) -> broadcast::Receiver<Vec<u8>> {
        let room = self.get_or_create(board_id, db_pool).await;
        let room_guard = room.read().await;
        room_guard.tx.subscribe()
    }

    pub async fn persist_dirty(&self, db_pool: &PgPool) {
        let all_rooms: Vec<(String, Arc<tokio::sync::RwLock<Room>>)> = self
            .rooms
            .iter()
            .map(|entry| (entry.key().clone(), Arc::clone(entry.value())))
            .collect();

        for (board_id, room) in all_rooms {
            let mut room_guard = room.write().await;
            if room_guard.dirty {
                // Encode state synchronously, then drop txn before await
                let state = {
                    let txn = room_guard.doc.transact();
                    txn.encode_state_as_update_v1(&yrs::StateVector::default())
                };

                if let Err(e) = db::save_yjs_state(db_pool, &board_id, &state).await {
                    tracing::error!("Failed to persist Yjs state for {board_id}: {e}");
                } else {
                    room_guard.dirty = false;
                    tracing::debug!("Persisted Yjs state for {board_id}");
                }
            }
        }
    }

    async fn evict_if_needed(&self, db_pool: &PgPool) {
        if self.rooms.len() <= MAX_CACHED_DOCS {
            return;
        }

        let now = Instant::now();
        let idle_threshold = std::time::Duration::from_secs(IDLE_TTL_SECS);

        let mut evict_candidates: Vec<(String, Instant)> = Vec::new();

        for entry in self.rooms.iter() {
            if let Ok(room) = entry.value().try_read() {
                if now.duration_since(room.last_access) > idle_threshold {
                    evict_candidates.push((entry.key().clone(), room.last_access));
                }
            }
        }

        evict_candidates.sort_by_key(|(_, t)| *t);

        for (board_id, _) in evict_candidates {
            if let Some((_, room)) = self.rooms.remove(&board_id) {
                let room_guard = room.read().await;
                if room_guard.dirty {
                    // Encode state synchronously, then drop txn before await
                    let state = {
                        let txn = room_guard.doc.transact();
                        txn.encode_state_as_update_v1(&yrs::StateVector::default())
                    };
                    drop(room_guard);
                    let _ = db::save_yjs_state(db_pool, &board_id, &state).await;
                }
                tracing::info!("Evicted idle room: {board_id}");
            }

            if self.rooms.len() <= MAX_CACHED_DOCS {
                break;
            }
        }
    }

    pub fn room_count(&self) -> usize {
        self.rooms.len()
    }
}

pub fn spawn_background_tasks(rooms: Arc<RoomManager>, db_pool: PgPool) {
    let rooms_persist = Arc::clone(&rooms);
    let db_persist = db_pool.clone();
    tokio::spawn(async move {
        let mut interval =
            tokio::time::interval(std::time::Duration::from_secs(PERSIST_INTERVAL_SECS));
        loop {
            interval.tick().await;
            rooms_persist.persist_dirty(&db_persist).await;
        }
    });

    let rooms_evict = Arc::clone(&rooms);
    let db_evict = db_pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            rooms_evict.evict_if_needed(&db_evict).await;
        }
    });
}
