import 'regenerator-runtime/runtime';

import React, { useReducer, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Router from 'preact-router';
import Meal from './meal';

const initialState = {
  currentMeals: [],
  previousMeals: [],
  stats: {
    topMessages: [],
    topAuthors: [],
    totalVotes: 0,
    totalMeals: 0,
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
        currentMeals: state.currentMeals.map((meal) => {
          if (meal.id === action.winner.id) {
            return { ...action.winner, ratingDiff: action.winner.rating - meal.rating };
          } else if (meal.id === action.loser.id) {
            return { ...action.loser, ratingDiff: action.loser.rating - meal.rating };
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

function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(randomMessage);

  async function fetchNewPair() {
    const response = await fetch('meals/pair');
    const json = await response.json();
    dispatch({ type: 'setMeals', meals: json });
  }

  async function fetchStats() {
    const response = await fetch('stats');
    const stats = await response.json();
    dispatch({ type: 'setStats', stats });
  }

  async function vote(winnerId, loserId) {
    const response = await fetch('meals/vote', {
      method: 'POST',
      body: JSON.stringify({ winnerId, loserId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    dispatch({ type: 'voteComplete', winner: json.winner, loser: json.loser });

    await fetchNewPair();
    await fetchStats();
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
    const fetchData = async () => {
      await Promise.all([fetchStats(), fetchNewPair()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <React.Fragment>
      <p className="narrative">{message}</p>
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
            {state.stats.topMessages.map(meal => (
              <li>
                <strong>{meal.content}</strong> <em>à la {meal.author}</em>
                <br />
                <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
              </li>
            ))}
          </ol>
          <p><a href="/all-meals">View All</a></p>
        </div>
        <div className="stats__list">
          <h2>Top Ten Chefs</h2>
          <ol>
            {state.stats.topAuthors.map(author => (
              <li>
                <strong>{author.author}</strong> - {author.totalMeals} {author.totalMeals > 1 ? 'meals' : 'meal'}
                <br />
                <strong>{author.totalWins}</strong> wins, <strong>{author.totalLosses}</strong> losses, <strong>{author.ratio.toFixed(2)}</strong> ratio
              </li>
            ))}
          </ol>
          <p><a href="/all-chefs">View All</a></p>
        </div>
      </div>
      <h2>Stats</h2>
      <p>
        <strong>{state.stats.totalVotes}</strong> votes
        {', '}
        <strong>{state.stats.totalMeals}</strong> meals 
        {', '}
        <strong>{state.stats.totalAuthors}</strong> chefs 
      </p>
    </React.Fragment>
  );
}

function AllMeals() {
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const response = await fetch('meals/');
      const meals = await response.json();
      setMeals(meals);
    };

    loadData();
  }, []);

  return (
    <React.Fragment>
      <h2>All Meals</h2>
      <div className="stats">
        <div className="stats__list">
          <ol>
            {meals.map(meal => (
              <li>
                <strong>{meal.content}</strong> <em>à la {meal.author}</em>
                <br />
                <strong>{meal.wins}</strong> wins, <strong>{meal.losses}</strong> losses, <strong>{meal.rating}</strong> elo
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p><a href="/">Back</a></p>
    </React.Fragment>
  );
}

function AllChefs() {
  const [authors, setAuthors] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const response = await fetch('authors/');
      const authors = await response.json();
      setAuthors(authors);
    };

    loadData();
  }, []);

  return (
    <React.Fragment>
      <h2>All Chefs</h2>
      <div className="stats">
        <div className="stats__list">
          <ol>
            {authors.map(author => (
              <li>
                <strong>{author.author}</strong> - {author.totalMeals} {author.totalMeals > 1 ? 'meals' : 'meal'}
                <br />
                <strong>{author.totalWins}</strong> wins, <strong>{author.totalLosses}</strong> losses, <strong>{author.ratio.toFixed(2)}</strong> ratio
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p><a href="/">Back</a></p>
    </React.Fragment>
  );
}

function App() {
  return (
    <>
      <h1>Welcome To Flavored Town</h1>
      <Router>
        <Home path="/" />
        <AllMeals path="/all-meals" />
        <AllChefs path="/all-chefs" />
      </Router>
    </>
  );
}

window.onload = () => {
  ReactDOM.render(<App />, document.querySelector('#app'));
};
