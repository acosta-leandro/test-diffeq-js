<script setup>

import { runModel2, runModel4  } from './engine/diffeq';
const params = {
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
    500,
    500,
    500
  ],
  "test_pulse_voltage": [
    -80,
    40,
    -40
  ],
  "test_pulse_is_ramp": [
    false,
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
  "tau_rs": 0.1
}


</script>

<template>
  <button @click="runModel2(params)">MODEL 2</button>
  <button @click="runModel4(params)">Model 4</button>
</template>

<style scoped>

</style>
