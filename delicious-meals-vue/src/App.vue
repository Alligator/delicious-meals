<template>
  <div id="app">
    <h1>delicious meals</h1>
    <h2>vote for the winner</h2>
    <VotingStage
      :left="currentPair[0]"
      :right="currentPair[1]"
      @selectWinner="selectWinner"
    />
    <div v-if="previousPair.length && previousWinner">
      <h2>previous match</h2>
      <VotingStage
        :active="false"
        :left="previousPair[0]"
        :right="previousPair[1]"
        :winner="previousWinner"
      />
    </div>
    <div class="stats">
      <ol>
        <li v-for="(meal, index) in topMeals" :key="index">
          <MealStat :meal="meal" />
        </li>
      </ol>
      <ol>
        <li v-for="chef in topChefs" :key="chef.author">
          <ChefStat :chef="chef" />
        </li>
      </ol>
    </div>
    <footer>
      <h2>stats</h2>
      <p>
        <strong>{{ totalVotes }}</strong> votes
        <strong>{{ totalMeals }}</strong> meals 
        <strong>{{ totalAuthors }}</strong> chefs 
      </p>
    </footer>
  </div>
</template>

<script>
/* eslint-disable */
import MealStat from './components/MealStat.vue'
import ChefStat from './components/ChefStat.vue'
import VotingStage from './components/VotingStage';

export default {
  name: 'app',
  components: {
    MealStat,
    ChefStat,
    VotingStage,
  },
  created() {
    this.loadStats();
    this.loadPair();
  },
  data() {
    return {
      topMeals: [],
      topChefs: [],
      totalMeals: 0,
      totalAuthors: 0,
      totalVotes: 0,
      currentPair: [],
      previousPair: [],
      previousWinner: undefined,
    };
  },
  methods: {
    async loadStats() {
      try {
        const response = await fetch('http://localhost:3000/stats/');
        const stats = await response.json();
        this.topMeals = stats.topMessages;
        this.topChefs = stats.topAuthors;
        this.totalMeals = stats.totalMeals;
        this.totalAuthors = stats.totalAuthors;
        this.totalVotes = stats.totalVotes;
      } catch(e) {
        console.error(e);
      }
    },
    async loadPair() {
      const response = await fetch('http://localhost:3000/meals/pair');
      const json = await response.json();
      this.currentPair = json;
    },
    async postVote(winnerId, loserId) {
      const response = await fetch('http://localhost:3000/meals/vote', {
        method: 'POST',
        body: JSON.stringify({ winnerId, loserId }),
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      return json;
    },
    async selectWinner(winner) {
      let winnerId, loserId;

      if (winner.id === this.currentPair[0].id) {
        winnerId = this.currentPair[0].id;
        loserId = this.currentPair[1].id;
      } else {
        winnerId = this.currentPair[1].id;
        loserId = this.currentPair[0].id;
      }

      const response = await this.postVote(winnerId, loserId);

      // ugh bad api
      this.previousPair = [];
      if (response.winner.id === this.currentPair[0].id) {
        this.previousPair[0] = response.winner;
        this.previousPair[1] = response.loser;
      } else {
        this.previousPair[0] = response.loser;
        this.previousPair[1] = response.winner;
      }

      this.previousWinner = winner.id;
      this.loadPair();
      this.loadStats();
    },
  }
}
</script>

<style>
body {
  --color-black: #282c34;
  --color-red: #e06c75;
  --color-green: #98c379;
  --color-yellow: #e5c07b;
  --color-blue: #61afef;
  --color-cyan: #56b6c2;
  --color-white: #dcdfe4;

  font-family: 'Fira Code', 'Consolas', monospace;
  margin: 0 auto;
  max-width: 100ex;
  line-height: 1.5;
  font-size: 10pt;
  background-color: var(--color-black);
}
h1, h2 {
  text-align: center;
}
footer {
  text-align: center;
}

#app {
  background-color: var(--color-black);
  color: var(--color-white);
}
#app .c-black { color: var(--color-black); }
#app .c-red { color: var(--color-red); }
#app .c-green { color: var(--color-green); }
#app .c-yellow { color: var(--color-yellow); }
#app .c-blue { color: var(--color-blue); }
#app .c-magenta { color: var(--color-magenta); }
#app .c-cyan { color: var(--color-cyan); }
#app .c-white { color: var(--color-white); }

.stats {
  display: flex;
}
.stats ol {
  flex-grow: 1;
}
.stats ol li {
  margin-bottom: 1rem;
}
</style>
