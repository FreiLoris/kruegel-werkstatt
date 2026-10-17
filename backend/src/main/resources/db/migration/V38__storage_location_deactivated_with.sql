-- Using a storage location again brings back what was cleared out together with it – not a drawer
-- cleared out on its own before (decision of the workshop). The place whose clearing out took it along;
-- empty for the ones cleared out before (they come back with their place, as they did until now).
ALTER TABLE storage_location ADD COLUMN deactivated_with uuid;
