-- DK Service Enterprise Platform
-- PostgreSQL Schema (auto-generated from SQLAlchemy models)
-- Tables: 55

CREATE TABLE brands (
	id SERIAL NOT NULL, 
	name VARCHAR(150) NOT NULL, 
	slug VARCHAR(150) NOT NULL, 
	brand_role VARCHAR(20) NOT NULL, 
	logo_url VARCHAR(500), 
	country VARCHAR(100), 
	website VARCHAR(255), 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE INDEX ix_brands_id ON brands (id);
CREATE UNIQUE INDEX ix_brands_slug ON brands (slug);

CREATE TABLE maintenance_plans (
	id SERIAL NOT NULL, 
	plan_number VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	service_type VARCHAR(20) NOT NULL, 
	interval_type VARCHAR(10) NOT NULL, 
	interval_value INTEGER NOT NULL, 
	estimated_duration_hours FLOAT NOT NULL, 
	estimated_cost FLOAT NOT NULL, 
	checklist JSON, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_maintenance_plans_id ON maintenance_plans (id);
CREATE UNIQUE INDEX ix_maintenance_plans_plan_number ON maintenance_plans (plan_number);
CREATE INDEX ix_maintenance_plans_service_type ON maintenance_plans (service_type);

CREATE TABLE product_categories (
	id SERIAL NOT NULL, 
	parent_id INTEGER, 
	name_lo VARCHAR(200), 
	name_en VARCHAR(200) NOT NULL, 
	slug VARCHAR(200) NOT NULL, 
	level INTEGER NOT NULL, 
	description TEXT, 
	icon VARCHAR(100), 
	sort_order INTEGER NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES product_categories (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ix_product_categories_slug ON product_categories (slug);
CREATE INDEX ix_product_categories_id ON product_categories (id);
CREATE INDEX ix_product_categories_parent_id ON product_categories (parent_id);

CREATE TABLE revoked_tokens (
	id SERIAL NOT NULL, 
	jti VARCHAR(36) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_revoked_tokens_jti ON revoked_tokens (jti);
CREATE INDEX ix_revoked_tokens_id ON revoked_tokens (id);

CREATE TABLE roles (
	id SERIAL NOT NULL, 
	name VARCHAR(50) NOT NULL, 
	description VARCHAR(255), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_roles_name ON roles (name);
CREATE INDEX ix_roles_id ON roles (id);

CREATE TABLE warehouses (
	id SERIAL NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	address TEXT, 
	contact_name VARCHAR(200), 
	contact_phone VARCHAR(50), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_warehouses_id ON warehouses (id);
CREATE UNIQUE INDEX ix_warehouses_code ON warehouses (code);

CREATE TABLE forklift_models (
	id SERIAL NOT NULL, 
	brand_id INTEGER, 
	name VARCHAR(200) NOT NULL, 
	slug VARCHAR(200) NOT NULL, 
	series VARCHAR(100), 
	fuel_type VARCHAR(20), 
	capacity_kg FLOAT, 
	max_lift_height_mm INTEGER, 
	description TEXT, 
	is_active BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX ix_forklift_models_slug ON forklift_models (slug);
CREATE INDEX ix_forklift_models_id ON forklift_models (id);
CREATE INDEX ix_forklift_models_brand_id ON forklift_models (brand_id);

CREATE TABLE spare_parts (
	id SERIAL NOT NULL, 
	part_number VARCHAR(100) NOT NULL, 
	name VARCHAR(300) NOT NULL, 
	description TEXT, 
	part_category VARCHAR(20) NOT NULL, 
	brand_id INTEGER, 
	unit VARCHAR(30) NOT NULL, 
	unit_price FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	min_stock_level INTEGER NOT NULL, 
	reorder_quantity INTEGER NOT NULL, 
	lead_time_days INTEGER NOT NULL, 
	image_url VARCHAR(500), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL
);

CREATE INDEX ix_spare_parts_is_active ON spare_parts (is_active);
CREATE INDEX ix_spare_parts_part_category ON spare_parts (part_category);
CREATE INDEX ix_spare_parts_brand_id ON spare_parts (brand_id);
CREATE INDEX ix_spare_parts_id ON spare_parts (id);
CREATE INDEX ix_spare_parts_name ON spare_parts (name);
CREATE UNIQUE INDEX ix_spare_parts_part_number ON spare_parts (part_number);

CREATE TABLE users (
	id SERIAL NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	full_name VARCHAR(255), 
	is_active BOOLEAN NOT NULL, 
	is_superuser BOOLEAN NOT NULL, 
	role_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	last_login TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(role_id) REFERENCES roles (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE UNIQUE INDEX ix_users_username ON users (username);
CREATE INDEX ix_users_id ON users (id);

CREATE TABLE activity_logs (
	id SERIAL NOT NULL, 
	user_id INTEGER, 
	action VARCHAR(50) NOT NULL, 
	entity_type VARCHAR(50), 
	entity_id INTEGER, 
	details JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_activity_logs_created_at ON activity_logs (created_at);
CREATE INDEX ix_activity_logs_id ON activity_logs (id);
CREATE INDEX ix_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX ix_activity_logs_entity_id ON activity_logs (entity_id);
CREATE INDEX ix_activity_logs_entity_type ON activity_logs (entity_type);

CREATE TABLE customers (
	id SERIAL NOT NULL, 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100) NOT NULL, 
	email VARCHAR(255), 
	phone VARCHAR(20), 
	company VARCHAR(255), 
	status customerstatus NOT NULL, 
	notes TEXT, 
	assigned_to INTEGER, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE UNIQUE INDEX ix_customers_email ON customers (email);
CREATE INDEX ix_customers_id ON customers (id);

CREATE TABLE import_jobs (
	id SERIAL NOT NULL, 
	original_filename VARCHAR(255) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	total_rows INTEGER NOT NULL, 
	processed_rows INTEGER NOT NULL, 
	success_rows INTEGER NOT NULL, 
	error_rows INTEGER NOT NULL, 
	preview_data JSON, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_import_jobs_id ON import_jobs (id);

CREATE TABLE inventory_balances (
	id SERIAL NOT NULL, 
	spare_part_id INTEGER NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	quantity_on_hand FLOAT NOT NULL, 
	quantity_reserved FLOAT NOT NULL, 
	quantity_available FLOAT NOT NULL, 
	last_count_date TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_part_warehouse UNIQUE (spare_part_id, warehouse_id), 
	FOREIGN KEY(spare_part_id) REFERENCES spare_parts (id) ON DELETE CASCADE, 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE
);

CREATE INDEX ix_inventory_balances_warehouse_id ON inventory_balances (warehouse_id);
CREATE INDEX ix_inventory_balances_id ON inventory_balances (id);
CREATE INDEX ix_inventory_balances_spare_part_id ON inventory_balances (spare_part_id);

CREATE TABLE inventory_transactions (
	id SERIAL NOT NULL, 
	transaction_number VARCHAR(50) NOT NULL, 
	transaction_type VARCHAR(20) NOT NULL, 
	spare_part_id INTEGER NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit_cost FLOAT NOT NULL, 
	total_cost FLOAT NOT NULL, 
	reference_type VARCHAR(30), 
	reference_id INTEGER, 
	notes TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(spare_part_id) REFERENCES spare_parts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_inventory_transactions_warehouse_id ON inventory_transactions (warehouse_id);
CREATE INDEX ix_inventory_transactions_id ON inventory_transactions (id);
CREATE INDEX ix_inventory_transactions_transaction_type ON inventory_transactions (transaction_type);
CREATE INDEX ix_inventory_transactions_spare_part_id ON inventory_transactions (spare_part_id);
CREATE UNIQUE INDEX ix_inventory_transactions_transaction_number ON inventory_transactions (transaction_number);
CREATE INDEX ix_inventory_transactions_created_at ON inventory_transactions (created_at);

CREATE TABLE products (
	id SERIAL NOT NULL, 
	sku VARCHAR(100) NOT NULL, 
	name_lo VARCHAR(300), 
	name_en VARCHAR(300) NOT NULL, 
	slug VARCHAR(300) NOT NULL, 
	model_number VARCHAR(150), 
	brand_id INTEGER, 
	category_id INTEGER, 
	description_lo TEXT, 
	description_en TEXT, 
	is_active BOOLEAN NOT NULL, 
	is_featured BOOLEAN NOT NULL, 
	is_sale BOOLEAN NOT NULL, 
	is_rental BOOLEAN NOT NULL, 
	is_used_available BOOLEAN NOT NULL, 
	is_service_item BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL, 
	FOREIGN KEY(category_id) REFERENCES product_categories (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX ix_products_slug ON products (slug);
CREATE INDEX ix_products_name_en ON products (name_en);
CREATE INDEX ix_products_is_active ON products (is_active);
CREATE UNIQUE INDEX ix_products_sku ON products (sku);
CREATE INDEX ix_products_category_id ON products (category_id);
CREATE INDEX ix_products_id ON products (id);
CREATE INDEX ix_products_model_number ON products (model_number);
CREATE INDEX ix_products_brand_id ON products (brand_id);

CREATE TABLE purchase_orders (
	id SERIAL NOT NULL, 
	po_number VARCHAR(50) NOT NULL, 
	status VARCHAR(25) NOT NULL, 
	vendor VARCHAR(200) NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	order_date DATE NOT NULL, 
	expected_date DATE, 
	received_date DATE, 
	subtotal FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	total_amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	notes TEXT, 
	cancellation_reason TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_purchase_orders_id ON purchase_orders (id);
CREATE INDEX ix_purchase_orders_warehouse_id ON purchase_orders (warehouse_id);
CREATE UNIQUE INDEX ix_purchase_orders_po_number ON purchase_orders (po_number);
CREATE INDEX ix_purchase_orders_status ON purchase_orders (status);

CREATE TABLE forklifts (
	id SERIAL NOT NULL, 
	serial_number VARCHAR(100) NOT NULL, 
	slug VARCHAR(300) NOT NULL, 
	internal_code VARCHAR(50), 
	model_id INTEGER, 
	brand_id INTEGER, 
	customer_id INTEGER, 
	name_en VARCHAR(300) NOT NULL, 
	name_lo VARCHAR(300), 
	model_number VARCHAR(150), 
	status VARCHAR(30) NOT NULL, 
	condition VARCHAR(20) NOT NULL, 
	fuel_type VARCHAR(20), 
	capacity_kg FLOAT, 
	mast_type VARCHAR(50), 
	max_lift_height_mm INTEGER, 
	year_manufactured INTEGER, 
	purchase_date DATE, 
	warranty_expiry DATE, 
	initial_hour_meter FLOAT NOT NULL, 
	current_hour_meter FLOAT NOT NULL, 
	notes TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (internal_code), 
	FOREIGN KEY(model_id) REFERENCES forklift_models (id) ON DELETE SET NULL, 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX ix_forklifts_serial_number ON forklifts (serial_number);
CREATE UNIQUE INDEX ix_forklifts_slug ON forklifts (slug);
CREATE INDEX ix_forklifts_brand_id ON forklifts (brand_id);
CREATE INDEX ix_forklifts_is_active ON forklifts (is_active);
CREATE INDEX ix_forklifts_model_id ON forklifts (model_id);
CREATE INDEX ix_forklifts_name_en ON forklifts (name_en);
CREATE INDEX ix_forklifts_status ON forklifts (status);
CREATE INDEX ix_forklifts_id ON forklifts (id);
CREATE INDEX ix_forklifts_model_number ON forklifts (model_number);
CREATE INDEX ix_forklifts_customer_id ON forklifts (customer_id);

CREATE TABLE import_errors (
	id SERIAL NOT NULL, 
	job_id INTEGER NOT NULL, 
	sheet_name VARCHAR(200), 
	row_number INTEGER NOT NULL, 
	row_data JSON, 
	error_message TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(job_id) REFERENCES import_jobs (id) ON DELETE CASCADE
);

CREATE INDEX ix_import_errors_job_id ON import_errors (job_id);
CREATE INDEX ix_import_errors_id ON import_errors (id);

CREATE TABLE leads (
	id SERIAL NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	description TEXT, 
	value FLOAT, 
	source VARCHAR(50), 
	status leadstatus NOT NULL, 
	customer_id INTEGER, 
	assigned_to INTEGER, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE INDEX ix_leads_id ON leads (id);
CREATE INDEX ix_leads_assigned_to ON leads (assigned_to);
CREATE INDEX ix_leads_customer_id ON leads (customer_id);

CREATE TABLE product_compat_brands (
	id SERIAL NOT NULL, 
	product_id INTEGER NOT NULL, 
	brand_id INTEGER NOT NULL, 
	notes VARCHAR(300), 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE CASCADE
);

CREATE INDEX ix_product_compat_brands_id ON product_compat_brands (id);
CREATE INDEX ix_product_compat_brands_product_id ON product_compat_brands (product_id);
CREATE INDEX ix_product_compat_brands_brand_id ON product_compat_brands (brand_id);

CREATE TABLE product_images (
	id SERIAL NOT NULL, 
	product_id INTEGER NOT NULL, 
	image_url VARCHAR(500) NOT NULL, 
	alt_text VARCHAR(255), 
	is_primary BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX ix_product_images_id ON product_images (id);
CREATE INDEX ix_product_images_product_id ON product_images (product_id);

CREATE TABLE product_specs (
	id SERIAL NOT NULL, 
	product_id INTEGER NOT NULL, 
	spec_group VARCHAR(100) NOT NULL, 
	spec_key VARCHAR(100) NOT NULL, 
	spec_label VARCHAR(150) NOT NULL, 
	spec_value VARCHAR(500) NOT NULL, 
	spec_unit VARCHAR(50), 
	sort_order INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE INDEX ix_product_specs_product_id ON product_specs (product_id);
CREATE INDEX ix_product_specs_id ON product_specs (id);

CREATE TABLE purchase_order_items (
	id SERIAL NOT NULL, 
	purchase_order_id INTEGER NOT NULL, 
	spare_part_id INTEGER NOT NULL, 
	quantity_ordered FLOAT NOT NULL, 
	quantity_received FLOAT NOT NULL, 
	unit_cost FLOAT NOT NULL, 
	line_total FLOAT NOT NULL, 
	notes VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE, 
	FOREIGN KEY(spare_part_id) REFERENCES spare_parts (id) ON DELETE RESTRICT
);

CREATE INDEX ix_purchase_order_items_id ON purchase_order_items (id);
CREATE INDEX ix_purchase_order_items_spare_part_id ON purchase_order_items (spare_part_id);
CREATE INDEX ix_purchase_order_items_purchase_order_id ON purchase_order_items (purchase_order_id);

CREATE TABLE forklift_documents (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	document_type VARCHAR(30) NOT NULL, 
	title VARCHAR(300) NOT NULL, 
	file_url VARCHAR(500) NOT NULL, 
	file_size_bytes INTEGER, 
	mime_type VARCHAR(100), 
	expiry_date DATE, 
	notes VARCHAR(500), 
	uploaded_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_documents_id ON forklift_documents (id);
CREATE INDEX ix_forklift_documents_expiry_date ON forklift_documents (expiry_date);
CREATE INDEX ix_forklift_documents_forklift_id ON forklift_documents (forklift_id);

CREATE TABLE forklift_hour_meter_logs (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	reading FLOAT NOT NULL, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	source VARCHAR(30) NOT NULL, 
	notes VARCHAR(500), 
	recorded_by INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(recorded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_hour_meter_logs_id ON forklift_hour_meter_logs (id);
CREATE INDEX ix_forklift_hour_meter_logs_forklift_id ON forklift_hour_meter_logs (forklift_id);
CREATE INDEX ix_forklift_hour_meter_logs_recorded_at ON forklift_hour_meter_logs (recorded_at);

CREATE TABLE forklift_locations (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	location_name VARCHAR(200) NOT NULL, 
	warehouse_zone VARCHAR(100), 
	address TEXT, 
	customer_id INTEGER, 
	effective_date DATE NOT NULL, 
	notes VARCHAR(500), 
	recorded_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL, 
	FOREIGN KEY(recorded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_locations_forklift_id ON forklift_locations (forklift_id);
CREATE INDEX ix_forklift_locations_id ON forklift_locations (id);
CREATE INDEX ix_forklift_locations_effective_date ON forklift_locations (effective_date);

CREATE TABLE forklift_ownership_costs (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	cost_type VARCHAR(30) NOT NULL, 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	cost_date DATE NOT NULL, 
	description VARCHAR(500), 
	vendor VARCHAR(200), 
	reference_number VARCHAR(100), 
	recorded_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(recorded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_ownership_costs_id ON forklift_ownership_costs (id);
CREATE INDEX ix_forklift_ownership_costs_cost_type ON forklift_ownership_costs (cost_type);
CREATE INDEX ix_forklift_ownership_costs_forklift_id ON forklift_ownership_costs (forklift_id);
CREATE INDEX ix_forklift_ownership_costs_cost_date ON forklift_ownership_costs (cost_date);

CREATE TABLE forklift_photos (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	image_url VARCHAR(500) NOT NULL, 
	thumbnail_url VARCHAR(500), 
	alt_text VARCHAR(255), 
	caption VARCHAR(500), 
	is_primary BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	taken_at DATE, 
	uploaded_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_photos_forklift_id ON forklift_photos (forklift_id);
CREATE INDEX ix_forklift_photos_id ON forklift_photos (id);

CREATE TABLE forklift_status_history (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	from_status VARCHAR(30), 
	to_status VARCHAR(30) NOT NULL, 
	reason VARCHAR(500), 
	changed_by INTEGER, 
	changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_forklift_status_history_changed_at ON forklift_status_history (changed_at);
CREATE INDEX ix_forklift_status_history_forklift_id ON forklift_status_history (forklift_id);
CREATE INDEX ix_forklift_status_history_id ON forklift_status_history (id);

CREATE TABLE lead_notes (
	id SERIAL NOT NULL, 
	lead_id INTEGER NOT NULL, 
	author_id INTEGER, 
	content TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(lead_id) REFERENCES leads (id) ON DELETE CASCADE, 
	FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_lead_notes_lead_id ON lead_notes (lead_id);
CREATE INDEX ix_lead_notes_id ON lead_notes (id);

CREATE TABLE maintenance_schedules (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	plan_id INTEGER NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	next_due_date DATE, 
	next_due_hours FLOAT, 
	last_service_date DATE, 
	last_service_hours FLOAT, 
	times_serviced INTEGER NOT NULL, 
	notes TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(plan_id) REFERENCES maintenance_plans (id) ON DELETE CASCADE
);

CREATE INDEX ix_maintenance_schedules_id ON maintenance_schedules (id);
CREATE INDEX ix_maintenance_schedules_plan_id ON maintenance_schedules (plan_id);
CREATE INDEX ix_maintenance_schedules_status ON maintenance_schedules (status);
CREATE INDEX ix_maintenance_schedules_forklift_id ON maintenance_schedules (forklift_id);
CREATE INDEX ix_maintenance_schedules_next_due_date ON maintenance_schedules (next_due_date);

CREATE TABLE quotations (
	id SERIAL NOT NULL, 
	quotation_number VARCHAR(50) NOT NULL, 
	revision_number INTEGER NOT NULL, 
	parent_id INTEGER, 
	quotation_type VARCHAR(30) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	title VARCHAR(500) NOT NULL, 
	customer_id INTEGER, 
	lead_id INTEGER, 
	assigned_to INTEGER, 
	contact_name VARCHAR(200), 
	contact_email VARCHAR(255), 
	contact_phone VARCHAR(50), 
	subtotal FLOAT NOT NULL, 
	tax_rate FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	discount_amount FLOAT NOT NULL, 
	total_amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	valid_from DATE, 
	valid_until DATE, 
	notes TEXT, 
	internal_notes TEXT, 
	converted_to_type VARCHAR(30), 
	converted_to_id INTEGER, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES quotations (id) ON DELETE SET NULL, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL, 
	FOREIGN KEY(lead_id) REFERENCES leads (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_to) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_quotations_customer_id ON quotations (customer_id);
CREATE INDEX ix_quotations_assigned_to ON quotations (assigned_to);
CREATE UNIQUE INDEX ix_quotations_quotation_number ON quotations (quotation_number);
CREATE INDEX ix_quotations_status ON quotations (status);
CREATE INDEX ix_quotations_quotation_type ON quotations (quotation_type);
CREATE INDEX ix_quotations_is_active ON quotations (is_active);
CREATE INDEX ix_quotations_parent_id ON quotations (parent_id);
CREATE INDEX ix_quotations_lead_id ON quotations (lead_id);
CREATE INDEX ix_quotations_valid_until ON quotations (valid_until);
CREATE INDEX ix_quotations_id ON quotations (id);

CREATE TABLE quotation_approvals (
	id SERIAL NOT NULL, 
	quotation_id INTEGER NOT NULL, 
	revision_number INTEGER NOT NULL, 
	decision VARCHAR(20) NOT NULL, 
	reason TEXT, 
	conditions TEXT, 
	decided_by INTEGER, 
	decided_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quotation_id) REFERENCES quotations (id) ON DELETE CASCADE, 
	FOREIGN KEY(decided_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_quotation_approvals_quotation_id ON quotation_approvals (quotation_id);
CREATE INDEX ix_quotation_approvals_id ON quotation_approvals (id);

CREATE TABLE quotation_items (
	id SERIAL NOT NULL, 
	quotation_id INTEGER NOT NULL, 
	line_number INTEGER NOT NULL, 
	item_type VARCHAR(30) NOT NULL, 
	forklift_id INTEGER, 
	product_id INTEGER, 
	description VARCHAR(1000) NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit VARCHAR(50) NOT NULL, 
	unit_price FLOAT NOT NULL, 
	discount_percent FLOAT NOT NULL, 
	line_total FLOAT NOT NULL, 
	rental_duration_days INTEGER, 
	rental_rate_period VARCHAR(20), 
	notes VARCHAR(500), 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quotation_id) REFERENCES quotations (id) ON DELETE CASCADE, 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE SET NULL, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE SET NULL
);

CREATE INDEX ix_quotation_items_product_id ON quotation_items (product_id);
CREATE INDEX ix_quotation_items_id ON quotation_items (id);
CREATE INDEX ix_quotation_items_forklift_id ON quotation_items (forklift_id);
CREATE INDEX ix_quotation_items_quotation_id ON quotation_items (quotation_id);

CREATE TABLE quotation_status_history (
	id SERIAL NOT NULL, 
	quotation_id INTEGER NOT NULL, 
	from_status VARCHAR(30), 
	to_status VARCHAR(30) NOT NULL, 
	reason VARCHAR(500), 
	changed_by INTEGER, 
	changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quotation_id) REFERENCES quotations (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_quotation_status_history_id ON quotation_status_history (id);
CREATE INDEX ix_quotation_status_history_quotation_id ON quotation_status_history (quotation_id);
CREATE INDEX ix_quotation_status_history_changed_at ON quotation_status_history (changed_at);

CREATE TABLE rental_contracts (
	id SERIAL NOT NULL, 
	contract_number VARCHAR(50) NOT NULL, 
	quotation_id INTEGER, 
	customer_id INTEGER NOT NULL, 
	lead_id INTEGER, 
	status VARCHAR(30) NOT NULL, 
	contract_type VARCHAR(20) NOT NULL, 
	revision_number INTEGER NOT NULL, 
	start_date DATE NOT NULL, 
	end_date DATE NOT NULL, 
	actual_start_date DATE, 
	actual_end_date DATE, 
	billing_cycle_day INTEGER NOT NULL, 
	payment_terms_days INTEGER NOT NULL, 
	deposit_amount FLOAT NOT NULL, 
	deposit_status VARCHAR(20) NOT NULL, 
	early_termination_fee_pct FLOAT NOT NULL, 
	late_return_penalty_pct FLOAT NOT NULL, 
	overtime_rate_pct FLOAT NOT NULL, 
	subtotal FLOAT NOT NULL, 
	tax_rate FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	discount_amount FLOAT NOT NULL, 
	total_value FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	delivery_address TEXT, 
	delivery_contact_name VARCHAR(200), 
	delivery_contact_phone VARCHAR(50), 
	notes TEXT, 
	internal_notes TEXT, 
	cancellation_reason TEXT, 
	reservation_expires_at TIMESTAMP WITH TIME ZONE, 
	assigned_to INTEGER, 
	approved_by INTEGER, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quotation_id) REFERENCES quotations (id) ON DELETE SET NULL, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE RESTRICT, 
	FOREIGN KEY(lead_id) REFERENCES leads (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_to) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(approved_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_contracts_lead_id ON rental_contracts (lead_id);
CREATE INDEX ix_rental_contracts_assigned_to ON rental_contracts (assigned_to);
CREATE UNIQUE INDEX ix_rental_contracts_contract_number ON rental_contracts (contract_number);
CREATE INDEX ix_rental_contracts_status ON rental_contracts (status);
CREATE INDEX ix_rental_contracts_customer_id ON rental_contracts (customer_id);
CREATE INDEX ix_rental_contracts_quotation_id ON rental_contracts (quotation_id);
CREATE INDEX ix_rental_contracts_is_active ON rental_contracts (is_active);
CREATE INDEX ix_rental_contracts_id ON rental_contracts (id);

CREATE TABLE work_orders (
	id SERIAL NOT NULL, 
	work_order_number VARCHAR(50) NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	schedule_id INTEGER, 
	plan_id INTEGER, 
	order_type VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	priority VARCHAR(10) NOT NULL, 
	title VARCHAR(300) NOT NULL, 
	description TEXT, 
	assigned_to INTEGER, 
	scheduled_date DATE NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	verified_at TIMESTAMP WITH TIME ZONE, 
	verified_by INTEGER, 
	hour_meter_at_service FLOAT, 
	estimated_hours FLOAT NOT NULL, 
	actual_hours FLOAT, 
	estimated_cost FLOAT NOT NULL, 
	actual_cost FLOAT, 
	findings TEXT, 
	resolution TEXT, 
	cancellation_reason TEXT, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(schedule_id) REFERENCES maintenance_schedules (id) ON DELETE SET NULL, 
	FOREIGN KEY(plan_id) REFERENCES maintenance_plans (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_to) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(verified_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_work_orders_order_type ON work_orders (order_type);
CREATE INDEX ix_work_orders_schedule_id ON work_orders (schedule_id);
CREATE UNIQUE INDEX ix_work_orders_work_order_number ON work_orders (work_order_number);
CREATE INDEX ix_work_orders_forklift_id ON work_orders (forklift_id);
CREATE INDEX ix_work_orders_assigned_to ON work_orders (assigned_to);
CREATE INDEX ix_work_orders_scheduled_date ON work_orders (scheduled_date);
CREATE INDEX ix_work_orders_id ON work_orders (id);
CREATE INDEX ix_work_orders_status ON work_orders (status);
CREATE INDEX ix_work_orders_priority ON work_orders (priority);

CREATE TABLE asset_movements (
	id SERIAL NOT NULL, 
	movement_number VARCHAR(50) NOT NULL, 
	movement_type VARCHAR(30) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	priority VARCHAR(10) NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	rental_contract_id INTEGER, 
	customer_id INTEGER, 
	from_location VARCHAR(200) NOT NULL, 
	from_address TEXT, 
	to_location VARCHAR(200) NOT NULL, 
	to_address TEXT, 
	scheduled_date DATE NOT NULL, 
	actual_departure TIMESTAMP WITH TIME ZONE, 
	actual_arrival TIMESTAMP WITH TIME ZONE, 
	departure_hour_meter FLOAT, 
	arrival_hour_meter FLOAT, 
	assigned_driver_id INTEGER, 
	tracking_code VARCHAR(100), 
	notes TEXT, 
	internal_notes TEXT, 
	cancellation_reason TEXT, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(rental_contract_id) REFERENCES rental_contracts (id) ON DELETE SET NULL, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_driver_id) REFERENCES users (id) ON DELETE SET NULL, 
	UNIQUE (tracking_code), 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_asset_movements_customer_id ON asset_movements (customer_id);
CREATE INDEX ix_asset_movements_status ON asset_movements (status);
CREATE INDEX ix_asset_movements_forklift_id ON asset_movements (forklift_id);
CREATE INDEX ix_asset_movements_rental_contract_id ON asset_movements (rental_contract_id);
CREATE INDEX ix_asset_movements_assigned_driver_id ON asset_movements (assigned_driver_id);
CREATE INDEX ix_asset_movements_id ON asset_movements (id);
CREATE INDEX ix_asset_movements_scheduled_date ON asset_movements (scheduled_date);
CREATE UNIQUE INDEX ix_asset_movements_movement_number ON asset_movements (movement_number);
CREATE INDEX ix_asset_movements_movement_type ON asset_movements (movement_type);

CREATE TABLE invoices (
	id SERIAL NOT NULL, 
	invoice_number VARCHAR(50) NOT NULL, 
	contract_id INTEGER NOT NULL, 
	customer_id INTEGER NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	issue_date DATE, 
	due_date DATE, 
	paid_date DATE, 
	subtotal FLOAT NOT NULL, 
	tax_rate FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	discount_amount FLOAT NOT NULL, 
	total_amount FLOAT NOT NULL, 
	amount_paid FLOAT NOT NULL, 
	balance_due FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	billing_period_start DATE, 
	billing_period_end DATE, 
	notes TEXT, 
	internal_notes TEXT, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancellation_reason TEXT, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE RESTRICT, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_invoices_contract_id ON invoices (contract_id);
CREATE INDEX ix_invoices_id ON invoices (id);
CREATE INDEX ix_invoices_status ON invoices (status);
CREATE INDEX ix_invoices_customer_id ON invoices (customer_id);
CREATE INDEX ix_invoices_is_active ON invoices (is_active);
CREATE UNIQUE INDEX ix_invoices_invoice_number ON invoices (invoice_number);

CREATE TABLE maintenance_costs (
	id SERIAL NOT NULL, 
	work_order_id INTEGER NOT NULL, 
	cost_type VARCHAR(20) NOT NULL, 
	description VARCHAR(300) NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit_rate FLOAT NOT NULL, 
	amount FLOAT NOT NULL, 
	vendor VARCHAR(200), 
	reference_number VARCHAR(100), 
	currency VARCHAR(3) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_order_id) REFERENCES work_orders (id) ON DELETE CASCADE
);

CREATE INDEX ix_maintenance_costs_id ON maintenance_costs (id);
CREATE INDEX ix_maintenance_costs_work_order_id ON maintenance_costs (work_order_id);

CREATE TABLE part_consumptions (
	id SERIAL NOT NULL, 
	spare_part_id INTEGER NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	work_order_id INTEGER, 
	forklift_id INTEGER, 
	quantity FLOAT NOT NULL, 
	unit_cost FLOAT NOT NULL, 
	total_cost FLOAT NOT NULL, 
	notes TEXT, 
	consumed_by INTEGER, 
	consumed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(spare_part_id) REFERENCES spare_parts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id) ON DELETE RESTRICT, 
	FOREIGN KEY(work_order_id) REFERENCES work_orders (id) ON DELETE SET NULL, 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE SET NULL, 
	FOREIGN KEY(consumed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_part_consumptions_id ON part_consumptions (id);
CREATE INDEX ix_part_consumptions_forklift_id ON part_consumptions (forklift_id);
CREATE INDEX ix_part_consumptions_consumed_at ON part_consumptions (consumed_at);
CREATE INDEX ix_part_consumptions_spare_part_id ON part_consumptions (spare_part_id);
CREATE INDEX ix_part_consumptions_warehouse_id ON part_consumptions (warehouse_id);
CREATE INDEX ix_part_consumptions_work_order_id ON part_consumptions (work_order_id);

CREATE TABLE payments (
	id SERIAL NOT NULL, 
	payment_number VARCHAR(50) NOT NULL, 
	customer_id INTEGER NOT NULL, 
	contract_id INTEGER, 
	payment_method VARCHAR(30) NOT NULL, 
	payment_status VARCHAR(20) NOT NULL, 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	payment_date DATE NOT NULL, 
	received_date DATE, 
	reference_number VARCHAR(100), 
	notes TEXT, 
	confirmed_by INTEGER, 
	confirmed_at TIMESTAMP WITH TIME ZONE, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE RESTRICT, 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE SET NULL, 
	FOREIGN KEY(confirmed_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX ix_payments_payment_number ON payments (payment_number);
CREATE INDEX ix_payments_customer_id ON payments (customer_id);
CREATE INDEX ix_payments_id ON payments (id);
CREATE INDEX ix_payments_payment_status ON payments (payment_status);
CREATE INDEX ix_payments_contract_id ON payments (contract_id);

CREATE TABLE rental_contract_items (
	id SERIAL NOT NULL, 
	contract_id INTEGER NOT NULL, 
	forklift_id INTEGER, 
	quotation_item_id INTEGER, 
	line_number INTEGER NOT NULL, 
	description VARCHAR(1000) NOT NULL, 
	monthly_rate FLOAT NOT NULL, 
	daily_rate FLOAT NOT NULL, 
	hourly_rate FLOAT, 
	contracted_hours_limit FLOAT, 
	maintenance_interval_hours FLOAT, 
	departure_hour_meter FLOAT, 
	return_hour_meter FLOAT, 
	hours_used FLOAT, 
	line_status VARCHAR(20) NOT NULL, 
	line_total FLOAT NOT NULL, 
	sort_order INTEGER NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE SET NULL, 
	FOREIGN KEY(quotation_item_id) REFERENCES quotation_items (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_contract_items_contract_id ON rental_contract_items (contract_id);
CREATE INDEX ix_rental_contract_items_forklift_id ON rental_contract_items (forklift_id);
CREATE INDEX ix_rental_contract_items_id ON rental_contract_items (id);

CREATE TABLE rental_contract_status_history (
	id SERIAL NOT NULL, 
	contract_id INTEGER NOT NULL, 
	from_status VARCHAR(30), 
	to_status VARCHAR(30) NOT NULL, 
	reason VARCHAR(500), 
	changed_by INTEGER, 
	changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_contract_status_history_contract_id ON rental_contract_status_history (contract_id);
CREATE INDEX ix_rental_contract_status_history_changed_at ON rental_contract_status_history (changed_at);
CREATE INDEX ix_rental_contract_status_history_id ON rental_contract_status_history (id);

CREATE TABLE rental_contract_terms (
	id SERIAL NOT NULL, 
	contract_id INTEGER NOT NULL, 
	term_category VARCHAR(30) NOT NULL, 
	term_key VARCHAR(100) NOT NULL, 
	term_label VARCHAR(300) NOT NULL, 
	term_value TEXT NOT NULL, 
	data_type VARCHAR(20) NOT NULL, 
	numeric_value FLOAT, 
	is_required BOOLEAN NOT NULL, 
	is_visible_to_customer BOOLEAN NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_rental_contract_terms_key UNIQUE (contract_id, term_key), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE
);

CREATE INDEX ix_rental_contract_terms_contract_id ON rental_contract_terms (contract_id);
CREATE INDEX ix_rental_contract_terms_id ON rental_contract_terms (id);

CREATE TABLE rental_extensions (
	id SERIAL NOT NULL, 
	contract_id INTEGER NOT NULL, 
	extension_number INTEGER NOT NULL, 
	original_end_date DATE NOT NULL, 
	new_end_date DATE NOT NULL, 
	rate_adjustment_pct FLOAT NOT NULL, 
	new_monthly_rate FLOAT, 
	reason TEXT, 
	status VARCHAR(20) NOT NULL, 
	conditions TEXT, 
	requested_by INTEGER, 
	approved_by INTEGER, 
	decided_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(requested_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(approved_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_extensions_contract_id ON rental_extensions (contract_id);
CREATE INDEX ix_rental_extensions_id ON rental_extensions (id);

CREATE TABLE service_history (
	id SERIAL NOT NULL, 
	forklift_id INTEGER NOT NULL, 
	work_order_id INTEGER, 
	service_type VARCHAR(20) NOT NULL, 
	service_date DATE NOT NULL, 
	technician_id INTEGER, 
	hour_meter_reading FLOAT, 
	duration_hours FLOAT, 
	total_cost FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	summary TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE CASCADE, 
	FOREIGN KEY(work_order_id) REFERENCES work_orders (id) ON DELETE SET NULL, 
	FOREIGN KEY(technician_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_service_history_work_order_id ON service_history (work_order_id);
CREATE INDEX ix_service_history_service_type ON service_history (service_type);
CREATE INDEX ix_service_history_forklift_id ON service_history (forklift_id);
CREATE INDEX ix_service_history_service_date ON service_history (service_date);
CREATE INDEX ix_service_history_id ON service_history (id);

CREATE TABLE deposits (
	id SERIAL NOT NULL, 
	deposit_number VARCHAR(50) NOT NULL, 
	contract_id INTEGER NOT NULL, 
	customer_id INTEGER NOT NULL, 
	deposit_type VARCHAR(20) NOT NULL, 
	deposit_status VARCHAR(30) NOT NULL, 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	received_date DATE, 
	refund_date DATE, 
	refund_amount FLOAT NOT NULL, 
	forfeit_amount FLOAT NOT NULL, 
	applied_amount FLOAT NOT NULL, 
	payment_id INTEGER, 
	refund_payment_id INTEGER, 
	notes TEXT, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(customer_id) REFERENCES customers (id) ON DELETE RESTRICT, 
	FOREIGN KEY(payment_id) REFERENCES payments (id) ON DELETE SET NULL, 
	FOREIGN KEY(refund_payment_id) REFERENCES payments (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_deposits_customer_id ON deposits (customer_id);
CREATE UNIQUE INDEX ix_deposits_deposit_number ON deposits (deposit_number);
CREATE INDEX ix_deposits_contract_id ON deposits (contract_id);
CREATE INDEX ix_deposits_id ON deposits (id);
CREATE INDEX ix_deposits_deposit_status ON deposits (deposit_status);

CREATE TABLE movement_history (
	id SERIAL NOT NULL, 
	movement_id INTEGER NOT NULL, 
	from_status VARCHAR(20), 
	to_status VARCHAR(20) NOT NULL, 
	location VARCHAR(200), 
	latitude FLOAT, 
	longitude FLOAT, 
	notes TEXT, 
	recorded_by INTEGER, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(movement_id) REFERENCES asset_movements (id) ON DELETE CASCADE, 
	FOREIGN KEY(recorded_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_movement_history_movement_id ON movement_history (movement_id);
CREATE INDEX ix_movement_history_recorded_at ON movement_history (recorded_at);
CREATE INDEX ix_movement_history_id ON movement_history (id);

CREATE TABLE payment_allocations (
	id SERIAL NOT NULL, 
	payment_id INTEGER NOT NULL, 
	invoice_id INTEGER NOT NULL, 
	allocated_amount FLOAT NOT NULL, 
	allocated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	allocated_by INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(payment_id) REFERENCES payments (id) ON DELETE CASCADE, 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE CASCADE, 
	FOREIGN KEY(allocated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_payment_allocations_invoice_id ON payment_allocations (invoice_id);
CREATE INDEX ix_payment_allocations_payment_id ON payment_allocations (payment_id);
CREATE INDEX ix_payment_allocations_id ON payment_allocations (id);

CREATE TABLE rental_billing_cycles (
	id SERIAL NOT NULL, 
	billing_number VARCHAR(50) NOT NULL, 
	contract_id INTEGER NOT NULL, 
	contract_item_id INTEGER, 
	billing_type VARCHAR(30) NOT NULL, 
	description VARCHAR(500) NOT NULL, 
	period_start DATE, 
	period_end DATE, 
	quantity FLOAT NOT NULL, 
	unit_rate FLOAT NOT NULL, 
	amount FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	total_amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	is_credit BOOLEAN NOT NULL, 
	payment_status VARCHAR(20) NOT NULL, 
	invoice_id INTEGER, 
	due_date DATE, 
	paid_date DATE, 
	generated_by VARCHAR(20) NOT NULL, 
	notes TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (billing_number), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(contract_item_id) REFERENCES rental_contract_items (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_billing_cycles_contract_item_id ON rental_billing_cycles (contract_item_id);
CREATE INDEX ix_rental_billing_cycles_payment_status ON rental_billing_cycles (payment_status);
CREATE INDEX ix_rental_billing_cycles_contract_id ON rental_billing_cycles (contract_id);
CREATE INDEX ix_rental_billing_cycles_billing_type ON rental_billing_cycles (billing_type);
CREATE INDEX ix_rental_billing_cycles_id ON rental_billing_cycles (id);

CREATE TABLE rental_returns (
	id SERIAL NOT NULL, 
	return_number VARCHAR(50) NOT NULL, 
	contract_id INTEGER NOT NULL, 
	contract_item_id INTEGER, 
	forklift_id INTEGER, 
	return_type VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	is_early_termination BOOLEAN NOT NULL, 
	early_termination_reason TEXT, 
	requested_date DATE NOT NULL, 
	scheduled_pickup_date DATE, 
	actual_pickup_date DATE, 
	actual_received_date DATE, 
	pickup_address TEXT, 
	departure_hour_meter FLOAT, 
	arrival_hour_meter FLOAT, 
	condition_rating INTEGER, 
	overall_condition VARCHAR(20), 
	exterior_notes TEXT, 
	mechanical_pass BOOLEAN, 
	safety_equipment_pass BOOLEAN, 
	photo_urls JSON, 
	customer_signoff_url VARCHAR(500), 
	assigned_driver INTEGER, 
	inspected_by INTEGER, 
	notes TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (return_number), 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(contract_item_id) REFERENCES rental_contract_items (id) ON DELETE SET NULL, 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_driver) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(inspected_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_returns_contract_item_id ON rental_returns (contract_item_id);
CREATE INDEX ix_rental_returns_contract_id ON rental_returns (contract_id);
CREATE INDEX ix_rental_returns_forklift_id ON rental_returns (forklift_id);
CREATE INDEX ix_rental_returns_id ON rental_returns (id);

CREATE TABLE invoice_items (
	id SERIAL NOT NULL, 
	invoice_id INTEGER NOT NULL, 
	billing_cycle_id INTEGER, 
	line_number INTEGER NOT NULL, 
	description VARCHAR(500) NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit_rate FLOAT NOT NULL, 
	amount FLOAT NOT NULL, 
	tax_amount FLOAT NOT NULL, 
	line_total FLOAT NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE CASCADE, 
	FOREIGN KEY(billing_cycle_id) REFERENCES rental_billing_cycles (id) ON DELETE SET NULL
);

CREATE INDEX ix_invoice_items_billing_cycle_id ON invoice_items (billing_cycle_id);
CREATE INDEX ix_invoice_items_id ON invoice_items (id);
CREATE INDEX ix_invoice_items_invoice_id ON invoice_items (invoice_id);

CREATE TABLE rental_damage_reports (
	id SERIAL NOT NULL, 
	report_number VARCHAR(50) NOT NULL, 
	return_id INTEGER NOT NULL, 
	contract_id INTEGER NOT NULL, 
	forklift_id INTEGER, 
	damage_category VARCHAR(30) NOT NULL, 
	component VARCHAR(100), 
	description TEXT NOT NULL, 
	photo_urls JSON, 
	repair_cost FLOAT NOT NULL, 
	parts_cost FLOAT NOT NULL, 
	downtime_days INTEGER NOT NULL, 
	downtime_cost FLOAT NOT NULL, 
	total_charge FLOAT NOT NULL, 
	final_charge FLOAT, 
	is_customer_liable BOOLEAN NOT NULL, 
	dispute_status VARCHAR(20) NOT NULL, 
	dispute_reason TEXT, 
	dispute_resolution TEXT, 
	dispute_resolved_by INTEGER, 
	dispute_resolved_at TIMESTAMP WITH TIME ZONE, 
	assessed_by INTEGER, 
	assessed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (report_number), 
	FOREIGN KEY(return_id) REFERENCES rental_returns (id) ON DELETE CASCADE, 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE CASCADE, 
	FOREIGN KEY(forklift_id) REFERENCES forklifts (id) ON DELETE SET NULL, 
	FOREIGN KEY(dispute_resolved_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(assessed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_rental_damage_reports_id ON rental_damage_reports (id);
CREATE INDEX ix_rental_damage_reports_forklift_id ON rental_damage_reports (forklift_id);
CREATE INDEX ix_rental_damage_reports_return_id ON rental_damage_reports (return_id);
CREATE INDEX ix_rental_damage_reports_contract_id ON rental_damage_reports (contract_id);

CREATE TABLE revenue_recognitions (
	id SERIAL NOT NULL, 
	recognition_number VARCHAR(50) NOT NULL, 
	invoice_id INTEGER, 
	invoice_item_id INTEGER, 
	contract_id INTEGER NOT NULL, 
	recognition_type VARCHAR(30) NOT NULL, 
	recognition_status VARCHAR(20) NOT NULL, 
	recognition_date DATE NOT NULL, 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	period_start DATE, 
	period_end DATE, 
	description VARCHAR(500), 
	notes TEXT, 
	created_by INTEGER, 
	updated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id) ON DELETE SET NULL, 
	FOREIGN KEY(invoice_item_id) REFERENCES invoice_items (id) ON DELETE SET NULL, 
	FOREIGN KEY(contract_id) REFERENCES rental_contracts (id) ON DELETE RESTRICT, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_revenue_recognitions_id ON revenue_recognitions (id);
CREATE INDEX ix_revenue_recognitions_recognition_status ON revenue_recognitions (recognition_status);
CREATE INDEX ix_revenue_recognitions_contract_id ON revenue_recognitions (contract_id);
CREATE UNIQUE INDEX ix_revenue_recognitions_recognition_number ON revenue_recognitions (recognition_number);
CREATE INDEX ix_revenue_recognitions_invoice_id ON revenue_recognitions (invoice_id);
