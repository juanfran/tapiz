use sqlx::PgPool;

/// Load the latest Yjs document snapshot from the database.
pub async fn load_yjs_state(db: &PgPool, board_id: &str) -> Option<Vec<u8>> {
    let row = sqlx::query_scalar::<_, Vec<u8>>(
        "SELECT yjs_state FROM boards WHERE id = $1::uuid AND yjs_state IS NOT NULL",
    )
    .bind(board_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten()?;

    Some(row)
}

/// Persist the Yjs document state vector back to the database.
pub async fn save_yjs_state(db: &PgPool, board_id: &str, state: &[u8]) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE boards SET yjs_state = $2 WHERE id = $1::uuid")
        .bind(board_id)
        .bind(state)
        .execute(db)
        .await?;
    Ok(())
}
