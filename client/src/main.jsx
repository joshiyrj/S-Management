import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, initializeTheme } from './contexts/ThemeContext';
import App from './App';
import './index.css';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 18, right: 18 }}
        toastOptions={{
          duration: 3200,
          className: 'app-toast',
          style: {
            fontSize: '13px',
            lineHeight: '1.35',
          },
          success: {
            className: 'app-toast app-toast-success',
            iconTheme: { primary: '#34d399', secondary: '#f8fafc' },
          },
          error: {
            className: 'app-toast app-toast-error',
            iconTheme: { primary: '#f87171', secondary: '#f8fafc' },
          },
          loading: {
            className: 'app-toast app-toast-loading',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
