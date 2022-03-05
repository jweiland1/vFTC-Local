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

	if (localStorage.getItem('motorResetEncoders') == 'true') {
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "resetEncoders");
        localStorage.setItem('motorResetEncoders', false);
	}

    var motorPowers = JSON.parse(localStorage.getItem('motorPowers'));
    var motor1 = motorPowers[0];
    var motor2 = motorPowers[1];
    var motor3 = motorPowers[2];
    var motor4 = motorPowers[3];
    var motor5 = motorPowers[4];
    var motor6 = motorPowers[5];
    var motor7 = motorPowers[6];
    var motor8 = motorPowers[7];
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setFrontLeftVel", (motor1 != null) ? motor1 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setFrontRightVel", (motor2 != null) ? motor2 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setBackLeftVel", (motor3 != null) ? motor3 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setBackRightVel", (motor4 != null) ? motor4 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor5", (motor5 != null) ? motor5 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor6", (motor6 != null) ? motor6 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor7", (motor7 != null) ? motor7 : 0);
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "setMotor8", (motor8 != null) ? motor8 : 0);

	//Implement Servos once Unity is ready

    check();
}
