import React from 'react';

function Meal({ children, variant, onClick }) {
  return (
    <div className={`meal ${variant ? ('meal--' + variant) : ''}`} onClick={onClick}>
      {children}
    </div>
  );
}

Meal.Number = ({ children }) =>
  <div className="meal__number">{children}</div>;

Meal.Name = ({ children }) =>
  <h2>{children}</h2>;

Meal.Author = ({ children }) =>
  <div className="meal__author">à la {children}</div>;

Meal.Stats = ({ meal }) =>
  <div className="meal__stats">
    <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
    {' '}
    <strong className={meal.ratingDiff < 0 ? 'red' : 'green'}>
      {meal.ratingDiff < 0 ? '-' : '+'}
      {Math.abs(meal.ratingDiff)}
    </strong>
  </div>

export default Meal;
