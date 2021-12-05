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
		//Max Speed is less than pure 1 voltage power to be able to keep a constant velocity
		robotConfig["motors"][i]["MaxSpeed"] = (robotConfig["motors"][i]["maxrpm"] * robotConfig["motors"][i]["encoder"] / 60) * .85; 
		robotConfig["motors"][i]["Mode"] = "RUN_WITHOUT_ENCODER";
		robotConfig["motors"][i]["Power"] = 0;
		robotConfig["motors"][i]["TargetPosition"] = 0;
		robotConfig["motors"][i]["TargetPositionTolerance"] = 10;
		robotConfig["motors"][i]["Velocity"] = 0;
		robotConfig["motors"][i]["ZeroPowerBehavior"] = "BRAKE";
		robotConfig["motors"][i]["Enabled"] = true;
		robotConfig["motors"][i]["CurrentAlert"] = 5;
	}
	
	currMotorPowers = [0, 0, 0, 0, 0, 0, 0, 0];
}

var programStart = false;
var startTime = performance.now();
var telemetryData = "";

const noOp = function () {}

// set up user code API environment
let linearOpMode = {
    waitForStart: async function () {

        // bail early if the program has been aborted already
        if (programExecController.signal.aborted) {
            return Promise.reject(abortedErrorMsg);
        }

        return new Promise((resolve, reject) => {

            // handle for the interval, so we are able to cancel it
            let interval;

            // when signal arrives, cancel the interval and
            // reject the promise to stop the program
            const abortHandler = () => {
                clearInterval(interval);
                reject(abortedMsg);
                console.log("aborting");
            }
            programExecController.signal.addEventListener('abort', abortHandler);

            // start the interval
            // clean up the event listener when it is over
            interval = setInterval(
                    () => {
				if (programStart) {
					resolve();
					programExecController.signal.removeEventListener('abort', abortHandler);
				}
            }, 1);

        });
    },
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
    isStarted: () => programStart,
    isStopRequested: () => false,
    getRuntime: function() {return Math.floor((performance.now() - startTime) * .1) / 100;},
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
    setProperty: function(motorNums, property, values) {
        for (var i = 0; i < motorNums.length; i++) {
			//Don't want bad values!
			if (!values[i] && values[i] != 0)
				throw 'TypeError: Cannot read ' + property.toLowerCase() + ' property of undefined';
            //Translates Power to Velocity
            if (property == 'Power') {
                values[i] = Math.min(1, Math.max(values[i], -1));
				robotConfig["motors"][motorNums[i]]["Velocity"] = values[i] * robotConfig["motors"][motorNums[i]]["MaxSpeed"];
            }
			if (property == 'MaxSpeed')
				values[i] = Math.min((robotConfig["motors"][i]["maxrpm"] * robotConfig["motors"][i]["encoder"] / 60), Math.max(values[i], -(robotConfig["motors"][i]["maxrpm"] * robotConfig["motors"][i]["encoder"] / 60)));
            //Translates Velocity to Power
            if (property == 'Velocity') {
				robotConfig["motors"][motorNums[i]]["Power"] = Math.min(1, Math.max(values[i] / robotConfig["motors"][motorNums[i]]["MaxSpeed"], -1));
				var maxSpeed = (robotConfig["motors"][i]["maxrpm"] * robotConfig["motors"][i]["encoder"] / 60);
				robotConfig["motors"][motorNums[i]]["Velocity"] = Math.min(maxSpeed, Math.max(values[i], -maxSpeed));
            }
			else if (property == 'Mode' && values[i] == 'STOP_AND_RESET_ENCODER') {
				robotConfig["motors"][motorNums[i]]["Power"] = 0;
				robotConfig["motors"][motorNums[i]]["Velocity"] = 0;
				localStorage.setItem("motorResetEncoders", true); //Unfortunately Unity is setup to reset all encoders instead of seperately
			}
			else
                robotConfig["motors"][motorNums[i]][property] = values[i];
        }
        return;
    },
    getProperty: function(motorNum, property) {
        var returnVar;
        if (property == 'PowerFloat') {
            var motorPower = robotConfig["motors"][motorNum]["Power"];
            returnVar = (Math.round(motorPower) != motorPower);
        } else if (property == 'Velocity') {
            returnVar = robotConfig["motors"][motorNum]["CurrVelocity"]; //Later this will be a constantly updated value from Unity
        } else {
            returnVar = robotConfig["motors"][motorNum][property];
        }
        return returnVar;
    },
    isBusy: function(motorNum) {
        var motorPosition = robotConfig["motors"][motorNum]["CurrentPosition"];
        var motorTarget = robotConfig["motors"][motorNum]["TargetPosition"];
        var motorTolerance = robotConfig["motors"][motorNum]["TargetPositionTolerance"];
        return (Math.abs(motorPosition - motorTarget) > motorTolerance);
    },
	setVelocity_withAngleUnit: function(motorNum, angle, angleUnit) {
		if (angleUnit == "DEGREES")
			angle /= 360.0;
		else
			angle /= 2 * Math.PI;
		motor.setProperty([motorNum], "Velocity", [angle * robotConfig["motors"][motorNum]["encoder"]]);
	},
	getVelocity_withAngleUnit: function(motorNum, angleUnit) {
		angle = robotConfig["motors"][motorNum]["CurrVelocity"] / robotConfig["motors"][motorNum]["encoder"];
		if (angleUnit == "DEGREES")
			angle *= 360.0;
		else
			angle *= 2 * Math.PI;
		return angle;
	},
	getCurrent: function(motorNum, units) {
		//Stolen from bottom section
		var motorVelocity = robotConfig["motors"][motorNum]["Power"] * (robotConfig["motors"][motorNum]["maxrpm"] * robotConfig["motors"][motorNum]["encoder"] / 60);
		if (robotConfig["motors"][motorNum]["Mode"] == "RUN_USING_ENCODER" || robotConfig["motors"][motorNum]["Mode"] == "RUN_TO_POSITION")
			motorVelocity = robotConfig["motors"][motorNum]["Velocity"];
		if (motorNum == 1 || motorNum == 3)
			motorVelocity *= -1;
		if (robotConfig["motors"][motorNum]["Direction"] == "REVERSE")
			motorVelocity *= -1;
		if (motorVelocity == 0 || robotConfig["motors"][motorNum]["Enabled"] == false)
			return 0;
		else
			return (1 + Math.abs(robotConfig["motors"][motorNum]["CurrVelocity"] - motorVelocity) / (robotConfig["motors"][motorNum]["maxrpm"] * robotConfig["motors"][motorNum]["encoder"] / 60) * 1.5) * (units == "AMPS" ? 1 : 1000);
	},
	isOverCurrent: function(motorNum) {
		return (motor.getCurrent(motorNum, "AMPS") > robotConfig["motors"][motorNum]["CurrentAlert"]);
	},
    setPIDFCoefficients: noOp,
    getPIDFCoefficients: () => 0,
    setVelocityPIDFCoefficients: noOp,
    setPositionPIDFCoefficients: noOp,
}

let servo = {
    setProperty: function(servoNum, property, value) {
		if (property == "Power")
			value = Math.max(-1, Math.min(1, value));
		if (property == "Position")
			value = Math.max(0, Math.min(1, value));
		return robotConfig["servos"][servoNum][property] = value;
	},
    getProperty: function(servoNum, property) {
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

let navigation = {
	angleUnit_normalize: function (angle, unit) {
		var fullRot = 360.0;
		if (unit == "RADIANS")
			fullRot = Math.PI * 2;
		angle = (angle % fullRot + fullRot) % fullRot;
		if (angle >= fullRot / 2)
			angle -= fullRot;
		return angle;
	},
	angleUnit_convert: function (angle, fromUnit, toUnit) {
		angle = navigation.angleUnit_normalize(angle, fromUnit);
		if (fromUnit == toUnit)
			return angle;
		else if (toUnit == "DEGREES")
			return angle * 360 / (Math.PI * 2);
		else if (toUnit == "RADIANS")
			return angle * (Math.PI * 2) / 360;
	}
}

let acceleration = {
	create: function(units, x, y, z, time) {
		return {"DistanceUnit": units || "CM", "XAccel": x || 0, "YAccel": y || 0, "ZAccel": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toText: function(variable) {return JSON.stringify(variable);},
	toDistanceUnit: function(variable, newUnit) {
		let newVar = JSON.parse(JSON.stringify(variable));
		if (variable["DistanceUnit"] == newUnit)
			return newVar;
		var conversion = 1;
		//Conversion to CM
		switch (variable["DistanceUnit"]) {
			case "INCH": conversion *= 2.54; break;
			case "METER": conversion *= 100; break;
			case "MM": conversion *= .1; break;
			case "g": conversion *= 981; break;
		}
		//Conversion to new Unit
		switch (newUnit) {
			case "INCH": conversion /= 2.54; break;
			case "METER": conversion /= 100; break;
			case "MM": conversion /= .1; break;
			case "g": conversion /= 981; break;
		}
		newVar.DistanceUnit = newUnit;
		newVar.XAccel *= conversion;
		newVar.YAccel *= conversion;
		newVar.ZAccel *= conversion;
		return newVar;
	}
}

let angularVelocity = {
	create: function(units, x, y, z, time) {
		return {"AngleUnit": units || "DEGREES", "XRotationRate": x || 0, "YRotationRate": y || 0, "ZRotationRate": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	getRotationRate: function(variable, axis) {return variable[axis + "RotationRate"]; },
	toAngleUnit: function(variable, newUnit) {
		var conversion = 1;
		if (variable["AngleUnit"] == newUnit)
			return variable;
		else if (newUnit == "DEGREES")
			conversion = 360 / (Math.PI * 2);
		else if (newUnit == "RADIANS")
			conversion = (Math.PI * 2) / 360;
		let newVar = JSON.parse(JSON.stringify(variable));
		newVar.AngleUnit = newUnit;
		newVar.XRotationRate *= conversion;
		newVar.YRotationRate *= conversion;
		newVar.ZRotationRate *= conversion;
		return newVar;
	},
}

let color = {
	rgbToColor: function(r, g, b, a) {
		return {"Red": r, "Green": g, "Blue": b, "Alpha": (a || 255)};
	},
	hsvToColor: function(h, s, v, a) {
		var c = v * s;
		var x = c * (1 - Math.abs((h / 60.0) % 2 - 1));
		var m = v - c;
		var r = g = b = 0;
		if (h < 60) {
			r = c;
			g = x;
		}
		else if (h < 120) {
			r = x;
			g = c;
		}
		else if (h < 180) {
			g = c;
			b = x;
		}
		else if (h < 240) {
			g = x;
			b = c;
		}
		else if (h < 300) {
			r = x;
			b = c;
		}
		else if (h < 360) {
			r = c;
			b = x;
		}
		return {"Red": r, "Green": g, "Blue": b, "Alpha": (a || 255)};
	},
	textToColor: function(text) {
		var r = g = b = 0;
		var a = 255;
		switch (text.toLowerCase()) {
			case "red":		r = 255; break;
			case "green":	g = 255; break;
			case "blue":	b = 255; break;
			case "yellow":	r = 255; g = 255; break;
			case "purple":	r = 128; b = 128; break;
			case "cyan":	g = 255; b = 255; break;
			default:
				if (!text.startsWith('#') || text.length > 9)
					break;
				try {
					r = parseInt(text.substring(1, 3), 16);
					g = parseInt(text.substring(3, 5), 16);
					b = parseInt(text.substring(5, 7), 16);
					if (text.length > 7)
						a = parseInt(text.substring(7, 9), 16);
				} catch (e) {}
				break;
		}
		console.log({"Red": r, "Green": g, "Blue": b, "Alpha": a});
		return {"Red": r, "Green": g, "Blue": b, "Alpha": a};
	},
	get: function (property, variable) {
		if (property == "Hue" || property == "Saturation" || property == "Value")
			return color.rgbTo(property, variable.Red, variable.Green, variable.Blue);
		else
			return variable[property];
	},
	toText: function (variable) {
		var r = variable.Red;
		var g = variable.Green;
		var b = variable.Blue;
		var a = variable.Alpha;
		var hex = "#" + r.toString(16) + (r.toString(16).length == 1 ? "0" : "") + g.toString(16) + (g.toString(16).length == 1 ? "0" : "") +
			b.toString(16) + (b.toString(16).length == 1 ? "0" : "") + a.toString(16) + (a.toString(16).length == 1 ? "0" : "");
		return hex;
	},
	rgbTo: function(type, r, g, b) {
		r /= 255.0;
		g /= 255.0;
		b /= 255.0;
		maxColor = Math.max(r,g,b);
		minColor = Math.min(r,g,b);
		diff = maxColor - minColor;
		if (type == "Hue") {
			if (diff == 0)
				return 0;
			else if (maxColor == r)
				return 60 * (((g - b) / diff) % 6);
			else if(maxColor == g)
				return 60 * (((b - r) / diff) + 2);
			else
				return 60 * (((r - g) / diff) + 4);
		}
		else if (type == "Saturation") {
			if(maxColor == 0)
				return 0;
			else
				return diff / maxColor;
		}
		else if (type == "Value")
			return maxColor;
	},
	showColor: noOp,
}

let dbgLog = {
	msg: function(text) {alert("MESSAGE:\n" + text); },
	error: function(text) {alert("ERROR:\n" + text); },
}

let magneticFlux = {
	create: function(x, y, z, time) {
		return {"X": x || 0, "Y": y || 0, "Z": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toText: function(variable) {return JSON.stringify(variable); }
}

let orientation = {
	create: function(refrence, order, units, x, y, z, time) {
		return {"AxesReference": refrence || "EXTRINSIC", "AxesOrder": order || "XYX", "AngleUnit": units || "DEGREES", "FirstAngle": x || 0, "SecondAngle": y || 0, "ThirdAngle": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toText: function(variable) {return JSON.stringify(variable); },
	toAngleUnit: function (variable, newUnit) {
		var conversion = 1;
		if (variable["AngleUnit"] == newUnit)
			return variable;
		else if (newUnit == "DEGREES")
			conversion = 360 / (Math.PI * 2);
		else if (newUnit == "RADIANS")
			conversion = (Math.PI * 2) / 360;
		let newVar = JSON.parse(JSON.stringify(variable));
		newVar.AngleUnit = newUnit;
		newVar.FirstAngle *= conversion;
		newVar.SecondAngle *= conversion;
		newVar.ThirdAngle *= conversion;
		return newVar;
	}
}

let pidf = {
	create: function(p, i, d, f, algorithm) {
		return {"P": p || 0, "I": i || 0, "D": d || 0, "F": f || 0, "Algorithm": algorithm || "PIDF"};
	},
	create_withPIDFCoefficients: function(variable) {
		return JSON.parse(JSON.stringify(variable));
	},
	get: function(property, variable) {return variable[property]; },
	set: function(property, variable, value) {variable[property] = value; },
	toText: function(variable) {return JSON.stringify(variable); }
}

let position = {
	create: function(units, x, y, z, time) {
		return {"DistanceUnit": units || "CM", "X": x || 0, "Y": y || 0, "Z": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toText: function(variable) {return JSON.stringify(variable); },
	toDistanceUnit: function(variable, newUnit) {
		let newVar = JSON.parse(JSON.stringify(variable));
		if (variable["DistanceUnit"] == newUnit)
			return newVar;
		var conversion = 1;
		//Conversion to CM
		switch (variable["DistanceUnit"]) {
			case "INCH": conversion *= 2.54; break;
			case "METER": conversion *= 100; break;
			case "MM": conversion *= .1; break;
		}
		//Conversion to new Unit
		switch (newUnit) {
			case "INCH": conversion /= 2.54; break;
			case "METER": conversion /= 100; break;
			case "MM": conversion /= .1; break;
		}
		newVar.DistanceUnit = newUnit;
		newVar.X *= conversion;
		newVar.Y *= conversion;
		newVar.Z *= conversion;
		return newVar;
	}
}

let quaternion = {
	create: function(w, x, y, z, time) {
		return {"W": w || 0, "X": x || 0, "Y": y || 0, "Z": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {
		if (property == "Magnitude")
			return (variable.W ** 2 + variable.X ** 2 + variable.Y ** 2 + variable.Z ** 2) ** .5;
		return variable[property];
	},
	normalized: function(variable) {
		var magn = quaternion.get("Magnitude", variable);
		let newVar = JSON.parse(JSON.stringify(variable));
		newVar.W /= magn;
		newVar.X /= magn;
		newVar.Y /= magn;
		newVar.Z /= magn;
		return newVar;
	},
	congugate: function(variable) {
		let newVar = JSON.parse(JSON.stringify(variable));
		newVar.X *= -1;
		newVar.Y *= -1;
		newVar.Z *= -1;
		return newVar;
	}
}

let range = {
	scale: function(number, prevMin, prevMax, newMin, newMax) {
		number -= prevMin;
		number /= (prevMax - prevMin);
		number *= (newMax - newMin);
		return number + newMin;
	},
	clip: function(number, min, max) {
		return Math.min(Math.max(number, min), max);
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

let temperature = {
	create: function(unit, temp, time) {
		return {"TempUnit": unit || "CELSIUS", "Temperature": temp || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toTempUnit: function(variable, newUnit) {
		let newVar = JSON.parse(JSON.stringify(variable));
		if (variable["TempUnit"] == newUnit)
			return newVar;
		newVar.TempUnit = newUnit;
		//Convert to Celcius
		switch (variable["TempUnit"]) {
			case "FARENHEIT": newVar.Temperature = (newVar.Temperature - 32) * (5 / 9.0); break;
			case "KELVIN": newVar.Temperature -= 273.15; break;
		}
		//Convert to NewUnit
		switch (newUnit) {
			case "FARENHEIT": newVar.Temperature = (newVar.Temperature * (9.0 / 5)) + 32; break;
			case "KELVIN": newVar.Temperature += 273.15; break;
		}
		return newVar;
	}
}

let elapsedTime = {
	create: function(time, resolution) {
		return {"StartTime": time || system.nanoTime(), "Resolution": resolution || "SECONDS"};
	},
	get: function(property, variable) {
		if (property == "StartTime")
			return Math.floor(variable.StartTime / ((variable.Resolution == "SECONDS") ? 10000000 : 10000)) / 100;
		else if ((property == "Time" && variable.Resolution == "SECONDS") || property == "Seconds")
			return Math.floor((system.nanoTime() - variable.StartTime) / 10000000) / 100;
		else if ((property == "Time" && variable.Resolution == "MILLISECONDS") || property == "Milliseconds")
			return Math.floor((system.nanoTime() - variable.StartTime) / 10000) / 100;
		return variable[property];
	},
	toText: function(variable) {return JSON.stringify(variable); },
	reset: function(variable) {variable.StartTime = system.nanoTime(); }
}

let vectorF = {
	create: function(length) {return Array(length).fill(0); },
	get: function(property, variable) {
		if (property == "Length")
			return variable.length;
		if (property == "Magnitude") {
			var magnitude = 0;
			variable.forEach(function(item){magnitude += item ** 2; })
			return magnitude ** .5;
		}	
	},
	getIndex: function(variable, index) {return variable[index]; },
	put: function(variable, index, value) {variable[index] = value; },
	toText: function(variable) {return JSON.stringify(variable); },
	normalized3D: function(variable) {
		var newVar = [];
		for (var i = 0; i < 3; i++)
			newVar[i] = variable[i] || 0;
		var magnitude = vectorF.get("Magnitude", newVar);
		for (var i = 0; i < 3; i++)
			newVar[i] /= magnitude;
		return newVar;
	},
	dotProduct: function(var1, var2) {
		var product = 0;
		var minLength = Math.min(var1.length, var2.length);
		for (var i = 0; i < minLength; i++)
			product += var1[i] * var2[i];
		return product;
	},
	add_withVector: function(returnVar, var1, var2) {
		var maxLength = Math.max(var1.length, var2.length);
		var newVar = [];
		for (var i = 0; i < maxLength; i++)
			newVar[i] = (var1[i] || 0) + (var2[i] || 0);
		if (returnVar)
			return newVar;
		for (var i = 0; i < maxLength; i++)
			var1[i] = newVar[i];
	},
	subtract_withVector: function(returnVar, var1, var2) {
		var maxLength = Math.max(var1.length, var2.length);
		var newVar = [];
		for (var i = 0; i < maxLength; i++)
			newVar[i] = (var1[i] || 0) - (var2[i] || 0);
		if (returnVar)
			return newVar;
		for (var i = 0; i < maxLength; i++)
			var1[i] = newVar[i];
	},
	multiply_withScale: function(returnVar, var1, scale) {
		var newVar = [];
		for (var i = 0; i < var1.length; i++)
			newVar[i] = var1[i] * scale;
		if (returnVar)
			return newVar;
		for (var i = 0; i < var1.length; i++)
			var1[i] = newVar[i];
	}
}

let velocity = {
	create: function(units, x, y, z, time) {
		return {"DistanceUnit": units || "CM", "XVeloc": x || 0, "YVeloc": y || 0, "ZVeloc": z || 0, "AcquisitionTime": time || 0};
	},
	get: function(property, variable) {return variable[property]; },
	toText: function(variable) {return JSON.stringify(variable); },
	toDistanceUnit: function(variable, newUnit) {
		let newVar = JSON.parse(JSON.stringify(variable));
		if (variable["DistanceUnit"] == newUnit)
			return newVar;
		var conversion = 1;
		//Conversion to CM
		switch (variable["DistanceUnit"]) {
			case "INCH": conversion *= 2.54; break;
			case "METER": conversion *= 100; break;
			case "MM": conversion *= .1; break;
		}
		//Conversion to new Unit
		switch (newUnit) {
			case "INCH": conversion /= 2.54; break;
			case "METER": conversion /= 100; break;
			case "MM": conversion /= .1; break;
		}
		newVar.DistanceUnit = newUnit;
		newVar.XVeloc *= conversion;
		newVar.YVeloc *= conversion;
		newVar.Zveloc *= conversion;
		return newVar;
	}
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

let system = {
	nanoTime: function() {return Math.floor((performance.now() - startTime) * 1000000)}
}

setTimeout(variableUpdate, 1);

var lastTime = 0;
var currMotorPowers = [0, 0, 0, 0, 0, 0, 0, 0];

function variableUpdate() {
	//Sends Motor Powers
	try {
		var motorPowers = "[";
		for (i = 0; i < robotConfig["motors"].length; i++) {
			
			//Converts Raw Motor Power Inputs for Wheels to correct power according to Mode & other settings
			
			//Sets Power/Velocity to Variable
			var motorPower = robotConfig["motors"][i]["Power"];
			if (robotConfig["motors"][i]["Mode"] == "RUN_USING_ENCODER" || robotConfig["motors"][i]["Mode"] == "RUN_TO_POSITION")
				motorPower = robotConfig["motors"][i]["Velocity"] / (robotConfig["motors"][i]["maxrpm"] * robotConfig["motors"][i]["encoder"] / 60);
			if (isNaN(motorPower) && document.getElementById('programInit').style.display == "none") {
				throw "TypeError: Cannot read a motor property of improper type";
			}
			
			//Implements Realistic Reversed Motors on Right Side
			if (i == 1 || i == 3)
				motorPower *= -1;
			//Implements REVERSE feature
			if (robotConfig["motors"][i]["Direction"] == "REVERSE")
				motorPower *= -1;
			//If Disabled, no power
			if (robotConfig["motors"][i]["Enabled"] == false)
				currMotorPowers[i] = currMotorPowers[i] * .5;
			//ZeroPowerBehavior things
			else if (robotConfig["motors"][i]["ZeroPowerBehavior"] == "FLOAT" && motorPower < .1)
				currMotorPowers[i] = currMotorPowers[i] * .975 + motorPower * .025;
			//Different Mode Functionality
			else if (robotConfig["motors"][i]["Mode"] == "RUN_WITHOUT_ENCODER")
				currMotorPowers[i] = currMotorPowers[i] * .95 + motorPower * .05;
			else if (robotConfig["motors"][i]["Mode"] == "RUN_USING_ENCODER")
				currMotorPowers[i] = currMotorPowers[i] * .5 + motorPower * .5;
			else if (robotConfig["motors"][i]["Mode"] == "RUN_TO_POSITION") {
				if (motor.isBusy(i))
					currMotorPowers[i] = (currMotorPowers[i] * .25 + motorPower * .75) * Math.min(Math.max(robotConfig["motors"][i]["TargetPosition"] - robotConfig["motors"][i]["CurrentPosition"], -1), 1);
				else
					currMotorPowers[i] = 0;
			}
	
			//Wobble Goal motor can't interpolate
			if (i == 7)
				currMotorPowers[i] = motorPower;
	
			
			//Sets up Powers to JSON to send to Unity
			if (i == 6)
				motorPowers += currMotorPowers[i] * 1.015; //I could not program the robot to shoot in the top goal :(
			else
				motorPowers += currMotorPowers[i];
			if (i + 1 < robotConfig["motors"].length)
				motorPowers += ", ";
		}
		motorPowers += "]";
		localStorage.setItem("motorPowers", motorPowers);
	} catch (err) {
		document.getElementById("telemetryText").innerText = "<Program has stopped!>\n" + err;
		resetProgramExecution();
	}
	
	//Receives Motor Positions
	var motorPositions = JSON.parse(localStorage.getItem("motorCurrentPositions"));
	for (i = 0; i < robotConfig["motors"].length; i++) {
		//Converts change in position to returned velocity
		if (motorPositions[i] - robotConfig["motors"][i]["CurrentPosition"] != 0)
			robotConfig["motors"][i]["CurrVelocity"] = Math.round((motorPositions[i] - robotConfig["motors"][i]["CurrentPosition"]) / .0002) / 100;
		else if (currMotorPowers[i] == 0)
			robotConfig["motors"][i]["CurrVelocity"] = 0;
		//Saves Current Position
		robotConfig["motors"][i]["CurrentPosition"] = motorPositions[i];
	}
	
	//Do it again
	setTimeout(variableUpdate, 1);
}