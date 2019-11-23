<template>
  <span>
    <strong>{{ chef.author }}</strong> - {{ chef.totalMeals }} meals
    <br/>
    <strong class="c-green">{{ chef.totalWins }}</strong> wins
    <strong class="c-red">{{ chef.totalLosses }}</strong> losses
    <strong class="c-cyan">{{ chef.ratio.toFixed(2) }}</strong> ratio
  </span>
</template>

<script>
export default {
  props: {
    chef: Object,
  },
}
</script>