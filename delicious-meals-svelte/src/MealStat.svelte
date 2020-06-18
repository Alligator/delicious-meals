<script>
  export let meal;
</script>

<span>
  <strong>{meal.content}</strong> <em>a lá {meal.author}</em>
  <br />
  <strong>{meal.wins}</strong> wins
  <strong>{meal.losses}</strong> losses
  <strong>{meal.rating}</strong> elo
</span>
