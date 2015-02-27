/**
 * Created by ibziy_000 on 25.02.15.
 */
module = angular.module('optimizationApp', []);

module.service('ModelService', function() {

  var CONST_E = 3;
  var NODE_COUNT = 3;

  var DESIRED_VOLTAGE_NUMBER = 2;
  var DESIRED_NODE_VOLTAGE = 15;

  var IMMUTABLE_RESISTORS = ["R1"];

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
    new Resistor("R5", 4, 1, 3)
  ];
  var coefficientMatrix = [];
  var gradientVector = [];
  var nodeVoltages = [];

  this.recalculate = function() {
    calculateNodeVoltages();
    calculateGradientVector();
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
  };

  $scope.updateModel();

  $scope.$on('updatedEvent', function(event, args) {
    $scope.updateModel();
  });
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
      "guides": [],
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

  $scope.ax = 1; $scope.bx = 100; $scope.cx = 0;
  $scope.fa = 0; $scope.fb = 0; $scope.fc = 0;

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

      $scope.currentMin = f1 < f2 ? f1 : f2;
      $scope.currentMinX = f1 < f2 ? $scope.x1 : $scope.x2;

      $scope.chart.dataProvider.push({
        "x": $scope.currentMinX,
        "y": $scope.currentMin
      });
      $scope.chart.validateData();
    }

    $scope.$emit('updatedEvent', null);
  }

  $scope.calculateBrackets();
  console.log('after');
  console.log($scope.ax, $scope.bx, $scope.cx);
  console.log($scope.fa, $scope.fb, $scope.fc);
  $scope.findMinimum();
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