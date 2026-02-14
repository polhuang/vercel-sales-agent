CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`sf_id` text,
	`name` text NOT NULL,
	`industry` text,
	`website` text,
	`employee_count` integer,
	`annual_revenue` integer,
	`billing_city` text,
	`billing_state` text,
	`billing_country` text,
	`owner` text,
	`description` text,
	`tech_stack` text,
	`custom_fields` text,
	`sync_status` text DEFAULT 'local_only',
	`sf_last_modified` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_sf_id_unique` ON `accounts` (`sf_id`);--> statement-breakpoint
CREATE TABLE `campaign_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`current_step_id` text,
	`status` text DEFAULT 'active',
	`next_send_at` text,
	`enrolled_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_step_id`) REFERENCES `campaign_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_events` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`step_id` text NOT NULL,
	`type` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `campaign_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`step_id`) REFERENCES `campaign_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`step_number` integer NOT NULL,
	`type` text NOT NULL,
	`subject` text,
	`body` text,
	`wait_days` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft',
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_name` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`source` text NOT NULL,
	`source_detail` text,
	`is_reverted` integer DEFAULT false,
	`reverted_by` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `column_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`view_type` text NOT NULL,
	`field_key` text NOT NULL,
	`label` text NOT NULL,
	`data_type` text NOT NULL,
	`options` text,
	`position` integer NOT NULL,
	`is_visible` integer DEFAULT true,
	`width` integer DEFAULT 150,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`sf_id` text,
	`account_id` text,
	`first_name` text,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`title` text,
	`department` text,
	`linkedin_url` text,
	`role` text,
	`custom_fields` text,
	`sync_status` text DEFAULT 'local_only',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_sf_id_unique` ON `contacts` (`sf_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`opportunity_id` text,
	`account_id` text,
	`contact_id` text,
	`extracted_fields` text,
	`extraction_status` text DEFAULT 'pending',
	`is_pinned` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`sf_id` text,
	`account_id` text,
	`name` text NOT NULL,
	`stage` text,
	`stage_number` integer,
	`amount` real,
	`close_date` text,
	`probability` integer,
	`type` text,
	`primary_contact_id` text,
	`owner` text,
	`next_step` text,
	`metrics` text,
	`economic_buyer` text,
	`decision_criteria` text,
	`decision_criteria_quality` text,
	`decision_process` text,
	`identified_pain` text,
	`implicated_pain` text,
	`pain_quality` text,
	`champion` text,
	`competition` text,
	`competitors` text,
	`value_driver` text,
	`partner_identified` text,
	`tech_stack` text,
	`workload_url` text,
	`technical_win_status` text,
	`paper_process` text,
	`paper_process_quality` text,
	`win_reason` text,
	`vercel_solution` text,
	`closed_won_checklist` text,
	`prospector` text,
	`custom_fields` text,
	`sync_status` text DEFAULT 'local_only',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_sf_id_unique` ON `opportunities` (`sf_id`);