var app = angular.module("stock.app", ['ngRoute', 'ui.bootstrap']);

function AppCtrl($scope, $timeout, Services) {
	$scope.symbols_401k = config.symbols_401k;
	$scope.symbols_stocks = config.symbols_stocks;

	$scope.dateOptions = {
	    'year-format': "'yy'",
	    'starting-day': 1
	};

	$scope.openFrom = function() {
	    $timeout(function() {
	     	$scope.openedFrom = true;
	    });
	};

    $scope.openTo = function() {
	    $timeout(function() {
	     	$scope.openedTo = true;
	    });
	};

	$scope.initDates = function() {
		$scope.minDate = null;
	    $scope.maxDate = new Date();

	    $scope.dtFrom = new Date(2011, 0, 1);
	    $scope.dtTo = new Date();
	};
	$scope.initDates();

	$scope.refresh = function(){
		$scope.progress = 0;
		$scope.counter = 0;
		$scope.showProgreeBar = true;

		var symbols = $scope.symbols_401k.concat($scope.symbols_stocks);

		angular.forEach(symbols, function(symbol){
			Services.getData(symbol.symbol, $scope.dtFrom, $scope.dtTo).then(function(data){
				symbol.data = data;
				$scope.counter += 1;
				$scope.progress += 100 / symbols.length;

				if($scope.counter == symbols.length){
					$scope.showProgreeBar = false;
					$scope.progress = 0;
					$scope.counter = 0;
				}
			});
		});
	}
	$scope.refresh();
}


app.factory("Services", function($http){
	var service = {
		getData: function(symbol, startDt, endDt){
			var api = "http://query.yahooapis.com/v1/public/yql?q=";

            var params = {}
            params['a'] = startDt.getMonth();
			params['b'] = startDt.getDate();
			params['c'] = startDt.getFullYear();
            params['d'] = endDt.getMonth();
			params['e'] = endDt.getDate();
			params['f'] = endDt.getFullYear();

			var part = "";
			for(var key in params){
				part += "&" + key + "=" + params[key];
			}

            var query = "select * from csv where url='http://ichart.finance.yahoo.com/table.csv?s=" 
            	+ symbol
            	+ part
            	+ "&g=d&ignore=.csv' and columns='dt,Open,High,Low,Close,Volume,Adj Close'";

            var encodedQuery = api + encodeURIComponent(query) + '&format=json';

			var promise = $http({
                method: 'GET',
                url: encodedQuery
            }).error(function (response, status, headers, config) {
                return response;
            }).then(function (response, status, headers, config) {
                return response.data;
            });

            return promise;
		}
	}
	return service;
});

app.directive('stockChart', function () {
    return {
        restrict: 'E',
        scope:{
        	title: "=",
        	symbol: "=",
        	renderId: "=",
        	ngModel: '='
        },
        link: function (scope, elem, attrs) {

            scope.$watch("ngModel", function(newValue, oldValue){
            	if(newValue === undefined) return;
                var mydata = new Array();
                var j = 0;

                var rows = scope.ngModel.query.results.row;
                for (var i = rows.length - 1; i > 0; i--) {
                    mydata[j++] = [
                    parseDate(rows[i].dt).getTime(),
                    parseFloat(rows[i].Open),
                    parseFloat(rows[i].High),
                    parseFloat(rows[i].Low),
                    parseFloat(rows[i].Close)]
                }

                var myChart = new Highcharts.StockChart({
                    chart: {
                        renderTo: scope.renderId,
                        zoomType: 'x'
                    },

                    title: {
                        text: scope.symbol + ' - ' + scope.title
                    },

                    xAxis: {
                        gapGridLineWidth: 0
                    },

                    rangeSelector: {
                        buttons: [{
							type: 'month',
							count: 1,
							text: '1m'
						}, {
							type: 'month',
							count: 3,
							text: '3m'
						}, {
							type: 'month',
							count: 6,
							text: '6m'
						}, {
							type: 'ytd',
							text: 'YTD'
						}, {
							type: 'year',
							count: 1,
							text: '1y'
						}, {
							type: 'all',
							text: 'All'
						}],                        
						selected: 1,
                        inputEnabled: false
                    },

                    series: [{
                        name: scope.symbol,
                        type: 'area',
                        data: mydata,
                        tooltip: {
                            valueDecimals: 2
                        },
                        threshold: null
                    }]
                }); //chart

            }); //json

            function parseDate(input) {
                var parts = input.match(/(\d+)/g);
                return new Date(parts[0], parts[1] - 1, parts[2]); // months are 0-based
            }
        }
    }
});