CREATE TABLE stock_items(sku VARCHAR(100) PRIMARY KEY,on_hand INTEGER NOT NULL CHECK(on_hand>=0),reserved INTEGER NOT NULL CHECK(reserved>=0 AND reserved<=on_hand),version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE reservation_batches(order_id UUID PRIMARY KEY,status VARCHAR(20) NOT NULL CHECK(status IN ('NEW','RESERVED','FAILED','RELEASED','COMMITTED')));
CREATE TABLE stock_reservations(id UUID PRIMARY KEY,order_id UUID NOT NULL REFERENCES reservation_batches(order_id),sku VARCHAR(100) NOT NULL REFERENCES stock_items(sku),quantity INTEGER NOT NULL CHECK(quantity>0),status VARCHAR(20) NOT NULL CHECK(status IN ('RESERVED','RELEASED','COMMITTED')),UNIQUE(order_id,sku));
CREATE INDEX idx_reservation_order ON stock_reservations(order_id);
