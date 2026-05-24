from prometheus_client import Counter

notification_sent_total = Counter("notification_sent_total", "Notifications sent", ["category"])
notification_failed_total = Counter("notification_failed_total", "Notifications failed", ["category", "error_code"])
notification_rate_limited_total = Counter("notification_rate_limited_total", "Notifications blocked by rate limit", ["category"])
notification_opt_out_total = Counter("notification_opt_out_total", "Notifications skipped due to preference", ["category"])
notification_retry_total = Counter("notification_retry_total", "Notification retry attempts", ["category"])
