-- Raise content-production bucket size limit to 500MB
-- Large video files and multi-image assets for content production require this
UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500 MB
WHERE id = 'content-production';
