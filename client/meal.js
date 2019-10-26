import React from 'react';

function Meal({ meal, variant, pulse, onClick }) {
  return (
    <div className={`meal ${variant ? ('meal--' + variant) : ''} ${pulse ? 'meal--pulse' : ''}`} onClick={onClick}>
      {variant !== 'active' && (
        <div className="meal__stats">
          <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
        </div>
      )}
      <h2>{meal.content}</h2>
      {variant !== 'active' && (
        <div className="meal__author">à la {meal.author}</div>
      )}
    </div>
  );
}

export default Meal;
