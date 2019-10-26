import 'regenerator-runtime/runtime';

import React, { useReducer, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Meal from './meal';

const initialState = {
  currentMeals: [],
  previousMeals: [],
  stats: {
    topTenMessages: [],
    topTenAuthors: [],
    totalVotes: 0,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'setMeals': {
      return {
        ...state,
        currentMeals: action.meals,
        previousMeals: state.currentMeals,
      };
    }
    case 'voteComplete': {
      return {
        ...state,
        winnerId: action.winner.id,
        loserId: action.loser.id,
        previousMeals: state.previousMeals.map((meal) => {
          if (meal.id === action.winner.id) {
            return action.winner;
          } else if (meal.id === action.loser.id) {
            return action.loser;
          }
          return meal;
        }),
      };
    }
    case 'setStats': {
      return {
        ...state,
        stats: action.stats,
      };
    }
  }
}

function randomMessage() {
  const messages = [
    'You arrive for your reservation at the fancy restaurant and there are only two items on the menu',
    'You wake up face down in a puddle, your mouth tastes like',
    'You are haunted by the memory of',
    'Your friend tony asks you to dinner at a new place he found. It\'s the last time you\'ll ever agree to this as he insisted you try the...',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [message, setMessage] = useState(randomMessage);

  async function fetchNewPair() {
    const response = await fetch('meals/pair');
    const json = await response.json();
    dispatch({ type: 'setMeals', meals: json });
  }

  async function fetchStats() {
    let response;
    response = await fetch('meals/topten');
    const topTenMessages = await response.json();

    response = await fetch('authors/topten');
    const topTenAuthors = await response.json();

    response = await fetch('meals/totalvotes');
    const votes = await response.json();
    dispatch({ type: 'setStats', stats: { topTenMessages, topTenAuthors, totalVotes: votes.total }});
  }

  async function vote(winnerId, loserId) {
    const response = await fetch('meals/vote', {
      method: 'POST',
      body: JSON.stringify({ winnerId, loserId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    await fetchNewPair();
    dispatch({ type: 'voteComplete', winner: json.winner, loser: json.loser });
    setMessage(randomMessage());
  }

  function getPreviousMealVariant(meal) {
    if (meal.id === state.winnerId) {
      return 'winner';
    } else if (meal.id === state.loserId) {
      return 'loser';
    }
    return '';
  }

  // initial fetch
  useEffect(() => {
    fetchStats();
    fetchNewPair();
  }, []);

  console.log(state);
  return (
    <React.Fragment>
      <h1>Welcome To Flavored Town</h1>
      <p>{message}</p>
      {state.currentMeals && state.currentMeals.length === 2 && (
        <div className="meals">
          <Meal
            meal={state.currentMeals[0]}
            variant="active"
            onClick={() => vote(state.currentMeals[0].id, state.currentMeals[1].id)}
          />
          <Meal
            meal={state.currentMeals[1]}
            variant="active"
            onClick={() => vote(state.currentMeals[1].id, state.currentMeals[0].id)}
          />
        </div>
      )}
      {state.previousMeals && state.previousMeals.length === 2 && (
        <>
          <h2>Previous Match</h2>
          <div className="meals">
            <Meal
              meal={state.previousMeals[0]}
              variant={getPreviousMealVariant(state.previousMeals[0])}
            />
            <Meal
              meal={state.previousMeals[1]}
              variant={getPreviousMealVariant(state.previousMeals[1])}
            />
          </div>
        </>
      )}
      <div className="stats">
        <div className="stats__list">
          <h2>Top Ten Meals</h2>
          <ol>
            {state.stats.topTenMessages.map(meal => (
              <li>
                <strong>{meal.content}</strong> <em>à la {meal.author}</em>
                <br />
                <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
              </li>
            ))}
          </ol>
        </div>
        <div className="stats__list">
          <h2>Top Ten Chefs</h2>
          <ol>
            {state.stats.topTenAuthors.map(author => (
              <li>
                <div className="stats__list-item">
                  <strong>{author.author}</strong>
                  {author.totalRating.toFixed(2)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p>Total votes <strong>{state.stats.totalVotes}</strong></p>
    </React.Fragment>
  );
}

window.onload = () => {
  ReactDOM.render(<App />, document.querySelector('#app'));
};
