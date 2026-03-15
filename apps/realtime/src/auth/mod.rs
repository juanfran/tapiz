use axum::http::HeaderMap;
use serde::Deserialize;
use sqlx::PgPool;

#[derive(Debug, Clone, Deserialize)]
pub struct SessionUser {
    pub id: String,
    pub name: String,
}

/// Validates session cookie against the database (same session table as Better Auth).
/// Returns the authenticated user or None.
pub async fn validate_session(headers: &HeaderMap, db: &PgPool) -> Option<SessionUser> {
    let cookie_header = headers.get("cookie")?.to_str().ok()?;

    let session_token = cookie_header
        .split(';')
        .map(str::trim)
        .find(|c| c.starts_with("better-auth.session_token="))?
        .strip_prefix("better-auth.session_token=")?;

    // Extract token before the dot (Better Auth stores token.signature)
    let token = session_token.split('.').next().unwrap_or(session_token);

    let row = sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT s.user_id, a.name
        FROM account_session s
        JOIN accounts a ON a.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > NOW()
        "#,
    )
    .bind(token)
    .fetch_optional(db)
    .await
    .ok()
    .flatten()?;

    Some(SessionUser {
        id: row.user_id,
        name: row.name,
    })
}

#[derive(sqlx::FromRow)]
struct SessionRow {
    user_id: String,
    name: String,
}

/// Check if user has access to the given board.
pub async fn check_board_access(db: &PgPool, board_id: &str, user_id: &str) -> bool {
    // Check if board is public
    let is_public = sqlx::query_scalar::<_, bool>(
        "SELECT public FROM boards WHERE id = $1::uuid",
    )
    .bind(board_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    if is_public == Some(true) {
        return true;
    }

    // Check direct board membership (admin role)
    let has_direct = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM accounts_boards
            WHERE board_id = $1::uuid AND account_id = $2 AND role = 'admin'
        )
        "#,
    )
    .bind(board_id)
    .bind(user_id)
    .fetch_one(db)
    .await
    .unwrap_or(false);

    if has_direct {
        return true;
    }

    // Check team membership
    let has_team = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM team_members tm
            JOIN boards b ON b.team_id = tm.team_id
            WHERE b.id = $1::uuid AND tm.account_id = $2
        )
        "#,
    )
    .bind(board_id)
    .bind(user_id)
    .fetch_one(db)
    .await
    .unwrap_or(false);

    has_team
}
