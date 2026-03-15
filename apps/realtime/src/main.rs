mod auth;
mod board_crdt;
mod db;
mod metrics;
mod presence;
mod rate_limit;
mod viewport;
mod ws;
mod yjs;

use axum::{Router, routing::get};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use std::sync::atomic::AtomicU64;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

pub struct AppState {
    pub db: sqlx::PgPool,
    pub rooms: Arc<yjs::RoomManager>,
    pub presence: Arc<presence::PresenceManager>,
    pub spatial: Arc<viewport::SpatialManager>,
    pub node_api_url: String,
    pub active_connections: AtomicU64,
    pub max_connections_per_board: usize,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "tapiz_realtime=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let api_url = std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:3000".into());
    let port = std::env::var("REALTIME_PORT").unwrap_or_else(|_| "4000".into());
    let frontend_url =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:4200".into());
    let max_conns_per_board: usize = std::env::var("MAX_CONNECTIONS_PER_BOARD")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(100);

    let pool = PgPoolOptions::new()
        .max_connections(100)
        .min_connections(10)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(600))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let rooms = Arc::new(yjs::RoomManager::new());
    let presence_mgr = Arc::new(presence::PresenceManager::new());
    let spatial = Arc::new(viewport::SpatialManager::new());

    // Spawn background tasks
    yjs::spawn_background_tasks(Arc::clone(&rooms), pool.clone());
    presence::spawn_cleanup_task(Arc::clone(&presence_mgr));

    let state = Arc::new(AppState {
        db: pool,
        rooms,
        presence: presence_mgr,
        spatial,
        node_api_url: api_url,
        active_connections: AtomicU64::new(0),
        max_connections_per_board: max_conns_per_board,
    });

    let cors = CorsLayer::new()
        .allow_origin(frontend_url.parse::<http::HeaderValue>().unwrap())
        .allow_credentials(true)
        .allow_headers(Any)
        .allow_methods(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/metrics", get(metrics::metrics_handler))
        .route("/ws/yjs/{board_id}", get(ws::yjs_handler))
        .route("/ws/presence/{board_id}", get(ws::presence_handler))
        .route(
            "/api/board/{board_id}/viewport-query",
            axum::routing::post(ws::viewport_query_handler),
        )
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state.clone());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind");

    tracing::info!("tapiz-realtime listening on :{port}");

    // Graceful shutdown: persist all dirty rooms on SIGTERM/SIGINT
    let shutdown_state = Arc::clone(&state);
    let server = axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(shutdown_state));

    server.await.expect("Server error");
}

async fn shutdown_signal(state: Arc<AppState>) {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, persisting dirty rooms...");
    state.rooms.persist_dirty(&state.db).await;
    tracing::info!("All rooms persisted. Shutting down.");
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "tapiz-realtime",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
