import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Calendar,
  List,
  BarChart2,
  Users,
  Truck,
  Phone,
  Megaphone,
  Settings as SettingsIcon,
  UserPlus,
  X,
  Bot,
  CreditCard,
} from 'lucide-react';
import companyLogo from '../../assets/comapny_logo.png';
import { useAuth } from '../../features/auth/context/AuthContext';
import { NAV_ITEMS, getAllowedNavItems } from '../permissions/registry';

const Sidebar = ({ isOpen, onClose }) => {
  const { permissionContext, user } = useAuth();
  const iconByPath = {
    '/dashboard': LayoutGrid,
    '/leads': UserPlus,
    '/jobs': Truck,
    '/payments': CreditCard,
    // '/fleet': Truck,
    '/marketing': Megaphone,
    '/automation': Bot,
    '/analytics': BarChart2,
    '/settings': SettingsIcon,
  };
  const navItems = getAllowedNavItems(NAV_ITEMS, permissionContext).map((item) => ({
    ...item,
    icon: iconByPath[item.path] || Users,
  }));

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-20 bg-[#043976] flex flex-col items-center py-6 transition-transform duration-300 lg:static lg:translate-x-0 
    ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      <aside className={sidebarClasses}>
        {isOpen && (
          <div className="lg:hidden absolute top-4 right-[-40px]">
             <button 
               onClick={onClose}
               className="p-2 bg-[#043976] text-white rounded-r-lg shadow-md cursor-pointer"
             >
               <X size={20} />
             </button>
          </div>
        )}

        <NavLink to="/" className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-transparent transition-transform hover:scale-105">
          <img
            src={companyLogo}
            alt="Company logo"
            className="h-full w-full object-contain"
          />
        </NavLink>
        <nav className="flex-1 flex flex-col gap-4 w-full px-3">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={idx}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) => `w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                title={item.label}
              >
                <Icon size={22} strokeWidth={2} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-[#043976] border border-white/20 text-white text-xs rounded-lg shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
