import { compileModel, Options, Solver, Vector } from '@martinjrobins/diffeq-js';
import model2Data from './model2.json';
import vc_model2_ideal from './model2_ideal.json';

const storeModel2 = {
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

const storeModel4 = {
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
    }
}

// State management
const state = {
    solvers: {},
    outputs: {},
    times: {},
};

// Model configurations
const modelConfigurations = {
    2: {
        parameters: {
            p1: "ikrP1", p2: "ikrP2", p3: "ikrP3", p4: "ikrP4", p5: "ikrP5", 
            p6: "ikrP6", p7: "ikrP7", p8: "ikrP8", current_conductance: "ikrP9",
            leak_reversal_potential: "voltageClampELeak", 
            estimated_leak_reversal_potential: "voltageClampELeakEst", 
            seal_resistance: "voltageClampRSealMOhm",
            estimated_seal_resistance: "voltageClampRSealEstMOhm", 
            pipette_capacitance: "voltageClampCPrs", 
            estimated_pipette_capacitance: "voltageClampCPrsEst",
            series_resistance: "voltageClampRSeriesMOhm", 
            estimated_series_resistance: "voltageClampRSeriesEstMOhm", 
            estimated_membrane_capacitance: "voltageClampCmEst",
            prediction: "voltageClampAlphaPPercentage", 
            series_resistance_compensation: "voltageClampAlphaRPercentage",
            tau_clamp: "voltageClampTauClamp", tau_out: "voltageClampTauOut", 
            tau_rs: "voltageClampTauRs",
            tau_sum: "voltageClampTauSum", 
            effective_voltage_offset: "voltageClampVOffsetEff",
            membrane_capacitance: "cellCm", 
            bath_solution: "extraKo", 
            pipette_solution: "kiKi"
        },
        outputs: ['idealVC', 'voltageClampIPostPA', 'membraneV', 'membraneIIdeal', 'membraneIIon'],
        json: model2Data.eq,
        voltageProtocolVariableName: 'enginePace',
        defaultParams: storeModel2.params
    },
    4: {
        parameters: {
            membrane_capacitance: "cellCm",
            bath_solution: "extraKo",
            pipette_solution: "kiKi",
            p1: "ikrP1",
            p2: "ikrP2",
            p3: "ikrP3",
            p4: "ikrP4",
            p5: "ikrP5",
            p6: "ikrP6",
            p7: "ikrP7",
            p8: "ikrP8",
            current_conductance: "ikrP9",
        },
        outputs: ["membraneIIon"],
        outputNames: ["ideal_current"],
        json: vc_model2_ideal.eq,
        voltageProtocolVariableName: "enginePace",
        defaultParams: storeModel4.params
    }
};

// Helper functions
const generateIdealVcString = (voltage, duration, ramp, variableName) => {
    const SCALE = 5000;
    const n = voltage.length;
    let t0 = 0;
    let protocol = [];

    for (let i = 0; i < n; i++) {
        const currVolt = parseInt(voltage[i]);
        const currDuration = parseInt(duration[i]);
        const t1 = t0 + currDuration;

        if (ramp[i] && i > 0 && i < n - 1) {
            const prevVolt = voltage[i - 1];
            const voltDiff = currVolt - prevVolt;
            const vDiffStr = `${voltDiff < 0 ? "-" : "+"} ${Math.abs(voltDiff)}`;
            protocol.push(
                `+ (${prevVolt} ${vDiffStr} * (t - ${t0}) / ${currDuration})` +
                ` * (sigmoid((t - ${t0}) * ${SCALE}) - sigmoid((t - ${t1}) * ${SCALE}))`
            );
        } else {
            const vStr = `${currVolt < 0 ? "-" : "+"}${Math.abs(currVolt)}`;
            if (i === 0) {
                protocol.push(`${vStr} * (1 - sigmoid((t - ${t1}) * ${SCALE}))`);
            } else if (i === n - 1) {
                protocol.push(`${vStr} * sigmoid((t - ${t0}) * ${SCALE})`);
            } else {
                protocol.push(
                    `${vStr} * (sigmoid((t - ${t0}) * ${SCALE}) - sigmoid((t - ${t1}) * ${SCALE}))`
                );
            }
        }
        t0 = t1;
    }

    return `${variableName} {\n${protocol.map(x => "  " + x).join("\n")}\n}`;
};

const createInputs = (modelParams, parameters) => {
    return new Vector(Object.keys(parameters).map(key => modelParams[key]));
};

const mountEquation = async (modelIndex, voltage, duration, ramp) => {
    const config = modelConfigurations[modelIndex];
    const output = `out_i  {\n ${config.outputs.join(',\n ')} \n}`;
    
    return config.json
        .replace('in = [ ]', `in = [ ${Object.values(config.parameters).join(', ')} ]`)
        .replace(
            `${config.voltageProtocolVariableName} { 0.0 }`, 
            generateIdealVcString(voltage, duration, ramp, config.voltageProtocolVariableName)
        )
        .replace(/out_i\s*{[^}]*}/, output.trim());
};

const compileEquation = async (eq, id) => {
    try {
        console.log("Compiling equation", id);
        state.solvers[id]?.destroy();
        await compileModel(eq);
        console.log("Compiled equation", id);
        const options = new Options({ fixed_times: false, mxsteps: 10000 });
        state.solvers[id] = new Solver(options);
    } catch (e) {
        console.error('Compilation error:', e);
        throw e;
    }
};

const solveEquation = async (id, maxTime, modelParams) => {
    try {
        console.log("Solving equation", id);
        const config = modelConfigurations[id];
        const innerOutput = new Vector([]);
        const innerTimes = new Vector([0, maxTime]);
        const inputs = createInputs(modelParams, config.parameters);

        state.solvers[id].solve(innerTimes, inputs, innerOutput);

        state.outputs[id] = innerOutput.getFloat64Array();
        state.times[id] = innerTimes.getFloat64Array();

        innerOutput.destroy();
        innerTimes.destroy();
        inputs.destroy();
        console.log("Solved equation", id);
        console.log("Outputs", state.outputs[id].length);
        const outputArrays = Array(config.outputs.length).fill().map(() => []);
        state.outputs[id].forEach((output, i) => {
            outputArrays[i % outputArrays.length].push(output);
        });

        return {
            command_voltage: outputArrays[0],
            recorded_current: outputArrays[1],
            membrane_voltage: outputArrays[2],
            ideal_current: outputArrays[3],
            cell_current: outputArrays[4],
            time: state.times[id],
            plot_range: [],
        };
    } catch (err) {
        console.error('Solving error:', err);
        throw err;
    }
};

const prepareEquation = async (modelNumber, params) => {
    const eq = await mountEquation(
        modelNumber, 
        params.test_pulse_voltage, 
        params.test_pulse_duration, 
        params.test_pulse_is_ramp
    );
    const maxTime = params.test_pulse_duration.reduce((acc, curr) => acc + parseInt(curr), 0);
    return { eq, maxTime };
};

// Public API
export const compileModel2 = async () => {
    const params = storeModel2.params;
    const { eq } = await prepareEquation(2, params);
    await compileEquation(eq, 2);
};

export const compileModel4 = async () => {
    const params = storeModel4.params;
    const { eq } = await prepareEquation(4, params);
    await compileEquation(eq, 4);
};

export const solveModel2 = async () => {
    const params = storeModel2.params;
    const { maxTime } = await prepareEquation(2, params);
    return await solveEquation(2, maxTime, modelConfigurations[2].defaultParams);
};

export const solveModel4 = async () => {
    const params = storeModel4.params;
    const { maxTime } = await prepareEquation(4, params);
    return await solveEquation(4, maxTime, modelConfigurations[4].defaultParams);
};


export const printState = () => {
    console.log(state);
};
















