<script setup>
  import { ref } from 'vue';
  import { compileModel2, compileModel4, solveModel2, solveModel4, printState } from './engine/diffeq';

  const params = ref({
    "membrane_capacitance": 20,
    "current_conductance": 50,
    "p1": 2.07e-3,
    "p2": 7.17e-2,
    "p3": 3.44e-5,
    "p4": 6.18e-2,
    "p5": 4.18e-1,
    "p6": 2.58e-2,
    "p7": 4.75e-2,
    "p8": 2.51e-2,
    "leak_reversal_potential": -80,
    "seal_resistance": 5000,
    "estimated_seal_resistance": 5000,
    "estimated_leak_reversal_potential": -80,
    "pipette_capacitance": 4,
    "series_resistance": 30,
    "pipette_solution": 130,
    "bath_solution": 5.4,
    "test_pulse_duration": [
      "250",
      "50",
      "400",
      "200",
      "1000",
      "500",
      "1000",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "500",
      "1000",
      "500",
      "10",
      "100",
      "390",
      "500"
    ],
    "test_pulse_voltage": [
      "-80",
      "-120",
      "-80",
      "-80",
      "40",
      "-120",
      "-80",
      "-40",
      "-60",
      "-20",
      "-40",
      "0",
      "-20",
      "20",
      "0",
      "40",
      "20",
      "40",
      "0",
      "20",
      "-20",
      "0",
      "-40",
      "-20",
      "-60",
      "-40",
      "-80",
      "40",
      "-70",
      "-110",
      "-120",
      "-50"
    ],
    "test_pulse_is_ramp": [
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false
    ],
    "effective_voltage_offset": 0,
    "estimated_pipette_capacitance": 4,
    "estimated_membrane_capacitance": 20,
    "estimated_series_resistance": 30,
    "series_resistance_compensation": 70,
    "prediction": 70,
    "tau_sum": 0.001,
    "tau_clamp": 0.001,
    "tau_out": 0.0075,
    "tau_rs": 0.1,
    "variable_time_points": 1000 // Default value
  });

  const compile2 = async () => {
    await compileModel2();
  };

  const compile4 = async () => {
    await compileModel4();
  };

  const solve2 = async () => {
    await solveModel2();
  };

  const solve4 = async () => {
    await solveModel4();
  };

</script>

<template>
<div class="column">
  <div>
    <button @click="compile2">Compile 2</button>
    <button @click="compile4">Compile 4</button>
    <button @click="solve2">Solve 2</button>
    <button @click="solve4">Solve 4</button>
  </div>

  <button style="margin-top: 50px;" @click="printState()">Print State</button>
</div>
</template>

<style scoped>
button {
  margin-right: 10px;
}
</style>
