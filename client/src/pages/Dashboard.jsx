import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { stockApi } from '../api/axios';
import Spinner from '../components/common/Spinner';
import {
  MdBarChart,
  MdInventory,
  MdLocalShipping,
  MdPlaylistAdd,
  MdTrendingUp,
  MdWarehouse,
} from 'react-icons/md';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card flex items-start gap-4 p-4 sm:p-6">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${color}`}>
        <Icon className="text-2xl text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-800 sm:text-2xl">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockApi.getStats()
      .then((response) => setStats(response.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;

  const data = stats || {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white sm:p-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Welcome back</h2>
        <p className="mt-1 text-sm text-blue-100">
          Here is a quick view of your current stock movement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={MdInventory} label="Total Stock Entries" value={data.totalStocks ?? 0} color="bg-blue-500" />
        <StatCard
          icon={MdTrendingUp}
          label="Regular / Mix"
          value={`${data.regularCount ?? 0} / ${data.mixCount ?? 0}`}
          color="bg-purple-500"
        />
        <StatCard
          icon={MdWarehouse}
          label="Total Meters Received"
          value={`${(data.totalReceived ?? 0).toFixed(2)} m`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={MdLocalShipping}
          label="Total Meters Sold"
          value={`${(data.totalSold ?? 0).toFixed(2)} m`}
          color="bg-orange-500"
        />
        <StatCard
          icon={MdInventory}
          label="Total in Stock"
          value={`${(data.totalInStock ?? 0).toFixed(2)} m`}
          color="bg-cyan-500"
        />
      </div>

      <div className="card">
        <h3 className="mb-4 font-bold text-slate-800">Quick Actions</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/stocks/add" className="btn-primary w-full sm:w-auto">
            <MdPlaylistAdd className="text-lg" /> Add New Stock
          </Link>
          <Link to="/master" className="btn-secondary w-full sm:w-auto">
            Master Data
          </Link>
          <Link to="/reports" className="btn-secondary w-full sm:w-auto">
            <MdBarChart className="text-lg" /> View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
