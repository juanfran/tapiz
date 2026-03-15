use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub top_left: Point,
    pub bottom_right: Point,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Viewport {
    pub center: Point,
    pub width: f64,
    pub height: f64,
    pub zoom: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColdNodeIndex {
    pub node_id: String,
    pub bounds: Bounds,
    pub layer: i32,
}

/// Classify a node as hot (visible), warm (prefetch zone), or cold.
/// Returns: 0 = hot, 1 = warm, 2 = cold
pub fn classify_node(
    node_x: f64,
    node_y: f64,
    node_w: f64,
    node_h: f64,
    viewport: &Viewport,
) -> u8 {
    let half_w = (viewport.width / viewport.zoom) / 2.0;
    let half_h = (viewport.height / viewport.zoom) / 2.0;

    // Hot zone: visible viewport
    let vp_left = viewport.center.x - half_w;
    let vp_right = viewport.center.x + half_w;
    let vp_top = viewport.center.y - half_h;
    let vp_bottom = viewport.center.y + half_h;

    let node_right = node_x + node_w;
    let node_bottom = node_y + node_h;

    // Check if node intersects viewport (hot)
    if node_right >= vp_left && node_x <= vp_right && node_bottom >= vp_top && node_y <= vp_bottom {
        return 0; // hot
    }

    // Warm zone: 1.5x viewport (prefetch buffer)
    let warm_factor = 1.5;
    let warm_half_w = half_w * warm_factor;
    let warm_half_h = half_h * warm_factor;

    let warm_left = viewport.center.x - warm_half_w;
    let warm_right = viewport.center.x + warm_half_w;
    let warm_top = viewport.center.y - warm_half_h;
    let warm_bottom = viewport.center.y + warm_half_h;

    if node_right >= warm_left
        && node_x <= warm_right
        && node_bottom >= warm_top
        && node_y <= warm_bottom
    {
        return 1; // warm
    }

    2 // cold
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

    #[test]
    fn visible_node_is_hot() {
        assert_eq!(classify_node(400.0, 400.0, 200.0, 200.0, &vp()), 0);
    }

    #[test]
    fn far_node_is_cold() {
        assert_eq!(classify_node(5000.0, 5000.0, 200.0, 200.0, &vp()), 2);
    }

    #[test]
    fn prefetch_node_is_warm() {
        // Just outside viewport (left edge at -460) but within 1.5x warm zone (left at -940)
        // Node right edge at -700+200 = -500, which is < -460 (outside viewport)
        // but -500 > -940 (inside warm zone)
        assert_eq!(classify_node(-700.0, 500.0, 200.0, 200.0, &vp()), 1);
    }

    #[test]
    fn zoom_affects_classification() {
        // Node at x=1500 visible at zoom 0.5 (viewport wider)
        let zoomed_out = Viewport { zoom: 0.5, ..vp() };
        assert_eq!(classify_node(1500.0, 500.0, 200.0, 200.0, &zoomed_out), 0);

        // Same node invisible at zoom 2 (viewport narrower)
        let zoomed_in = Viewport { zoom: 2.0, ..vp() };
        assert_eq!(classify_node(1500.0, 500.0, 200.0, 200.0, &zoomed_in), 2);
    }
}
