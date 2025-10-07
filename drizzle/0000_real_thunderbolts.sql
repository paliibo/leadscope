CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`industry` text NOT NULL,
	`size_bucket` text NOT NULL,
	`country` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_domain_idx` ON `accounts` (`domain`);--> statement-breakpoint
CREATE INDEX `accounts_industry_idx` ON `accounts` (`industry`);--> statement-breakpoint
CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`rep_id` text NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`from_stage` text,
	`to_stage` text,
	`value_cents` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rep_id`) REFERENCES `reps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_lead_idx` ON `activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `activities_rep_idx` ON `activities` (`rep_id`);--> statement-breakpoint
CREATE INDEX `activities_created_idx` ON `activities` (`created_at`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`rep_id` text NOT NULL,
	`period` text NOT NULL,
	`target_cents` integer NOT NULL,
	FOREIGN KEY (`rep_id`) REFERENCES `reps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goals_rep_period_idx` ON `goals` (`rep_id`,`period`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`title` text NOT NULL,
	`account_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`stage` text DEFAULT 'new' NOT NULL,
	`source` text NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`board_rank` integer DEFAULT 0 NOT NULL,
	`lost_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `reps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `leads_owner_idx` ON `leads` (`owner_id`);--> statement-breakpoint
CREATE INDEX `leads_stage_idx` ON `leads` (`stage`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_closed_idx` ON `leads` (`closed_at`);--> statement-breakpoint
CREATE INDEX `leads_board_idx` ON `leads` (`stage`,`board_rank`);--> statement-breakpoint
CREATE TABLE `reps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'rep' NOT NULL,
	`job_title` text NOT NULL,
	`avatar_url` text,
	`team_id` text,
	`quota_cents` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reps_email_idx` ON `reps` (`email`);--> statement-breakpoint
CREATE INDEX `reps_team_idx` ON `reps` (`team_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
