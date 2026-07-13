const fs = require("fs");
let s = fs.readFileSync("database/schema.sql", "utf8");

s = s.replace(
  "ENUM('pending','accepted','diagnosing','waiting_approval','repairing','repaired','delivered','cancelled') DEFAULT 'pending'",
  "ENUM('registered','pickup_done','admin_verified','received_center','under_diagnosis','under_repair','waiting_parts','repair_done','quality_test','ready_delivery','out_delivery','delivered','cancelled','rejected') DEFAULT 'registered'"
);

s = s.replace(
  "  gps_lat DECIMAL(10,7),\r\n  gps_lng DECIMAL(10,7),\r\n  notes TEXT,\r\n  created_at",
  "  gps_lat DECIMAL(10,7),\r\n  gps_lng DECIMAL(10,7),\r\n  pickup_address TEXT,\r\n  pickup_date TIMESTAMP NULL,\r\n  delivery_type ENUM('pickup','walkin','courier') DEFAULT 'pickup',\r\n  notes TEXT,\r\n  created_at"
);

fs.writeFileSync("database/schema.sql", s);
console.log("done");
