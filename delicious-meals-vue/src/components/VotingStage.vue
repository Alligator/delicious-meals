<template>
  <div class="voting-stage">
    <div
      :class="{ competitor: true, active, winner: left.id === winner }"
      @click="selectWinner(left)"
    >
      <div class="competitor__content">
        {{ left.content }}
      </div>
      <div v-if="!active">
        <em>a lá {{ left.author }}</em>
      </div>
    </div>
    <div
      :class="{ competitor: true, active, winner: right.id === winner }"
      @click="selectWinner(right)"
    >
      <div class="competitor__content">
        {{ right.content }}
      </div>
      <div v-if="!active">
        <em>a lá {{ right.author }}</em>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    left: { type:Object, default: () => ({}) },
    right: { type:Object, default: () => ({}) },
    active: { type: Boolean, default: true },
    winner: String,
  },
  methods: {
    selectWinner(winner) {
      if (this.active) {
        this.$emit('selectWinner', winner);
      }
    },
  }
}
</script>

<style scoped>
.voting-stage {
  display: flex;
  justify-content: space-around;
  padding: 1rem 0;
}
.competitor {
  background-color: rgba(255, 255, 255, 0.2);
  color: var(--color-red);
  font-weight: bold;
  padding: 15px 20px;
  text-align: center;
  border-radius: 6px;
  flex-grow: 1;
  margin: 0 1rem;
}
.competitor__content {
  font-size: 14pt;
}
.competitor.active {
  cursor: pointer;
  color: var(--color-black);
  background-color: var(--color-cyan);
}
.competitor.active:hover {
  background-color: var(--color-yellow);
}

.competitor.winner {
  color: var(--color-green);
}
.competitor.loser {
  background-color: var(--color-red);
}
</style>