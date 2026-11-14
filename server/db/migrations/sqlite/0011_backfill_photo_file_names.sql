-- Uploads with compression enabled used to be named after whichever variant
-- settled last, which was the thumbnail: "IMG_1234_thumb". The photo name is the
-- fallback title and og:title, so strip the suffix from existing rows.
--
-- `_` is a LIKE wildcard, hence the ESCAPE, and substr() (instead of REPLACE)
-- keeps a legitimate "_thumb" in the middle of a name intact.
UPDATE `photos`
SET `file_name` = substr(`file_name`, 1, length(`file_name`) - 6)
WHERE `file_name` LIKE '%\_thumb' ESCAPE '\'
  AND length(`file_name`) > 6;
