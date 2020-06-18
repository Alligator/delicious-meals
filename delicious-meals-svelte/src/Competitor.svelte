<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let competitor;
  export let winner = null;
</script>

<div
  class="competitor"
  class:active="{winner === null}"
  class:winner="{winner !== null && winner}"
  class:loser="{winner !== null && !winner}"
  on:click="{() => dispatch('vote')}"
>
  <div>{competitor.content}</div>
  <div>
    <em>a lá {competitor.author}</em>
    {#if winner !== null}
      <div class="stats">
        <strong>{competitor.wins}</strong> wins
        <strong>{competitor.losses}</strong> losses
        <strong>{competitor.rating}</strong> elo
      </div>
    {/if}
  </div>
</div>

<style>
  .competitor {
    font-weight: bold;
    flex-grow: 1;
    margin: 0 1rem;
    padding: 1rem;
    text-align: center;
    font-size: 14pt;
    background-color: rgba(255, 255, 255, 0.2);
  }

  .competitor.active {
    cursor: pointer;
  }

  .competitor.active:hover {
    background-color: rgba(255, 255, 255, 0.3);
    color: white;
  }
  .winner {
    color: limegreen;
  }
  .loser {
    color: hotpink;
  }
  .stats {
    margin-top: 1rem;
    font-size: 1rem;
  }
</style>
