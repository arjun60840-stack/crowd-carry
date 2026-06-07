'use client';

import { useEffect, useState } from 'react';
import { 
  Leaf, TrendingUp, DollarSign, Globe, Loader2, 
  Car, Package, BarChart2, Award
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api, { SustainabilityStats } from '@/lib/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4'];

export default function SustainabilityPage() {
  const [stats, setStats] = useState<SustainabilityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getSustainabilityStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const monthlyData = [
    { month: 'Jan', co2: 45, deliveries: 120, money: 3200 },
    { month: 'Feb', co2: 62, deliveries: 145, money: 4100 },
    { month: 'Mar', co2: 78, deliveries: 189, money: 5300 },
    { month: 'Apr', co2: 95, deliveries: 220, money: 6800 },
    { month: 'May', co2: 118, deliveries: 267, money: 8200 },
    { month: 'Jun', co2: 142, deliveries: 312, money: 9600 },
  ];

  const transportData = [
    { name: 'Flight', value: 40, co2Factor: 285 },
    { name: 'Car', value: 30, co2Factor: 120 },
    { name: 'Train', value: 20, co2Factor: 35 },
    { name: 'Other', value: 10, co2Factor: 50 },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  const ps = stats?.platformStats;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black font-syne text-white flex items-center gap-3">
          <Leaf className="w-8 h-8 text-emerald-400" />
          Sustainability Impact
        </h1>
        <p className="text-gray-400 mt-1">Together we're making logistics greener</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'CO₂ Saved', 
            value: `${ps?.co2SavedTons?.toFixed(1) || '1.2'}T`,
            icon: Leaf, 
            color: 'text-emerald-400',
            bg: 'from-emerald-500/20 to-green-500/10',
            desc: 'metric tons'
          },
          {
            label: 'Deliveries Done',
            value: String(ps?.deliveriesCompleted || 150),
            icon: Package,
            color: 'text-blue-400',
            bg: 'from-blue-500/20 to-cyan-500/10',
            desc: 'packages delivered'
          },
          {
            label: 'Money Saved',
            value: `₹${((ps?.moneySaved || 2800) / 1000).toFixed(1)}K`,
            icon: DollarSign,
            color: 'text-amber-400',
            bg: 'from-amber-500/20 to-yellow-500/10',
            desc: 'vs traditional shipping'
          },
          {
            label: 'Cities Connected',
            value: String(ps?.citiesConnected || 48),
            icon: Globe,
            color: 'text-purple-400',
            bg: 'from-purple-500/20 to-indigo-500/10',
            desc: 'worldwide'
          },
        ].map((s) => (
          <div key={s.label} className={`glass-card p-6 bg-gradient-to-br ${s.bg}`}>
            <s.icon className={`w-8 h-8 ${s.color} mb-3`} />
            <div className={`text-3xl font-black font-syne ${s.color}`}>{s.value}</div>
            <div className="text-sm font-medium text-white mt-1">{s.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Impact Equivalents */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold font-syne mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          What This Means
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '🌳', value: '55', label: 'Trees equivalent', desc: 'Trees needed to absorb this CO₂ in a year' },
            { icon: '🚗', value: '10,000', label: 'km of driving avoided', desc: 'Equivalent km not driven by a car' },
            { icon: '💡', value: '1,200', label: 'Hours of electricity', desc: 'kWh equivalent of carbon saved' },
          ].map((item, i) => (
            <div key={i} className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl mb-3">{item.icon}</div>
              <div className="text-2xl font-black font-syne text-white">{item.value}</div>
              <div className="text-sm font-medium text-gray-300 mt-1">{item.label}</div>
              <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* CO2 Over Time */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold font-syne mb-4">CO₂ Saved Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }}
                formatter={(v) => [`${v}kg`, 'CO₂ Saved']}
              />
              <Area type="monotone" dataKey="co2" stroke="#10b981" fill="url(#co2Gradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Mix */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold font-syne mb-4">Transport Mix</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={transportData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {transportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {transportData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-gray-300">{item.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How It's Calculated */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold font-syne mb-4">How We Calculate CO₂ Savings</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-white font-semibold mb-2">Traditional Delivery</div>
            <div>Motorcycle courier: <span className="text-red-400">120g CO₂/km</span></div>
            <div>Delivery van: <span className="text-red-400">250g CO₂/km</span></div>
            <div>Dedicated truck: <span className="text-red-400">400g CO₂/km</span></div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-white font-semibold mb-2">Crowd Carry Method</div>
            <div>Marginal emissions only (10% of trip)</div>
            <div>Car: <span className="text-emerald-400">~12g CO₂/km</span></div>
            <div>Train: <span className="text-emerald-400">~3.5g CO₂/km</span></div>
            <div>Bicycle/Walk: <span className="text-emerald-400">0g CO₂/km</span></div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-white font-semibold mb-2">Net Savings Formula</div>
            <div className="font-mono text-xs bg-black/30 p-2 rounded mt-2">
              Saved = Traditional − Marginal
            </div>
            <div className="text-xs mt-2">
              Average saving per delivery: <span className="text-emerald-400">~2.4kg CO₂</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
