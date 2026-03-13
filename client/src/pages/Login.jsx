import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import { MoonStar, Package, SunMedium } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ username: '', password: '', form: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      username: username.trim() ? '' : 'Username is required',
      password: password.trim() ? '' : 'Password is required',
      form: '',
    };
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) {
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful', { id: 'login-success' });
      navigate(from, { replace: true });
    } else {
      setErrors((current) => ({ ...current, form: result.message || 'Invalid username or password' }));
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8 ${
      isDark ? 'bg-slate-950' : 'bg-slate-100'
    }`}>
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={toggleTheme} className="theme-toggle-btn">
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
        <div className={`rounded-2xl px-4 py-8 shadow-2xl sm:px-8 ${
          isDark
            ? 'border border-slate-700 bg-slate-800'
            : 'border border-slate-200 bg-white'
        }`}>
          <div className="mb-8 flex flex-col items-center">
            <div className={`mb-4 rounded-xl p-3 ${isDark ? 'bg-blue-600/20' : 'bg-blue-50'}`}>
              <Package className="h-10 w-10 text-blue-500" />
            </div>
            <h2 className={`text-center text-2xl font-extrabold sm:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Manihar Enterprises</h2>
            <p className={`mt-2 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Stock Management
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Username</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setErrors((current) => ({ ...current, username: '', form: '' }));
                  }}
                  className={`block w-full appearance-none rounded-md px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
                    isDark
                      ? `border ${errors.username ? 'border-red-400' : 'border-slate-600'} bg-slate-700 text-white placeholder-slate-400`
                      : `border ${errors.username ? 'border-red-400' : 'border-slate-300'} bg-white text-slate-900 placeholder-slate-400`
                  }`}
                  placeholder="Enter username"
                />
              </div>
              <p className={`form-feedback ${errors.username ? 'form-error' : 'text-transparent'}`}>{errors.username || 'x'}</p>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, password: '', form: '' }));
                  }}
                  className={`block w-full appearance-none rounded-md px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm ${
                    isDark
                      ? `border ${errors.password ? 'border-red-400' : 'border-slate-600'} bg-slate-700 text-white placeholder-slate-400`
                      : `border ${errors.password ? 'border-red-400' : 'border-slate-300'} bg-white text-slate-900 placeholder-slate-400`
                  }`}
                  placeholder="Enter password"
                />
              </div>
              <p className={`form-feedback ${errors.password ? 'form-error' : 'text-transparent'}`}>{errors.password || 'x'}</p>
              {errors.form ? <p className="form-error">{errors.form}</p> : null}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'
                }`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
