UnityInstance = null;
var alreadySetPlayMode = false;
function check() {
    if (UnityInstance != null) {
        var playMode = localStorage.getItem('playMode');
        if (playMode == "Autonomous" && !alreadySetPlayMode) {
            UnityInstance.SendMessage("Main Menu", "changeSinglePlayer");
            alreadySetPlayMode = true;
        } else if (playMode == "TeleOp" && !alreadySetPlayMode) {
            // alert("VRS Multiplayer is optimized with fullscreen mode. Please click on the blue button below the game window.");
            alreadySetPlayMode = true;
        }
        if (playMode == "Autonomous") {
            setTimeout(writeMotorPowers, 1);
        }
    } else {
        setTimeout(check, 500);
    }
}

check();

function writeMotorPowers() {
    if (localStorage.getItem('startMatch') == 'true') {
        UnityInstance.SendMessage("FieldManager", "buttonStartGame");
        localStorage.setItem('startMatch', false);
    } else if (localStorage.getItem('stopMatch') == 'true') {
        UnityInstance.SendMessage("FieldManager", "buttonStopGame");
        localStorage.setItem('stopMatch', false);
    } else if (localStorage.getItem('resetField') == 'true') {
        UnityInstance.SendMessage("FieldManager", "resetField");
        localStorage.setItem('resetField', false);
    }

    var motors = JSON.parse(localStorage.getItem('motorPowers'));
    var servos = JSON.parse(localStorage.getItem('servoPositions'));
	for (var i = 0; i < motors.length; i++)
		if (!motors[i])
			motors[i] = 0;
	for (var i = 0; i < servos.length; i++)
		if (!servos[i])
			servos[i] = 0;
	
	//Old Code (Lean off of using this)
	UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setFrontLeftVel", motors[0]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setFrontRightVel", motors[1]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setBackLeftVel", motors[2]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setBackRightVel", motors[3]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor5", motors[4]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor6", motors[5]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor7", motors[6]);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor8", motors[7]);
	
    var command = new Object();
    command.motors = motors;
	command.servos = servos;
    //To add more use: obj.<name> = array
	
	//WIP - Unity will need to respond to this one command and set values accordingly
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "receiveInfo", JSON.stringify(command));
	//Sends the info: '{"motors":[0,0,0,0,0,0,0,0],"servos":[0,0,0]}'
	
	//Implement Servos once Unity is ready
	
    check();
}