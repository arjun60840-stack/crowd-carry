'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
  Package, Plane, Star, Shield, Leaf, ChevronRight, 
  MapPin, CheckCircle, ArrowRight, Zap, Users, TrendingUp,
  MessageSquare, Globe, Award, Lock, Clock
} from 'lucide-react';

// Animated Counter Hook
function useCountUp(end: number, duration: number = 2000, decimals: number = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  
  const start = () => {
    if (started) return;
    setStarted(true);
    const step = end / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(parseFloat(current.toFixed(decimals)));
      }
    }, 16);
  };

  return { count, start };
}

// Intersection Observer for animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// Stats Counter Component
function StatCounter({ value, suffix = '', prefix = '', label, decimals = 0 }: { 
  value: number; suffix?: string; prefix?: string; label: string; decimals?: number;
}) {
  const { count, start } = useCountUp(value, 2000, decimals);
  const { ref, inView } = useInView();
  
  useEffect(() => { if (inView) start(); }, [inView]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black gradient-text font-syne">
        {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.round(count)}{suffix}
      </div>
      <div className="text-gray-400 mt-2 text-sm">{label}</div>
    </div>
  );
}


export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black font-syne gradient-text">Crowd Carry</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#ai-engine" className="hover:text-white transition-colors">AI Engine</a>
            <a href="#sustainability" className="hover:text-white transition-colors">Sustainability</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-secondary text-sm px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-mesh" />
        

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm mb-8">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Crowdshipping Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-syne leading-none mb-6">
            <span className="text-white">Deliver</span>{' '}
            <span className="gradient-text">Smarter.</span>
            <br />
            <span className="text-white">Travel</span>{' '}
            <span className="gradient-text">Together.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Connect your package with travelers already heading to the same destination. 
            Cut delivery costs by up to <span className="text-white font-semibold">80%</span> and 
            reduce carbon emissions with every shipment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/register?role=USER" 
              className="btn-primary text-lg px-8 py-4 gap-3">
              <Package className="w-5 h-5" />
              Send a Package
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/register?role=TRAVELER" 
              className="btn-secondary text-lg px-8 py-4 gap-3">
              <Plane className="w-5 h-5" />
              Become a Carrier
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Secure & Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-400" />
              <span>Carbon Reducing</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>48+ Cities</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-indigo-500" />
          <div className="w-1 h-1 rounded-full bg-indigo-500" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value={15000} suffix="+" label="Deliveries Completed" />
            <StatCounter value={89} suffix="%" label="Cost Reduction" />
            <StatCounter value={45} suffix="+" label="Cities Connected" />
            <StatCounter value={1.2} suffix="T" label="CO₂ Saved" decimals={1} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm mb-4">
              Simple Process
            </div>
            <h2 className="text-4xl md:text-5xl font-black font-syne mb-4">
              How <span className="gradient-text">Crowd Carry</span> Works
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Three simple steps to get your package delivered sustainably
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                step: '01',
                title: 'Post Your Package',
                desc: 'Describe what you need delivered — our AI engine instantly calculates the best price and finds potential carriers.',
                color: 'from-indigo-500 to-purple-600',
              },
              {
                icon: Zap,
                step: '02',
                title: 'AI Finds Your Match',
                desc: 'Our proprietary algorithm analyzes 5 factors to score compatibility — route, timing, weight, rating, and reliability.',
                color: 'from-purple-500 to-pink-600',
              },
              {
                icon: CheckCircle,
                step: '03',
                title: 'Track & Receive',
                desc: 'Follow your package in real-time on our live map. Get notified at every milestone from pickup to delivery.',
                color: 'from-cyan-500 to-blue-600',
              },
            ].map((item, i) => (
              <div key={i} className="glass-card p-8 group hover:border-white/20 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-6xl font-black text-white/5 font-syne mb-4">{item.step}</div>
                <h3 className="text-xl font-bold font-syne mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Match Engine Section */}
      <section id="ai-engine" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 to-purple-900/20" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm mb-6">
                <Zap className="w-4 h-4" />
                Custom AI Engine
              </div>
              <h2 className="text-4xl md:text-5xl font-black font-syne mb-6">
                Smart Matching,{' '}
                <span className="gradient-text">Zero APIs</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Our proprietary matching algorithm scores every potential carrier-package pair 
                across 5 weighted factors — no black-box AI, full transparency, instant results.
              </p>

              <div className="space-y-4">
                {[
                  { label: 'Route Match', weight: 40, color: 'bg-indigo-500', score: 95 },
                  { label: 'Date Proximity', weight: 20, color: 'bg-purple-500', score: 88 },
                  { label: 'Weight Capacity', weight: 15, color: 'bg-cyan-500', score: 100 },
                  { label: 'Traveler Rating', weight: 15, color: 'bg-emerald-500', score: 92 },
                  { label: 'Success Rate', weight: 10, color: 'bg-amber-500', score: 85 },
                ].map((factor) => (
                  <div key={factor.label} className="flex items-center gap-4">
                    <div className="w-28 text-sm text-gray-400 shrink-0">{factor.label}</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${factor.color} rounded-full`}
                        style={{ width: `${factor.score}%`, transition: 'width 1s ease' }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 w-8 text-right">{factor.weight}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Score Card */}
            <div className="glass-card p-8 glow-indigo">
              <div className="text-center mb-8">
                <div className="text-7xl font-black gradient-text font-syne">95%</div>
                <div className="text-emerald-400 text-lg font-semibold mt-2">⭐ Excellent Match</div>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  { label: '✅ Perfect route overlap — direct path', color: 'text-emerald-400' },
                  { label: '✅ Traveler departs in 2 days', color: 'text-emerald-400' },
                  { label: '✅ Package fits within 15kg limit', color: 'text-emerald-400' },
                  { label: '⭐ 4.9 star rating, 42 deliveries', color: 'text-amber-400' },
                ].map((item, i) => (
                  <div key={i} className={`text-sm ${item.color} p-3 rounded-lg bg-white/5`}>
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-black text-white">₹28</div>
                  <div className="text-xs text-gray-500 mt-1">Suggested Reward</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-black text-emerald-400">2.4kg</div>
                  <div className="text-xs text-gray-500 mt-1">CO₂ Saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black font-syne mb-4">
              Built on <span className="gradient-text">Trust & Safety</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Our multi-layered safety system protects every transaction
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Trust Score Engine', desc: 'Real-time scoring based on verifications, history, rating & account age', color: 'text-emerald-400' },
              { icon: Lock, title: 'Risk Detection', desc: 'AI-powered rule-based system detects suspicious patterns automatically', color: 'text-red-400' },
              { icon: CheckCircle, title: 'Multi-Level Verification', desc: 'Email, phone, ID document verification for maximum trust', color: 'text-blue-400' },
              { icon: Award, title: 'Achievement Badges', desc: 'Trusted Traveler, Top Carrier and Elite badges reward reliability', color: 'text-amber-400' },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6 group hover:border-white/20 transition-all duration-300">
                <item.icon className={`w-10 h-10 ${item.color} mb-4 group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="font-bold font-syne mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust Score Badges */}
          <div className="mt-12 glass-card p-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              {[
                { badge: '🛡️', name: 'Trusted Traveler', desc: 'Trust Score 70+, 5+ deliveries', score: '70+' },
                { badge: '✅', name: 'Verified Badge', desc: 'Email + Phone verified', score: '60+' },
                { badge: '🏆', name: 'Top Carrier', desc: '50+ successful deliveries', score: '90+' },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5">
                  <div className="text-4xl">{b.badge}</div>
                  <div className="font-bold font-syne">{b.name}</div>
                  <div className="text-sm text-gray-400">{b.desc}</div>
                  <div className="badge-trusted">Trust Score {b.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Section */}
      <section id="sustainability" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-emerald-900/10" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '1.2T', label: 'CO₂ Saved', icon: Leaf, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/10' },
                { value: '15K+', label: 'Deliveries', icon: Package, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/10' },
                { value: '₹280K', label: 'Money Saved', icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-500/10' },
                { value: '55', label: 'Trees Equiv.', icon: Globe, color: 'text-green-400', bg: 'from-green-500/20 to-teal-500/10' },
              ].map((stat, i) => (
                <div key={i} className={`glass-card p-6 bg-gradient-to-br ${stat.bg}`}>
                  <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
                  <div className={`text-3xl font-black font-syne ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10 text-green-300 text-sm mb-6">
                <Leaf className="w-4 h-4" />
                Environmental Impact
              </div>
              <h2 className="text-4xl md:text-5xl font-black font-syne mb-6">
                Every Delivery{' '}
                <span className="text-emerald-400">Saves the Planet</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Traditional delivery vans emit 250g CO₂/km. Crowd Carry travelers share their 
                trip — reducing marginal emissions by <strong className="text-white">up to 90%</strong> per package.
              </p>

              <div className="space-y-4">
                {[
                  'CO₂ saved calculated per delivery',
                  'Traditional vs crowdshipping comparison',
                  'Real-time sustainability dashboard',
                  'Individual and platform-wide impact tracking',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black font-syne mb-4">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sarah K.',
                role: 'Package Sender',
                avatar: 'SK',
                rating: 5,
                text: "Saved ₹120 on international shipping! The AI matched me with a traveler heading exactly to my destination. Package arrived 2 days faster than DHL.",
              },
              {
                name: 'Marcus T.',
                role: 'Top Carrier',
                avatar: 'MT',
                rating: 5,
                text: "As a frequent business traveler, I now earn ₹200-500 extra per month just by carrying packages for others. The matching is incredibly accurate.",
              },
              {
                name: 'Priya M.',
                role: 'Package Sender',
                avatar: 'PM',
                rating: 5,
                text: "The trust score system gives me complete confidence. The traveler had 45 successful deliveries and a 4.9 rating. My documents arrived safely.",
              },
            ].map((t, i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-gray-400">{t.role}</div>
                  </div>
                  <div className="ml-auto flex">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-syne mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does the matching work?',
                a: 'Our custom AI algorithm scores each traveler-package pair on 5 factors: route similarity (40%), travel date proximity (20%), weight compatibility (15%), traveler rating (15%), and success rate (10%). You see the full breakdown for complete transparency.',
              },
              {
                q: 'Is my package safe?',
                a: 'Every traveler is verified through our Trust Score Engine. We check email, phone, ID documents, delivery history, and ratings. High-risk packages are flagged by our Risk Detection Engine for extra scrutiny.',
              },
              {
                q: 'How do I pay the carrier?',
                a: 'You set your reward amount when posting a package. Our Smart Pricing Engine suggests fair rates based on distance, weight, urgency, and size. Payment is handled through our secure platform.',
              },
              {
                q: 'What if something goes wrong?',
                a: 'We have a dispute resolution system and 24/7 support. Both senders and carriers can file reports. Our admin team reviews all reports within 24 hours.',
              },
              {
                q: 'Which items can I send?',
                a: 'Documents, electronics, clothing, food, medicine, books, and accessories are all welcome. Illegal items, hazardous materials, and live animals are prohibited. High-value packages require extra verification.',
              },
            ].map((item, i) => (
              <details key={i} className="glass-card group">
                <summary className="p-6 cursor-pointer flex items-center justify-between font-semibold list-none">
                  {item.q}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform duration-200" />
                </summary>
                <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 via-purple-900/30 to-indigo-900/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-6xl font-black font-syne mb-6">
            Ready to Ship{' '}
            <span className="gradient-text">Smarter?</span>
          </h2>
          <p className="text-gray-400 text-xl mb-10">
            Join thousands of users already saving money and the planet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-primary text-lg px-10 py-4 gap-3">
              <Package className="w-5 h-5" />
              Start Sending
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/register?role=TRAVELER" className="btn-secondary text-lg px-10 py-4 gap-3">
              <Plane className="w-5 h-5" />
              Become a Carrier
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black font-syne gradient-text">Crowd Carry</span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                AI-powered crowdshipping platform connecting package senders with travelers. 
                Sustainable, affordable, and community-driven logistics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold font-syne mb-3">Platform</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href="/packages" className="block hover:text-white transition-colors">Browse Packages</Link>
                <Link href="/trips" className="block hover:text-white transition-colors">Find Trips</Link>
                <Link href="/dashboard" className="block hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold font-syne mb-3">Company</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <a href="#how-it-works" className="block hover:text-white transition-colors">How It Works</a>
                <a href="#sustainability" className="block hover:text-white transition-colors">Sustainability</a>
                <a href="#faq" className="block hover:text-white transition-colors">FAQ</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
            <div>© 2026 Crowd Carry. All rights reserved.</div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Leaf className="w-4 h-4 text-green-400" />
              <span>Committed to reducing carbon emissions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
