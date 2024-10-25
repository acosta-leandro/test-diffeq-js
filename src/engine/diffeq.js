import { compileModel, Options, Solver, Vector } from '@martinjrobins/diffeq-js';
// const storeModel2 = paramsStoreModel2();
import model2Data from './model2.json';

const storeMockup = {
    params: {
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
}

let isCompiled = false;
const state = {
    solver: null,
    output: null,
    times: null,
};

/**
 * Generates DiffSL-compatible voltage protocol using threshold functions.
 *
 * Constructs a string that represents a piecewise function of voltage
 * over time, using the provided voltage steps, durations, and ramp flags. 
 * The resulting string is formatted to be used in DiffSL model.
 *
 * @param {Array<number>} voltage - An array of voltage values for each step.
 * @param {Array<number>} duration - An array of duration values for each step.
 * @param {Array<boolean>} ramp - An array of boolean flags with ramp[i] 
 *                                indicating whether to ramp from 
 *                                voltage[i-1] to voltage[i].
 * @param {string} variableName - The name of the variable to be used in the 
 *                                generated string.
 * @param {string} func - The threshold function e.g. "sigmoid" or "heaviside",
 *                        which should have range 0 <= x <= 1
 *
 * @returns {string} - A string representing the voltage protocol function.
 */
function generateIdealVcString(voltage, duration, ramp, variableName, func = "sigmoid") {
    const n = voltage.length;
    let t0 = 0;
    let protocol = [];

    for (let i = 0; i < n; i++) {
        const currVolt = parseInt(voltage[i]);
        const currDuration = parseInt(duration[i]);

        const t1 = t0 + currDuration;

        // Ramps are disabled for first and last pulse
        if (ramp[i] && i > 0 && i < n - 1) {
            // Expr: (v0 + (v1-v0) * (t-t0) / (t1-t0)) * (func(t-t0) - func(t-t1))
            // v0 is the voltage the ramp starts at, v1 is where it ends
            // t0 is the time the ramp starts, t1 is when it ends
            const prevVolt = voltage[i - 1];
            const voltDiff = currVolt - prevVolt;
            const vDiffStr = `${voltDiff < 0 ? "-" : "+"} ${Math.abs(voltDiff)}`;
            protocol.push(`+ (${prevVolt} ${vDiffStr} * (t - ${t0}) / ${currDuration})` +
                ` * (${func}(t - ${t0}) - ${func}(t - ${t1}))`);
        } else {
            // Expr: v * (func(t-t0) - func(t-t1))
            // v is the voltage, t0 is its start time, t1 is its end time
            const vStr = `${currVolt < 0 ? "-" : "+"}${Math.abs(currVolt)}`;
            if (i == 0) {
                protocol.push(`${vStr} * (${func}(t) - ${func}(t - ${t1}))`);
            } else if (i == n - 1) {
                // Duration isn't limited for final pulse
                protocol.push(`${vStr} * ${func}(t - ${t0})`);
            } else {
                protocol.push(
                    `${vStr} * (${func}(t - ${t0}) - ${func}(t - ${t1}))`
                );
            }
        }

        t0 = t1;
    }

    const protocolEq = protocol.map((x) => "  " + x).join("\n");
    return `${variableName} {\n${protocolEq}\n}`;
}

const mountEquation = async (modelIndex, voltage, duration, ramp) => {
    const {
        parameters,
        outputs,
        json,
        voltageProtocolVariableName
    } = modelConfigurations[modelIndex];

    const output = `out_i  {\n ${outputs.join(',\n ')} \n}`;
    let equation;

    try {
        // equation = await fetchText(json);
        equation = json;
    } catch (error) {
        console.error(`Error fetching equation for model ${modelIndex}:`, error);
        throw error; // Re-throw to handle further up if necessary
    }

    const inputs = Object.values(parameters);

    equation = equation
        .replace('in = [ ]', `in = [ ${inputs.join(', ')} ]`)
        .replace(`${voltageProtocolVariableName} { 0.0 }`, `${generateIdealVcString(voltage, duration, ramp, voltageProtocolVariableName)} `)
        .replace(/out_i\s*{[^}]*}/, output.trim());

    return equation;
};
const createInputs = (modelParams, parameters) => {
    console.log("Solve Inputs");
    console.log(modelParams);
    return new Vector(Object.keys(parameters).map(key => modelParams[key]));
};


const compile = async (eq) => {
    try {
        state.solver?.destroy()
        console.log('compile');
        console.log(eq);
        await compileModel(eq);
        state.solver = new Solver(new Options({}));
        isCompiled = true;
    }
    catch (e) {
        console.log(e);
    }
};
const solveModel = (maxTime, inputs) => {
    try {
        const innerOutput = new Vector([]);

        const innerTimes = new Vector([0, maxTime]);

        state.solver.solve(innerTimes, inputs, innerOutput);
        state.output = innerOutput.getFloat64Array();
        state.times = innerTimes.getFloat64Array();

        innerOutput.destroy();
        innerTimes.destroy();
        inputs.destroy();
    } catch (err) {
        console.error(err);
    }
};

const compileFixed = async (eq) => {
    try {
        state.solver?.destroy()
        console.log('compile');
        console.log(eq);
        await compileModel(eq);
        state.solver = new Solver(new Options({fixed_times: true}));
        isCompiled = true;
    }
    catch (e) {
        console.log(e);
    }
};
const solveModelFixed = (maxTime, inputs, steps) => {
    try {
        const innerOutput = new Vector([]);

        function linspace(start, stop, num) {
            const step = (stop - start) / num;
            return Array.from({length: num}, (_, i) => start + step * i);
        }

        const tarr = linspace(0, maxTime, steps);
        console.log("Requested times Length");
        console.log(tarr.length);

        const innerTimes = new Vector(tarr);

        state.solver.solve(innerTimes, inputs, innerOutput);
        state.output = innerOutput.getFloat64Array();
        state.times = innerTimes.getFloat64Array();

        innerOutput.destroy();
        innerTimes.destroy();
        inputs.destroy();
    } catch (err) {
        console.error(err);
    }
};


const modelConfigurations = {
    2: {
        parameters: {
            p1: "ikrP1", p2: "ikrP2", p3: "ikrP3", p4: "ikrP4", p5: "ikrP5", p6: "ikrP6", p7: "ikrP7", p8: "ikrP8", current_conductance: "ikrP9",
            leak_reversal_potential: "voltageClampELeak", estimated_leak_reversal_potential: "voltageClampELeakEst", seal_resistance: "voltageClampRSealMOhm",
            estimated_seal_resistance: "voltageClampRSealEstMOhm", pipette_capacitance: "voltageClampCPrs", estimated_pipette_capacitance: "voltageClampCPrsEst",
            series_resistance: "voltageClampRSeriesMOhm", estimated_series_resistance: "voltageClampRSeriesEstMOhm", estimated_membrane_capacitance: "voltageClampCmEst",
            prediction: "voltageClampAlphaPPercentage", series_resistance_compensation: "voltageClampAlphaRPercentage",
            tau_clamp: "voltageClampTauClamp", tau_out: "voltageClampTauOut", tau_rs: "voltageClampTauRs",
            tau_sum: "voltageClampTauSum", effective_voltage_offset: "voltageClampVOffsetEff",
            membrane_capacitance: "cellCm", bath_solution: "extraKo", pipette_solution: "kiKi"
        },
        outputs: ['idealVC', 'voltageClampIPostPA', 'membraneV', 'membraneIIdeal', 'membraneIIon'],
        json: model2Data.eq,
        voltageProtocolVariableName: 'enginePace',
        solve: (maxTime, steps) => {
            const modelParams = storeMockup.params;
            const inputs = createInputs(modelParams, modelConfigurations[2].parameters);
            solveModelFixed(maxTime, inputs, steps);
        },
    },
    4: {
        parameters: {
            p1: "ikrP1", p2: "ikrP2", p3: "ikrP3", p4: "ikrP4", p5: "ikrP5", p6: "ikrP6", p7: "ikrP7", p8: "ikrP8", current_conductance: "ikrP9",
            leak_reversal_potential: "voltageClampELeak", estimated_leak_reversal_potential: "voltageClampELeakEst", seal_resistance: "voltageClampRSealMOhm",
            estimated_seal_resistance: "voltageClampRSealEstMOhm", pipette_capacitance: "voltageClampCPrs", estimated_pipette_capacitance: "voltageClampCPrsEst",
            series_resistance: "voltageClampRSeriesMOhm", estimated_series_resistance: "voltageClampRSeriesEstMOhm", estimated_membrane_capacitance: "voltageClampCmEst",
            prediction: "voltageClampAlphaPPercentage", series_resistance_compensation: "voltageClampAlphaRPercentage",
            tau_clamp: "voltageClampTauClamp", tau_out: "voltageClampTauOut", tau_rs: "voltageClampTauRs",
            tau_sum: "voltageClampTauSum", effective_voltage_offset: "voltageClampVOffsetEff",
            membrane_capacitance: "cellCm", bath_solution: "extraKo", pipette_solution: "kiKi"
        },
        outputs: ['idealVC', 'voltageClampIPostPA', 'membraneV', 'membraneIIdeal', 'membraneIIon'],
        json: model2Data.eq,
        voltageProtocolVariableName: 'enginePace',
        solve: (maxTime) => {
            const modelParams = storeMockup.params;
            const inputs = createInputs(modelParams, modelConfigurations[2].parameters);
            solveModel(maxTime, inputs);
        },
    },
};


const runModel = async (modelNumber, params, mustCompile = false) => {
    try {
        const eq = await mountEquation(modelNumber, params.test_pulse_voltage, params.test_pulse_duration, params.test_pulse_is_ramp);

        if (mustCompile || !isCompiled) {
            await compile(eq);
        }

        const maxTime = params.test_pulse_duration.reduce((acc, curr) => acc + parseInt(curr), 0);
        modelConfigurations[modelNumber].solve(maxTime);


        const command_voltage = [];
        const recorded_current = [];
        const membrane_voltage = [];
        const ideal_current =[];
        const cell_current = [];

        const lists = [command_voltage, recorded_current, membrane_voltage, ideal_current, cell_current];

        state.output.forEach((output, i) => {
            lists[i % lists.length].push(output);
        });


        const data = {
            command_voltage: command_voltage,
            recorded_current: recorded_current,
            membrane_voltage: membrane_voltage,
            ideal_current: ideal_current,
            cell_current: cell_current,
            time: state.times,
            plot_range: [],
        };

        console.log("Solve Outputs");
        console.log(data);
        return data;
    } catch (e) {
        console.log(e);
    }
};
const runModelFixed = async (modelNumber, params, mustCompile = false, steps) => {
    try {
        const eq = await mountEquation(modelNumber, params.test_pulse_voltage, params.test_pulse_duration, params.test_pulse_is_ramp);

        if (mustCompile || !isCompiled) {
            await compileFixed(eq);
        }

        const maxTime = params.test_pulse_duration.reduce((acc, curr) => acc + parseInt(curr), 0);
        modelConfigurations[modelNumber].solve(maxTime, steps);


        const command_voltage = [];
        const recorded_current = [];
        const membrane_voltage = [];
        const ideal_current =[];
        const cell_current = [];

        const lists = [command_voltage, recorded_current, membrane_voltage, ideal_current, cell_current];

        state.output.forEach((output, i) => {
            lists[i % lists.length].push(output);
        });


        const data = {
            command_voltage: command_voltage,
            recorded_current: recorded_current,
            membrane_voltage: membrane_voltage,
            ideal_current: ideal_current,
            cell_current: cell_current,
            time: state.times,
            plot_range: [],
        };

        console.log("Solve Outputs");
        console.log(data);
        return data;
    } catch (e) {
        console.log(e);
    }
};

export const runFixedTime = (params, steps) => runModelFixed(2, params, true, steps);
export const runVariableTime = (params) => runModel(4, params, true);



















