document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('equationForm');
    const methodSelect = document.getElementById('methodSelect');
    const intervalGroup = document.getElementById('intervalGroup');
    const initialGuessGroup = document.getElementById('initialGuessGroup');

    methodSelect.addEventListener('change', function() {
        if (methodSelect.value === 'newton') {
            intervalGroup.style.display = 'none';
            initialGuessGroup.style.display = 'block';
        } else {
            intervalGroup.style.display = 'block';
            initialGuessGroup.style.display = 'none';
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        let equationStr = document.getElementById('equationInput').value;
        const tolerance = parseFloat(document.getElementById('toleranceInput').value);
        const method = document.getElementById('methodSelect').value;

        equationStr = equationStr.replace(/f\(x\) *= */g, ''); 
        equationStr = equationStr.replace(/= *0 */g, ''); 

        console.log("Unesena jednadžba:", equationStr);
        console.log("Unesena točnost:", tolerance);
        console.log("Odabrana metoda:", method);

        try {
            const equation = math.compile(equationStr);
            const derivative = math.derivative(equationStr, 'x').compile();

            let solution;
            if (method === 'bisection') {
                const intervalStr = document.getElementById('intervalInput').value;
                const [a, b] = intervalStr.split(',').map(Number);
                if (isNaN(a) || isNaN(b)) {
                    displayError('Pogrešan unos intervala. Provjerite da su oba kraja intervala brojevi.');
                    return;
                }
                solution = bisectionMethod(equation, a, b, tolerance);
            } else if (method === 'newton') {
                const initialGuess = parseFloat(document.getElementById('initialGuessInput').value);
                solution = newtonMethod(equation, derivative, initialGuess, tolerance);
            }

            displaySolution(solution, equation, method);
        } catch (error) {
            console.error("Greška:", error);
            displayError('Pogreška pri parsiranju jednadžbe: ' + error.message);
        }
    });
});

function bisectionMethod(equation, a, b, tol) {
    let fa = equation.evaluate({ x: a });
    let fb = equation.evaluate({ x: b });
    if (fa * fb > 0) {
        return 'Funkcija nema nultu točku u zadanom intervalu.';
    }

    let steps = [];
    let iteration = 0;
    while ((b - a) / 2 > tol) {
        const c = (a + b) / 2;
        const fc = equation.evaluate({ x: c });

        steps.push({ iteration, a, b, c, fc });

        if (fc === 0) {
            return steps;
        } else if (fa * fc < 0) {
            b = c;
        } else {
            a = c;
            fa = fc;
        }
        iteration++;
    }

    const result = (a + b) / 2;
    steps.push({ iteration, a, b, c: result, fc: equation.evaluate({ x: result }) });
    return steps;
}

function newtonMethod(equation, derivative, x0, tol) {
    try {
        let x = x0;
        let fx = equation.evaluate({ x });
        let dfx = derivative.evaluate({ x });
        let iteration = 0;
        let steps = [];

        while (Math.abs(fx) > tol && iteration < 1000) {
            if (dfx === 0) {
                return 'Derivacija je nula, metoda se ne može primijeniti.';
            }

            const x1 = x - fx / dfx;
            steps.push({ iteration, x, fx, dfx });

            x = x1;
            fx = equation.evaluate({ x });
            dfx = derivative.evaluate({ x });
            iteration++;
        }

        steps.push({ iteration, x, fx, dfx });
        return steps;
    } catch (error) {
        console.error("Greška u Newtonovoj metodi:", error);
        throw new Error('Greška pri računanju Newtonove metode: ' + error.message);
    }
}

function displaySolution(steps, equation, method) {
    const solutionDisplay = document.getElementById('solutionDisplay');
    if (typeof steps === 'string') {
        solutionDisplay.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${steps}
            </div>
        `;
    } else {
        let tableRows;
        if (method === 'bisection') {
            tableRows = steps.map(step => `
                <tr>
                    <td>${step.iteration}</td>
                    <td>${step.a.toFixed(6)}</td>
                    <td>${step.b.toFixed(6)}</td>
                    <td>${step.c.toFixed(6)}</td>
                    <td>${step.fc.toFixed(6)}</td>
                </tr>
            `).join('');
        } else if (method === 'newton') {
            tableRows = steps.map(step => `
                <tr>
                    <td>${step.iteration}</td>
                    <td>${step.x !== undefined ? step.x.toFixed(6) : ''}</td>
                    <td>${step.fx !== undefined ? step.fx.toFixed(6) : ''}</td>
                    <td>${step.dfx !== undefined ? step.dfx.toFixed(6) : ''}</td>
                </tr>
            `).join('');
        }

        const finalResult = steps[steps.length - 1];
        const finalResultText = finalResult.c ? finalResult.c.toFixed(6) : finalResult.x.toFixed(6);

        solutionDisplay.innerHTML = `
            <div class="alert alert-success" role="alert">
                <h4 class="alert-heading">Konačno rješenje</h4>
                <p>Rješenje je približno: ${finalResultText}</p>
                <hr>
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Iteracija</th>
                            ${method === 'bisection' ? '<th>a</th><th>b</th><th>c</th><th>f(c)</th>' : '<th>x</th><th>f(x)</th><th>f\'(x)</th>'}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        plotFunction(equation, steps, method);
    }
}

function displayError(message) {
    const solutionDisplay = document.getElementById('solutionDisplay');
    solutionDisplay.innerHTML = `
        <div class="alert alert-danger" role="alert">
            ${message}
        </div>
    `;
}

function plotFunction(equation, steps, method) {
    const xValues = math.range(-10, 10, 0.1).toArray();
    const yValues = xValues.map(x => equation.evaluate({ x }));

    const trace = {
        x: xValues,
        y: yValues,
        mode: 'lines',
        type: 'scatter',
        name: 'f(x)',
        line: { color: 'blue' }
    };

    let rootTrace;
    if (method === 'bisection') {
        const iterationTraces = steps.map(step => ({
            x: [step.a, step.b],
            y: [equation.evaluate({ x: step.a }), equation.evaluate({ x: step.b })],
            mode: 'lines+markers',
            name: `Iteracija ${step.iteration}`,
            line: { dash: 'dashdot', width: 1 },
            marker: { size: 8 }
        }));
        rootTrace = {
            x: [steps[steps.length - 1].c],
            y: [equation.evaluate({ x: steps[steps.length - 1].c })],
            mode: 'markers',
            marker: { color: 'red', size: 12 },
            name: 'Rješenje'
        };
        Plotly.newPlot('plot', [trace, rootTrace, ...iterationTraces], {
            title: 'Graf funkcije s iteracijama bisekcije',
            xaxis: { title: 'x' },
            yaxis: { title: 'f(x)' }
        });
    } else if (method === 'newton') {
        const iterationTraces = steps.map(step => ({
            x: [step.x],
            y: [step.fx],
            mode: 'markers',
            name: `Iteracija ${step.iteration}`,
            marker: { size: 8 }
        }));
        rootTrace = {
            x: [steps[steps.length - 1].x],
            y: [steps[steps.length - 1].fx],
            mode: 'markers',
            marker: { color: 'red', size: 12 },
            name: 'Rješenje'
        };
        Plotly.newPlot('plot', [trace, rootTrace, ...iterationTraces], {
            title: 'Graf funkcije s iteracijama Newtonove metode',
            xaxis: { title: 'x' },
            yaxis: { title: 'f(x)' }
        });
    }
}
