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

    var motorPowers = JSON.parse(localStorage.getItem('motorPowers'));
    var motor1 = motorPowers[0];
    var motor2 = motorPowers[1];
    var motor3 = motorPowers[2];
    var motor4 = motorPowers[3];
    var motor5 = motorPowers[4];
    var motor6 = motorPowers[5];
    var motor7 = motorPowers[6];
    var motor8 = motorPowers[7];
	
    var command = new Object();
    command.motors = [motor1 ? motor1 : 0, motor2 ? motor2 : 0, motor3 ? motor3 : 0, motor4 ? motor4 : 0, motor5 ? motor5 : 0, motor6 ? motor6 : 0, motor7 ? motor7 : 0, motor8 ? motor8 : 0];
    //To add more use: obj.<name> = array
	
	//WIP - Unity will need to respond to this one command and set values accordingly
    UnityInstance.SendMessage("PhotonNetworkPlayer(Clone)", "receiveInfo", JSON.stringify(command));
	//Sends the info: '{"motors":[0,0,0,0,0,0,0,0]}'
	
	//Implement Servos once Unity is ready
	
    check();
}