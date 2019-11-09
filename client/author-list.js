import React from 'react';

function AuthorList({ authors }) {
  return (
    <ol>
      {authors.map(author => (
        <li>
          <strong>{author.author}</strong> - {author.totalMeals} {author.totalMeals > 1 ? 'meals' : 'meal'}
          <br />
          <strong>{author.totalWins}</strong> wins, <strong>{author.totalLosses}</strong> losses, <strong>{author.ratio.toFixed(2)}</strong> ratio
        </li>
      ))}
    </ol>
  );
}

export default AuthorList;