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



function generateIdealVcString(voltage, duration, ramp, variableName) {
    let idealVcStr = variableName + ' {\n';
    let accumulatedVoltage = parseInt(voltage[0]);
    let accumulatedDuration = 0;

    idealVcStr += ` ${accumulatedVoltage}\n`;

    for (let i = 1; i < voltage.length; i++) {
        // console.log(voltage[i]);
        let currentVoltage = parseInt(voltage[i]);
        let currentDuration = parseInt(duration[i - 1]);


        accumulatedDuration += currentDuration;
        let prevVoltage = 0;
        if (i > 0) {
            prevVoltage = voltage[i - 1];
        }
        if (ramp[i]) {
            idealVcStr += `${(currentVoltage - prevVoltage) > 0 ? '+' : '-'} ${(Math.abs(currentVoltage - prevVoltage))} / ${parseInt(duration[i])} * (t - ${accumulatedDuration}) * heaviside(t - ${accumulatedDuration}) ${(currentVoltage - prevVoltage) > 0 ? '-' : '+'} ${Math.abs((currentVoltage - prevVoltage))} / ${parseInt(duration[i])} * (t - ${accumulatedDuration + parseInt(duration[i])}) * heaviside(t - ${accumulatedDuration + parseInt(duration[i])}) \n`;
        } else {
            if (currentVoltage - prevVoltage === 0) {
                const lastIndex = idealVcStr.lastIndexOf(')');
                if (lastIndex !== -1) {
                    idealVcStr = idealVcStr.slice(0, lastIndex) + `) * heaviside(t - ${accumulatedDuration})` + idealVcStr.slice(lastIndex + 1);
                }
            } else {
                idealVcStr += `${(currentVoltage - prevVoltage) > -1 ? '+' : '-'} ${Math.abs(currentVoltage - prevVoltage)} * heaviside (t - ${accumulatedDuration})\n`;
            }
        }
    }

    idealVcStr += '}';
    return idealVcStr;
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



















