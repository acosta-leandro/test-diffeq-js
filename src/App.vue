<script setup>

import { compileModel, Options, Solver, Vector } from '@martinjrobins/diffeq-js';

const code = `
in = [k1, k2, k3]
k1 { 0.04 }
k2 { 10000 }
k3 { 30000000 }
u_i {
  x = 1,
  y = 0,
  z = 0,
}
dudt_i {
  dxdt = 1,
  dydt = 0,
  dzdt = 0,
}
F_i {
  dxdt,
  dydt,
  0,
}
G_i {
  -k1 * x + k2 * y * z,
  k1 * x - k2 * y * z - k3 * y * y,
  1 - x - y - z,
}
out_i {
  x,
  y,
  z,
}`;

const model = compileModel(code).then((model) => {
  const options = new Options({});

  // create solver with default options
  const solver = new Solver(options);

  // solve the model at k1 = 0.04, k2 = 1e4, k3 = 3e7
  const inputs = new Vector([0.04, 1e4, 3e7]);

  // create a vector to store the output
  const outputs = new Vector([]);

  // solve the model from t = 0 to t = 1e5
  const times = new Vector([0, 1e5]);

  // solve the model, afterwards times will contain the times at which the
  // solution was computed, and outputs will contain the solution itself
  // in a vector of length 3 * times.length, where the first 3 elements
  // are the solution at times[0], the next 3 elements are the solution at
  // times[1], etc.
  solver.solve(times, inputs, outputs);

  // The contents of times and outputs are stored in WASM linear memory.
  // To access the contents of the vectors, use the getFloat64Array method
  // which returns a Float64Array view of the vector's contents
  console.log('times', times.getFloat64Array());
  console.log('outputs', outputs.getFloat64Array());
});








</script>

<template>
<h1>hello</h1>
</template>

<style scoped>

</style>
