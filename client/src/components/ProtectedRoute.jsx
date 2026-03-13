import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirstAllowedPath } from '../utils/permissions';

const ProtectedRoute = ({ children, moduleKey = '', action = 'view' }) => {
    const { user, hasPermission } = useAuth();
    const location = useLocation();

    if (!user) {
        // Redirect to login if user is not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (moduleKey && !hasPermission(moduleKey, action)) {
        const fallbackPath = getFirstAllowedPath(user.permissions || []);
        return <Navigate to={fallbackPath} replace />;
    }

    return children;
};

export default ProtectedRoute;
