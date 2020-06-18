<script>
  export let chef;
</script>

<span>
  <strong>{chef.author}</strong> - {chef.totalMeals} meals
  <br />
  <strong>{chef.totalWins}</strong> wins
  <strong>{chef.totalLosses}</strong> losses
  <strong>{chef.ratio.toFixed(2)}</strong> ratio
</span>
