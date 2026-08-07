import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-brand-700 text-lg">VolunteerShield</span>
        <div className="flex gap-1">
          <NavLink to="/" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/shifts" className={linkClass}>
            Shifts
          </NavLink>
          <NavLink to="/volunteers" className={linkClass}>
            Volunteers
          </NavLink>
          <NavLink to="/background-checks" className={linkClass}>
            Background Checks
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500">
          {user.email} <span className="text-slate-400">({user.role})</span>
        </span>
        <button onClick={logout} className="text-brand-600 hover:underline">
          Sign out
        </button>
      </div>
    </nav>
  );
}
