import React from 'react';

function MealList({ meals }) {
  return (
    <ol>
      {meals.map(meal => (
        <li>
          <strong>{meal.content}</strong> <em>à la {meal.author}</em>
          <br />
          <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
        </li>
      ))}
    </ol>
  );
}

export default MealList;