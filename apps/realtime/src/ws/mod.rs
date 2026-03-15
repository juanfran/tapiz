use axum::{
    extract::{Path, State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::Ordering;
use tokio::time::{Duration, interval};

use crate::{AppState, auth, presence, rate_limit, viewport};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);
const MAX_MESSAGE_SIZE: usize = 512 * 1024; // 512 KB

// --- Viewport Query REST Endpoint ---

#[derive(Deserialize)]
pub struct ViewportQueryRequest {
    pub center_x: f64,
    pub center_y: f64,
    pub width: f64,
    pub height: f64,
    pub zoom: f64,
}

#[derive(Serialize)]
pub struct ViewportQueryResponse {
    pub hot: Vec<String>,
    pub warm: Vec<String>,
    pub total_indexed: usize,
}

pub async fn viewport_query_handler(
    Path(board_id): Path<String>,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<ViewportQueryRequest>,
) -> impl IntoResponse {
    let user = match auth::validate_session(&headers, &state.db).await {
        Some(u) => u,
        None => {
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Unauthorized"})),
            )
                .into_response()
        }
    };

    if !auth::check_board_access(&state.db, &board_id, &user.id).await {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "No board access"})),
        )
            .into_response();
    }

    let vp = viewport::Viewport {
        center: viewport::Point {
            x: req.center_x,
            y: req.center_y,
        },
        width: req.width,
        height: req.height,
        zoom: req.zoom,
    };

    let idx = state.spatial.get_or_create(&board_id);
    let idx = idx.read().await;

    let hot: Vec<String> = idx.query_hot(&vp).iter().map(|e| e.node_id.clone()).collect();
    let warm: Vec<String> = idx.query_warm(&vp).iter().map(|e| e.node_id.clone()).collect();
    let total_indexed = idx.node_count();

    Json(ViewportQueryResponse {
        hot,
        warm,
        total_indexed,
    })
    .into_response()
}

// --- Yjs WebSocket Handler ---

pub async fn yjs_handler(
    ws: WebSocketUpgrade,
    Path(board_id): Path<String>,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user = match auth::validate_session(&headers, &state.db).await {
        Some(u) => u,
        None => return (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized").into_response(),
    };

    if !auth::check_board_access(&state.db, &board_id, &user.id).await {
        return (axum::http::StatusCode::FORBIDDEN, "No board access").into_response();
    }

    // Check connection limit per board
    let current_board_conns = state.presence.connection_count(&board_id);
    if current_board_conns >= state.max_connections_per_board {
        tracing::warn!(
            "Board {board_id} at connection limit ({current_board_conns}/{})",
            state.max_connections_per_board
        );
        return (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "Board connection limit reached",
        )
            .into_response();
    }

    tracing::info!("Yjs WS connect: user={} board={board_id}", user.id);

    ws.max_message_size(MAX_MESSAGE_SIZE)
        .on_upgrade(move |socket| handle_yjs_socket(socket, board_id, user, state))
        .into_response()
}

async fn handle_yjs_socket(
    socket: WebSocket,
    board_id: String,
    user: auth::SessionUser,
    state: Arc<AppState>,
) {
    state.active_connections.fetch_add(1, Ordering::Relaxed);
    let (mut sink, mut stream) = socket.split();

    // Send initial state
    let sv = state.rooms.get_state_vector(&board_id, &state.db).await;
    if let Err(e) = sink.send(Message::Binary(sv.into())).await {
        tracing::warn!("Failed to send initial state: {e}");
        state.active_connections.fetch_sub(1, Ordering::Relaxed);
        return;
    }

    // Subscribe to room updates
    let mut rx = state.rooms.subscribe(&board_id, &state.db).await;

    let board_id_recv = board_id.clone();
    let state_recv = Arc::clone(&state);
    let user_id = user.id.clone();

    // Receive task: client → server (with rate limiting)
    let recv_task = tokio::spawn(async move {
        let mut limiter = rate_limit::yjs_limiter();

        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Binary(data)) => {
                    if !limiter.check() {
                        tracing::debug!("Rate limited Yjs update from {user_id}");
                        continue;
                    }

                    if let Err(e) = state_recv
                        .rooms
                        .apply_update(&board_id_recv, &data, &state_recv.db)
                        .await
                    {
                        tracing::warn!("Yjs update error from {user_id}: {e}");
                    }
                }
                Ok(Message::Ping(_)) => {}
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
    });

    // Send task: server → client
    let send_task = tokio::spawn(async move {
        let mut heartbeat = interval(HEARTBEAT_INTERVAL);

        loop {
            tokio::select! {
                result = rx.recv() => {
                    match result {
                        Ok(data) => {
                            if sink.send(Message::Binary(data.into())).await.is_err() {
                                break;
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                            tracing::warn!("Yjs broadcast lagged by {n} messages");
                        }
                        Err(_) => break,
                    }
                }
                _ = heartbeat.tick() => {
                    if sink.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = recv_task => {}
        _ = send_task => {}
    }

    state.active_connections.fetch_sub(1, Ordering::Relaxed);
    tracing::info!("Yjs WS disconnect: user={} board={board_id}", user.id);
}

// --- Presence WebSocket Handler ---

pub async fn presence_handler(
    ws: WebSocketUpgrade,
    Path(board_id): Path<String>,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user = match auth::validate_session(&headers, &state.db).await {
        Some(u) => u,
        None => return (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized").into_response(),
    };

    if !auth::check_board_access(&state.db, &board_id, &user.id).await {
        return (axum::http::StatusCode::FORBIDDEN, "No board access").into_response();
    }

    tracing::info!("Presence WS connect: user={} board={board_id}", user.name);

    ws.max_message_size(64 * 1024) // 64 KB for presence
        .on_upgrade(move |socket| handle_presence_socket(socket, board_id, user, state))
        .into_response()
}

async fn handle_presence_socket(
    socket: WebSocket,
    board_id: String,
    user: auth::SessionUser,
    state: Arc<AppState>,
) {
    state.active_connections.fetch_add(1, Ordering::Relaxed);
    let (mut sink, mut stream) = socket.split();

    // Register presence
    state.presence.join(&board_id, &user.id, &user.name);

    // Send current state
    let current = state.presence.get_state(&board_id);
    let state_msg = serde_json::to_string(&presence::PresenceMessage::FullState { users: current })
        .unwrap_or_default();
    if sink.send(Message::Text(state_msg.into())).await.is_err() {
        state.presence.leave(&board_id, &user.id);
        state.active_connections.fetch_sub(1, Ordering::Relaxed);
        return;
    }

    // Subscribe to presence updates
    let mut rx = state.presence.subscribe(&board_id);

    let board_id_recv = board_id.clone();
    let state_recv = Arc::clone(&state);
    let user_id_recv = user.id.clone();

    // Receive task: client cursor/viewport updates (with rate limiting)
    let recv_task = tokio::spawn(async move {
        let mut limiter = rate_limit::presence_limiter();

        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if !limiter.check() {
                        continue;
                    }

                    if let Ok(msg) = serde_json::from_str::<presence::PresenceMessage>(&text) {
                        match msg {
                            presence::PresenceMessage::CursorUpdate { cursor } => {
                                state_recv.presence.update_cursor(
                                    &board_id_recv,
                                    &user_id_recv,
                                    cursor,
                                );
                            }
                            presence::PresenceMessage::ViewportUpdate { viewport } => {
                                state_recv.presence.update_viewport(
                                    &board_id_recv,
                                    &user_id_recv,
                                    viewport,
                                );
                            }
                            _ => {}
                        }
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
    });

    // Send task: broadcast presence changes
    let send_task = tokio::spawn(async move {
        let mut heartbeat = interval(HEARTBEAT_INTERVAL);

        loop {
            tokio::select! {
                result = rx.recv() => {
                    match result {
                        Ok(msg) => {
                            if sink.send(Message::Text(msg.into())).await.is_err() {
                                break;
                            }
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                            tracing::debug!("Presence broadcast lagged by {n}");
                        }
                        Err(_) => break,
                    }
                }
                _ = heartbeat.tick() => {
                    if sink.send(Message::Ping(vec![].into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = recv_task => {}
        _ = send_task => {}
    }

    state.presence.leave(&board_id, &user.id);
    state.active_connections.fetch_sub(1, Ordering::Relaxed);
    tracing::info!("Presence WS disconnect: user={} board={board_id}", user.name);
}
