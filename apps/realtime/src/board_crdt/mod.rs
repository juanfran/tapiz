use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use vectis_crdt::{
    awareness::{AwarenessStore, CursorState},
    document::Document,
    encoding,
    rga::StrokeId,
    stroke::{StrokeData, StrokePoint, StrokeProperties, ToolKind},
    types::ActorId,
};

/// Per-board vectis-crdt document for stroke-level CRDT with deterministic z-ordering.
pub struct BoardDocument {
    pub doc: Document,
    pub awareness: AwarenessStore,
}

impl BoardDocument {
    pub fn new(actor_id: u64) -> Self {
        Self {
            doc: Document::new(ActorId(actor_id)),
            awareness: AwarenessStore::with_ttl(15_000),
        }
    }

    /// Apply remote operations received from another user.
    pub fn apply_remote_ops(&mut self, update_bytes: &[u8]) -> Result<Vec<StrokeId>, String> {
        let ops = encoding::decode_update(update_bytes)
            .map_err(|e| format!("Failed to decode vectis update: {e}"))?;

        let mut affected = Vec::new();
        for op in ops {
            if let Some(stroke_id) = self.doc.apply_remote(op) {
                affected.push(stroke_id);
            }
        }
        Ok(affected)
    }

    /// Insert a new stroke and return the encoded operation for broadcasting.
    pub fn insert_stroke(
        &mut self,
        points: Vec<StrokePoint>,
        color: u32,
        width: f32,
        opacity: f32,
        tool: ToolKind,
    ) -> (StrokeId, Vec<u8>) {
        let data = StrokeData::new(points.into_boxed_slice(), tool);
        let props = StrokeProperties::new(color, width, opacity, self.next_op_id());

        let stroke_id = self.doc.insert_stroke(data, props);
        let pending = self.doc.take_pending_ops();
        let encoded = encoding::encode_update(&pending);

        (stroke_id, encoded)
    }

    /// Delete a stroke and return the encoded operation for broadcasting.
    pub fn delete_stroke(&mut self, stroke_id: StrokeId) -> Option<Vec<u8>> {
        if self.doc.delete_stroke(stroke_id) {
            let pending = self.doc.take_pending_ops();
            Some(encoding::encode_update(&pending))
        } else {
            None
        }
    }

    /// Get all visible stroke IDs (z-ordered).
    pub fn visible_strokes(&self) -> Vec<StrokeId> {
        self.doc.visible_stroke_ids()
    }

    /// Get bounding box for a stroke (for spatial indexing).
    pub fn stroke_bounds(&self, stroke_id: &StrokeId) -> Option<(f64, f64, f64, f64)> {
        let (data, _props) = self.doc.get_stroke(stroke_id)?;
        let aabb = &data.bounds;
        Some((
            aabb.min_x as f64,
            aabb.min_y as f64,
            (aabb.max_x - aabb.min_x) as f64,
            (aabb.max_y - aabb.min_y) as f64,
        ))
    }

    /// Encode full snapshot for persistence.
    pub fn encode_snapshot(&self) -> Vec<u8> {
        encoding::encode_snapshot(&self.doc)
    }

    /// Restore from persisted snapshot.
    pub fn from_snapshot(actor_id: u64, snapshot_bytes: &[u8]) -> Result<Self, String> {
        let doc = encoding::decode_snapshot(snapshot_bytes, ActorId(actor_id))
            .map_err(|e| format!("Failed to decode vectis snapshot: {e}"))?;
        Ok(Self {
            doc,
            awareness: AwarenessStore::with_ttl(15_000),
        })
    }

    /// Update cursor state for awareness protocol.
    pub fn update_cursor(&mut self, actor_id: u64, x: f32, y: f32, now_ms: u64, color: u32) {
        let cursor = CursorState::new(ActorId(actor_id), x, y, now_ms, color);
        self.awareness.update(cursor);
    }

    /// Evict stale cursors and return count removed.
    pub fn evict_stale_cursors(&mut self, now_ms: u64) -> usize {
        self.awareness.evict_stale(now_ms)
    }

    pub fn stats(&self) -> vectis_crdt::document::DocumentStats {
        self.doc.stats()
    }

    /// Helper to generate the next OpId for property initialization.
    fn next_op_id(&self) -> vectis_crdt::types::OpId {
        let stats = self.doc.stats();
        vectis_crdt::types::OpId {
            lamport: vectis_crdt::types::LamportTs(stats.total_items as u64 + 1),
            actor: ActorId(0),
        }
    }
}

/// Manages vectis-crdt documents per board.
pub struct BoardCrdtManager {
    boards: DashMap<String, Arc<RwLock<BoardDocument>>>,
}

impl BoardCrdtManager {
    pub fn new() -> Self {
        Self {
            boards: DashMap::new(),
        }
    }

    pub fn get_or_create(&self, board_id: &str, actor_id: u64) -> Arc<RwLock<BoardDocument>> {
        if let Some(doc) = self.boards.get(board_id) {
            return Arc::clone(doc.value());
        }

        let doc = Arc::new(RwLock::new(BoardDocument::new(actor_id)));
        self.boards.insert(board_id.to_string(), Arc::clone(&doc));
        doc
    }

    pub fn remove_board(&self, board_id: &str) {
        self.boards.remove(board_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_points(n: usize) -> Vec<StrokePoint> {
        (0..n)
            .map(|i| StrokePoint::new(i as f32 * 10.0, i as f32 * 5.0, 0.5))
            .collect()
    }

    #[test]
    fn insert_and_list_strokes() {
        let mut doc = BoardDocument::new(1);
        let (id1, _) = doc.insert_stroke(make_points(10), 0xFF0000, 2.0, 1.0, ToolKind::Pen);
        let (id2, _) = doc.insert_stroke(make_points(5), 0x00FF00, 3.0, 0.8, ToolKind::Marker);

        let visible = doc.visible_strokes();
        assert_eq!(visible.len(), 2);
        assert!(visible.contains(&id1));
        assert!(visible.contains(&id2));
    }

    #[test]
    fn delete_stroke_removes_from_visible() {
        let mut doc = BoardDocument::new(1);
        let (id, _) = doc.insert_stroke(make_points(5), 0xFF0000, 2.0, 1.0, ToolKind::Pen);

        assert_eq!(doc.visible_strokes().len(), 1);
        doc.delete_stroke(id);
        assert_eq!(doc.visible_strokes().len(), 0);
    }

    #[test]
    fn stroke_bounds_returns_aabb() {
        let mut doc = BoardDocument::new(1);
        let points = vec![
            StrokePoint::new(10.0, 20.0, 0.5),
            StrokePoint::new(110.0, 120.0, 0.5),
        ];
        let (id, _) = doc.insert_stroke(points, 0xFF0000, 2.0, 1.0, ToolKind::Pen);

        let bounds = doc.stroke_bounds(&id);
        assert!(bounds.is_some());
        let (x, y, w, h) = bounds.unwrap();
        assert!(x >= 9.0 && x <= 11.0);
        assert!(y >= 19.0 && y <= 21.0);
        assert!(w >= 99.0);
        assert!(h >= 99.0);
    }

    #[test]
    fn concurrent_replicas_converge() {
        let mut replica1 = BoardDocument::new(1);
        let mut replica2 = BoardDocument::new(2);

        let (_, ops1) = replica1.insert_stroke(make_points(5), 0xFF0000, 2.0, 1.0, ToolKind::Pen);
        let (_, ops2) = replica2.insert_stroke(make_points(3), 0x00FF00, 1.0, 1.0, ToolKind::Pen);

        // Cross-apply
        replica1.apply_remote_ops(&ops2).unwrap();
        replica2.apply_remote_ops(&ops1).unwrap();

        // Both should have same visible strokes
        assert_eq!(replica1.visible_strokes().len(), 2);
        assert_eq!(replica2.visible_strokes().len(), 2);
    }

    #[test]
    fn snapshot_roundtrip() {
        let mut doc = BoardDocument::new(1);
        doc.insert_stroke(make_points(10), 0xFF0000, 2.0, 1.0, ToolKind::Pen);
        doc.insert_stroke(make_points(5), 0x00FF00, 3.0, 0.8, ToolKind::Marker);

        let snapshot = doc.encode_snapshot();
        let restored = BoardDocument::from_snapshot(1, &snapshot).unwrap();

        assert_eq!(restored.visible_strokes().len(), 2);
    }

    #[test]
    fn awareness_cursor_lifecycle() {
        let mut doc = BoardDocument::new(1);
        doc.update_cursor(1, 100.0, 200.0, 1000, 0xFF0000);
        doc.update_cursor(2, 300.0, 400.0, 1000, 0x00FF00);

        assert_eq!(doc.awareness.actor_count(), 2);

        // Evict after TTL
        let removed = doc.evict_stale_cursors(20_000);
        assert_eq!(removed, 2);
        assert_eq!(doc.awareness.actor_count(), 0);
    }
}
