import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">
          <span className="header-icon">📈</span>
          Finance Agent
        </h1>
        <p className="header-subtitle">Technical Analysis Platform</p>
      </div>
    </header>
  );
};

export default Header;

