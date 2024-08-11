import { compileModel, Options, Solver, Vector } from '@martinjrobins/diffeq-js';

let isCompiled = false;

const state = {
    solver: null,
    output: null,
    times: null,
};

const compile = async (eq) => {
    try {
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

const solve = (maxTime) => {
    try {
        console.log("solve");

        const inputs = new Vector([]);
        const innerOutput = new Vector([]);
        const innerTimes = new Vector([ 0, maxTime ]);

        state.solver.solve(innerTimes, inputs, innerOutput);
        state.output = innerOutput.getFloat64Array();
        state.times = innerTimes.getFloat64Array();
    }
    catch (err) {
        console.log(err);
    }
};


const mountEquationModel2 = (voltage, duration, ramp, params) => {
    function generateIdealVcString(voltage, duration) {
        let idealVcStr = 'idealVC {\n';
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
                idealVcStr += `${(currentVoltage - prevVoltage) > 0 ? '+' : '-'} ${(Math.abs(currentVoltage - prevVoltage))} / ${parseInt(duration[i])} * (t - ${accumulatedDuration}) * heaviside(t - ${accumulatedDuration}) ${(currentVoltage - prevVoltage) > 0 ? '-' : '+'} ${Math.abs((currentVoltage - prevVoltage))} / ${parseInt(duration[i])} * (t - ${accumulatedDuration + parseInt(duration[i])}) \n`
            }else{
                if (currentVoltage - prevVoltage === 0) {
                    const lastIndex = idealVcStr.lastIndexOf(')');
                    if (lastIndex !== -1) {
                        idealVcStr = idealVcStr.slice(0, lastIndex) + `) * heaviside(t - ${accumulatedDuration})` + idealVcStr.slice(lastIndex + 1);
                    }
                }else{
                    idealVcStr += `${(currentVoltage - prevVoltage) > -1 ? '+' : '-'} ${Math.abs(currentVoltage - prevVoltage)} * heaviside (t - ${accumulatedDuration})\n`;
                }
            }
        }

        idealVcStr += '}';
        return idealVcStr;
    }
    const eq = `
      in = []
      ${generateIdealVcString(voltage, duration)}
      p1 { ${params.p1} }
      p2 { ${params.p2} }
      p3 { ${params.p3} }
      p4 { ${params.p4} }
      p5 { ${params.p5} }
      p6 { ${params.p6} }
      p7 { ${params.p7} }
      p8 { ${params.p8} }
      p9 { ${params.current_conductance} }
      voltageClampELeak { ${params.leak_reversal_potential} }
      voltageClampELeakEst { ${params.estimated_leak_reversal_potential} }
      voltageClampRSealMOhm { ${params.seal_resistance} }
      voltageClampRSealEstMOhm { ${params.estimated_seal_resistance} }
      voltageClampCPrs { ${params.pipette_capacitance} }
      voltageClampCPrsEst { ${params.estimated_pipette_capacitance} }
      voltageClampRSeriesMOhm { ${params.series_resistance} }
      voltageClampRSeriesEstMOhm { ${params.estimated_series_resistance} }
      voltageClampCmEst { ${params.estimated_membrane_capacitance} }
      voltageClampAlphaPPercentage { ${params.prediction} }
      voltageClampAlphaRPercentage { ${params.series_resistance_compensation} }
      voltageClampTauClamp { ${params.tau_clamp} }
      voltageClampTauOut { ${params.tau_out} }
      voltageClampTauRs { ${params.tau_rs} }
      voltageClampTauSum { ${params.tau_sum} }
      voltageClampVOffsetEff { ${params.effective_voltage_offset} }
      voltageClampRSeries { voltageClampRSeriesMOhm * 0.001 }
      voltageClampRSeriesEst { voltageClampRSeriesEstMOhm * 0.001 }
      voltageClampAlphaP { voltageClampAlphaPPercentage / 100 }
      voltageClampAlphaR { voltageClampAlphaRPercentage / 100 }
      voltageClampGLeak { 1 / (voltageClampRSealMOhm * 0.001) }
      voltageClampGLeakEst { heaviside(voltageClampRSealEstMOhm - 1e-6) * (1 / (voltageClampRSealEstMOhm * 0.001)) }
      cellCm { ${params.membrane_capacitance} }
      extraKo { ${params.bath_solution} }
      extraNao { 140 }
      kiKi { ${params.pipette_solution} }
      naiNai { 10 }
      physR { 8.314472 }
      physT { 310 }
      physF { 9.64853415000000041e1 }
      physRTF { physR * physT / physF }
      erevEK { physRTF * log(extraKo / kiKi) }
      erevENa { physRTF * log(extraNao / naiNai) }
      u_i {
          membraneV = -80,
          ikrI = 0,
          ikrCI = 0,
          ikrO = 0,
          ikrIi = 0,
          ikrCIi = 0,
          ikrOi = 0,
          voltageClampVClamp = -80,
          voltageClampVP = -80,
          voltageClampVEst = -80,
          voltageClampIOut = 0,
          voltageClampIInP = 0
      }
      k12 { p1 * exp(p2 * membraneV) }
      k12i { p1 * exp(p2 * idealVC) }
      k14 { p7 * exp(-p8 * membraneV) }
      k14i { p7 * exp(-p8 * idealVC) }
      k21 { p3 * exp(-p4 * membraneV) }
      k21i { p3 * exp(-p4 * idealVC) }
      k41 { p5 * exp(p6 * membraneV) }
      k41i { p5 * exp(p6 * idealVC) }
      ikrC { 1 - ikrCI - ikrI - ikrO }
      ikrCi { 1 - ikrCIi - ikrIi - ikrOi }
      ikrIKr { p9 * ikrO * (membraneV - erevEK) }
      ikrIKrI { p9 * ikrOi * (idealVC - erevEK) }
      membraneIIdeal { ikrIKrI }
      membraneIIon { ikrIKr }
      voltageClampILeak { voltageClampGLeak * (membraneV - voltageClampELeak) }
      dudt_i {
          dmembraneVdt = -80,
          dikrIdt = 0,
          dikrCIdt = 0,
          dikrOdt = 0,
          dikrIidt = 0,
          dikrCIidt = 0,
          dikrOidt = 0,
          dvoltageClampVClampdt = -80,
          dvoltageClampVPdt = -80,
          dvoltageClampVEstdt = -80,
          dvoltageClampIOutdt = 0,
          dvoltageClampIInPdt = 0
      }
      F_i {
          dmembraneVdt,
          dikrIdt,
          dikrCIdt,
          dikrOdt,
          dikrIidt,
          dikrCIidt,
          dikrOidt,
          dvoltageClampVClampdt,
          dvoltageClampVPdt,
          dvoltageClampVEstdt,
          dvoltageClampIOutdt,
          dvoltageClampIInPdt
      }
      voltageClampIIn { ((voltageClampVP - membraneV + voltageClampVOffsetEff) / voltageClampRSeries + voltageClampCPrs * dvoltageClampVPdt - voltageClampCPrsEst * dvoltageClampVClampdt - voltageClampCmEst * dvoltageClampVEstdt) / cellCm }
      G_i {
          (voltageClampVP + voltageClampVOffsetEff - membraneV) / (cellCm * voltageClampRSeries) - (membraneIIon + voltageClampILeak) / cellCm,
          -k14 * ikrI + k41 * ikrO + k12 * ikrCI - k21 * ikrI,
          -k12 * ikrCI + k21 * ikrI + k41 * ikrC - k14 * ikrCI,
          -k21 * ikrO + k12 * ikrC + k14 * ikrI - k41 * ikrO,
          -k14i * ikrIi + k41i * ikrOi + k12i * ikrCIi - k21i * ikrIi,
          -k12i * ikrCIi + k21i * ikrIi + k41i * ikrCi - k14i * ikrCIi,
          -k21i * ikrOi + k12i * ikrCi + k14i * ikrIi - k41i * ikrOi,
          (idealVC + (voltageClampIInP * cellCm * voltageClampAlphaR + voltageClampCmEst * dvoltageClampVEstdt * voltageClampAlphaP) * voltageClampRSeriesEst - voltageClampVClamp) / voltageClampTauSum,
          (voltageClampVClamp - voltageClampVP) / voltageClampTauClamp,
          heaviside(voltageClampCmEst - 1e-6) *  heaviside(voltageClampRSeriesEst - 1e-6) * ((idealVC - voltageClampVEst) / ((1 - voltageClampAlphaP) * voltageClampCmEst * voltageClampRSeriesEst)),
          (voltageClampIIn - voltageClampIOut) / voltageClampTauOut,
          (voltageClampIIn - voltageClampIInP) / voltageClampTauRs
      }
      voltageClampIOutPA { voltageClampIOut * cellCm }
      voltageClampIPost { voltageClampIOut - voltageClampGLeakEst * (idealVC - voltageClampELeakEst) / cellCm }
      voltageClampIPostPA { voltageClampIPost * cellCm }
      out_i {
          voltageClampIOut,
          idealVC,
          voltageClampIIn,
          voltageClampIPostPA,
          voltageClampIPost,
          membraneV,
          membraneIIdeal,
          membraneIIon,
      }
`;
    return eq;
};


export const runModel2 = async function (params, mustCompile = false) {
    try {
        if (mustCompile || !isCompiled) {
            const eq = mountEquationModel2(params.test_pulse_voltage, params.test_pulse_duration, params.test_pulse_is_ramp, params);
            await compile(eq);
        }

        const maxTime = params.test_pulse_duration.reduce((acc, curr) => acc + parseInt(curr), 0);

        console.log("maxTime");
        console.log(maxTime);

        solve(maxTime);

        console.log("state.output");
        console.log(state.output);
        console.log("state.times");
        console.log(state.times);

        return null;
    }
    catch (e) {
        console.log(e);
    }
};