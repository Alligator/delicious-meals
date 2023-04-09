import 'regenerator-runtime/runtime';

import React, { useReducer, useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import Router from 'preact-router';
import Meal from './meal';
import MealList from './meal-list';
import AuthorList from './author-list';

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
        previousMeals: action.store ? state.currentMeals : state.previousMeals,
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

  const votingRef = useRef(false);

  // default to this so the function fetches immediately
  const statsTimeout = useRef('init');

  async function fetchNewPair(extraOpts) {
    const response = await fetch('meals/pair');
    const json = await response.json();
    dispatch({ type: 'setMeals', meals: json, store: true, ...extraOpts });
  }

  async function fetchStats() {
    const go = async () => {
      const response = await fetch('stats');
      const stats = await response.json();
      dispatch({ type: 'setStats', stats });
    };
    if (statsTimeout.current === 'init') {
      go();
      statsTimeout.current = 0;
    } else {
      clearTimeout(statsTimeout.current);
      statsTimeout.current = setTimeout(go, 1000);
    }
  }

  async function vote(winnerId, loserId) {
    if (votingRef.current) {
      return;
    }
    votingRef.current = true;
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
    votingRef.current = false;
  }

  async function skip() {
    await fetchNewPair({ store: false });
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

  // use 1 and 2 for voting
  useEffect(() => {
    const listener = async (evt) => {
      switch (evt.key) {
        case '1':
          await vote(state.currentMeals[0].id, state.currentMeals[1].id);
          break;
        case '2':
          await vote(state.currentMeals[1].id, state.currentMeals[0].id);
          break;
      }
    };

    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [state.currentMeals]);

  if (loading) {
    return null;
  }

  return (
    <React.Fragment>
      <p className="narrative">{message}</p>
      {state.currentMeals && state.currentMeals.length === 2 && (
        <div className="meals">
          <Meal variant="active" onClick={() => vote(state.currentMeals[0].id, state.currentMeals[1].id)}>
            <Meal.Number>1</Meal.Number>
            <Meal.Name>{state.currentMeals[0].content}</Meal.Name>
          </Meal>
          <Meal variant="active" onClick={() => vote(state.currentMeals[1].id, state.currentMeals[0].id)}>
            <Meal.Number>2</Meal.Number>
            <Meal.Name>{state.currentMeals[1].content}</Meal.Name>
          </Meal>
        </div>
      )}
      <div className="skip">
        <button type="button" onClick={skip}>skip</button>
      </div>
      {state.previousMeals && state.previousMeals.length === 2 && (
        <>
          <h2>Previous Match</h2>
          <div className="meals">
            <Meal variant={getPreviousMealVariant(state.previousMeals[0])}>
              <Meal.Stats meal={state.previousMeals[0]} />
              <Meal.Name>
                {state.previousMeals[0].content}
              </Meal.Name>
              <Meal.Author>{state.previousMeals[0].author}</Meal.Author>
            </Meal>
            <Meal variant={getPreviousMealVariant(state.previousMeals[1])}>
              <Meal.Stats meal={state.previousMeals[1]} />
              <Meal.Name>
                {state.previousMeals[1].content}
              </Meal.Name>
              <Meal.Author>{state.previousMeals[1].author}</Meal.Author>
            </Meal>
          </div>
        </>
      )}
      <div className="stats">
        <div className="stats__list">
          <h2>The Eaterboard</h2>
          <MealList meals={state.stats.topMessages} />
          <p><a href="/all-meals">View All</a></p>
        </div>
        <div className="stats__list">
          <h2>Top Ten Chefs</h2>
          <AuthorList authors={state.stats.topAuthors} />
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
          <MealList meals={meals} />
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
          <AuthorList authors={authors} />
        </div>
      </div>
      <p><a href="/">Back</a></p>
    </React.Fragment>
  );
}

function App() {
  return (
    <>
      <h1>New Delicious Meals</h1>
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
