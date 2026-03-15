mod auth;
mod board_crdt;
mod db;
mod presence;
mod viewport;
mod ws;
mod yjs;

use axum::{Router, routing::get};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

pub struct AppState {
    pub db: sqlx::PgPool,
    pub rooms: Arc<yjs::RoomManager>,
    pub presence: Arc<presence::PresenceManager>,
    pub spatial: Arc<viewport::SpatialManager>,
    pub node_api_url: String,
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
    });

    let cors = CorsLayer::new()
        .allow_origin(frontend_url.parse::<http::HeaderValue>().unwrap())
        .allow_credentials(true)
        .allow_headers(Any)
        .allow_methods(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/ws/yjs/{board_id}", get(ws::yjs_handler))
        .route("/ws/presence/{board_id}", get(ws::presence_handler))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind");

    tracing::info!("tapiz-realtime listening on :{port}");

    axum::serve(listener, app).await.expect("Server error");
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "tapiz-realtime",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
