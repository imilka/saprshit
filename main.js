/**
 * Created by ibziy_000 on 25.02.15.
 */
module = angular.module('optimizationApp', []);

module.service('ModelService', function() {

  var CONST_E = 3;
  var NODE_COUNT = 3;

  var DESIRED_VOLTAGE_NUMBER = 2;
  var DESIRED_NODE_VOLTAGE = 15;

  var IMMUTABLE_RESISTORS = ["R1", "R3", "R4"];

  function Resistor(name, value, leftNode, rightNode) {
    this.name = name;
    this.value = value;
    this.leftNode = leftNode;
    this.rightNode = rightNode;

    this.grounded = function() {
      return (leftNode == 0 || rightNode == 0);
    }
  }

  var resistors = [
    new Resistor("R1", 5, 0, 1),
    new Resistor("R2", 30, 1, 3),
    new Resistor("R3", 1, 2, 3),
    new Resistor("R4", 1, 2, 0),
    new Resistor("R5", 10, 1, 3)
  ];
  var coefficientMatrix = [];
  var gradientVector = [];
  var gessianMatrix = [];
  var nodeVoltages = [];

  var gessian = 0;

  this.recalculate = function() {
    calculateNodeVoltages();
    calculateGradientVector();
    calculateGessianMatrix();
  };

  var calculateGessianMatrix = function() {
    var diffMatrix1 = differentiateMatrix(resistors[1]); //дифф по первому вар. параметру
    var diffMatrix2 = differentiateMatrix(resistors[4]);//дифф по второму вар. параметру
    var solution1 = numeric.neg(numeric.dot(diffMatrix1, nodeVoltages)); //умножаем на вектор u1 u2 u3
    var solution2 = numeric.neg(numeric.dot(diffMatrix2, nodeVoltages)); //умножаем на вектор u1 u2 u3
    var firstRightSide = numeric.add(solution1, solution2);  // суммируем получившиеся векторы

    // gessiMatrixEqualValues = значения на индексах 01 и 10 в матрице Гессе
    var gessiMatrixEqualValues = numeric.solve(coefficientMatrix, firstRightSide)[0]; // решаем СЛАУ для матрицы коэф начальной и предыдущей строки, берем значение по счету какое брали раньше
    // numeric.dot -- умножение вектора на матрицу или вектора на вектор, потом умножаем на -2
    var solution00 = numeric.mul(numeric.dot(diffMatrix1, numeric.dot(diffMatrix1, nodeVoltages)), -2);
    var solution11 = numeric.mul(numeric.dot(diffMatrix2, numeric.dot(diffMatrix2, nodeVoltages)), -2);
    // получаем значения для индексов 00 и 11 в матрице Гессе
    var gessiMatrix00 = numeric.solve(coefficientMatrix, solution00)[0];
    var gessiMatrix11 = numeric.solve(coefficientMatrix, solution11)[0];
    // матрица
    gessianMatrix = [[gessiMatrix00, gessiMatrixEqualValues],[gessiMatrixEqualValues, gessiMatrix11]];
    // ее определитель - Гессинан
    gessian = (gessianMatrix[0][0] * gessianMatrix[1][1]) - ( gessianMatrix[0][1] * gessianMatrix[1][0]);
  };

  var calculateGradientVector = function() {
    gradientVector = [].repeat(0, resistors.length - IMMUTABLE_RESISTORS.length);
    var i = 0;

    resistors.forEach(function(resistor) {
      if(IMMUTABLE_RESISTORS.indexOf(resistor.name) == -1) {
        gradientVector[i] = getGradientValue(resistor);
        i++;
      }
    });
  };

  var getGradientValue = function(resistor) {
    var rightSide = numeric.neg(numeric.dot(differentiateMatrix(resistor), nodeVoltages));
    return numeric.solve(coefficientMatrix, rightSide)[DESIRED_VOLTAGE_NUMBER] * (nodeVoltages[DESIRED_VOLTAGE_NUMBER] - DESIRED_NODE_VOLTAGE);
  };

  var differentiateMatrix = function(resistor) {
    var result = [];
    for(var i = 0; i < NODE_COUNT; i++) {
      result[i] = [].repeat(0, NODE_COUNT);
    }

    if(resistor.leftNode > 0) result[resistor.leftNode - 1][resistor.leftNode - 1] = 1;
    if(resistor.rightNode > 0) result[resistor.rightNode - 1][resistor.rightNode - 1] = 1;

    if(!resistor.grounded()) {
      result[resistor.leftNode - 1][resistor.rightNode - 1] = -1;
      result[resistor.rightNode - 1][resistor.leftNode - 1] = -1;
    }

    return result;
  };

  var calculateNodeVoltages = function() {
    calculateCoefficientMatrix();
    nodeVoltages = numeric.solve(coefficientMatrix, [CONST_E*resistors[0].value, 0, 0]);
  };

  var calculateCoefficientMatrix = function() {
    for(var i = 0; i < NODE_COUNT; i++) {
      coefficientMatrix[i] = [].repeat(0, NODE_COUNT);
    }

    resistors.forEach(function(resistor) {
      addCoefficientValue(resistor);
    });
  };

  var addCoefficientValue = function(resistor) {
    if(resistor.leftNode > 0) coefficientMatrix[resistor.leftNode - 1][resistor.leftNode - 1] += 1.0/resistor.value;
    if(resistor.rightNode > 0) coefficientMatrix[resistor.rightNode - 1][resistor.rightNode - 1] += 1.0/resistor.value;

    if(!resistor.grounded()) {
      coefficientMatrix[resistor.leftNode - 1][resistor.rightNode - 1] -= 1.0/resistor.value;
      coefficientMatrix[resistor.rightNode - 1][resistor.leftNode - 1] -= 1.0/resistor.value;
    }
  };

  this.getResistorsList = function() {
    return resistors;
  };

  this.getNodesList = function() {
    return nodeVoltages;
  };

  this.getGradientVector = function() {
    return gradientVector;
  };

  this.getGessianMatrix = function() {
    return gessianMatrix;
  }

  this.getTargetFunctionValue = function() {
    return Math.pow(nodeVoltages[DESIRED_VOLTAGE_NUMBER] - DESIRED_NODE_VOLTAGE, 2);
  };

  this.calculateTargetFunctionValue = function(resistor, value) {
    resistor.value = value;
    this.recalculate();
    return this.getTargetFunctionValue();
  };

  Array.prototype.repeat = function(what, L){
    while(L) this[--L]= what;
    return this;
  };

  // Service initialization
  this.recalculate();
});

module.controller('MainController', ['$scope', 'ModelService', function($scope, model) {
  $scope.resistors = model.getResistorsList();

  $scope.recalculateModel = function() {
    model.recalculate();
    $scope.updateModel();
  };

  $scope.updateModel = function() {
    $scope.nodeVoltages = model.getNodesList();
    $scope.gradientVector = model.getGradientVector();
    $scope.targetFunctionValue = model.getTargetFunctionValue();
    $scope.gessianMatrix = model.getGessianMatrix();
  };

  $scope.updateModel();

  $scope.$on('updatedEvent', function(event, args) {
    $scope.updateModel();
  });
}]);

module.controller('PowellController', ['$scope', 'ModelService', function($scope, model) {

  $scope.chart = AmCharts.makeChart("chartdiv-pwc",
    {
      "type": "xy",
      "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
      "startDuration": 0,
      "trendLines": [],
      "graphs": [
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "diamond",
          "id": "AmGraph-1",
          "lineAlpha": 0,
          "lineColor": "#b0de09",
          "valueField": "value",
          "xField": "x",
          "yField": "y"
        },
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "round",
          "id": "AmGraph-2",
          "lineAlpha": 0,
          "lineColor": "#ff0000",
          "valueField": "value2",
          "xField": "x2",
          "yField": "y2"
        }
      ],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 20
      },
      "guides": [
        {
          "label": "a",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "b",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "c",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        }
      ],
      "valueAxes": [
        {
          "id": "ValueAxis-1",
          "axisAlpha": 0
        },
        {
          "id": "ValueAxis-2",
          "position": "bottom",
          "axisAlpha": 0,
          "minimum": 0,
          "maximum": 20
        }
      ],
      "allLabels": [],
      "balloon": {},
      "titles": [],
      "dataProvider": [{
        "x2":0, "y2":0
      }, {
        "x2":0, "y2":0
      }, {
        "x2":0, "y2":0
      }]
    }
  );

  $scope.TOL = 0.01; $scope.GOLD = 1.618034;
  $scope.ax = 1; $scope.bx = 20; $scope.cx = 0;
  $scope.fa = 0; $scope.fb = 0; $scope.fc = 0;
  $scope.modifiedResistor = model.getResistorsList()[1];
  $scope.stepsTaken = 0; $scope.functionCalculated = 0;

  $scope.calculateBrackets = function() {
    $scope.fa = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.ax);
    $scope.fb = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.bx);
    $scope.functionCalculated += 2;

    // swapping if needed
    if($scope.fb > $scope.fa) {
      $scope.fb = [$scope.fa, $scope.fa = $scope.fb][0];
      $scope.bx = [$scope.ax, $scope.ax = $scope.bx][0];
    }

    // first guess for c
    $scope.cx = $scope.bx + $scope.GOLD*($scope.bx - $scope.ax);
    $scope.fc = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.cx);
    $scope.functionCalculated++;

    while($scope.fb >= $scope.fc) {
      var u = $scope.cx + $scope.GOLD * ($scope.cx-$scope.bx);
      var fu = model.calculateTargetFunctionValue($scope.modifiedResistor, u);
      $scope.functionCalculated++;

      $scope.ax = $scope.bx; $scope.bx = $scope.cx; $scope.cx = u;
      $scope.fa = $scope.fb; $scope.fb = $scope.fc; $scope.fc = fu;
    }

    $scope.currentMin = Math.min($scope.fa, $scope.fb, $scope.fc);

    $scope.$emit('updatedEvent', null);
  };

  $scope.findMinimumStep = function() {
    $scope.chart.dataProvider[0] = {
      "x2": $scope.ax, "y2": $scope.fa
    };
    $scope.chart.dataProvider[1] = {
      "x2": $scope.bx, "y2": $scope.fb
    };
    $scope.chart.dataProvider[2] = {
      "x2": $scope.cx, "y2": $scope.fc
    };

    var t = (Math.pow($scope.bx, 2)-Math.pow($scope.cx, 2))*$scope.fa +
      (Math.pow($scope.cx, 2)-Math.pow($scope.ax, 2))*$scope.fb +
      (Math.pow($scope.ax, 2)-Math.pow($scope.bx, 2))*$scope.fc;
    var b = ($scope.bx-$scope.cx)*$scope.fa +
      ($scope.cx-$scope.ax)*$scope.fb +
      ($scope.ax-$scope.bx)*$scope.fc;

    $scope.m = t/b/2;
    $scope.fm = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.m);

    console.log("=== M: ", $scope.m, $scope.fm);

    $scope.dx = $scope.cx; $scope.fd = $scope.fc;
    if($scope.m > $scope.bx) {
      $scope.cx = $scope.m; $scope.fc = $scope.fm;
    } else {
      $scope.cx = $scope.bx; $scope.fc = $scope.fb;
      $scope.bx = $scope.m; $scope.fb = $scope.fm;
    }

    var aIsLargest = !!(($scope.fa > $scope.fb && $scope.fa > $scope.fc && $scope.fa > $scope.fd));
    if(aIsLargest && ($scope.fc < $scope.fb && $scope.fc < $scope.fd)) {
      $scope.ax = $scope.bx; $scope.fa = $scope.fb;
      $scope.bx = $scope.cx; $scope.fb = $scope.fc;
      $scope.cx = $scope.dx; $scope.fc = $scope.fd;
    }

    $scope.currentMin = $scope.fm;
    $scope.currentMinX = $scope.fa < $scope.fb ? $scope.ax : $scope.fb < $scope.fc ? $scope.bx : $scope.cx;

    $scope.chart.dataProvider.push({
      "x": $scope.currentMinX,
      "y": $scope.currentMin
    });

    $scope.chart.guides[0].value = $scope.ax;
    $scope.chart.guides[1].value = $scope.bx;
    $scope.chart.guides[2].value = $scope.cx;

    $scope.chart.validateData();
    $scope.stepsTaken++; $scope.functionCalculated++;
    $scope.$emit('updatedEvent', null);
  };

  $scope.calculateBrackets();
}]);

module.controller('GoldController', ['$scope', 'ModelService', function($scope, model) {
  $scope.chart = AmCharts.makeChart("chartdiv",
    {
      "type": "xy",
      "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
      "startDuration": 1.5,
      "trendLines": [],
      "graphs": [
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "diamond",
          "id": "AmGraph-1",
          "lineAlpha": 0,
          "lineColor": "#b0de09",
          "valueField": "value",
          "xField": "x",
          "yField": "y"
        },
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "round",
          "id": "AmGraph-2",
          "lineAlpha": 0,
          "lineColor": "#fcd202",
          "valueField": "value2",
          "xField": "x2",
          "yField": "y2"
        }
      ],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 20
      },
      "guides": [
        {
          "label": "x0",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x1",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x2",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x3",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        }
      ],
      "valueAxes": [
        {
          "id": "ValueAxis-1",
          "axisAlpha": 0
        },
        {
          "id": "ValueAxis-2",
          "position": "bottom",
          "axisAlpha": 0
        }
      ],
      "allLabels": [],
      "balloon": {},
      "titles": [],
      "dataProvider": [{
        "x":0, "y":0
      }]
    }
  );

  $scope.ax = 1; $scope.bx = 500; $scope.cx = 0;
  $scope.fa = 0; $scope.fb = 0; $scope.fc = 0;

  $scope.stepsTaken = 0; $scope.functionCalculated = 0;

  $scope.GOLD = 1.618034; $scope.GLIMIT = 2; $scope.TINY = 1e-20;
  $scope.R = 0.61803399; $scope.C = 1-$scope.R;
  $scope.TOL = 0.01;

  $scope.modifiedResistor = model.getResistorsList()[1];

  $scope.calculateBrackets = function() {
    $scope.fa = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.ax);
    $scope.fb = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.bx);

    // swapping if needed
    if($scope.fb > $scope.fa) {
      $scope.fb = [$scope.fa, $scope.fa = $scope.fb][0];
      $scope.bx = [$scope.ax, $scope.ax = $scope.bx][0];
    }

    // first guess for c
    $scope.cx = $scope.bx + $scope.GOLD*($scope.bx - $scope.ax);
    $scope.fc = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.cx);

    console.log('before');
    console.log($scope.ax, $scope.bx, $scope.cx);
    console.log($scope.fa, $scope.fb, $scope.fc);
    while($scope.fb >= $scope.fc) {
      var u = $scope.cx + $scope.GOLD * ($scope.cx-$scope.bx);
      var fu = model.calculateTargetFunctionValue($scope.modifiedResistor, u);

      $scope.ax = $scope.bx; $scope.bx = $scope.cx; $scope.cx = u;
      $scope.fa = $scope.fb; $scope.fb = $scope.fc; $scope.fc = fu;
    }

    $scope.$emit('updatedEvent', null);
  };

  $scope.findMinimum = function() {
    $scope.x0 = $scope.ax;
    $scope.x3 = $scope.cx;

    if(Math.abs($scope.cx-$scope.bx) > Math.abs($scope.bx-$scope.ax)) {
      $scope.x1 = $scope.bx; $scope.x2 = $scope.bx+$scope.C*($scope.cx-$scope.bx);
    } else {
      $scope.x2 = $scope.bx; $scope.x1 = $scope.bx-$scope.C*($scope.bx-$scope.ax);
    }

    $scope.chart.guides[0].value = $scope.x0;
    $scope.chart.guides[1].value = $scope.x1;
    $scope.chart.guides[2].value = $scope.x2;
    $scope.chart.guides[3].value = $scope.x3;
    $scope.chart.validateData();

    $scope.functionCalculated = 2;
    /*while(Math.abs($scope.x3-$scope.x0) > $scope.TOL*(Math.abs($scope.x1) + Math.abs($scope.x2))) {

    }*/
  };

  $scope.findMinimumStep = function() {
    var f1 = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.x1);
    var f2 = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.x2);

    if(Math.abs($scope.x3-$scope.x0) > $scope.TOL*(Math.abs($scope.x1) + Math.abs($scope.x2))) {
      if(f2 < f1) {
        $scope.x0 = $scope.x1; $scope.x1 = $scope.x2; $scope.x2=$scope.R*$scope.x1+$scope.C*$scope.x3;
        f1 = f2;
        f2 = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.x2);
      } else {
        $scope.x3 = $scope.x2; $scope.x2 = $scope.x1; $scope.x1 = $scope.R*$scope.x2 + $scope.C*$scope.x0;
        f2 = f1;
        f1 = model.calculateTargetFunctionValue($scope.modifiedResistor, $scope.x1);
      }

      $scope.chart.guides[0].value = $scope.x0;
      $scope.chart.guides[1].value = $scope.x1;
      $scope.chart.guides[2].value = $scope.x2;
      $scope.chart.guides[3].value = $scope.x3;

      $scope.functionCalculated += 1;

      $scope.currentMin = f1 < f2 ? f1 : f2;
      $scope.currentMinX = f1 < f2 ? $scope.x1 : $scope.x2;

      $scope.chart.dataProvider.push({
        "x": $scope.currentMinX,
        "y": $scope.currentMin
      });
      $scope.chart.validateData();

      $scope.stepsTaken++;
    }

    $scope.$emit('updatedEvent', null);
  };

  $scope.calculateBrackets();
  console.log('after');
  console.log($scope.ax, $scope.bx, $scope.cx);
  console.log($scope.fa, $scope.fb, $scope.fc);
  $scope.findMinimum();
}]);

module.controller('GradientDescentController', ['$scope', 'ModelService', function($scope, model) {
  $scope.chart = AmCharts.makeChart("chartdiv-gdc",
    {
      "type": "xy",
      "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
      "startDuration": 1.5,
      "trendLines": [],
      "graphs": [
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "diamond",
          "id": "AmGraph-1",
          "lineAlpha": 0,
          "lineColor": "#b0de09",
          "valueField": "value",
          "xField": "x",
          "yField": "y"
        },
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "round",
          "id": "AmGraph-2",
          "lineAlpha": 0,
          "lineColor": "#fcd202",
          "valueField": "value2",
          "xField": "x2",
          "yField": "y2"
        }
      ],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 20
      },
      "guides": [
        {
          "label": "x0",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x1",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x2",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x3",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        }
      ],
      "valueAxes": [
        {
          "id": "ValueAxis-1",
          "axisAlpha": 0
        },
        {
          "id": "ValueAxis-2",
          "position": "bottom",
          "axisAlpha": 0
        }
      ],
      "allLabels": [],
      "balloon": {},
      "titles": [],
      "dataProvider": [{
        "x":0, "y":0
      }]
    }
  );

  $scope.ax = 30; $scope.bx = 7;
  $scope.fa = 0; $scope.fb = 0;
  $scope.step = 0.01;

  $scope.stepsTaken = 0; $scope.functionCalculated = 0;

  $scope.findMinimumStep = function() {
    $scope.ax = $scope.ax + $scope.step * model.getGradientVector()[0];
    $scope.bx = $scope.bx + $scope.step * model.getGradientVector()[3];

    $scope.fa = model.calculateTargetFunctionValue(model.getResistorsList()[1], $scope.ax);
    $scope.fb = model.calculateTargetFunctionValue(model.getResistorsList()[4], $scope.bx);
    $scope.$emit('updatedEvent', null);

    $scope.stepsTaken++;
    $scope.functionCalculated += 1;
    $scope.currentMin = $scope.fa;

    $scope.chart.dataProvider.push({
      "x": $scope.ax,
      "y": $scope.fa
    });
    $scope.chart.validateData();
  };
}]);

module.controller('NewtonMethodController', ['$scope', 'ModelService', function($scope, model) {
  $scope.chart = AmCharts.makeChart("chartdiv-gdc",
    {
      "type": "xy",
      "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
      "startDuration": 1.5,
      "trendLines": [],
      "graphs": [
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "diamond",
          "id": "AmGraph-1",
          "lineAlpha": 0,
          "lineColor": "#b0de09",
          "valueField": "value",
          "xField": "x",
          "yField": "y"
        },
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "round",
          "id": "AmGraph-2",
          "lineAlpha": 0,
          "lineColor": "#fcd202",
          "valueField": "value2",
          "xField": "x2",
          "yField": "y2"
        }
      ],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 20
      },
      "guides": [
        {
          "label": "x0",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x1",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x2",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x3",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        }
      ],
      "valueAxes": [
        {
          "id": "ValueAxis-1",
          "axisAlpha": 0
        },
        {
          "id": "ValueAxis-2",
          "position": "bottom",
          "axisAlpha": 0
        }
      ],
      "allLabels": [],
      "balloon": {},
      "titles": [],
      "dataProvider": [{
        "x":0, "y":0
      }]
    }
  );

  $scope.ax = model.getResistorsList()[1].value; $scope.bx = model.getResistorsList()[4].value;
  $scope.fa = 0; $scope.fb = 0;

  $scope.stepsTaken = 0; $scope.functionCalculated = 0;

  $scope.findMinimumStep = function() {
    var delta = numeric.solve(model.getGessianMatrix(), numeric.neg(model.getGradientVector()));
    console.log(delta);
    $scope.ax = $scope.ax + delta[0];
    $scope.bx = $scope.bx + delta[3];

    $scope.fa = model.calculateTargetFunctionValue(model.getResistorsList()[1], $scope.ax);
    $scope.fb = model.calculateTargetFunctionValue(model.getResistorsList()[4], $scope.bx);
    $scope.$emit('updatedEvent', null);

    $scope.stepsTaken++;
    $scope.functionCalculated += 1;
    $scope.currentMin = $scope.fa;

    $scope.chart.dataProvider.push({
      "x": $scope.ax,
      "y": $scope.fa
    });
    $scope.chart.validateData();
  };
}]);

module.controller('DavidonFletcherPowellController', ['$scope', 'ModelService', function($scope, model) {
  $scope.chart = AmCharts.makeChart("chartdiv-gdc",
    {
      "type": "xy",
      "pathToImages": "http://cdn.amcharts.com/lib/3/images/",
      "startDuration": 1.5,
      "trendLines": [],
      "graphs": [
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "diamond",
          "id": "AmGraph-1",
          "lineAlpha": 0,
          "lineColor": "#b0de09",
          "valueField": "value",
          "xField": "x",
          "yField": "y"
        },
        {
          "balloonText": "x:<b>[[x]]</b> y:<b>[[y]]</b><br>value:<b>[[value]]</b>",
          "bullet": "round",
          "id": "AmGraph-2",
          "lineAlpha": 0,
          "lineColor": "#fcd202",
          "valueField": "value2",
          "xField": "x2",
          "yField": "y2"
        }
      ],
      "chartScrollbar": {
        "autoGridCount": true,
        "graph": "g1",
        "scrollbarHeight": 20
      },
      "guides": [
        {
          "label": "x0",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x1",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x2",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        },
        {
          "label": "x3",
          "inside": true,
          "fillColor": new RGBColor("#FF0000"),
          "color": new RGBColor("#FF0000"),
          "value": 0,
          "lineThickness": 3,
          "valueAxis": "ValueAxis-2"
        }
      ],
      "valueAxes": [
        {
          "id": "ValueAxis-1",
          "axisAlpha": 0
        },
        {
          "id": "ValueAxis-2",
          "position": "bottom",
          "axisAlpha": 0
        }
      ],
      "allLabels": [],
      "balloon": {},
      "titles": [],
      "dataProvider": [{
        "x":0, "y":0
      }]
    }
  );

  $scope.ax = model.getResistorsList()[1].value; $scope.bx = model.getResistorsList()[4].value;
  $scope.a = [[1, 0],[0, 1]];
  $scope.t = 0.1;

  $scope.prevGrad = [];

  $scope.fa = 0; $scope.fb = 0;

  $scope.stepsTaken = 0; $scope.functionCalculated = 0;

  $scope.calculateFunctionValue = function(x, grad, t) {
    return x - t*grad;
  };

  $scope.findMinimum = function(x, grad) {
    console.log(x, grad);
    var min = 99999999; var minval = 0;
    var val = 0;
    while(val < 1) {
      var tgt = $scope.calculateFunctionValue(x, grad, val);
      if(tgt < min) {
        min = tgt;
        minval = val;
      }
      val += 0.01;
    }
    console.log(min);
    console.log(minval);
  };

  $scope.findMinimumStep = function() {
    if($scope.stepsTaken > 0) {
      var gk = numeric.sub(model.getGradientVector(), $scope.prevGrad);
      var xk = [$scope.ax - $scope.pa, $scope.bx - $scope.pb];

      var xkn = [[xk[0], xk[1]]];
      var gkn = [[gk[0], gk[1]]];
      var xkt = numeric.transpose(xkn);
      var gkt = numeric.transpose(gkn);

      $scope.findMinimum(xk[0], model.getGradientVector()[0]);

      /*var u = [[1, 2, 3]];
      var v = numeric.transpose([[4, 2, 0]]);
      console.log(numeric.dot(u, v));*/

      /*var xkn = [[-0.72, -0.6]];
      var xkt = numeric.transpose(xkn);
      var gkn = [[-3.48, -1.92]];
      var gkt = numeric.transpose(gkn);*/

      var ac1 = numeric.div(
        numeric.dot(xkt, xkn),
        numeric.dot(xkn, gkt)[0][0]
      );

      /*var ac2 = numeric.div(
        numeric.mul(numeric.mul(numeric.dot($scope.a, gk), gk), $scope.a),
        numeric.dot(numeric.mul(gk, $scope.a), gk)
      );*/

      var ac2 = numeric.div(
        numeric.mul(numeric.dot(numeric.dot($scope.a, gkt), gkn), $scope.a),
        numeric.dot(numeric.dot(gkn, $scope.a), gkt)[0][0]
      );

      //console.log(ac1);
      //console.log(ac2);
      $scope.ac = numeric.sub(ac1, ac2);
      //console.log($scope.ac);
      $scope.a = numeric.add($scope.a, $scope.ac);
    }

    $scope.prevGrad = model.getGradientVector();

    var d = numeric.dot(numeric.neg($scope.a), model.getGradientVector());

    $scope.pa = $scope.ax; $scope.pb = $scope.bx;
    $scope.ax = $scope.ax + $scope.t * d[0];
    $scope.bx = $scope.bx + $scope.t * d[1];

    $scope.fa = model.calculateTargetFunctionValue(model.getResistorsList()[1], $scope.ax);
    $scope.fb = model.calculateTargetFunctionValue(model.getResistorsList()[4], $scope.bx);
    $scope.$emit('updatedEvent', null);

    $scope.stepsTaken++;
    $scope.functionCalculated += 1;
    $scope.currentMin = $scope.fa;

    $scope.chart.dataProvider.push({
      "x": $scope.ax,
      "y": $scope.fa
    });
    $scope.chart.validateData();
  };
}]);

/*var r = ($scope.bx-$scope.ax)*($scope.fb-$scope.fc);
 var q = ($scope.bx-$scope.cx)*($scope.fb-$scope.fa);

 var max = Math.max(Math.abs(q-r), $scope.TINY);
 var sign = (q-r < 0) ? -1*max : max;
 var u = $scope.bx-(($scope.bx-$scope.cx)*q-($scope.bx-$scope.ax)*r)/(2*sign);
 var ulim = $scope.bx + $scope.GLIMIT*($scope.cx-$scope.bx);

 if(($scope.bx-u)*(u-$scope.cx) > 0) {
 var fu = model.calculateTargetFunctionValue($scope.modifiedResistor, u);
 if(fu < $scope.fc) {
 $scope.ax = $scope.bx; $scope.fa = $scope.fb;
 $scope.bx = u; $scope.fb = fu;
 return;
 }
 }*/