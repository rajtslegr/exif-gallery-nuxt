PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`file_modified` integer,
	`jpeg` text,
	`webp` text,
	`avif` text,
	`thumbnail` text,
	`title` text,
	`caption` text,
	`semantic_description` text,
	`make` text,
	`model` text,
	`focal_length` real,
	`focal_length_in_35mm_format` real,
	`lens_make` text,
	`lens_model` text,
	`f_number` real,
	`iso` integer,
	`exposure_time` real,
	`exposure_compensation` real,
	`location_name` text,
	`latitude` real,
	`longitude` real,
	`taken_at` integer,
	`aspect_ratio` real,
	`priority_order` real,
	`updated_at` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
INSERT INTO `__new_photos`("id", "file_name", "file_modified", "jpeg", "webp", "avif", "thumbnail", "title", "caption", "semantic_description", "make", "model", "focal_length", "focal_length_in_35mm_format", "lens_make", "lens_model", "f_number", "iso", "exposure_time", "exposure_compensation", "location_name", "latitude", "longitude", "taken_at", "aspect_ratio", "priority_order", "updated_at", "created_at") SELECT "id", "file_name", "file_modified", "jpeg", "webp", "avif", "thumbnail", "title", "caption", "semantic_description", "make", "model", "focal_length", "focal_length_in_35mm_format", "lens_make", "lens_model", "f_number", "iso", "exposure_time", "exposure_compensation", "location_name", "latitude", "longitude", "taken_at", "aspect_ratio", "priority_order", "updated_at", "created_at" FROM `photos`;--> statement-breakpoint
DROP TABLE `photos`;--> statement-breakpoint
ALTER TABLE `__new_photos` RENAME TO `photos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_photos_taken_at` ON `photos` (`taken_at`);--> statement-breakpoint
CREATE INDEX `idx_photos_created_at` ON `photos` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_photos_priority_order` ON `photos` (`priority_order`);--> statement-breakpoint
CREATE INDEX `idx_photos_make_model` ON `photos` (`make`,`model`);--> statement-breakpoint
CREATE INDEX `idx_photos_lens_model` ON `photos` (`lens_model`);--> statement-breakpoint
CREATE TABLE `__new_photo_tags` (
	`photo_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	PRIMARY KEY(`photo_id`, `tag_id`),
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_photo_tags`("photo_id", "tag_id", "created_at") SELECT "photo_id", "tag_id", "created_at" FROM `photo_tags`;--> statement-breakpoint
DROP TABLE `photo_tags`;--> statement-breakpoint
ALTER TABLE `__new_photo_tags` RENAME TO `photo_tags`;--> statement-breakpoint
CREATE INDEX `idx_photo_tags_photo_id` ON `photo_tags` (`photo_id`);--> statement-breakpoint
CREATE INDEX `idx_photo_tags_tag_id_photo_id` ON `photo_tags` (`tag_id`,`photo_id`);--> statement-breakpoint
CREATE TABLE `__new_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`photo_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
INSERT INTO `__new_tags`("id", "name", "photo_count", "created_at") SELECT "id", "name", "photo_count", "created_at" FROM `tags`;--> statement-breakpoint
DROP TABLE `tags`;--> statement-breakpoint
ALTER TABLE `__new_tags` RENAME TO `tags`;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tags_photo_count` ON `tags` (`photo_count`);--> statement-breakpoint
-- The old CURRENT_TIMESTAMP default stored text; normalise the existing rows to seconds
UPDATE `photos` SET `created_at` = CAST(strftime('%s', `created_at`) AS INTEGER) WHERE `created_at` IS NOT NULL AND typeof(`created_at`) = 'text';--> statement-breakpoint
UPDATE `photos` SET `updated_at` = CAST(strftime('%s', `updated_at`) AS INTEGER) WHERE `updated_at` IS NOT NULL AND typeof(`updated_at`) = 'text';--> statement-breakpoint
UPDATE `tags` SET `created_at` = CAST(strftime('%s', `created_at`) AS INTEGER) WHERE `created_at` IS NOT NULL AND typeof(`created_at`) = 'text';--> statement-breakpoint
UPDATE `photo_tags` SET `created_at` = CAST(strftime('%s', `created_at`) AS INTEGER) WHERE `created_at` IS NOT NULL AND typeof(`created_at`) = 'text';
