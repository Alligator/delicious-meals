import React from 'react';

function Meal({ meal, variant, pulse, onClick, number }) {
  return (
    <div className={`meal ${variant ? ('meal--' + variant) : ''} ${pulse ? 'meal--pulse' : ''}`} onClick={onClick}>
      {variant === 'active' && (
        <div className="meal__number">{number}</div>
      )}
      {variant !== 'active' && (
        <div className="meal__stats">
          <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
          {meal.ratingDiff && (
            <React.Fragment>
              {' '}
              <strong className={meal.ratingDiff < 0 ? 'red' : 'green'}>
                {meal.ratingDiff < 0 ? '-' : '+'}
                {Math.abs(meal.ratingDiff)}
              </strong>
            </React.Fragment>
          )}
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
