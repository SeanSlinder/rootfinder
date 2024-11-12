// Инициализация Desmos калькулятора
const plotElement = document.getElementById("plot");
const plot = Desmos.GraphingCalculator(plotElement, {
  expressions: true,
  keypad: true,
});

// Функция для установки функции и её производных
function setFunction(expression) {
  const f = (x) => math.evaluate(expression, { x });
  const fPrime = (x) => math.derivative(expression, "x").evaluate({ x });
  const fDoublePrime = (x) =>
    math.derivative(math.derivative(expression, "x"), "x").evaluate({ x });
  return { f, fPrime, fDoublePrime };
}

// Основная функция для метода хорд
function executeChordMethod() {
  const expression = document.getElementById("function").value;
  console.log(expression);
  const a = parseFloat(document.getElementById("interval-a").value);
  const b = parseFloat(document.getElementById("interval-b").value);
  const precision = parseFloat(document.getElementById("precision").value);

  const { f, fPrime, fDoublePrime } = setFunction(expression);

  const interval = findInterval(f, a, b, precision);

  if (interval) {
    const { root, iterations } = chordMethod(
      f,
      fDoublePrime,
      interval[0][0],
      interval[0][1],
      precision
    );

    document.getElementById("summary").innerHTML = `
      <p><strong>Корень:</strong> ${root}</p>
      <p><strong>Количество итераций:</strong> ${iterations}</p>
      <p><strong>Интервал:</strong> [${interval[0][0]}, ${interval[0][1]}]</p>
    `;

    const newthonRes = newtonMethod(f, fPrime, interval[0][0], precision);
    console.log("Метод Ньютона:", newthonRes);

    const toleranceLevels = [1e-3, 1e-5, 1e-7, 1e-9, 1e-11];
    const results = testConvergenceSpeedByTolerance(
      f,
      fDoublePrime,
      interval[0],
      toleranceLevels
    );

    const toleranceBody = document.getElementById("tolerance-body");
    toleranceBody.innerHTML = "";

    results.forEach((result) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${result.tolerance}</td>
        <td style="text-align: center">${result.iterations}</td>
        <td>${result.root.toFixed(6)}</td>
      `;
      toleranceBody.appendChild(row);
    });
    document.getElementById("tolerance-table").classList.remove("disp-none");

    // Построение графика функции и интервала
    plotFunction(expression, interval[0][0], interval[0][1], root);
  } else {
    plot.setBlank();
    document.getElementById(
      "summary"
    ).innerHTML = `<p>Не найден интервал, содержащий корень.</p>`;
    document.getElementById("tolerance-table").classList.add("disp-none");
  }
}

// Функция для отображения графика
function plotFunction(expression, a, b, root) {
  plot.setExpression({ id: "function", latex: `y=${expression}` });

  // Отметка начала и конца интервала
  plot.setExpression({
    id: "interval-a",
    latex: `(${a}, 0)`,
    showLabel: true,
    label: `a = ${a.toFixed(3)}`,
  });

  plot.setExpression({
    id: "interval-b",
    latex: `(${b}, 0)`,
    showLabel: true,
    label: `b = ${b.toFixed(3)}`,
  });

  // Отметка корня
  plot.setExpression({
    id: "root",
    latex: `(${root}, 0)`,
    showLabel: true,
    label: `Root ≈ ${root.toFixed(3)}`,
    color: Desmos.Colors.BLUE,
  });

  // Установка масштаба графика на область, где расположен корень
  plot.setMathBounds({
    left: a - 1,
    right: b + 1,
    bottom: -10,
    top: 10,
  });
}

// Функция для установки произвольной функции и её производных
function setFunction(expression) {
  const func = math.compile(expression);
  const funcDerivative = math.derivative(expression, "x").compile();
  const funcSecondDerivative = math
    .derivative(math.derivative(expression, "x"), "x")
    .compile();

  return {
    f: (x) => func.evaluate({ x }),
    fPrime: (x) => funcDerivative.evaluate({ x }),
    fDoublePrime: (x) => funcSecondDerivative.evaluate({ x }),
  };
}

// Поиск интервала, содержащего корень
function findInterval(f, a, b, step = 0.1) {
  let intervals = [];

  for (let x = a; x < b; x += step) {
    let x1 = x;
    let x2 = x + step;

    if (isFinite(f(x1)) && isFinite(f(x2)) && f(x1) * f(x2) <= 0) {
      intervals.push([x1, x2]);
    }
  }

  return intervals.length > 0 ? intervals : null;
}

// Основной алгоритм метода хорд с выбором неподвижного конца
function chordMethod(
  f,
  fDoublePrime,
  a,
  b,
  tolerance = 1e-3,
  maxIterations = 100
) {
  let iteration = 0;
  let root;

  // Определяем, какой конец будет неподвижным
  let fixedEnd = f(a) * fDoublePrime(a) > 0 ? a : b;
  let movingEnd = fixedEnd === a ? b : a;

  while (iteration < maxIterations) {
    root =
      movingEnd -
      (f(movingEnd) * (movingEnd - fixedEnd)) / (f(movingEnd) - f(fixedEnd));

    if (Math.abs(f(root)) < tolerance) {
      return { root, iterations: iteration + 1 };
    }

    fixedEnd = f(root) * fDoublePrime(root) > 0 ? root : fixedEnd;
    movingEnd = root;
    iteration++;
  }

  return { root, iterations: iteration };
}

// Исследование скорости сходимости в зависимости от точности
function testConvergenceSpeedByTolerance(
  f,
  fDoublePrime,
  interval,
  toleranceLevels
) {
  const results = [];

  toleranceLevels.forEach((tolerance) => {
    const [a, b] = interval;
    const { root, iterations } = chordMethod(f, fDoublePrime, a, b, tolerance);
    results.push({ tolerance, root, iterations });
  });

  return results;
}

// Исследование скорости сходимости по методу Ньютона
function newtonMethod(f, fPrime, x0, tolerance, maxIterations = 100) {
  let iteration = 0;
  let x = x0;

  while (iteration < maxIterations) {
    const fx = f(x);
    const fpx = fPrime(x);

    if (Math.abs(fx) < tolerance) {
      return { root: x, iterations: iteration + 1 };
    }

    if (fpx === 0) {
      console.log("Производная равна нулю, метод Ньютона не применим");
      return { root: null, iterations: iteration };
    }

    x = x - fx / fpx;
    iteration++;
  }

  return { root: x, iterations: iteration };
}
