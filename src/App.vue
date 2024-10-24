<script setup>
import { ref } from 'vue';
import { runFixedTime, runVariableTime } from './engine/diffeq';

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

const variableTimePoints = ref(999); // New ref for the input field

</script>

<template>
  <div class="column">

  <div>
    <input id="variableTimePoints" v-model="variableTimePoints" type="number" min="1" step="1">
    <button @click="runFixedTime(params, variableTimePoints)">Fixed Time compile and solve</button>
    <p>work: 2250, 2251, 2255</p>
    <p>error: 2000, 2252, 2260, 2500</p>

  </div>


  <button style="margin-top: 50px;" @click="runVariableTime(params)">Variable Time compile and solve</button>
</div>

</template>

<style scoped>
input {
  margin-right: 10px;
}

</style>
