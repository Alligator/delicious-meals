<script>
  import { onMount } from 'svelte';
  import ChefStat from './ChefStat.svelte';
  import MealStat from './MealStat.svelte';
  import Competitor from './Competitor.svelte';

  let stats = null;
  let pair = null;
  let prevPair = null;
  let prevWinnerId = null;

  async function fetchStats() {
    const response = await fetch('http://localhost:3000/stats/');
    const newStats = await response.json();
    stats = newStats;
  }

  async function loadPair() {
    const response = await fetch('http://localhost:3000/meals/pair');
    const newPair = await response.json();
    pair = newPair;
  }

  async function vote(winnerId, loserId) {
    const response = await fetch('http://localhost:3000/meals/vote', {
      method: 'POST',
      body: JSON.stringify({ winnerId, loserId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();

    prevPair = pair;
    prevWinnerId = winnerId;

    // bad, bad api
    if (result.winner.id === pair[0].id) {
      prevPair[0] = result.winner;
      prevPair[1] = result.loser;
    } else {
      prevPair[0] = result.loser;
      prevPair[1] = result.winner;
    }

    loadPair();
    fetchStats();
  }

  onMount(() => {
    fetchStats();
    loadPair();
  });
</script>

<main>
  <h1>svelte meals</h1>

  {#if pair}
    <div class="voting-stage">
      <Competitor competitor={pair[0]} on:vote="{() => vote(pair[0].id, pair[1].id)}"/>
      <Competitor competitor={pair[1]} on:vote="{() => vote(pair[1].id, pair[0].id)}"/>
    </div>
  {/if}

  {#if prevPair}
    <div class="voting-stage">
      <Competitor competitor={prevPair[0]} winner="{prevWinnerId === prevPair[0].id}"/>
      <Competitor competitor={prevPair[1]} winner="{prevWinnerId === prevPair[1].id}"/>
    </div>
  {/if}

  {#if stats}
    <div class="stats">
      <div>
        <h2>top ten meals</h2>
        <ol>
          {#each stats.topMessages as meal}
            <li>
              <MealStat {meal}/>
            </li>
          {/each}
        </ol>
      </div>

      <div>
        <h2>top ten chefs</h2>
        <ol>
          {#each stats.topAuthors as chef}
            <li>
              <ChefStat {chef}/>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  {/if}
</main>

{#if stats}
  <footer>
    <strong>{stats.totalVotes}</strong> votes
    <strong>{stats.totalMeals}</strong> meals
    <strong>{stats.totalAuthors}</strong> chefs
  </footer>
{/if}

<style>
  main {
    max-width: 100ex;
    margin: 0 auto;
  }
  h1, h2 {
    text-align: center;
  }

  .stats {
    display: flex;
  }
  .stats > div {
    flex-grow: 1;
  }
  .stats ol li {
    margin-bottom: .5rem;
  }

  .voting-stage {
    display: flex;
    justify-content: space-around;
    padding: 1rem 0;
  }

  .winner {
    color: green;
  }
  .loser {
    color: red;
  }

  footer {
    text-align: center;
    margin-bottom: 2rem;
  }

</style>
