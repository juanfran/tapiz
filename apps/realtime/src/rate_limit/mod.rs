use std::time::Instant;

/// Token-bucket rate limiter for WebSocket messages.
/// Allows `capacity` messages per `refill_interval`.
pub struct RateLimiter {
    tokens: f64,
    capacity: f64,
    refill_rate: f64, // tokens per second
    last_refill: Instant,
}

impl RateLimiter {
    /// Create a rate limiter.
    /// - `messages_per_second`: sustained message rate
    /// - `burst`: maximum burst size
    pub fn new(messages_per_second: f64, burst: usize) -> Self {
        Self {
            tokens: burst as f64,
            capacity: burst as f64,
            refill_rate: messages_per_second,
            last_refill: Instant::now(),
        }
    }

    /// Check if a message is allowed. Returns true if within rate limit.
    pub fn check(&mut self) -> bool {
        self.refill();
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + elapsed * self.refill_rate).min(self.capacity);
        self.last_refill = now;
    }
}

/// Default rate limits per connection type.
pub fn yjs_limiter() -> RateLimiter {
    // 120 Yjs updates/sec sustained, burst of 200
    RateLimiter::new(120.0, 200)
}

pub fn presence_limiter() -> RateLimiter {
    // 30 cursor updates/sec sustained, burst of 60
    RateLimiter::new(30.0, 60)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_within_burst() {
        let mut limiter = RateLimiter::new(10.0, 5);
        for _ in 0..5 {
            assert!(limiter.check());
        }
        // Burst exhausted
        assert!(!limiter.check());
    }

    #[test]
    fn refills_over_time() {
        let mut limiter = RateLimiter::new(1000.0, 1);
        assert!(limiter.check());
        assert!(!limiter.check());

        // Simulate time passing
        limiter.last_refill = Instant::now() - std::time::Duration::from_millis(10);
        assert!(limiter.check());
    }
}
