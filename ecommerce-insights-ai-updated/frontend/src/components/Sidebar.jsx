
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar(){
  const links = [
    {to:'/', label:'Dashboard'},
    {to:'/analytics', label:'Analytics'},
    {to:'/shipments', label:'Shipments'},
    {to:'/models', label:'Models'},
    {to:'/settings', label:'Settings'}
  ];
  return (
    <aside className="sidebar">
      <div className="logo">🔮</div>
      <nav>
        <ul>
          {links.map((l)=>(
            <li key={l.to}>
              <NavLink to={l.to} end className={({isActive})=> isActive ? 'active' : ''}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">Made for Maersk Internship</div>
    </aside>
  )
}
