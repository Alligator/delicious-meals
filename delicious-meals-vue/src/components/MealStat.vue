<template>
  <span>
    <strong>{{ meal.content }}</strong><em> a lá {{ meal.author }}</em>
    <br />
    <strong class="c-green">{{ meal.wins }}</strong> wins
    <strong class="c-red">{{ meal.losses }}</strong> losses
    <strong class="c-cyan">{{ meal.rating }}</strong> elo
  </span>
</template>

<script>
/* eslint-disable */
export default {
  name: 'Meal',
  props: {
    meal: Object,
  },
}
</script>