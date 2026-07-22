import { ArrowUpRight } from './Icons';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="fixed top-4 inset-x-0 px-8 lg:px-16 z-50 flex items-center justify-between">
      {/* Left */}
      <div className="w-12 h-12 liquid-glass rounded-full flex items-center justify-center shrink-0 overflow-hidden">
        <img src="/logo-8k.jpeg" alt="EcoSpark Logo" className="w-full h-full object-cover" />
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center liquid-glass p-1.5 rounded-full">
        {['Features', 'Impact', 'Community', 'About'].map((item) => (
          <a key={item} href="#" className="px-3 py-2 text-sm font-medium text-white/90 font-body hover:text-white transition-colors">
            {item}
          </a>
        ))}
        <Link to="/auth" className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 ml-1 hover:bg-white/90 transition-colors">
          Sign In
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Mobile Sign In */}
      <Link to="/auth" className="md:hidden liquid-glass-strong rounded-full px-4 py-2 text-sm font-medium text-white flex items-center gap-1">
        Sign In
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </nav>
  );
}
