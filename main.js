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
    new Resistor("R2", 4, 1, 3),
    new Resistor("R3", 7, 2, 3),
    new Resistor("R4", 9, 2, 0),
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

  Array.prototype.repeat = function(what, L){
    while(L) this[--L]= what;
    return this;
  };

  // Service initialization
  this.recalculate();
});

module.controller('MainController', ['$scope', 'ModelService', function($scope, model) {
  $scope.resistors = model.getResistorsList();
  $scope.nodeVoltages = model.getNodesList();
  $scope.gradientVector = model.getGradientVector();

  $scope.recalculateModel = function() {
    model.recalculate();
    $scope.nodeVoltages = model.getNodesList();
    $scope.gradientVector = model.getGradientVector();
  }
}]);
