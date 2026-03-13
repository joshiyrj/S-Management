import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import MasterData from './pages/MasterData';
import StockList from './pages/Stock/StockList';
import AddEditStock from './pages/Stock/AddEditStock';
import Reports from './pages/Reports/Reports';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ProtectedRoute moduleKey="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="master" element={<ProtectedRoute moduleKey="master_data"><MasterData /></ProtectedRoute>} />
        <Route path="stocks" element={<ProtectedRoute moduleKey="stock_list"><StockList /></ProtectedRoute>} />
        <Route path="stocks/add" element={<ProtectedRoute moduleKey="stock_entry"><AddEditStock /></ProtectedRoute>} />
        <Route path="stocks/edit/:id" element={<ProtectedRoute moduleKey="stock_entry"><AddEditStock /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute moduleKey="reports"><Reports /></ProtectedRoute>} />
        {/* Roles & permissions module intentionally hidden from website navigation and routing */}
        <Route path="roles/*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
