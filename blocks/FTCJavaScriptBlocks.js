//Resets Actuator/Sensor Data
function resetProperties() {
	for (i = 0; i < robotConfig["servos"].length; i++) {
		robotConfig["servos"][i]["Direction"] = "FORWARD";
		robotConfig["servos"][i]["Power"] = 0;
		robotConfig["servos"][i]["Position"] = 0;
		robotConfig["servos"][i]["LimitLower"] = 0;
		robotConfig["servos"][i]["LimitUpper"] = 1;
	}
	
	for (i = 0; i < robotConfig["motors"].length; i++) {
		robotConfig["motors"][i]["Direction"] = "FORWARD";
		robotConfig["motors"][i]["MaxSpeed"] = 4320; //Temp Value
		robotConfig["motors"][i]["Mode"] = "RUN_WITHOUT_ENCODER";
		robotConfig["motors"][i]["Power"] = 0;
		robotConfig["motors"][i]["TargetPosition"] = 0;
		robotConfig["motors"][i]["TargetPositionTolerance"] = 10;
		robotConfig["motors"][i]["Velocity"] = 0;
		robotConfig["motors"][i]["ZeroPowerBehavior"] = "BRAKE";
	}
}

const noOp = function () {}

// set up user code API environment
let linearOpMode = {
    waitForStart: noOp,
    idle: noOp,
    sleep: async function (milliseconds) {

        // bail early if the program has been aborted already
        if (programExecController.signal.aborted) {
            return Promise.reject(abortedErrorMsg);
        }

        return new Promise((resolve, reject) => {

            // handle for the timeout, so we are able to cancel it
            let timeout;

            // when signal arrives, cancel the timeout and
            // reject the promise to stop the program
            const abortHandler = () => {
                clearTimeout(timeout);
                reject(abortedMsg);
                console.log("aborting");
            }
            programExecController.signal.addEventListener('abort', abortHandler);

            // start the timeout
            // clean up the event listener when it is over
            timeout = setTimeout(
                    () => {
                resolve();
                programExecController.signal.removeEventListener('abort', abortHandler);
            },
                    milliseconds);

        });
    },
    opModeIsActive: () => true,
    isStarted: () => true,
    isStopRequested: () => false,
    getRuntime: () => 0,
}

let gamepad = {
    boolValue: function (gamepadNum, buttonId, controllerType) {
        if (navigator.getGamepads()[gamepadNum] != null && (controllerType == "Both" || navigator.getGamepads()[gamepadNum].id.startsWith(controllerType))) {
            if (buttonId == -1) {
                var atRest = true;
                for (var i = 0; i < navigator.getGamepads()[gamepadNum].buttons.length; i++)
                    if (navigator.getGamepads()[gamepadNum].buttons[i].pressed)
                        atRest = false;
                for (var i = 0; i < navigator.getGamepads()[gamepadNum].axes.length; i++)
                    if (Math.abs(navigator.getGamepads()[gamepadNum].axes[i]) > .2)
                        atRest = false;
                return atRest;
            }
            return navigator.getGamepads()[gamepadNum].buttons[buttonId].pressed;
        }
        return false;
    },
    numberValue: function (gamepadNum, buttonAxis) {
        if (navigator.getGamepads()[gamepadNum] != null) {
            if (buttonAxis < 4)
                return navigator.getGamepads()[gamepadNum].axes[buttonAxis];
            else
                return navigator.getGamepads()[gamepadNum].buttons[buttonAxis].value;
        }
        return 0;
    }
}

let motor = {
    setProperty: function (motorNums, property, values) {
        for (var i = 0; i < motorNums.length; i++) {
            //Translates Power to Velocity
            if (property == 'Power') {
                values[motorNums[i]] = Math.min(1, Math.max(values[i], -1));
				robotConfig["motors"][motorNums[i]]["Velocity"] = values[i] * robotConfig["motors"][motorNums[i]]["MaxSpeed"];
            }
            //Translates Velocity to Power
            if (property == 'Velocity') {
				robotConfig["motors"][motorNums[i]]["Power"] = Math.min(1, Math.max(values[i] / robotConfig["motors"][motorNums[i]]["MaxSpeed"], -1));
				robotConfig["motors"][motorNums[i]]["Velocity"] = Math.min(5760, Math.max(values[i], -5760)); //This value may change (1440 * 4)
            } else
                robotConfig["motors"][motorNums[i]][property] = values[i];
        }
        return;
    },

    getProperty: function (motorNum, property) {
        var returnVar;
        if (property == 'PowerFloat') {
            var motorPower = robotConfig["motors"][motorNum]["Power"];
            returnVar = (Math.round(motorPower) != motorPower);
        } else if (property == 'Velocity') {
            returnVar = robotConfig["motors"][motorNum]["Velocity"]; //Later this will be a constantly updated value from Unity
        } else {
            returnVar = robotConfig["motors"][motorNum][property];
        }
        return returnVar;
    },

    isBusy: function (motorNum) {
        var motorPosition = robotConfig["motors"][motorNum]["CurrentPosition"];
        var motorTarget = robotConfig["motors"][motorNum]["TargetPosition"];
        var motorTolerance = robotConfig["motors"][motorNum]["TargetPositionTolerance"];
        return (Math.abs(motorPosition - motorTarget) > motorTolerance);
    },
    setMotorEnable: noOp,
    setMotorDisable: noOp,
    isMotorEnabled: () => true,
    setVelocity_withAngleUnit: noOp,
    getVelocity_withAngleUnit: () => 0,
    setPIDFCoefficients: noOp,
    getPIDFCoefficients: () => 0,
    setVelocityPIDFCoefficients: noOp,
    setPositionPIDFCoefficients: noOp,
    getCurrent: () => 0,
    getCurrentAlert: () => 0,
    setCurrentAlert: noOp,
    isOverCurrent: () => false,
}

let servo = {
    setProperty: function (servoNum, property, value) {
		if (property == "Power")
			value = Math.max(-1, Math.min(1, value));
		if (property == "Position")
			value = Math.max(0, Math.min(1, value));
		return robotConfig["servos"][servoNum][property] = value;
	},
	
    getProperty: function (servoNum, property) {
		var returnValue;
		if (property == "Position")
			returnValue = (robotConfig["servos"][servoNum]["Position"] - robotConfig["servos"][servoNum]["LimitLower"]) / (robotConfig["servos"][servoNum]["LimitUpper"] - robotConfig["servos"][servoNum]["LimitLower"]);
		else
			returnValue = robotConfig["servos"][servoNum][property];
		return returnValue;
	},
	
	//This may change
	scaleRange: function (servoNum, lowerLimit, upperLimit) {
		//Convert Position to between 0-1
		var servoPos = robotConfig["servos"][servoNum]["Position"];
		var currentRatio = (servoPos - robotConfig["servos"][servoNum]["LimitLower"]) / (robotConfig["servos"][servoNum]["LimitUpper"] - robotConfig["servos"][servoNum]["LimitLower"]);
		//Apply New Limits
		robotConfig["servos"][servoNum]["LimitLower"] = Math.max(0, Math.min(.9, lowerLimit));
		robotConfig["servos"][servoNum]["LimitUpper"] = Math.max(robotConfig["servos"][servoNum]["LimitLower"] + .05, Math.min(1, upperLimit));
		//Convert Position to between lower&upper limits
		robotConfig["servos"][servoNum]["Position"] = currentRatio * (robotConfig["servos"][servoNum]["LimitUpper"] - robotConfig["servos"][servoNum]["LimitLower"]) + robotConfig["servos"][servoNum]["LimitLower"];
		return;
	}
}

let telemetry = {
    addData: function (key, data) {
        return (telemetryData += key + ": " + data + "\n");
    },
    update: function () {
        document.getElementById("telemetryText").innerText = telemetryData;
        telemetryData = "";
        return;
    },
    speak: noOp,
    setDisplayFormat: noOp,
}

let misc = {
    getNull: () => null,
    isNull: (value) => null == value,
    isNotNull: (value) => null !== value,
    formatNumber: function (number, precision) {
        var string = "" + Math.round((number + Number.EPSILON) * (10 ** precision)) / (10 ** precision);
        if (precision > 0) {
            if (!string.includes('.'))
                string += '.';
            string += (10 ** (precision - string.split('.')[1].length)).toString().substring(1);
        }
        return string;
    },
    roundDecimal: function (number, precision) {
        return Math.round((number + Number.EPSILON) * (10 ** precision)) / (10 ** precision);
    }
}

var telemetryData = "";

setTimeout(variableUpdate, 1);

function variableUpdate() {
	//Sends Motor Powers
	var motorPowers = "[";
	for (i = 0; i < robotConfig["motors"].length; i++) {
		motorPowers += robotConfig["motors"][i]["Power"];
		if (i + 1 < robotConfig["motors"].length)
			motorPowers += ", ";
	}
	motorPowers += "]";
	localStorage.setItem("motorPowers", motorPowers);
	
	//Receives Motor Positions
	var motorPositions = JSON.parse(localStorage.getItem("motorCurrentPositions"));
	for (i = 0; i < robotConfig["motors"].length; i++) {
		robotConfig["motors"][i]["CurrentPosition"] = motorPositions[i];
	}
	
	setTimeout(variableUpdate, 1);
}