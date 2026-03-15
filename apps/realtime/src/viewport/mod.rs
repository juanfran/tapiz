use rstar::{AABB, Envelope, RTree, RTreeObject, PointDistance};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewport {
    pub center: Point,
    pub width: f64,
    pub height: f64,
    pub zoom: f64,
}

impl Viewport {
    pub fn to_aabb(&self) -> AABB<[f64; 2]> {
        let half_w = (self.width / self.zoom) / 2.0;
        let half_h = (self.height / self.zoom) / 2.0;
        AABB::from_corners(
            [self.center.x - half_w, self.center.y - half_h],
            [self.center.x + half_w, self.center.y + half_h],
        )
    }

    pub fn to_warm_aabb(&self) -> AABB<[f64; 2]> {
        let factor = 1.5;
        let half_w = (self.width / self.zoom) / 2.0 * factor;
        let half_h = (self.height / self.zoom) / 2.0 * factor;
        AABB::from_corners(
            [self.center.x - half_w, self.center.y - half_h],
            [self.center.x + half_w, self.center.y + half_h],
        )
    }
}

/// A node's spatial envelope stored in the R*-tree.
#[derive(Debug, Clone)]
pub struct NodeEnvelope {
    pub node_id: String,
    pub min: [f64; 2],
    pub max: [f64; 2],
    pub layer: i32,
}

impl RTreeObject for NodeEnvelope {
    type Envelope = AABB<[f64; 2]>;

    fn envelope(&self) -> Self::Envelope {
        AABB::from_corners(self.min, self.max)
    }
}

impl PointDistance for NodeEnvelope {
    fn distance_2(&self, point: &[f64; 2]) -> f64 {
        self.envelope().distance_2(point)
    }
}

/// Classification result for viewport-based node filtering.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeZone {
    Hot,  // Visible in viewport
    Warm, // Prefetch zone (1.5x viewport)
    Cold, // Off-screen
}

/// Per-board spatial index backed by an R*-tree.
pub struct SpatialIndex {
    tree: RTree<NodeEnvelope>,
    node_count: usize,
}

impl SpatialIndex {
    pub fn new() -> Self {
        Self {
            tree: RTree::new(),
            node_count: 0,
        }
    }

    /// Bulk-load from a list of node envelopes (much faster than individual inserts).
    pub fn bulk_load(envelopes: Vec<NodeEnvelope>) -> Self {
        let count = envelopes.len();
        Self {
            tree: RTree::bulk_load(envelopes),
            node_count: count,
        }
    }

    /// Insert or update a node in the spatial index.
    /// R*-tree doesn't support in-place update, so we rebuild if needed.
    pub fn upsert(&mut self, envelope: NodeEnvelope) {
        // Remove old entry with same ID (O(n) scan, acceptable for single updates)
        let old: Vec<NodeEnvelope> = self
            .tree
            .iter()
            .filter(|e| e.node_id == envelope.node_id)
            .cloned()
            .collect();
        for o in old {
            self.tree.remove(&o);
        }
        self.tree.insert(envelope);
        self.node_count = self.tree.size();
    }

    /// Remove a node from the spatial index.
    pub fn remove(&mut self, node_id: &str) {
        let old: Vec<NodeEnvelope> = self
            .tree
            .iter()
            .filter(|e| e.node_id == node_id)
            .cloned()
            .collect();
        for o in old {
            self.tree.remove(&o);
        }
        self.node_count = self.tree.size();
    }

    /// Query all nodes intersecting the given viewport (hot zone).
    pub fn query_hot(&self, viewport: &Viewport) -> Vec<&NodeEnvelope> {
        let aabb = viewport.to_aabb();
        self.tree
            .locate_in_envelope_intersecting(&aabb)
            .collect()
    }

    /// Query all nodes in the warm zone (1.5x viewport) but not hot.
    pub fn query_warm(&self, viewport: &Viewport) -> Vec<&NodeEnvelope> {
        let hot_aabb = viewport.to_aabb();
        let warm_aabb = viewport.to_warm_aabb();

        self.tree
            .locate_in_envelope_intersecting(&warm_aabb)
            .filter(|e| !hot_aabb.contains_envelope(&e.envelope()))
            .collect()
    }

    /// Classify a single node relative to a viewport.
    pub fn classify(&self, node_id: &str, viewport: &Viewport) -> NodeZone {
        let hot_aabb = viewport.to_aabb();
        let warm_aabb = viewport.to_warm_aabb();

        for envelope in self.tree.iter().filter(|e| e.node_id == node_id) {
            let env = envelope.envelope();
            if hot_aabb.contains_envelope(&env) || aabb_intersects(&hot_aabb, &env) {
                return NodeZone::Hot;
            }
            if warm_aabb.contains_envelope(&env) || aabb_intersects(&warm_aabb, &env) {
                return NodeZone::Warm;
            }
        }

        NodeZone::Cold
    }

    /// Get all hot + warm node IDs for a viewport (for viewport-aware broadcasting).
    pub fn relevant_node_ids(&self, viewport: &Viewport) -> Vec<String> {
        let warm_aabb = viewport.to_warm_aabb();
        self.tree
            .locate_in_envelope_intersecting(&warm_aabb)
            .map(|e| e.node_id.clone())
            .collect()
    }

    pub fn node_count(&self) -> usize {
        self.node_count
    }
}

fn aabb_intersects(a: &AABB<[f64; 2]>, b: &AABB<[f64; 2]>) -> bool {
    let a_lower = a.lower();
    let a_upper = a.upper();
    let b_lower = b.lower();
    let b_upper = b.upper();
    a_lower[0] <= b_upper[0]
        && a_upper[0] >= b_lower[0]
        && a_lower[1] <= b_upper[1]
        && a_upper[1] >= b_lower[1]
}

/// Manages spatial indices per board.
pub struct SpatialManager {
    indices: DashMap<String, Arc<RwLock<SpatialIndex>>>,
}

impl SpatialManager {
    pub fn new() -> Self {
        Self {
            indices: DashMap::new(),
        }
    }

    pub fn get_or_create(&self, board_id: &str) -> Arc<RwLock<SpatialIndex>> {
        if let Some(idx) = self.indices.get(board_id) {
            return Arc::clone(idx.value());
        }

        let idx = Arc::new(RwLock::new(SpatialIndex::new()));
        self.indices.insert(board_id.to_string(), Arc::clone(&idx));
        idx
    }

    pub async fn upsert_node(
        &self,
        board_id: &str,
        node_id: &str,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        layer: i32,
    ) {
        let idx = self.get_or_create(board_id);
        let mut idx = idx.write().await;
        idx.upsert(NodeEnvelope {
            node_id: node_id.to_string(),
            min: [x, y],
            max: [x + w, y + h],
            layer,
        });
    }

    pub async fn remove_node(&self, board_id: &str, node_id: &str) {
        let idx = self.get_or_create(board_id);
        let mut idx = idx.write().await;
        idx.remove(node_id);
    }

    pub async fn query_relevant(
        &self,
        board_id: &str,
        viewport: &Viewport,
    ) -> Vec<String> {
        let idx = self.get_or_create(board_id);
        let idx = idx.read().await;
        idx.relevant_node_ids(viewport)
    }

    pub fn remove_board(&self, board_id: &str) {
        self.indices.remove(board_id);
    }
}

// Implement PartialEq for NodeEnvelope (needed by rstar remove)
impl PartialEq for NodeEnvelope {
    fn eq(&self, other: &Self) -> bool {
        self.node_id == other.node_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vp() -> Viewport {
        Viewport {
            center: Point { x: 500.0, y: 500.0 },
            width: 1920.0,
            height: 1080.0,
            zoom: 1.0,
        }
    }

    fn make_envelope(id: &str, x: f64, y: f64, w: f64, h: f64) -> NodeEnvelope {
        NodeEnvelope {
            node_id: id.to_string(),
            min: [x, y],
            max: [x + w, y + h],
            layer: 1,
        }
    }

    #[test]
    fn spatial_index_queries_hot_nodes() {
        let envelopes = vec![
            make_envelope("visible", 400.0, 400.0, 200.0, 200.0),
            make_envelope("far", 5000.0, 5000.0, 200.0, 200.0),
        ];
        let idx = SpatialIndex::bulk_load(envelopes);

        let hot = idx.query_hot(&vp());
        assert_eq!(hot.len(), 1);
        assert_eq!(hot[0].node_id, "visible");
    }

    #[test]
    fn spatial_index_classifies_cold() {
        let envelopes = vec![make_envelope("far", 5000.0, 5000.0, 200.0, 200.0)];
        let idx = SpatialIndex::bulk_load(envelopes);

        assert_eq!(idx.classify("far", &vp()), NodeZone::Cold);
    }

    #[test]
    fn spatial_index_classifies_warm() {
        // Node at -700,500 is outside viewport but within 1.5x warm zone
        let envelopes = vec![make_envelope("warm", -700.0, 500.0, 200.0, 200.0)];
        let idx = SpatialIndex::bulk_load(envelopes);

        assert_eq!(idx.classify("warm", &vp()), NodeZone::Warm);
    }

    #[test]
    fn spatial_index_upsert_and_remove() {
        let mut idx = SpatialIndex::new();
        idx.upsert(make_envelope("a", 100.0, 100.0, 50.0, 50.0));
        assert_eq!(idx.node_count(), 1);

        idx.upsert(make_envelope("a", 200.0, 200.0, 50.0, 50.0));
        assert_eq!(idx.node_count(), 1); // updated, not duplicated

        idx.remove("a");
        assert_eq!(idx.node_count(), 0);
    }

    #[test]
    fn relevant_nodes_includes_hot_and_warm() {
        let envelopes = vec![
            make_envelope("hot", 400.0, 400.0, 200.0, 200.0),
            make_envelope("warm", -700.0, 500.0, 200.0, 200.0),
            make_envelope("cold", 5000.0, 5000.0, 200.0, 200.0),
        ];
        let idx = SpatialIndex::bulk_load(envelopes);

        let relevant = idx.relevant_node_ids(&vp());
        assert!(relevant.contains(&"hot".to_string()));
        assert!(relevant.contains(&"warm".to_string()));
        assert!(!relevant.contains(&"cold".to_string()));
    }

    #[test]
    fn zoom_affects_query() {
        let envelopes = vec![make_envelope("n", 1500.0, 500.0, 200.0, 200.0)];
        let idx = SpatialIndex::bulk_load(envelopes);

        // Zoomed out: wider viewport, node visible
        let zoomed_out = Viewport { zoom: 0.5, ..vp() };
        assert_eq!(idx.query_hot(&zoomed_out).len(), 1);

        // Zoomed in: narrower viewport, node invisible
        let zoomed_in = Viewport { zoom: 2.0, ..vp() };
        assert_eq!(idx.query_hot(&zoomed_in).len(), 0);
    }

    #[test]
    fn bulk_load_10k_nodes_performance() {
        let envelopes: Vec<NodeEnvelope> = (0..10_000)
            .map(|i| {
                let x = (i % 100) as f64 * 200.0;
                let y = (i / 100) as f64 * 200.0;
                make_envelope(&format!("n{i}"), x, y, 150.0, 100.0)
            })
            .collect();

        let start = std::time::Instant::now();
        let idx = SpatialIndex::bulk_load(envelopes);
        let build_ms = start.elapsed().as_millis();

        let start = std::time::Instant::now();
        let hot = idx.query_hot(&vp());
        let query_ms = start.elapsed().as_millis();

        assert!(idx.node_count() == 10_000);
        assert!(build_ms < 100, "Bulk load took {build_ms}ms (expected <100ms)");
        assert!(query_ms < 5, "Query took {query_ms}ms (expected <5ms)");
        assert!(!hot.is_empty());
    }
}
