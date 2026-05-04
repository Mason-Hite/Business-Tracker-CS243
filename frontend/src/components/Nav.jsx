import { Link } from 'react-router-dom';

const Nav = () => (
  <nav className="bg-green-600 text-white p-4 shadow-lg">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold">🌱 Business Tracker</Link>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">Dashboard</Link>
        <Link to="/expenses" className="hover:underline">Expenses</Link>
        <Link to="/clients" className="hover:underline">Clients</Link>
        <Link to="/revenue" className="hover:underline">Revenue</Link>
        <Link to="/shopping" className="hover:underline">Shopping</Link>
        <Link to="/calendar" className="hover:underline">Calendar</Link>
      </div>
    </div>
  </nav>
);

export default Nav;
