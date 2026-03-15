use axum::extract::State;
use std::sync::Arc;
use std::sync::atomic::Ordering;

use crate::AppState;

/// Prometheus-compatible metrics endpoint.
pub async fn metrics_handler(
    State(state): State<Arc<AppState>>,
) -> String {
    let active_connections = state.active_connections.load(Ordering::Relaxed);
    let room_count = state.rooms.room_count();

    let mut output = String::with_capacity(512);

    output.push_str("# HELP tapiz_active_connections Number of active WebSocket connections\n");
    output.push_str("# TYPE tapiz_active_connections gauge\n");
    output.push_str(&format!("tapiz_active_connections {active_connections}\n"));

    output.push_str("# HELP tapiz_active_rooms Number of Yjs rooms in memory\n");
    output.push_str("# TYPE tapiz_active_rooms gauge\n");
    output.push_str(&format!("tapiz_active_rooms {room_count}\n"));

    output.push_str("# HELP tapiz_max_connections_per_board Maximum connections allowed per board\n");
    output.push_str("# TYPE tapiz_max_connections_per_board gauge\n");
    output.push_str(&format!(
        "tapiz_max_connections_per_board {}\n",
        state.max_connections_per_board
    ));

    output
}
