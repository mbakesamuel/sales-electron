-- Remove weekly print pack route permissions (feature removed).
-- Safe to re-run.

DELETE FROM RoleRoutePermission WHERE routeId = 'weekly-print-pack';
