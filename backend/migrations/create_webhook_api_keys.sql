-- ============================================
-- CREATE WEBHOOK API KEYS TABLE
-- ============================================
-- Description: Stores per-hostel API keys for Google Form webhook integration
-- Date: 2026-02-14

CREATE TABLE IF NOT EXISTS webhook_api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active TINYINT(1) DEFAULT 1,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for faster lookups
CREATE INDEX idx_webhook_api_keys_hostel ON webhook_api_keys(hostel_id);
CREATE INDEX idx_webhook_api_keys_active ON webhook_api_keys(api_key, is_active);
