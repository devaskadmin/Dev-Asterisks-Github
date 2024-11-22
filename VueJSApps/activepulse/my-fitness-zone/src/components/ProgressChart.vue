<template>
  <div class="chart-container">
    <line-chart v-if="chartData" :chart-data="chartData" :chart-options="chartOptions" />
  </div>
</template>

<script>
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale);

export default {
  name: "ProgressChart",
  components: {
    LineChart: Line,
  },
  data() {
    return {
      chartData: {
        labels: [], // Initial empty labels
        datasets: [
          {
            label: "Weekly Progress",
            data: [], // Initial empty data
            borderColor: "#4caf50",
            tension: 0.4,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        plugins: {
          legend: { display: true, position: "top" },
        },
      },
    };
  },
  mounted() {
    this.loadChartData();
  },
  methods: {
    loadChartData() {
      // Simulate data fetching
      setTimeout(() => {
        this.chartData.labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        this.chartData.datasets[0].data = [5, 10, 15, 20, 25, 30, 35];
      }, 1000); // Replace with your actual data fetching logic
    },
  },
};
</script>

<style scoped>
.chart-container {
  padding: 20px;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
