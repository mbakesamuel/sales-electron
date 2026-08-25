-- Remove mill stock blank report route permissions (feature dropped).

DELETE FROM RoleRoutePermission
WHERE routeId = 'mill-stock-report';
