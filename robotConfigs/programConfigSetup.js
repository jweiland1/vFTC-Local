//Load Config File
var robotConfig = null;

var client = new XMLHttpRequest();
client.open('GET', './robotConfigs/defaultConfig.robot');
client.onreadystatechange = function () {
    var robotConfigTxt = client.responseText;
    if (robotConfigTxt !== '' && robotConfig == null) {
		robotConfig = JSON.parse(robotConfigTxt);
		setTimeout(setupCategories, 250);
    }
}
client.send();

//Dropdowns for Blocks Programs
function createCRServoDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["servos"].length; i++)
		if (robotConfig["servos"][i]["type"] == "continous")
			CHOICES[CHOICES.length] = [robotConfig["servos"][i]["name"], "servo" + i];
    return new Blockly.FieldDropdown(CHOICES);
}

function createDcMotorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["motors"].length; i++)
		CHOICES[i] = [robotConfig["motors"][i]["name"], "dcMotor" + i];
    return new Blockly.FieldDropdown(CHOICES);
}

function createDcMotorExDropdown() {
	var CHOICES = [];
	for (i = 0; i < robotConfig["motors"].length; i++)
		if (robotConfig["motors"][i]["type"] == "extended")
			CHOICES[i] = [robotConfig["motors"][i]["name"], "dcMotor" + i];
    return new Blockly.FieldDropdown(CHOICES);
}

function createServoDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["servos"].length; i++)
		if (robotConfig["servos"][i]["type"] == "180degrees")
			CHOICES[CHOICES.length] = [robotConfig["servos"][i]["name"], "servo" + i];
    return new Blockly.FieldDropdown(CHOICES);
}

function createDistanceSensorDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["distSensor"].length; i++)
		CHOICES[i] = [robotConfig["distSensor"][i]["name"], "distanceSensor" + i];
    return new Blockly.FieldDropdown(CHOICES);
}

function createBNO055IMUDropdown() {
    var CHOICES = [];
	for (i = 0; i < robotConfig["IMU"].length; i++)
		CHOICES[i] = [robotConfig["IMU"][i]["name"], "imu" + i];
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

//Sets up workspace with actuators/sensors
function setupCategories() {
    newProgram('BasicOpMode');
	
	var toolbox = Blockly.getMainWorkspace().getToolbox();
	
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
	
	if (robotConfig["distSensor"].length == 0 && robotConfig["IMU"].length == 0)
        toolbox.getToolboxItemById('Sensors').hide();
}