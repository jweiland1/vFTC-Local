//Load Config File
var robotConfig = null;

var client = new XMLHttpRequest();
client.open('GET', './robotConfigs/defaultRobot.json');
client.onload = function () {
    var robotConfigTxt = client.responseText;
    if (robotConfigTxt !== '' && robotConfig == null) {
		robotConfig = JSON.parse(robotConfigTxt);
		setTimeout(variableUpdate, 1);
		setTimeout(setupCategories, 250);
    }
}
client.send();

//Dropdowns for Blocks Programs
function createDcMotorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["motors"].length; i++)
		CHOICES[i] = [robotConfig["motors"][i]["name"], "dcMotor" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "dcMotor0"];
    return new Blockly.FieldDropdown(CHOICES);
}

function createDcMotorExDropdown() {
	var CHOICES = [];
	for (i = 0; i < robotConfig["motors"].length; i++)
		if (robotConfig["motors"][i]["type"] == "extended")
			CHOICES[i] = [robotConfig["motors"][i]["name"], "dcMotor" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "dcMotor0"];
    return new Blockly.FieldDropdown(CHOICES);
}

function createCRServoDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["servos"].length; i++)
		if (robotConfig["servos"][i]["type"] == "continous")
			CHOICES[CHOICES.length] = [robotConfig["servos"][i]["name"], "servo" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "servo" + robotConfig["servos"].length];
    return new Blockly.FieldDropdown(CHOICES);
}

function createServoDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["servos"].length; i++)
		if (robotConfig["servos"][i]["type"] == "180degrees")
			CHOICES[CHOICES.length] = [robotConfig["servos"][i]["name"], "servo" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "servo" + robotConfig["servos"].length];
    return new Blockly.FieldDropdown(CHOICES);
}

function createDistanceSensorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["distSensor"].length; i++)
		CHOICES[i] = [robotConfig["distSensor"][i]["name"], "distanceSensor" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "distanceSensor0"];
    return new Blockly.FieldDropdown(CHOICES);
}

function createBNO055IMUDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["IMU"].length; i++)
		CHOICES[i] = [robotConfig["IMU"][i]["name"], "imu" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "imu0"];
    return new Blockly.FieldDropdown(CHOICES);
}

function createColorRangeSensorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["colorSensor"].length; i++)
		CHOICES[i] = [robotConfig["colorSensor"][i]["name"], "colorSensor" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "colorSensor0"];
    return new Blockly.FieldDropdown(CHOICES);
}

function createTouchSensorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["touchSensor"].length; i++)
		CHOICES[i] = [robotConfig["touchSensor"][i]["name"], "touchSensor" + i];
	if (CHOICES.length == 0)
		CHOICES[0] = ["<None>", "touchSensor0"];
    return new Blockly.FieldDropdown(CHOICES);
}

//Other Dropdowns
function createLanguageCodeDropdown() {
    var CHOICES = [
        ['en', 'en'],
    ];
    return createFieldDropdown(CHOICES);
}

var LANGUAGE_CODE_TOOLTIPS = [
    ['en', 'The language code for English.'],
];

function createCountryCodeDropdown() {
    var CHOICES = [
        ['US', 'US'],
    ];
    return createFieldDropdown(CHOICES);
}

var COUNTRY_CODE_TOOLTIPS = [
    ['US', 'The country code for United States.'],
];

//String replacement for named devices
function configNaming(str) {
	for (var i = 0; i < robotConfig["motors"].length; i++)
		str = str.replaceAll("dcMotor" + i, robotConfig["motors"][i].name + "AsDcMotor");
	for (var i = 0; i < robotConfig["servos"].length; i++)
		str = str.replaceAll("servo" + i, robotConfig["servos"][i].name + "AsServo");
	for (var i = 0; i < robotConfig["distSensor"].length; i++)
		str = str.replaceAll("distanceSensor" + i, robotConfig["distSensor"][i].name + "AsDistanceSensor");
	for (var i = 0; i < robotConfig["IMU"].length; i++)
		str = str.replaceAll("imu" + i, robotConfig["IMU"][i].name + "AsBNO055IMU");
	for (var i = 0; i < robotConfig["colorSensor"].length; i++)
		str = str.replaceAll("colorSensor" + i, robotConfig["colorSensor"][i].name + "AsREVColorRangeSensor");
	for (var i = 0; i < robotConfig["touchSensor"].length; i++)
		str = str.replaceAll("touchSensor" + i, robotConfig["touchSensor"][i].name + "AsTouchSensor");
	return str;
}

function blocklyNaming(str) {
	for (var i = 0; i < robotConfig["motors"].length; i++)
		str = str.replaceAll(robotConfig["motors"][i].name + "AsDcMotor", "dcMotor" + i);
	for (var i = 0; i < robotConfig["servos"].length; i++)
		str = str.replaceAll(robotConfig["servos"][i].name + "AsServo", "servo" + i);
	for (var i = 0; i < robotConfig["distSensor"].length; i++)
		str = str.replaceAll(robotConfig["distSensor"][i].name + "AsDistanceSensor", "distanceSensor" + i);
	for (var i = 0; i < robotConfig["IMU"].length; i++)
		str = str.replaceAll(robotConfig["IMU"][i].name + "AsBNO055IMU", "imu" + i);
	for (var i = 0; i < robotConfig["colorSensor"].length; i++)
		str = str.replaceAll(robotConfig["colorSensor"][i].name + "AsREVColorRangeSensor", "colorSensor" + i);
	for (var i = 0; i < robotConfig["touchSensor"].length; i++)
		str = str.replaceAll(robotConfig["touchSensor"][i].name + "AsTouchSensor", "touchSensor" + i);
	return str;
}


//Sets up workspace with actuators/sensors
function setupCategories() {
	document.getElementById("blockSelect").value = 'BasicAutoOpMode';
	sampleProgram(true);
	
	try {
		var toolbox = Blockly.getMainWorkspace().getToolbox();
	} catch (e) {
		location.reload();
	}
	
	var crServos = 0;
	for (i = 0; i < robotConfig["servos"].length; i++)
		if (robotConfig["servos"][i]["type"] == "continous")
			crServos++;
	
	if (crServos == 0)
		toolbox.getToolboxItemById('CRServo').hide();
	if (robotConfig["servos"].length - crServos == 0)
		toolbox.getToolboxItemById('Servo').hide();
	
	if (robotConfig["motors"].length == 0)
        toolbox.getToolboxItemById('Motor').hide();
	if (robotConfig["motors"].length < 2)
        toolbox.getToolboxItemById('MotorDual').hide();
	if (robotConfig["motors"].length < 4)
        toolbox.getToolboxItemById('MotorQuad').hide();
	
	var motorsEx = 0;
	for (i = 0; i < robotConfig["motors"].length; i++)
		if (robotConfig["motors"][i]["type"] == "extended")
			motorsEx++;
	
	if (motorsEx == 0)
        toolbox.getToolboxItemById('MotorEx').hide();
	if (motorsEx < 2)
        toolbox.getToolboxItemById('MotorExDual').hide();
	if (motorsEx < 4)
        toolbox.getToolboxItemById('MotorExQuad').hide();
	
	if (robotConfig["motors"].length == 0 && robotConfig["servos"].length == 0)
        toolbox.getToolboxItemById('Actuators').hide();
	
	if (robotConfig["distSensor"].length == 0)
        toolbox.getToolboxItemById('DistanceSensor').hide();
	
	if (robotConfig["IMU"].length == 0) {
		toolbox.getToolboxItemById('IMUSensor').hide();
		toolbox.getToolboxItemById('IMUParamSensor').hide();
	}
	
	if (robotConfig["colorSensor"].length == 0)
		toolbox.getToolboxItemById('ColorSensor').hide();
	
	if (robotConfig["touchSensor"].length == 0)
		toolbox.getToolboxItemById('TouchSensor').hide();
	
	if (robotConfig["distSensor"].length == 0 && robotConfig["IMU"].length == 0 && robotConfig["colorSensor"].length == 0 && robotConfig["touchSensor"].length == 0)
        toolbox.getToolboxItemById('Sensors').hide();
}